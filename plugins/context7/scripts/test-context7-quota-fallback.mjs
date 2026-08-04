#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(scriptDir, "start-context7-mcp.sh");
const fakeUpstream = path.join(scriptDir, "fixtures/context7-quota-fallback-upstream.mjs");
const stateFile = path.join(mkdtempSync(path.join(tmpdir(), "context7-quota-fallback-")), "state.json");
const primaryKeyEnv = ["CONTEXT7", "API", "KEY"].join("_");
writeFileSync(stateFile, JSON.stringify({ keyModes: [] }));

const child = spawn(serverPath, [], {
  cwd: path.resolve(scriptDir, ".."),
  stdio: ["pipe", "pipe", "pipe"],
  env: {
    ...process.env,
    [primaryKeyEnv]: "primary-test-key",
    CONTEXT7_FALLBACK_API_KEY: "fallback-test-key",
    CONTEXT7_TEST_UPSTREAM_SCRIPT: fakeUpstream,
    CONTEXT7_FAKE_STATE_FILE: stateFile,
    NO_COLOR: "1"
  }
});

let nextId = 1;
let buffer = "";
const pending = new Map();

child.stdout.on("data", (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split(/\r?\n/);
  buffer = lines.pop() || "";
  for (const line of lines) {
    if (!line.trim()) continue;
    const message = JSON.parse(line);
    const request = pending.get(message.id);
    if (!request) continue;
    pending.delete(message.id);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
  }
});

function request(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  });
}

await request("initialize", {
  protocolVersion: "2024-11-05",
  capabilities: {},
  clientInfo: { name: "quota-fallback-test", version: "1.0.0" }
});

const result = await request("tools/call", {
  name: "resolve-library-id",
  arguments: { libraryName: "Supabase", query: "SSR authentication" }
});

assert.equal(result.content[0].text, "Fallback lookup succeeded");
assert.deepEqual(JSON.parse(readFileSync(stateFile, "utf8")).keyModes, ["primary", "fallback"]);
child.kill("SIGTERM");
console.log("Context7 quota fallback test passed");
