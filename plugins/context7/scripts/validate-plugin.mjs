#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = path.resolve(new URL("..", import.meta.url).pathname);
const scriptPath = fileURLToPath(import.meta.url);
const errors = [];

function fail(message) {
  errors.push(message);
}

function readJson(relativePath) {
  const file = path.join(pluginRoot, relativePath);
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`${relativePath} is not valid JSON: ${error.message}`);
    return null;
  }
}

function exists(relativePath) {
  const file = path.join(pluginRoot, relativePath);
  if (!fs.existsSync(file)) {
    fail(`Missing ${relativePath}`);
    return false;
  }
  return true;
}

function isExecutable(relativePath) {
  const file = path.join(pluginRoot, relativePath);
  if (!fs.existsSync(file)) {
    fail(`Missing executable ${relativePath}`);
    return;
  }
  try {
    fs.accessSync(file, fs.constants.X_OK);
  } catch {
    fail(`${relativePath} is not executable`);
  }
}

function parseFrontmatter(relativePath) {
  const file = path.join(pluginRoot, relativePath);
  if (!fs.existsSync(file)) {
    fail(`Missing ${relativePath}`);
    return {};
  }
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    fail(`${relativePath} is missing YAML frontmatter`);
    return {};
  }
  const fields = {};
  for (const line of match[1].split("\n")) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (field) fields[field[1]] = field[2].trim();
  }
  if (!fields.name) fail(`${relativePath} frontmatter missing name`);
  if (!fields.description) fail(`${relativePath} frontmatter missing description`);
  return fields;
}

function listCodexAppsToolCacheFiles() {
  const cacheDir = path.join(process.env.HOME || "", ".codex/cache/codex_apps_tools");
  if (!fs.existsSync(cacheDir)) return [];
  return fs
    .readdirSync(cacheDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join(cacheDir, name));
}

function validateContext7AppToolCache() {
  let appConnectorEntries = 0;
  const staleFiles = [];
  for (const file of listCodexAppsToolCacheFiles()) {
    let payload;
    try {
      payload = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      continue;
    }
    const items = Array.isArray(payload) ? payload : Array.isArray(payload?.tools) ? payload.tools : [];
    for (const item of items) {
      if (item?.tool_namespace !== "codex_apps__context7") {
        continue;
      }
      appConnectorEntries += 1;
      staleFiles.push(file);
    }
  }
  if (staleFiles.length > 0) {
    fail(`Broken Context7 app connector cache entries are present: ${[...new Set(staleFiles)].join(", ")}`);
  }
  return appConnectorEntries;
}

const plugin = readJson(".codex-plugin/plugin.json");
const mcp = readJson(".mcp.json");

if (plugin) {
  if (plugin.name !== "context7") fail("plugin name must be context7");
  if (String(plugin.version || "").includes("TODO")) fail("plugin version still has TODO");
  const prompts = plugin.interface?.defaultPrompt || [];
  if (prompts.length > 3) fail("interface.defaultPrompt must have at most 3 entries");
  for (const prompt of prompts) {
    if (prompt.length > 128) fail(`defaultPrompt too long: ${prompt}`);
  }
  const includes = plugin.interface?.includes || [];
  for (const item of includes) {
    if (item.kind === "skill") {
      const skillPath = `skills/${item.name}/SKILL.md`;
      const fields = parseFrontmatter(skillPath);
      if (fields.name && fields.name !== item.name) {
        fail(`${skillPath} name does not match manifest include`);
      }
    } else if (item.kind === "agent") {
      exists(`agents/${item.name}.md`);
    } else if (item.kind === "mcp") {
      if (!mcp?.mcpServers?.[item.name]) {
        fail(`MCP include ${item.name} missing from .mcp.json`);
      }
    }
  }
}

for (const file of [
  "README.md",
  "UPSTREAM.md",
  "PRIVACY.md",
  "TERMS.md",
  "assets/app-icon.svg",
  "scripts/context7-app-compat-mcp.mjs",
  "scripts/test-context7-app-relay.mjs",
  "scripts/fixtures/context7-fake-upstream.mjs",
  "scripts/repair-context7-mcp.mjs",
  "scripts/find-node-tool.sh",
  "scripts/start-context7-mcp.sh",
  "scripts/doctor-context7-mcp.mjs",
  "scripts/smoke-context7-app-compat.mjs",
  "scripts/smoke-context7-cli.sh",
  "scripts/smoke-context7-mcp.sh",
  "scripts/refresh-upstream.sh",
  "tools/context7-mcp-tools.json"
]) {
  exists(file);
}

for (const file of [
  "scripts/context7-app-compat-mcp.mjs",
  "scripts/test-context7-app-relay.mjs",
  "scripts/fixtures/context7-fake-upstream.mjs",
  "scripts/repair-context7-mcp.mjs",
  "scripts/find-node-tool.sh",
  "scripts/start-context7-mcp.sh",
  "scripts/doctor-context7-mcp.mjs",
  "scripts/smoke-context7-app-compat.mjs",
  "scripts/smoke-context7-cli.sh",
  "scripts/smoke-context7-mcp.sh",
  "scripts/refresh-upstream.sh"
]) {
  isExecutable(file);
}

