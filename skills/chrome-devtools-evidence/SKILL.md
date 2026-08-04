---
name: chrome-devtools-evidence
description: Use when ordering browser debugging evidence into a timeline, comparing debug runs, summarizing screenshots or console entries, collecting live evidence bundles, and preserving redaction warnings.
---

# Chrome DevTools Evidence

Use this skill when turning collected fixture, dry-run, or gated live evidence into a timeline, bundle, replay, or comparison.

## Workflow

1. Replay a fixture run:

```bash
node bin/cdt replay test/fixtures/debug-run/basic --format summary
```

2. Collect a live bundle only after a route token exists. Keep dry-run first when planning the bundle:

```bash
node bin/cdt live collect --route-token rt_example --network --console --snapshot --screenshot --output ./.chrome-devtools-runs/run-001 --dry-run
```

3. Compare failing and fixed runs:

```bash
node bin/cdt compare test/fixtures/debug-run/failing test/fixtures/debug-run/fixed --api --console --screenshot
```

4. Order evidence by timestamp, then stable sequence number.
5. Call out missing timestamps, blocked response bodies, bounded screenshots, list-only page tools, and redaction warnings.
6. Summarize the practical sequence of events before naming technical fields.
7. Store and read evidence through redaction-first bundle boundaries; do not pass raw upstream output directly to a user-facing summary.

## Evidence priorities

- User-visible symptom.
- API call changes.
- Console and runtime errors.
- Screenshot or DOM metadata changes.
- Lighthouse or trace summary changes.
- Accessibility, LCP, or memory summaries when those focused skills produced bounded artifacts.
- Redaction and safety blockers.

## Bundle boundaries

- Network, console, snapshot, screenshot, Lighthouse, and performance trace evidence must be bounded.
- Response bodies remain metadata-first by default.
- Screenshots are evidence artifacts, not proof that credentials or full page state can be exposed.
- Page-exposed WebMCP and third-party tools may be listed as untrusted metadata only; execution stays disabled by default.
