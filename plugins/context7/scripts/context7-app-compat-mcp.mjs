#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { installStdioLifecycle, killProcessGroup } from "./stdio-lifecycle.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const quotaEnvFile = process.env.CONTEXT7_QUOTA_ENV_FILE || path.join(os.homedir(), ".codex/context7.env");
const packageName = process.env.CONTEXT7_MCP_PACKAGE || "@upstash/context7-mcp@3.2.4";
const npxBin = process.env.CONTEXT7_NPX_BIN || "npx";
// Test injection only: production always launches the pinned package through npx.
const upstreamTestScript = process.env.CONTEXT7_TEST_UPSTREAM_SCRIPT;
const safeRetryMethods = new Set(["tools/list", "resources/list", "resources/templates/list", "prompts/list"]);
// Mirrors REAPER_TERM_GRACE_SECS so a wedged upstream cannot outlive us.
const UPSTREAM_KILL_GRACE_MS = Number(process.env.CONTEXT7_KILL_GRACE_MS || 5000);

loadContext7QuotaEnv(quotaEnvFile);

function loadContext7QuotaEnv(file) {
  if (!fs.existsSync(file)) return;
  const allowed = new Set(["CONTEXT7_API_KEY", "CONTEXT7_FALLBACK_API_KEY", "CONTEXT7_MCP_PACKAGE", "CONTEXT7_MCP_LAUNCH_LOG"]);
  for (const rawLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match || !allowed.has(match[1]) || process.env[match[1]]) continue;
    const value = match[2].trim();
    process.env[match[1]] = (value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))
      ? value.slice(1, -1)
      : value;
  }
}

const apiKeyEnvName = ["CONTEXT7", "API", "KEY"].join("_");
const primaryApiKey = process.env[apiKeyEnvName] || "";
const fallbackApiKey = process.env.CONTEXT7_FALLBACK_API_KEY || "";
let usingFallbackApiKey = false;

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function rpcError(id, code, message, data) {
  const error = { code, message };
  if (data !== undefined) error.data = data;
  send({ jsonrpc: "2.0", id, error });
}

function rpcSuccess(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function responseKey(id) {
  return `${typeof id}:${String(id)}`;
}

class JsonRpcPeer {
  constructor(command, args, options = {}) {
    // detached: the upstream leads its own process group so shutdown can signal
    // the whole tree. `npm exec` / `npx` do not forward signals to their own
    // children, so without this the real MCP server survives our SIGTERM.
    this.child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["pipe", "pipe", "pipe"],
      detached: true
    });
    this.nextId = 1;
    this.pending = new Map();
    this.buffer = "";
    this.stderr = "";
    this.closed = false;
    this.exitInfo = null;
    this.onMessage = options.onMessage || (() => {});
    this.child.stdout.on("data", (chunk) => this.onData(chunk));
    this.child.stderr.on("data", (chunk) => { this.stderr += chunk.toString(); });
    this.child.on("exit", (code, signal) => {
      this.closed = true;
      this.exitInfo = { code, signal };
      const error = new Error(`Context7 upstream exited code=${code ?? "null"} signal=${signal ?? "null"}`);
      for (const { reject } of this.pending.values()) reject(error);
      this.pending.clear();
    });
  }

  onData(chunk) {
    this.buffer += chunk.toString();
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const message = JSON.parse(line);
        if (message.id != null && !message.method && this.pending.has(responseKey(message.id))) {
          const { resolve, reject } = this.pending.get(responseKey(message.id));
          this.pending.delete(responseKey(message.id));
          if (message.error) reject(new Error(message.error.message || JSON.stringify(message.error)));
          else resolve(message.result);
        } else {
          this.onMessage(message);
        }
      } catch {
        // Upstream diagnostics belong on stderr; ignore non-JSON stdout safely.
      }
    }
  }

  write(message) {
    if (this.closed || this.child.stdin.destroyed || this.child.stdin.writableEnded) {
      const suffix = this.exitInfo ? ` code=${this.exitInfo.code ?? "null"} signal=${this.exitInfo.signal ?? "null"}` : "";
      return Promise.reject(new Error(`Context7 upstream transport is closed${suffix}`));
    }
    return new Promise((resolve, reject) => this.child.stdin.write(`${JSON.stringify(message)}\n`, (error) => error ? reject(error) : resolve()));
  }

  async request(method, params = {}) {
    const id = this.nextId++;
    const key = responseKey(id);
    const response = new Promise((resolve, reject) => this.pending.set(key, { resolve, reject }));
    try {
      await this.write({ jsonrpc: "2.0", id, method, params });
    } catch (error) {
      this.pending.delete(key);
      throw error;
    }
    return response;
  }

  notify(method, params = {}) {
    return this.write({ jsonrpc: "2.0", method, params }).catch(() => {});
  }

  close() {
    if (this.closed) return;
    killProcessGroup(this.child, "SIGTERM");
    const escalate = setTimeout(() => {
      if (!this.closed) killProcessGroup(this.child, "SIGKILL");
    }, UPSTREAM_KILL_GRACE_MS);
    escalate.unref();
  }
}

