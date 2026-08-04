import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { chromeBridgeHealth, mockChromeTargets } from "../chrome/chrome-plugin-adapter.js";
import { cdpHealth } from "../cdp/cdp-client.js";
import { previewTarget } from "../core/target-registry.js";
import { readApiCalls } from "../core/evidence-store.js";
import { diffRuns } from "../core/debug-run-diff.js";
import { assertNoKnownSecrets } from "../core/redaction-policy.js";
import { createLiveCollectPlan, writeLiveCollectDryRunBundle, type LiveCollectEvidenceKind } from "../core/live-collect.js";
import {
  createRouteSession,
  createRouteSessionManager,
  type LiveRouteConnectionMode,
  type LiveRouteSession
} from "../core/live-routing.js";
import { sampleApiCalls } from "../network/api-call-inventory.js";
import { apiCallToCurl, assertCurlIsSafe } from "../network/curl-export.js";
import { captureResponseBody } from "../network/response-capture.js";
import { callMcpTool, listMcpSurface } from "../mcp/server.js";
import { TOOL_DEFINITIONS } from "../mcp/tools.js";
import {
  buildUpstreamMcpArgs,
  EXPECTED_UPSTREAM_CATEGORIES,
  runUpstreamMcpDoctor,
  type UpstreamConnectionMode,
  type UpstreamMcpRuntimeConfig
} from "../upstream/chrome-devtools-mcp.js";
import { runWeeklyRegressionPack } from "../core/weekly-regression.js";
import type { ApiCall } from "../core/types.js";

type CommandContext = {
  cwd: string;
  args: string[];
};

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main(args: string[]): Promise<void> {
  const context = { cwd: process.cwd(), args };
  const [command, subcommand] = args;

  if (!command || command === "--help" || command === "help") {
    print(help());
    return;
  }

  if (command === "doctor") return doctor(context, subcommand);
  if (command === "upstream" && subcommand === "tools") return upstreamTools(context);
  if (command === "route") return route(context, subcommand);
  if (command === "targets" && subcommand === "list") return targetsList(context);
  if (command === "live" && subcommand === "collect") return liveCollect(context);
  if (command === "lighthouse" && subcommand === "audit") return lighthouseAudit(context);
  if (command === "perf") return perf(context, subcommand);
  if (command === "memory") return memory(context, subcommand);
  if (command === "collect") return collect(context);
  if (command === "api" && subcommand === "calls") return apiCalls(context);
  if (command === "api" && subcommand === "curl") return apiCurl(context);
  if (command === "compare") return compareRuns(context);
  if (command === "replay") return replay(context);
  if (command === "redact") return redact(context);
  if (command === "regression" && subcommand === "weekly") return regressionWeekly(context);
  if (command === "mcp" && subcommand === "serve") return mcpServe(context);

  throw new Error(`Unknown command: ${args.join(" ")}`);
}

function doctor(context: CommandContext, subcommand?: string): void {
  if (subcommand === "upstream-mcp") {
    printJson(runUpstreamMcpDoctor(undefined, upstreamConfigFromArgs(context.args)));
    return;
  }

  if (subcommand === "context7") {
    const script = join(homedir(), "Projects", "PLUGINS", "plugins", "context7", "scripts", "doctor-context7-mcp.mjs");
    if (!existsSync(script)) {
      printJson({ status: "fail", check: "context7", message: "Context7 doctor script not found", script });
      process.exitCode = 1;
      return;
    }
    const result = spawnSync(process.execPath, [script], { cwd: context.cwd, encoding: "utf8" });
    printJson({
      status: result.status === 0 ? "pass" : "fail",
      check: "context7",
      script,
      stdout: compact(result.stdout),
      stderr: compact(result.stderr)
    });
    process.exitCode = result.status ?? 1;
    return;
  }

  printJson({
    status: "pass",
    package: "@ChromeDevTools",
    mode: "first-slice-dry-run",
    chrome: chromeBridgeHealth(),
    cdp: cdpHealth(),
    repairHints: [
      "Live @Chrome tab attachment is unavailable in this local slice; use the Chrome plugin and select the explicit profile instance for live tabs.",
      "Official Chrome DevTools MCP is available as the gated live DevTools backend; run `cdt doctor upstream-mcp` for the exact invocation.",
      "Live CDP websocket attachment remains available through the upstream MCP route instead of this local mock adapter.",
      "Run `cdt doctor context7` before implementing external API behavior.",
      "Use route tokens for profile-connected modes such as autoConnect, browserUrl, and wsEndpoint."
    ]
  });
}

