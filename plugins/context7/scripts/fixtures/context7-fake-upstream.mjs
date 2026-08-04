#!/usr/bin/env node
import fs from "node:fs";

const stateFile = process.env.CONTEXT7_FAKE_STATE_FILE;
if (!stateFile) throw new Error("CONTEXT7_FAKE_STATE_FILE is required");

function readState() {
  try { return JSON.parse(fs.readFileSync(stateFile, "utf8")); } catch { return {}; }
}

function writeState(update) {
  fs.writeFileSync(stateFile, JSON.stringify({ ...readState(), ...update }, null, 2));
}

function append(key, value) {
  const state = readState();
  state[key] ||= [];
  state[key].push(value);
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

let buffer = "";
let pendingToolCallId;
process.stdin.on("data", (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split(/\r?\n/);
  buffer = lines.pop() || "";
  for (const line of lines) if (line.trim()) handle(JSON.parse(line));
});

function handle(message) {
  if (!message.method && message.id === "upstream-elicitation-1") {
    append("elicitationResponses", message);
    send({
      jsonrpc: "2.0",
      id: pendingToolCallId,
      result: { content: [{ type: "text", text: message.error ? "elicitation rejected" : "elicitation relayed" }] }
    });
    return;
  }
  if (message.method === "initialize") {
    append("initializes", message.params);
    send({
      jsonrpc: "2.0",
      id: message.id,
      result: {
        protocolVersion: message.params.protocolVersion,
        capabilities: { tools: {} },
        serverInfo: { name: "fake-context7", version: "test" }
      }
    });
    return;
  }
  if (message.method === "notifications/initialized") {
    append("initializedNotifications", message.params || {});
    return;
  }
  if (message.method === "tools/list") {
    const state = readState();
    const count = (state.toolsListCalls || 0) + 1;
    writeState({ toolsListCalls: count });
    if (count === 1) process.exit(0);
    send({ jsonrpc: "2.0", id: message.id, result: { tools: [{ name: "trigger-elicitation", inputSchema: { type: "object" } }] } });
    return;
  }
  if (message.method === "tools/call") {
    pendingToolCallId = message.id;
    send({
      jsonrpc: "2.0",
      id: "upstream-elicitation-1",
      method: "elicitation/create",
      params: { message: "Deterministic test prompt", requestedSchema: { type: "object" } }
    });
  }
}
