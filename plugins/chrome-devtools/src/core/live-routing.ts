import { randomUUID } from "node:crypto";
import {
  buildUpstreamMcpArgs,
  type UpstreamConnectionMode,
  type UpstreamMcpRuntimeConfig
} from "../upstream/chrome-devtools-mcp.js";

export const LIVE_ROUTE_SOURCES = ["@Chrome", "official-mcp", "cdp", "fixture"] as const;

export type LiveRouteSource = (typeof LIVE_ROUTE_SOURCES)[number];

export const URL_POLICY_STATUSES = ["allowed", "blocked", "unconfigured"] as const;

export type UrlPolicyStatus = (typeof URL_POLICY_STATUSES)[number];

export const LIVE_ROUTE_STATUSES = ["active", "expired", "revoked"] as const;

export type LiveRouteStatus = (typeof LIVE_ROUTE_STATUSES)[number];

export type LiveRouteConnectionMode = UpstreamConnectionMode;

export const DEFAULT_ROUTE_TTL_MS = 15 * 60 * 1000;

export const DEFAULT_ROUTE_EVIDENCE_POLICY = {
  redactNetworkHeaders: true,
  usageStatistics: false,
  performanceCrux: false,
  experimentalPageIdRouting: true,
  allowScreenshots: true,
  maxEvidenceBytes: 2_000_000
} as const satisfies LiveRouteEvidencePolicy;

export type LiveRouteEvidencePolicy = {
  redactNetworkHeaders: boolean;
  usageStatistics: boolean;
  performanceCrux: boolean;
  experimentalPageIdRouting: boolean;
  allowScreenshots: boolean;
  maxEvidenceBytes: number;
};

export type RouteUrlPolicy = {
  status: UrlPolicyStatus;
  reason?: string;
  allowedUrlPatterns: string[];
  blockedUrlPatterns: string[];
  strict: boolean;
};

export type LiveRouteCommandPreview = {
  dryRun: true;
  command: {
    command: "npx";
    args: string[];
  };
  displayCommand: string;
  connectionMode: LiveRouteConnectionMode;
  routeToken: string;
  routeLabel: string;
  requiresRouteToken: boolean;
  requiresUrlPolicy: boolean;
  urlPolicy: RouteUrlPolicy;
  safety: Pick<
    LiveRouteEvidencePolicy,
    "redactNetworkHeaders" | "usageStatistics" | "performanceCrux" | "experimentalPageIdRouting"
  >;
};

export type LiveRoutePreview = {
  routeToken: string;
  routeLabel?: string;
  pageId: string;
  targetId: string;
  profileLabel: string;
  sourceRoute: LiveRouteSource;
  owningAgentId: string;
  owningSessionId: string;
  urlPolicyStatus: UrlPolicyStatus;
  safeUrl?: string;
  title?: string;
  claimedAt: string;
  expiresAt?: string;
};

export type LiveRouteClaim = {
  routeToken: string;
  routeLabel?: string;
  pageId: string;
  targetId: string;
  profileLabel: string;
  sourceRoute: LiveRouteSource;
  owningAgentId: string;
  owningSessionId: string;
  urlPolicyStatus: UrlPolicyStatus;
  urlPolicyReason?: string;
  claimedAt: string;
  expiresAt?: string;
  safePreview: LiveRoutePreview;
};

export type CreateRouteClaimInput = {
  routeLabel?: string;
  pageId: string;
  targetId: string;
  profileLabel: string;
  sourceRoute: LiveRouteSource;
  owningAgentId: string;
  owningSessionId: string;
  urlPolicyStatus: UrlPolicyStatus;
  urlPolicyReason?: string;
  url?: string;
  title?: string;
  expiresAt?: string;
};

export type CreateRouteClaimOptions = {
  routeTokenFactory?: () => string;
  now?: () => Date;
};

export type RouteOwnershipRequest = {
  routeToken: string;
  agentId: string;
  sessionId: string;
  requireAllowedUrlPolicy?: boolean;
  now?: () => Date;
};

export type RouteOwnershipValidation =
  | {
      ok: true;
      claim: LiveRouteClaim;
      preview: LiveRoutePreview;
    }
  | {
      ok: false;
      reason:
        | "token-mismatch"
        | "owner-mismatch"
        | "token-expired"
        | "token-revoked"
        | "url-policy-blocked"
        | "url-policy-unconfigured";
      message: string;
      preview: LiveRoutePreview;
    };

