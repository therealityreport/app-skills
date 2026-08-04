---
name: modal-decodo
description: Use when building or operating Decodo-backed scraping, proxy, public-data collection, browser fallback, or ingestion workflows on Modal.
---
# Modal Decodo

Use this after Modal is the compute platform and Decodo is part of the scraping,
proxy, or public-data collection path.

## Route First

- Modal + Decodo architecture: `../modal-platform/references/modal-decodo-patterns.md`
- Networking and credential boundaries: `../modal-platform/references/modal-networking-security.md`
- Adjacent tool routing: `../modal-platform/references/modal-adjacent-tools.md`
- P0 repo prompt snippets: `../modal-platform/references/modal-p0-prompt-snippets.md`
- General Modal primitives: `../modal-platform/SKILL.md`

## Default Decision

Prefer the lowest-complexity path that satisfies the workflow:

1. Direct HTTPX when public access is reliable and allowed.
2. Decodo Web Scraping API when proxy rotation, geography, anti-bot handling, or
   hosted rendering belongs outside the Modal worker.
3. Library-supported proxy configuration when the crawler must own requests.
4. Browser or crawler fallback only when rendering, browser state, login flow,
   pagination semantics, or crawl scheduling requires it.

## Required Design Points

- Keep Decodo API tokens and proxy credentials in `modal.Secret`.
- Keep proxy URLs server-side inside Modal functions or sandboxes.
- Never expose tokens through browser code, screenshots, traces, HAR files,
  logs, CSV/JSON artifacts, frontend runtime config, or rendered pages.
- Add explicit timeouts, bounded retries, rate limits, and idempotent writes.
- Pick one persistence surface before scaling: `modal.Volume`,
  `modal.CloudBucketMount`, project database, or explicit external storage.
- Store safe manifests with source URL, run ID, attempt count, parser version,
  content hash, output key, and redaction status.
- Use browser automation only when HTTPX or Decodo API cannot model the job.

## Output Contract

Return:

1. `scrape_surface`: direct HTTPX, Decodo API, proxy library, browser, crawler,
   or mixed.
2. `modal_primitives_selected`: App, Function, Image, Secret, Retries, Volume,
   Queue, schedule, endpoint, Sandbox, or other selected primitives.
3. `secrets_and_redaction_plan`: secret names, where credentials are injected,
   and what logs/artifacts must redact.
4. `state_and_idempotency_plan`: output destination, idempotency key, manifest,
   retry behavior, and dedupe rule.
5. `rate_limit_and_failure_plan`: concurrency, timeout, retryable failures,
   permanent failures, and dead-letter output.
6. `validation_or_operator_commands`: local dry run, `modal run`, artifact or
   row checks, and any deploy/no-deploy policy.
7. `residual_risks`: source policy, account limits, brittle parsing, browser
   cost, production mutation risk, or missing credentials.
