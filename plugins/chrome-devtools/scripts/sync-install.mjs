#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const pluginRoot = resolve(dirname(scriptPath), "..");
const packageJson = JSON.parse(readFileSync(join(pluginRoot, "package.json"), "utf8"));
const pluginName = packageJson.name;
const pluginVersion = packageJson.version;
const home = process.env.HOME;
const generatedStateRelativePaths = new Set([".chrome-devtools/routes.json"]);

if (!home) throw new Error("HOME is required for install/cache sync.");

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const dryRun = args.has("--dry-run");
const verifyOnly = args.has("--verify");
const startupCheck = args.has("--startup-check") || args.has("--check-startup");
const inventorySmoke = args.has("--inventory-smoke") || args.has("--smoke-inventory");
const repair = args.has("--repair");
const globalPluginHealth = args.has("--global-plugin-health") || args.has("--plugin-health");
const repairPromptLimits = args.has("--repair-prompt-limits") || args.has("--repair-prompts");
const repairRuntimeCache = args.has("--repair-runtime-cache");
const rollback = args.has("--rollback");
const rollbackHistory = args.has("--rollback-history");
const removeCopies = args.has("--remove-copies");
const enableConfig = args.has("--enable-config");
const skipMarketplace = args.has("--skip-marketplace");
const syncScope = args.has("--sync-scope");
const skipScopeSync = args.has("--skip-scope-sync");
const outputFormat = args.has("--compact") ? "compact" : argValue("--format") ?? "json";
const compactOutput = ["compact", "human", "text"].includes(outputFormat);
const smokeOnly = inventorySmoke && !enableConfig && !syncScope;
const checkOnly =
  dryRun ||
  verifyOnly ||
  startupCheck ||
  smokeOnly ||
  globalPluginHealth ||
  repairPromptLimits ||
  repairRuntimeCache ||
  rollback ||
  rollbackHistory;
const skipBuild = args.has("--skip-build") || checkOnly;
const includeGlobalDiagnostics = startupCheck || repair || args.has("--include-global-plugin-health");

const destinations = [
  {
    label: "codex-installed",
    path: resolve(process.env.CODEX_PLUGIN_INSTALL_DIR ?? join(home, ".codex/plugins", pluginName))
  },
  {
    label: "codex-cache-version",
    path: resolve(process.env.CODEX_PLUGIN_CACHE_DIR ?? join(home, ".codex/plugins/cache/local-plugins", pluginName, pluginVersion))
  }
];

if (!skipMarketplace) {
  destinations.push({
    label: "agents-marketplace-source",
    path: resolve(process.env.AGENTS_PLUGIN_SOURCE_DIR ?? join(home, ".agents/plugins/plugins", pluginName))
  });
}

const marketplacePath = resolve(process.env.AGENTS_MARKETPLACE_JSON ?? join(home, ".agents/plugins/marketplace.json"));
const codexConfigPath = resolve(process.env.CODEX_CONFIG_TOML ?? join(home, ".codex/config.toml"));
const scopeManifestPath = resolve(
  process.env.LOCAL_PLUGINS_SCOPE_JSON ?? join(home, "plugins/superpowers-marketplace/scripts/local-plugins-scope.json")
);
const scopeSyncScriptPath = resolve(
  process.env.LOCAL_PLUGINS_SCOPE_SYNC_SCRIPT ?? join(home, "plugins/superpowers-marketplace/scripts/sync-local-plugins-scope.js")
);
const liveMirrorRoot = resolve(process.env.CODEX_LIVE_LOCAL_MARKETPLACE_DIR ?? join(home, ".codex/.tmp/marketplaces/local-plugins"));
const liveMirrorTopMarketplacePath = join(liveMirrorRoot, "marketplace.json");
const liveMirrorNestedMarketplacePath = join(liveMirrorRoot, ".agents/plugins/marketplace.json");
const liveMirrorPluginPath = join(liveMirrorRoot, "plugins", pluginName);
const activeCodexPluginPath = resolve(process.env.CODEX_ACTIVE_PLUGIN_DIR ?? join(home, ".codex/.tmp/plugins/plugins", pluginName));
const cacheLocalPointerPath = resolve(
  process.env.CODEX_PLUGIN_CACHE_LOCAL_DIR ?? join(home, ".codex/plugins/cache/local-plugins", pluginName, "local")
);
const codexDescriptorPath = join(pluginRoot, ".codex-plugin/plugin.json");

main();

