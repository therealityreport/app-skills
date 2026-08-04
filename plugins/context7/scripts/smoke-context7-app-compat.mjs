#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(scriptDir, "start-context7-mcp.sh");
const child = spawn(serverPath, [], {
  cwd: path.resolve(scriptDir, ".."),
  stdio: ["pipe", "pipe", "pipe"],
  env: { ...process.env, NO_COLOR: "1" }
});

let nextId = 1;
let stdout = "";
let stderr = "";
const pending = new Map();

function fail(message) {
  child.kill("SIGTERM");
  console.error(message);
  if (stderr.trim()) console.error(stderr.trim());
  process.exit(1);
}

child.stdout.on("data", (chunk) => {
  stdout += chunk.toString();
  const lines = stdout.split(/\r?\n/);
  stdout = lines.pop() || "";
  for (const line of lines) {
    if (!line.trim()) continue;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      continue;
    }
    if (message.id == null || !pending.has(message.id)) continue;
    const entry = pending.get(message.id);
    pending.delete(message.id);
    clearTimeout(entry.timeout);
    if (message.error) entry.reject(new Error(message.error.message || JSON.stringify(message.error)));
    else entry.resolve(message.result);
  }
});

child.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});

child.on("exit", (code, signal) => {
  const error = new Error(`Context7 app compatibility server exited code=${code ?? "null"} signal=${signal ?? "null"}`);
  for (const entry of pending.values()) {
    clearTimeout(entry.timeout);
    entry.reject(error);
  }
  pending.clear();
});

function request(method, params = {}, timeoutMs = 60000) {
  const id = nextId++;
  const message = { jsonrpc: "2.0", id, method, params };
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timed out waiting for ${method}`));
    }, timeoutMs);
    pending.set(id, { resolve, reject, timeout });
    child.stdin.write(`${JSON.stringify(message)}\n`, (error) => {
      if (!error) return;
      pending.delete(id);
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function notify(method, params = {}) {
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
}

function ensureTool(result, name) {
  if (!Array.isArray(result?.tools) || !result.tools.some((tool) => tool.name === name)) {
    throw new Error(`Missing expected tool ${name}`);
  }
}

function ensureContent(result, label) {
  if (result?.isError) throw new Error(`${label} returned isError=true`);
  if (!Array.isArray(result?.content) || result.content.length === 0) {
    throw new Error(`${label} returned no content`);
  }
  if (/monthly quota reached|monthly (?:request )?limit (?:has been )?reached|monthly quota (?:is )?exhausted/i.test(JSON.stringify(result))) {
    throw new Error(`${label} remained quota-blocked after fallback`);
  }
}

try {
  await request("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: { elicitation: {} },
    clientInfo: { name: "context7-app-compat-smoke", version: "0.1.0" }
  });
  notify("notifications/initialized", {});

  const tools = await request("tools/list");
  ensureTool(tools, "resolve-library-id");
  ensureTool(tools, "query-docs");
  ensureTool(tools, "get-library-docs");

  for (const method of ["prompts/list", "resources/list", "resources/templates/list"]) {
    await request(method);
  }

  const resolved = await request("tools/call", {
    name: "resolve-library-id",
    arguments: { libraryName: "React" }
  });
  ensureContent(resolved, "old app resolver payload");

  const docs = await request("tools/call", {
    name: "get-library-docs",
    arguments: {
      context7CompatibleLibraryID: "/reactjs/react.dev",
      topic: "useEffect cleanup"
    }
  });
  ensureContent(docs, "old app docs payload");

  child.kill("SIGTERM");
  console.log("Context7 app compatibility smoke passed");
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
