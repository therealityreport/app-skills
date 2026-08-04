import { spawn } from "node:child_process";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { redactHeaders, redactUrl, REDACTED, assertNoKnownSecrets } from "../core/redaction-policy.js";
import {
  buildUpstreamMcpArgs,
  buildMemoryAnalysisMcpArgs,
  CHROME_DEVTOOLS_MCP_PACKAGE,
  SUPPORTED_CHROME_DEVTOOLS_MCP_VERSION,
  type UpstreamConnectionMode,
  type UpstreamDoctorCheck,
  type UpstreamMcpRuntimeConfig,
  runUpstreamMcpDoctor
} from "./chrome-devtools-mcp.js";

export const UPSTREAM_DELEGATE_TOOL_ALLOWLIST = [
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
] as const;

export const PAGE_EXPOSED_DISCOVERY_TOOLS = ["webmcp_tools_list", "third_party_tools_list"] as const;

export const DEFAULT_UPSTREAM_DELEGATE_TIMEOUT_MS = 30_000;
export const MAX_UPSTREAM_DELEGATE_TIMEOUT_MS = 60_000;
export const DEFAULT_UPSTREAM_DELEGATE_MAX_PAYLOAD_BYTES = 512 * 1024;
export const MAX_UPSTREAM_DELEGATE_MAX_PAYLOAD_BYTES = 1024 * 1024;

export type UpstreamDelegateToolName = (typeof UPSTREAM_DELEGATE_TOOL_ALLOWLIST)[number];
export type PageExposedDiscoveryToolName = (typeof PAGE_EXPOSED_DISCOVERY_TOOLS)[number];

export type UpstreamDelegateInput = Record<string, unknown> & {
  routeToken?: string;
  connectionMode?: UpstreamConnectionMode;
  browserUrl?: string;
  wsEndpoint?: string;
  allowedUrlPatterns?: string[];
  blockedUrlPatterns?: string[];
  redactNetworkHeaders?: boolean;
  dryRun?: boolean;
  timeoutMs?: number;
  maxPayloadBytes?: number;
  toolInput?: Record<string, unknown>;
};

export type PreparedUpstreamDelegateCall = {
  tool: UpstreamDelegateToolName;
  category: UpstreamDelegateToolCategory;
  dryRun: boolean;
  timeoutMs: number;
  maxPayloadBytes: number;
  command: {
    command: "npx";
    args: string[];
    display: string;
  };
  upstreamArguments: Record<string, unknown>;
  safety: {
    allowlisted: true;
    routeToken: "present";
    routeTokenPreview: string;
    checks: UpstreamDoctorCheck[];
    pageExposedToolExecution: "disabled";
  };
};

export type UpstreamDelegateDryRunResult = {
  mode: "dry-run";
  status: "ready";
  launch: false;
  upstream: {
    package: typeof CHROME_DEVTOOLS_MCP_PACKAGE;
    version: typeof SUPPORTED_CHROME_DEVTOOLS_MCP_VERSION;
    tool: UpstreamDelegateToolName;
    category: UpstreamDelegateToolCategory;
  };
  command: PreparedUpstreamDelegateCall["command"];
  upstreamArguments: Record<string, unknown>;
  limits: {
    timeoutMs: number;
    maxPayloadBytes: number;
  };
  safety: PreparedUpstreamDelegateCall["safety"];
};

export type UpstreamDelegateLiveResult = {
  mode: "live";
  status: "ok" | "truncated";
  redactionStatus: "redacted";
  upstream: {
    package: typeof CHROME_DEVTOOLS_MCP_PACKAGE;
    version: typeof SUPPORTED_CHROME_DEVTOOLS_MCP_VERSION;
    tool: UpstreamDelegateToolName;
    category: UpstreamDelegateToolCategory;
  };
  bytes: number;
  maxPayloadBytes: number;
  result: unknown;
};

export type UpstreamDelegateResult = UpstreamDelegateDryRunResult | UpstreamDelegateLiveResult;

export type UpstreamDelegateExecutor = (request: PreparedUpstreamDelegateCall) => Promise<unknown>;

export type UpstreamDelegateToolCategory = "network" | "debugging" | "performance" | "memory";