const toolMetadata = readJson("tools/context7-mcp-tools.json");
if (toolMetadata) {
  if (toolMetadata.package !== "@upstash/context7-mcp") fail("tool metadata package must be @upstash/context7-mcp");
  if (toolMetadata.version !== "3.2.4") fail("tool metadata version must be 3.2.4");
  if (toolMetadata.adapter !== "context7-app-compat") fail("tool metadata adapter must be context7-app-compat");
  if (toolMetadata.mirrorsUpstreamTools !== true) fail("tool metadata must declare dynamic upstream tool mirroring");
  const tools = toolMetadata.tools || [];
  const resolveTool = tools.find((tool) => tool.name === "resolve-library-id");
  const queryTool = tools.find((tool) => tool.name === "query-docs");
  const oldDocsTool = tools.find((tool) => tool.name === "get-library-docs");
  const required = (tool) => new Set(tool?.inputSchema?.required || []);
  const properties = (tool) => new Set(Object.keys(tool?.inputSchema?.properties || {}));
  if (!required(resolveTool).has("libraryName") || !properties(resolveTool).has("query")) {
    fail("resolve-library-id metadata must require libraryName and accept query");
  }
  if (!required(queryTool).has("query") || !required(queryTool).has("libraryId")) {
    fail("query-docs metadata must require query and libraryId");
  }
  if (!required(oldDocsTool).has("context7CompatibleLibraryID")) {
    fail("get-library-docs metadata must require context7CompatibleLibraryID");
  }
}

const documentationAnchors = [
  ["skills/context7/SKILL.md", "one resolve cycle"],
  ["skills/context7/SKILL.md", "up to three concept-scoped `query-docs` calls"],
  ["skills/context7-docs/SKILL.md", "one resolve cycle"],
  ["skills/context7-docs/SKILL.md", "up to three concept-scoped `query-docs` calls"],
  ["skills/context7-cli/references/setup-commands.md", "setup --codex --mcp --stdio"],
  ["skills/context7-cli/references/setup-commands.md", "remove --codex --all"],
  ["skills/context7-cli/references/auth.md", "login --no-browser"],
  ["skills/context7-cli/references/auth.md", "~/.config/context7/credentials.json"],
  ["skills/context7-cli/references/auth.md", "`0600`"],
  ["skills/context7-mcp-setup/references/hosted-http.md", "https://mcp.context7.com/mcp"],
  ["skills/context7-mcp-setup/references/hosted-http.md", "not compatible with `--stdio`"],
  ["skills/context7-app-integration/references/sdk-and-ai-sdk.md", "Context7Error"],
  ["skills/context7-app-integration/references/sdk-and-ai-sdk.md", "searchLibrary"],
  ["skills/context7-app-integration/references/sdk-and-ai-sdk.md", "getContext"],
  ["skills/context7-app-integration/references/sdk-and-ai-sdk.md", "resolveLibraryId"],
  ["skills/context7-app-integration/references/sdk-and-ai-sdk.md", "queryDocs"],
  ["skills/context7-app-integration/references/sdk-and-ai-sdk.md", "Context7Agent"],
  ["skills/context7-app-integration/references/sdk-and-ai-sdk.md", "generateText"],
  ["skills/context7-app-integration/references/sdk-and-ai-sdk.md", "streamText"]
];
for (const [relativePath, expected] of documentationAnchors) {
  const file = path.join(pluginRoot, relativePath);
  if (!fs.existsSync(file) || !fs.readFileSync(file, "utf8").includes(expected)) {
    fail(`${relativePath} is missing documentation anchor: ${expected}`);
  }
}

const allPluginText = [];
function collectFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(file);
    } else if (file !== scriptPath) {
      allPluginText.push(fs.readFileSync(file, "utf8"));
    }
  }
}
collectFiles(pluginRoot);
const joined = allPluginText.join("\n");
if (/CONTEXT7_API_KEY\s*=\s*["']?[^"'\s$]/.test(joined)) {
  fail("Plugin files appear to contain a literal CONTEXT7_API_KEY value");
}
const staleVersionNeedles = ["1.0.33", "2.2.1", "3.0.0"].map((version) => `@upstash/context7-mcp@${version}`);
if (staleVersionNeedles.some((needle) => joined.includes(needle))) {
  fail("Plugin files still reference stale Context7 MCP versions");
}
const todoNeedle = "[" + "TODO:";
if (joined.includes(todoNeedle)) {
  fail("Plugin files still contain scaffold TODO placeholders");
}

validateContext7AppToolCache();

if (errors.length > 0) {
  console.error("Context7 plugin validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Context7 plugin validation passed");
