# Modal Decodo Patterns

Use this for Modal workloads that call Decodo Web Scraping API, Decodo proxy
endpoints, or adjacent scraping libraries. Official Modal and Decodo docs remain
the contract sources for exact API syntax and account-specific limits.

## Default Architecture

Start with the lowest-complexity path that can satisfy the workflow:

1. Direct HTTPX call to the target site when access is reliable and allowed.
2. Decodo Web Scraping API when proxy rotation, anti-bot handling, geography, or
   hosted rendering belongs outside the Modal worker.
3. Decodo proxy credentials through a library-supported proxy configuration when
   the scraping library needs to own the request.
4. Browser or crawler automation only when rendering, browser state, login flow,
   pagination semantics, or crawl scheduling cannot be represented as direct
   HTTP requests.

Do not layer browser automation or raw proxy handling onto a Decodo API flow
unless there is a concrete workflow reason. The preferred Modal shape is a small
worker that accepts a URL or job payload, reads secrets at runtime, calls the API
or target, normalizes output, and persists an artifact or database row.

## Modal Primitives

- `modal.App`: own the scrape worker, scheduled ingestion, or endpoint wrapper.
- `@app.function`: run the scraping unit with explicit CPU, memory, timeout,
  retry, concurrency, and secret settings.
- `modal.Image`: install only the HTTP, parser, browser, or crawler packages
  required for the selected path.
- `modal.Secret`: inject Decodo API tokens, proxy username/password, database
  credentials, and destination write keys. Prefer named secrets created through
  the dashboard or `modal secret`; avoid inline `from_dict` examples for real
  credentials.
- `modal.Retries`: retry transient network, upstream, and rate-limit failures
  with bounded exponential backoff.
- `modal.Volume`: persist batch artifacts, raw HTML snapshots, normalized JSON,
  CSV exports, screenshots, or debug bundles that are safe to store.
- `modal.CloudBucketMount`: write larger durable objects to managed object
  storage when artifacts must outlive the app or integrate with another system.
- `modal.Queue`, `modal.Dict`, or a project database: coordinate idempotent jobs,
  dedupe URLs, track attempts, and store scrape status.
- `modal.Cron` or `modal.Period`: schedule ingestion only after the workflow has
  bounded rate limits and idempotent writes.

## Secret And Token Boundaries

Keep Decodo and destination credentials out of user-visible and artifact-visible
surfaces:

- Use `modal.Secret` for `DECODO_API_TOKEN`, proxy username/password, endpoint
  credentials, and downstream write tokens.
- Do not put Decodo tokens in rendered pages, Playwright route handlers that echo
  headers, browser console logs, screenshots, HAR files, traces, CSV/JSON
  artifacts, or persisted debug bundles.
- Do not print full request URLs when credentials are embedded in proxy URLs.
  Redact usernames, passwords, API tokens, cookies, authorization headers, and
  session IDs before logging.
- Keep proxy URLs inside the server-side Modal container. Never send them to a
  browser page or frontend client.
- Prefer explicit redaction helpers around request/response logging. Log job IDs,
  target hostnames, response classes, attempt numbers, and artifact keys instead
  of credential-bearing values.
- Confirm Modal workspace, environment, secret name, storage destination, and
  downstream database before remote mutations or production runs.

## HTTPX And Web Scraping API First

Use direct HTTPX or Decodo Web Scraping API when the result can be expressed as a
single request or a small set of request payloads:

- Build the Decodo request from server-side inputs: target URL, method, headers,
  extraction options, geography, and render settings.
- Set connect/read/write/pool timeouts explicitly. Avoid unbounded calls.
- Use bounded retries with jitter or exponential backoff for transient failures.
- Treat target URL plus normalized options as the idempotency key. Store it with
  the output row or artifact manifest.
- Make writes idempotent: upsert by source URL, content hash, external ID, or
  workflow job ID instead of appending duplicate rows on retry.
- Limit concurrency per target domain, Decodo plan, and downstream database.
- Preserve enough metadata for operators: source URL, fetch timestamp, status,
  content hash, parser version, Decodo mode, and sanitized error class.

