#!/usr/bin/env node
import { cp, mkdir, readFile, rm, symlink } from "node:fs/promises";
import { lstatSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { homedir } from "node:os";
import {
  printHelp,
  runCli,
  safeJson,
} from "../tools/decodo-fixtures/cli.mjs";
import { printSafe } from "../tools/decodo-fixtures/redaction.mjs";

const HELP = {
  name: "reset-decodo-plugin-cache",
  description: "Rebuilds the local Codex cache entry for the Decodo plugin and repoints the local symlink.",
  usage: "node scripts/reset-decodo-plugin-cache.mjs [--apply] [--prune-old]",
  options: [
    "--help       Show this help.",
    "--apply      Write the cache reset. Without this flag, print the planned action only.",
    "--prune-old  Remove older Decodo cache version folders after the new cache is written.",
  ],
  examples: [
    "node scripts/reset-decodo-plugin-cache.mjs",
    "node scripts/reset-decodo-plugin-cache.mjs --apply",
    "node scripts/reset-decodo-plugin-cache.mjs --apply --prune-old",
  ],
};

runCli(async () => {
  const flags = new Set(process.argv.slice(2));

  if (flags.has("--help") || flags.has("-h")) {
    printHelp(HELP);
    return 0;
  }

  const apply = flags.has("--apply");
  const pruneOld = flags.has("--prune-old");
  const pluginRoot = resolve(import.meta.dirname, "..");
  const manifest = JSON.parse(await readFile(resolve(pluginRoot, ".codex-plugin/plugin.json"), "utf8"));
  const cacheRoot = resolve(homedir(), ".codex/plugins/cache/local-plugins/decodo");
  const cacheDir = resolve(cacheRoot, manifest.version);
  const localLink = resolve(cacheRoot, "local");
  const plan = {
    pluginRoot,
    version: manifest.version,
    cacheDir,
    localLink,
    apply,
    pruneOld,
  };

  printSafe(safeJson(plan));

  if (!apply) {
    printSafe("Dry run only. Re-run with --apply to reset the cache.");
    return 0;
  }

  await mkdir(cacheRoot, { recursive: true });
  await rm(cacheDir, { recursive: true, force: true });
  await cp(pluginRoot, cacheDir, {
    recursive: true,
    force: true,
    errorOnExist: false,
    filter: (source) => !source.includes("/.DS_Store"),
  });
  await rm(localLink, { recursive: true, force: true });
  await symlink(cacheDir, localLink, "dir");

  const pruned = pruneOld ? await pruneOldVersions(cacheRoot, manifest.version) : [];
  printSafe(safeJson({
    status: "cache-reset",
    cacheDir,
    localLink,
    pruned,
    nextStep: "Fully quit and reopen ChatGPT/Codex.",
  }));
  return 0;
});

async function pruneOldVersions(cacheRoot, keepVersion) {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(cacheRoot, { withFileTypes: true });
  const pruned = [];

  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) {
      continue;
    }

    const entryPath = resolve(cacheRoot, entry.name);
    if (entry.name === "local" || entry.name === keepVersion) {
      continue;
    }

    if (entry.isDirectory() || isDirectorySymlink(entryPath)) {
      await rm(entryPath, { recursive: true, force: true });
      pruned.push(entry.name);
    }
  }

  return pruned;
}

function isDirectorySymlink(path) {
  try {
    const stat = lstatSync(path);
    return stat.isSymbolicLink() && basename(dirname(path)) === "decodo";
  } catch {
    return false;
  }
}
