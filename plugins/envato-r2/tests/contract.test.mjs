import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import {
  buildReactRouterDataUrl,
  buildSearchUrl,
  checkStoredSession,
  knownEnvatoApiCalls,
  normalizeEnvatoSearchCard
} from "../src/envato-r2.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");

async function json(relative) {
  return JSON.parse(await readFile(path.join(ROOT, relative), "utf8"));
}

async function text(relative) {
  return readFile(path.join(ROOT, relative), "utf8");
}

test("manifest has plugin identity and local entrypoints", async () => {
  const manifest = await json(".codex-plugin/plugin.json");
  assert.equal(manifest.name, "envato-r2");
  assert.equal(manifest.version, "0.1.1");
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.mcpServers, "./.mcp.json");
  assert.equal(manifest.interface.displayName, "Envato to R2");
  assert.equal(manifest.interface.logo, "./assets/app-icon.svg");
  assert.equal(manifest.interface.composerIcon, "./assets/app-icon.svg");
});

test("manifest routes shipped skill and MCP server through local entrypoints", async () => {
  const manifest = await json(".codex-plugin/plugin.json");
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.mcpServers, "./.mcp.json");
});

test("mcp launcher is plugin local", async () => {
  const mcp = await json(".mcp.json");
  assert.equal(mcp.mcpServers["envato-r2"].command, "./scripts/start-mcp.sh");
});

test("source exposes expected mcp tool names", async () => {
  const server = await text("src/server.mjs");
  for (const tool of [
    "envato_r2_check_setup",
    "envato_r2_check_session",
    "envato_r2_capture_login",
    "envato_r2_search",
    "envato_r2_discover_api",
    "envato_r2_download",
    "envato_r2_search_download"
  ]) {
    assert(server.includes(tool), `missing ${tool}`);
  }
});

test("docs avoid credential capture language and require project names", async () => {
  const readme = await text("README.md");
  const skill = await text("skills/envato-r2/SKILL.md");
  assert(readme.includes("does not ask for your Envato password"));
  assert(skill.includes("Require a project name"));
  assert(skill.includes("Do not bypass Envato"));
});

test("session diagnostic is local-only and redacts cookie and storage values", async () => {
  const result = await checkStoredSession({
    storageState: path.join(ROOT, "tests/fixtures/storage-state.json")
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.ok, true);
  assert.equal(result.networkAccessed, false);
  assert.equal(result.activeEnvatoCookiesPresent, true);
  assert.equal(result.assessment, "active-envato-cookie-evidence-present");
  assert.equal(result.cookies.total, 2);
  assert.equal(result.cookies.active, 1);
  assert.deepEqual(result.cookies.domains, ["app.envato.com"]);
  assert.equal(result.storage.origins[0].localStorage.keyCount, 3);
  assert.equal(result.recapture.recommended, null);
  assert.doesNotMatch(serialized, /user-preferences|locale|bearer-secret-token-in-key-name/);
  assert.doesNotMatch(serialized, /secret-cookie-value|secret-storage-value|another-secret-value/);
});

test("R2 compatibility docs and upload source reject unsupported annotation claims", async () => {
  const source = await text("src/envato-r2.mjs");
  const readme = await text("README.md");
  const reference = await text("references/r2-s3-compatibility.md");

  assert(!source.includes("ObjectAnnotation"));
  assert(readme.includes("does **not** set AWS S3 object annotations"));
  assert(reference.includes("Do not add AWS S3 object annotations"));
});

test("search URLs use the React Router search route and data route", () => {
  const searchUrl = buildSearchUrl({ query: "serif", itemType: "fonts", sort: "popular" });
  assert.equal(searchUrl, "https://app.envato.com/search?itemType=fonts&term=serif&sort=popular");
  assert.equal(
    buildReactRouterDataUrl(searchUrl),
    "https://app.envato.com/search.data?itemType=fonts&term=serif&sort=popular"
  );
});

test("known api calls document search, load more, font previews, related items, and licenses", () => {
  const calls = knownEnvatoApiCalls("https://app.envato.com/search?itemType=fonts&term=&sort=popular");
  assert(calls.some((call) => call.method === "GET" && call.path === "/search.data"));
  assert(calls.some((call) => call.method === "POST" && call.path === "/search"));
  assert(calls.some((call) => call.method === "POST" && call.path === "/font-preview-urls"));
  assert(calls.some((call) => call.method === "POST" && call.path === "/related-items"));
  assert(calls.some((call) => call.method === "GET" && call.path === "/license-certificate/:licenseId/download"));
});

test("structured cards normalize names, previews, font keys, and URLs", () => {
  const result = normalizeEnvatoSearchCard({
    item: {
      itemType: "fonts",
      itemUuid: "280cd891-72b3-4baf-a5ed-2bc169046c3f",
      title: "Editorial Serif",
      authorUsername: "designer",
      image: { fallbackSrc: "https://example.com/preview.jpg" },
      fontPreviewVariants: [
        { name: "Regular", s3LocationKey: "fonts/editorial-regular.otf" },
        { name: "Bold", s3LocationKeys: ["fonts/editorial-bold.otf"] }
      ],
      downloadFormats: [{ assetUuid: "asset-1", label: "OTF" }]
    }
  });

  assert.equal(result.title, "Editorial Serif");
  assert.equal(result.url, "https://app.envato.com/fonts/280cd891-72b3-4baf-a5ed-2bc169046c3f");
  assert.equal(result.thumbnailUrl, "https://example.com/preview.jpg");
  assert.deepEqual(result.fontPreviewKeys, ["fonts/editorial-regular.otf", "fonts/editorial-bold.otf"]);
  assert.equal(result.downloadFormats[0].label, "OTF");
});
