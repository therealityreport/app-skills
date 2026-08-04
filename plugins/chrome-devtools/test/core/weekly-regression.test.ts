import test from "node:test";
import assert from "node:assert/strict";
import { runWeeklyRegressionPack } from "../../src/core/weekly-regression.js";
import { assertNoKnownSecrets } from "../../src/core/redaction-policy.js";

test("weekly regression pack emits pass/fail counts and redacted output", () => {
  const report = runWeeklyRegressionPack({ generatedAt: "2026-06-09T13:00:00.000Z" });

  assert.equal(report.schemaVersion, "chrome-devtools.weekly-regression.v1");
  assert.equal(report.dryRun, true);
  assert.equal(report.status, "pass");
  assert.equal(report.counts.fail, 0);
  assert.equal(report.counts.pass, 5);
  assert.deepEqual(
    report.checks.map((check) => check.id),
    [
      "routing.route-ownership",
      "network.har-sse",
      "page-tools.discovery",
      "extension.health",
      "redaction.safety"
    ]
  );
  assert.deepEqual(assertNoKnownSecrets(JSON.stringify(report)), []);
});
