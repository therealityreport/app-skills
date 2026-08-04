import { toolsForCaps } from "./tools.js";
import { RESOURCE_TEMPLATES } from "./resources.js";
import { PROMPTS } from "./prompts.js";
import {
  delegateUpstreamTool,
  isPageExposedDiscoveryTool,
  isUpstreamDelegateTool,
  pageExposedDiscoveryResult,
  type UpstreamDelegateExecutor,
  type UpstreamDelegateInput
} from "../upstream/delegate.js";
import { runUpstreamMcpDoctor, type UpstreamMcpRuntimeConfig } from "../upstream/chrome-devtools-mcp.js";

export function listMcpSurface(caps: string[]) {
  return {
    tools: toolsForCaps(caps),
    resources: RESOURCE_TEMPLATES,
    prompts: PROMPTS,
    mode: "metadata-and-gated-upstream-delegation",
    note: "Local tools stay redaction-first; upstream Chrome DevTools MCP is the live backend when route-token and connection gates pass."
  };
}

export async function callMcpTool(
  name: string,
  input: Record<string, unknown> = {},
  options: { upstreamExecutor?: UpstreamDelegateExecutor } = {}
): Promise<unknown> {
  if (isUpstreamDelegateTool(name)) {
    return delegateUpstreamTool(name, input as UpstreamDelegateInput, { executor: options.upstreamExecutor });
  }

  if (isPageExposedDiscoveryTool(name)) {
    return pageExposedDiscoveryResult(name, input);
  }

  if (name === "upstream_mcp_doctor") {
    return runUpstreamMcpDoctor(
      typeof input.expectedVersion === "string" ? input.expectedVersion : undefined,
      upstreamConfigFromToolInput(input)
    );
  }

  throw new Error(`MCP tool ${name} does not have a callable local handler in this slice.`);
}

function upstreamConfigFromToolInput(input: Record<string, unknown>): UpstreamMcpRuntimeConfig {
  return {
    connectionMode: parseConnectionMode(input.connectionMode),
    routeToken: stringValue(input.routeToken),
    browserUrl: stringValue(input.browserUrl),
    wsEndpoint: stringValue(input.wsEndpoint),
    allowedUrlPatterns: stringList(input.allowedUrlPatterns),
    blockedUrlPatterns: stringList(input.blockedUrlPatterns),
    redactNetworkHeaders: booleanValue(input.redactNetworkHeaders, true),
    usageStatistics: booleanValue(input.usageStatistics, false),
    performanceCrux: booleanValue(input.performanceCrux, false),
    experimentalPageIdRouting: booleanValue(input.experimentalPageIdRouting, true),
    strict: booleanValue(input.strict, false)
  };
}

function parseConnectionMode(value: unknown): UpstreamMcpRuntimeConfig["connectionMode"] {
  if (value == null) return undefined;
  if (value === "isolated" || value === "autoConnect" || value === "browserUrl" || value === "wsEndpoint") return value;
  throw new Error(`Unsupported connectionMode: ${String(value)}`);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function stringList(value: unknown): string[] | undefined {
  if (value == null) return undefined;
  if (!Array.isArray(value)) throw new Error("Expected string array input.");
  return value.map((item) => {
    if (typeof item !== "string") throw new Error("Expected string array input.");
    return item;
  });
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}
