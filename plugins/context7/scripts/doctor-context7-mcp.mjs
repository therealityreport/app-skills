#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const expectedVersion = "3.2.4";
const expectedPackage = `@upstash/context7-mcp@${expectedVersion}`;
const jsonMode = process.argv.includes("--json");
const checks = [];

function add(status, name, detail) {
  checks.push({ status, name, detail });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(pluginRoot, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: pluginRoot,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    ...options
  });
}

function packageIsPinned(value) {
  return /^@upstash\/context7-mcp@[0-9]+\.[0-9]+\.[0-9]+([-.][A-Za-z0-9.]+)?$/.test(value);
}

async function listTools() {
  return new Promise((resolve, reject) => {
    const child = spawn(path.join(pluginRoot, "scripts/start-context7-mcp.sh"), [], {
      cwd: pluginRoot,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, NO_COLOR: "1" }
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`tools/list timed out. stderr=${stderr.trim()}`));
    }, 9000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    const send = (message) => {
      child.stdin.write(`${JSON.stringify(message)}\n`);
    };

    setTimeout(() => {
      send({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: {
            name: "context7-doctor",
            version: "0.1.0"
          }
        }
      });
      send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
      send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    }, 200);

    setTimeout(() => {
      clearTimeout(timer);
      child.kill("SIGTERM");
      const responses = stdout.split(/\r?\n/).filter(Boolean);
      for (const line of responses) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.id === 2) {
            if (parsed.error) reject(new Error(JSON.stringify(parsed.error)));
            else resolve(parsed.result?.tools || []);
            return;
          }
        } catch {
          // Ignore non-JSON output.
        }
      }
      reject(new Error(`tools/list response missing. stderr=${stderr.trim()}`));
    }, 5000);
  });
}

function requiredFields(tool) {
  return [...(tool?.inputSchema?.required || [])].sort();
}

function hasFields(tool, fields) {
  const actual = requiredFields(tool);
  return fields.every((field) => actual.includes(field));
}

function listCodexAppsToolCacheFiles() {
  const cacheDir = path.join(process.env.HOME || "", ".codex/cache/codex_apps_tools");
  if (!fs.existsSync(cacheDir)) return [];
  return fs
    .readdirSync(cacheDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join(cacheDir, name));
}

function context7AppCacheFindings() {
  const findings = [];
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
      findings.push({
        file,
        toolName: item.tool_name || item.tool?.name || "unknown"
      });
    }
  }
  return findings;
}