type ArgumentRule = {
  type: "boolean" | "integer" | "number" | "string" | "stringOrNumber" | "stringArray" | "enum";
  min?: number;
  max?: number;
  maxLength?: number;
  maxItems?: number;
  values?: readonly string[];
  dryRunOnly?: boolean;
};

type ToolSpec = {
  category: UpstreamDelegateToolCategory;
  arguments: Record<string, ArgumentRule>;
  requiredForLive?: readonly string[];
};

const PAGE_ID_RULE: ArgumentRule = { type: "stringOrNumber", maxLength: 80 };
const HEAP_SNAPSHOT_PATH_RULE: ArgumentRule = { type: "string", maxLength: 512 };
const HEAP_SNAPSHOT_FILTERS = [
  "objectsRetainedByDetachedDomNodes",
  "objectsRetainedByConsole",
  "objectsRetainedByEventHandlers",
  "objectsRetainedByContexts"
] as const;

const TOOL_SPECS: Record<UpstreamDelegateToolName, ToolSpec> = {
  list_network_requests: {
    category: "network",
    arguments: {
      pageId: PAGE_ID_RULE,
      includePreservedRequests: { type: "boolean" },
      pageIdx: { type: "integer", min: 0, max: 1000 },
      pageSize: { type: "integer", min: 1, max: 200 },
      resourceTypes: { type: "stringArray", maxItems: 20, maxLength: 80 }
    }
  },
  get_network_request: {
    category: "network",
    arguments: {
      pageId: PAGE_ID_RULE,
      reqid: { type: "integer", min: 0 },
      requestId: { type: "stringOrNumber", maxLength: 120, dryRunOnly: true },
      requestFilePath: { type: "string", maxLength: 1024 },
      responseFilePath: { type: "string", maxLength: 1024 }
    }
  },
  list_console_messages: {
    category: "debugging",
    arguments: {
      pageId: PAGE_ID_RULE,
      includePreservedMessages: { type: "boolean" },
      pageIdx: { type: "integer", min: 0, max: 1000 },
      pageSize: { type: "integer", min: 1, max: 200 },
      serviceWorkerId: { type: "string", maxLength: 160 },
      types: { type: "stringArray", maxItems: 20, maxLength: 80 }
    }
  },
  take_snapshot: {
    category: "debugging",
    arguments: {
      pageId: PAGE_ID_RULE,
      filePath: { type: "string", maxLength: 1024 },
      verbose: { type: "boolean" }
    }
  },
  take_screenshot: {
    category: "debugging",
    arguments: {
      pageId: PAGE_ID_RULE,
      filePath: { type: "string", maxLength: 1024 },
      format: { type: "enum", values: ["png", "jpeg", "webp"] },
      fullPage: { type: "boolean" },
      quality: { type: "integer", min: 0, max: 100 },
      uid: { type: "string", maxLength: 160 }
    }
  },
  lighthouse_audit: {
    category: "debugging",
    arguments: {
      pageId: PAGE_ID_RULE,
      device: { type: "enum", values: ["desktop", "mobile"] },
      mode: { type: "enum", values: ["navigation", "snapshot"] },
      outputDirPath: { type: "string", maxLength: 1024 }
    }
  },
  performance_start_trace: {
    category: "performance",
    arguments: {
      pageId: PAGE_ID_RULE,
      autoStop: { type: "boolean" },
      filePath: { type: "string", maxLength: 1024 },
      reload: { type: "boolean" }
    }
  },
  performance_stop_trace: {
    category: "performance",
    arguments: {
      pageId: PAGE_ID_RULE,
      filePath: { type: "string", maxLength: 1024 }
    }
  },
  performance_analyze_insight: {
    category: "performance",
    arguments: {
      pageId: PAGE_ID_RULE,
      insightName: { type: "string", maxLength: 160 },
      insightSetId: { type: "string", maxLength: 160 }
    },
    requiredForLive: ["insightName", "insightSetId"]
  },
  take_heapsnapshot: {
    category: "memory",
    arguments: {
      pageId: PAGE_ID_RULE,
      filePath: HEAP_SNAPSHOT_PATH_RULE
    },
    requiredForLive: ["filePath"]
  },
  get_heapsnapshot_summary: {
    category: "memory",
    arguments: { filePath: HEAP_SNAPSHOT_PATH_RULE },
    requiredForLive: ["filePath"]
  },
  get_heapsnapshot_details: {
    category: "memory",
    arguments: {
      filePath: HEAP_SNAPSHOT_PATH_RULE,
      filterName: { type: "enum", values: HEAP_SNAPSHOT_FILTERS },
      pageIdx: { type: "integer", min: 0, max: 1000 },
      pageSize: { type: "integer", min: 1, max: 100 }
    },
    requiredForLive: ["filePath"]
  },
  get_heapsnapshot_class_nodes: {
    category: "memory",
    arguments: {
      filePath: HEAP_SNAPSHOT_PATH_RULE,
      id: { type: "integer", min: 0 },
      filterName: { type: "enum", values: HEAP_SNAPSHOT_FILTERS },
      pageIdx: { type: "integer", min: 0, max: 1000 },
      pageSize: { type: "integer", min: 1, max: 100 }
    },
    requiredForLive: ["filePath", "id"]
  },
  get_heapsnapshot_retainers: {
    category: "memory",
    arguments: {
      filePath: HEAP_SNAPSHOT_PATH_RULE,
      nodeId: { type: "integer", min: 0 },
      pageIdx: { type: "integer", min: 0, max: 1000 },
      pageSize: { type: "integer", min: 1, max: 100 }
    },
    requiredForLive: ["filePath", "nodeId"]
  },
  close_heapsnapshot: {
    category: "memory",
    arguments: { filePath: HEAP_SNAPSHOT_PATH_RULE },
    requiredForLive: ["filePath"]
  },
  get_heapsnapshot_retaining_paths: {
    category: "memory",
    arguments: {
      filePath: HEAP_SNAPSHOT_PATH_RULE,
      nodeId: { type: "integer", min: 0 },
      maxDepth: { type: "integer", min: 1, max: 30 },
      maxNodes: { type: "integer", min: 1, max: 500 },
      maxSiblings: { type: "integer", min: 1, max: 100 }
    },
    requiredForLive: ["filePath", "nodeId"]
  },
  get_heapsnapshot_edges: {
    category: "memory",
    arguments: {
      filePath: HEAP_SNAPSHOT_PATH_RULE,
      nodeId: { type: "integer", min: 0 },
      pageIdx: { type: "integer", min: 0, max: 1000 },
      pageSize: { type: "integer", min: 1, max: 100 }
    },
    requiredForLive: ["filePath", "nodeId"]
  },
  get_heapsnapshot_dominators: {
    category: "memory",
    arguments: {
      filePath: HEAP_SNAPSHOT_PATH_RULE,
      nodeId: { type: "integer", min: 0 }
    },
    requiredForLive: ["filePath", "nodeId"]
  },
  compare_heapsnapshots: {
    category: "memory",
    arguments: {
      baseFilePath: HEAP_SNAPSHOT_PATH_RULE,
      currentFilePath: HEAP_SNAPSHOT_PATH_RULE,
      classIndex: { type: "integer", min: 0, max: 10_000 }
    },
    requiredForLive: ["baseFilePath", "currentFilePath"]
  },
  get_heapsnapshot_duplicate_strings: {
    category: "memory",
    arguments: {
      filePath: HEAP_SNAPSHOT_PATH_RULE,
      pageIdx: { type: "integer", min: 0, max: 1000 },
      pageSize: { type: "integer", min: 1, max: 50 }
    },
    requiredForLive: ["filePath"]
  }
};

