import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function text(relative) {
  return fs.readFile(new URL(relative, root), "utf8");
}

test("UXP companion manifest is a read-only Photoshop panel", async () => {
  const manifest = JSON.parse(await text("uxp-companion/manifest.json"));

  assert.equal(manifest.manifestVersion, 5);
  assert.equal(manifest.host.app, "PS");
  assert.ok(manifest.entrypoints.some((entry) => entry.type === "panel"));
  assert.equal(manifest.requiredPermissions.localFileSystem, "request");
});

test("UXP companion loads binder scripts before main and avoids mutation APIs", async () => {
  const html = await text("uxp-companion/index.html");
  const main = await text("uxp-companion/src/main.js");
  const model = await text("uxp-companion/src/binder/document-model.js");

  assert.ok(html.indexOf("src/state.js") < html.indexOf("src/main.js"));
  assert.ok(html.indexOf("src/binder/layer-shape.js") < html.indexOf("src/main.js"));
  assert.match(model, /activeDocument/);

  const combined = `${main}\n${model}`;
  assert.doesNotMatch(combined, /executeAsModal|batchPlay|save\(|export/i);
});
