import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromeBridgeHealth, mockChromeTargets } from "../chrome/chrome-plugin-adapter.js";
import { createRouteClaim, validateRouteOwnership } from "./live-routing.js";
import { assertNoKnownSecrets } from "./redaction-policy.js";
import { importHarApiCalls, summarizeSseStream } from "../network/har-sse.js";
import { listWebMcpTools } from "../experimental/page-tools.js";

export type WeeklyRegressionCheck = {
  id: string;
  label: string;
  status: "pass" | "fail";
  summary: string;
  details?: Record<string, unknown>;
};

export type WeeklyRegressionReport = {
  schemaVersion: "chrome-devtools.weekly-regression.v1";
  generatedAt: string;
  dryRun: true;
  status: "pass" | "fail";
  counts: { pass: number; fail: number; total: number };
  checks: WeeklyRegressionCheck[];
  redactionStatus: "redacted";
};

export function runWeeklyRegressionPack(options: { generatedAt?: string } = {}): WeeklyRegressionReport {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const checks = [
    routeOwnershipCheck(),
    harSseCheck(),
    pageToolDiscoveryCheck(generatedAt),
    extensionHealthCheck(),
    redactionSafetyCheck()
  ];
  const report = finalizeReport(checks, generatedAt);
  const findings = assertNoKnownSecrets(JSON.stringify(report));
  if (findings.length > 0) {
    checks.push({
      id: "redaction.report-output",
      label: "report output redaction",
      status: "fail",
      summary: "Weekly regression report contains secret-looking output.",
      details: { findings }
    });
    return finalizeReport(checks, generatedAt);
  }
  return report;
}

function routeOwnershipCheck(): WeeklyRegressionCheck {
  const claim = createRouteClaim(
    {
      pageId: "page-weekly-fixture",
      targetId: "target-weekly-fixture",
      profileLabel: "Codex",
      sourceRoute: "fixture",
      owningAgentId: "agent-weekly",
      owningSessionId: "session-weekly",
      urlPolicyStatus: "allowed",
      url: "https://example.test/app?token=secret",
      title: "Weekly fixture"
    },
    {
      routeTokenFactory: () => "rt_weekly_fixture",
      now: () => new Date("2026-06-09T13:00:00.000Z")
    }
  );
  const allowed = validateRouteOwnership(claim, {
    routeToken: "rt_weekly_fixture",
    agentId: "agent-weekly",
    sessionId: "session-weekly",
    requireAllowedUrlPolicy: true
  });
  const blocked = validateRouteOwnership(claim, {
    routeToken: "rt_weekly_fixture",
    agentId: "other-agent",
    sessionId: "session-weekly",
    requireAllowedUrlPolicy: true
  });

  return passOrFail({
    id: "routing.route-ownership",
    label: "route ownership",
    ok: allowed.ok && !blocked.ok && blocked.reason === "owner-mismatch" && !claim.safePreview.safeUrl?.includes("token="),
    summary: "Validates live-route owner checks and safe URL previews.",
    details: { validOwnerAccepted: allowed.ok, ownerMismatchRejected: !blocked.ok, safeUrl: claim.safePreview.safeUrl }
  });
}

function harSseCheck(): WeeklyRegressionCheck {
  const har = JSON.parse(readFixture("network/api-workbench.har.json"));
  const sse = readFixture("network/events.sse");
  const harResult = importHarApiCalls(har, { idPrefix: "weekly" });
  const sseResult = summarizeSseStream(sse);

  return passOrFail({
    id: "network.har-sse",
    label: "HAR and SSE capture",
    ok: harResult.calls.length > 0 && harResult.skipped.length > 0 && sseResult.eventCount > 0,
    summary: "Imports HAR API calls and summarizes server-sent events from fixtures.",
    details: {
      apiCalls: harResult.calls.length,
      skippedHarEntries: harResult.skipped.length,
      sseEvents: sseResult.eventCount,
      sseEventTypes: sseResult.eventTypes
    }
  });
}

function pageToolDiscoveryCheck(generatedAt: string): WeeklyRegressionCheck {
  const registry = JSON.parse(readFixture("experimental/webmcp-tools.json"));
  const result = listWebMcpTools(registry, {
    pageUrl: "https://example.test/tools?session=secret",
    chromeVersion: 149,
    flagsAvailable: true,
    generatedAt
  });
  const redactedTools = result.tools.filter((tool) => tool.redactionStatus === "redacted").length;

  return passOrFail({
    id: "page-tools.discovery",
    label: "page-tool discovery",
    ok: result.tools.length > 0 && result.listOnly && result.execution.enabled === false && redactedTools > 0,
    summary: "Lists page tools without enabling execution and preserves schema redactions.",
    details: { tools: result.tools.length, redactedTools, runtimeStatus: result.availability.runtimeStatus }
  });
}

function extensionHealthCheck(): WeeklyRegressionCheck {
  const health = chromeBridgeHealth();
  const targets = mockChromeTargets();
  return passOrFail({
    id: "extension.health",
    label: "extension health",
    ok: health.mode === "mock" && targets.length > 0,
    summary: "Confirms deferred Chrome bridge health and mock target inventory are available.",
    details: { mode: health.mode, available: health.available, mockTargets: targets.length }
  });
}

function redactionSafetyCheck(): WeeklyRegressionCheck {
  const unsafeText = "authorization: Bearer not-for-output\nhttps://example.test/?token=not-for-output";
  const findings = assertNoKnownSecrets(unsafeText);
  return passOrFail({
    id: "redaction.safety",
    label: "redaction safety",
    ok: findings.length >= 2,
    summary: "Confirms secret-looking text is detected before reports are emitted.",
    details: { findingCount: findings.length }
  });
}

function passOrFail(input: {
  id: string;
  label: string;
  ok: boolean;
  summary: string;
  details?: Record<string, unknown>;
}): WeeklyRegressionCheck {
  return {
    id: input.id,
    label: input.label,
    status: input.ok ? "pass" : "fail",
    summary: input.summary,
    ...(input.details ? { details: input.details } : {})
  };
}

function finalizeReport(checks: WeeklyRegressionCheck[], generatedAt: string): WeeklyRegressionReport {
  const pass = checks.filter((check) => check.status === "pass").length;
  const fail = checks.length - pass;
  return {
    schemaVersion: "chrome-devtools.weekly-regression.v1",
    generatedAt,
    dryRun: true,
    status: fail === 0 ? "pass" : "fail",
    counts: { pass, fail, total: checks.length },
    checks,
    redactionStatus: "redacted"
  };
}

function readFixture(relativePath: string): string {
  const root = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));
  return readFileSync(join(root, "test/fixtures", relativePath), "utf8");
}
