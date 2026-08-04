# CLI Reference

The `cdt` CLI supports dry-run and fixture workflows, route-session planning, upstream Chrome DevTools MCP readiness checks, redaction-first live evidence bundles, and performance summaries.

## Doctor

```bash
node bin/cdt doctor
node bin/cdt doctor context7
node bin/cdt doctor upstream-mcp
```

Checks local readiness, schema alignment, redaction policy, target preview policy, MCP metadata, adapter boundaries, Context7 docs access, and official Chrome DevTools MCP compatibility.

The default upstream MCP plan is isolated and bounded:

```bash
node bin/cdt doctor upstream-mcp
```

Profile-connected modes require a route token:

```bash
node bin/cdt doctor upstream-mcp --connection-mode autoConnect --route-token rt_example --allowed-url-pattern 'https://example.com/*'
node bin/cdt doctor upstream-mcp --connection-mode autoConnect --route-token rt_example --allowed-url-pattern 'https://example.com/*' --strict
```

The default upstream command keeps the safe flags enabled:

```bash
npx -y chrome-devtools-mcp@1.6.0 --isolated --experimentalPageIdRouting --redactNetworkHeaders --no-usage-statistics --no-performance-crux
```

## Route Sessions

```bash
node bin/cdt route create --connection-mode isolated --dry-run
node bin/cdt route create --connection-mode autoConnect --allowed-url-pattern 'https://example.com/*' --route-label debug-session
node bin/cdt route list
node bin/cdt route inspect --route-token rt_example
node bin/cdt route revoke --route-token rt_example
```

A route record should include the route token, connection mode, owner label, friendly Chrome profile label when applicable, allowed and blocked URL patterns, TTL, evidence policy, and upstream command preview.

Existing-browser modes fail without route-token ownership. Strict profile-connected routes fail without URL policy.

## Collect

```bash
node bin/cdt collect --target active --console --network --dom --screenshot --dry-run
```

Produces a target preview and a planned evidence collection summary. It does not attach to Chrome or CDP.

## API calls

```bash
node bin/cdt api calls --target active --include-curl --dry-run
node bin/cdt api curl --run test/fixtures/debug-run/basic --api-call api-call-1
node bin/cdt api calls --run ./.chrome-devtools-runs/run-001 --include-curl
```

Lists fixture API calls and generates redacted cURL commands.

## Live Collect

```bash
node bin/cdt live collect --route-token rt_example --network --console --snapshot --screenshot --output ./.chrome-devtools-runs/run-001 --dry-run
node bin/cdt live collect --route-token rt_example --network --console --screenshot --output ./.chrome-devtools-runs/run-001
```

Creates a redaction-first debug bundle from delegated upstream MCP tools. The dry-run form returns the planned upstream command, route checks, and bundle artifacts without launching or attaching to Chrome.

Supported evidence kinds:

- Network requests and one bounded request detail.
- Console messages.
- DOM snapshot.
- Screenshot.
- Lighthouse summary.
- Performance trace summary.

## Compare

```bash
node bin/cdt compare test/fixtures/debug-run/failing test/fixtures/debug-run/fixed --api --console --screenshot
```

Compares two debug runs and highlights practical differences in API calls, console output, screenshots, and evidence metadata.

## Replay

```bash
node bin/cdt replay test/fixtures/debug-run/basic --format summary
node bin/cdt replay ./.chrome-devtools-runs/run-001
```

Summarizes a fixture debug run without contacting a browser.

## Lighthouse

```bash
node bin/cdt lighthouse audit --route-token rt_example --output ./lighthouse-summary.json
```

Runs Lighthouse through a gated upstream route. CrUX remains disabled by default; summaries are stored by default.

## Performance

```bash
node bin/cdt perf trace start --route-token rt_example --label before
node bin/cdt perf trace stop --route-token rt_example --output ./trace-summary.json
node bin/cdt perf insight --run ./trace-summary.json --insight LCP
```

Performance traces require an explicit route token. Full trace artifacts require an explicit output path and size limit; summary output is the default.

## Redact

```bash
node bin/cdt redact test/fixtures/redaction/sensitive
```

Applies the redaction policy to fixture data and reports omitted fields.

## MCP metadata

```bash
node bin/cdt mcp serve --stdio --caps core,evidence,network,debugging,performance,memory,experimental --list-tools
```

## Memory aliases

Chrome DevTools MCP 1.6 memory debugging is exposed only through local bounded aliases. All snapshot paths must be relative `.heapsnapshot` paths without `..` traversal; duplicate string values are never returned.

```bash
node bin/cdt memory capture --route-token rt_example --file .chrome-devtools-runs/memory/baseline.heapsnapshot
node bin/cdt memory compare --route-token rt_example --base .chrome-devtools-runs/memory/baseline.heapsnapshot --current .chrome-devtools-runs/memory/final.heapsnapshot
node bin/cdt memory details --route-token rt_example --file .chrome-devtools-runs/memory/final.heapsnapshot --filter objectsRetainedByDetachedDomNodes --page-size 50
node bin/cdt memory retaining-paths --route-token rt_example --file .chrome-devtools-runs/memory/final.heapsnapshot --node-id 123 --max-depth 8
node bin/cdt memory duplicate-strings --route-token rt_example --file .chrome-devtools-runs/memory/final.heapsnapshot
node bin/cdt memory close --route-token rt_example --file .chrome-devtools-runs/memory/final.heapsnapshot --live
```

Use `--live` only after the normal route-token and URL-policy gates pass. The child process gets `--memoryDebugging`; no global wrapper configuration enables it.

Lists tool names, descriptions, input schemas, capabilities, and safety gates.

Delegated aliases for official Chrome DevTools MCP tools are live-route gated. They require route-token ownership, use network-header redaction, and recommend URL allow/block policy for profile-connected routes.

Page-exposed WebMCP and third-party developer tools are list-only metadata. Execution is disabled by default.
