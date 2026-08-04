#!/usr/bin/env node
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getAuthState } from "../tools/decodo-sdk-runner/index.mjs";
import {
  parseCommonArgs,
  printHelp,
  runCli,
  safeJson,
  statusLine,
} from "../tools/decodo-fixtures/cli.mjs";
import { printSafe } from "../tools/decodo-fixtures/redaction.mjs";

const execFileAsync = promisify(execFile);
const TOKEN_KEYS = ["SCRAPER_API_TOKEN", "DECODO_AUTH_TOKEN", "DECODO_API_TOKEN"];

const HELP = {
  name: "doctor-decodo-connection",
  description: "Checks whether Decodo MCP credentials are visible in shell env and macOS launchctl.",
  usage: "node scripts/doctor-decodo-connection.mjs [--dry-run] [--live]",
  options: [
    "--help       Show this help.",
    "--dry-run    Default. Inspect local env only; no network request is sent.",
    "--live       Require at least one credential source. No scraping request is sent.",
  ],
  examples: [
    "node scripts/doctor-decodo-connection.mjs --dry-run",
    "node scripts/setup-decodo-mcp-token.mjs",
    "node scripts/doctor-decodo-connection.mjs --live",
  ],
};

runCli(async () => {
  const args = parseCommonArgs(process.argv.slice(2), { defaultDryRun: true });

  if (args.help) {
    printHelp(HELP);
    return 0;
  }

  const shellState = getAuthState(process.env);
  const launchctlEnv = await readLaunchctlEnv(TOKEN_KEYS);
  const launchctlState = getAuthState(launchctlEnv);
  const combinedState = combineStates(shellState, launchctlState);

  printSafe(statusLine("Decodo shell env", shellState));
  printSafe(statusLine("Decodo launchctl env", launchctlState));
  printSafe(statusLine("Decodo connection", combinedState));
  printSafe(safeJson({
    dryRun: args.dryRun,
    live: args.live,
    networkSent: false,
    shellEnvPresentKeys: shellState.presentKeys,
    launchctlPresentKeys: launchctlState.presentKeys,
    restartNeeded: launchctlState.presentKeys.length > 0 && shellState.presentKeys.length === 0,
    nextStep: nextStepFor(shellState, launchctlState),
  }));

  if (args.live && combinedState.status === "missing") {
    return 1;
  }

  return combinedState.status === "malformed" && !args.dryRun ? 1 : 0;
});

async function readLaunchctlEnv(keys) {
  const env = {};

  for (const key of keys) {
    const value = await launchctlGetenv(key);
    if (value) {
      env[key] = value;
    }
  }

  return env;
}

async function launchctlGetenv(key) {
  try {
    const result = await execFileAsync("launchctl", ["getenv", key]);
    return result.stdout.trim();
  } catch {
    return "";
  }
}

function combineStates(shellState, launchctlState) {
  if (shellState.status === "malformed" || launchctlState.status === "malformed") {
    return {
      status: "malformed",
      presentKeys: [...new Set([...shellState.presentKeys, ...launchctlState.presentKeys])],
      missingKeys: [],
      details: "at least one visible credential source is malformed",
    };
  }

  const presentKeys = [...new Set([...shellState.presentKeys, ...launchctlState.presentKeys])];
  if (presentKeys.length > 0) {
    return {
      status: "present-untested",
      presentKeys,
      missingKeys: TOKEN_KEYS.filter((key) => !presentKeys.includes(key)),
      details: "credential source found; no request sent",
    };
  }

  return {
    status: "missing",
    presentKeys: [],
    missingKeys: TOKEN_KEYS,
    details: "run setup-decodo-mcp-token, then restart ChatGPT/Codex",
  };
}

function nextStepFor(shellState, launchctlState) {
  if (launchctlState.presentKeys.length > 0 && shellState.presentKeys.length === 0) {
    return "Fully quit and reopen ChatGPT/Codex so it inherits launchctl env.";
  }

  if (shellState.presentKeys.length > 0) {
    return "Run smoke-decodo-mcp --live from this shell, or store the token with setup-decodo-mcp-token for the app.";
  }

  return "Run node scripts/setup-decodo-mcp-token.mjs and paste SCRAPER_API_TOKEN.";
}