const CONTROL_KEYS = new Set([
  "routeToken",
  "connectionMode",
  "browserUrl",
  "wsEndpoint",
  "allowedUrlPatterns",
  "blockedUrlPatterns",
  "redactNetworkHeaders",
  "usageStatistics",
  "performanceCrux",
  "experimentalPageIdRouting",
  "strict",
  "categoryExperimentalWebmcp",
  "categoryExperimentalThirdParty",
  "dryRun",
  "timeoutMs",
  "maxPayloadBytes",
  "toolInput",
  "targetId"
]);

const SECRET_KEY_RE = /(cookie|authorization|proxy-authorization|x-api-key|api-key|csrf|xsrf|token|secret|password|passwd|pwd|session|auth|signature|sig)/i;
const SECRET_VALUE_RE = /(bearer\s+[a-z0-9._~+/=-]+|sk-[a-z0-9_-]+|ghp_[a-z0-9_]+|eyj[a-z0-9_-]+\.[a-z0-9_-]+)/gi;

export function isUpstreamDelegateTool(name: string): name is UpstreamDelegateToolName {
  return (UPSTREAM_DELEGATE_TOOL_ALLOWLIST as readonly string[]).includes(name);
}

export function upstreamDelegateCategory(name: UpstreamDelegateToolName): UpstreamDelegateToolCategory {
  return TOOL_SPECS[name].category;
}

