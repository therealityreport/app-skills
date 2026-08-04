---
name: chrome-devtools-network
description: Use when analyzing fixture, dry-run, or gated upstream network evidence, API Discovery Workbench output, redacted cURL commands, response metadata, and bounded response body handling.
---

# Chrome DevTools Network

Use this skill for API call discovery, live network capture routing, and safe reproduction commands.

## Workflow

1. List API calls from fixture, dry-run, or gated upstream MCP data:

```bash
node bin/cdt api calls --target active --include-curl --dry-run
```

2. For live network evidence, require a route token and collect only redacted, bounded artifacts:

```bash
node bin/cdt live collect --route-token rt_example --network --output ./.chrome-devtools-runs/run-001 --dry-run
```

3. Use delegated upstream network tools only after route-token, connection-source, URL policy, and redaction gates pass:

```text
list_network_requests
get_network_request
```

4. Generate a redacted cURL for a specific call:

```bash
node bin/cdt api curl --run test/fixtures/debug-run/basic --api-call api-call-1
```

5. Explain request shape, response metadata, and redaction warnings before suggesting fixes.
6. Treat response bodies as metadata-only unless the body is fixture-derived or explicitly captured, bounded, and redacted.
7. Convert live network evidence into API inventory before proposing backend hypotheses.
8. For LCP network waterfalls, hand the performance diagnosis back to `chrome-devtools-performance` after identifying the LCP resource request.

## Redaction requirements

Remove cookies, authorization headers, bearer tokens, API keys, CSRF tokens, session headers, and secret query parameters from every visible command or report.

## Route requirements

- Isolated live routes are the default.
- Profile-connected routes require route-token ownership and URL allow/block policy.
- Network headers must remain redacted in upstream MCP calls.
- Do not enable usage statistics or performance CrUX while collecting network evidence.