function main() {
  if (rollbackHistory) {
    printRollbackHistory();
    return;
  }

  if (rollback) {
    rollbackInstallState();
    return;
  }

  if (!skipBuild) run("npm", ["run", "build"], pluginRoot);

  if (globalPluginHealth) {
    const health = buildGlobalPluginHealth();
    printGlobalPluginHealth(health);
    if (!health.ok) process.exitCode = 1;
    return;
  }

  if (repairPromptLimits || repairRuntimeCache) {
    const result = repairGlobalPromptLimits({ runtimeOnly: repairRuntimeCache });
    printPromptRepairResult(result);
    if (!result.after.ok) process.exitCode = 1;
    return;
  }

  if (repair) {
    repairInstallState();
    return;
  }

  if (dryRun) {
    printValue({
      status: "dry-run",
      source: pluginRoot,
      pluginName,
      pluginVersion,
      destinations,
      marketplace: skipMarketplace ? "skipped" : marketplacePath,
      configEnable: enableConfig ? codexConfigPath : "skipped",
      scopeAutomation: syncScope ? scopeManifestPath : "skipped",
      inventorySmoke: inventorySmoke ? "enabled" : "skipped"
    });
    return;
  }

  if (verifyOnly || startupCheck || smokeOnly) {
    const status = verifyOnly ? "verify" : startupCheck ? "startup-check" : "inventory-smoke";
    printAndSetExitForState(status);
    return;
  }

  for (const destination of destinations) syncDirectory(pluginRoot, destination.path);
  if (!skipMarketplace) ensureMarketplaceEntry(marketplacePath);
  if (enableConfig) ensureCodexConfigEnabled(codexConfigPath);

  const scopeResult = syncScope ? ensureMarketplaceScope() : { skipped: true };
  if (syncScope && !skipScopeSync) runScopeSync();

  const state = buildInstallState("synced");
  printValue({
    status: "synced",
    source: pluginRoot,
    pluginName,
    pluginVersion,
    destinations,
    marketplace: skipMarketplace ? "skipped" : marketplacePath,
    configEnabled: enableConfig ? codexConfigPath : "skipped",
    scopeAutomation: scopeResult,
    inventory: state
  });
  if (inventorySmoke && !state.ok) process.exitCode = 1;
}

function printAndSetExitForState(status) {
  const state = buildInstallState(status);
  printState(state);
  if (!state.ok) process.exitCode = 1;
}

function run(command, commandArgs, cwd) {
  const result = spawnSync(command, commandArgs, { cwd, stdio: "inherit", env: { ...process.env, NO_COLOR: "1" } });
  if (result.status !== 0) {
    throw new Error(`${command} ${commandArgs.join(" ")} failed with status ${result.status ?? "unknown"}`);
  }
}

function syncDirectory(source, destination) {
  const parent = dirname(destination);
  mkdirSync(parent, { recursive: true });
  const stage = join(parent, `.${basename(destination)}.sync-${process.pid}-${Date.now()}`);
  rmSync(stage, { recursive: true, force: true });
  copyTree(source, stage);
  preserveGeneratedState(destination, stage);
  rmSync(destination, { recursive: true, force: true });
  renameOrCopy(stage, destination);
}

function preserveGeneratedState(source, destination) {
  if (!existsSync(source)) return;
  for (const relativePath of generatedStateRelativePaths) {
    const sourcePath = join(source, ...relativePath.split("/"));
    if (!existsSync(sourcePath) || !statSync(sourcePath).isFile()) continue;
    const destinationPath = join(destination, ...relativePath.split("/"));
    mkdirSync(dirname(destinationPath), { recursive: true });
    copyFileSync(sourcePath, destinationPath);
    chmodSync(destinationPath, statSync(sourcePath).mode);
  }
}

function renameOrCopy(source, destination) {
  try {
    mkdirSync(dirname(destination), { recursive: true });
    rmSync(destination, { recursive: true, force: true });
    renameSync(source, destination);
  } catch {
    copyTree(source, destination);
    rmSync(source, { recursive: true, force: true });
  }
}

function copyTree(source, destination) {
  const sourceStat = statSync(source);
  if (sourceStat.isDirectory()) {
    mkdirSync(destination, { recursive: true });
    for (const entry of readdirSync(source)) {
      if (shouldExclude(join(source, entry), pluginRoot)) continue;
      copyTree(join(source, entry), join(destination, entry));
    }
    return;
  }
  if (sourceStat.isFile()) {
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(source, destination);
    chmodSync(destination, sourceStat.mode);
  }
}

function shouldExclude(path, root = pluginRoot) {
  const rel = relative(root, path);
  const normalizedRel = rel.split(/[\\/]/).join("/");
  if (generatedStateRelativePaths.has(normalizedRel)) return true;
  const parts = rel.split(/[\\/]/);
  return parts.some((part) =>
    [
      "node_modules",
      ".git",
      ".DS_Store",
      ".debug-runs",
      "coverage",
      ".cache",
      ".tmp"
    ].includes(part)
  );
}

function treesMatch(source, destination) {
  if (!existsSync(destination)) return false;
  const sourceFiles = listFiles(source);
  const destinationFiles = listFiles(destination);
  if (sourceFiles.length !== destinationFiles.length) return false;
  const destinationSet = new Set(destinationFiles);
  for (const file of sourceFiles) {
    if (!destinationSet.has(file)) return false;
    if (fileHash(join(source, file)) !== fileHash(join(destination, file))) return false;
  }
  return true;
}

function listFiles(root) {
  const files = [];
  visit(root, "");
  return files.sort();

  function visit(abs, rel) {
    if (shouldExclude(abs, root)) return;
    const info = statSync(abs);
    if (info.isDirectory()) {
      for (const entry of readdirSync(abs)) visit(join(abs, entry), rel ? join(rel, entry) : entry);
      return;
    }
    if (info.isFile()) files.push(rel);
  }
}

