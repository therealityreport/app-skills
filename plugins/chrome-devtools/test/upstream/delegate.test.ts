import test from "node:test";
import assert from "node:assert/strict";
import {
  delegateUpstreamTool,
  prepareUpstreamDelegateCall,
  UPSTREAM_DELEGATE_TOOL_ALLOWLIST
} from "../../src/upstream/delegate.js";

test("upstream delegate allowlist includes the first callable tools", () => {
  assert.deepEqual([...UPSTREAM_DELEGATE_TOOL_ALLOWLIST], [
    "list_network_requests",
    "get_network_request",
    "list_console_messages",
    "take_snapshot",
    "take_screenshot",
    "lighthouse_audit",
    "performance_start_trace",
    "performance_stop_trace",
    "performance_analyze_insight",
    "take_heapsnapshot",
    "get_heapsnapshot_summary",
    "get_heapsnapshot_details",
    "get_heapsnapshot_class_nodes",
    "get_heapsnapshot_retainers",
    "close_heapsnapshot",
    "get_heapsnapshot_retaining_paths",
    "get_heapsnapshot_edges",
    "get_heapsnapshot_dominators",
    "compare_heapsnapshots",
    "get_heapsnapshot_duplicate_strings"
  ]);
});

test("upstream delegate dry-run returns safe command preview without launching", async () => {
  let executed = false;
  const result = await delegateUpstreamTool(
    "list_network_requests",
    {
      routeToken: "route_demo",
      pageId: "page_1",
      pageSize: 25,
      dryRun: true
    },
    {
      executor: async () => {
        executed = true;
        return {};
      }
    }
  );

  assert.equal(executed, false);
  assert.equal(result.mode, "dry-run");
  assert.equal(result.launch, false);
  assert.equal(result.command.command, "npx");
  assert.deepEqual(result.command.args.slice(0, 2), ["-y", "chrome-devtools-mcp@1.6.0"]);
  assert.ok(result.command.args.includes("--isolated"));
  assert.ok(result.command.args.includes("--redactNetworkHeaders"));
  assert.ok(result.command.args.includes("--no-usage-statistics"));
  assert.ok(result.command.args.includes("--no-performance-crux"));
  assert.deepEqual(result.upstreamArguments, { pageId: "page_1", pageSize: 25 });
  assert.equal(JSON.stringify(result).includes("route_demo"), false);
});

test("upstream delegate requires route token", () => {
  assert.throws(
    () => prepareUpstreamDelegateCall("list_console_messages", { dryRun: true }),
    /requires a routeToken/
  );
});

test("profile-connected delegate requires URL policy", () => {
  assert.throws(
    () =>
      prepareUpstreamDelegateCall("list_console_messages", {
        routeToken: "route_demo",
        connectionMode: "autoConnect",
        dryRun: true
      }),
    /requires an allowed or blocked URL policy/
  );
});

test("upstream delegate rejects tools outside the allowlist", () => {
  assert.throws(
    () => prepareUpstreamDelegateCall("list_webmcp_tools", { routeToken: "route_demo", dryRun: true }),
    /Unsupported upstream delegate tool/
  );
});

test("upstream delegate enforces bounded per-tool inputs", () => {
  assert.throws(
    () =>
      prepareUpstreamDelegateCall("list_network_requests", {
        routeToken: "route_demo",
        pageSize: 500,
        dryRun: true
      }),
    /must be <= 200/
  );
});

test("upstream delegate live path redacts executor output and applies payload bounds", async () => {
  const result = await delegateUpstreamTool(
    "list_network_requests",
    {
      routeToken: "route_demo",
      pageSize: 10,
      maxPayloadBytes: 2048
    },
    {
      executor: async () => ({
        requests: [
          {
            url: "https://example.test/api?token=secret-value",
            requestHeaders: {
              Authorization: "Bearer secret-token",
              "Content-Type": "application/json"
            },
            status: 200
          }
        ]
      })
    }
  );

  assert.equal(result.mode, "live");
  assert.equal(result.status, "ok");
  assert.equal(result.redactionStatus, "redacted");
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("secret-value"), false);
  assert.equal(serialized.includes("secret-token"), false);
  assert.ok(serialized.includes("[REDACTED]"));
});

test("memory aliases enable memory debugging only for the spawned child and bound paths", () => {
  const prepared = prepareUpstreamDelegateCall("get_heapsnapshot_details", {
    routeToken: "route_demo",
    filePath: "test/fixtures/memory/baseline.heapsnapshot",
    filterName: "objectsRetainedByDetachedDomNodes",
    pageSize: 50,
    dryRun: true
  });
  assert.equal(prepared.category, "memory");
  assert.ok(prepared.command.args.includes("--memoryDebugging"));
  assert.deepEqual(prepared.upstreamArguments, {
    filePath: "test/fixtures/memory/baseline.heapsnapshot",
    filterName: "objectsRetainedByDetachedDomNodes",
    pageSize: 50
  });
  assert.throws(
    () => prepareUpstreamDelegateCall("get_heapsnapshot_summary", {
      routeToken: "route_demo",
      filePath: "../secret.heapsnapshot",
      dryRun: true
    }),
    /relative path without parent traversal/
  );
  const close = prepareUpstreamDelegateCall("close_heapsnapshot", {
    routeToken: "route_demo",
    filePath: "test/fixtures/memory/baseline.heapsnapshot",
    dryRun: true
  });
  assert.equal(close.category, "memory");
  assert.ok(close.command.args.includes("--memoryDebugging"));
});

test("duplicate strings are hashed and never return original heap values", async () => {
  const result = await delegateUpstreamTool(
    "get_heapsnapshot_duplicate_strings",
    {
      routeToken: "route_demo",
      filePath: "test/fixtures/memory/final.heapsnapshot"
    },
    {
      executor: async () => ({
        structuredContent: {
          heapSnapshotDuplicateStrings: [{
            value: "customer@example.test secret-token",
            count: 4,
            totalSelfSize: 120,
            totalRetainedSize: 480,
            nodes: [{ id: 1 }, { id: 2 }]
          }]
        }
      })
    }
  );
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("customer@example.test"), false);
  assert.equal(serialized.includes("secret-token"), false);
  assert.ok(serialized.includes("valueHash"));
  assert.ok(serialized.includes("[REDACTED_DUPLICATE_STRING]"));
});

test("duplicate-string sanitizer also handles JSON embedded in MCP text content", async () => {
  const result = await delegateUpstreamTool(
    "get_heapsnapshot_duplicate_strings",
    {
      routeToken: "route_demo",
      filePath: "test/fixtures/memory/final.heapsnapshot"
    },
    {
      executor: async () => ({
        content: [{
          type: "text",
          text: JSON.stringify({ heapSnapshotDuplicateStrings: [{ value: "raw memory string", count: 2, nodes: [{ id: 1 }] }] })
        }]
      })
    }
  );
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("raw memory string"), false);
  assert.ok(serialized.includes("valueHash"));
});
