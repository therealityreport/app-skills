import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const syncScript = join(pluginRoot, "scripts/sync-install.mjs");

test("startup verification ignores generated routes and repair preserves them", () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "chrome-devtools-sync-"));

  try {
    const home = join(fixtureRoot, "home");
    const installed = join(fixtureRoot, "codex-installed");
    const cacheVersion = join(fixtureRoot, "codex-cache-version");
    const marketplaceSource = join(fixtureRoot, "agents-marketplace-source");
    const marketplace = join(fixtureRoot, "marketplace.json");
    const config = join(fixtureRoot, "config.toml");
    const scopeManifest = join(fixtureRoot, "local-plugins-scope.json");
    const liveMirror = join(fixtureRoot, "live-marketplace");
    const activePlugin = join(fixtureRoot, "active-plugin");
    const cacheLocalPointer = join(fixtureRoot, "cache-local-pointer");
    const globalHealthRoot = join(fixtureRoot, "empty-global-health-root");
    const livePlugin = join(liveMirror, "plugins", "chrome-devtools");
    const liveMarketplace = join(liveMirror, "marketplace.json");
    const liveNestedMarketplace = join(liveMirror, ".agents", "plugins", "marketplace.json");

    mkdirSync(home, { recursive: true });
    mkdirSync(globalHealthRoot, { recursive: true });
    writeFileSync(config, '[plugins."chrome-devtools@local-plugins"]\nenabled = true\n');
    writeJson(scopeManifest, {
      plugins: [
        {
          name: "chrome-devtools",
          canonical_source: "local-plugins:chrome-devtools",
          shared_local_marketplace: true,
          codex_default_enabled: true
        }
      ]
    });

    const env = {
      ...process.env,
      HOME: home,
      CODEX_PLUGIN_INSTALL_DIR: installed,
      CODEX_PLUGIN_CACHE_DIR: cacheVersion,
      AGENTS_PLUGIN_SOURCE_DIR: marketplaceSource,
      AGENTS_MARKETPLACE_JSON: marketplace,
      CODEX_CONFIG_TOML: config,
      LOCAL_PLUGINS_SCOPE_JSON: scopeManifest,
      CODEX_LIVE_LOCAL_MARKETPLACE_DIR: liveMirror,
      CODEX_ACTIVE_PLUGIN_DIR: activePlugin,
      CODEX_PLUGIN_CACHE_LOCAL_DIR: cacheLocalPointer,
      CODEX_GLOBAL_PLUGIN_HEALTH_ROOTS: globalHealthRoot
    };

    runSync(["--skip-build"], env);
    cpSync(installed, activePlugin, { recursive: true });
    cpSync(installed, livePlugin, { recursive: true });
    mkdirSync(cacheLocalPointer, { recursive: true });

    const marketplaceValue = {
      plugins: [
        {
          name: "chrome-devtools",
          source: { source: "local", path: "./plugins/chrome-devtools" }
        }
      ]
    };
    writeJson(liveMarketplace, marketplaceValue);
    writeJson(liveNestedMarketplace, marketplaceValue);

    const installedRoutes = join(installed, ".chrome-devtools", "routes.json");
    const cachedRoutes = join(cacheVersion, ".chrome-devtools", "routes.json");
    writeJson(installedRoutes, { generated: "installed" });
    writeJson(cachedRoutes, { generated: "cache" });

    const startupBefore = runSync(["--startup-check", "--compact"], env);
    assert.match(startupBefore.stdout, /startup-check: PASS \(15\/15 checks\)/);

    const driftFile = join(installed, "unexpected-drift.txt");
    const cacheDriftFile = join(cacheVersion, "unexpected-cache-drift.txt");
    writeFileSync(driftFile, "force a destination repair\n");
    writeFileSync(cacheDriftFile, "force a cache destination repair\n");
    const repair = runSync(["--repair", "--compact"], env);
    assert.match(repair.stdout, /repair-codex-installed/);
    assert.match(repair.stdout, /repair-codex-cache-version/);
    assert.equal(existsSync(driftFile), false);
    assert.equal(existsSync(cacheDriftFile), false);
    assert.deepEqual(JSON.parse(readFileSync(installedRoutes, "utf8")), { generated: "installed" });
    assert.deepEqual(JSON.parse(readFileSync(cachedRoutes, "utf8")), { generated: "cache" });

    const startupAfter = runSync(["--startup-check", "--compact"], env);
    assert.match(startupAfter.stdout, /startup-check: PASS \(15\/15 checks\)/);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function runSync(args: string[], env: NodeJS.ProcessEnv) {
  const result = spawnSync(process.execPath, [syncScript, ...args], {
    cwd: pluginRoot,
    env,
    encoding: "utf8"
  });
  assert.equal(
    result.status,
    0,
    `sync command failed: node ${syncScript} ${args.join(" ")}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
  return result;
}
