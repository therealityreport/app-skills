# Stdio Wrapper

## Required Behavior

The Context7 MCP wrapper should:

- Resolve `npx` locally from environment, Homebrew, PATH, or bundled runtime.
- Run `@upstash/context7-mcp@3.2.4`.
- Refuse unpinned package values such as `@upstash/context7-mcp` or `@upstash/context7-mcp@latest`.
- Pass arguments through when arguments are provided.
- Start the Context7 app compatibility adapter when no arguments are provided.
- Initialize upstream with the downstream `protocolVersion`, `capabilities`, and `clientInfo`.
- Dynamically mirror upstream `tools/list` metadata and schemas; retain only the documented legacy overlays.
- Relay upstream notifications and server-to-client requests. Reject an upstream elicitation only when the downstream client did not advertise elicitation; never auto-answer it.
- Avoid printing `CONTEXT7_API_KEY`.

Approved command shape:

```bash
~/.codex/plugins/context7/scripts/start-context7-mcp.sh --help
```

## Validation

Run:

```bash
context7/scripts/smoke-context7-mcp.sh
node context7/scripts/doctor-context7-mcp.mjs
node context7/scripts/repair-context7-mcp.mjs --check
```

If the same startup error happens twice, stop retrying and report:

- Exact command.
- Full error.
- Node and `npx` path.
- Whether args were passed through.
- Whether stdio default was used.