function fileHash(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function marketplaceHasPlugin(path) {
  const marketplace = readJson(path);
  return Array.isArray(marketplace?.plugins) && marketplace.plugins.some((plugin) => plugin?.name === pluginName);
}

function marketplacePluginPath(path) {
  const marketplace = readJson(path);
  const plugin = Array.isArray(marketplace?.plugins) ? marketplace.plugins.find((entry) => entry?.name === pluginName) : null;
  return plugin?.source?.path ?? null;
}

function ensureMarketplaceEntry(path) {
  const marketplace = readJson(path, {
    name: "local-plugins",
    interface: {
      displayName: "Local Plugins"
    },
    plugins: []
  });
  marketplace.plugins = Array.isArray(marketplace.plugins) ? marketplace.plugins : [];
  const existing = marketplace.plugins.find((plugin) => plugin?.name === pluginName);
  const entry = {
    name: pluginName,
    source: {
      source: "local",
      path: `./plugins/${pluginName}`
    },
    policy: {
      installation: "AVAILABLE",
      authentication: "ON_INSTALL"
    },
    category: "Coding"
  };
  const before = JSON.stringify(marketplace);
  if (existing) Object.assign(existing, entry);
  else marketplace.plugins.push(entry);
  if (JSON.stringify(marketplace) === before) return { changed: false };
  const backupPath = backup(path);
  writeJson(path, marketplace);
  return { changed: true, backup: backupPath };
}

function configHasEnabledPlugin(path) {
  if (!existsSync(path)) return false;
  const text = readFileSync(path, "utf8");
  const header = `[plugins."${pluginName}@local-plugins"]`;
  const index = text.indexOf(header);
  if (index < 0) return false;
  const nextHeader = text.indexOf("\n[", index + header.length);
  const block = text.slice(index, nextHeader < 0 ? undefined : nextHeader);
  return /enabled\s*=\s*true/.test(block);
}

function ensureCodexConfigEnabled(path) {
  if (!existsSync(path) || configHasEnabledPlugin(path)) return { changed: false };
  const text = readFileSync(path, "utf8");
  const header = `[plugins."${pluginName}@local-plugins"]`;
  const backupPath = backup(path);
  if (text.includes(header)) {
    writeFileSync(
      path,
      text.replace(
        new RegExp(`(\\[plugins\\."${escapeRegex(pluginName)}@local-plugins"\\][\\s\\S]*?enabled\\s*=\\s*)false`),
        "$1true"
      )
    );
    return { changed: true, backup: backupPath };
  }
  const prefix = text.endsWith("\n") ? text : `${text}\n`;
  writeFileSync(path, `${prefix}\n${header}\nenabled = true\n`);
  return { changed: true, backup: backupPath };
}

function ensureMarketplaceScope() {
  if (!existsSync(scopeManifestPath)) {
    throw new Error(`Missing local plugin scope manifest: ${scopeManifestPath}`);
  }

  const manifest = readJson(scopeManifestPath);
  if (!manifest || !Array.isArray(manifest.plugins)) {
    throw new Error(`Invalid local plugin scope manifest: ${scopeManifestPath}`);
  }

  const desired = {
    name: pluginName,
    scope: "user-level",
    category: "Coding",
    canonical_source: `local-plugins:${pluginName}`,
    shared_local_marketplace: true,
    codex_default_enabled: true,
    codex_remove_ids: [`${pluginName}@local-plugins`],
    claude_remove_ids: []
  };

  const index = manifest.plugins.findIndex((plugin) => plugin?.name === pluginName);
  const before = JSON.stringify(manifest);
  if (index >= 0) {
    manifest.plugins[index] = { ...manifest.plugins[index], ...desired };
  } else {
    manifest.plugins.push(desired);
  }

  if (JSON.stringify(manifest) === before) {
    return { path: scopeManifestPath, changed: false };
  }

  const backupPath = backup(scopeManifestPath);
  writeJson(scopeManifestPath, manifest);
  return { path: scopeManifestPath, changed: true, backup: backupPath };
}

function runScopeSync() {
  if (!existsSync(scopeSyncScriptPath)) {
    throw new Error(`Missing local plugin scope sync script: ${scopeSyncScriptPath}`);
  }
  run("node", [scopeSyncScriptPath], dirname(scopeSyncScriptPath));
}

function buildInstallState(status) {
  const checks = [];
  addCheck(checks, "codex-descriptor", existsSync(codexDescriptorPath), {
    path: codexDescriptorPath,
    version: readCodexDescriptorVersion()
  });

  for (const destination of destinations) {
    addCheck(checks, `${destination.label}-matches-source`, treesMatch(pluginRoot, destination.path), {
      path: destination.path
    });
  }

  if (!skipMarketplace) {
    addCheck(checks, "shared-marketplace-entry", marketplaceHasPlugin(marketplacePath), {
      path: marketplacePath,
      sourcePath: marketplacePluginPath(marketplacePath)
    });
  }

  addCheck(checks, "codex-config-enabled", configHasEnabledPlugin(codexConfigPath), {
    path: codexConfigPath
  });
  addCheck(checks, "scope-manifest-entry", scopeManifestHasPlugin(), {
    path: scopeManifestPath
  });
  addCheck(checks, "cache-local-pointer", pointerExists(cacheLocalPointerPath), {
    path: cacheLocalPointerPath,
    target: pointerTarget(cacheLocalPointerPath)
  });
  addCheck(checks, "active-plugin-projection", treesMatch(pluginRoot, activeCodexPluginPath), {
    path: activeCodexPluginPath
  });
  addCheck(checks, "live-marketplace-entry", marketplaceHasPlugin(liveMirrorTopMarketplacePath), {
    path: liveMirrorTopMarketplacePath,
    sourcePath: marketplacePluginPath(liveMirrorTopMarketplacePath)
  });
  addCheck(checks, "live-nested-marketplace-entry", marketplaceHasPlugin(liveMirrorNestedMarketplacePath), {
    path: liveMirrorNestedMarketplacePath,
    sourcePath: marketplacePluginPath(liveMirrorNestedMarketplacePath)
  });
  addCheck(checks, "live-marketplace-plugin-source", treesMatch(pluginRoot, liveMirrorPluginPath), {
    path: liveMirrorPluginPath
  });

  const globalHealth = includeGlobalDiagnostics ? buildGlobalPluginHealth() : null;
  if (globalHealth) {
    addCheck(checks, "global-plugin-prompt-limits", globalHealth.promptSchema.ok, {
      scanned: globalHealth.scanned,
      violations: globalHealth.promptSchema.violations.length,
      examples: globalHealth.promptSchema.violations.slice(0, 5)
    });
    addCheck(checks, "runtime-cache-prompt-drift", globalHealth.runtimeCache.ok, {
      scanned: globalHealth.runtimeCache.scanned,
      violations: globalHealth.runtimeCache.violations.length,
      examples: globalHealth.runtimeCache.violations.slice(0, 5)
    });
    addCheck(checks, "plugins-ui-stuck-state", globalHealth.pluginsUi.ok, globalHealth.pluginsUi);
  }

  return {
    status,
    ok: checks.every((check) => check.ok),
    source: pluginRoot,
    pluginName,
    pluginVersion,
    paths: {
      marketplace: marketplacePath,
      codexConfig: codexConfigPath,
      scopeManifest: scopeManifestPath,
      activeProjection: activeCodexPluginPath,
      liveMarketplace: liveMirrorTopMarketplacePath,
      liveNestedMarketplace: liveMirrorNestedMarketplacePath,
      livePluginSource: liveMirrorPluginPath,
      cacheLocalPointer: cacheLocalPointerPath
    },
    globalPluginHealth: globalHealth,
    checks
  };
}

function addCheck(checks, id, ok, details = {}) {
  checks.push({ id, ok: Boolean(ok), ...details });
}

function readCodexDescriptorVersion() {
  const descriptor = readJson(codexDescriptorPath);
  return descriptor?.version ?? null;
}

function scopeManifestHasPlugin() {
  const manifest = readJson(scopeManifestPath);
  const plugin = Array.isArray(manifest?.plugins) ? manifest.plugins.find((entry) => entry?.name === pluginName) : null;
  return (
    plugin?.canonical_source === `local-plugins:${pluginName}` &&
    plugin?.shared_local_marketplace === true &&
    plugin?.codex_default_enabled === true
  );
}

function pointerExists(path) {
  return existsSync(path);
}

function pointerTarget(path) {
  if (!existsSync(path)) return null;
  try {
    return readlinkSync(path);
  } catch {
    return null;
  }
}

function rollbackInstallState() {
  const targets = [marketplacePath, codexConfigPath, scopeManifestPath];
  if (dryRun) {
    printValue({
      status: "rollback-dry-run",
      backups: targets.map((path) => ({ path, backup: latestBackupPath(path) })),
      removeCopies: removeCopies ? removeInstallCopyPaths().filter((path) => existsSync(path)) : "skipped",
      scopeSync: skipScopeSync ? "skipped" : scopeSyncScriptPath
    });
    return;
  }

  const restored = targets.map((path) => restoreLatestBackup(path)).filter(Boolean);
  const removed = removeCopies ? removeInstallCopies() : [];

  if (!skipScopeSync && existsSync(scopeSyncScriptPath)) runScopeSync();

  printValue({
    status: "rolled-back",
    restored,
    removed,
    scopeSync: skipScopeSync ? "skipped" : scopeSyncScriptPath
  });
}

function restoreLatestBackup(path) {
  const latest = latestBackupPath(path);
  if (!latest) return null;
  mkdirSync(dirname(path), { recursive: true });
  copyFileSync(latest, path);
  return { path, backup: latest };
}

function repairInstallState() {
  const before = buildInstallState(dryRun ? "repair-dry-run-before" : "repair-before");
  const plan = buildRepairPlan(before);

  if (dryRun) {
    printRepairResult({
      status: "repair-dry-run",
      before,
      actions: plan.map(({ id, detail }) => ({ id, detail })),
      after: null
    });
    if (!before.ok) process.exitCode = 1;
    return;
  }

  for (const action of plan) action.run();
  const after = buildInstallState("repair");
  printRepairResult({
    status: "repair",
    before,
    actions: plan.map(({ id, detail }) => ({ id, detail })),
    after
  });
  if (!after.ok) process.exitCode = 1;
}

function buildRepairPlan(state) {
  const failed = new Set(state.checks.filter((check) => !check.ok).map((check) => check.id));
  const actions = [];

  addDestinationRepair("codex-installed-matches-source", "codex-installed");
  addDestinationRepair("codex-cache-version-matches-source", "codex-cache-version");
  addDestinationRepair("agents-marketplace-source-matches-source", "agents-marketplace-source");

  if (failed.has("shared-marketplace-entry")) {
    actions.push({
      id: "repair-shared-marketplace-entry",
      detail: marketplacePath,
      run: () => ensureMarketplaceEntry(marketplacePath)
    });
  }

  if (failed.has("codex-config-enabled")) {
    actions.push({
      id: "repair-codex-config-enabled",
      detail: codexConfigPath,
      run: () => ensureCodexConfigEnabled(codexConfigPath)
    });
  }

  const projectionFailures = [
    "scope-manifest-entry",
    "cache-local-pointer",
    "active-plugin-projection",
    "live-marketplace-entry",
    "live-nested-marketplace-entry",
    "live-marketplace-plugin-source"
  ];
  if (projectionFailures.some((id) => failed.has(id))) {
    actions.push({
      id: "repair-local-plugin-scope-projections",
      detail: scopeManifestPath,
      run: () => {
        ensureMarketplaceScope();
        if (!skipScopeSync) runScopeSync();
      }
    });
  }

  const promptFailures = [
    "global-plugin-prompt-limits",
    "runtime-cache-prompt-drift",
    "plugins-ui-stuck-state"
  ];
  if (promptFailures.some((id) => failed.has(id))) {
    actions.push({
      id: "repair-global-plugin-prompt-limits",
      detail: "all discovered plugin manifests",
      run: () => repairGlobalPromptLimits({ quiet: true })
    });
  }

  return actions;

  function addDestinationRepair(checkId, label) {
    if (!failed.has(checkId)) return;
    const destination = destinations.find((entry) => entry.label === label);
    if (!destination) return;
    actions.push({
      id: `repair-${label}`,
      detail: destination.path,
      run: () => syncDirectory(pluginRoot, destination.path)
    });
  }
}

function printRollbackHistory() {
  const history = [marketplacePath, codexConfigPath, scopeManifestPath].map((path) => ({
    path,
    backups: backupHistory(path)
  }));
  printValue({
    status: "rollback-history",
    pluginName,
    history
  });
}

function latestBackupPath(path) {
  const dir = dirname(path);
  const prefix = `${basename(path)}.bak-${pluginName}-`;
  if (!existsSync(dir)) return null;
  const backups = readdirSync(dir)
    .filter((entry) => entry.startsWith(prefix))
    .map((entry) => join(dir, entry))
    .sort();
  return backups[backups.length - 1] ?? null;
}

function backupHistory(path) {
  const dir = dirname(path);
  const prefix = `${basename(path)}.bak-${pluginName}-`;
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((entry) => entry.startsWith(prefix))
    .map((entry) => join(dir, entry))
    .sort()
    .reverse();
}

function removeInstallCopies() {
  const paths = removeInstallCopyPaths();
  const removed = [];
  for (const path of paths) {
    if (!existsSync(path)) continue;
    rmSync(path, { recursive: true, force: true });
    removed.push(path);
  }
  return removed;
}

function removeInstallCopyPaths() {
  return [
    ...destinations.map((destination) => destination.path),
    cacheLocalPointerPath,
    activeCodexPluginPath,
    liveMirrorPluginPath
  ];
}

function backup(path) {
  if (!existsSync(path)) return null;
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 17);
  const backupPath = `${path}.bak-${pluginName}-${stamp}`;
  writeFileSync(backupPath, readFileSync(path));
  return backupPath;
}

