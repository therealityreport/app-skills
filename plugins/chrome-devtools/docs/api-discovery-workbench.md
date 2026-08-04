# API Discovery Workbench

The API Discovery Workbench turns captured network events into a safe, bounded list of API calls that can be inspected, compared, replayed from fixtures, or exported as redacted cURL.

## Inputs

- Fixture debug runs under `test/fixtures/debug-run/**`.
- Dry-run target metadata from `cdt collect --dry-run`.
- HAR fixtures that have already been saved outside live credential context.
- SSE fixture streams that can be summarized without exposing payload values.
- Network entries that include method, URL, request headers, request body metadata, response status, response headers, timing, initiator, and optional bounded response body fixtures.

Live browser and CDP capture are not inputs for this slice.

## Output fields

- `id`: stable call identifier within a debug run.
- `method`: HTTP method.
- `url`: redacted URL with secret query parameters removed.
- `origin`: scheme and host only.
- `path`: URL path without sensitive query values.
- `status`: response status, when available.
- `durationMs`: bounded request duration.
- `requestHeaders`: redacted header summary.
- `requestBody`: metadata by default; bounded redacted fixture body only when allowed.
- `responseHeaders`: redacted header summary.
- `responseBody`: metadata by default; blocked when unresolved or unredacted.
- `initiator`: source correlation summary, when available.
- `curl`: included only when `--include-curl` or `api curl` is used.
- `redactionWarnings`: plain-language reasons for omitted fields.

## Commands

```bash
node bin/cdt api calls --target active --include-curl --dry-run
node bin/cdt api curl --run test/fixtures/debug-run/basic --api-call api-call-1
```

## Response body rule

Response bodies are blocked by default. A body may appear only when all of these are true:

- It came from a fixture, not a live browser credential context.
- It is under the configured byte limit.
- It has passed redaction.
- The output marks it as fixture-derived.

## HAR and SSE fixture imports

HAR imports are fixture-only and do not perform live network capture. The importer reads HAR `log.entries`, keeps API-like XHR/fetch/JSON requests, skips static assets by default, redacts URLs and headers, summarizes request body shape, and keeps response bodies metadata-only.

SSE fixture parsing reads saved text/event-stream data. Event summaries include event types, counts, data byte sizes, retry metadata, and redacted payload shape; raw event IDs and payload values are not returned.