export type CreateRouteSessionInput = {
  connectionMode?: LiveRouteConnectionMode;
  routeLabel?: string;
  ownerLabel?: string;
  owningAgentId: string;
  owningSessionId: string;
  profileLabel?: string;
  chromeProfileLabel?: string;
  sourceRoute?: LiveRouteSource;
  pageId?: string;
  targetId?: string;
  url?: string;
  title?: string;
  allowedUrlPatterns?: string[];
  blockedUrlPatterns?: string[];
  strict?: boolean;
  ttlMs?: number;
  expiresAt?: string;
  evidencePolicy?: Partial<LiveRouteEvidencePolicy>;
  browserUrl?: string;
  wsEndpoint?: string;
};

export type CreateRouteSessionOptions = CreateRouteClaimOptions & {
  defaultTtlMs?: number;
};

export type BuildRouteCommandPreviewInput = {
  routeToken: string;
  routeLabel?: string;
  connectionMode?: LiveRouteConnectionMode;
  allowedUrlPatterns?: string[];
  blockedUrlPatterns?: string[];
  strict?: boolean;
  browserUrl?: string;
  wsEndpoint?: string;
  evidencePolicy?: Partial<LiveRouteEvidencePolicy>;
  urlPolicyStatus?: UrlPolicyStatus;
  urlPolicyReason?: string;
};

export type LiveRouteSession = LiveRouteClaim & {
  connectionMode: LiveRouteConnectionMode;
  status: LiveRouteStatus;
  routeLabel: string;
  ownerLabel: string;
  allowedUrlPatterns: string[];
  blockedUrlPatterns: string[];
  strict: boolean;
  ttlMs: number;
  evidencePolicy: LiveRouteEvidencePolicy;
  upstreamCommandPreview: LiveRouteCommandPreview;
  revokedAt?: string;
};

export type LiveRouteSessionListItem = LiveRoutePreview & {
  connectionMode: LiveRouteConnectionMode;
  status: LiveRouteStatus;
  routeLabel: string;
  ownerLabel: string;
  ttlMs: number;
  allowedUrlPatterns: string[];
  blockedUrlPatterns: string[];
  upstreamCommandPreview: LiveRouteCommandPreview;
};

export type ListRouteSessionsOptions = {
  now?: () => Date;
  includeExpired?: boolean;
  includeRevoked?: boolean;
};

export class LiveRouteSessionManager {
  readonly #routes = new Map<string, LiveRouteSession>();
  readonly #options: CreateRouteSessionOptions;

  constructor(routes: LiveRouteSession[] = [], options: CreateRouteSessionOptions = {}) {
    this.#options = options;
    for (const route of routes) {
      this.#routes.set(route.routeToken, route);
    }
  }

