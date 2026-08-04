# Install State

`@ChromeDevTools` has five install-state surfaces. All five must agree before Codex can reliably show and load the plugin.

## Source

- Package source: `work/chrome-devtools`
- Codex descriptor: `work/chrome-devtools/.codex-plugin/plugin.json`
- CLI descriptor: `work/chrome-devtools/plugin.toml`

## Installed Copies

- Installed plugin: `~/.codex/plugins/chrome-devtools`
- Versioned cache: `~/.codex/plugins/cache/local-plugins/chrome-devtools/0.1.1`
- Cache pointer: `~/.codex/plugins/cache/local-plugins/chrome-devtools/local`
- Shared marketplace source: `~/.agents/plugins/plugins/chrome-devtools`

## Marketplace State

- Shared marketplace: `~/.agents/plugins/marketplace.json`
- Scope manifest: `~/plugins/superpowers-marketplace/scripts/local-plugins-scope.json`
- Live marketplace: `~/.codex/.tmp/marketplaces/local-plugins/marketplace.json`
- Live nested marketplace: `~/.codex/.tmp/marketplaces/local-plugins/.agents/plugins/marketplace.json`

## Active Codex Projection

- Active plugin projection: `~/.codex/.tmp/plugins/plugins/chrome-devtools`
- Live marketplace source mirror: `~/.codex/.tmp/marketplaces/local-plugins/plugins/chrome-devtools`

These paths are the common failure point when the Plugins page is blank or stale after a package sync.

## Commands

```bash
npm run sync:install
npm run sync:startup-check
npm run sync:status
npm run sync:plugin-health
npm run sync:inventory-smoke
npm run sync:repair
npm run sync:repair-prompts
npm run sync:repair-runtime-cache
npm run sync:rollback
npm run sync:rollback:history
```

`sync:install` updates every install-state surface and runs the inventory smoke check. `sync:startup-check` is read-only and should be safe to run on Codex launch. `sync:plugin-health` is also read-only and checks global plugin prompt metadata plus Plugins UI stuck-state signals. `sync:rollback` restores the latest sync backups and reruns the shared scope sync.

## Prompt Schema Limits

Codex plugin manifests must keep `interface.defaultPrompt` UI-safe:

- Maximum of 3 prompts.
- Each prompt must be at most 128 characters.
- String prompts and object prompts with a `prompt` field are both counted by their visible prompt text.

Violating these limits can affect more than the plugin with the bad manifest. A malformed plugin elsewhere in the local inventory can cause the Codex Plugins detail page to remain on a loading spinner while it tries to resolve plugin metadata.

Use this read-only command to check every discovered local, installed, cached, and runtime plugin manifest:

```bash
npm run sync:plugin-health
```

Use this command to repair prompt limits across discovered plugin manifests:

```bash
npm run sync:repair-prompts
```

Use this narrower command when the bad manifest only exists in Codex runtime cache, such as a remote plugin projection under `~/.codex/.tmp/plugins/plugins`:

```bash
npm run sync:repair-runtime-cache
```

The prompt repair keeps the first 3 prompts and shortens any prompt over 128 characters to a 125-character prefix plus `...`. It backs up each changed manifest before writing.

## Plugins UI Recovery

If the Codex Plugins page is blank, loading forever, or missing `@ChromeDevTools`, start with:

```bash
npm run sync:status
```

If any check fails, run:

```bash
npm run sync:repair
```

If all checks pass but the UI is still stale, first navigate away from Plugins and back into Plugins so the detail query re-enters with current manifest data. If the pane is still stale after that, ask the user before fully quitting and reopening Codex. The key UI-facing paths are:

- `~/.codex/.tmp/plugins/plugins/chrome-devtools`
- `~/.codex/.tmp/marketplaces/local-plugins/marketplace.json`
- `~/.codex/.tmp/marketplaces/local-plugins/plugins/chrome-devtools`

Do not restart Codex automatically during recovery. If `sync:status` reports `plugins UI: possible-stale-loop`, first navigate away from Plugins and back into Plugins. Restart only with explicit user approval.
