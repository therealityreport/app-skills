# Context7 CLI Setup Commands

## Help Checks

Help and version checks are safe default validation commands:

```bash
/opt/homebrew/bin/npx -y ctx7@0.5.5 --help
/opt/homebrew/bin/npx -y ctx7@0.5.5 -v
```

Use the resolved `npx` path when `/opt/homebrew/bin/npx` is unavailable.

## Plugin Smoke Script

When the plugin smoke script exists, run:

```bash
context7/scripts/smoke-context7-cli.sh
```

This should not perform live lookup unless explicitly enabled:

```bash
CONTEXT7_LIVE_SMOKE=1 context7/scripts/smoke-context7-cli.sh
```

## No Global Installs

Avoid:

```bash
npm install -g ctx7
```

Only run global installs when the user explicitly requests them and understands the machine-wide effect.

## Setup Target

Use the CLI's explicit agent target for setup. For Codex, the current command shapes are:

```bash
npx -y ctx7@0.5.5 setup --codex --cli
npx -y ctx7@0.5.5 setup --codex --mcp --stdio
npx -y ctx7@0.5.5 remove --codex --cli
npx -y ctx7@0.5.5 remove --codex --mcp
npx -y ctx7@0.5.5 remove --codex --all
```

For this local plugin, stdio remains the primary route, so prefer its plugin-local `.mcp.json` and wrapper unless the user explicitly asks the CLI to configure Codex. `--stdio` selects a local MCP process; omit it only when the user explicitly wants hosted HTTP.

If a library ID is malformed only in Git Bash, retry with the current CLI before editing the ID by hand; this release includes Git Bash argument recovery.

## Retry Stop

If the same command fails twice with the same substantive error, stop and inspect:

- The exact command.
- Full error output.
- Node and package manager availability.
- Plugin wrapper scripts.
- Network or authentication status.