export function isPageExposedDiscoveryTool(name: string): name is PageExposedDiscoveryToolName {
  return (PAGE_EXPOSED_DISCOVERY_TOOLS as readonly string[]).includes(name);
}

export function prepareUpstreamDelegateCall(tool: string, input: UpstreamDelegateInput = {}): PreparedUpstreamDelegateCall {
  if (!isUpstreamDelegateTool(tool)) {
    throw new Error(`Unsupported upstream delegate tool: ${tool}. Allowed tools: ${UPSTREAM_DELEGATE_TOOL_ALLOWLIST.join(", ")}`);
  }

  const routeToken = requireRouteToken(input.routeToken);
  const dryRun = input.dryRun === true;
  const timeoutMs = boundedInteger(input.timeoutMs, DEFAULT_UPSTREAM_DELEGATE_TIMEOUT_MS, 1000, MAX_UPSTREAM_DELEGATE_TIMEOUT_MS, "timeoutMs");
  const maxPayloadBytes = boundedInteger(
    input.maxPayloadBytes,
    DEFAULT_UPSTREAM_DELEGATE_MAX_PAYLOAD_BYTES,
    1024,
    MAX_UPSTREAM_DELEGATE_MAX_PAYLOAD_BYTES,
    "maxPayloadBytes"
  );
  const config = buildRuntimeConfig(input);
  const doctor = runUpstreamMcpDoctor(SUPPORTED_CHROME_DEVTOOLS_MCP_VERSION, config);
  if (config.connectionMode !== "isolated" && !hasUrlPolicy(config)) {
    throw new Error("Profile-connected upstream delegation requires an allowed or blocked URL policy.");
  }
  const failedChecks = doctor.checks.filter((check) => check.status === "fail");
  if (failedChecks.length > 0) {
    throw new Error(`Upstream delegate gates failed: ${failedChecks.map((check) => `${check.name}: ${check.detail}`).join("; ")}`);
  }

  const spec = TOOL_SPECS[tool];
  const upstreamArguments = normalizeToolArguments(tool, spec, input, dryRun);
  // `memoryDebugging` is never accepted from a caller or global config. It is
  // only injected for this locally constrained set of analysis aliases.
  const args = spec.category === "memory" ? buildMemoryAnalysisMcpArgs(config) : buildUpstreamMcpArgs(config);

  return {
    tool,
    category: spec.category,
    dryRun,
    timeoutMs,
    maxPayloadBytes,
    command: {
      command: "npx",
      args,
      display: shellCommand(["npx", ...args])
    },
    upstreamArguments,
    safety: {
      allowlisted: true,
      routeToken: "present",
      routeTokenPreview: maskToken(routeToken),
      checks: doctor.checks,
      pageExposedToolExecution: "disabled"
    }
  };
}

export async function delegateUpstreamTool(
  tool: string,
  input: UpstreamDelegateInput = {},
  options: { executor?: UpstreamDelegateExecutor } = {}
): Promise<UpstreamDelegateResult> {
  const request = prepareUpstreamDelegateCall(tool, input);
  if (request.dryRun) return dryRunResult(request);

  const rawResult = await (options.executor ?? callUpstreamMcpOverStdio)(request);
  return normalizeLiveResult(request, rawResult);
}

export function pageExposedDiscoveryResult(tool: string, input: Record<string, unknown> = {}) {
  if (!isPageExposedDiscoveryTool(tool)) {
    throw new Error(`Unsupported page-exposed discovery tool: ${tool}`);
  }
  if (input.execute === true) {
    throw new Error(`${tool} is list-only. Page-exposed WebMCP and third-party tool execution is disabled by default.`);
  }

  return {
    mode: "list-only",
    status: "execution-disabled",
    tool,
    upstream: {
      package: CHROME_DEVTOOLS_MCP_PACKAGE,
      version: SUPPORTED_CHROME_DEVTOOLS_MCP_VERSION,
      tool: tool === "webmcp_tools_list" ? "list_webmcp_tools" : "list_3p_developer_tools",
      category: tool === "webmcp_tools_list" ? "webmcp" : "third-party"
    },
    source: typeof input.source === "string" ? input.source : "dry-run",
    fixture: typeof input.fixture === "string" ? input.fixture : undefined,
    execution: "disabled",
    safety: ["list-only", "execution-disabled", "untrusted-page-tools"]
  };
}