function buildGlobalPluginHealth() {
  const manifests = scanGlobalPluginManifests();
  const promptViolations = [];
  const manifestViolations = [];
  const runtimeCacheViolations = [];
  const parseErrors = [];

  for (const manifest of manifests) {
    if (manifest.error) {
      parseErrors.push(manifest);
      continue;
    }
    for (const violation of manifest.manifestViolations) {
      const entry = {
        plugin: manifest.pluginName,
        path: manifest.path,
        surface: manifest.surface,
        issue: violation.issue
      };
      manifestViolations.push(entry);
      if (manifest.surface === "runtime-cache") runtimeCacheViolations.push(entry);
    }
    for (const violation of manifest.promptViolations) {
      const entry = {
        plugin: manifest.pluginName,
        path: manifest.path,
        surface: manifest.surface,
        issue: violation.issue,
        index: violation.index ?? null,
        length: violation.length ?? null
      };
      promptViolations.push(entry);
      if (manifest.surface === "runtime-cache") runtimeCacheViolations.push(entry);
    }
  }

  const pluginsUi = detectPluginsUiStuckState({ promptViolations, runtimeCacheViolations });
  const promptSchemaOk = promptViolations.length === 0 && manifestViolations.length === 0 && parseErrors.length === 0;
  const runtimeCacheOk = runtimeCacheViolations.length === 0;

  return {
    status: "global-plugin-health",
    ok: promptSchemaOk && runtimeCacheOk && pluginsUi.ok,
    scanned: manifests.length,
    pluginName,
    promptSchema: {
      ok: promptSchemaOk,
      violations: promptViolations,
      manifestViolations,
      parseErrors
    },
    runtimeCache: {
      ok: runtimeCacheOk,
      scanned: manifests.filter((manifest) => manifest.surface === "runtime-cache").length,
      violations: runtimeCacheViolations
    },
    pluginsUi,
    manifests
  };
}

