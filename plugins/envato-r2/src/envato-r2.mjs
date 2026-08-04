import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const APP_URL = "https://app.envato.com/";
const SEARCH_ROOT = "https://app.envato.com/search";
const SEARCH_ROUTE = "https://app.envato.com/search";
const DEFAULT_CONFIG_DIR = path.join(os.homedir(), ".envato-r2");
const DEFAULT_PROFILE_DIR = path.join(DEFAULT_CONFIG_DIR, "browser-profile");
const DEFAULT_STORAGE_STATE = path.join(DEFAULT_CONFIG_DIR, "storage-state.json");
const DEFAULT_DOWNLOAD_DIR = path.join(DEFAULT_CONFIG_DIR, "downloads");
const DEFAULT_TIMEOUT_MS = 90000;
const DEFAULT_LIMIT = 10;
const CHROME_CANDIDATES = [
  process.env.CHROME_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
].filter(Boolean);

const ITEM_TYPE_ALIASES = {
  photo: "photos",
  photos: "photos",
  graphic: "graphics",
  graphics: "graphics",
  video: "stock-video",
  "stock-video": "stock-video",
  "video-template": "video-templates",
  "video-templates": "video-templates",
  music: "music",
  audio: "music",
  "sound-effects": "sound-effects",
  presentation: "presentation-templates",
  "presentation-templates": "presentation-templates",
  font: "fonts",
  fonts: "fonts",
  addon: "add-ons",
  "add-ons": "add-ons",
  template: "web-templates",
  "web-templates": "web-templates"
};

export function getConfig(env = process.env) {
  const accountId = env.R2_ACCOUNT_ID || env.CLOUDFLARE_ACCOUNT_ID || "";
  const endpoint = env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");

  return {
    accountId,
    endpoint,
    accessKeyId: env.R2_ACCESS_KEY_ID || env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: env.R2_SECRET_ACCESS_KEY || env.AWS_SECRET_ACCESS_KEY || "",
    bucket: env.R2_BUCKET || "",
    prefix: trimSlashes(env.R2_PREFIX || "envato"),
    region: env.R2_REGION || "auto",
    publicBaseUrl: trimRightSlash(env.R2_PUBLIC_BASE_URL || ""),
    storageState: env.ENVATO_STORAGE_STATE || DEFAULT_STORAGE_STATE,
    profileDir: env.ENVATO_PROFILE_DIR || DEFAULT_PROFILE_DIR,
    downloadDir: env.ENVATO_DOWNLOAD_DIR || DEFAULT_DOWNLOAD_DIR,
    defaultProjectName: env.ENVATO_DEFAULT_PROJECT || "",
    headless: env.ENVATO_HEADLESS !== "0",
    userAgent: env.ENVATO_USER_AGENT || "",
    chromeExecutablePath: findChromeExecutable(env.CHROME_EXECUTABLE_PATH)
  };
}

export async function checkSetup() {
  const config = getConfig();
  const checks = {
    envatoStorageState: await fileExists(config.storageState),
    chromeExecutablePath: Boolean(config.chromeExecutablePath),
    r2AccountOrEndpoint: Boolean(config.endpoint),
    r2AccessKeyId: Boolean(config.accessKeyId),
    r2SecretAccessKey: Boolean(config.secretAccessKey),
    r2Bucket: Boolean(config.bucket)
  };

  const missing = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);

  return {
    ok: missing.length === 0,
    missing,
    paths: {
      storageState: config.storageState,
      profileDir: config.profileDir,
      downloadDir: config.downloadDir,
      chromeExecutablePath: config.chromeExecutablePath || null
    },
    r2: {
      endpoint: config.endpoint || null,
      bucket: config.bucket || null,
      prefix: config.prefix,
      region: config.region,
      publicBaseUrl: config.publicBaseUrl || null
    }
  };
}

/**
 * Inspect the locally captured Playwright storage-state file without opening a
 * browser or sending any request to Envato. This intentionally returns only
 * aggregate cookie data and storage-key counts, never cookie/storage names or
 * values. It is a presence signal, not proof that the session is authenticated.
 */
