# Bridge Doctor

The bridge doctor explains whether the dry-run debugging bridge is ready and whether documentation, schemas, adapters, and fixture paths are aligned.

## Commands

```bash
node bin/cdt doctor
node bin/cdt doctor context7
node bin/cdt doctor upstream-mcp
```

## Checks

- CLI entrypoint exists and can print help.
- Fixture directories are present.
- JSON schemas are readable.
- MCP tool metadata can be listed.
- Redaction policy is loaded.
- Target preview policy is loaded.
- Chrome and CDP adapters are mockable and do not require live attachment.
- Context7 documentation lookup is available for current library and CLI documentation checks.
- Official Chrome DevTools MCP package version, category, connection-mode, and safety-flag expectations are visible before gated live delegation.

## Output style

Doctor output should use short statuses:

- `pass`: ready for dry-run use.
- `warn`: usable, but a non-blocking improvement is available.
- `fail`: current slice command should not continue.

Each failed check should include a concrete repair action and the path or command involved.

## Self-repair boundary

The doctor can recommend repairs and rerun local checks. It must not install plugins, edit user credentials, or mutate browser profile state. Live DevTools access goes through official Chrome DevTools MCP only after route-token, connection-source, and redaction gates pass.
