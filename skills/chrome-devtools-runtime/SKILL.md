---
name: chrome-devtools-runtime
description: Use when grouping console, runtime, framework, and source-correlation evidence into actionable error fingerprints for fixture, dry-run, or gated upstream debugging.
---

# Chrome DevTools Runtime

Use this skill for runtime errors, console failures, source correlation, and framework adapter hints.

## Workflow

1. Start from the user-visible failure.
2. For fixture or dry-run debugging, use replayed console evidence.
3. For live console evidence, route through delegated upstream `list_console_messages` only after route-token, connection-source, URL policy, and redaction gates pass.
4. Group similar console or runtime errors into fingerprints.
5. Include source correlation only when it is present in evidence.
6. Identify framework hints conservatively, such as React hydration, Next.js routing, Vite HMR, or generic browser runtime errors.
7. Switch to `chrome-devtools-memory` when the symptom is memory growth, OOM, heap snapshots, detached DOM nodes, or leak traces.
8. Avoid inventing stack frames or source files that are not in the evidence.

## Fingerprint fields

- normalized message;
- error category;
- top stack frame, when available;
- source URL or module hint, when available;
- framework hint;
- first seen and last seen;
- count;
- related API call IDs.

## Boundaries

- Do not claim a console message came from live Chrome unless it came through the gated upstream MCP route.
- Keep profile-connected runtime work route-token scoped and URL-policy bounded.
- Preserve redaction warnings alongside every console or stack summary.
