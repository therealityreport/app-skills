# Live Attach Deferred

Live Chrome and CDP attachment are intentionally outside the first slice.

## Deferred capabilities

- Reading live tabs from `@Chrome`.
- Opening CDP websocket sessions.
- Capturing live console, DOM, network, or screenshots.
- Installing or syncing a DevTools extension.
- Mutating browser profile state.
- Executing WebMCP or third-party page-exposed tools.

## Required boundary

Code that will eventually talk to Chrome or CDP should sit behind adapters that can be mocked in tests and dry-run commands. The dry-run path should describe planned behavior without contacting a browser.

## Promotion criteria

Live attach should be added only after the dry-run slice proves:

- redaction cannot leak secrets in generated cURL;
- response bodies are gated by metadata and fixture redaction;
- target previews are safe and handle ambiguity;
- bridge doctor can explain missing dependencies;
- MCP metadata is stable enough for callers.
- route-token ownership and URL policy gates are enforced;
- WebMCP and third-party tool discovery remains list-only until explicit experimental execution is designed.

## Experimental page tools

WebMCP and third-party developer tools exposed by a page are untrusted. This slice may list normalized metadata from fixtures, redact sensitive schema defaults/examples, and report that execution is disabled. It must not execute page-exposed tools.