function dryRunResult(request: PreparedUpstreamDelegateCall): UpstreamDelegateDryRunResult {
  return {
    mode: "dry-run",
    status: "ready",
    launch: false,
    upstream: {
      package: CHROME_DEVTOOLS_MCP_PACKAGE,
      version: SUPPORTED_CHROME_DEVTOOLS_MCP_VERSION,
      tool: request.tool,
      category: request.category
    },
    command: request.command,
    upstreamArguments: request.upstreamArguments,
    limits: {
      timeoutMs: request.timeoutMs,
      maxPayloadBytes: request.maxPayloadBytes
    },
    safety: request.safety
  };
}

async function callUpstreamMcpOverStdio(request: PreparedUpstreamDelegateCall): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const child = spawn(request.command.command, request.command.args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        NO_COLOR: "1",
        CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS: "1",
        CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS: "1"
      }
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    let initialized = false;
    const timer = setTimeout(() => {
      fail(new Error(`Timed out after ${request.timeoutMs}ms while calling upstream tool ${request.tool}`));
    }, request.timeoutMs);

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      reject(error);
    };

    const done = (value: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      resolve(value);
    };

    child.on("error", fail);
    child.on("exit", (code) => {
      if (!settled) {
        fail(new Error(`Upstream MCP process exited before tool result: code ${code ?? "unknown"} stderr=${stderr.trim().slice(0, 1000)}`));
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr = boundedAppend(stderr, chunk.toString("utf8"), 8192);
    });

    child.stdout.on("data", (chunk: Buffer) => {
      stdout = boundedAppend(stdout, chunk.toString("utf8"), request.maxPayloadBytes);
      const lines = stdout.split(/\r?\n/);
      stdout = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        let message: JsonRpcMessage;
        try {
          message = JSON.parse(line) as JsonRpcMessage;
        } catch {
          continue;
        }

        if (message.id === 1 && !initialized) {
          initialized = true;
          writeJson(child, { jsonrpc: "2.0", method: "notifications/initialized", params: {} });
          writeJson(child, {
            jsonrpc: "2.0",
            id: 2,
            method: "tools/call",
            params: {
              name: request.tool,
              arguments: request.upstreamArguments
            }
          });
        } else if (message.id === 2) {
          if (message.error) {
            fail(new Error(`Upstream tool ${request.tool} failed: ${JSON.stringify(message.error)}`));
          } else {
            done(message.result);
          }
        }
      }
    });

    writeJson(child, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: {
          name: "@ChromeDevTools-local-upstream-delegate",
          version: "0.1.1"
        }
      }
    });
  });
}

function normalizeLiveResult(request: PreparedUpstreamDelegateCall, rawResult: unknown): UpstreamDelegateLiveResult {
  const result = request.tool === "get_heapsnapshot_duplicate_strings"
    ? redactDuplicateStringEvidence(rawResult)
    : redactDelegateEvidence(rawResult);
  const serialized = JSON.stringify(result);
  const bytes = Buffer.byteLength(serialized, "utf8");
  if (bytes > request.maxPayloadBytes) {
    return {
      mode: "live",
      status: "truncated",
      redactionStatus: "redacted",
      upstream: {
        package: CHROME_DEVTOOLS_MCP_PACKAGE,
        version: SUPPORTED_CHROME_DEVTOOLS_MCP_VERSION,
        tool: request.tool,
        category: request.category
      },
      bytes,
      maxPayloadBytes: request.maxPayloadBytes,
      result: {
        summary: `Redacted upstream payload exceeded ${request.maxPayloadBytes} bytes and was truncated.`,
        bytes
      }
    };
  }

  const findings = assertNoKnownSecrets(serialized);
  if (findings.length > 0) {
    throw new Error(`Redacted upstream result still contains secret-looking content: ${findings.join(", ")}`);
  }

  return {
    mode: "live",
    status: "ok",
    redactionStatus: "redacted",
    upstream: {
      package: CHROME_DEVTOOLS_MCP_PACKAGE,
      version: SUPPORTED_CHROME_DEVTOOLS_MCP_VERSION,
      tool: request.tool,
      category: request.category
    },
    bytes,
    maxPayloadBytes: request.maxPayloadBytes,
    result
  };
}

