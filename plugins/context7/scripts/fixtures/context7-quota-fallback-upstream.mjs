#!/usr/bin/env node
import fs from "node:fs";

const stateFile = process.env.CONTEXT7_FAKE_STATE_FILE;
const primaryKeyEnv = ["CONTEXT7", "API", "KEY"].join("_");
if (!stateFile) throw new Error("CONTEXT7_FAKE_STATE_FILE is required");

function append(value) {
  let state = { keyModes: [] };
  try { state = JSON.parse(fs.readFileSync(stateFile, "utf8")); } catch {}
  state.keyModes ||= [];
  state.keyModes.push(value);
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

append(process.env[primaryKeyEnv] === "fallback-test-key" ? "fallback" : "primary");

let buffer = "";
process.stdin.on("data", (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split(/\r?\n/);
  buffer = lines.pop() || "";
  for (const line of lines) {
    if (!line.trim()) continue;
    const message = JSON.parse(line);
    if (message.method === "initialize") {
      send({
        jsonrpc: "2.0",
        id: message.id,
        result: {
          protocolVersion: message.params.protocolVersion,
          capabilities: { tools: {} },
          serverInfo: { name: "fake-context7-quota", version: "test" }
        }
      });
    } else if (message.method === "tools/call") {
      const isFallback = process.env[primaryKeyEnv] === "fallback-test-key";
      send({
        jsonrpc: "2.0",
        id: message.id,
        result: {
          content: [{
            type: "text",
            text: isFallback
              ? "Fallback lookup succeeded"
              : "Monthly quota reached. Upgrade to Context7 Pro."
          }]
        }
      });
    }
  }
});
