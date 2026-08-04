---
name: context7-troubleshooting
description: Debug Context7 MCP, CLI, schema, quota, and docs lookup failures with bounded retries, local evidence, and safe fallback behavior.
---

# Context7 Troubleshooting

Use this skill when Context7 docs lookup, MCP startup, CLI execution, schema validation, authentication, or quota behavior fails.

## Workflow

1. Capture the exact command or MCP operation and full redacted error.
2. Inspect local evidence first: plugin files, wrapper scripts, package command, environment presence, and validation output.
3. Retry at most once for the same substantive error. Stop after two identical failures.
4. Identify 3 to 5 plausible causes before editing.
5. Apply the smallest evidence-backed fix and rerun the failing check.
6. Use CLI fallback when MCP is unavailable, and disclose it.
7. For login/session failures, distinguish a device-authorization session from a `CONTEXT7_API_KEY`; never delete XDG state or print either credential as a first repair.

## References

- Read [references/errors.md](references/errors.md) for common failure triage.
- Read [references/schema-mismatch.md](references/schema-mismatch.md) for MCP and plugin schema issues.
- Read [references/quotas.md](references/quotas.md) for rate limits and live lookup constraints.