function buildRuntimeConfig(input: UpstreamDelegateInput): Required<UpstreamMcpRuntimeConfig> {
  const connectionMode = input.connectionMode ?? "isolated";
  return {
    connectionMode,
    routeToken: requireRouteToken(input.routeToken),
    browserUrl: stringValue(input.browserUrl),
    wsEndpoint: stringValue(input.wsEndpoint),
    allowedUrlPatterns: stringList(input.allowedUrlPatterns, "allowedUrlPatterns"),
    blockedUrlPatterns: stringList(input.blockedUrlPatterns, "blockedUrlPatterns"),
    redactNetworkHeaders: input.redactNetworkHeaders ?? true,
    usageStatistics: false,
    performanceCrux: false,
    experimentalPageIdRouting: true,
    categoryExperimentalWebmcp: false,
    categoryExperimentalThirdParty: false,
    strict: true
  };
}

function normalizeToolArguments(
  tool: UpstreamDelegateToolName,
  spec: ToolSpec,
  input: UpstreamDelegateInput,
  dryRun: boolean
): Record<string, unknown> {
  const rawArguments: Record<string, unknown> = {};
  if (isPlainObject(input.toolInput)) {
    Object.assign(rawArguments, input.toolInput);
  }
  for (const [key, value] of Object.entries(input)) {
    if (!CONTROL_KEYS.has(key)) rawArguments[key] = value;
  }

  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawArguments)) {
    const rule = spec.arguments[key];
    if (!rule) {
      throw new Error(`Unsupported input "${key}" for upstream tool ${tool}.`);
    }
    if (rule.dryRunOnly && !dryRun) {
      throw new Error(`Input "${key}" for upstream tool ${tool} is only accepted in dry-run previews.`);
    }
    const normalizedValue = normalizeArgumentValue(tool, key, value, rule);
    if (key === "requestId" && (typeof normalizedValue === "number" || numericString(normalizedValue))) {
      normalized.reqid = Number(normalizedValue);
    } else if (spec.category === "memory" && isHeapSnapshotPathKey(key)) {
      normalized[key] = normalizeHeapSnapshotPath(tool, key, normalizedValue);
    } else {
      normalized[key] = normalizedValue;
    }
  }

  if (!dryRun) {
    for (const required of spec.requiredForLive ?? []) {
      if (normalized[required] == null) throw new Error(`Missing required input "${required}" for live upstream tool ${tool}.`);
    }
  }

  return normalized;
}

function isHeapSnapshotPathKey(key: string): key is "filePath" | "baseFilePath" | "currentFilePath" {
  return key === "filePath" || key === "baseFilePath" || key === "currentFilePath";
}

function normalizeHeapSnapshotPath(tool: string, key: string, value: unknown): string {
  if (typeof value !== "string") throw new Error(`Input "${key}" for upstream tool ${tool} must be a string.`);
  if (!value.endsWith(".heapsnapshot")) {
    throw new Error(`Input "${key}" for upstream tool ${tool} must end in .heapsnapshot.`);
  }
  // This prevents the local alias becoming an arbitrary filesystem reader.
  // Snapshots are captured/read beneath the caller's working directory only.
  if (value.startsWith("/") || value.startsWith("\\") || /^[a-z]:/i.test(value) || value.split(/[\\/]+/).includes("..")) {
    throw new Error(`Input "${key}" for upstream tool ${tool} must be a relative path without parent traversal.`);
  }
  return value;
}