export async function checkStoredSession(options = {}) {
  const config = getConfig();
  const storageState = options.storageState || config.storageState;
  if (!(await fileExists(storageState))) {
    return {
      ok: false,
      storageState,
      activeEnvatoCookiesPresent: null,
      assessment: "unavailable",
      reason: "No captured Playwright storage state was found. Run `npm run login` to create one.",
      networkAccessed: false,
      recapture: {
        recommended: true,
        required: null,
        action: "Run `npm run login` yourself to create a saved session."
      }
    };
  }

  let state;
  try {
    state = JSON.parse(await readFile(storageState, "utf8"));
  } catch (error) {
    return {
      ok: false,
      storageState,
      activeEnvatoCookiesPresent: null,
      assessment: "unavailable",
      reason: `The captured storage state could not be read: ${error.message}`,
      networkAccessed: false,
      recapture: {
        recommended: true,
        required: null,
        action: "Inspect or replace the invalid file, then run `npm run login` yourself."
      }
    };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const envatoCookies = (Array.isArray(state.cookies) ? state.cookies : [])
    .filter((cookie) => isEnvatoDomain(cookie?.domain))
    .map((cookie) => ({
      domain: normalizeCookieDomain(cookie.domain),
      expiresAt: cookie.expires && cookie.expires > 0 ? new Date(cookie.expires * 1000).toISOString() : null,
      expired: Boolean(cookie.expires && cookie.expires > 0 && cookie.expires <= nowSeconds),
      session: !cookie.expires || cookie.expires <= 0,
      httpOnly: Boolean(cookie.httpOnly),
      secure: Boolean(cookie.secure),
      sameSite: cookie.sameSite || null
    }));
  const origins = (Array.isArray(state.origins) ? state.origins : [])
    .filter((origin) => isEnvatoOrigin(origin?.origin))
    .map((origin) => ({
      origin: origin.origin,
      localStorage: summarizeStorageKeys(origin.localStorage),
      // Playwright's storageState format does not persist sessionStorage.
      sessionStorage: { supported: false, keyCount: 0, keys: [] }
    }));
  const activeCookieCount = envatoCookies.filter((cookie) => !cookie.expired).length;

  return {
    ok: true,
    storageState,
    activeEnvatoCookiesPresent: activeCookieCount > 0,
    assessment: activeCookieCount > 0
      ? "active-envato-cookie-evidence-present"
      : "no-active-envato-cookie-evidence",
    confidence: "local-cookie-presence-only",
    networkAccessed: false,
    notice: "This only inspects a local Playwright storage-state file. Generic cookie presence does not prove an authenticated Envato login, and the diagnostic never returns cookie/storage names or values.",
    cookies: {
      total: envatoCookies.length,
      active: activeCookieCount,
      expired: envatoCookies.filter((cookie) => cookie.expired).length,
      domains: summarizeCookieDomains(envatoCookies)
    },
    storage: {
      origins
    },
    recapture: {
      recommended: activeCookieCount === 0 ? true : null,
      required: null,
      action: activeCookieCount === 0
        ? "No active Envato cookies were found. Run `npm run login` yourself to replace the saved session."
        : "Cookie evidence exists, but only a real Envato request can validate the login. Recapture manually if Envato requests it."
    }
  };
}

export async function captureLogin(options = {}) {
  const config = getConfig();
  const { chromium } = await import("playwright-core");
  const timeoutMs = Number(options.timeoutMs || 180000);
  const context = await chromium.launchPersistentContext(config.profileDir, {
    acceptDownloads: true,
    executablePath: requireChrome(config),
    headless: false,
    viewport: { width: 1440, height: 1000 },
    ...(config.userAgent ? { userAgent: config.userAgent } : {})
  });

  try {
    const page = context.pages()[0] || (await context.newPage());
    await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: DEFAULT_TIMEOUT_MS });
    await waitForPossibleLogin(page, timeoutMs);
    await mkdir(path.dirname(config.storageState), { recursive: true });
    await context.storageState({ path: config.storageState });
    return {
      ok: true,
      storageState: config.storageState,
      currentUrl: page.url(),
      loggedInLikely: !(await isLoginPage(page))
    };
  } finally {
    await context.close();
  }
}

