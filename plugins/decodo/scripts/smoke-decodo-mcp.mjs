#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { getAuthState } from "../tools/decodo-sdk-runner/index.mjs";
import {
  parseCommonArgs,
  printHelp,
  requireCredentials,
  runCli,
  safeJson,
  statusLine,
} from "../tools/decodo-fixtures/cli.mjs";
import { printSafe, redact } from "../tools/decodo-fixtures/redaction.mjs";

const HELP = {
  name: "smoke-decodo-mcp",
  description: "Dry-validates the Decodo MCP config and optionally starts the configured command.",
  usage: "node scripts/smoke-decodo-mcp.mjs [--dry-run|--live] [--max-requests 1]",
  options: [
    "--help              Show this help.",
    "--dry-run           Default. Parse config only; no network and no server launch.",
    "--live              Require auth and launch the MCP command briefly.",
    "--max-requests N    Hard ceiling for live MCP tool calls. This wrapper never exceeds 1.",
  ],
  examples: [
    "node scripts/smoke-decodo-mcp.mjs --dry-run",
    "Set SCRAPER_API_TOKEN, then run: node scripts/smoke-decodo-mcp.mjs --live --max-requests 1",
  ],
};

runCli(async () => {
  const args = parseCommonArgs(process.argv.slice(2), {
    defaultDryRun: true,
    defaultMaxRequests: 1,
    hardMaxRequests: 1,
  });

  if (args.help) {
    printHelp(HELP);
    return 0;
  }

  const pluginRoot = resolve(import.meta.dirname, "..");
  const configPath = resolve(pluginRoot, ".mcp.json");
  const rawConfig = await readFile(configPath, "utf8");
  const config = JSON.parse(rawConfig);
  const server = config.mcpServers?.decodo;

  if (!server || !server.command || !Array.isArray(server.args)) {
    throw new Error("Decodo MCP server config is missing command or args");
  }

  if (/Authorization\s*:|Basic\s+[A-Za-z0-9+/=]+|DECODO_AUTH_TOKEN\s*=|SCRAPER_API_TOKEN\s*=/.test(rawConfig)) {
    throw new Error("MCP config appears to contain a literal secret or authorization header");
  }

  const authState = getAuthState(process.env);
  requireCredentials(authState, { dryRun: args.dryRun, label: "Decodo MCP auth" });

  printSafe(statusLine("Decodo MCP auth", authState));
  printSafe(safeJson({
    configPath,
    command: server.command,
    args: server.args,
    dryRun: args.dryRun,
    live: args.live,
    maxRequests: args.maxRequests,
    networkSent: false,
  }));

  if (!args.live) {
    return 0;
  }

  const result = await launchMcpBriefly(server);
  printSafe(safeJson(result));
  return result.status === "started" ? 0 : 1;
});

function launchMcpBriefly(server) {
  return new Promise((resolveResult) => {
    const serverEnv = resolveServerEnv(server.env || {});
    const child = spawn(server.command, server.args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...serverEnv },
    });

    let stderr = "";
    let stdout = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      resolveResult({
        status: "started",
        details: "MCP process launched and was stopped before tool calls",
      });
    }, 2500);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      resolveResult({
        status: "failed",
        details: redact(error.message),
      });
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0 || code === null) {
        resolveResult({
          status: "started",
          details: "MCP process exited or was stopped before tool calls",
        });
      } else {
        resolveResult({
          status: "failed",
          details: redact(stderr || stdout || `MCP process exited ${code}`),
        });
      }
    });
  });
}

function resolveServerEnv(envMap) {
  const resolved = {};

  for (const [key, value] of Object.entries(envMap)) {
    const match = typeof value === "string" ? value.match(/^\$\{([A-Z0-9_]+)\}$/) : null;
    if (!match) {
      resolved[key] = value;
      continue;
    }

    const sourceKey = match[1];
    if (!process.env[sourceKey]) {
      throw new Error(`MCP env placeholder ${key} requires ${sourceKey} to be set`);
    }

    resolved[key] = process.env[sourceKey];
  }

  return resolved;
}
