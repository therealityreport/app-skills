---
name: modal-platform
description: Use when Modal is the chosen compute platform for Python cloud jobs, web endpoints, GPU workloads, schedules, sandboxes, images, volumes, secrets, queues, or Modal CLI workflows.
---
# Modal

Use this after Modal is already the chosen platform.

## Route First
- Guide pages: `references/modal-guide-index.md`
- API primitives: `references/modal-api-index.md`
- CLI commands: `references/modal-cli-index.md`
- Workload patterns: `references/modal-workflow-patterns.md`
- Repo routing: `references/modal-repo-index.md`
- Capability matrix: `references/modal-capability-matrix.md`
- SDK internals: `references/modal-sdk-internals.md`
- Networking/security: `references/modal-networking-security.md`
- Decodo/proxy scraping: `references/modal-decodo-patterns.md`
- Adjacent tools: `references/modal-adjacent-tools.md`
- P0 repo prompt snippets: `references/modal-p0-prompt-snippets.md`
- Examples and prompts: `examples/catalog.md`, `examples/templates.md`
- Docs refresh: `references/modal-doc-refresh.md`
- Browser image and release workflow: `references/modal-operations-workflow.md`
- Exact current behavior: refresh from `https://modal.com/llms.txt`.

## Preflight
Confirm surface, state, operator workflow, completion policy, and workspace/profile/environment/app/secret names before designing or mutating anything.

Stop if Modal is not the platform owner. Use platform-evaluation for undecided platforms and debugging skills for active incidents.

## Modal Mapping
`modal.App`; `@app.function`; `@app.cls`; `modal.parameter`; `@modal.enter`; `@modal.method`; `@modal.exit`; `@modal.fastapi_endpoint`; `@modal.asgi_app`; `@modal.wsgi_app`; `@modal.web_server`; `modal.Cron`; `modal.Period`; `modal.Image`; `modal.Secret`; GPU/CPU/memory/disk; `modal.Volume`; `modal.CloudBucketMount`; `modal.Dict`; `modal.Queue`; `modal.Sandbox`; `modal.SandboxSnapshot`; `modal.Retries`; `@modal.concurrent`; `@modal.batched`; `modal.Proxy`; `modal.forward`.

## Operator Safety
- Apply the active project's Modal completion rule when present.
- Without a project rule, ask before remote deploys or mutations.
- Confirm destructive, overwriting, production, profile, workspace, or environment changes.
- Never reuse another project's Modal resources without explicit approval.

## Focused Routes

- Use `$modal-browser-runtime` for browser dependency pins, image invalidation,
  asset installation, launch proof, telemetry, or browser-image rollback planning.
- Use `$modal-release-operations` for a generic pre-deploy history snapshot,
  deploy/readiness plan, time-bounded logs, canary, app-ID rollback preview, or
  evidence receipt.

## Completion Contract
Return:
1. `scope_statement`
2. `modal_primitives_selected`
3. `deployment_surface`
4. `state_and_storage_plan`
5. `secrets_and_runtime_config`
6. `observability_and_debug_plan`
7. `validation_or_operator_commands`
8. `project_completion_policy_applied`
9. `remote_mutation_confirmations_needed`
10. `residual_risks`
