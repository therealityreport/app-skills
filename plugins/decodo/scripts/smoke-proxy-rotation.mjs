#!/usr/bin/env node
import { getProxyState, runCurlProxyProbe } from "../tools/decodo-proxy-checks/index.mjs";
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
  name: "smoke-proxy-rotation",
  description: "Dry-runs proxy rotation readiness and optionally probes a target through Decodo proxy credentials.",
  usage: "node scripts/smoke-proxy-rotation.mjs [--dry-run|--live] [--target-url URL] [--max-requests 2]",
  options: [
    "--help              Show this help.",
    "--dry-run           Default. Validate proxy shape only; no network.",
    "--live              Require proxy credentials and run curl through the proxy.",
    "--target-url URL    Live probe target. Defaults to https://example.com/.",
    "--max-requests N    Hard ceiling for live proxy probes. Maximum 3.",
  ],
  examples: [
    "node scripts/smoke-proxy-rotation.mjs --dry-run",
    "Set DECODO_PROXY_URL, then run: node scripts/smoke-proxy-rotation.mjs --live --max-requests 2",
  ],
};

runCli(async () => {
  const args = parseCommonArgs(process.argv.slice(2), {
    defaultDryRun: true,
    defaultMaxRequests: 2,
    hardMaxRequests: 3,
  });

  if (args.help) {
    printHelp(HELP);
    return 0;
  }

  const state = getProxyState(process.env);
  requireCredentials(state, { dryRun: args.dryRun, label: "Decodo proxy" });

  const targetUrl = args.targetUrl || "https://example.com/";
  printSafe(statusLine("Decodo proxy", state));
  printSafe(safeJson({
    dryRun: args.dryRun,
    live: args.live,
    targetUrl,
    maxRequests: args.maxRequests,
    networkSent: false,
  }));

  if (!args.live) {
    return 0;
  }

  const results = await runCurlProxyProbe({
    targetUrl,
    maxRequests: args.maxRequests,
  });

  printSafe(safeJson({ networkSent: true, results }));
  return results.every((result) => result.status === "tested-ok") ? 0 : 1;
});
