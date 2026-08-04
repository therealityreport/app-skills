# Install And Cache Sync

`@ChromeDevTools` can be synced into local Codex plugin locations with one command:

```bash
npm run sync:install
```

The sync step builds the package first, then refreshes:

- `~/.codex/plugins/chrome-devtools`
- `~/.codex/plugins/cache/local-plugins/chrome-devtools/0.1.1`
- `~/.agents/plugins/plugins/chrome-devtools`
- `~/.codex/.tmp/plugins/plugins/chrome-devtools`
- `~/.codex/.tmp/marketplaces/local-plugins/plugins/chrome-devtools`

It also registers `chrome-devtools` in `~/.agents/plugins/marketplace.json`, adds it to the shared local plugin scope manifest, updates the live local marketplace mirror, and enables `chrome-devtools@local-plugins` in `~/.codex/config.toml`.

## Dry Run

```bash
npm run sync:install:dry-run
```

Prints the source and destination paths without copying files.

## Verify

```bash
npm run sync:install:verify
```

Checks whether the installed, cached, and marketplace source copies match the package source. The comparison ignores `node_modules`, `.git`, `.DS_Store`, coverage, temporary files, and debug-run scratch output.

For the ChromeDevTools capability expansion, parity includes:

- skills under `skills/**`;
- agents under `agents/**`;
- docs under `docs/**`;
- `.codex-plugin/plugin.json`;
- `plugin.toml`;
- schemas and MCP tool metadata;
- CLI and built `dist/**` output;
- launch-hook metadata when startup checks change.

## Startup Check

```bash
npm run sync:startup-check
npm run sync:status
```

This is the Codex startup drift check. It exits non-zero when the source, installed copy, cache copy, shared marketplace entry, Codex config entry, local plugin scope entry, active plugin projection, or live marketplace mirror has drifted.

`sync:status` runs the same check with compact human-readable output. Startup checks also include the Plugins UI stuck-state detector: global prompt-limit violations fail the check, while recent warning/high-CPU signals are reported as possible stale loops without mutating anything.

## Launch Hook

`@ChromeDevTools` exposes `hooks/hooks.json` through `.codex-plugin/plugin.json`. The SessionStart hook runs:

```bash
node ${CODEX_PLUGIN_ROOT}/scripts/codex-startup-check.mjs
```

That wrapper executes the read-only startup drift check with compact output. It does not repair files, attach to Chrome, or mutate plugin state.

No live browser route, route token, Lighthouse run, performance trace, WebMCP execution, or third-party page tool execution should run from startup hooks.

## Global Plugin Health

```bash
npm run sync:plugin-health
```

Scans discovered local, installed, cached, and runtime plugin manifests for UI-facing prompt schema problems. It reports:

- total manifests scanned
- prompt-limit pass/fail
- runtime-cache prompt drift
- Plugins UI stuck-state signal

The command is read-only.

## Inventory Smoke

```bash
npm run sync:inventory-smoke
```

Runs the same install-state checks as a post-sync smoke test. This is the fastest way to confirm the plugin can be discovered by the local marketplace and active Codex plugin inventory after a sync.

## Repair

```bash
npm run sync:repair
```

Repairs failed install-state checks by refreshing only the affected surfaces: installed copy, cache copy, shared marketplace source, shared marketplace entry, Codex config entry, local plugin scope manifest, active Codex projection, and live marketplace mirror.

When startup diagnostics find invalid global plugin prompt metadata, `sync:repair` also runs the prompt-limit repair.

Repair prompt limits across discovered plugin manifests:

```bash
npm run sync:repair-prompts
```

Repair only runtime-cache prompt drift, such as remote plugin projections under `~/.codex/.tmp/plugins/plugins`:

```bash
npm run sync:repair-runtime-cache
```

Preview the repair plan without changing files:

```bash
npm run sync:repair -- --dry-run
```

## Rollback

```bash
npm run sync:rollback
```

Restores the latest `chrome-devtools` backups for `~/.agents/plugins/marketplace.json`, `~/.codex/config.toml`, and the local plugin scope manifest, then reruns the scope sync so live marketplace projections follow the restored state.

Use this only to undo a bad sync. Add `-- --remove-copies` to also remove installed, cached, active, and live-mirror plugin copies.

Preview the rollback without changing files:

```bash
npm run sync:rollback -- --dry-run
```

List available rollback backups:

```bash
npm run sync:rollback:history
```

## Safety

The sync script backs up marketplace/config files before editing them. It does not attach to Chrome, change browser profiles, or enable live MCP delegation.

Run sync in this order for release work:

```bash
npm run sync:install:dry-run
npm run sync:install
npm run sync:install:verify
npm run sync:status
```

If sync reports drift in unrelated plugins or `debugpro` files, leave that state untouched and report it separately.
