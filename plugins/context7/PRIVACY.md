# Context7 Advanced Plugin Privacy

This is a local Codex wrapper for Context7 docs lookup. The wrapper itself does not collect personal data, maintain analytics, or store local query history.

When Context7 is used, Codex may send a sanitized documentation query to the Context7 MCP server or CLI. Queries should include the library, framework, SDK, API, CLI, or cloud-service name and the documentation question. Queries should not include source code, secrets, private credentials, customer data, tokens, full stack traces with sensitive values, or proprietary files.

`CONTEXT7_API_KEY` is optional unless the upstream service requires it for a requested lookup. If set, the key is read from the local environment by the Context7 runtime. The plugin docs and wrappers must not print, log, or echo that key.

When Context7 uses device authorization, the verification URL, device code, and resulting local session are sensitive authentication material. The compatibility proxy only relays an upstream elicitation to an MCP client that explicitly advertised elicitation support; it does not auto-accept the request, persist the answer, or log its contents.

Context7 CLI follows XDG configuration/state locations. The plugin does not add a second credential store and does not remove XDG state automatically.

The plugin does not add its own database, telemetry sink, or persistent local query log. Any network handling, authentication, rate limits, or service logs are governed by Context7 and Upstash behavior for the upstream service being used.

Codex may still read project files that are relevant to the active user task, but those files should be summarized into minimal documentation queries instead of being copied into Context7 requests.