function targetsList(_context: CommandContext): void {
  printJson({
    mode: "mock",
    targets: mockChromeTargets().map(previewTarget)
  });
}

function upstreamTools(context: CommandContext): void {
  const delegates = TOOL_DEFINITIONS.filter((tool) => tool.implementation === "delegate" || tool.upstream);
  printJson({
    package: "chrome-devtools-mcp",
    categories: EXPECTED_UPSTREAM_CATEGORIES,
    command: {
      command: "npx",
      args: buildUpstreamMcpArgs(upstreamConfigFromArgs(context.args))
    },
    tools: delegates.map((tool) => ({
      name: tool.name,
      implementation: tool.implementation,
      capabilityGroup: tool.capabilityGroup,
      upstream: tool.upstream,
      safety: tool.safety
    }))
  });
}

function route(context: CommandContext, subcommand?: string): void {
  if (subcommand === "create") return routeCreate(context);
  if (subcommand === "list") return routeList(context);
  if (subcommand === "inspect") return routeInspect(context);
  if (subcommand === "revoke") return routeRevoke(context);
  throw new Error("route requires one of: create, list, inspect, revoke");
}

function routeCreate(context: CommandContext): void {
  const connectionMode = parseConnectionModeFlag(flag(context.args, "--connection-mode")) ?? "isolated";
  const dryRun = context.args.includes("--dry-run");
  const allowedUrlPatterns = flags(context.args, "--allowed-url-pattern", "--allowedUrlPattern");
  const blockedUrlPatterns = flags(context.args, "--blocked-url-pattern", "--blockedUrlPattern");
  const routeLabel = flag(context.args, "--route-label") ?? flag(context.args, "--label") ?? "debug-session";
  const ttlMs = Number(flag(context.args, "--ttl-ms") ?? Number(flag(context.args, "--ttl-seconds") ?? 900) * 1000);
  const route = createRouteSession({
    routeLabel,
    connectionMode,
    pageId: flag(context.args, "--page-id") ?? `${connectionMode}-page`,
    targetId: flag(context.args, "--target-id") ?? `${connectionMode}-target`,
    profileLabel: flag(context.args, "--profile-label") ?? defaultProfileLabel(connectionMode),
    owningAgentId: flag(context.args, "--agent-id") ?? process.env.CODEX_AGENT_ID ?? "local-agent",
    owningSessionId: flag(context.args, "--session-id") ?? process.env.CODEX_SESSION_ID ?? "local-session",
    ownerLabel: flag(context.args, "--owner-label"),
    url: flag(context.args, "--url"),
    title: flag(context.args, "--title"),
    allowedUrlPatterns,
    blockedUrlPatterns,
    strict: context.args.includes("--strict"),
    ttlMs,
    browserUrl: flag(context.args, "--browser-url") ?? flag(context.args, "--browserUrl"),
    wsEndpoint: flag(context.args, "--ws-endpoint") ?? flag(context.args, "--wsEndpoint")
  });

  if (!dryRun) {
    const store = readRouteStore(context.cwd).filter((candidate) => candidate.routeToken !== route.routeToken);
    store.push(route);
    writeRouteStore(context.cwd, store);
  }

  printJson({
    status: dryRun ? "dry-run" : "created",
    route,
    message: dryRun ? "No route was persisted." : "Route token persisted in the local route store."
  });
}

function routeList(context: CommandContext): void {
  const routes = createRouteSessionManager(readRouteStore(context.cwd)).list({
    includeExpired: context.args.includes("--include-expired"),
    includeRevoked: context.args.includes("--include-revoked")
  });
  printJson({ routeStore: routeStorePath(context.cwd), count: routes.length, routes });
}

function routeInspect(context: CommandContext): void {
  const routeToken = requiredFlag(context.args, "--route-token");
  const route = createRouteSessionManager(readRouteStore(context.cwd)).inspect(routeToken, {
    includeExpired: true,
    includeRevoked: true
  });
  printJson({ route });
}

