#!/usr/bin/env node
import {
  assertNoForbiddenFragments,
  redact,
  redactionFixtures,
  printSafe,
} from "../tools/decodo-fixtures/redaction.mjs";
import {
  parseCommonArgs,
  printHelp,
  runCli,
  safeJson,
} from "../tools/decodo-fixtures/cli.mjs";

const HELP = {
  name: "redaction-check",
  description: "Runs generated fixture strings through the Decodo redaction helper.",
  usage: "node scripts/redaction-check.mjs [--dry-run]",
  options: [
    "--help       Show this help.",
    "--dry-run    Run the same local redaction assertions; no credentials or network required.",
  ],
  examples: [
    "node scripts/redaction-check.mjs --dry-run",
  ],
};

runCli(async () => {
  const args = parseCommonArgs(process.argv.slice(2), { defaultDryRun: true });

  if (args.help) {
    printHelp(HELP);
    return 0;
  }

  const results = [];
  for (const fixture of redactionFixtures()) {
    const output = redact(fixture.raw);
    assertNoForbiddenFragments(output, fixture.forbidden);
    results.push({ name: fixture.name, status: "redacted" });
  }

  printSafe(safeJson({
    dryRun: args.dryRun,
    networkSent: false,
    cases: results,
  }));

  return 0;
});

