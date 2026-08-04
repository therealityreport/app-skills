# Modal Adjacent Tools

Last reviewed: 2026-05-28.

Use this as a routing index for non-Modal tools that can support Modal workloads. These repos are adjacent capability references, not Modal API authority. Official Modal docs remain the source of truth for Modal primitives, signatures, defaults, limits, deployment behavior, and CLI syntax.

Do not copy library docs into this plugin. Before writing exact syntax for any adjacent tool, open that tool's current official docs plus the relevant Modal API or guide page.

## Routing Table

| Repo | Category | When It Helps Modal Work | Add As | Modal Primitive It Pairs With | Docs To Check Before Exact Syntax |
|---|---|---|---|---|---|
| `microsoft/playwright` | Browser automation | Rendered-page scraping, UI checks, login flows, or browser-backed smoke jobs that need Chromium/WebKit/Firefox behavior. | reference | `modal.Image`, `modal.App.function`, `modal.Secret`, optional `modal.Volume` | Playwright Node docs, browser install notes, and Modal Image, Secret, timeout, GPU/CPU, and storage docs. |
| `microsoft/playwright-python` | Browser automation | Python-first rendered scraping or browser tests packaged into a Modal worker. | template | `modal.Image`, `modal.App.function`, `modal.Secret`, optional `modal.Volume` | Playwright Python docs, browser install notes, and Modal Image, Secret, timeout, and Volume docs. |
| `microsoft/playwright-mcp` | MCP/browser tooling | Browser-control MCP experiments where Modal hosts or runs the browser automation boundary. | future MCP candidate | `modal.Sandbox`, `modal.Image`, `modal.App.function`, `modal.Secret` | Playwright MCP docs, MCP transport/security docs, and Modal Sandbox, networking, Secret, and Tunnel docs. |
| `browser-use/browser-use` | Agent browser control | Agentic browser workflows that need a remote browser, repeatable container image, or credential-isolated execution. | reference | `modal.Image`, `modal.App.function`, `modal.Secret`, `modal.Volume` | browser-use docs, supported browser/runtime docs, and Modal Image, Secret, Volume, timeout, and logging docs. |
| `scrapy/scrapy` | Crawling framework | Structured crawling, request scheduling, pipelines, or spider reuse where a full browser is not required. | template | `modal.Image`, `modal.App.function`, `modal.Secret`, `modal.Volume`, `modal.Queue` | Scrapy docs, feed/export settings, and Modal Image, Secret, Volume, Queue, retry, and schedule docs. |
| `apify/crawlee-python` | Crawling framework | Python crawling with queues, request handlers, and optional browser-backed crawling semantics. | reference | `modal.Image`, `modal.App.function`, `modal.Secret`, `modal.Volume` | Crawlee Python docs, browser/storage notes, and Modal Image, Secret, Volume, timeout, and retry docs. |
| `modelcontextprotocol/python-sdk` | MCP SDK | Building Python MCP servers or clients that run inside Modal functions, sandboxes, or web endpoints. | future MCP candidate | `modal.App.function`, `modal.asgi_app`, `modal.Secret`, `modal.Sandbox` | MCP Python SDK docs, transport docs, and Modal web endpoint, ASGI, Secret, Sandbox, and networking docs. |
| `modelcontextprotocol/servers` | MCP examples | Finding server patterns, tool schemas, and integration examples before creating a Modal-hosted MCP service. | link-only | `modal.asgi_app`, `modal.web_server`, `modal.Secret`, `modal.Sandbox` | MCP server docs, selected server README, and Modal ASGI, web server, Secret, and Sandbox docs. |
| `openai/openai-agents-python` | Agent orchestration | Agent workflows that call Modal functions for tools, batch jobs, retrieval, or remote execution. | reference | `modal.App.function`, `modal.Secret`, `modal.Queue`, `modal.Volume` | OpenAI Agents SDK docs and Modal Function, Secret, Queue, Volume, and deployment docs. |
| `pydantic/pydantic-ai` | Agent orchestration | Typed agent outputs, structured validation, and model-tool workflows that delegate expensive work to Modal. | reference | `modal.App.function`, `modal.Secret`, `modal.Volume` | Pydantic AI docs, Pydantic model docs, and Modal Function, Secret, storage, and logging docs. |
| `fastapi/fastapi` | Web API framework | Serving APIs, callbacks, dashboards, webhook receivers, or thin control planes from Modal. | template | `modal.asgi_app`, `modal.App.function`, `modal.Secret`, `modal.Volume` | FastAPI docs, ASGI deployment notes, and Modal ASGI, web endpoints, Secret, and Volume docs. |
| `encode/httpx` | HTTP client | API scraping, Decodo calls, webhooks, health checks, or service-to-service clients without a browser. | template | `modal.App.function`, `modal.Image`, `modal.Secret`, `modal.Retries` | HTTPX docs for clients, timeouts, retries/proxies, and Modal Secret, Proxy, Retries, and networking docs. |
| `PrefectHQ/prefect` | Workflow orchestration | External orchestration around Modal jobs, scheduled flows, retries, and operational dashboards. | reference | `modal.Function`, `modal.Cron`, `modal.Queue`, `modal.Volume` | Prefect docs for deployments/tasks and Modal Function calls, schedules, Queue, Volume, and CLI docs. |
| `astral-sh/uv` | Python packaging | Fast dependency resolution, reproducible local setup, or building Modal images from Python project metadata. | reference | `modal.Image` | uv docs for project, lock, and export behavior, plus Modal Image and dependency-install docs. |
| `Unstructured-IO/unstructured` | Document ingestion | Parsing PDFs, HTML, office docs, or mixed document batches before embedding, search, or extraction. | template | `modal.Image`, `modal.App.function`, `modal.Volume`, `modal.Secret` | Unstructured docs for partitioning/dependencies and Modal Image, Volume, Secret, GPU/CPU, and timeout docs. |

