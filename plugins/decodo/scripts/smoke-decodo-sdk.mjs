#!/usr/bin/env node
import { buildSdkSmokePlan, checkSdkImport, getAuthState } from "../tools/decodo-sdk-runner/index.mjs";
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
  name: "smoke-decodo-sdk",
  description: "Dry-runs Decodo SDK readiness and optionally checks that the SDK package imports.",
  usage: "node scripts/smoke-decodo-sdk.mjs [--dry-run|--live] [--package @decodo/sdk-ts] [--max-requests 1]",
  options: [
    "--help              Show this help.",
    "--dry-run           Default. Build a smoke plan only; no package import and no network.",
    "--live              Require auth and import the SDK package. No scraping request is sent.",
    "--package NAME      SDK package name to import in live mode.",
    "--max-requests N    Hard ceiling for future live SDK requests. This wrapper never exceeds 1.",
  ],
  examples: [
    "node scripts/smoke-decodo-sdk.mjs --dry-run",
    "Set SCRAPER_API_TOKEN, then run: node scripts/smoke-decodo-sdk.mjs --live --package @decodo/sdk-ts",
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

  const packageName = args.packageName || process.env.DECODO_SDK_PACKAGE || "@decodo/sdk-ts";
  const authState = getAuthState(process.env);
  requireCredentials(authState, { dryRun: args.dryRun, label: "Decodo SDK auth" });

  printSafe(statusLine("Decodo SDK auth", authState));
  printSafe(safeJson(buildSdkSmokePlan({
    live: args.live,
    maxRequests: args.maxRequests,
    packageName,
  })));

  if (!args.live) {
    return 0;
  }

  const importState = await checkSdkImport(packageName);
  printSafe(statusLine("Decodo SDK import", importState));
  printSafe(safeJson(importState));
  return importState.status === "missing" || importState.status === "malformed" ? 1 : 0;
});
