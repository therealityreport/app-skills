---
name: context7
description: Use Context7 for current library, framework, SDK, API, CLI, and cloud-service documentation, preferring MCP lookup before CLI fallback.
---

# Context7

Use this skill when a user asks for current docs, setup, migration, API syntax, configuration, or library-specific debugging for a third-party package or service.

## Core Workflow

1. Decide whether the task is docs-dependent. Use Context7 for library, framework, SDK, API, CLI, or cloud-service questions. Do not use it for pure refactors, business logic, code review, or general programming concepts.
2. Sanitize the query before sending it. Include one library or service, one version if known, and one concrete question. Remove secrets, tokens, local-only paths, private names, and unrelated prose. Split multi-library research into separate resolve-and-query cycles.
3. Run one resolve cycle. Call Context7 MCP `resolve-library-id` with `libraryName` and the sanitized `query` unless the user supplied an exact `/org/project` ID.
4. Query docs with `query-docs` using the selected `libraryId` and the full sanitized task question.
5. After resolution, use up to three concept-scoped `query-docs` calls; retries consume those query slots, but the one resolve cycle does not. Prefer one concept per query so the result is focused and attributable. Keep interacting APIs together when the question is about their interaction.
6. If MCP is unavailable, disclose that briefly and use the CLI fallback only when available.
7. Answer from the fetched docs. State any inference separately from sourced facts.

## References

- Read [references/routing.md](references/routing.md) for when Context7 should or should not trigger.
- Read [references/privacy.md](references/privacy.md) before sending user text, repo details, or environment data to lookup tools.