function routeRevoke(context: CommandContext): void {
  const routeToken = requiredFlag(context.args, "--route-token");
  const store = readRouteStore(context.cwd);
  const manager = createRouteSessionManager(store);
  const revoked = manager.revoke(routeToken);
  const routes = store.map((route) => (route.routeToken === routeToken ? revoked : route));
  writeRouteStore(context.cwd, routes);
  printJson({ status: "revoked", route: revoked, remaining: routes.length });
}

async function liveCollect(context: CommandContext): Promise<void> {
  const evidenceKinds = liveEvidenceKindsFromArgs(context.args);
  const outputRoot = flag(context.args, "--output");
  const dryRun = context.args.includes("--dry-run");
  const plan = createLiveCollectPlan({
    routeToken: requiredFlag(context.args, "--route-token"),
    outputRoot,
    evidenceKinds,
    dryRun
  });
  const delegateResults = await collectDelegatedEvidence(context, evidenceKinds, dryRun);
  if (outputRoot && dryRun) writeLiveCollectDryRunBundle(plan);
  if (outputRoot && !dryRun) writeDelegateResults(outputRoot, delegateResults);
  printJson({
    ...plan,
    delegateResults,
    bundleWritten: Boolean(outputRoot),
    message: dryRun
      ? "Dry-run only; no browser was attached."
      : "Delegated upstream tools were called after route-token and safety gates passed."
  });
}

async function lighthouseAudit(context: CommandContext): Promise<void> {
  const dryRun = !context.args.includes("--live");
  const plan = createLiveCollectPlan({
    routeToken: requiredFlag(context.args, "--route-token"),
    outputRoot: flag(context.args, "--output"),
    evidenceKinds: ["lighthouse"],
    dryRun
  });
  const result = await callMcpTool("lighthouse_audit", delegateInputFromArgs(context.args, plan.routeToken, { dryRun }));
  printJson({
    mode: dryRun ? "dry-run" : "live",
    routeToken: plan.routeToken,
    command: "lighthouse_audit",
    artifacts: plan.artifacts,
    crux: "disabled-by-default",
    result,
    message: dryRun
      ? "No Lighthouse audit was run. Delegated upstream execution must pass route-token gates first."
      : "Lighthouse audit was delegated to upstream Chrome DevTools MCP after gates passed."
  });
}

function perf(context: CommandContext, subcommand?: string): void | Promise<void> {
  if (subcommand === "trace") {
    const action = context.args[2];
    if (action !== "start" && action !== "stop") throw new Error("perf trace requires start or stop");
    return perfTrace(context, action);
  }
  if (subcommand === "insight") return perfInsight(context);
  throw new Error("perf requires one of: trace, insight");
}

async function memory(context: CommandContext, subcommand?: string): Promise<void> {
  const tool = memoryToolForCommand(subcommand);
  const dryRun = !context.args.includes("--live");
  const routeToken = requiredFlag(context.args, "--route-token");
  const result = await callMcpTool(tool, memoryDelegateInput(context.args, routeToken, subcommand, dryRun));
  printJson({
    mode: dryRun ? "dry-run" : "live",
    routeToken,
    command: tool,
    result,
    message: dryRun
      ? "No heap snapshot was captured or read. The preview keeps memory debugging inside the local gated alias."
      : "Memory analysis was delegated through the local bounded Chrome DevTools MCP alias; raw duplicate-string values are never returned."
  });
}

function memoryToolForCommand(subcommand?: string): string {
  const tools: Record<string, string> = {
    capture: "take_heapsnapshot",
    summary: "get_heapsnapshot_summary",
    details: "get_heapsnapshot_details",
    "class-nodes": "get_heapsnapshot_class_nodes",
    retainers: "get_heapsnapshot_retainers",
    close: "close_heapsnapshot",
    "retaining-paths": "get_heapsnapshot_retaining_paths",
    edges: "get_heapsnapshot_edges",
    dominators: "get_heapsnapshot_dominators",
    compare: "compare_heapsnapshots",
    "duplicate-strings": "get_heapsnapshot_duplicate_strings"
  };
  if (!subcommand || !tools[subcommand]) {
    throw new Error(`memory requires one of: ${Object.keys(tools).join(", ")}`);
  }
  return tools[subcommand];
}

