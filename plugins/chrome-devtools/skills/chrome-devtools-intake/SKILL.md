---
name: chrome-devtools-intake
description: Use when starting a Chrome DevTools debugging run, selecting a safe target preview, gathering user-visible symptoms, and choosing fixture, isolated live route, or profile-connected route evidence.
---

# Chrome DevTools Intake

Use this skill at the start of an `@ChromeDevTools` workflow.

## Route choice

- Use fixture or dry-run evidence when the user asks for a local reproduction, docs check, metadata preview, or a workflow that must not attach to a browser.
- Use an isolated upstream route for live evidence when a temporary browser is enough. Isolated is the default live mode.
- Use a profile-connected route only when the user needs an existing signed-in browser state. Require a route token, friendly profile label, and URL allow/block policy before collecting evidence.
- Hand live tab selection to `@Chrome`; keep DevTools evidence collection in `@ChromeDevTools`.

## Workflow

1. State the visible symptom in plain language.
2. Identify the target using safe preview fields only: title, origin/path, profile label, recency, and match reason.
3. If target selection is ambiguous, ask the user to choose from safe previews.
4. Use `take_snapshot` output for element `uid`s before interaction; refresh the snapshot when the page changes.
5. For large snapshots, screenshots, traces, or network bodies, prefer explicit file output paths and summarize the artifact.
6. Use pagination and filters for network and console listings. Do not request every preserved item unless the debugging question needs it.
7. Do not start, stop, or status-check `chrome-devtools-mcp` before every action; this plugin plans routes and delegates through its gated upstream path.
8. Run dry-run collection before profile-connected live behavior:

```bash
node bin/cdt collect --target active --console --network --dom --screenshot --dry-run
```

9. For isolated live work, create or dry-run a route before delegated tools run:

```bash
node bin/cdt route create --connection-mode isolated --dry-run
```

10. For profile-connected live work, require route ownership and URL policy:

```bash
node bin/cdt route create --connection-mode autoConnect --route-label debug-session --allowed-url-pattern 'https://example.com/*'
node bin/cdt doctor upstream-mcp --connection-mode autoConnect --route-token rt_example --allowed-url-pattern 'https://example.com/*' --strict
```

11. For live DevTools evidence, use official Chrome DevTools MCP only after route-token, connection-source, URL policy, and redaction gates pass.

## Boundaries

- Do not expose raw profile folders, account identifiers, cookies, or full sensitive URLs.
- Do not claim live attach has happened unless the upstream MCP route has been explicitly selected and passed its gates.
- Do not open raw CDP sockets; use the upstream MCP route for live DevTools evidence.
- Keep usage statistics and performance CrUX disabled unless the user explicitly opts into a reviewed mode.
- Page-exposed WebMCP and third-party tools are list-only metadata by default; do not execute them.