export async function searchAssets(input = {}) {
  const limit = clampLimit(input.limit);
  const searchUrl = buildSearchUrl(input);
  const { browser, context, page, apiCalls } = await openEnvatoPage(searchUrl, {
    ...input,
    captureApiCalls: true
  });

  try {
    if (await isLoginPage(page)) {
      return {
        ok: false,
        authRequired: true,
        searchUrl,
        results: [],
        message: "Envato login is required. Run `npm run login` in the envato-r2 plugin or call envato_r2_capture_login."
      };
    }

    await waitForStructuredSearchData(page);
    const structured = await readStructuredSearchResults(page, limit);
    if (structured.results.length > 0) {
      return {
        ok: true,
        source: "react-router-loader",
        searchUrl,
        dataUrl: buildReactRouterDataUrl(searchUrl),
        count: structured.results.length,
        totalCount: structured.totalCount,
        hasNextPage: structured.hasNextPage,
        page: structured.page,
        itemType: structured.itemType,
        term: structured.term,
        routePath: structured.routePath,
        observedApiCalls: apiCalls,
        results: structured.results
      };
    }

    await waitForResults(page);
    const results = await page.evaluate(
      ({ limit: innerLimit }) => {
        const blockedPrefixes = [
          "/search",
          "/account",
          "/pricing",
          "/license",
          "/licenses",
          "/downloads",
          "/projects",
          "/login",
          "/sign-in",
          "/help"
        ];
        const cards = [];
        const seen = new Set();
        for (const anchor of document.querySelectorAll("a[href]")) {
          const href = anchor.href;
          let url;
          try {
            url = new URL(href, location.href);
          } catch {
            continue;
          }
          if (url.hostname !== "app.envato.com") continue;
          if (blockedPrefixes.some((prefix) => url.pathname.startsWith(prefix))) continue;
          const parts = url.pathname.split("/").filter(Boolean);
          if (parts.length < 2) continue;
          const itemId = parts[parts.length - 1];
          if (!/^[a-z0-9-]{8,}$/i.test(itemId)) continue;
          const normalized = `${url.origin}${url.pathname}`;
          if (seen.has(normalized)) continue;
          seen.add(normalized);

          const container = anchor.closest("article, li, [data-testid], [class*='card'], [class*='tile']") || anchor;
          const image = container.querySelector("img");
          const title = (
            anchor.getAttribute("aria-label") ||
            image?.getAttribute("alt") ||
            container.querySelector("[title]")?.getAttribute("title") ||
            anchor.textContent ||
            ""
          ).replace(/\s+/g, " ").trim();
          const category = parts[0];
          const thumbnailUrl = image?.currentSrc || image?.src || null;

          cards.push({
            title,
            url: normalized,
            itemId,
            category,
            thumbnailUrl
          });
          if (cards.length >= innerLimit) break;
        }
        return cards;
      },
      { limit }
    );

    return {
      ok: true,
      source: "dom-fallback",
      searchUrl,
      dataUrl: buildReactRouterDataUrl(searchUrl),
      observedApiCalls: apiCalls,
      count: results.length,
      results
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

export async function discoverEnvatoApiCalls(input = {}) {
  const searchUrl = input.searchUrl || buildSearchUrl({
    query: input.query ?? "",
    itemType: input.itemType || "fonts",
    sort: input.sort || "popular",
    allowEmptyQuery: true
  });
  const dataUrl = buildReactRouterDataUrl(searchUrl);
  const staticCalls = knownEnvatoApiCalls(searchUrl);

  if (input.live === false) {
    return {
      ok: true,
      source: "static-bundle-analysis",
      searchUrl,
      dataUrl,
      observedApiCalls: [],
      apiCalls: staticCalls
    };
  }

  const config = getConfig();
  if (!(await fileExists(config.storageState))) {
    return {
      ok: true,
      authRequiredForLiveCapture: true,
      source: "static-bundle-analysis",
      searchUrl,
      dataUrl,
      observedApiCalls: [],
      apiCalls: staticCalls,
      message: "Run `npm run login` or envato_r2_capture_login to observe live authenticated calls."
    };
  }

  const { browser, context, page, apiCalls } = await openEnvatoPage(searchUrl, {
    ...input,
    captureApiCalls: true
  });

  try {
    if (!(await isLoginPage(page))) {
      await waitForStructuredSearchData(page);
      await page.evaluate(() => window.scrollBy(0, Math.max(window.innerHeight, 900))).catch(() => {});
      await page.waitForTimeout(1500).catch(() => {});
    }

    return {
      ok: true,
      source: "live-browser-capture",
      authRequiredForLiveCapture: await isLoginPage(page),
      searchUrl,
      dataUrl,
      observedApiCalls: apiCalls,
      apiCalls: staticCalls
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

export async function downloadAssetToR2(input = {}) {
  if (!input.itemUrl) {
    throw new Error("itemUrl is required.");
  }
  const config = getConfig();
  const projectName = input.projectName || config.defaultProjectName;
  if (!projectName) {
    throw new Error("projectName is required so the Envato license/project use is recorded.");
  }

  const itemUrl = normalizeEnvatoUrl(input.itemUrl);
  const { browser, context, page } = await openEnvatoPage(itemUrl, input);

  try {
    if (await isLoginPage(page)) {
      throw new Error("Envato login is required. Run `npm run login` in the envato-r2 plugin or call envato_r2_capture_login.");
    }

    const itemDetails = await readItemDetails(page, itemUrl);
    const download = await driveDownloadFlow(page, {
      projectName,
      timeoutMs: Number(input.timeoutMs || DEFAULT_TIMEOUT_MS)
    });
    const downloadPath = await saveDownload(download, config.downloadDir, itemDetails);
    const assetUpload = await uploadFileToR2(downloadPath, {
      itemUrl,
      projectName,
      itemDetails,
      keyPrefix: input.r2KeyPrefix || input.keyPrefix || config.prefix,
      suggestedFilename: path.basename(downloadPath),
      contentType: guessContentType(downloadPath)
    });

    let licenseUpload = null;
    if (input.downloadLicenseCertificate !== false) {
      licenseUpload = await tryDownloadLicenseCertificate(page, {
        projectName,
        itemDetails,
        itemUrl,
        keyPrefix: input.r2KeyPrefix || input.keyPrefix || config.prefix,
        timeoutMs: Number(input.timeoutMs || 45000)
      });
    }

    const manifest = {
      schemaVersion: 1,
      source: "envato",
      itemUrl,
      projectName,
      downloadedAt: new Date().toISOString(),
      item: itemDetails,
      asset: assetUpload,
      licenseCertificate: licenseUpload
    };
    const manifestUpload = await uploadJsonToR2(manifest, buildManifestKey(assetUpload.key), {
      itemUrl,
      projectName
    });

    return {
      ok: true,
      itemUrl,
      projectName,
      item: itemDetails,
      asset: assetUpload,
      licenseCertificate: licenseUpload,
      manifest: manifestUpload
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

export async function searchDownloadToR2(input = {}) {
  const search = await searchAssets(input);
  if (!search.ok || search.results.length === 0) {
    return {
      ok: false,
      search,
      downloads: []
    };
  }

  const count = Math.min(Number(input.downloadLimit || 1), search.results.length, 5);
  const downloads = [];
  for (const result of search.results.slice(0, count)) {
    downloads.push(
      await downloadAssetToR2({
        ...input,
        itemUrl: result.url
      })
    );
  }

  return {
    ok: true,
    search,
    downloads
  };
}

export function buildSearchUrl(input = {}) {
  if (input.searchUrl) {
    return String(input.searchUrl);
  }
  const query = input.query || input.term;
  if (!query && !input.allowEmptyQuery) {
    throw new Error("query is required unless searchUrl is supplied.");
  }
  const itemType = normalizeItemType(input.itemType || input.category || "photos");
  const sort = input.sort || "relevance";
  const useLandingRoute = input.useLandingRoute === true;
  const url = useLandingRoute ? new URL(`${APP_URL}${itemType}`) : new URL(SEARCH_ROUTE);
  url.searchParams.set("itemType", itemType);
  url.searchParams.set("term", query || "");
  url.searchParams.set("sort", sort);
  return url.toString();
}

export function buildReactRouterDataUrl(url) {
  const dataUrl = new URL(url, APP_URL);
  const cleanPath = dataUrl.pathname.replace(/\/+$/, "");
  if (dataUrl.pathname === "/") {
    dataUrl.pathname = "/_root.data";
  } else if (dataUrl.pathname.endsWith("/")) {
    dataUrl.pathname = `${dataUrl.pathname}_.data`;
  } else {
    dataUrl.pathname = `${cleanPath}.data`;
  }
  return dataUrl.toString();
}

export function knownEnvatoApiCalls(searchUrl = "https://app.envato.com/search?itemType=fonts&term=&sort=popular") {
  const url = new URL(searchUrl, APP_URL);
  const itemType = url.searchParams.get("itemType") || "fonts";
  const term = url.searchParams.get("term") || "";

  return [
    {
      method: "GET",
      path: new URL(buildReactRouterDataUrl(url.toString())).pathname,
      url: buildReactRouterDataUrl(url.toString()),
      purpose: "Initial React Router single-fetch loader. This carries structured `searchResults.cards`, `searchForm`, page, itemType, totalCount, and preview metadata.",
      responseType: "text/vnd.turbo-stream.html"
    },
    {
      method: "POST",
      path: "/search",
      purpose: "Infinite-scroll/load-more action for additional result pages.",
      bodyShape: {
        actionType: "loadMore",
        itemType,
        term,
        page: 2
      }
    },
    {
      method: "POST",
      path: "/font-preview-urls",
      purpose: "Signs private font preview S3 keys returned in font result metadata so an agent can render glyph/name previews.",
      bodyShape: {
        s3Keys: ["<fontPreviewVariants[].s3LocationKey or s3LocationKeys[]>"]
      }
    },
    {
      method: "POST",
      path: "/related-items",
      purpose: "Fetches similar/author-related item cards for an item details panel.",
      bodyShape: {
        item_uuid: "<itemUuid>",
        item_type: itemType,
        featured_song_uuids: "[]",
        portfolio: "<authorUsername optional>"
      }
    },
    {
      method: "GET",
      path: "/license-certificate/:licenseId/download",
      purpose: "Downloads a generated license certificate PDF once Envato has created a license id."
    }
  ];
}

async function openEnvatoPage(url, input = {}) {
  const config = getConfig();
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({
    executablePath: requireChrome(config),
    headless: input.headless ?? config.headless,
    downloadsPath: config.downloadDir
  });
  const context = await browser.newContext({
    acceptDownloads: true,
    storageState: (await fileExists(config.storageState)) ? config.storageState : undefined,
    viewport: { width: Number(input.width || 1440), height: Number(input.height || 1000) },
    ...(config.userAgent ? { userAgent: config.userAgent } : {})
  });
  const page = await context.newPage();
  const apiCalls = [];
  if (input.captureApiCalls) {
    attachApiCapture(page, apiCalls);
  }
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: Number(input.timeoutMs || DEFAULT_TIMEOUT_MS) });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  return { browser, context, page, apiCalls };
}

function attachApiCapture(page, apiCalls) {
  const requests = new Map();
  page.on("request", (request) => {
    const url = request.url();
    if (!isInterestingEnvatoRequest(url, request.method())) return;
    requests.set(request, {
      method: request.method(),
      url,
      resourceType: request.resourceType(),
      postData: sanitizePostData(request.postData())
    });
  });
  page.on("response", (response) => {
    const request = response.request();
    const captured = requests.get(request);
    if (!captured) return;
    const headers = response.headers();
    apiCalls.push({
      ...captured,
      status: response.status(),
      contentType: headers["content-type"] || null
    });
    requests.delete(request);
  });
}

function isInterestingEnvatoRequest(value, method = "GET") {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.hostname !== "app.envato.com") return false;
  if (url.pathname.endsWith(".data")) return true;
  if (method !== "GET" && ["/search", "/related-items", "/font-preview-urls", "/looks-like-search", "/sounds-like-search/query"].includes(url.pathname)) {
    return true;
  }
  return /^\/license-certificate\/[^/]+\/download$/.test(url.pathname);
}

function sanitizePostData(postData) {
  if (!postData) return null;
  if (postData.length > 4000) return `${postData.slice(0, 4000)}...`;
  return postData;
}

async function waitForStructuredSearchData(page) {
  await page
    .waitForFunction(
      () => Boolean(window.__reactRouterDataRouter?.state?.loaderData || window.__reactRouterContext?.state?.loaderData),
      null,
      { timeout: 20000 }
    )
    .catch(() => {});
}

async function readStructuredSearchResults(page, limit) {
  const payload = await page.evaluate(
    ({ innerLimit }) => {
      function findPayloads(loaderData, source) {
        const payloads = [];
        const seen = new Set();
        function visit(value, path, depth) {
          if (!value || typeof value !== "object" || depth > 6 || seen.has(value)) return;
          seen.add(value);
          if (value.searchResults?.cards && Array.isArray(value.searchResults.cards)) {
            payloads.push({
              source,
              routePath: `${path}.searchResults`,
              cards: value.searchResults.cards.slice(0, innerLimit),
              totalCount: value.searchResults.totalCount ?? value.searchResults.searchResults ?? null,
              hasNextPage: value.searchResults.hasNextPage ?? null,
              page: value.page ?? value.searchResults.page ?? null,
              itemType: value.itemType ?? value.searchForm?.itemType ?? null,
              term: value.term ?? value.searchForm?.term ?? null,
              searchForm: value.searchForm ?? null
            });
          }
          if (Array.isArray(value.cards)) {
            payloads.push({
              source,
              routePath: path,
              cards: value.cards.slice(0, innerLimit),
              totalCount: value.totalCount ?? null,
              hasNextPage: value.hasNextPage ?? null,
              page: value.page ?? null,
              itemType: value.itemType ?? null,
              term: value.term ?? null,
              searchForm: value.searchForm ?? null
            });
          }
          for (const [key, child] of Object.entries(value)) {
            if (["messages", "navigationItems", "cookiebot", "dataLayer", "hotjar"].includes(key)) continue;
            visit(child, `${path}.${key}`, depth + 1);
          }
        }
        visit(loaderData, source, 0);
        return payloads;
      }

      const dataRouter = window.__reactRouterDataRouter?.state;
      const contextState = window.__reactRouterContext?.state;
      const payloads = [
        ...findPayloads(dataRouter?.loaderData, "dataRouter.loaderData"),
        ...findPayloads(contextState?.loaderData, "reactRouterContext.loaderData")
      ];
      const payload = payloads.find((candidate) => candidate.cards?.length > 0) || null;
      return {
        currentUrl: window.location.href,
        location: dataRouter?.location || contextState?.location || null,
        payload
      };
    },
    { innerLimit: limit }
  );

  if (!payload.payload) {
    return {
      results: [],
      totalCount: null,
      hasNextPage: null,
      page: null,
      itemType: null,
      term: null,
      routePath: null
    };
  }

  const results = payload.payload.cards
    .map((card) => normalizeEnvatoSearchCard(card))
    .filter(Boolean)
    .slice(0, limit);

  return {
    results,
    totalCount: payload.payload.totalCount,
    hasNextPage: payload.payload.hasNextPage,
    page: payload.payload.page,
    itemType: payload.payload.itemType,
    term: payload.payload.term,
    routePath: payload.payload.routePath
  };
}

export function normalizeEnvatoSearchCard(card = {}) {
  const item = card.item || card;
  const itemUuid = item.itemUuid || item.itemId || item.uuid || extractUuidFromUrl(item.url || item.href || "");
  const itemType = item.itemType || item.type || item.category || "";
  if (!itemUuid || !itemType) return null;

  const previewImages = collectPreviewImages(item);
  const previewUrl =
    firstString([
      item.videoUrl,
      item.audioPreviewSourceUrl,
      item.image?.fallbackSrc,
      item.image?.src,
      item.thumbnailUrl,
      previewImages[0]?.url
    ]) || null;
  const fontPreviewKeys = collectFontPreviewKeys(item);

  return {
    title: cleanText(item.title || item.name || ""),
    url: `${APP_URL}${itemType}/${itemUuid}`,
    itemId: itemUuid,
    itemUuid,
    itemType,
    category: itemType,
    authorUsername: item.authorUsername || item.author || null,
    humaneId: item.humaneId || null,
    previewUrl,
    thumbnailUrl: firstString([item.image?.fallbackSrc, item.image?.src, item.thumbnailUrl, previewImages[0]?.url]) || null,
    previewImages,
    videoUrl: item.videoUrl || null,
    audioPreviewSourceUrl: item.audioPreviewSourceUrl || null,
    audioWaveformUrl: item.audioWaveformUrl || null,
    aspectRatio: item.aspectRatio || null,
    duration: item.duration || null,
    bpm: item.bpm || null,
    tags: Array.isArray(item.tags) ? item.tags.slice(0, 25) : [],
    downloadFormats: summarizeDownloadFormats(item.downloadFormats),
    fontPreviewVariants: summarizeFontPreviewVariants(item.fontPreviewVariants),
    fontPreviewKeys,
    rawShape: Object.keys(item).sort()
  };
}

function collectPreviewImages(item) {
  const images = [];
  const candidates = [
    item.previewImages,
    item.previewImageUrls,
    item.images,
    item.image ? [item.image] : []
  ].flatMap((entry) => (Array.isArray(entry) ? entry : []));

  for (const entry of candidates) {
    if (!entry || typeof entry !== "object") continue;
    const url = firstString([entry.url, entry.src, entry.fallbackSrc, entry.webpUrl, entry.jpgUrl]);
    if (!url) continue;
    images.push({
      url,
      width: entry.width ?? null,
      height: entry.height ?? null
    });
  }

  return uniqueBy(images, (entry) => entry.url).slice(0, 8);
}

function collectFontPreviewKeys(item) {
  const variants = Array.isArray(item.fontPreviewVariants) ? item.fontPreviewVariants : [];
  const keys = [];
  for (const variant of variants) {
    if (variant?.s3LocationKey) keys.push(variant.s3LocationKey);
    if (Array.isArray(variant?.s3LocationKeys)) keys.push(...variant.s3LocationKeys.filter(Boolean));
  }
  return [...new Set(keys)];
}

function summarizeDownloadFormats(downloadFormats) {
  if (!Array.isArray(downloadFormats)) return [];
  return downloadFormats.slice(0, 12).map((format) => ({
    assetUuid: format.assetUuid || null,
    label: format.label || null,
    shortLabel: format.shortLabel || null,
    fileSize: format.fileSize || null,
    description: format.description || null
  }));
}

function summarizeFontPreviewVariants(variants) {
  if (!Array.isArray(variants)) return [];
  return variants.slice(0, 12).map((variant) => ({
    name: variant.name || variant.label || null,
    style: variant.style || null,
    s3LocationKey: variant.s3LocationKey || null,
    s3LocationKeys: Array.isArray(variant.s3LocationKeys) ? variant.s3LocationKeys : []
  }));
}

async function waitForPossibleLogin(page, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!(await isLoginPage(page))) return;
    await page.waitForTimeout(1000);
  }
}

async function waitForResults(page) {
  await page
    .waitForFunction(
      () => document.querySelectorAll("a[href*='app.envato.com/'], a[href^='/']").length > 10,
      null,
      { timeout: 20000 }
    )
    .catch(() => {});
}

async function isLoginPage(page) {
  const url = page.url();
  if (/account\.envato\.com|\/login|\/sign-in/i.test(url)) return true;
  const signInVisible = await page
    .getByRole("link", { name: /sign in|log in/i })
    .first()
    .isVisible({ timeout: 1000 })
    .catch(() => false);
  return signInVisible;
}

async function readItemDetails(page, itemUrl) {
  const title = await page
    .locator("h1")
    .first()
    .textContent({ timeout: 5000 })
    .catch(() => "");
  const documentTitle = await page.title().catch(() => "");
  const url = new URL(itemUrl);
  const parts = url.pathname.split("/").filter(Boolean);
  return {
    title: cleanText(title || documentTitle || parts[0] || "envato-asset"),
    category: parts[0] || "asset",
    itemId: parts[parts.length - 1] || "",
    pageTitle: documentTitle || null
  };
}

async function driveDownloadFlow(page, options) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const downloadPromise = page.waitForEvent("download", { timeout: timeoutMs });

  for (let step = 0; step < 6; step += 1) {
    await fillProjectFields(page, options.projectName);
    const clicked = await clickFirstVisible(page, [
      page.getByRole("button", { name: /download/i }).first(),
      page.getByRole("link", { name: /download/i }).first(),
      page.getByRole("button", { name: /license/i }).first(),
      page.getByRole("button", { name: /create/i }).first(),
      page.getByRole("button", { name: /continue/i }).first(),
      page.getByRole("button", { name: /confirm/i }).first(),
      page.locator("button:has-text('Download'), a:has-text('Download')").first(),
      page.locator("[data-testid*='download' i], [aria-label*='download' i]").first()
    ]);
    if (!clicked) break;
    const download = await Promise.race([
      downloadPromise.then((value) => value),
      page.waitForTimeout(2500).then(() => null)
    ]);
    if (download) return download;
  }

  return await downloadPromise.catch((error) => {
    throw new Error(`Could not complete Envato download flow: ${error.message}`);
  });
}

async function tryDownloadLicenseCertificate(page, options) {
  const downloadPromise = page.waitForEvent("download", { timeout: options.timeoutMs });
  await fillProjectFields(page, options.projectName);
  const clicked = await clickFirstVisible(page, [
    page.getByRole("link", { name: /download license|license certificate|certificate/i }).first(),
    page.getByRole("button", { name: /download license|license certificate|certificate/i }).first(),
    page.getByRole("button", { name: /view licenses|licenses/i }).first(),
    page.locator("a:has-text('Download license'), button:has-text('Download license')").first()
  ]);
  if (!clicked) return null;
  const licenseDownload = await downloadPromise.catch(() => null);
  if (!licenseDownload) return null;
  const config = getConfig();
  const licensePath = await saveDownload(licenseDownload, config.downloadDir, {
    ...options.itemDetails,
    title: `${options.itemDetails.title} license`
  });
  return await uploadFileToR2(licensePath, {
    itemUrl: options.itemUrl,
    projectName: options.projectName,
    itemDetails: options.itemDetails,
    keyPrefix: options.keyPrefix,
    suggestedFilename: path.basename(licensePath),
    contentType: guessContentType(licensePath),
    purpose: "license-certificate"
  });
}

async function fillProjectFields(page, projectName) {
  const selectors = [
    "input[name*='project' i]",
    "input[placeholder*='project' i]",
    "input[aria-label*='project' i]",
    "textarea[name*='project' i]",
    "textarea[placeholder*='project' i]",
    "textarea[aria-label*='project' i]",
    "input[type='text']"
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    const visible = await locator.isVisible({ timeout: 500 }).catch(() => false);
    if (!visible) continue;
    const value = await locator.inputValue().catch(() => "");
    if (!value) {
      await locator.fill(projectName).catch(() => {});
    }
    return;
  }
}

async function clickFirstVisible(page, locators) {
  for (const locator of locators) {
    const visible = await locator.isVisible({ timeout: 700 }).catch(() => false);
    if (!visible) continue;
    await locator.click({ timeout: 5000 }).catch(() => null);
    await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => {});
    return true;
  }
  return false;
}

async function saveDownload(download, downloadDir, itemDetails) {
  await mkdir(downloadDir, { recursive: true });
  const suggested = download.suggestedFilename() || `${slugify(itemDetails.title)}.bin`;
  const filename = `${dateStamp()}-${slugify(itemDetails.category)}-${slugify(suggested)}`;
  const target = uniquePath(path.join(downloadDir, filename));
  await download.saveAs(target);
  return target;
}

async function uploadFileToR2(filePath, options) {
  const config = getConfig();
  ensureR2Config(config);
  const info = await stat(filePath);
  const key = buildObjectKey({
    keyPrefix: options.keyPrefix,
    itemDetails: options.itemDetails,
    filename: options.suggestedFilename || path.basename(filePath),
    purpose: options.purpose || "asset"
  });
  const sha256 = await sha256File(filePath);
  const client = createR2Client(config);
  const metadata = buildR2Metadata({
    itemUrl: options.itemUrl,
    projectName: options.projectName,
    title: options.itemDetails.title,
    category: options.itemDetails.category,
    itemId: options.itemDetails.itemId,
    sha256,
    purpose: options.purpose || "asset"
  });

  const result = await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: createReadStream(filePath),
      ContentLength: info.size,
      ContentType: options.contentType || "application/octet-stream",
      Metadata: metadata
    })
  );

  return {
    bucket: config.bucket,
    key,
    size: info.size,
    sha256,
    etag: result.ETag || null,
    url: buildPublicUrl(config, key),
    localPath: filePath
  };
}

