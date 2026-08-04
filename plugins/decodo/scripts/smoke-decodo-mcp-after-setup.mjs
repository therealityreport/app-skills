#!/usr/bin/env node
import { execFile, spawn } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import {
  printHelp,
  runCli,
  safeJson,
} from "../tools/decodo-fixtures/cli.mjs";
import { printSafe } from "../tools/decodo-fixtures/redaction.mjs";

const execFileAsync = promisify(execFile);
const TOKEN_KEY = "SCRAPER_API_TOKEN";

const HELP = {
  name: "smoke-decodo-mcp-after-setup",
  description: "Runs the live Decodo MCP smoke check using SCRAPER_API_TOKEN from shell env or launchctl.",
  usage: "node scripts/smoke-decodo-mcp-after-setup.mjs [--live]",
  options: [
    "--help   Show this help.",
    "--live   Required. Starts the MCP process briefly and sends no tool calls.",
  ],
  examples: [
    "node scripts/setup-decodo-mcp-token.mjs",
    "node scripts/smoke-decodo-mcp-after-setup.mjs --live",
  ],
};

runCli(async () => {
  const flags = new Set(process.argv.slice(2));

  if (flags.has("--help") || flags.has("-h")) {
    printHelp(HELP);
    return 0;
  }

  if (!flags.has("--live")) {
    printHelp(HELP);
    throw new Error("--live is required for the post-setup MCP smoke check.");
  }

  const token = process.env[TOKEN_KEY] || await launchctlGetenv(TOKEN_KEY);
  if (!token || token.trim().length < 8) {
    throw new Error(`Missing ${TOKEN_KEY}. Run setup-decodo-mcp-token first.`);
  }

  const scriptPath = resolve(import.meta.dirname, "smoke-decodo-mcp.mjs");
  const result = await runSmoke(scriptPath, token);
  printSafe(safeJson({
    live: true,
    tokenSource: process.env[TOKEN_KEY] ? "shell-env" : "launchctl",
    tokenPrinted: false,
    smokeExitCode: result.code,
  }));
  printSafe(result.stdout);

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  return result.code;
});

async function launchctlGetenv(key) {
  try {
    const result = await execFileAsync("launchctl", ["getenv", key]);
    return result.stdout.trim();
  } catch {
    return "";
  }
}

function runSmoke(scriptPath, token) {
  return new Promise((resolveResult) => {
    const child = spawn(process.execPath, [scriptPath, "--live", "--max-requests", "1"], {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        [TOKEN_KEY]: token,
      },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      resolveResult({
        code: 1,
        stdout: "",
        stderr: `${error.message}\n`,
      });
    });

    child.on("close", (code) => {
      resolveResult({
        code: code ?? 1,
        stdout,
        stderr,
      });
    });
  });
}