function memoryDelegateInput(
  args: string[],
  routeToken: string,
  subcommand: string | undefined,
  dryRun: boolean
): Record<string, unknown> {
  const base = delegateInputFromArgs(args, routeToken, { dryRun });
  if (subcommand === "compare") {
    return compactObject({
      ...base,
      baseFilePath: requiredFlag(args, "--base"),
      currentFilePath: requiredFlag(args, "--current"),
      classIndex: optionalNumberFlag(args, "--class-index")
    });
  }
  const filePath = requiredFlag(args, "--file");
  return compactObject({
    ...base,
    filePath,
    id: optionalNumberFlag(args, "--class-id"),
    nodeId: optionalNumberFlag(args, "--node-id"),
    filterName: flag(args, "--filter"),
    pageIdx: optionalNumberFlag(args, "--page-index"),
    pageSize: optionalNumberFlag(args, "--page-size"),
    maxDepth: optionalNumberFlag(args, "--max-depth"),
    maxNodes: optionalNumberFlag(args, "--max-nodes"),
    maxSiblings: optionalNumberFlag(args, "--max-siblings")
  });
}

async function perfTrace(context: CommandContext, action: "start" | "stop"): Promise<void> {
  const dryRun = !context.args.includes("--live");
  const plan = createLiveCollectPlan({
    routeToken: requiredFlag(context.args, "--route-token"),
    outputRoot: flag(context.args, "--output"),
    evidenceKinds: ["performance"],
    dryRun
  });
  const command = action === "start" ? "performance_start_trace" : "performance_stop_trace";
  const result = await callMcpTool(command, delegateInputFromArgs(context.args, plan.routeToken, { dryRun }));
  printJson({
    mode: dryRun ? "dry-run" : "live",
    routeToken: plan.routeToken,
    command,
    label: flag(context.args, "--label"),
    artifacts: plan.artifacts,
    crux: "disabled-by-default",
    result,
    message: dryRun
      ? "No performance trace was started or stopped. Delegated upstream execution must pass route-token gates first."
      : "Performance trace command was delegated to upstream Chrome DevTools MCP after gates passed."
  });
}

async function perfInsight(context: CommandContext): Promise<void> {
  const dryRun = !context.args.includes("--live");
  const routeToken = requiredFlag(context.args, "--route-token");
  const result = await callMcpTool(
    "performance_analyze_insight",
    delegateInputFromArgs(context.args, routeToken, {
      dryRun,
      insightName: flag(context.args, "--insight") ?? "summary",
      insightSetId: flag(context.args, "--insight-set-id") ?? "dry-run"
    })
  );
  printJson({
    mode: dryRun ? "dry-run" : "live",
    routeToken,
    run: flag(context.args, "--run"),
    insight: flag(context.args, "--insight") ?? "summary",
    command: "performance_analyze_insight",
    result,
    message: dryRun
      ? "Performance insight analysis requires a captured performance summary from delegated upstream execution."
      : "Performance insight analysis was delegated to upstream Chrome DevTools MCP after gates passed."
  });
}

function collect(context: CommandContext): void {
  ensureDryRun(context);
  printJson({
    mode: "dry-run",
    target: flag(context.args, "--target") ?? "active",
    plannedEvidence: ["run.json", "target.json", "timeline.ndjson", "console.ndjson", "network.ndjson", "api-calls.ndjson", "dom-snapshot.json", "screenshot.png"],
    liveAttach: "dry-run-only-for-collect",
    liveAttachMessage: "No live browser was attached by collect. Use upstream MCP delegated tools after route-token gates pass for live DevTools evidence."
  });
}

function apiCalls(context: CommandContext): void {
  ensureDryRun(context);
  const includeCurl = context.args.includes("--include-curl");
  const includeResponses = context.args.includes("--include-responses");
  const calls = sampleApiCalls().map((call) => ({
    ...call,
    redactedCurl: includeCurl ? apiCallToCurl(call) : undefined,
    responsePolicy: includeResponses
      ? captureResponseBody("{\"token\":\"secret\",\"ok\":true}", {
          includeBody: true,
          maxBytes: Number(flag(context.args, "--max-response-bytes") ?? 65536),
          mimeType: "application/json"
        })
      : captureResponseBody("{\"ok\":true}")
  }));
  for (const call of calls) {
    if (call.redactedCurl) assertCurlIsSafe(call.redactedCurl);
  }
  printJson({ mode: "dry-run", count: calls.length, calls });
}

