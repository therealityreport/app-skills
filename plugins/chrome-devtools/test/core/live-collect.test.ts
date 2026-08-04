import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createLiveCollectPlan, writeLiveCollectDryRunBundle } from "../../src/core/live-collect.js";

test("creates a redaction-first live collect dry-run plan", () => {
  const plan = createLiveCollectPlan({
    routeToken: "rt_example",
    outputRoot: "runs/example",
    evidenceKinds: ["network", "console", "screenshot"],
    dryRun: true
  });

  assert.equal(plan.mode, "dry-run");
  assert.deepEqual(plan.evidenceKinds, ["network", "console", "screenshot"]);
  assert.ok(plan.safety.includes("route-token-required"));
  assert.ok(plan.safety.includes("no-browser-attach-in-dry-run"));
  assert.ok(plan.artifacts.some((artifact) => artifact.kind === "network" && artifact.redaction === "redacted"));
});

test("requires route token for live collect plans", () => {
  assert.throws(() => createLiveCollectPlan({ routeToken: "" }), /routeToken is required/);
});

test("writes dry-run bundle artifacts without attaching to a browser", () => {
  const root = mkdtempSync(join(tmpdir(), "cdt-live-collect-"));
  const plan = createLiveCollectPlan({
    routeToken: "rt_example",
    outputRoot: root,
    evidenceKinds: ["network", "console", "snapshot", "screenshot"],
    dryRun: true
  });

  writeLiveCollectDryRunBundle(plan, new Date("2026-06-19T12:00:00.000Z"));

  assert.equal(existsSync(join(root, "run.json")), true);
  assert.equal(existsSync(join(root, "live-collect-plan.json")), true);
  assert.equal(existsSync(join(root, "api-calls.ndjson")), true);
  const run = JSON.parse(readFileSync(join(root, "run.json"), "utf8")) as { result: { summary: string } };
  assert.match(run.result.summary, /no browser was attached/i);
});
