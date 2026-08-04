#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(scriptDir, "start-context7-mcp.sh");
const fakeUpstream = path.join(scriptDir, "fixtures/context7-fake-upstream.mjs");

async function runCase({ supportsElicitation }) {
  const stateFile = path.join(mkdtempSync(path.join(tmpdir(), "context7-relay-")), "state.json");
  writeFileSync(stateFile, "{}\n");
  const child = spawn(serverPath, [], {
    cwd: path.resolve(scriptDir, ".."),
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, CONTEXT7_TEST_UPSTREAM_SCRIPT: fakeUpstream, CONTEXT7_FAKE_STATE_FILE: stateFile, NO_COLOR: "1" }
  });
  let buffer = "";
  const inbox = [];
  let exitError;
  child.on("exit", (code, signal) => { exitError = new Error(`adapter exited code=${code ?? "null"} signal=${signal ?? "null"}`); });
  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    for (const line of lines) if (line.trim()) inbox.push(JSON.parse(line));
  });

  function send(message) { child.stdin.write(`${JSON.stringify(message)}\n`); }
  async function take(predicate, label) {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const index = inbox.findIndex(predicate);
      if (index >= 0) return inbox.splice(index, 1)[0];
      if (exitError) throw exitError;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error(`Timed out waiting for ${label}`);
  }

  const initParams = {
    protocolVersion: "2025-06-18",
    capabilities: supportsElicitation ? { elicitation: {}, futureClientCapability: { enabled: true } } : { futureClientCapability: { enabled: true } },
    clientInfo: { name: "relay-test-client", version: "9.9.9" },
    _meta: { futureInitializeField: "must-survive" },
    futureInitializeOption: { nested: true }
  };
  send({ jsonrpc: "2.0", id: 1, method: "initialize", params: initParams });
  const initialized = await take((message) => message.id === 1 && !message.method, "initialize response");
  assert.equal(initialized.error, undefined);
  send({ jsonrpc: "2.0", method: "notifications/initialized", params: { _meta: { notificationField: "must-replay" } } });

  send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
  const tools = await take((message) => message.id === 2 && !message.method, "retry-safe tools/list response");
  assert.equal(tools.error, undefined);

  // Deliberately use the same ID as the upstream elicitation request. Direction and the method field must keep the frames distinct.
  send({ jsonrpc: "2.0", id: "upstream-elicitation-1", method: "tools/call", params: { name: "trigger-elicitation", arguments: {} } });
  const elicitation = await take((message) => message.method === "elicitation/create", "forwarded elicitation").catch((error) => supportsElicitation ? Promise.reject(error) : null);
  if (supportsElicitation) {
    assert.equal(elicitation.id, "upstream-elicitation-1");
    send({ jsonrpc: "2.0", id: elicitation.id, result: { action: "accept", content: { approved: true } } });
  }
  const final = await take((message) => message.id === "upstream-elicitation-1" && !message.method, "tools/call response");
  assert.equal(final.error, undefined);
  child.kill("SIGTERM");

  const state = JSON.parse(readFileSync(stateFile, "utf8"));
  assert.deepEqual(state.initializes, [initParams, initParams]);
  assert.equal(state.initializedNotifications.length, 2, "initialized notification must replay after safe retry");
  assert.deepEqual(state.initializedNotifications[1], { _meta: { notificationField: "must-replay" } });
  const upstreamReply = state.elicitationResponses.at(-1);
  if (supportsElicitation) {
    assert.deepEqual(upstreamReply.result, { action: "accept", content: { approved: true } });
    assert.equal(final.result.content[0].text, "elicitation relayed");
  } else {
    assert.equal(elicitation, null);
    assert.equal(upstreamReply.error.code, -32601);
    assert.equal(final.result.content[0].text, "elicitation rejected");
  }
}

await runCase({ supportsElicitation: true });
await runCase({ supportsElicitation: false });
console.log("Context7 deterministic relay test passed");
