import { UPSTREAM_DELEGATE_TOOL_ALLOWLIST, upstreamDelegateCategory, type UpstreamDelegateToolName } from "../upstream/delegate.js";

export type ToolDefinition = {
  name: string;
  capabilityGroup: "core" | "evidence" | "network" | "debugging" | "performance" | "memory" | "cdp" | "extension" | "experimental";
  description: string;
  implementation: "local" | "delegate" | "deferred";
  upstream?: {
    package: "chrome-devtools-mcp";
    tool: string;
    category: string;
    minVersion?: string;
    flag?: string;
  };
  safety: string[];
  inputSchema: Record<string, unknown>;
};

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  tool("chrome_health", "core", "Report local Chrome, profile, adapter, and bridge readiness without attaching to a live tab."),
  tool("chrome_targets", "core", "List safe previews for candidate Chrome tabs and windows."),
  tool("tab_snapshot", "evidence", "Create a fixture or dry-run snapshot request for a selected tab surface."),
  tool("debug_bundle_create", "evidence", "Create a bounded debug bundle from fixture or dry-run evidence sources."),
  tool("debug_bundle_read", "evidence", "Read metadata, timeline, summaries, or safe evidence slices from a bundle."),
  tool("debug_bundle_redact", "evidence", "Apply the plugin redaction policy to an existing debug bundle."),
  tool("api_calls_collect", "network", "Build a redaction-first API call inventory."),
  tool("api_call_to_curl", "network", "Generate a redacted cURL command for one API call."),
  tool("api_response_read", "network", "Read bounded redacted response summaries."),
  tool("debug_run_compare", "network", "Compare two debug runs."),
  tool("context7_doctor", "core", "Run or report Context7 doctor status."),
  tool("upstream_mcp_doctor", "core", "Report official Chrome DevTools MCP version, category, connection-mode, and safety-flag readiness."),
  ...UPSTREAM_DELEGATE_TOOL_ALLOWLIST.map((name) => delegateTool(name)),
  pageDiscoveryTool("webmcp_tools_list", "List page-exposed WebMCP tools as untrusted, discovery-only metadata."),
  pageDiscoveryTool("third_party_tools_list", "List page-exposed third-party developer tools as untrusted, discovery-only metadata.")
];

export function toolsForCaps(caps: string[]): ToolDefinition[] {
  const selected = new Set(caps.length ? caps : ["core", "evidence"]);
  return TOOL_DEFINITIONS.filter((toolDefinition) => selected.has(toolDefinition.capabilityGroup));
}

function tool(name: string, capabilityGroup: ToolDefinition["capabilityGroup"], description: string): ToolDefinition {
  return {
    name,
    capabilityGroup,
    description,
    implementation: "local",
    safety: ["metadata-only", "redaction-first"],
    inputSchema: {
      type: "object",
      additionalProperties: true
    }
  };
}

function delegateTool(name: UpstreamDelegateToolName): ToolDefinition {
  const category = upstreamDelegateCategory(name);
  return {
    name,
    capabilityGroup: category,
    description: delegateDescription(name, category),
    implementation: "delegate",
    upstream: {
      package: "chrome-devtools-mcp",
      tool: name,
      category,
      minVersion: "1.6.0"
    },
    safety: [
      "gated-live-delegation",
      "requires-route-token",
      "requires-redacted-network-headers",
      "bounded-payload",
      "time-limited",
      "url-policy-recommended-for-profile-routes",
      ...(category === "memory" ? ["relative-heapsnapshot-paths-only", "memory-debugging-child-only", "duplicate-strings-redacted"] : [])
    ],
    inputSchema: {
      type: "object",
      additionalProperties: true
    }
  };
}

function delegateDescription(name: UpstreamDelegateToolName, category: string): string {
  if (name === "get_network_request") return "Read one upstream Chrome DevTools MCP network request after live delegation gates pass.";
  if (name === "list_network_requests") return "List upstream Chrome DevTools MCP network requests after live delegation gates pass.";
  if (name === "list_console_messages") return "List upstream Chrome DevTools MCP console messages after live delegation gates pass.";
  if (name === "take_snapshot") return "Take an upstream Chrome DevTools MCP page snapshot after live delegation gates pass.";
  if (name === "take_screenshot") return "Take an upstream Chrome DevTools MCP screenshot after live delegation gates pass.";
  if (name === "lighthouse_audit") return "Run an upstream Chrome DevTools MCP Lighthouse audit after live delegation gates pass.";
  if (name === "performance_start_trace") return "Start an upstream Chrome DevTools MCP performance trace after live delegation gates pass.";
  if (name === "performance_stop_trace") return "Stop an upstream Chrome DevTools MCP performance trace after live delegation gates pass.";
  if (name === "performance_analyze_insight") return "Analyze an upstream Chrome DevTools MCP performance insight after live delegation gates pass.";
  if (name === "take_heapsnapshot") return "Capture a bounded heap snapshot through the locally gated Chrome DevTools MCP memory route.";
  if (name === "get_heapsnapshot_summary") return "Read bounded heap summary statistics from a locally scoped snapshot path.";
  if (name === "get_heapsnapshot_details") return "Read paginated heap aggregates, optionally filtered for common retention patterns.";
  if (name === "get_heapsnapshot_class_nodes") return "Read paginated instances for a heap class selected from details output.";
  if (name === "get_heapsnapshot_retainers") return "Read bounded retainers for one heap node.";
  if (name === "close_heapsnapshot") return "Close a locally scoped heap snapshot after analysis to free upstream memory.";
  if (name === "get_heapsnapshot_retaining_paths") return "Read bounded retaining paths for one heap node.";
  if (name === "get_heapsnapshot_edges") return "Read bounded outgoing references for one heap node.";
  if (name === "get_heapsnapshot_dominators") return "Read the dominator chain for one heap node.";
  if (name === "compare_heapsnapshots") return "Compare two locally scoped heap snapshots with optional class detail.";
  if (name === "get_heapsnapshot_duplicate_strings") return "Find duplicate heap strings with values redacted and SHA-256 hashed before return.";
  return `${category[0].toUpperCase()}${category.slice(1)} delegated alias for official Chrome DevTools MCP ${name} after live delegation gates pass.`;
}

function pageDiscoveryTool(name: string, description: string): ToolDefinition {
  return {
    name,
    capabilityGroup: "experimental",
    description,
    implementation: "local",
    upstream: {
      package: "chrome-devtools-mcp",
      tool: name === "webmcp_tools_list" ? "list_webmcp_tools" : "list_3p_developer_tools",
      category: name === "webmcp_tools_list" ? "webmcp" : "third-party",
      minVersion: "1.6.0",
      flag: name === "webmcp_tools_list" ? "--categoryExperimentalWebmcp" : "--categoryExperimentalThirdParty"
    },
    safety: ["list-only", "execution-disabled", "untrusted-page-tools", "requires-explicit-experimental-enable-later"],
    inputSchema: {
      type: "object",
      additionalProperties: true
    }
  };
}
