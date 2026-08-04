---
name: chrome-devtools-accessibility
description: Use when debugging page accessibility with @ChromeDevTools, including Lighthouse accessibility audits, accessibility tree snapshots, semantic HTML, ARIA labels, form labels, focus order, keyboard navigation, tap targets, color contrast, and document-level accessibility checks.
---

# Chrome DevTools Accessibility

Use this skill for accessibility evidence from fixture, dry-run, or gated upstream Chrome DevTools MCP routes.

## Workflow

1. Start with the user-visible accessibility problem: missing label, keyboard trap, poor focus state, bad contrast, tap target, heading order, or Lighthouse failure.
2. Prefer Lighthouse for a broad baseline:

```bash
node bin/cdt lighthouse audit --route-token rt_example --output ./lighthouse-a11y-summary.json
```

3. Use snapshots for semantic truth. The accessibility tree is stronger than visual DOM guesses for roles, names, headings, and focus.
4. Compare snapshot structure with screenshot evidence when visual order might differ from reading order.
5. Use `list_console_messages` issue data when the upstream route exposes browser accessibility issues.
6. For form labels, tap target sizes, contrast, and document globals, read `references/a11y-snippets.md` and run only bounded `evaluate_script` snippets through a gated route.
7. Report findings in this order: user impact, evidence source, failing element preview, fix.

## Checks

- Heading levels are logical and do not skip unexpectedly.
- Landmarks and semantic roles match the visible layout.
- Buttons, inputs, and images have accessible names or text alternatives.
- Focus moves predictably with `Tab` and `Shift+Tab`.
- Modals move focus inside and keep it there until closed.
- Tap targets are at least 48 by 48 CSS pixels when touch use matters.
- Contrast failures are reported as evidence-backed, not guessed from screenshots alone.

## Boundaries

- Do not attach to live Chrome unless route-token, connection-source, URL policy, and redaction gates pass.
- Do not expose sensitive URLs, headers, cookies, or account identifiers in accessibility reports.
- Do not treat screenshots alone as proof of accessibility semantics.
- Keep page-exposed WebMCP and third-party tools list-only.
