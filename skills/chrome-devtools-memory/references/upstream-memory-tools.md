# Bounded upstream heap analysis

Chrome DevTools MCP 1.6 adds heap analysis tools. `@ChromeDevTools` exposes only the locally gated aliases below; it does not enable raw upstream memory debugging globally.

## Safe sequence

1. Create an isolated route, or use a profile-connected route with an explicit route token and URL allow/block policy.
2. Capture baseline and final snapshots with relative `.heapsnapshot` paths.
3. Compare snapshots to identify growing classes.
4. Read filtered details, then class nodes, retainers, retaining paths, dominators, or edges only for the suspected nodes.
5. Close every loaded snapshot with `close_heapsnapshot`, then close the investigation with the smallest evidence-backed code owner.

## Commands

```bash
node bin/cdt memory capture --route-token rt_example --file .chrome-devtools-runs/memory/baseline.heapsnapshot
node bin/cdt memory compare --route-token rt_example --base .chrome-devtools-runs/memory/baseline.heapsnapshot --current .chrome-devtools-runs/memory/final.heapsnapshot
node bin/cdt memory details --route-token rt_example --file .chrome-devtools-runs/memory/final.heapsnapshot --filter objectsRetainedByDetachedDomNodes --page-size 50
node bin/cdt memory retaining-paths --route-token rt_example --file .chrome-devtools-runs/memory/final.heapsnapshot --node-id 123 --max-depth 8 --max-nodes 100 --max-siblings 20
node bin/cdt memory close --route-token rt_example --file .chrome-devtools-runs/memory/final.heapsnapshot --live
```

The CLI previews by default. Add `--live` only after the route gates have passed.

## Available aliases

- `take_heapsnapshot`
- `get_heapsnapshot_summary`, `get_heapsnapshot_details`, `get_heapsnapshot_class_nodes`
- `compare_heapsnapshots`
- `get_heapsnapshot_retainers`, `get_heapsnapshot_retaining_paths`, `get_heapsnapshot_edges`, `get_heapsnapshot_dominators`, `close_heapsnapshot`
- `get_heapsnapshot_duplicate_strings`

The details and class-node aliases accept one of these filters: `objectsRetainedByDetachedDomNodes`, `objectsRetainedByConsole`, `objectsRetainedByEventHandlers`, or `objectsRetainedByContexts`.

## Privacy limits

- The wrapper rejects absolute paths and parent traversal.
- Retaining paths, pages, and payloads are bounded.
- Duplicate string values are replaced by `[REDACTED_DUPLICATE_STRING]` plus a SHA-256 hash, count, and size metadata. Do not treat a hash as permission to recover its source text.
- Use memlab only if the built-in aliases are unavailable or insufficient for a specific narrow analysis; it is not the primary workflow.