async function uploadJsonToR2(payload, key, context) {
  const config = getConfig();
  ensureR2Config(config);
  const client = createR2Client(config);
  const body = JSON.stringify(payload, null, 2);
  const result = await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: "application/json",
      Metadata: buildR2Metadata({
        itemUrl: context.itemUrl,
        projectName: context.projectName,
        purpose: "metadata-manifest"
      })
    })
  );
  return {
    bucket: config.bucket,
    key,
    size: Buffer.byteLength(body),
    etag: result.ETag || null,
    url: buildPublicUrl(config, key)
  };
}

function createR2Client(config) {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });
}

function ensureR2Config(config) {
  const missing = [];
  if (!config.endpoint) missing.push("R2_ACCOUNT_ID or R2_ENDPOINT");
  if (!config.accessKeyId) missing.push("R2_ACCESS_KEY_ID");
  if (!config.secretAccessKey) missing.push("R2_SECRET_ACCESS_KEY");
  if (!config.bucket) missing.push("R2_BUCKET");
  if (missing.length > 0) {
    throw new Error(`Missing R2 configuration: ${missing.join(", ")}`);
  }
}

function buildObjectKey(options) {
  const prefix = trimSlashes(options.keyPrefix || "envato");
  const category = slugify(options.itemDetails.category || "asset");
  const itemId = slugify(options.itemDetails.itemId || options.itemDetails.title || "item");
  const filename = safeFilename(options.filename || "download.bin");
  const purpose = options.purpose === "license-certificate" ? "licenses" : "assets";
  return [prefix, category, itemId, purpose, filename].filter(Boolean).join("/");
}

