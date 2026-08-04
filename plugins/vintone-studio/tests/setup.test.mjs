import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  checkSetup,
  createConfig,
  detectComputerUseAvailability,
  resolveVintoneAssetPaths,
  resolveExecutionMode
} from "../src/config.mjs";

test("detects Computer Use availability from runtime or environment", () => {
  assert.equal(detectComputerUseAvailability({}, { computerUse: true }), true);
  assert.equal(detectComputerUseAvailability({ VINTONE_COMPUTER_USE_AVAILABLE: "true" }), true);
  assert.equal(detectComputerUseAvailability({ VINTONE_DISABLE_COMPUTER_USE: "true" }), false);
});

test("defaults to computer-use only when it is available", () => {
  assert.equal(resolveExecutionMode({}, { computerUse: true }).mode, "computer-use");
  assert.equal(resolveExecutionMode({}, { computerUse: false }).mode, "manual");
});

test("falls back safely when env disables requested computer-use mode", () => {
  const result = resolveExecutionMode(
    {
      VINTONE_EXECUTION_MODE: "computer-use",
      VINTONE_DISABLE_COMPUTER_USE: "true"
    },
    {}
  );

  assert.equal(result.mode, "manual");
  assert.match(result.warnings[0], /not available/);
});

test("checkSetup reports missing paths without creating or deleting files", () => {
  const config = createConfig({
    env: {
      VINTONE_ASSET_DIR: "/definitely/missing/vintone-assets",
      VINTONE_TEMPLATE_PATH: "/definitely/missing/VINTONE.psb",
      VINTONE_SAMPLE_PATH: "/definitely/missing/VINTONE SAMPLE FILE.psb",
      VINTONE_PATTERNS_PATH: "/definitely/missing/VINTONE_PATTERNS.pat",
      VINTONE_OUTPUT_DIR: "/definitely/missing/VINTONE Outputs"
    },
    runtime: { computerUse: false }
  });
  const setup = checkSetup({ config });

  assert.equal(setup.ok, false);
  assert.equal(setup.nonDestructive, true);
  assert.equal(setup.executionMode, "manual");
  assert.equal(setup.missingPaths.length, 5);
  assert.match(setup.message, /No files were created, copied, or deleted/);
});

test("resolves common licensed VINTONE file names from an asset folder", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "vintone-assets-"));
  fs.writeFileSync(path.join(tempDir, "VINTONE TEMPLATE.psb"), "");
  fs.writeFileSync(path.join(tempDir, "VINTONE SAMPLE FILE.psb"), "");
  fs.writeFileSync(path.join(tempDir, "VINTONE PATTERNS.pat"), "");

  const resolved = resolveVintoneAssetPaths({ env: { VINTONE_ASSET_DIR: tempDir } });

  assert.equal(resolved.templatePath, path.join(tempDir, "VINTONE TEMPLATE.psb"));
  assert.equal(resolved.samplePath, path.join(tempDir, "VINTONE SAMPLE FILE.psb"));
  assert.equal(resolved.patternsPath, path.join(tempDir, "VINTONE PATTERNS.pat"));
  assert.ok(resolved.candidates.template.some((candidate) => candidate.endsWith("VINTONE.psb")));
});
