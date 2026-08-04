---
name: chrome-devtools-performance
description: Use when choosing Lighthouse, performance traces, or both, and when summarizing fixture or gated upstream performance evidence.
---

# Chrome DevTools Performance

Use this skill for Lighthouse summaries, performance trace summaries, fixture timing evidence, and before/after debug-run differences.

## Choose the tool

- Use Lighthouse when the question is about page quality, high-level load performance, accessibility, SEO, or best-practice signals.
- Use a performance trace when the question is about timing detail, long tasks, LCP/CLS/INP causes, main-thread work, or before/after runtime behavior.
- Use both when a Lighthouse score needs a trace-backed explanation.
- Use `chrome-devtools-accessibility` when the Lighthouse question is primarily about accessibility.

## Workflow

1. Use replay or compare output for fixture runs; use upstream MCP only after live-route gates pass.
2. Run Lighthouse only through a gated route and keep CrUX disabled by default:

```bash
node bin/cdt lighthouse audit --route-token rt_example --output ./lighthouse-summary.json
```

3. Capture performance traces through explicit start/stop commands:

```bash
node bin/cdt perf trace start --route-token rt_example --label before
node bin/cdt perf trace stop --route-token rt_example --output ./trace-summary.json
node bin/cdt perf insight --run ./trace-summary.json --insight LCP
```

4. Focus on bounded metrics: request duration, status changes, resource counts, Lighthouse summary findings, trace insight summaries, screenshot metadata, and timeline ordering.
5. For LCP or Core Web Vitals work, read `references/lcp-debugging.md`; read `references/lcp-snippets.md` only when DOM evidence is needed.
6. Store summaries by default. Full traces require an explicit output path and size limit.
7. Separate observed evidence from hypotheses.
8. Suggest the smallest practical performance fix only after naming the evidence that supports it.

## Boundaries

- Do not claim lab-grade performance metrics from dry-run data.
- Do not run live Lighthouse, CDP tracing, or browser performance capture outside the official upstream MCP route.
- Keep sensitive URLs and headers redacted in all timing summaries.
- Keep usage statistics and performance CrUX disabled by default.
- Do not expose full traces unless the user explicitly asks for a bounded artifact.