let downstreamInitialize;
let downstreamCapabilities = {};
let downstreamInitializedNotification = false;
let downstreamInitializedParams;
let upstream;
let upstreamReady;
const outstandingUpstreamRequests = new Set();

function upstreamIsUsable() {
  return Boolean(upstream && !upstream.closed && !upstream.child.stdin.destroyed && !upstream.child.stdin.writableEnded);
}

function resetUpstream() {
  upstream?.close();
  upstream = null;
  upstreamReady = null;
  outstandingUpstreamRequests.clear();
}

function downstreamSupportsElicitation() {
  return Boolean(downstreamCapabilities?.elicitation || downstreamCapabilities?.elicitation?.form);
}

function relayUpstreamMessage(message) {
  if (message.id != null && message.method) {
    if (message.method === "elicitation/create" && !downstreamSupportsElicitation()) {
      void upstream?.write({
        jsonrpc: "2.0",
        id: message.id,
        error: { code: -32601, message: "Downstream client did not advertise MCP elicitation support." }
      });
      return;
    }
    outstandingUpstreamRequests.add(responseKey(message.id));
  }
  send(message);
}

async function getUpstream() {
  if (!downstreamInitialize) throw new Error("Initialize the Context7 MCP server before calling it.");
  if (upstreamReady && upstreamIsUsable()) return upstreamReady;
  if (upstreamReady) resetUpstream();

  upstream = new JsonRpcPeer(
    upstreamTestScript ? process.execPath : npxBin,
    upstreamTestScript ? [upstreamTestScript] : ["-y", packageName, "--transport", "stdio"],
    {
    cwd: path.resolve(scriptDir, ".."),
    env: { ...process.env, NO_COLOR: "1" },
      onMessage: relayUpstreamMessage
    }
  );
  upstreamReady = (async () => {
    try {
      upstream.initializeResult = await upstream.request("initialize", downstreamInitialize);
      if (downstreamInitializedNotification) await upstream.notify("notifications/initialized", downstreamInitializedParams);
      return upstream;
    } catch (error) {
      resetUpstream();
      throw error;
    }
  })();
  return upstreamReady;
}

function isTransportError(error) {
  return /stream was destroyed|transport is closed|upstream exited|EPIPE|ERR_STREAM_DESTROYED/i.test(error instanceof Error ? error.message : String(error));
}

async function upstreamRequest(method, params, { retry = false } = {}) {
  try {
    return await (await getUpstream()).request(method, params);
  } catch (error) {
    if (!retry || !isTransportError(error)) throw error;
    resetUpstream();
    return (await getUpstream()).request(method, params);
  }
}

function stringArg(args, key) {
  return typeof args?.[key] === "string" ? args[key].trim() : "";
}

function legacyResolverTool(tool) {
  const inputSchema = structuredClone(tool.inputSchema || { type: "object", properties: {} });
  inputSchema.properties ||= {};
  inputSchema.properties.query ||= { type: "string", description: "Optional compatibility query used to rank Context7 library matches." };
  inputSchema.required = (inputSchema.required || []).filter((field) => field !== "query");
  if (!inputSchema.required.includes("libraryName")) inputSchema.required.push("libraryName");
  return {
    ...tool,
    description: `${tool.description || "Resolve a Context7 library ID."} Old callers may omit query; this adapter derives a minimal safe query.`,
    inputSchema
  };
}

function legacyDocsTool() {
  return {
    name: "get-library-docs",
    title: "get-library-docs",
    description: "Compatibility action for older Context7 callers. Maps context7CompatibleLibraryID/topic to query-docs.",
    inputSchema: {
      type: "object",
      properties: {
        context7CompatibleLibraryID: { type: "string", description: "Exact Context7-compatible library ID." },
        topic: { type: "string", description: "Documentation topic. Defaults to a generic request for the selected library." },
        tokens: { type: "number", description: "Accepted legacy field; upstream controls response sizing." }
      },
      required: ["context7CompatibleLibraryID"],
      additionalProperties: false
    }
  };
}

function overlayTools(upstreamTools) {
  const tools = Array.isArray(upstreamTools) ? upstreamTools.map((tool) => tool.name === "resolve-library-id" ? legacyResolverTool(tool) : tool) : [];
  if (!tools.some((tool) => tool.name === "get-library-docs")) tools.push(legacyDocsTool());
  return tools;
}

