#!/usr/bin/env node
import { getProxyState } from "../tools/decodo-proxy-checks/index.mjs";
import {
  parseCommonArgs,
  printHelp,
  requireCredentials,
  runCli,
  safeJson,
  statusLine,
} from "../tools/decodo-fixtures/cli.mjs";
import { printSafe } from "../tools/decodo-fixtures/redaction.mjs";

const HELP = {
  name: "doctor-decodo-proxies",
  description: "Checks Decodo proxy configuration shape without printing proxy credentials.",
  usage: "node scripts/doctor-decodo-proxies.mjs [--dry-run] [--live]",
  options: [
    "--help       Show this help.",
    "--dry-run    Report missing/malformed state without failing for missing credentials.",
    "--live       Require proxy credentials; no request is sent by this doctor.",
  ],
  examples: [
    "node scripts/doctor-decodo-proxies.mjs --dry-run",
    "Set DECODO_PROXY_URL, then run: node scripts/doctor-decodo-proxies.mjs --live",
  ],
};

runCli(async () => {
  const args = parseCommonArgs(process.argv.slice(2), { defaultDryRun: false });

  if (args.help) {
    printHelp(HELP);
    return 0;
  }

  const state = getProxyState(process.env);
  requireCredentials(state, { dryRun: args.dryRun, label: "Decodo proxy" });

  printSafe(statusLine("Decodo proxy", state));
  printSafe(safeJson({
    missingKeys: state.missingKeys,
    dryRun: args.dryRun,
    live: args.live,
    networkSent: false,
  }));

  return state.status === "malformed" && !args.dryRun ? 1 : 0;
});
