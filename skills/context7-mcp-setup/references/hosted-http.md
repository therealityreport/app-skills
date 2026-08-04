# Hosted HTTP Context7 MCP

## When To Use

Use hosted HTTP only when the user asks for a remote MCP endpoint or when the environment cannot run the stdio wrapper.

The hosted endpoint is `https://mcp.context7.com/mcp`. Browser OAuth is a hosted-HTTP flow; `ctx7 setup --oauth` is not compatible with `--stdio`.

Default Codex plugin setup should use stdio.

Enterprise-managed authentication is an HTTP-only concern. Do not route an enterprise-managed auth requirement through the local stdio wrapper, and do not assume a local API key can substitute for an organization-managed hosted login.

## Tradeoffs

Hosted HTTP can be useful for:

- Shared remote environments.
- Sandboxes without local Node package execution.
- Centralized operations where outbound network access is controlled.

It adds risks:

- Network dependency.
- Authentication and token handling.
- Endpoint availability.
- More places where private query text can travel.

## Safety Rules

- Do not store secret values in plugin files.
- Prefer environment variables or the platform's secret manager.
- Sanitize docs queries the same way as stdio lookup.
- State when a remote endpoint was used if that matters for privacy or debugging.
