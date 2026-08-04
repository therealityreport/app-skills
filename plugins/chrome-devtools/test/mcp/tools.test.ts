import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TOOL_DEFINITIONS, toolsForCaps } from "../../src/mcp/tools.js";
import { callMcpTool } from "../../src/mcp/server.js";
import { UPSTREAM_DELEGATE_TOOL_ALLOWLIST } from "../../src/upstream/delegate.js";

test("MCP tool definitions match expected manifest order", () => {
  const expected = JSON.parse(readFileSync("test/mcp/tools-list.expected.json", "utf8")) as { tools: string[] };
  assert.deepEqual(TOOL_DEFINITIONS.map((tool) => tool.name), expected.tools);
});

test("capability filtering exposes network tools when requested", () => {
  const names = toolsForCaps(["core", "network"]).map((tool) => tool.name);
  assert.ok(names.includes("api_calls_collect"));
  assert.ok(names.includes("api_call_to_curl"));
  assert.ok(names.includes("list_network_requests"));
  assert.ok(!names.includes("debug_bundle_create"));
});

test("upstream MCP aliases are marked as delegated and gated", () => {
  const networkAlias = TOOL_DEFINITIONS.find((tool) => tool.name === "list_network_requests");
  assert.equal(networkAlias?.implementation, "delegate");
  assert.equal(networkAlias?.upstream?.package, "chrome-devtools-mcp");
  assert.ok(networkAlias?.safety.includes("gated-live-delegation"));
  assert.ok(networkAlias?.safety.includes("requires-route-token"));
  assert.ok(networkAlias?.safety.includes("requires-redacted-network-headers"));
  assert.ok(networkAlias?.safety.includes("url-policy-recommended-for-profile-routes"));
});

test("upstream MCP aliases match the executable allowlist", () => {
  const delegatedNames = TOOL_DEFINITIONS.filter((tool) => tool.implementation === "delegate").map((tool) => tool.name);
  assert.deepEqual(delegatedNames, [...UPSTREAM_DELEGATE_TOOL_ALLOWLIST]);
});

test("MCP delegated handler returns dry-run preview", async () => {
  const result = await callMcpTool("list_network_requests", {
    routeToken: "route_demo",
    pageId: "page_1",
    dryRun: true,
    pageSize: 50
  });

  assert.equal(typeof result, "object");
  assert.notEqual(result, null);
  const preview = result as {
    mode: string;
    launch: boolean;
    command: { args: string[] };
    upstreamArguments: Record<string, unknown>;
    safety: { routeTokenPreview: string };
  };
  assert.equal(preview.mode, "dry-run");
  assert.equal(preview.launch, false);
  assert.ok(preview.command.args.includes("--redactNetworkHeaders"));
  assert.deepEqual(preview.upstreamArguments, { pageId: "page_1", pageSize: 50 });
  assert.equal(JSON.stringify(preview).includes("route_demo"), false);
  assert.equal(preview.safety.routeTokenPreview, "rou...emo");
});

test("MCP delegated handler rejects missing route token", async () => {
  await assert.rejects(
    () => callMcpTool("take_snapshot", { dryRun: true }),
    /requires a routeToken/
  );
});

test("experimental page tool discovery is list-only", () => {
  const names = toolsForCaps(["experimental"]).map((tool) => tool.name);
  assert.deepEqual(names, ["webmcp_tools_list", "third_party_tools_list"]);
  const webmcp = TOOL_DEFINITIONS.find((tool) => tool.name === "webmcp_tools_list");
  assert.equal(webmcp?.implementation, "local");
  assert.equal(webmcp?.upstream?.tool, "list_webmcp_tools");
  assert.ok(webmcp?.safety.includes("execution-disabled"));
});

test("experimental page tool handler stays list-only", async () => {
  const result = await callMcpTool("webmcp_tools_list", { source: "dry-run" });
  assert.equal(typeof result, "object");
  assert.notEqual(result, null);
  assert.equal((result as { mode: string }).mode, "list-only");
  await assert.rejects(
    () => callMcpTool("webmcp_tools_list", { source: "dry-run", execute: true }),
    /execution is disabled/
  );
});