function emptyList(method) {
  if (method === "prompts/list") return { prompts: [] };
  if (method === "resources/templates/list") return { resourceTemplates: [] };
  return { resources: [] };
}

async function callToolOnce(params) {
  const name = params?.name;
  const args = params?.arguments || {};
  if (name === "resolve-library-id") {
    const libraryName = stringArg(args, "libraryName");
    const query = stringArg(args, "query") || `Resolve Context7 library ID for ${libraryName}`;
    return upstreamRequest("tools/call", { name, arguments: { ...args, libraryName, query } }, { retry: true });
  }
  if (name === "get-library-docs") {
    const libraryId = stringArg(args, "context7CompatibleLibraryID");
    const query = stringArg(args, "topic") || `Documentation for ${libraryId}`;
    return upstreamRequest("tools/call", { name: "query-docs", arguments: { libraryId, query } }, { retry: true });
  }
  return upstreamRequest("tools/call", params, { retry: name === "query-docs" });
}

function isMonthlyQuotaResult(result) {
  const text = JSON.stringify(result);
  return /monthly quota reached|monthly (?:request )?limit (?:has been )?reached|monthly quota (?:is )?exhausted/i.test(text);
}

async function callTool(params) {
  let result = await callToolOnce(params);
  if (
    !usingFallbackApiKey
    && primaryApiKey
    && fallbackApiKey
    && fallbackApiKey !== primaryApiKey
    && isMonthlyQuotaResult(result)
  ) {
    process.env[apiKeyEnvName] = fallbackApiKey;
    usingFallbackApiKey = true;
    resetUpstream();
    result = await callToolOnce(params);
  }
  return result;
}

async function handleRequest(message) {
  const { id, method, params = {} } = message;
  if (method === "initialize") {
    downstreamInitialize = structuredClone(params);
    downstreamInitialize.protocolVersion ??= "2024-11-05";
    downstreamInitialize.capabilities ??= {};
    downstreamInitialize.clientInfo ??= { name: "context7-app-compat-client", version: "unknown" };
    downstreamCapabilities = downstreamInitialize.capabilities;
    downstreamInitializedNotification = false;
    downstreamInitializedParams = undefined;
    resetUpstream();
    const client = await getUpstream();
    rpcSuccess(id, client.initializeResult);
    return;
  }
  if (!downstreamInitialize) throw new Error("Initialize the Context7 MCP server before calling it.");
  if (method === "tools/list") {
    const result = await upstreamRequest("tools/list", params, { retry: true });
    rpcSuccess(id, { ...result, tools: overlayTools(result?.tools) });
    return;
  }
  if (method === "tools/call") {
    rpcSuccess(id, await callTool(params));
    return;
  }
  if (safeRetryMethods.has(method)) {
    try {
      rpcSuccess(id, await upstreamRequest(method, params, { retry: true }));
    } catch (error) {
      if (/Method not found|not supported/i.test(error instanceof Error ? error.message : String(error))) rpcSuccess(id, emptyList(method));
      else throw error;
    }
    return;
  }
  rpcSuccess(id, await upstreamRequest(method, params));
}

let inputBuffer = "";
process.stdin.on("data", (chunk) => {
  inputBuffer += chunk.toString();
  const lines = inputBuffer.split(/\r?\n/);
  inputBuffer = lines.pop() || "";
  for (const line of lines) if (line.trim()) void handleLine(line);
});

async function handleLine(line) {
  let message;
  try { message = JSON.parse(line); } catch { return; }
  if (!message.method && message.id != null && outstandingUpstreamRequests.delete(responseKey(message.id))) {
    try { await upstream?.write(message); } catch { /* upstream already closed; do not fabricate acceptance. */ }
    return;
  }
  if (!message.method) return;
  if (message.method === "notifications/initialized") {
    if (downstreamInitialize) {
      downstreamInitializedNotification = true;
      downstreamInitializedParams = structuredClone(message.params ?? {});
      await (await getUpstream()).notify(message.method, downstreamInitializedParams);
    }
    return;
  }
  if (message.id == null) {
    if (downstreamInitialize) await (await getUpstream()).notify(message.method, message.params || {});
    return;
  }
  try {
    await handleRequest(message);
  } catch (error) {
    rpcError(message.id, -32000, error instanceof Error ? error.message : String(error));
  }
}

process.on("exit", () => upstream?.close());

// Without this the shim never observes its client going away: `stdin.on("data")`
// alone has no EOF path, and the upstream child's piped stdout/stderr keep the
// event loop alive forever. That is the leak -- one orphaned three-process chain
// per session that actually used Context7.
installStdioLifecycle({
  onShutdown: () => upstream?.close(),
  exitGraceMs: UPSTREAM_KILL_GRACE_MS + 1000
});
