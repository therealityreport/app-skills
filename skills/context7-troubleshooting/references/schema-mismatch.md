# Schema Mismatch

## Plugin Schema

For plugin validation failures:

- Read the plugin manifest and validation script before editing.
- Confirm required fields, paths, and relative command references.
- Do not edit manifest files unless the task owner scope includes them.

## MCP Tool Schema

For MCP method or payload errors:

- Confirm the method name, required fields, and argument shapes.
- Check whether the current MCP server version matches the expected package.
- Use help output before live lookup.
- Retry with a minimal sanitized query.
- If `resolve-library-id` fails with `path: ["query"]` while the visible caller only exposes `libraryName`, the active connector is bypassing the compatibility wrapper. Run `node ~/.codex/plugins/context7/scripts/repair-context7-mcp.mjs --repair --reload`, then rerun `node ~/.codex/plugins/context7/scripts/doctor-context7-mcp.mjs`.
- For Context7 app connector calls, stale callers may still use `get-library-docs` or omit `query` from `resolve-library-id`; route those through the plugin stdio adapter instead of directly into upstream `@upstash/context7-mcp@3.2.4`.
- If prompt/resource discovery or authentication elicitation fails, compare the downstream MCP `initialize.capabilities` with the adapter's relay behavior before changing schemas. Do not fake an elicitation response or downgrade the proxy to static tool metadata.
- Treat raw `npx -y @upstash/context7-mcp` config blocks as invalid. Codex plugin configuration should point to the packaged `scripts/start-context7-mcp.sh` so stale callers are translated before upstream validation.

## Skill Schema

For skill validation:

- Every `SKILL.md` must have YAML frontmatter.
- Frontmatter must include `name` and `description`.
- Keep detailed commands in `references/`.
- Keep file content ASCII unless the surrounding file already requires otherwise.

## Stop Conditions

Stop if validation finds:

- Secret literals.
- Required schema fields missing.
- Scope requires editing files outside the approved ownership boundary.
- Package behavior no longer matches the approved version contract.