function scanGlobalPluginManifests() {
  const roots = globalPluginRoots();
  const manifests = [];
  const seenFiles = new Set();
  const seenDirs = new Set();

  for (const root of roots) visit(root, 0);
  return manifests.sort((left, right) => left.path.localeCompare(right.path));

  function visit(path, depth) {
    if (depth > 8 || !existsSync(path)) return;
    let info;
    try {
      info = statSync(path);
    } catch {
      return;
    }

    if (info.isDirectory()) {
      let real;
      try {
        real = realpathSync(path);
      } catch {
        real = path;
      }
      if (seenDirs.has(real)) return;
      seenDirs.add(real);
      if (shouldSkipGlobalPluginScanDir(path)) return;
      for (const entry of readdirSync(path)) visit(join(path, entry), depth + 1);
      return;
    }

    if (!info.isFile() || basename(path) !== "plugin.json" || !path.includes(`${sepFragment()}.codex-plugin${sepFragment()}`)) {
      return;
    }

    let real;
    try {
      real = realpathSync(path);
    } catch {
      real = path;
    }
    if (seenFiles.has(real)) return;
    seenFiles.add(real);
    manifests.push(readPluginManifestForHealth(path));
  }
}

function globalPluginRoots() {
  const configured = process.env.CODEX_GLOBAL_PLUGIN_HEALTH_ROOTS;
  if (configured) {
    return configured
      .split(":")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => resolve(entry));
  }
  return [
    join(home, "plugins"),
    join(home, ".codex/plugins"),
    join(home, ".codex/plugins/cache/local-plugins"),
    join(home, ".codex/.tmp/plugins/plugins"),
    join(home, ".codex/.tmp/marketplaces/local-plugins/plugins")
  ];
}