function buildManifestKey(assetKey) {
  return assetKey.replace(/\/assets\/([^/]+)$/, "/metadata/$1.envato-r2.json");
}

function buildR2Metadata(values) {
  return Object.fromEntries(
    Object.entries({
      "envato-source-url": values.itemUrl,
      "envato-project-name": values.projectName,
      "envato-title": values.title,
      "envato-category": values.category,
      "envato-item-id": values.itemId,
      "envato-sha256": values.sha256,
      "envato-purpose": values.purpose
    })
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => [key, String(value).slice(0, 1024)])
  );
}

function buildPublicUrl(config, key) {
  if (!config.publicBaseUrl) return null;
  return `${config.publicBaseUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function normalizeItemType(itemType) {
  const raw = String(itemType).trim().toLowerCase();
  return ITEM_TYPE_ALIASES[raw] || raw.replace(/[^a-z0-9-]+/g, "-");
}

function normalizeEnvatoUrl(value) {
  const url = new URL(value, APP_URL);
  if (!["app.envato.com", "elements.envato.com"].includes(url.hostname)) {
    throw new Error("itemUrl must point to app.envato.com or elements.envato.com.");
  }
  if (url.hostname === "elements.envato.com") {
    url.hostname = "app.envato.com";
  }
  return url.toString();
}

function findChromeExecutable(override) {
  if (override) return override;
  return CHROME_CANDIDATES.find(Boolean) || "";
}

function requireChrome(config) {
  if (!config.chromeExecutablePath) {
    throw new Error("Could not find Chrome. Set CHROME_EXECUTABLE_PATH to a Chrome or Chromium executable.");
  }
  return config.chromeExecutablePath;
}

function isEnvatoDomain(domain) {
  const normalized = normalizeCookieDomain(domain);
  return normalized === "envato.com" || normalized.endsWith(".envato.com");
}

function normalizeCookieDomain(domain) {
  return String(domain || "").replace(/^\./, "").toLowerCase();
}

function isEnvatoOrigin(origin) {
  try {
    return isEnvatoDomain(new URL(origin).hostname);
  } catch {
    return false;
  }
}

function summarizeCookieDomains(cookies) {
  return [...new Set(cookies.map((cookie) => cookie.domain).filter(Boolean))].sort();
}

function summarizeStorageKeys(entries) {
  const keyCount = Array.isArray(entries) ? entries.length : 0;
  return {
    keyCount
  };
}

async function fileExists(filePath) {
  return stat(filePath)
    .then(() => true)
    .catch(() => false);
}

async function sha256File(filePath) {
  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    createReadStream(filePath)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", resolve);
  });
  return hash.digest("hex");
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function firstString(values) {
  return values.find((value) => typeof value === "string" && value.length > 0) || "";
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function extractUuidFromUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value, APP_URL);
    return url.pathname.split("/").filter(Boolean).pop() || "";
  } catch {
    return "";
  }
}

function trimSlashes(value) {
  return String(value || "").replace(/^\/+|\/+$/g, "");
}

function trimRightSlash(value) {
  return String(value || "").replace(/\/+$/g, "");
}

function clampLimit(value) {
  const number = Number(value || DEFAULT_LIMIT);
  if (!Number.isFinite(number)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(50, Math.floor(number)));
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function slugify(value) {
  const slug = String(value || "")
    .toLowerCase()
    .replace(/\.[a-z0-9]{1,8}$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return slug || "envato";
}

function safeFilename(filename) {
  const ext = path.extname(filename).toLowerCase();
  const base = slugify(path.basename(filename, ext));
  return `${base || "download"}${ext || ".bin"}`;
}

function uniquePath(filePath) {
  const parsed = path.parse(filePath);
  return path.join(parsed.dir, `${parsed.name}-${Date.now()}${parsed.ext}`);
}

function cryptoRandomId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function guessContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".zip": "application/zip",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav"
  };
  return map[ext] || "application/octet-stream";
}

export async function loadJsonFile(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function writeJsonFile(filePath, payload) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(payload, null, 2));
}

export function moduleRoot() {
  return path.dirname(path.dirname(fileURLToPath(import.meta.url)));
}