  create(input: CreateRouteSessionInput, options: CreateRouteSessionOptions = {}): LiveRouteSession {
    const route = createRouteSession(input, { ...this.#options, ...options });
    this.#routes.set(route.routeToken, route);
    return route;
  }

  list(options: ListRouteSessionsOptions = {}): LiveRouteSessionListItem[] {
    return listRouteSessions([...this.#routes.values()], options);
  }

  inspect(routeToken: string, options: ListRouteSessionsOptions = {}): LiveRouteSession {
    return inspectRouteSession([...this.#routes.values()], routeToken, options);
  }

  revoke(routeToken: string, options: { now?: () => Date } = {}): LiveRouteSession {
    const route = this.#routes.get(routeToken);
    if (!route) throw new Error(`Route token not found: ${routeToken}`);
    const revoked = revokeRouteSession(route, options);
    this.#routes.set(routeToken, revoked);
    return revoked;
  }
}

export function createRouteToken(): string {
  return `rt_${randomUUID()}`;
}

export function isLiveRouteSource(value: unknown): value is LiveRouteSource {
  return typeof value === "string" && (LIVE_ROUTE_SOURCES as readonly string[]).includes(value);
}

export function isUrlPolicyStatus(value: unknown): value is UrlPolicyStatus {
  return typeof value === "string" && (URL_POLICY_STATUSES as readonly string[]).includes(value);
}

export function createRouteSessionManager(
  routes: LiveRouteSession[] = [],
  options: CreateRouteSessionOptions = {}
): LiveRouteSessionManager {
  return new LiveRouteSessionManager(routes, options);
}

export function createRouteClaim(input: CreateRouteClaimInput, options: CreateRouteClaimOptions = {}): LiveRouteClaim {
  const sourceRoute = parseLiveRouteSource(input.sourceRoute);
  const urlPolicyStatus = parseUrlPolicyStatus(input.urlPolicyStatus);
  const routeToken = assertNonEmpty("routeToken", options.routeTokenFactory?.() ?? createRouteToken());
  const claimedAt = (options.now?.() ?? new Date()).toISOString();
  const routeLabel = input.routeLabel?.trim();

  const base = {
    routeToken,
    ...(routeLabel ? { routeLabel } : {}),
    pageId: assertNonEmpty("pageId", input.pageId),
    targetId: assertNonEmpty("targetId", input.targetId),
    profileLabel: assertNonEmpty("profileLabel", input.profileLabel),
    sourceRoute,
    owningAgentId: assertNonEmpty("owningAgentId", input.owningAgentId),
    owningSessionId: assertNonEmpty("owningSessionId", input.owningSessionId),
    urlPolicyStatus,
    claimedAt,
    ...(input.expiresAt ? { expiresAt: input.expiresAt } : {})
  };

  const preview = buildPreview(base, input.url, input.title);

  return {
    ...base,
    ...(input.urlPolicyReason ? { urlPolicyReason: input.urlPolicyReason } : {}),
    safePreview: preview
  };
}

export function createRouteSession(
  input: CreateRouteSessionInput,
  options: CreateRouteSessionOptions = {}
): LiveRouteSession {
  const now = options.now?.() ?? new Date();
  const connectionMode = parseConnectionMode(input.connectionMode ?? "isolated");
  const ttlMs = normalizeTtlMs(input.ttlMs ?? options.defaultTtlMs ?? DEFAULT_ROUTE_TTL_MS);
  const expiresAt = normalizeExpiresAt(input.expiresAt, now, ttlMs);
  const allowedUrlPatterns = compactList(input.allowedUrlPatterns);
  const blockedUrlPatterns = compactList(input.blockedUrlPatterns);
  const strict = input.strict ?? false;
  const urlPolicy = evaluateRouteUrlPolicy({
    url: input.url,
    allowedUrlPatterns,
    blockedUrlPatterns,
    strict
  });
  assertStrictRoutePolicy({ connectionMode, urlPolicy });

  const routeLabel = assertNonEmpty("routeLabel", input.routeLabel ?? `${connectionMode}-route`);
  const evidencePolicy = normalizeEvidencePolicy(input.evidencePolicy);
  const claim = createRouteClaim(
    {
      pageId: input.pageId ?? "pending-page",
      targetId: input.targetId ?? "pending-target",
      profileLabel: normalizeRouteProfileLabel(input.profileLabel ?? input.chromeProfileLabel, connectionMode),
      sourceRoute: input.sourceRoute ?? "official-mcp",
      owningAgentId: input.owningAgentId,
      owningSessionId: input.owningSessionId,
      routeLabel,
      urlPolicyStatus: urlPolicy.status,
      ...(urlPolicy.reason ? { urlPolicyReason: urlPolicy.reason } : {}),
      url: input.url,
      title: input.title,
      expiresAt
    },
    { now: () => now, routeTokenFactory: options.routeTokenFactory }
  );

  return {
    ...claim,
    connectionMode,
    status: "active",
    routeLabel,
    ownerLabel: assertNonEmpty("ownerLabel", input.ownerLabel ?? input.owningAgentId),
    allowedUrlPatterns,
    blockedUrlPatterns,
    strict,
    ttlMs,
    evidencePolicy,
    upstreamCommandPreview: buildRouteCommandPreview({
      routeToken: claim.routeToken,
      routeLabel,
      connectionMode,
      allowedUrlPatterns,
      blockedUrlPatterns,
      strict,
      browserUrl: input.browserUrl,
      wsEndpoint: input.wsEndpoint,
      evidencePolicy,
      urlPolicyStatus: urlPolicy.status,
      urlPolicyReason: urlPolicy.reason
    })
  };
}

export function listRouteSessions(
  routes: readonly LiveRouteSession[],
  options: ListRouteSessionsOptions = {}
): LiveRouteSessionListItem[] {
  return routes
    .map((route) => routeWithDerivedStatus(route, options.now?.() ?? new Date()))
    .filter((route) => options.includeExpired || route.status !== "expired")
    .filter((route) => options.includeRevoked || route.status !== "revoked")
    .map(routeToListItem);
}

export function inspectRouteSession(
  routes: readonly LiveRouteSession[],
  routeToken: string,
  options: ListRouteSessionsOptions = {}
): LiveRouteSession {
  const normalizedToken = assertNonEmpty("routeToken", routeToken);
  const route = routes.find((candidate) => candidate.routeToken === normalizedToken);
  if (!route) throw new Error(`Route token not found: ${normalizedToken}`);
  return routeWithDerivedStatus(route, options.now?.() ?? new Date());
}

export function revokeRouteSession(
  route: LiveRouteSession,
  options: { now?: () => Date } = {}
): LiveRouteSession {
  const revokedAt = (options.now?.() ?? new Date()).toISOString();
  return {
    ...route,
    status: "revoked",
    revokedAt
  };
}

export function buildRouteCommandPreview(input: BuildRouteCommandPreviewInput): LiveRouteCommandPreview {
  const connectionMode = parseConnectionMode(input.connectionMode ?? "isolated");
  const routeToken = assertNonEmpty("routeToken", input.routeToken);
  const routeLabel = assertNonEmpty("routeLabel", input.routeLabel ?? `${connectionMode}-route`);
  const allowedUrlPatterns = compactList(input.allowedUrlPatterns);
  const blockedUrlPatterns = compactList(input.blockedUrlPatterns);
  const strict = input.strict ?? false;
  const evidencePolicy = normalizeEvidencePolicy(input.evidencePolicy);
  const status = parseUrlPolicyStatus(input.urlPolicyStatus ?? inferPolicyStatus(allowedUrlPatterns, blockedUrlPatterns));
  const urlPolicy: RouteUrlPolicy = {
    status,
    ...(input.urlPolicyReason ? { reason: input.urlPolicyReason } : {}),
    allowedUrlPatterns,
    blockedUrlPatterns,
    strict
  };
  const upstreamConfig: UpstreamMcpRuntimeConfig = {
    connectionMode,
    routeToken,
    browserUrl: input.browserUrl,
    wsEndpoint: input.wsEndpoint,
    allowedUrlPatterns,
    blockedUrlPatterns,
    redactNetworkHeaders: evidencePolicy.redactNetworkHeaders,
    usageStatistics: evidencePolicy.usageStatistics,
    performanceCrux: evidencePolicy.performanceCrux,
    experimentalPageIdRouting: evidencePolicy.experimentalPageIdRouting,
    strict
  };
  const args = buildUpstreamMcpArgs(upstreamConfig);

  return {
    dryRun: true,
    command: {
      command: "npx",
      args
    },
    displayCommand: formatCommand("npx", args),
    connectionMode,
    routeToken,
    routeLabel,
    requiresRouteToken: isProfileConnectedMode(connectionMode),
    requiresUrlPolicy: isProfileConnectedMode(connectionMode),
    urlPolicy,
    safety: {
      redactNetworkHeaders: evidencePolicy.redactNetworkHeaders,
      usageStatistics: evidencePolicy.usageStatistics,
      performanceCrux: evidencePolicy.performanceCrux,
      experimentalPageIdRouting: evidencePolicy.experimentalPageIdRouting
    }
  };
}

export function validateRouteOwnership(
  claim: LiveRouteClaim,
  request: RouteOwnershipRequest
): RouteOwnershipValidation {
  const preview = previewRouteClaim(claim);
  const now = request.now?.() ?? new Date();

  if (request.routeToken !== claim.routeToken) {
    return {
      ok: false,
      reason: "token-mismatch",
      message: "Route token does not match the claimed live target.",
      preview
    };
  }

  if (claim.expiresAt && Date.parse(claim.expiresAt) <= now.getTime()) {
    return {
      ok: false,
      reason: "token-expired",
      message: "Route token has expired.",
      preview
    };
  }

  if (request.agentId !== claim.owningAgentId || request.sessionId !== claim.owningSessionId) {
    return {
      ok: false,
      reason: "owner-mismatch",
      message: "Route token belongs to a different agent or session.",
      preview
    };
  }

  if (request.requireAllowedUrlPolicy && claim.urlPolicyStatus === "blocked") {
    return {
      ok: false,
      reason: "url-policy-blocked",
      message: claim.urlPolicyReason ?? "URL policy blocks live work for this target.",
      preview
    };
  }

  if (request.requireAllowedUrlPolicy && claim.urlPolicyStatus === "unconfigured") {
    return {
      ok: false,
      reason: "url-policy-unconfigured",
      message: claim.urlPolicyReason ?? "URL policy must be configured before live work for this target.",
      preview
    };
  }

  return {
    ok: true,
    claim,
    preview
  };
}

export function validateRouteSessionOwnership(
  route: LiveRouteSession,
  request: RouteOwnershipRequest
): RouteOwnershipValidation {
  const preview = previewRouteClaim(route);
  const status = routeStatusAt(route, request.now?.() ?? new Date());

  if (status === "revoked") {
    return {
      ok: false,
      reason: "token-revoked",
      message: "Route token has been revoked.",
      preview
    };
  }

  if (status === "expired") {
    return {
      ok: false,
      reason: "token-expired",
      message: "Route token has expired.",
      preview
    };
  }

  return validateRouteOwnership(route, request);
}

export function previewRouteClaim(claim: LiveRouteClaim): LiveRoutePreview {
  return { ...claim.safePreview };
}

function parseConnectionMode(value: string): LiveRouteConnectionMode {
  if (value === "isolated" || value === "autoConnect" || value === "browserUrl" || value === "wsEndpoint") {
    return value;
  }
  throw new Error(`Unsupported route connection mode: ${value}`);
}

function parseLiveRouteSource(value: unknown): LiveRouteSource {
  if (isLiveRouteSource(value)) return value;
  throw new Error(`Unsupported source route: ${String(value)}`);
}

function parseUrlPolicyStatus(value: unknown): UrlPolicyStatus {
  if (isUrlPolicyStatus(value)) return value;
  throw new Error(`Unsupported URL policy status: ${String(value)}`);
}

function buildPreview(
  claim: Omit<LiveRouteClaim, "safePreview" | "urlPolicyReason">,
  url?: string,
  title?: string
): LiveRoutePreview {
  const safeUrl = safePreviewUrl(url);
  const trimmedTitle = title?.trim();
  return {
    routeToken: claim.routeToken,
    ...(claim.routeLabel ? { routeLabel: claim.routeLabel } : {}),
    pageId: claim.pageId,
    targetId: claim.targetId,
    profileLabel: claim.profileLabel,
    sourceRoute: claim.sourceRoute,
    owningAgentId: claim.owningAgentId,
    owningSessionId: claim.owningSessionId,
    urlPolicyStatus: claim.urlPolicyStatus,
    ...(safeUrl ? { safeUrl } : {}),
    ...(trimmedTitle ? { title: trimmedTitle } : {}),
    claimedAt: claim.claimedAt,
    ...(claim.expiresAt ? { expiresAt: claim.expiresAt } : {})
  };
}

function routeToListItem(route: LiveRouteSession): LiveRouteSessionListItem {
  return {
    ...previewRouteClaim(route),
    connectionMode: route.connectionMode,
    status: route.status,
    routeLabel: route.routeLabel,
    ownerLabel: route.ownerLabel,
    ttlMs: route.ttlMs,
    allowedUrlPatterns: [...route.allowedUrlPatterns],
    blockedUrlPatterns: [...route.blockedUrlPatterns],
    upstreamCommandPreview: route.upstreamCommandPreview
  };
}

function routeWithDerivedStatus(route: LiveRouteSession, now: Date): LiveRouteSession {
  return {
    ...route,
    status: routeStatusAt(route, now)
  };
}

function routeStatusAt(route: LiveRouteSession, now: Date): LiveRouteStatus {
  if (route.revokedAt || route.status === "revoked") return "revoked";
  if (Date.parse(route.expiresAt ?? "") <= now.getTime()) return "expired";
  return "active";
}

function evaluateRouteUrlPolicy(input: {
  url?: string;
  allowedUrlPatterns: string[];
  blockedUrlPatterns: string[];
  strict: boolean;
}): RouteUrlPolicy {
  const { url, allowedUrlPatterns, blockedUrlPatterns, strict } = input;
  const hasAllowed = allowedUrlPatterns.length > 0;
  const hasBlocked = blockedUrlPatterns.length > 0;

  if (!hasAllowed && !hasBlocked) {
    return {
      status: "unconfigured",
      reason: "No URL allow/block policy is configured.",
      allowedUrlPatterns,
      blockedUrlPatterns,
      strict
    };
  }

  if (url && blockedUrlPatterns.some((pattern) => matchesUrlPattern(url, pattern))) {
    return {
      status: "blocked",
      reason: "URL matched a blocked URL pattern.",
      allowedUrlPatterns,
      blockedUrlPatterns,
      strict
    };
  }

  if (hasAllowed && url && !allowedUrlPatterns.some((pattern) => matchesUrlPattern(url, pattern))) {
    return {
      status: "blocked",
      reason: "URL did not match an allowed URL pattern.",
      allowedUrlPatterns,
      blockedUrlPatterns,
      strict
    };
  }

  return {
    status: "allowed",
    reason: url ? "URL policy permits this route target." : "URL policy is configured for route creation.",
    allowedUrlPatterns,
    blockedUrlPatterns,
    strict
  };
}

function assertStrictRoutePolicy(input: { connectionMode: LiveRouteConnectionMode; urlPolicy: RouteUrlPolicy }): void {
  if (!isProfileConnectedMode(input.connectionMode) || !input.urlPolicy.strict) return;
  if (input.urlPolicy.status === "unconfigured") {
    throw new Error("Strict profile-connected routes require at least one allowed or blocked URL pattern.");
  }
  if (input.urlPolicy.status === "blocked") {
    throw new Error(input.urlPolicy.reason ?? "Strict URL policy blocks this route.");
  }
}

function inferPolicyStatus(allowedUrlPatterns: string[], blockedUrlPatterns: string[]): UrlPolicyStatus {
  return allowedUrlPatterns.length > 0 || blockedUrlPatterns.length > 0 ? "allowed" : "unconfigured";
}

function matchesUrlPattern(url: string, pattern: string): boolean {
  const trimmedPattern = pattern.trim();
  if (!trimmedPattern) return false;
  if (trimmedPattern === url) return true;
  const regexp = new RegExp(`^${trimmedPattern.split("*").map(escapeRegExp).join(".*")}$`);
  return regexp.test(url);
}

function escapeRegExp(value: string): string {
  return value.replace(/[\\^$+?.()|[\]{}]/g, "\\$&");
}

function isProfileConnectedMode(connectionMode: LiveRouteConnectionMode): boolean {
  return connectionMode !== "isolated";
}

function normalizeEvidencePolicy(policy: Partial<LiveRouteEvidencePolicy> | undefined): LiveRouteEvidencePolicy {
  const normalized = {
    ...DEFAULT_ROUTE_EVIDENCE_POLICY,
    ...policy
  };
  if (!Number.isFinite(normalized.maxEvidenceBytes) || normalized.maxEvidenceBytes <= 0) {
    throw new Error("maxEvidenceBytes must be a positive finite number");
  }
  return normalized;
}

function normalizeTtlMs(value: number): number {
  if (!Number.isFinite(value) || value <= 0) throw new Error("ttlMs must be a positive finite number");
  return Math.floor(value);
}

function normalizeExpiresAt(value: string | undefined, now: Date, ttlMs: number): string {
  if (!value) return new Date(now.getTime() + ttlMs).toISOString();
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error("expiresAt must be a valid ISO date-time");
  if (timestamp <= now.getTime()) throw new Error("expiresAt must be later than the route creation time");
  return new Date(timestamp).toISOString();
}

function normalizeRouteProfileLabel(value: string | undefined, connectionMode: LiveRouteConnectionMode): string {
  const trimmed = value?.trim();
  if (!trimmed) return connectionMode === "isolated" ? "isolated" : "unknown";
  const lower = trimmed.toLowerCase();
  if (lower === "codex") return "Codex";
  if (lower === "openai-agent") return "openai-agent";
  return trimmed;
}

function compactList(values: string[] | undefined): string[] {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

function formatCommand(command: string, args: string[]): string {
  return [command, ...args].map(shellQuote).join(" ");
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_/:=.,@+-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function safePreviewUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.split("?")[0]?.split("#")[0];
  }
}

function assertNonEmpty(name: string, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${name} is required`);
  return trimmed;
}
