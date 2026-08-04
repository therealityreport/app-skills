import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

test("MCP launcher uses the plugin-local start wrapper", async () => {
  const mcp = JSON.parse(await fs.readFile(new URL("../.mcp.json", import.meta.url), "utf8"));
  const server = mcp.mcpServers["vintone-studio"];

  assert.equal(server.command, "./scripts/start-mcp.sh");
  assert.deepEqual(server.args, []);

  const wrapper = await fs.readFile(new URL("../scripts/start-mcp.sh", import.meta.url), "utf8");
  assert.match(wrapper, /exec node \.\/src\/server\.mjs/);
});