function sepFragment() {
  return "/";
}

function shouldSkipGlobalPluginScanDir(path) {
  const name = basename(path);
  if (name.startsWith(".") && name !== ".codex-plugin") return true;
  return [
    ".git",
    "node_modules",
    "dist",
    "coverage",
    ".debug-runs",
    ".cache",
    ".tmp"
  ].includes(name);
}

function readPluginManifestForHealth(path) {
  try {
    const manifest = readJson(path);
    const promptViolations = promptLimitViolations(manifest);
    const manifestViolations = manifestPathViolations(manifest);
    return {
      path,
      surface: pluginManifestSurface(path),
      pluginName: manifest?.name ?? basename(dirname(dirname(path))),
      version: manifest?.version ?? null,
      manifestViolations,
      promptViolations
    };
  } catch (error) {
    return {
      path,
      surface: pluginManifestSurface(path),
      pluginName: basename(dirname(dirname(path))),
      error: String(error?.message ?? error),
      manifestViolations: [],
      promptViolations: []
    };
  }
}

function pluginManifestSurface(path) {
  if (path.includes("/.codex/.tmp/plugins/plugins/") || path.includes("/.codex/.tmp/marketplaces/")) {
    return "runtime-cache";
  }
  if (path.includes("/.codex/plugins/cache/")) return "codex-cache";
  if (path.includes("/.codex/plugins/")) return "codex-installed";
  if (path.includes("/plugins/") || path.includes("/Projects/PLUGINS/")) return "source";
  return "other";
}

function promptLimitViolations(manifest) {
  const prompts = manifest?.interface?.defaultPrompt;
  if (prompts == null) return [];
  if (!Array.isArray(prompts)) return [];
  const violations = [];
  if (prompts.length > 3) violations.push({ issue: `defaultPrompt count ${prompts.length} exceeds 3` });
  prompts.forEach((prompt, index) => {
    const text = promptText(prompt);
    if (text.length > 128) {
      violations.push({
        issue: `defaultPrompt[${index}] exceeds 128 characters`,
        index,
        length: text.length
      });
    }
  });
  return violations;
}

function manifestPathViolations(manifest) {
  const violations = [];
  if (manifest?.skills === "./") {
    violations.push({ issue: "skills path must not be ./; use ./skills/" });
  }
  return violations;
}

function promptText(prompt) {
  if (typeof prompt === "string") return prompt;
  if (prompt && typeof prompt === "object" && typeof prompt.prompt === "string") return prompt.prompt;
  return String(prompt ?? "");
}

function detectPluginsUiStuckState({ promptViolations, runtimeCacheViolations }) {
  const logSignal = recentPluginManifestWarningSignal();
  const rendererSignal = codexRendererCpuSignal();
  const promptRisk = promptViolations.length > 0 || runtimeCacheViolations.length > 0;
  const possibleStuck = logSignal.defaultPromptWarnings > 0 && rendererSignal.maxCpu >= 80;

  return {
    ok: !promptRisk,
    status: promptRisk ? "likely-stuck" : possibleStuck ? "possible-stale-loop" : logSignal.defaultPromptWarnings > 0 ? "recent-warning" : "clear",
    reason: promptRisk
      ? "Plugin prompt metadata can keep the Plugins detail page loading."
      : possibleStuck
        ? "Recent prompt warnings and high renderer CPU were seen; re-entering Plugins may be needed if the current pane is already stuck."
      : "No active prompt-limit signal found.",
    recentManifestWarnings: logSignal.manifestWarnings,
    recentDefaultPromptWarnings: logSignal.defaultPromptWarnings,
    rendererMaxCpu: rendererSignal.maxCpu,
    rendererPids: rendererSignal.pids,
    logPath: logSignal.path
  };
}

