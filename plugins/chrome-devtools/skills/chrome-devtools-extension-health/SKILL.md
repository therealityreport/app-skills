---
name: chrome-devtools-extension-health
description: Use when checking Chrome DevTools bridge health, extension readiness, adapter boundaries, and upstream route readiness without installing or mutating browser extensions.
---

# Chrome DevTools Extension Health

Use this skill for bridge health, extension readiness language, and upstream live delegation status.

## Workflow

1. Run bridge doctor:

```bash
node bin/cdt doctor
```

2. Confirm whether the command is dry-run, fixture-backed, adapter-bounded, isolated upstream MCP, or profile-connected upstream MCP.
3. Keep extension/profile checks separate from upstream MCP routes. Extension readiness does not grant route-token ownership.
4. Report direct extension/live attach features as unavailable unless implemented; report upstream MCP live delegation as available only after its gates pass.
5. Prefer plain readiness states: `pass`, `warn`, and `fail`.
6. For upstream server startup, missing tool, target, or navigation failures, use `chrome-devtools-repair-loop` and its troubleshooting reference.

## Boundaries

- Do not install or update Chrome extensions.
- Do not inspect live profile extension state.
- Do not present adapter mocks as live browser connectivity.
- Use friendly profile names in visible output, such as `Codex`, `TRR`, `THB`, or `openai-agent`.
- Require explicit route tokens for profile-connected modes.
