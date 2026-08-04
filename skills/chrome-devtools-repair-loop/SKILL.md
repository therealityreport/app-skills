---
name: chrome-devtools-repair-loop
description: Use when applying the bridge doctor and repair loop for Chrome DevTools debugging, including Context7 docs checks, upstream MCP gates, route-session failures, and small evidence-backed fixes.
---

# Chrome DevTools Repair Loop

Use this skill when a dry-run command, fixture replay, bridge doctor check, upstream route, or delegated MCP workflow fails.

## Workflow

1. Run doctor:

```bash
node bin/cdt doctor
node bin/cdt doctor context7
node bin/cdt doctor upstream-mcp
```

2. Read the failed check, exact command, and path involved.
3. Classify the failure as local CLI/schema, source/cache sync, route-token ownership, URL policy, upstream MCP version/flag, delegated tool allowlist, redaction, or docs access.
4. For upstream startup, page listing, navigation, missing tools, or `DevToolsActivePort` failures, read `references/upstream-troubleshooting.md`.
5. For profile-connected modes, fail closed unless the route token, friendly profile label, and URL allow/block policy are present.
6. Apply the smallest local fix that matches the evidence.
7. Rerun the failed command once.
8. If the same command fails twice with the same substantive error, stop and report the command, error, and likely causes.

## Upstream bridge triage

- Preserve isolated mode as the default fallback.
- Keep `--redactNetworkHeaders`, `--no-usage-statistics`, and `--no-performance-crux` in the upstream command unless an explicit reviewed mode says otherwise.
- Treat page-exposed WebMCP and third-party tools as list-only metadata; execution failures are not repair targets in this slice.
- If an upstream package version is newer than the supported target, use review mode before enabling live delegation.

## Boundaries

- Do not install plugins or sync caches in this slice.
- Do not attach to live Chrome or CDP outside the official upstream MCP route.
- Do not change user credentials or browser profiles.
- Use current official docs through Context7 for library, CLI, SDK, or tool behavior questions.
