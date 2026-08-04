---
name: context7-cli
description: Use the Context7 CLI as a fallback or local verification path for docs lookup without global installs or secret leakage.
---

# Context7 CLI

Use this skill when Context7 MCP is unavailable, when validating the local CLI wrapper, or when the user explicitly asks to use the Context7 CLI.

## Workflow

1. Prefer MCP for normal docs lookup. Use CLI as fallback or for CLI-specific validation.
2. Do not install packages globally unless the user explicitly asks.
3. Use local wrappers or `npx -y` style commands when available.
4. Never echo or store `CONTEXT7_API_KEY` values.
5. Use one library-resolution cycle followed by up to three concept-scoped docs queries or retries. The resolution cycle does not consume a query slot.
6. For live lookup smoke tests, require explicit approval or `CONTEXT7_LIVE_SMOKE=1`.
7. Use `ctx7 login` only in an attended terminal when device authorization is required. Treat the displayed verification URL and device code as sensitive session material.
8. Use `ctx7 -v` or `ctx7 --version` for version checks. For sign-in state issues, inspect XDG config/state locations before changing anything.

## References

- Read [references/docs-commands.md](references/docs-commands.md) for docs lookup command patterns.
- Read [references/setup-commands.md](references/setup-commands.md) for local setup and smoke commands.
- Read [references/auth.md](references/auth.md) for authentication and secret handling.
