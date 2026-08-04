# Modal Prompt Templates

- Web endpoint: choose endpoint/ASGI/WSGI/web server; cover image, secrets, contract, `modal serve`, deploy, smoke, rollback.
- Batch job: cover input, fan-out/in, resources, timeout, retries, output, run, inspection, completion evidence.
- Schedule: choose `modal.Cron` or `modal.Period`; cover idempotency, state, failure handling, backfill, deploy proof.
- GPU inference: cover GPU, image, model lifecycle, cold start, batching/concurrency, endpoint, storage, cost, rollback.
- Queue: cover item schema, producer/consumer, retries, poison items, persistence, queue inspection, recovery.
- Storage: choose Volume, CloudBucketMount, external storage, or image-baked assets; cover refresh and destructive guards.
- Sandbox: cover commands, files, network/secrets boundary, lifecycle, warm pool, timeouts, validation, safety gates.
- Operations: cover profile, environment, deploy/no-op, logs, secrets, volumes, queues, schedules, endpoints, rollback.

## CI-On-Modal Smoke Job

Use when a project needs a repeatable remote check without deploying production traffic.

- Define a small `modal.App` and one `@app.function` that runs the target smoke command.
- Build the test image from pinned Python/system dependencies, not the developer shell.
- Pass only required secrets with `modal.Secret`; never bake tokens into the image.
- Include timeout, `modal.Retries`, CPU/memory, and log expectations.
- Run with `modal run` for one-off proof; wire GitHub Actions only after the command is stable.
- Report completion with command, app/function name, exit status, and key log line.

## Ingestion, Enrichment, And Endpoint Pattern

Use for `search-california`-style workflows: scheduled external collection, enrichment, database writes, and a small API/UI surface.

- Split the workflow into fetch, normalize, enrich, persist, and serve steps.
- Use `modal.Cron` or `modal.Period` only after the fetch path is idempotent.
- Keep credentials in `modal.Secret`; keep large intermediate artifacts in `modal.Volume` or external object storage.
- Make enrichment resumable by tracking source IDs, timestamps, and output version.
- Serve operator queries with `@modal.fastapi_endpoint`, `@modal.asgi_app`, or `@modal.web_server` only after state is populated.
- Validate with a one-day or one-page backfill, row/artifact count, endpoint smoke, and rollback/disable instructions.

## Batch Artifact Job

Use when outputs must be inspectable after many parallel function calls.

- Accept an explicit `job_id`; generate one only when the caller does not provide it.
- Use `modal.Volume` or `modal.CloudBucketMount` for result files and summaries.
- Write both detailed output and a compact summary file with counts, failures, timing, and source parameters.
- Use `@modal.concurrent`, `@modal.batched`, or `modal.Queue` only when the work is safe to group or parallelize.
- Add `modal.Retries`, poison-item handling, and a timeout that matches the largest expected input.
- Validate by checking the summary path, detailed artifact path, failed-item list, and Modal logs.

## Decodo/HTTPX Scrape Worker

Use when Modal should run a Decodo-backed scrape or public-data collection job.

- Prefer direct HTTPX or Decodo Web Scraping API calls before browser automation.
- Store Decodo API/proxy credentials in `modal.Secret`; never pass them through browser-visible code.
- Configure proxy environment variables only for libraries that support them predictably.
- Use Playwright, Crawlee, or Scrapy only when rendering, browser state, or crawling semantics are required.
- Persist normalized results to `modal.Volume`, `modal.CloudBucketMount`, or the project database.
- Include retries, timeout, rate-limit/backoff, idempotent output keys, and redacted logging.
- Validate with `modal run`, a small target set, artifact existence, and a check that no token appears in logs or outputs.

## Sandbox And Tunnel Lifecycle

Use for generated apps, code interpreters, and per-task worker environments.

- Start from official Sandbox, Tunnel, Secret, and restricted-code docs.
- Define sandbox lifecycle: create, warm, expose, inspect, stop, and cleanup.
- Keep user code, network access, secrets, and persisted files as separate trust boundaries.
- Use tunnels only for the minimum surface needed by the controller or preview.
- Add admin cleanup commands for stale sandboxes and leaked preview sessions.
- Validate with sandbox creation, health endpoint, tunnel reachability, cleanup, and secret redaction.
