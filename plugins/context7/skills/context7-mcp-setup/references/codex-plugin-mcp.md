# Codex Plugin MCP

## Plugin-Local Definition

Use a plugin-local `.mcp.json` when configuring Context7 for this plugin:

```json
{
  "mcpServers": {
    "context7": {
      "command": "./scripts/start-context7-mcp.sh"
    }
  }
}
```

This keeps the plugin portable and avoids changing user-global configuration.

## Config Rules

- Do not write API key values to `.mcp.json`.
- Do not edit global Codex MCP config unless the user explicitly asks.
- Keep the command relative to the plugin root when possible.
- Prefer wrapper scripts for Node tool resolution and argument pass-through.

## Validation

Use help checks first:

```bash
context7/scripts/smoke-context7-mcp.sh
```

Run live lookup only when approved by the user or explicitly enabled by the plugin's smoke-script contract.

## Compatibility Surface

The local adapter is not a replacement Context7 server. Its role is to preserve upstream tools, prompts, resources, notifications, and server requests while adding only legacy `get-library-docs` and omitted-resolver-query support. `prompts/list`, `resources/list`, and `resources/templates/list` are safe empty-list fallbacks only when the upstream server does not implement them.