function recentPluginManifestWarningSignal() {
  const logPath = join(home, ".codex/logs_2.sqlite");
  if (!existsSync(logPath)) {
    return { path: logPath, manifestWarnings: 0, defaultPromptWarnings: 0, unavailable: true };
  }

  const sql = [
    "select",
    "sum(case when target='codex_core_plugins::manifest' then 1 else 0 end),",
    "sum(case when target='codex_core_plugins::manifest' and feedback_log_body like '%defaultPrompt%' then 1 else 0 end)",
    "from logs where ts > strftime('%s','now')-600;"
  ].join(" ");
  const result = spawnSync("sqlite3", [logPath, sql], { encoding: "utf8" });
  if (result.status !== 0) {
    return { path: logPath, manifestWarnings: 0, defaultPromptWarnings: 0, unavailable: true };
  }
  const [manifestWarnings, defaultPromptWarnings] = result.stdout.trim().split("|").map((value) => Number(value || 0));
  return {
    path: logPath,
    manifestWarnings: Number.isFinite(manifestWarnings) ? manifestWarnings : 0,
    defaultPromptWarnings: Number.isFinite(defaultPromptWarnings) ? defaultPromptWarnings : 0
  };
}

function codexRendererCpuSignal() {
  const result = spawnSync("ps", ["-axo", "pid,%cpu,command"], { encoding: "utf8" });
  if (result.status !== 0) return { maxCpu: 0, pids: [] };
  const renderers = result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes("Codex (Renderer)"))
    .map((line) => {
      const match = /^(\d+)\s+([0-9.]+)/.exec(line);
      return match ? { pid: Number(match[1]), cpu: Number(match[2]) } : null;
    })
    .filter(Boolean);
  return {
    maxCpu: Math.max(0, ...renderers.map((entry) => entry.cpu)),
    pids: renderers.map((entry) => entry.pid)
  };
}

function repairGlobalPromptLimits({ runtimeOnly = false, quiet = false } = {}) {
  const before = buildGlobalPluginHealth();
  const candidates = before.manifests.filter((manifest) => {
    if (manifest.promptViolations.length === 0) return false;
    return !runtimeOnly || manifest.surface === "runtime-cache";
  });
  const actions = [];

  for (const manifest of candidates) {
    const action = {
      path: manifest.path,
      plugin: manifest.pluginName,
      surface: manifest.surface,
      changed: false,
      backup: null
    };

    if (!dryRun) {
      const value = readJson(manifest.path);
      const fixedPrompts = repairDefaultPrompts(value.interface?.defaultPrompt);
      if (value.interface && fixedPrompts.changed) {
        action.backup = backup(manifest.path);
        value.interface.defaultPrompt = fixedPrompts.prompts;
        writeJson(manifest.path, value);
        action.changed = true;
      }
    }

    actions.push(action);
  }

  const after = dryRun ? before : buildGlobalPluginHealth();
  const result = {
    status: runtimeOnly ? "repair-runtime-cache" : "repair-prompt-limits",
    dryRun,
    before,
    actions,
    after
  };
  if (!quiet) return result;
  return result;
}

function repairDefaultPrompts(prompts) {
  if (!Array.isArray(prompts)) return { changed: false, prompts };
  const next = prompts.slice(0, 3).map((prompt) => repairPromptValue(prompt));
  return {
    changed: JSON.stringify(next) !== JSON.stringify(prompts),
    prompts: next
  };
}

function repairPromptValue(prompt) {
  const max = 128;
  if (typeof prompt === "string") return shortenPrompt(prompt, max);
  if (prompt && typeof prompt === "object" && typeof prompt.prompt === "string") {
    return { ...prompt, prompt: shortenPrompt(prompt.prompt, max) };
  }
  return prompt;
}

