#!/usr/bin/env node
import { getAuthState } from "../tools/decodo-sdk-runner/index.mjs";
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
  name: "doctor-decodo-auth",
  description: "Checks Decodo auth environment variables without printing secret values.",
  usage: "node scripts/doctor-decodo-auth.mjs [--dry-run] [--live]",
  options: [
    "--help       Show this help.",
    "--dry-run    Report missing/malformed state without failing for missing credentials.",
    "--live       Require credentials and mark them present-but-untested; no request is sent.",
  ],
  examples: [
    "node scripts/doctor-decodo-auth.mjs --dry-run",
    "Set SCRAPER_API_TOKEN, then run: node scripts/doctor-decodo-auth.mjs --live",
  ],
};

runCli(async () => {
  const args = parseCommonArgs(process.argv.slice(2), { defaultDryRun: false });

  if (args.help) {
    printHelp(HELP);
    return 0;
  }

  const state = getAuthState(process.env);
  requireCredentials(state, { dryRun: args.dryRun, label: "Decodo auth" });

  printSafe(statusLine("Decodo auth", state));
  printSafe(safeJson({
    checkedKeys: state.presentKeys.length > 0 ? state.presentKeys : state.missingKeys,
    dryRun: args.dryRun,
    live: args.live,
    networkSent: false,
  }));

  return state.status === "malformed" && !args.dryRun ? 1 : 0;
});