function apiCurl(context: CommandContext): void {
  const run = requiredFlag(context.args, "--run");
  const apiCallId = requiredFlag(context.args, "--api-call");
  const calls = readApiCalls(resolve(context.cwd, run));
  const call = calls.find((candidate) => candidate.id === apiCallId);
  if (!call) throw new Error(`API call not found: ${apiCallId}`);
  const curl = apiCallToCurl(call);
  assertCurlIsSafe(curl);
  print(curl);
}

function compareRuns(context: CommandContext): void {
  const positional = context.args.slice(1).filter((arg) => !arg.startsWith("--"));
  const [beforePath, afterPath] = positional;
  if (!beforePath || !afterPath) throw new Error("compare requires before and after run paths");
  const beforeRoot = resolve(context.cwd, beforePath);
  const afterRoot = resolve(context.cwd, afterPath);
  const before = { apiCalls: readApiCalls(beforeRoot), consoleCount: readConsoleCount(beforeRoot) };
  const after = { apiCalls: readApiCalls(afterRoot), consoleCount: readConsoleCount(afterRoot) };
  printJson(diffRuns(before, after));
}

function replay(context: CommandContext): void {
  const runPath = context.args[1];
  if (!runPath) throw new Error("replay requires a run path");
  const root = resolve(context.cwd, runPath);
  const run = JSON.parse(readFileSync(join(root, "run.json"), "utf8")) as { id: string; symptom?: string };
  const apiCalls = readApiCalls(root);
  printJson({
    id: run.id,
    symptom: run.symptom,
    apiCalls: apiCalls.length,
    failures: apiCalls.filter((call) => call.status && call.status >= 400).length,
    format: flag(context.args, "--format") ?? "json"
  });
}

function redact(context: CommandContext): void {
  const fixturePath = context.args[1];
  if (!fixturePath) throw new Error("redact requires a fixture/run path");
  const root = resolve(context.cwd, fixturePath);
  const text = existsSync(join(root, "input.txt")) ? readFileSync(join(root, "input.txt"), "utf8") : "";
  const findings = assertNoKnownSecrets(scrubSensitiveText(text));
  printJson({ status: findings.length === 0 ? "pass" : "fail", findings });
  if (findings.length > 0) process.exitCode = 1;
}

function regressionWeekly(context: CommandContext): void {
  ensureDryRun(context);
  const report = runWeeklyRegressionPack();
  printJson(report);
  if (report.status !== "pass") process.exitCode = 1;
}

function mcpServe(context: CommandContext): void {
  if (!context.args.includes("--list-tools")) {
    printJson({ mode: "metadata-only", message: "Full stdio MCP server is deferred in the first slice." });
    return;
  }
  const caps = (flag(context.args, "--caps") ?? "core,evidence").split(",").filter(Boolean);
  printJson(listMcpSurface(caps));
}

function ensureDryRun(context: CommandContext): void {
  if (!context.args.includes("--dry-run")) {
    throw new Error("First-slice implementation only supports --dry-run for this command.");
  }
}

