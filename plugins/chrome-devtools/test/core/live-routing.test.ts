import test from "node:test";
import assert from "node:assert/strict";
import {
  createRouteClaim,
  createRouteSession,
  createRouteSessionManager,
  isLiveRouteSource,
  previewRouteClaim,
  validateRouteSessionOwnership,
  validateRouteOwnership
} from "../../src/core/live-routing.js";

const now = () => new Date("2026-06-08T12:00:00.000Z");
const later = () => new Date("2026-06-08T12:16:00.000Z");

test("creates route tokens and safe previews without query strings", () => {
  const claim = createRouteClaim(
    {
      pageId: "page-1",
      targetId: "target-1",
      profileLabel: "Codex",
      sourceRoute: "@Chrome",
      owningAgentId: "agent-a",
      owningSessionId: "session-a",
      urlPolicyStatus: "allowed",
      url: "https://example.test/dashboard?token=secret&tab=home#settings",
      title: " Dashboard "
    },
    { now }
  );

  assert.match(claim.routeToken, /^rt_[0-9a-f-]{36}$/);
  assert.equal(claim.claimedAt, "2026-06-08T12:00:00.000Z");
  assert.equal(claim.safePreview.safeUrl, "https://example.test/dashboard");
  assert.equal(claim.safePreview.title, "Dashboard");
  assert.doesNotMatch(JSON.stringify(previewRouteClaim(claim)), /token=secret/);
});

test("rejects ownership validation when the owner does not match", () => {
  const claim = createRouteClaim(
    {
      pageId: "page-1",
      targetId: "target-1",
      profileLabel: "Codex",
      sourceRoute: "fixture",
      owningAgentId: "agent-a",
      owningSessionId: "session-a",
      urlPolicyStatus: "allowed"
    },
    { now, routeTokenFactory: () => "rt_fixture-token" }
  );

  const result = validateRouteOwnership(claim, {
    routeToken: "rt_fixture-token",
    agentId: "agent-b",
    sessionId: "session-a"
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "owner-mismatch");
    assert.equal(result.preview.routeToken, "rt_fixture-token");
  }
});

test("validates source routes before creating a claim", () => {
  assert.equal(isLiveRouteSource("@Chrome"), true);
  assert.equal(isLiveRouteSource("official-mcp"), true);
  assert.equal(isLiveRouteSource("chrome-plugin"), false);
  assert.throws(
    () =>
      createRouteClaim({
        pageId: "page-1",
        targetId: "target-1",
        profileLabel: "Codex",
        sourceRoute: "chrome-plugin" as never,
        owningAgentId: "agent-a",
        owningSessionId: "session-a",
        urlPolicyStatus: "allowed"
      }),
    /Unsupported source route/
  );
});

test("blocks live ownership validation when URL policy is blocked or unconfigured", () => {
  const blocked = createRouteClaim(
    {
      pageId: "page-blocked",
      targetId: "target-blocked",
      profileLabel: "Codex",
      sourceRoute: "cdp",
      owningAgentId: "agent-a",
      owningSessionId: "session-a",
      urlPolicyStatus: "blocked",
      urlPolicyReason: "Matched blocked URL pattern."
    },
    { now, routeTokenFactory: () => "rt_blocked-token" }
  );
  const unconfigured = createRouteClaim(
    {
      pageId: "page-unconfigured",
      targetId: "target-unconfigured",
      profileLabel: "Codex",
      sourceRoute: "official-mcp",
      owningAgentId: "agent-a",
      owningSessionId: "session-a",
      urlPolicyStatus: "unconfigured"
    },
    { now, routeTokenFactory: () => "rt_unconfigured-token" }
  );

  const blockedResult = validateRouteOwnership(blocked, {
    routeToken: "rt_blocked-token",
    agentId: "agent-a",
    sessionId: "session-a",
    requireAllowedUrlPolicy: true
  });
  const unconfiguredResult = validateRouteOwnership(unconfigured, {
    routeToken: "rt_unconfigured-token",
    agentId: "agent-a",
    sessionId: "session-a",
    requireAllowedUrlPolicy: true
  });

  assert.equal(blockedResult.ok, false);
  assert.equal(unconfiguredResult.ok, false);
  if (!blockedResult.ok) assert.equal(blockedResult.reason, "url-policy-blocked");
  if (!unconfiguredResult.ok) assert.equal(unconfiguredResult.reason, "url-policy-unconfigured");
});