## Routing Rules

- Start with official Modal docs for the Modal API surface, then use this table to decide which adjacent tool documentation to open.
- Prefer HTTP clients and crawling frameworks before browser automation when rendering or browser state is not required.
- Treat MCP and agent repos as integration patterns until a Modal-hosted workflow proves they deserve a template.
- Keep this file as a routing index. Add runnable examples to templates only when there is a repeatable Modal workflow.

## Decision Tree

Use this tree before adding adjacent tooling to a Modal plan:

1. Can the workload be expressed as a normal Python function with direct HTTP,
   file processing, database calls, or model execution?
   - Use Modal primitives plus project dependencies. Do not add adjacent tooling.
2. Does the workload need an HTTP API surface, webhook receiver, callback, or
   operator control plane?
   - Use the web/API branch.
3. Does the workload fetch public or external web data?
   - Use the HTTP and scraping branch.
4. Does the workload require rendered pages, browser state, screenshots, or UI
   checks?
   - Use the browser automation branch.
5. Does the workload coordinate multi-step agents or expose tools to agents?
   - Use the MCP and agent branch.
6. Does the workload need external orchestration, document parsing, or Python
   packaging support?
   - Use the data pipeline branch.

If two branches apply, choose the branch that owns the riskiest boundary first:
credentials, browser state, remote code execution, public endpoint exposure, or
durable data writes.

## Web/API Branch

- Choose `fastapi/fastapi` when Modal should serve a normal API, webhook,
  dashboard backend, or thin control plane.
- Pair with `@modal.asgi_app`, `@modal.fastapi_endpoint`, `modal.Secret`, and
  storage only when the endpoint owns durable state.
- Do not add FastAPI for a one-off batch job that can run with `modal run`.

## HTTP And Scraping Branch

- Choose `encode/httpx` for direct API calls, Decodo Web Scraping API calls,
  webhooks, health checks, and service-to-service clients.
- Choose `scrapy/scrapy` when spider structure, feed exports, item pipelines,
  and mature crawl controls are the value.
- Choose `apify/crawlee-python` when queue-backed crawling semantics and
  browser-capable crawlers are useful, but keep Modal as the execution owner.
- Pair with `modal.Secret`, `modal.Retries`, `modal.Volume`,
  `modal.CloudBucketMount`, `modal.Queue`, and schedules as needed.
- Use `$modal-decodo` when Decodo credentials, proxies, or hosted scraping are
  part of the workflow.

## Browser Automation Branch

- Choose `microsoft/playwright` for Node-based browser automation.
- Choose `microsoft/playwright-python` when the worker is Python-first.
- Choose `browser-use/browser-use` only when an agentic browser loop is the core
  behavior, not just a scrape implementation detail.
- Pair with `modal.Image`, `@app.function`, `modal.Secret`, optional
  `modal.Volume`, and stricter CPU/memory/timeouts than HTTP-only workers.
- Keep traces, HAR files, videos, screenshots, cookies, and storage state out of
  durable artifacts unless explicitly needed and redacted.

## MCP And Agent Branch

- Choose `modelcontextprotocol/python-sdk` for Modal-hosted MCP servers or
  clients.
- Use `modelcontextprotocol/servers` as a pattern catalog, not an authority for
  the user's custom server.
- Choose `openai/openai-agents-python` or `pydantic/pydantic-ai` when agent
  orchestration needs Modal-hosted tools, batch jobs, retrieval, or validation.
- Pair with `modal.asgi_app`, `modal.web_server`, `modal.Sandbox`,
  `modal.Secret`, `modal.Queue`, and `modal.Volume` according to the trust and
  state model.
- Define tool permissions, secret visibility, session cleanup, and worker caps
  before deploy.

## Data Pipeline Branch

- Choose `PrefectHQ/prefect` when an external orchestrator should manage flows
  that call Modal jobs or endpoints.
- Choose `astral-sh/uv` when the practical problem is fast, reproducible Python
  dependency setup for Modal images or local development.
- Choose `Unstructured-IO/unstructured` when documents must be parsed before
  embedding, enrichment, extraction, or search.
- Pair with `modal.Image`, `modal.Volume`, `modal.CloudBucketMount`,
  `modal.Secret`, schedules, and batch templates.
- Define artifact retention, parser versioning, and rerun behavior before
  scheduling.