function flag(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index >= 0) return args[index + 1];
  const prefix = `${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function flags(args: string[], ...names: string[]): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    for (const name of names) {
      if (arg === name && args[index + 1]) values.push(args[index + 1]);
      const prefix = `${name}=`;
      if (arg.startsWith(prefix)) values.push(arg.slice(prefix.length));
    }
  }
  return values;
}

function upstreamConfigFromArgs(args: string[]): UpstreamMcpRuntimeConfig {
  return {
    connectionMode: parseConnectionModeFlag(flag(args, "--connection-mode")),
    routeToken: flag(args, "--route-token"),
    browserUrl: flag(args, "--browser-url") ?? flag(args, "--browserUrl"),
    wsEndpoint: flag(args, "--ws-endpoint") ?? flag(args, "--wsEndpoint"),
    allowedUrlPatterns: flags(args, "--allowed-url-pattern", "--allowedUrlPattern"),
    blockedUrlPatterns: flags(args, "--blocked-url-pattern", "--blockedUrlPattern"),
    redactNetworkHeaders: !args.includes("--no-redact-network-headers"),
    usageStatistics: args.includes("--usage-statistics"),
    performanceCrux: args.includes("--performance-crux"),
    experimentalPageIdRouting: !args.includes("--no-experimental-page-id-routing"),
    categoryExperimentalWebmcp: args.includes("--category-experimental-webmcp") || args.includes("--categoryExperimentalWebmcp"),
    categoryExperimentalThirdParty: args.includes("--category-experimental-third-party") || args.includes("--categoryExperimentalThirdParty"),
    strict: args.includes("--strict")
  };
}

function parseConnectionModeFlag(value: string | undefined): UpstreamConnectionMode | undefined {
  if (!value) return undefined;
  if (value === "isolated" || value === "autoConnect" || value === "browserUrl" || value === "wsEndpoint") return value;
  throw new Error(`Unsupported --connection-mode: ${value}`);
}

function requiredFlag(args: string[], name: string): string {
  const value = flag(args, name);
  if (!value) throw new Error(`Missing required flag ${name}`);
  return value;
}

function readConsoleCount(root: string): number {
  const path = join(root, "console.ndjson");
  if (!existsSync(path)) return 0;
  return readFileSync(path, "utf8").trim().split("\n").filter(Boolean).length;
}

async function collectDelegatedEvidence(
  context: CommandContext,
  evidenceKinds: LiveCollectEvidenceKind[],
  dryRun: boolean
): Promise<Array<{ evidenceKind: LiveCollectEvidenceKind; tool: string; result: unknown }>> {
  const routeToken = requiredFlag(context.args, "--route-token");
  const results: Array<{ evidenceKind: LiveCollectEvidenceKind; tool: string; result: unknown }> = [];
  for (const evidenceKind of evidenceKinds) {
    const tool = delegateToolForEvidenceKind(evidenceKind);
    const result = await callMcpTool(tool, delegateInputFromArgs(context.args, routeToken, { dryRun }));
    results.push({ evidenceKind, tool, result });
  }
  return results;
}

function delegateToolForEvidenceKind(kind: LiveCollectEvidenceKind): string {
  if (kind === "network") return "list_network_requests";
  if (kind === "console") return "list_console_messages";
  if (kind === "snapshot") return "take_snapshot";
  if (kind === "screenshot") return "take_screenshot";
  if (kind === "lighthouse") return "lighthouse_audit";
  return "performance_start_trace";
}

function delegateInputFromArgs(
  args: string[],
  routeToken: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return compactObject({
    routeToken,
    connectionMode: parseConnectionModeFlag(flag(args, "--connection-mode")),
    browserUrl: flag(args, "--browser-url") ?? flag(args, "--browserUrl"),
    wsEndpoint: flag(args, "--ws-endpoint") ?? flag(args, "--wsEndpoint"),
    allowedUrlPatterns: flags(args, "--allowed-url-pattern", "--allowedUrlPattern"),
    blockedUrlPatterns: flags(args, "--blocked-url-pattern", "--blockedUrlPattern"),
    timeoutMs: optionalNumberFlag(args, "--timeout-ms"),
    maxPayloadBytes: optionalNumberFlag(args, "--max-payload-bytes"),
    pageId: flag(args, "--page-id"),
    filePath: flag(args, "--file-path"),
    ...extra
  });
}

function optionalNumberFlag(args: string[], name: string): number | undefined {
  const value = flag(args, name);
  if (!value) return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) throw new Error(`${name} must be a finite number.`);
  return numeric;
}

function writeDelegateResults(outputRoot: string, value: unknown): void {
  mkdirSync(outputRoot, { recursive: true });
  writeFileSync(join(outputRoot, "delegate-results.json"), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function compactObject(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function compact(value: string): string {
  return value.trim().slice(0, 2000);
}

function scrubSensitiveText(text: string): string {
  return text
    .split("\n")
    .filter((line) => !/^\s*(cookie|authorization|proxy-authorization|x-api-key|api-key|x-csrf-token|x-xsrf-token|csrf-token|session)\s*[:=]/i.test(line))
    .join("\n")
    .replace(/Bearer\s+\S+/gi, "[REDACTED]")
    .replace(/sk-[a-z0-9_-]+/gi, "[REDACTED]")
    .replace(/"(apiKey|api_key|token|secret|password|session)"\s*:\s*"[^"]*"/gi, '"$1":"[REDACTED]"')
    .replace(/session=\S+/gi, "[REDACTED]")
    .replace(/([?&](?:token|secret|key|password|session|auth|csrf|xsrf)=)[^&\s]+/gi, "$1[REDACTED]")
    .replace(/csrf[-_a-z0-9]*\s*[:=]\s*"?[^"\s,]+/gi, "[REDACTED]");
}

function readRouteStore(cwd: string): LiveRouteSession[] {
  const path = routeStorePath(cwd);
  if (!existsSync(path)) return [];
  const parsed = JSON.parse(readFileSync(path, "utf8")) as { routes?: LiveRouteSession[] };
  return Array.isArray(parsed.routes) ? parsed.routes : [];
}

function writeRouteStore(cwd: string, routes: LiveRouteSession[]): void {
  const path = routeStorePath(cwd);
  mkdirSync(join(cwd, ".chrome-devtools"), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ routes }, null, 2)}\n`, "utf8");
}

