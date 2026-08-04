#!/usr/bin/env node
import { execFile } from "node:child_process";
import { stdin as input, stdout as output } from "node:process";
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
  name: "setup-decodo-mcp-token",
  description: "Stores the Decodo MCP token in macOS launchctl without writing it to plugin files.",
  usage: "node scripts/setup-decodo-mcp-token.mjs [--stdin|--clear|--status]",
  options: [
    "--help     Show this help.",
    "--stdin    Read the token from stdin instead of prompting.",
    "--clear    Remove SCRAPER_API_TOKEN from launchctl.",
    "--status   Report whether SCRAPER_API_TOKEN is present in launchctl and shell env.",
  ],
  examples: [
    "node scripts/setup-decodo-mcp-token.mjs",
    "printf '%s' \"$SCRAPER_API_TOKEN\" | node scripts/setup-decodo-mcp-token.mjs --stdin",
    "node scripts/setup-decodo-mcp-token.mjs --clear",
  ],
};

runCli(async () => {
  const flags = new Set(process.argv.slice(2));

  if (flags.has("--help") || flags.has("-h")) {
    printHelp(HELP);
    return 0;
  }

  if (flags.has("--status")) {
    const launchctlPresent = await hasLaunchctlToken();
    printSafe(safeJson({
      envVar: TOKEN_KEY,
      shellEnvPresent: Boolean(process.env[TOKEN_KEY]),
      launchctlPresent,
      tokenPrinted: false,
    }));
    return 0;
  }

  if (flags.has("--clear")) {
    await execFileAsync("launchctl", ["unsetenv", TOKEN_KEY]);
    printSafe(`${TOKEN_KEY} removed from launchctl. Restart ChatGPT/Codex before reconnecting.`);
    return 0;
  }

  const token = flags.has("--stdin") ? await readTokenFromStdin() : await promptHiddenToken();
  validateToken(token);

  await execFileAsync("launchctl", ["setenv", TOKEN_KEY, token]);
  printSafe(`${TOKEN_KEY} stored in launchctl for future ChatGPT/Codex launches.`);
  printSafe("Optional live check: node scripts/smoke-decodo-mcp-after-setup.mjs --live");
  printSafe("Fully quit and reopen ChatGPT/Codex, then connect the Decodo MCP server.");
  return 0;
});

async function hasLaunchctlToken() {
  try {
    const result = await execFileAsync("launchctl", ["getenv", TOKEN_KEY]);
    return result.stdout.trim().length > 0;
  } catch {
    return false;
  }
}

async function readTokenFromStdin() {
  const chunks = [];
  for await (const chunk of input) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8").trim();
}

async function promptHiddenToken() {
  if (!input.isTTY || !output.isTTY) {
    throw new Error("No TTY available. Pipe the token with --stdin.");
  }

  output.write("Paste Decodo SCRAPER_API_TOKEN: ");
  await setEcho(false);

  try {
    const token = await readLineFromTty();
    output.write("\n");
    return token.trim();
  } finally {
    await setEcho(true);
  }
}

function readLineFromTty() {
  return new Promise((resolve) => {
    let value = "";

    const onData = (chunk) => {
      const text = chunk.toString("utf8");
      const newlineIndex = text.search(/\r|\n/);

      if (newlineIndex >= 0) {
        value += text.slice(0, newlineIndex);
        input.off("data", onData);
        input.pause();
        resolve(value);
        return;
      }

      value += text;
    };

    input.resume();
    input.on("data", onData);
  });
}

async function setEcho(enabled) {
  const mode = enabled ? "echo" : "-echo";
  await execFileAsync("stty", [mode], { stdio: "inherit" });
}

function validateToken(token) {
  if (!token || token.length < 8) {
    throw new Error("SCRAPER_API_TOKEN is missing or too short.");
  }
}