function normalizeArgumentValue(tool: string, key: string, value: unknown, rule: ArgumentRule): unknown {
  if (value == null) throw new Error(`Input "${key}" for upstream tool ${tool} cannot be null or undefined.`);
  switch (rule.type) {
    case "boolean":
      if (typeof value !== "boolean") throw new Error(`Input "${key}" for upstream tool ${tool} must be a boolean.`);
      return value;
    case "integer":
      if (!Number.isInteger(value)) throw new Error(`Input "${key}" for upstream tool ${tool} must be an integer.`);
      assertNumberBounds(tool, key, value as number, rule);
      return value;
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Input "${key}" for upstream tool ${tool} must be a number.`);
      assertNumberBounds(tool, key, value, rule);
      return value;
    case "string":
      return normalizeStringArgument(tool, key, value, rule);
    case "stringOrNumber":
      if (typeof value === "number") return value;
      return normalizeStringArgument(tool, key, value, rule);
    case "stringArray":
      if (!Array.isArray(value)) throw new Error(`Input "${key}" for upstream tool ${tool} must be an array.`);
      if (rule.maxItems != null && value.length > rule.maxItems) {
        throw new Error(`Input "${key}" for upstream tool ${tool} must contain at most ${rule.maxItems} items.`);
      }
      return value.map((item, index) => normalizeStringArgument(tool, `${key}[${index}]`, item, rule));
    case "enum": {
      const normalized = normalizeStringArgument(tool, key, value, rule);
      if (!rule.values?.includes(normalized)) throw new Error(`Input "${key}" for upstream tool ${tool} must be one of: ${rule.values?.join(", ")}.`);
      return normalized;
    }
  }
}

function normalizeStringArgument(tool: string, key: string, value: unknown, rule: ArgumentRule): string {
  if (typeof value !== "string") throw new Error(`Input "${key}" for upstream tool ${tool} must be a string.`);
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`Input "${key}" for upstream tool ${tool} cannot be empty.`);
  if (rule.maxLength != null && trimmed.length > rule.maxLength) {
    throw new Error(`Input "${key}" for upstream tool ${tool} must be ${rule.maxLength} characters or fewer.`);
  }
  return trimmed;
}

function assertNumberBounds(tool: string, key: string, value: number, rule: ArgumentRule): void {
  if (rule.min != null && value < rule.min) throw new Error(`Input "${key}" for upstream tool ${tool} must be >= ${rule.min}.`);
  if (rule.max != null && value > rule.max) throw new Error(`Input "${key}" for upstream tool ${tool} must be <= ${rule.max}.`);
}

function redactDelegateEvidence(value: unknown, depth = 0): unknown {
  if (depth > 16) return "[TRUNCATED_DEPTH]";
  if (value == null) return value;
  if (typeof value === "string") return redactText(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((item) => redactDelegateEvidence(item, depth + 1));
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY_RE.test(key)) {
        output[key] = REDACTED;
      } else if (/headers/i.test(key) && isHeaderObject(child)) {
        output[key] = redactHeaders(child);
      } else if (/url$/i.test(key) && typeof child === "string") {
        output[key] = redactUrl(child);
      } else {
        output[key] = redactDelegateEvidence(child, depth + 1);
      }
    }
    return output;
  }
  return typeof value;
}

/**
 * Heap snapshots may contain user-entered text, tokens, and document data.
 * Duplicate-string analysis is useful for counts and retained sizes, but never
 * needs to return the original values. Keep only a stable hash and short
 * redacted metadata, even when the upstream server puts rows in text content.
 */
function redactDuplicateStringEvidence(value: unknown): unknown {
  const groups = collectDuplicateStringGroups(value);
  const boundedGroups = groups.slice(0, 50).map((group) => ({
    valueHash: sha256(group.value),
    preview: "[REDACTED_DUPLICATE_STRING]",
    count: group.count,
    totalSelfSize: group.totalSelfSize,
    totalRetainedSize: group.totalRetainedSize,
    truncated: group.truncated,
    nodeCount: group.nodeCount
  }));

  return {
    privacy: {
      duplicateStringValues: "redacted-and-hashed",
      hash: "sha256",
      maxGroups: 50
    },
    groups: boundedGroups,
    groupCount: groups.length,
    truncated: groups.length > boundedGroups.length
  };
}

type DuplicateStringGroup = {
  value: string;
  count?: number;
  totalSelfSize?: unknown;
  totalRetainedSize?: unknown;
  truncated?: boolean;
  nodeCount?: number;
};

function collectDuplicateStringGroups(value: unknown): DuplicateStringGroup[] {
  const groups: DuplicateStringGroup[] = [];
  walk(value, (candidate) => {
    if (typeof candidate === "string") {
      const parsed = parseJsonText(candidate);
      if (parsed !== undefined) walk(parsed, (parsedCandidate) => collectDuplicateStringGroup(parsedCandidate, groups));
      return;
    }
    collectDuplicateStringGroup(candidate, groups);
  });
  return dedupeDuplicateStringGroups(groups);
}

function collectDuplicateStringGroup(candidate: unknown, groups: DuplicateStringGroup[]): void {
    if (!isPlainObject(candidate) || typeof candidate.value !== "string") return;
    const count = typeof candidate.count === "number" ? candidate.count : undefined;
    if (count == null && !Array.isArray(candidate.nodes)) return;
    groups.push({
      value: candidate.value,
      count,
      totalSelfSize: candidate.totalSelfSize,
      totalRetainedSize: candidate.totalRetainedSize,
      truncated: candidate.truncated === true,
      nodeCount: Array.isArray(candidate.nodes) ? candidate.nodes.length : undefined
    });
}

function parseJsonText(value: string): unknown | undefined {
  const trimmed = value.trim();
  if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) return undefined;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return undefined;
  }
}

function dedupeDuplicateStringGroups(groups: DuplicateStringGroup[]): DuplicateStringGroup[] {
  const unique = new Map<string, DuplicateStringGroup>();
  for (const group of groups) {
    const key = `${sha256(group.value)}:${group.count ?? ""}:${String(group.totalSelfSize ?? "")}:${String(group.totalRetainedSize ?? "")}`;
    if (!unique.has(key)) unique.set(key, group);
  }
  return [...unique.values()];
}

function walk(value: unknown, visit: (candidate: unknown) => void, depth = 0): void {
  if (depth > 16 || value == null) return;
  visit(value);
  if (typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit, depth + 1);
    return;
  }
  for (const child of Object.values(value as Record<string, unknown>)) walk(child, visit, depth + 1);
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function redactText(value: string): string {
  const redacted = value.replace(SECRET_VALUE_RE, REDACTED);
  return redacted.replace(/([?&][^=]*(?:token|secret|key|password|session|auth|csrf|xsrf|signature|sig)[^=]*=)[^&\s]+/gi, `$1${REDACTED}`);
}

function isHeaderObject(value: unknown): value is Record<string, string> {
  return isPlainObject(value) && Object.values(value).every((child) => typeof child === "string" || child == null);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasUrlPolicy(config: Required<UpstreamMcpRuntimeConfig>): boolean {
  return config.allowedUrlPatterns.length > 0 || config.blockedUrlPatterns.length > 0;
}

function requireRouteToken(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("Upstream delegation requires a routeToken.");
  return value.trim();
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringList(value: unknown, name: string): string[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error(`${name} must be an array of strings.`);
  return [...new Set(value.map((item) => {
    if (typeof item !== "string" || !item.trim()) throw new Error(`${name} must contain only non-empty strings.`);
    return item.trim();
  }))];
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number, name: string): number {
  if (value == null) return fallback;
  if (!Number.isInteger(value)) throw new Error(`${name} must be an integer.`);
  const numeric = value as number;
  if (numeric < min || numeric > max) throw new Error(`${name} must be between ${min} and ${max}.`);
  return numeric;
}

function numericString(value: unknown): value is string {
  return typeof value === "string" && /^\d+$/.test(value);
}

function maskToken(value: string): string {
  if (value.length <= 6) return "***";
  return `${value.slice(0, 3)}...${value.slice(-3)}`;
}

function shellCommand(parts: string[]): string {
  return parts.map((part) => (/^[a-z0-9@/_:.,=+-]+$/i.test(part) ? part : `'${part.replaceAll("'", "'\\''")}'`)).join(" ");
}

function boundedAppend(base: string, next: string, maxBytes: number): string {
  const combined = base + next;
  if (Buffer.byteLength(combined, "utf8") <= maxBytes) return combined;
  return combined.slice(-maxBytes);
}

function writeJson(child: ReturnType<typeof spawn>, message: Record<string, unknown>): void {
  if (!child.stdin) throw new Error("Upstream MCP process stdin is unavailable.");
  child.stdin.write(`${JSON.stringify(message)}\n`);
}

type JsonRpcMessage = {
  id?: number;
  result?: unknown;
  error?: unknown;
};