When HTTPX uses environment proxy variables, set them only inside the Modal
function and only for libraries that intentionally read them. If a library
supports an explicit proxy argument, prefer that over broad process-level
environment variables. Disable ambient environment use for calls that should not
go through the proxy.

## Proxy Env Vars

Proxy environment variables can be useful for libraries that only support
standard process proxy settings, but they widen the blast radius.

Use them only when all of these are true:

- The credentials come from `modal.Secret`.
- The target library documents support for `HTTP_PROXY`, `HTTPS_PROXY`, or
  equivalent settings.
- The function does not make unrelated calls that could accidentally route
  through the proxy.
- Logging redacts process environment, proxy URLs, request headers, and exception
  messages.
- Tests or dry runs confirm credentials are not emitted to logs or artifacts.

Do not set proxy env vars at image build time, in checked-in files, in frontend
runtime configuration, or in reusable images shared by unrelated functions.

## Browser And Crawler Fallbacks

Use Playwright, Crawlee, Scrapy, or another crawler only when direct API or HTTPX
requests do not model the job:

- Use Playwright for JavaScript rendering, browser state, screenshots, login
  journeys, anti-bot behavior that requires a browser context, or DOM-only data.
- Use Crawlee when crawling semantics matter: queueing, request labels,
  autoscaled crawling, session handling, and parser routing.
- Use Scrapy when the workload benefits from spider structure, item pipelines,
  middleware, feed exports, and mature crawl controls.
- Keep browser traces, videos, screenshots, and HAR files disabled by default.
  Enable them only for short debug runs and redact before persistence.
- Store browser state server-side only, and avoid sharing storage state across
  projects or customers unless that is an explicit product requirement.
- Bound browser concurrency harder than HTTP workers. Browsers consume more CPU,
  memory, file descriptors, and upstream quota.

Browser fallback does not change the credential rule: Decodo tokens and proxy
credentials stay in the Modal container, not in page JavaScript, browser console
output, DOM attributes, downloaded files, or client-visible network payloads.

## Persistence Choices

Choose one durable output path before scheduling or scaling:

- `modal.Volume`: batch artifacts, compact raw captures, parser outputs, and
  debug bundles that stay inside Modal.
- `CloudBucketMount`: large raw objects, image captures, HTML archives, and data
  lake handoff.
- Project database: normalized records, crawl manifests, status rows, dedupe
  keys, and operator-visible outcomes.
- Explicit external storage API: when another system owns the artifact lifecycle.

Each persisted artifact should have a manifest that records source URL, run ID,
attempt count, parser version, content hash, safe storage key, and redaction
status. Never persist raw credentials as part of the manifest.

## Reliability Defaults

- Timeout every network call and every Modal function.
- Retry only transient failures: timeouts, connection resets, selected upstream
  429/5xx responses, and Decodo retryable errors.
- Do not retry permanent failures such as invalid credentials, unauthorized
  targets, malformed requests, parser schema mismatches, or blocked workflow
  policy decisions.
- Use bounded `modal.Retries` on the function and application-level retry logic
  only when both layers are intentional.
- Make the worker idempotent so retries do not duplicate database writes,
  uploaded artifacts, notification sends, or accepted operator actions.
- Add rate limits per target domain, Decodo account, project environment, and
  downstream write destination.
- Keep dead-letter output for failed jobs that need operator attention, with
  sanitized errors and enough context to rerun safely.

## Routing Checklist

Before proposing or generating a Modal Decodo workflow, answer:

- Is scraping allowed for the target source and workflow?
- Is direct HTTPX enough, or is Decodo Web Scraping API needed?
- Are proxy env vars truly required, or can the library use an explicit proxy
  option?
- Is browser or crawler fallback required by rendering, state, or crawl
  semantics?
- Which `modal.Secret` names will be used, and who owns them?
- Where will outputs be stored: `modal.Volume`, `CloudBucketMount`, project
  database, or explicit external storage?
- What is the idempotency key?
- What are the retry, timeout, concurrency, and rate-limit bounds?
- Which logs and artifacts need redaction before persistence or sharing?