function shortenPrompt(value, max) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3).trimEnd()}...`;
}

function ensureSymlink(linkPath, targetPath) {
  rmSync(linkPath, { recursive: true, force: true });
  mkdirSync(dirname(linkPath), { recursive: true });
  symlinkSync(targetPath, linkPath);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function argValue(name) {
  const equalsPrefix = `${name}=`;
  for (let index = 0; index < rawArgs.length; index += 1) {
    const value = rawArgs[index];
    if (value.startsWith(equalsPrefix)) return value.slice(equalsPrefix.length);
    if (value === name && rawArgs[index + 1] && !rawArgs[index + 1].startsWith("--")) {
      return rawArgs[index + 1];
    }
  }
  return null;
}

function printState(state) {
  if (!compactOutput) {
    printJson(state);
    return;
  }
  const passed = state.checks.filter((check) => check.ok).length;
  const failed = state.checks.filter((check) => !check.ok);
  const lines = [
    `@ChromeDevTools ${state.status}: ${state.ok ? "PASS" : "FAIL"} (${passed}/${state.checks.length} checks)`,
    `source: ${state.source}`,
    `active: ${state.paths.activeProjection}`,
    `marketplace: ${state.paths.liveMarketplace}`
  ];
  if (failed.length > 0) {
    lines.push("failed:");
    for (const check of failed) {
      lines.push(`- ${check.id}${check.path ? ` :: ${check.path}` : ""}`);
    }
  }
  if (state.globalPluginHealth) {
    lines.push(
      `global plugins: ${state.globalPluginHealth.ok ? "PASS" : "FAIL"} (${state.globalPluginHealth.scanned} manifests)`,
      `plugins UI: ${state.globalPluginHealth.pluginsUi.status}`
    );
  }
  process.stdout.write(`${lines.join("\n")}\n`);
}

function printRepairResult(result) {
  if (!compactOutput) {
    printJson(result);
    return;
  }
  const beforeFailed = result.before.checks.filter((check) => !check.ok);
  const after = result.after;
  const lines = [
    `@ChromeDevTools ${result.status}: ${after ? (after.ok ? "PASS" : "FAIL") : result.before.ok ? "NOOP" : "PENDING"}`,
    `before: ${result.before.ok ? "PASS" : `FAIL (${beforeFailed.length} failed)`}`,
    `actions: ${result.actions.length}`
  ];
  for (const action of result.actions) lines.push(`- ${action.id} :: ${action.detail}`);
  if (after) {
    const afterFailed = after.checks.filter((check) => !check.ok);
    lines.push(`after: ${after.ok ? "PASS" : `FAIL (${afterFailed.length} failed)`}`);
    for (const check of afterFailed) lines.push(`- ${check.id}${check.path ? ` :: ${check.path}` : ""}`);
  }
  process.stdout.write(`${lines.join("\n")}\n`);
}

function printValue(value) {
  if (!compactOutput) {
    printJson(value);
    return;
  }
  if (value.status === "rollback-history") {
    const lines = [`@ChromeDevTools rollback-history`];
    for (const entry of value.history) {
      lines.push(`- ${entry.path}: ${entry.backups.length} backup${entry.backups.length === 1 ? "" : "s"}`);
      if (entry.backups[0]) lines.push(`  latest: ${entry.backups[0]}`);
    }
    process.stdout.write(`${lines.join("\n")}\n`);
    return;
  }
  if (value.inventory?.checks) {
    const passed = value.inventory.checks.filter((check) => check.ok).length;
    process.stdout.write(
      [
        `@ChromeDevTools ${value.status}: ${value.inventory.ok ? "PASS" : "FAIL"} (${passed}/${value.inventory.checks.length} checks)`,
        `source: ${value.source}`,
        `active: ${value.inventory.paths.activeProjection}`,
        `marketplace: ${value.inventory.paths.liveMarketplace}`
      ].join("\n") + "\n"
    );
    return;
  }
  printJson(value);
}

function printGlobalPluginHealth(health) {
  if (!compactOutput) {
    printJson(health);
    return;
  }
  const lines = [
    `@ChromeDevTools global-plugin-health: ${health.ok ? "PASS" : "FAIL"}`,
    `manifests: ${health.scanned}`,
    `prompt limits: ${health.promptSchema.ok ? "PASS" : `FAIL (${health.promptSchema.violations.length} violation${health.promptSchema.violations.length === 1 ? "" : "s"})`}`,
    `runtime cache: ${health.runtimeCache.ok ? "PASS" : `FAIL (${health.runtimeCache.violations.length} violation${health.runtimeCache.violations.length === 1 ? "" : "s"})`}`,
    `plugins UI: ${health.pluginsUi.status}`
  ];
  const violations = [
    ...health.promptSchema.parseErrors.map((entry) => ({ ...entry, issue: entry.error })),
    ...health.promptSchema.violations
  ];
  if (violations.length > 0) {
    lines.push("examples:");
    for (const violation of violations.slice(0, 8)) {
      lines.push(`- ${violation.plugin ?? "unknown"} :: ${violation.issue} :: ${violation.path}`);
    }
  }
  process.stdout.write(`${lines.join("\n")}\n`);
}

function printPromptRepairResult(result) {
  if (!compactOutput) {
    printJson(result);
    return;
  }
  const changed = result.actions.filter((action) => action.changed).length;
  const lines = [
    `@ChromeDevTools ${result.status}: ${result.after.ok ? "PASS" : "FAIL"}`,
    `dry-run: ${result.dryRun ? "yes" : "no"}`,
    `actions: ${result.actions.length}`,
    `changed: ${changed}`,
    `after prompt limits: ${result.after.promptSchema.ok ? "PASS" : `FAIL (${result.after.promptSchema.violations.length})`}`,
    `after runtime cache: ${result.after.runtimeCache.ok ? "PASS" : `FAIL (${result.after.runtimeCache.violations.length})`}`
  ];
  for (const action of result.actions.slice(0, 8)) {
    lines.push(`- ${action.changed ? "updated" : result.dryRun ? "would update" : "unchanged"} :: ${action.plugin} :: ${action.path}`);
  }
  process.stdout.write(`${lines.join("\n")}\n`);
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