test("creates safe default isolated route sessions with dry-run upstream previews", () => {
  const route = createRouteSession(
    {
      owningAgentId: "agent-a",
      owningSessionId: "session-a",
      url: "https://example.test/app?session=secret#fragment",
      title: " App "
    },
    { now, routeTokenFactory: () => "rt_route-default" }
  );

  assert.equal(route.routeToken, "rt_route-default");
  assert.equal(route.connectionMode, "isolated");
  assert.equal(route.profileLabel, "isolated");
  assert.equal(route.routeLabel, "isolated-route");
  assert.equal(route.status, "active");
  assert.equal(route.expiresAt, "2026-06-08T12:15:00.000Z");
  assert.equal(route.ttlMs, 15 * 60 * 1000);
  assert.equal(route.safePreview.safeUrl, "https://example.test/app");
  assert.equal(route.upstreamCommandPreview.dryRun, true);
  assert.deepEqual(route.upstreamCommandPreview.command.args, [
    "-y",
    "chrome-devtools-mcp@1.6.0",
    "--isolated",
    "--experimentalPageIdRouting",
    "--redactNetworkHeaders",
    "--no-usage-statistics",
    "--no-performance-crux"
  ]);
  assert.equal(route.upstreamCommandPreview.requiresRouteToken, false);
  assert.equal(route.upstreamCommandPreview.urlPolicy.status, "unconfigured");
  assert.doesNotMatch(JSON.stringify(route.safePreview), /session=secret/);
});

test("requires URL policy for strict profile-connected route sessions", () => {
  assert.throws(
    () =>
      createRouteSession(
        {
          connectionMode: "autoConnect",
          owningAgentId: "agent-a",
          owningSessionId: "session-a",
          profileLabel: "codex",
          strict: true
        },
        { now, routeTokenFactory: () => "rt_missing-policy" }
      ),
    /Strict profile-connected routes require/
  );

  const route = createRouteSession(
    {
      connectionMode: "autoConnect",
      routeLabel: "debug-session",
      owningAgentId: "agent-a",
      owningSessionId: "session-a",
      profileLabel: "codex",
      strict: true,
      allowedUrlPatterns: ["https://example.test/*"],
      blockedUrlPatterns: ["https://example.test/admin/*"],
      url: "https://example.test/dashboard"
    },
    { now, routeTokenFactory: () => "rt_profile-policy" }
  );

  assert.equal(route.profileLabel, "Codex");
  assert.equal(route.urlPolicyStatus, "allowed");
  assert.equal(route.upstreamCommandPreview.requiresRouteToken, true);
  assert.equal(route.upstreamCommandPreview.requiresUrlPolicy, true);
  assert.deepEqual(route.upstreamCommandPreview.urlPolicy.allowedUrlPatterns, ["https://example.test/*"]);
  assert.ok(route.upstreamCommandPreview.command.args.includes("--autoConnect"));
  assert.ok(route.upstreamCommandPreview.command.args.includes("--allowedUrlPattern"));
  assert.ok(route.upstreamCommandPreview.command.args.includes("--blockedUrlPattern"));
});

test("blocks strict profile-connected routes when the URL misses policy", () => {
  assert.throws(
    () =>
      createRouteSession(
        {
          connectionMode: "autoConnect",
          owningAgentId: "agent-a",
          owningSessionId: "session-a",
          profileLabel: "Codex",
          strict: true,
          allowedUrlPatterns: ["https://example.test/*"],
          url: "https://other.test/dashboard"
        },
        { now, routeTokenFactory: () => "rt_policy-miss" }
      ),
    /URL did not match an allowed URL pattern/
  );
});

test("lists, inspects, expires, and revokes route sessions", () => {
  const manager = createRouteSessionManager([], { now, routeTokenFactory: () => "rt_lifecycle" });
  const route = manager.create({
    routeLabel: "short-lived",
    owningAgentId: "agent-a",
    owningSessionId: "session-a",
    ttlMs: 60_000
  });

  assert.equal(manager.list({ now }).length, 1);
  assert.equal(manager.inspect("rt_lifecycle", { now }).status, "active");
  assert.equal(manager.list({ now: later }).length, 0);
  assert.equal(manager.list({ now: later, includeExpired: true })[0]?.status, "expired");

  const expiredValidation = validateRouteSessionOwnership(route, {
    routeToken: "rt_lifecycle",
    agentId: "agent-a",
    sessionId: "session-a",
    now: later
  });
  assert.equal(expiredValidation.ok, false);
  if (!expiredValidation.ok) assert.equal(expiredValidation.reason, "token-expired");

  const revoked = manager.revoke("rt_lifecycle", { now });
  const revokedValidation = validateRouteSessionOwnership(revoked, {
    routeToken: "rt_lifecycle",
    agentId: "agent-a",
    sessionId: "session-a",
    now
  });
  assert.equal(revoked.status, "revoked");
  assert.equal(revokedValidation.ok, false);
  if (!revokedValidation.ok) assert.equal(revokedValidation.reason, "token-revoked");
});
