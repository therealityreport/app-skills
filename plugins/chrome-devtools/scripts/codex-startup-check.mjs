#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const syncScript = join(scriptDir, "sync-install.mjs");

const result = spawnSync(process.execPath, [syncScript, "--startup-check", "--compact"], {
  stdio: "inherit",
  env: { ...process.env, NO_COLOR: "1" }
});

process.exit(result.status ?? 1);
