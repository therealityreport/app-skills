---
name: context7-app-integration
description: Integrate Context7 SDK and AI SDK tools into an app while preserving upstream MCP capabilities and handling non-JSON failures safely.
---

# Context7 App Integration

Use this skill when an application—not the plugin's stdio route—needs Context7 SDK or AI SDK tool integration.

## Workflow

1. Prefer the plugin's MCP route for ordinary documentation lookup. Add an app integration only when code needs Context7 results programmatically.
2. Pin and verify `@upstash/context7-sdk@0.3.1` or `@upstash/context7-tools-ai-sdk@0.2.4` in the application that owns the integration; this plugin does not install either package at runtime.
3. Send one sanitized library-and-concept query at a time. Do not include source files, credentials, private paths, or customer data.
4. Check the upstream response type before parsing or rendering it. Treat non-JSON and malformed responses as explicit errors with redacted diagnostics, never as successful documentation results.
5. If adding an MCP bridge, pass the downstream protocol version, capabilities, and client information upstream; mirror dynamic tool metadata and relay requests/notifications rather than freezing a static schema.
6. Never auto-answer authentication elicitation. Only forward it to a client that advertised elicitation support.

## Verification

- Test a valid JSON lookup response.
- Test a non-JSON/error response without leaking credentials or body contents.
- Test upstream tool discovery after a package update.
- Test that an unsupported downstream client receives an explicit elicitation-capability error rather than an implicit acceptance.

## Reference

- Read [references/sdk-and-ai-sdk.md](references/sdk-and-ai-sdk.md) before choosing the direct SDK, AI SDK tools, or `Context7Agent`.
