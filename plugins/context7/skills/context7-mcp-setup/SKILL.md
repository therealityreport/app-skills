---
name: context7-mcp-setup
description: Configure and validate the Context7 MCP server for Codex plugins using stdio by default, hosted HTTP when requested, and safe local wrappers.
---

# Context7 MCP Setup

Use this skill when installing, configuring, validating, or debugging Context7 MCP for a Codex plugin.

## Workflow

1. Prefer the plugin-local MCP definition and wrapper scripts.
2. Default to stdio transport for Codex plugin MCP.
3. Pass user-supplied arguments through wrapper scripts.
4. Do not write secret values to config files.
5. Do not change global Codex config unless the user explicitly asks.
6. Validate with help or smoke commands before live docs lookup.
7. Preserve the client protocol version, capabilities, and client information when a compatibility adapter is involved. Do not replace a capability-preserving stdio proxy with a static tool list.
8. If upstream sends an authentication elicitation, relay it only to a client that advertised elicitation capability; never auto-submit, accept, or store a response.

## References

- Read [references/codex-plugin-mcp.md](references/codex-plugin-mcp.md) for `.mcp.json` patterns.
- Read [references/hosted-http.md](references/hosted-http.md) for hosted HTTP setup tradeoffs.
- Read [references/stdio-wrapper.md](references/stdio-wrapper.md) for wrapper behavior and validation.