try {
  const startScript = readText("scripts/start-context7-mcp.sh");
  if (startScript.includes(expectedPackage)) {
    add("pass", "wrapper pin", `start-context7-mcp.sh defaults to ${expectedPackage}`);
  } else {
    add("fail", "wrapper pin", `start-context7-mcp.sh does not default to ${expectedPackage}`);
  }

  if (startScript.includes("package_is_pinned")) {
    add("pass", "startup guard", "wrapper blocks unpinned Context7 MCP package values");
  } else {
    add("fail", "startup guard", "wrapper does not contain the unpinned-package guard");
  }

  if (startScript.includes("context7-app-compat-mcp.mjs")) {
    add("pass", "app compatibility adapter", "wrapper routes stdio through the Context7 app compatibility adapter");
  } else {
    add("fail", "app compatibility adapter", "wrapper does not route stdio through the compatibility adapter");
  }

  const metadata = readJson("tools/context7-mcp-tools.json");
  if (metadata.package === "@upstash/context7-mcp" && metadata.version === expectedVersion) {
    add("pass", "tool metadata version", "metadata is aligned to Context7 MCP 3.2.4");
  } else {
    add("fail", "tool metadata version", "metadata version is not aligned to Context7 MCP 3.2.4");
  }
  if (metadata.adapter === "context7-app-compat") {
    add("pass", "tool metadata adapter", "metadata records the Context7 app compatibility adapter");
  } else {
    add("fail", "tool metadata adapter", "metadata is missing the Context7 app compatibility adapter marker");
  }
  if (metadata.mirrorsUpstreamTools === true) {
    add("pass", "dynamic tool mirroring", "metadata records that live upstream tool schemas are mirrored");
  } else {
    add("fail", "dynamic tool mirroring", "metadata does not declare live upstream tool mirroring");
  }

  const metadataResolve = metadata.tools?.find((tool) => tool.name === "resolve-library-id");
  const metadataQuery = metadata.tools?.find((tool) => tool.name === "query-docs");
  const metadataOldDocs = metadata.tools?.find((tool) => tool.name === "get-library-docs");
  const metadataResolveProps = new Set(Object.keys(metadataResolve?.inputSchema?.properties || {}));
  if (
    hasFields(metadataResolve, ["libraryName"]) &&
    metadataResolveProps.has("query") &&
    hasFields(metadataQuery, ["libraryId", "query"]) &&
    hasFields(metadataOldDocs, ["context7CompatibleLibraryID"])
  ) {
    add("pass", "tool metadata schema", "metadata records current and old Context7 app argument shapes");
  } else {
    add("fail", "tool metadata schema", "metadata does not record the compatibility argument shape");
  }

  const mcp = readJson(".mcp.json");
  const command = mcp.mcpServers?.context7?.command;
  const absoluteWrapper = path.join(pluginRoot, "scripts/start-context7-mcp.sh");
  if (command === "./scripts/start-context7-mcp.sh" || command === absoluteWrapper) {
    add("pass", "plugin mcp command", ".mcp.json uses the plugin-local wrapper");
  } else {
    add("fail", "plugin mcp command", `.mcp.json command is ${JSON.stringify(command)}`);
  }

  const globalLauncher = path.join(process.env.HOME || "", ".codex/bin/codex-context7-mcp.sh");
  if (fs.existsSync(globalLauncher)) {
    const launcherText = fs.readFileSync(globalLauncher, "utf8");
    if (launcherText.includes("plugins/context7/scripts/start-context7-mcp.sh") && !launcherText.includes("npm exec --yes")) {
      add("pass", "global launcher", "codex-context7-mcp.sh delegates to the plugin compatibility wrapper");
    } else {
      add("fail", "global launcher", "codex-context7-mcp.sh can bypass the plugin compatibility wrapper");
    }
  } else {
    add("warn", "global launcher", "codex-context7-mcp.sh not found");
  }

  const envPackage = process.env.CONTEXT7_MCP_PACKAGE;
  if (!envPackage) {
    add("pass", "environment override", "CONTEXT7_MCP_PACKAGE is not set");
  } else if (packageIsPinned(envPackage)) {
    add(envPackage === expectedPackage ? "pass" : "warn", "environment override", `CONTEXT7_MCP_PACKAGE is pinned to ${envPackage}`);
  } else {
    add("fail", "environment override", `CONTEXT7_MCP_PACKAGE is unpinned: ${envPackage}`);
  }

  const versionResult = run(path.join(pluginRoot, "scripts/start-context7-mcp.sh"), ["--version"]);
  const version = versionResult.stdout.trim();
  if (version === expectedVersion) {
    add("pass", "wrapper version", `wrapper reports ${version}`);
  } else {
    add("fail", "wrapper version", `expected ${expectedVersion}, got stdout=${JSON.stringify(version)} stderr=${JSON.stringify(versionResult.stderr.trim())}`);
  }

  const configPath = path.join(process.env.HOME || "", ".codex/config.toml");
  if (fs.existsSync(configPath)) {
    const config = fs.readFileSync(configPath, "utf8");
    const match = config.match(/\[mcp_servers\.context7\]([\s\S]*?)(?=\n\[|$)/);
    const block = match?.[1] || "";
    if (block.includes("start-context7-mcp.sh") || block.includes("codex-context7-mcp.sh")) {
      add("pass", "codex config", "global context7 MCP config uses a pinned local wrapper");
    } else if (block.includes("@upstash/context7-mcp") && !block.includes("@upstash/context7-mcp@")) {
      add("fail", "codex config", "global context7 MCP config uses unpinned @upstash/context7-mcp");
    } else {
      add("warn", "codex config", "global context7 MCP config not found or not wrapper-based");
    }
  } else {
    add("warn", "codex config", "no ~/.codex/config.toml found");
  }

  const tools = await listTools();
  const liveResolve = tools.find((tool) => tool.name === "resolve-library-id");
  const liveQuery = tools.find((tool) => tool.name === "query-docs");
  const liveOldDocs = tools.find((tool) => tool.name === "get-library-docs");
  const liveResolveProps = new Set(Object.keys(liveResolve?.inputSchema?.properties || {}));
  if (
    hasFields(liveResolve, ["libraryName"]) &&
    liveResolveProps.has("query") &&
    hasFields(liveQuery, ["libraryId", "query"]) &&
    hasFields(liveOldDocs, ["context7CompatibleLibraryID"])
  ) {
    add("pass", "live mcp schema", "tools/list exposes current Context7 tools plus old app compatibility");
  } else {
    add("fail", "live mcp schema", `unexpected tools/list schema: ${JSON.stringify(tools.map((tool) => ({ name: tool.name, required: requiredFields(tool) })))}`);
  }

  const appCacheFindings = context7AppCacheFindings();
  if (appCacheFindings.length > 0) {
    add(
      "fail",
      "codex app Context7 cache",
      `broken Context7 app connector cache entries are present in ${[...new Set(appCacheFindings.map((item) => item.file))].join(", ")}`
    );
  } else {
    add("pass", "codex app Context7 cache", "broken Context7 app connector cache entries are absent");
  }
} catch (error) {
  add("fail", "doctor exception", error instanceof Error ? error.message : String(error));
}

const statusOrder = { fail: 0, warn: 1, pass: 2 };
const failed = checks.some((check) => check.status === "fail");

if (jsonMode) {
  console.log(JSON.stringify({ ok: !failed, expectedVersion, checks }, null, 2));
} else {
  console.log(`Context7 MCP doctor: ${failed ? "failed" : "passed"}`);
  for (const check of checks.sort((a, b) => statusOrder[a.status] - statusOrder[b.status])) {
    console.log(`[${check.status}] ${check.name}: ${check.detail}`);
  }
}

process.exit(failed ? 1 : 0);
