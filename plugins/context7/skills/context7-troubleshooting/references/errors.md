# Context7 Errors

## First Capture

Record:

- Exact command or MCP method.
- Full redacted stderr or error payload.
- Working directory.
- Node, `npx`, and wrapper path.
- Whether this was MCP, CLI, or smoke-script validation.

Do not include secret values.

## Common Causes

- Missing `npx` or Node runtime.
- Wrapper script is not executable.
- Wrong package name or version.
- MCP transport mismatch.
- Network failure.
- Auth variable missing from the launched environment.
- Query too broad or wrong library ID.

## Focused Diagnostics

- GitHub skill-source errors: record the status without credentials. For `401`/`403`, run `gh auth login` or configure `GITHUB_TOKEN` in the launching environment; for `404`, verify the owner/repository and visibility; for `429`, stop and wait before retrying.
- TLS/DNS/firewall/timeout: identify the error code (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`, `ENOTFOUND`, `ECONNREFUSED`, `ETIMEDOUT`) and inspect the network or enterprise proxy. A TLS-inspecting proxy may require the organization CA through `NODE_EXTRA_CA_CERTS`; Node does not automatically consume `HTTPS_PROXY`.
- OAuth/non-JSON response: preserve only the status and a short redacted excerpt. Do not parse an HTML proxy/login page as a successful JSON token response.
- Git Bash library IDs: retry `ctx7 docs "//owner/repo" "question"` before editing the ID; the extra slash prevents path conversion.
- Enterprise auth: use the hosted HTTP route for browser OAuth or organization-managed authentication. Keep stdio for local-process/API-key operation; `--stdio` and `--oauth` are incompatible.

## Retry Rule

If the same command or workflow fails twice with the same substantive error, stop retrying. Inspect evidence and report the error before editing more.

## Fallback Rule

If MCP fails but CLI works, use CLI fallback and say so.

If both fail, answer from local evidence only and state that current Context7 docs were not verified.
