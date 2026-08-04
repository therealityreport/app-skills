# Rollback History

`@ChromeDevTools` creates timestamped backups before it edits shared install files.

## Backup Files

- Shared marketplace backups: `~/.agents/plugins/marketplace.json.bak-chrome-devtools-*`
- Codex config backups: `~/.codex/config.toml.bak-chrome-devtools-*`
- Local plugin scope backups: `~/plugins/superpowers-marketplace/scripts/local-plugins-scope.json.bak-chrome-devtools-*`

The timestamp is sortable, so the newest backup is the rollback default.

## Inspect History

```bash
npm run sync:rollback:history
```

This prints a compact count and latest backup for each rollback-controlled file.

## Preview Rollback

```bash
npm run sync:rollback -- --dry-run
```

This shows the exact backups that would be restored. It does not change files.

## Restore

```bash
npm run sync:rollback
```

Rollback restores the newest backup for each rollback-controlled file, then reruns the local plugin scope sync so the live marketplace and active Codex projection follow the restored registry state.

Add `-- --remove-copies` only when the installed package copies should also be removed.
