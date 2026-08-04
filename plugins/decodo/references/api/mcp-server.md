# Decodo MCP Server

Verified date: 2026-05-28

Repo: https://github.com/Decodo/mcp-server

## Use In This Plugin

- Active surface: `.mcp.json`
- Skill owner: `skills/decodo-mcp-scraping/SKILL.md`
- Supporting skill: `skills/decodo-setup/SKILL.md`

## V1 Transport

Use local stdio through `npx -y @decodo/mcp-server` with credentials supplied from the user's environment.

NPM check on 2026-05-28:

- Package: `@decodo/mcp-server`
- Version observed: `1.2.3`
- Binary observed: `decodo-mcp` -> `build/index.js`

Default V1 toolsets:

```text
web,search,social_media,ai
```

Do not enable `ecommerce` by default.

## Guardrails

- Do not commit literal Basic auth headers or Decodo tokens.
- Verify live tool names before writing target-specific examples.
- Use MCP for agent-facing scraping and SDK/API for raw HTML, JSON pipeline output, or cases where MCP tool support is not verified.
