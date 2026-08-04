/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from "node:fs";

function parseSnapshot(filePath) {
  console.error(`Loading ${filePath}...`);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const strings = data.strings;
  const nodes = data.nodes;
  const fields = data.snapshot.meta.node_fields;
  const fieldCount = fields.length;
  const typeOffset = fields.indexOf("type");
  const nameOffset = fields.indexOf("name");
  const sizeOffset = fields.indexOf("self_size");
  const nodeTypes = data.snapshot.meta.node_types[typeOffset];
  const counts = {};
  const sizes = {};

  for (let i = 0; i < nodes.length; i += fieldCount) {
    const typeName = nodeTypes[nodes[i + typeOffset]];
    if (["string", "number", "array"].includes(typeName)) continue;
    const rawName = nodes[i + nameOffset];
    const name = typeof rawName === "number" ? strings[rawName] : rawName;
    const key = `${typeName}::${name}`;
    counts[key] = (counts[key] || 0) + 1;
    sizes[key] = (sizes[key] || 0) + nodes[i + sizeOffset];
  }
  return { counts, sizes };
}

const [, , baselinePath, targetPath] = process.argv;
if (!baselinePath || !targetPath) {
  console.error("Usage: node compare_snapshots.js <baseline.heapsnapshot> <target.heapsnapshot>");
  process.exit(1);
}

const baseline = parseSnapshot(baselinePath);
const target = parseSnapshot(targetPath);
const diffs = Object.keys(target.counts)
  .map((key) => ({
    key,
    countDiff: target.counts[key] - (baseline.counts[key] || 0),
    sizeDiff: target.sizes[key] - (baseline.sizes[key] || 0)
  }))
  .filter((entry) => entry.countDiff > 0)
  .sort((a, b) => b.sizeDiff - a.sizeDiff);

console.log("\n--- Top 10 growing objects by size ---");
for (const diff of diffs.slice(0, 10)) {
  console.log(`${diff.key}: +${diff.countDiff} objects, +${diff.sizeDiff} bytes`);
}

console.log("\n--- Common leak indicators ---");
const common = diffs.filter((diff) => /detached|html|eventlistener|context|closure/i.test(diff.key));
if (common.length === 0) {
  console.log("No common DOM or closure leak indicators detected.");
} else {
  for (const diff of common.slice(0, 5)) {
    console.log(`${diff.key}: +${diff.countDiff} objects, +${diff.sizeDiff} bytes`);
  }
}
