# Upstream Troubleshooting

Use this when `chrome-devtools-mcp` startup, page listing, navigation, or target attachment fails.

## Config Files To Check

Search the active workspace for `.mcp.json`, `.claude/settings.json`, `.vscode/launch.json`, `.gemini/settings.json`, and `gemini-extension.json`.

## Common Symptoms

| Symptom | Likely Cause | First Action |
|---|---|---|
| `Could not find DevToolsActivePort` | `--autoConnect` cannot find a running debuggable Chrome. | Confirm the friendly Chrome profile is running, then enable remote debugging and retry the smallest page-list command. |
| Empty page list with new profile | Typo or launched isolated/default profile. | Check flags and profile mode before changing connection type. |
| Only a small read-only tool set appears | Client is enforcing read-only/plan mode. | Explain that write/interaction tools need client permission mode changes. |
| Extension tools missing | Category flag missing or Chrome cannot load extensions for this connection mode. | Check `--categoryExtensions` and whether Chrome is launched by MCP. |
| `Target closed` or socket timeout | Browser target died or CDP connection closed. | Capture exact command and logs; do not retry indefinitely. |
| `ERR_MODULE_NOT_FOUND` | Package/install/runtime mismatch. | Check `node --version`, package version, and lock/install path. |

## Diagnostics

```bash
node bin/cdt doctor upstream-mcp
npx -y chrome-devtools-mcp@1.6.0 --help
```

For unresolved startup failures, capture logs with an explicit path and summarize errors only:

```bash
DEBUG=* npx -y chrome-devtools-mcp@1.6.0 --logFile=/tmp/chrome-devtools-mcp.log
```

## Boundaries

- Prefer isolated mode before profile-connected fallback.
- Do not expose raw profile paths or account identifiers unless needed to fix a concrete config issue.
- Do not recommend `--browserUrl` until the `--autoConnect` failure has been classified.
- Stop after the same command fails twice with the same substantive error.
