# Context7 CLI Docs Commands

## Preferred Command Shape

Use the plugin wrapper when present:

```bash
context7/scripts/find-node-tool.sh npx
```

Then run CLI help or docs commands through the resolved executable.

Known command shapes from the approved plan:

```bash
/opt/homebrew/bin/npx -y ctx7@0.5.5 --help
/opt/homebrew/bin/npx -y ctx7@0.5.5 library react --json
```

Use the actual resolved `npx` path from the local environment.

## Lookup Discipline

- Sanitize query text before passing it to CLI.
- Prefer JSON output when the CLI supports it.
- Use a single library and a single concept per lookup. Run additional focused lookups only when needed.
- Use one library-resolution cycle, then up to three concept-scoped docs queries or retries. Resolution does not consume a query slot.
- Do not run live lookup in validation scripts unless `CONTEXT7_LIVE_SMOKE=1`.

## Fallback Disclosure

When CLI is used because MCP failed, include:

```text
Context7 MCP was unavailable, so I used the Context7 CLI fallback.
```

## Failure Handling

If the CLI is missing:

- Check plugin wrapper scripts first.
- Check Homebrew paths such as `/opt/homebrew/bin/npx`.
- Check the bundled runtime if the plugin provides one.
- Do not globally install Node packages without explicit user approval.
