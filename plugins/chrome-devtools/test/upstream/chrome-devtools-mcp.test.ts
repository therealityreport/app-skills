import test from "node:test";
import assert from "node:assert/strict";
import { buildMemoryAnalysisMcpArgs, buildUpstreamMcpArgs, runUpstreamMcpDoctor } from "../../src/upstream/chrome-devtools-mcp.js";

test("upstream MCP doctor passes at supported version", () => {
  const result = runUpstreamMcpDoctor("1.6.0");
  assert.equal(result.status, "pass");
  assert.equal(result.package, "chrome-devtools-mcp");
  assert.equal(result.latestVersion, "1.6.0");
  assert.equal(result.connectionMode, "isolated");
  assert.deepEqual(result.command.args.slice(0, 2), ["-y", "chrome-devtools-mcp@1.6.0"]);
  assert.ok(result.checks.some((check) => check.name === "tool categories"));
  assert.ok(result.checks.some((check) => check.name === "safety flags"));
  assert.ok(result.checks.some((check) => check.name === "live delegation" && check.status === "pass"));
});

test("upstream MCP doctor warns on newer upstream version", () => {
  const result = runUpstreamMcpDoctor("1.7.0");
  assert.equal(result.status, "warn");
  assert.ok(result.checks.some((check) => check.status === "warn" && check.name === "package version"));
});

test("profile-connected upstream mode requires route token", () => {
  const result = runUpstreamMcpDoctor("1.6.0", { connectionMode: "autoConnect" });
  assert.equal(result.status, "fail");
  assert.ok(result.checks.some((check) => check.status === "fail" && check.name === "route token"));
});

test("builds bounded upstream MCP args", () => {
  const args = buildUpstreamMcpArgs({
    connectionMode: "autoConnect",
    routeToken: "rt_example",
    allowedUrlPatterns: ["https://example.test/*"]
  });
  assert.deepEqual(args, [
    "-y",
    "chrome-devtools-mcp@1.6.0",
    "--autoConnect",
    "--experimentalPageIdRouting",
    "--redactNetworkHeaders",
    "--no-usage-statistics",
    "--no-performance-crux",
    "--allowedUrlPattern",
    "https://example.test/*"
  ]);
});

test("memory flag is only added by the local memory-child helper", () => {
  const regular = buildUpstreamMcpArgs();
  const memory = buildMemoryAnalysisMcpArgs();
  assert.equal(regular.includes("--memoryDebugging"), false);
  assert.equal(memory.includes("--memoryDebugging"), true);
});
