---
name: chrome-devtools-memory
description: Use when investigating browser memory growth with @ChromeDevTools, including suspected JavaScript memory leaks, OOM symptoms, heap snapshots, detached DOM nodes, closure leaks, event listener leaks, unbounded client caches, and bounded upstream heap comparison, filters, retainers, dominators, edges, and privacy-preserving duplicate-string analysis.
---

# Chrome DevTools Memory

Use this skill for browser memory leak evidence collected through fixture, dry-run, or gated upstream Chrome DevTools MCP routes.

## Workflow

1. State whether the symptom is browser memory growth, Node/server memory growth, or unknown. Use this skill only for browser-side evidence.
2. Reproduce the smallest user action loop that grows memory. Repeat it enough times to amplify the leak, usually 5 to 10 iterations.
3. Capture bounded snapshots at baseline, target, and final states only after route-token, connection-source, URL policy, and redaction gates pass. Use relative paths under the active work directory, such as `.chrome-devtools-runs/memory/baseline.heapsnapshot`.
4. Do not read raw `.heapsnapshot` files into chat. They are too large.
5. Prefer the bounded `@ChromeDevTools` memory aliases for summary, comparison, filtered aggregates, class nodes, retainers, retaining paths, dominators, and edges. Read `references/upstream-memory-tools.md` before live use.
6. Use duplicate-string analysis only for count and size signals: values are deliberately redacted and SHA-256 hashed. Never request or infer original values.
7. Close each loaded snapshot through the bounded `close_heapsnapshot` alias when its analysis is complete.
8. Use memlab only as a fallback when the built-in aliases are unavailable or cannot answer the narrow leak question. Read `references/memlab.md` only in that fallback path.
9. If memlab is also unavailable, use `references/compare_snapshots.js` as the final local fallback.
10. Use `references/common-leaks.md` to map retainer traces to likely code causes.
11. Separate leak evidence from code hypotheses, then inspect every caller/owner of the suspected allocation or listener before proposing a fix.

## Evidence To Report

- Reproduction loop and iteration count.
- Snapshot file paths and capture order.
- Growing object types and size/count deltas.
- Retainer trace summary when available.
- Applied aggregate filter, class/node identifiers, pagination, and analysis limits.
- Duplicate-string hashes and counts only; never original string values.
- Whether detached DOM nodes might be intentional caches.
- Smallest code owner likely responsible.

## Boundaries

- Do not parse or paste raw heap snapshots.
- Do not pass absolute paths or `..` traversal to memory aliases; the local wrapper accepts relative `.heapsnapshot` paths only.
- Do not expose upstream `--memoryDebugging` as a global, external, or default runtime flag. The local alias enables it only in its child process.
- Keep duplicate-string pages at or below 50 groups and retaining-path limits bounded.
- Do not null detached DOM references without confirming they are not intentional caches.
- Do not claim a leak from one snapshot; require baseline and comparison evidence.
- Do not attach to profile-connected Chrome without route-token ownership and URL allow/block policy.
