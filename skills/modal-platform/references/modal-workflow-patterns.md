# Modal Workflow Patterns

Use after `SKILL.md` identifies the workload shape. For syntax use `modal-api-index.md`; for commands use `modal-cli-index.md`.

## Batch Or Remote Jobs
- Use `modal.App` plus `@app.function()` for remote execution.
- Use `modal run` for one-off execution and `modal deploy` when other systems need to invoke the function later.
- Choose image, CPU, memory, disk, GPU, timeout, retries, and region.
- For high volume, check scaling, queues, dynamic batching, retries, preemption, and timeouts.

## Web Endpoints
- Use a web decorator that matches the app surface: `fastapi_endpoint` for simple FastAPI-style endpoints, `asgi_app` or `wsgi_app` for framework apps, and `web_server` for container-managed servers.
- Use `modal serve` for local iteration and `modal deploy` for stable URLs.
- Check URLs, timeouts, streaming, proxy auth, endpoint smoke, logs, rollback, and URL ownership.

## Scheduled Work
- Use `modal.Cron` for cron syntax and `modal.Period` for fixed intervals.
- Keep the schedule close to the function definition and state whether it runs only after deployment.
- Include idempotency, retries, backfill, missed-run handling, and failure notifications.

## GPU And Model Serving
- Start from GPU, CUDA, resources, model weights, cold starts, memory snapshots, inference, and GPU health docs.
- Put heavyweight dependencies in a `modal.Image`.
- Put model weights in a `modal.Volume` or cloud bucket mount when startup time or reuse matters.
- Record GPU type, concurrency, batching, timeout, warmup, cost, and rollback.

## Queues And Parallel Workflows
- Use `modal.Queue` for FIFO coordination and job-queue patterns.
- Use `@modal.concurrent` for concurrent inputs and `@modal.batched` for dynamic batching when the function can safely group work.
- Define producer, consumer, retries, poison items, persistence, backpressure, and inspection.

## Sandboxes
- Use `modal.Sandbox` for restricted code execution, command spawning, and isolated file/process work.
- Check networking, files, snapshots, Docker maturity, warm pools, and security before exposure.
- Treat untrusted code as security design, not only compute.

## State, Storage, And Secrets
- Use `modal.Secret` for environment-backed credentials.
- Use `modal.Volume` for persistent Modal storage and `modal.CloudBucketMount` for external object storage.
- Use `modal.Dict` only when lifecycle and consistency fit.
- Treat `modal.NetworkFileSystem` as legacy/superseded by `modal.Volume` unless maintaining old code.
- State whether data is ephemeral, persisted, external, or recreated.

## Images, Local Files, And Imports
- Use `modal.Image` for remote deps.
- Keep remote-only imports inside functions or image import contexts.
- Check local data/file docs before mounting paths.
- Prefer Volume or CloudBucketMount for changing large assets.

## Operations And Safe Redeploy
- Use `modal run` for smoke tests, `modal serve` for live local iteration, and `modal deploy` for production surfaces.
- Use app logs, dashboard, and resource inspection for deployed validation.
- Include rollback: previous code, disabled schedule, endpoint traffic removal, app stop/rollback, or queue drain.
- For incidents, gather logs and deployment state first.
- Apply project completion rules; otherwise ask before remote deploy or mutation.
- Confirm boundaries before using another repo's profile, env, app, secret, volume, queue, dict, or dispatch URL.
