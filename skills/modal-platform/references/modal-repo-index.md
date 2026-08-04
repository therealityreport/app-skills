# Modal Repository Index

Last reviewed: 2026-05-28.

Use this to decide when Modal GitHub repositories should influence guidance. Official Modal docs remain the contract source for public API and CLI behavior.

## Buckets

| Repo | Priority | Add As | Bucket | Use When | Do Not Use When | Evidence Source |
|---|---|---|---|---|---|---|
| [`modal-labs/modal-client`](https://github.com/modal-labs/modal-client) | P0 | existing reference | primary | Python SDK, JS/TS SDK, Go SDK, setup, package requirements, client/runtime boundaries | Exact API signatures are needed; open official docs first | README says the Python SDK requires Python 3.10-3.14 and points to guide, examples, and API reference |
| [`modal-labs/modal-examples`](https://github.com/modal-labs/modal-examples) | P0 | existing reference | primary | A user asks for runnable examples, project shape, or example categories | A user needs exact API defaults; use official reference | README describes guided example folders and `modal run` usage |
| [`modal-labs/credential-injection`](https://github.com/modal-labs/credential-injection) | P0 | existing reference | specialized | Sandbox credential-injecting egress proxy patterns | General secret usage; use `modal.Secret` docs first | `pyproject.toml` describes `modal-cred-proxy` as a credential-injecting egress proxy for Modal sandboxes |
| [`modal-labs/networking-demos`](https://github.com/modal-labs/networking-demos) | P0 | template | specialized | Practical examples for connecting to Modal containers | Public API guidance or security policy decisions | README describes examples for connecting to Modal containers |
| [`modal-labs/ci-on-modal`](https://github.com/modal-labs/ci-on-modal) | P0 | template | specialized | Running test suites on Modal, remote CI, GitHub Actions integration, debugging test containers with `modal shell` | User asks for Modal app runtime behavior unrelated to CI | README demonstrates a Modal App with a Function that runs `pytest`, plus GitHub Actions and `modal shell` usage |
| [`modal-labs/search-california`](https://github.com/modal-labs/search-california) | P0 | template | specialized | Geospatial/vector search apps, MongoDB Atlas integration, scheduled ingestion, embedding pipelines, FastAPI serving | Generic RAG without geospatial/search database integration | README describes a Modal plus MongoDB Atlas full-stack hybrid search app with scheduled ingestion, embeddings, database client, and web endpoints |
| [`modal-labs/modal-vibe`](https://github.com/modal-labs/modal-vibe) | P1 | existing reference | specialized | AI coding platforms, generated apps, sandbox lifecycle, React apps served through Modal Tunnels | Generic chatbot, non-sandbox web apps, or exact Sandbox API signatures | README describes a scalable AI coding platform where each generated app lives in a Modal Sandbox and is exposed through Modal Tunnels |
| [`modal-labs/vprox`](https://github.com/modal-labs/vprox) | P1 | existing reference | specialized | OIDC-authenticated egress, split tunnel VPN, static outbound networking, or WireGuard-based patterns | Normal Modal endpoint, storage, or deploy guidance | README describes split tunnel VPN behavior and Modal OIDC authentication |
| [`modal-labs/synchronicity`](https://github.com/modal-labs/synchronicity) | P1 | existing reference | specialized | Explaining sync/async wrapper behavior, `.aio`, event-loop preservation, or client ergonomics | Application-level Modal architecture unrelated to SDK internals | README explains `Synchronizer`, sync wrappers, async `.aio`, and event-loop preservation |
| [`modal-labs/asgiproxy`](https://github.com/modal-labs/asgiproxy) | P1 | new reference | specialized | ASGI HTTP/WebSocket proxy patterns, proxying requests between endpoints, or understanding small ASGI proxy implementations | Normal Modal endpoint routing or exact ASGI library syntax without current docs | README describes tools for building HTTP and WebSocket proxies for asynchronous ASGI, plus a CLI proxy server |
| [`modal-labs/open-batch-transcription`](https://github.com/modal-labs/open-batch-transcription) | P1 | template | specialized | Batch ASR, NeMo transcription, GPU batch sizing, Volume-backed model/data/result storage | General audio demos without batch throughput or Modal Volume concerns | README describes NeMo ASR batch transcription, `modal run`, GPU options, and `transcription-*` Modal Volumes |
| [`modal-labs/browserman`](https://github.com/modal-labs/browserman) | P2 | link-only | specialized | Browser automation with Modal-hosted browser/LLM components, cookie handoff, or Playwright-style remote browser experiments | Production scraping guidance, CAPTCHA bypass promises, or cleaned-up maintained examples | README says it was an internal hackathon project, notes broken DoorDash demo issues, and shows `modal deploy` / `modal serve` flows |
| [`modal-labs/devlooper`](https://github.com/modal-labs/devlooper) | P2 | link-only | specialized | Program synthesis agents, test-running loops, generated code repair, or Sandbox-backed language/framework templates | Current OpenAI Agents SDK guidance, stable production agent architecture, or exact Sandbox API syntax | README describes a program synthesis agent that runs tests in Modal Sandboxes and iterates on generated code |
| [`modal-labs/openai-agents-python-example`](https://github.com/modal-labs/openai-agents-python-example) | P2 | future MCP candidate | specialized | OpenAI Agents SDK with Modal Sandboxes, async subagent pools, coding-agent harnesses, or parallel GPU experiments | Modal API authority, budget-unbounded worker orchestration, or exact OpenAI Agents syntax without current docs | README describes an OpenAI Agents SDK harness using Modal Sandboxes, async parallel workers, and subagent sessions |
| [`modal-labs/awesome-modal`](https://github.com/modal-labs/awesome-modal) | P2 | link-only | primary | Community project discovery, pattern scouting, or broader ecosystem examples | Treating community projects as official supported guidance | README is a curated list of projects using Modal |
| [`modal-labs/stopwatch`](https://github.com/modal-labs/stopwatch) | P2 | link-only | specialized | LLM serving benchmarks on Modal, vLLM/SGLang/TensorRT-LLM throughput checks, or benchmark artifact planning | General inference serving guidance or official benchmark guarantees | README describes benchmarking vLLM, SGLang, and TensorRT-LLM on Modal and saving result/profiler artifacts |
| [`modal-labs/multinode-training-guide`](https://github.com/modal-labs/multinode-training-guide) | P2 | link-only | specialized | Distributed training, multi-GPU or multi-node examples, Lightning, nanoGPT, ResNet50, StarCoder | Normal single-node GPU jobs or generally available production guidance without checking access | README says the multi-node training product is early preview and lists distributed training examples |
| [`modal-labs/biomodals`](https://github.com/modal-labs/biomodals) | P2 | link-only | specialized | Bioinformatics and computational biology workloads: OmegaFold, minimap2, AFDesign, DiffDock, PyMOL, ANARCI, molecular dynamics | General Modal onboarding or non-biology GPU jobs | README lists Modal commands for biology tools and notes high-memory GPU needs for some workloads |
| [`modal-labs/libmodal`](https://github.com/modal-labs/libmodal) | Appendix | link-only | specialized | Migrating old JS/Go SDK references to the current `modal-client` surfaces | Starting new JS/Go work without checking `modal-client` | README says JS and Go SDKs migrated to `modal-client` |
| [`modal-labs/cni-plugins`](https://github.com/modal-labs/cni-plugins) | Appendix | link-only | appendix | Low-level container networking plugin background | Normal Modal networking or app guidance | README identifies it as CNI network plugins maintained by the containernetworking team |

## Review Rules

- Fetch lightweight files first: `README.md`, `pyproject.toml`, `package.json`, `go.mod`, and top-level docs.
- Add extra repos only when they map to an existing workflow bucket: sandboxes, networking, batch media, agents, distributed training, SDKs, examples, or operations.
- Do not clone or mirror every repo into the plugin.
- Do not copy long README content into plugin references.
- Treat community and low-level repos as context, not public Modal API authority.

## Workflow Routing

- Agents and generated apps: start with official Sandbox and Tunnel docs, then inspect `modal-vibe`.
- Batch audio: start with official batch processing, GPU, Volume, and examples docs, then inspect `open-batch-transcription`.
- Distributed training: start with GPU, CUDA, GPU metrics, and multi-node docs; inspect `multinode-training-guide` only after checking access constraints.
- Remote CI: inspect `ci-on-modal` when the user wants tests or CI runners on Modal.
- Bioinformatics: inspect `biomodals` when the user asks for biology, protein, docking, sequence, or molecular workloads.
- Geospatial/vector search: inspect `search-california` when the user asks for STAC, satellite imagery, Atlas Search, embeddings, or geospatial web apps.
- Container connectivity: inspect `networking-demos`, `vprox`, and official networking docs when the user asks how to connect to Modal containers.
- ASGI proxy patterns: inspect `asgiproxy` only after official Modal web endpoint, Tunnel, Proxy, and networking docs.
- Browser automation experiments: inspect `browserman` as link-only context, with explicit CAPTCHA, cookie, and production-readiness caveats.
- Agent sandboxes: inspect `devlooper` or `openai-agents-python-example` only after official Sandbox docs and any current OpenAI Agents SDK docs needed for exact syntax.
- LLM benchmarking: inspect `stopwatch` when the user asks for benchmark job structure, result artifacts, or profiler output planning.
