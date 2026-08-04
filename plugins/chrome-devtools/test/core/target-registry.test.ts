import test from "node:test";
import assert from "node:assert/strict";
import { previewTarget, requireUnambiguousTarget } from "../../src/core/target-registry.js";
import type { TargetRef } from "../../src/core/types.js";

test("target preview removes query strings", () => {
  const preview = previewTarget({
    source: "chrome-plugin",
    scopeStatus: "candidate",
    title: "App",
    url: "http://localhost:3000/dashboard?token=secret",
    profileName: "Codex"
  });
  assert.equal(preview.safeUrl, "http://localhost:3000/dashboard");
});

test("ambiguous targets require explicit selection", () => {
  const targets: TargetRef[] = [
    { source: "chrome-plugin", scopeStatus: "candidate", url: "http://localhost/a" },
    { source: "chrome-plugin", scopeStatus: "candidate", url: "http://localhost/b" }
  ];
  assert.throws(() => requireUnambiguousTarget(targets), /Ambiguous/);
});
