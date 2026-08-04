import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = path.resolve(TEST_DIR, "..");
const BLOCKED_EXTENSIONS = new Set([".psb", ".psd", ".pat", ".abr", ".atn", ".tpl"]);

function walkFiles(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...walkFiles(fullPath));
    } else if (entry.isFile()) {
      found.push(fullPath);
    }
  }
  return found;
}

test("plugin tree does not contain proprietary Photoshop binary assets", () => {
  const blocked = walkFiles(PLUGIN_ROOT).filter((filePath) =>
    BLOCKED_EXTENSIONS.has(path.extname(filePath).toLowerCase())
  );

  assert.deepEqual(blocked, []);
});
