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
import { getProxyUrlState } from "../tools/decodo-proxy-checks/index.mjs";

const execFileAsync = promisify(execFile);
const PROXY_KEY = "DECODO_PROXY_URL";

const HELP = {
  name: "setup-decodo-proxy-launchctl",
  description: "Stores Decodo proxy credentials in macOS launchctl without writing them to plugin files.",
  usage: "node scripts/setup-decodo-proxy-launchctl.mjs [--stdin|--clear|--status]",
  options: [
    "--help     Show this help.",
    "--stdin    Read DECODO_PROXY_URL from stdin instead of prompting.",
    "--clear    Remove DECODO_PROXY_URL from launchctl.",
    "--status   Report whether DECODO_PROXY_URL is present in launchctl and shell env.",
  ],
  examples: [
    "node scripts/setup-decodo-proxy-launchctl.mjs",
    "printf '%s' \"$DECODO_PROXY_URL\" | node scripts/setup-decodo-proxy-launchctl.mjs --stdin",
    "node scripts/setup-decodo-proxy-launchctl.mjs --clear",
  ],
};

runCli(async () => {
  const flags = new Set(process.argv.slice(2));

  if (flags.has("--help") || flags.has("-h")) {
    printHelp(HELP);
    return 0;
  }

  if (flags.has("--status")) {
    const launchctlPresent = await hasLaunchctlProxy();
    printSafe(safeJson({
      envVar: PROXY_KEY,
      shellEnvPresent: Boolean(process.env[PROXY_KEY]),
      launchctlPresent,
      proxyPrinted: false,
    }));
    return 0;
  }

  if (flags.has("--clear")) {
    await execFileAsync("launchctl", ["unsetenv", PROXY_KEY]);
    printSafe(`${PROXY_KEY} removed from launchctl. Restart ChatGPT/Codex before proxy checks.`);
    return 0;
  }

  const proxyUrl = flags.has("--stdin") ? await readProxyFromStdin() : await promptHiddenProxy();
  validateProxyUrl(proxyUrl);

  await execFileAsync("launchctl", ["setenv", PROXY_KEY, proxyUrl]);
  printSafe(`${PROXY_KEY} stored in launchctl for future ChatGPT/Codex launches.`);
  printSafe("Restart ChatGPT/Codex before running proxy checks from the app.");
  return 0;
});

async function hasLaunchctlProxy() {
  try {
    const result = await execFileAsync("launchctl", ["getenv", PROXY_KEY]);
    return result.stdout.trim().length > 0;
  } catch {
    return false;
  }
}

async function readProxyFromStdin() {
  const chunks = [];
  for await (const chunk of input) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8").trim();
}

async function promptHiddenProxy() {
  if (!input.isTTY || !output.isTTY) {
    throw new Error("No TTY available. Pipe DECODO_PROXY_URL with --stdin.");
  }

  output.write("Paste Decodo proxy URL: ");
  await setEcho(false);

  try {
    const proxyUrl = await readLineFromTty();
    output.write("\n");
    return proxyUrl.trim();
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

function validateProxyUrl(proxyUrl) {
  const state = getProxyUrlState(proxyUrl);
  if (state.status !== "present-untested") {
    throw new Error(`DECODO_PROXY_URL is invalid: ${state.details}`);
  }
}