function routeStorePath(cwd: string): string {
  return join(cwd, ".chrome-devtools", "routes.json");
}

function defaultProfileLabel(connectionMode: LiveRouteConnectionMode): string {
  return connectionMode === "isolated" ? "openai-agent" : "Codex";
}

function liveEvidenceKindsFromArgs(args: string[]): LiveCollectEvidenceKind[] {
  const kinds: LiveCollectEvidenceKind[] = [];
  if (args.includes("--network")) kinds.push("network");
  if (args.includes("--console")) kinds.push("console");
  if (args.includes("--snapshot")) kinds.push("snapshot");
  if (args.includes("--screenshot")) kinds.push("screenshot");
  if (args.includes("--lighthouse")) kinds.push("lighthouse");
  if (args.includes("--performance")) kinds.push("performance");
  return kinds.length ? kinds : ["network", "console", "snapshot", "screenshot"];
}

function printJson(value: unknown): void {
  print(JSON.stringify(value, null, 2));
}

function print(value: string): void {
  process.stdout.write(`${value}\n`);
}

function help(): string {
  return [
    "cdt commands:",
    "  doctor [context7|upstream-mcp]",
    "  doctor upstream-mcp [--connection-mode isolated|autoConnect|browserUrl|wsEndpoint] [--route-token <token>]",
    "  upstream tools [--connection-mode isolated|autoConnect|browserUrl|wsEndpoint]",
    "  route create [--connection-mode isolated|autoConnect|browserUrl|wsEndpoint] [--allowed-url-pattern <pattern>] [--dry-run]",
    "  route list",
    "  route inspect --route-token <token>",
    "  route revoke --route-token <token>",
    "  targets list",
    "  live collect --route-token <token> [--network] [--console] [--snapshot] [--screenshot] [--dry-run] [--output <dir>]",
    "  lighthouse audit --route-token <token> [--output <file>] [--live]",
    "  perf trace start --route-token <token> [--label <label>] [--live]",
    "  perf trace stop --route-token <token> [--output <file>] [--live]",
    "  perf insight --route-token <token> --run <run> [--insight <name>] [--live]",
    "  memory capture --route-token <token> --file <relative.heapsnapshot> [--live]",
    "  memory summary|details|class-nodes|retainers|retaining-paths|edges|dominators|duplicate-strings --route-token <token> --file <relative.heapsnapshot> [--live]",
    "  memory compare --route-token <token> --base <relative.heapsnapshot> --current <relative.heapsnapshot> [--live]",
    "  collect --target active --dry-run",
    "  api calls --target active --include-curl --dry-run",
    "  api curl --run <run> --api-call <id>",
    "  compare <before> <after> --api --console --screenshot",
    "  replay <run>",
    "  redact <run>",
    "  regression weekly --dry-run",
    "  mcp serve --stdio --list-tools"
  ].join("\n");
}
