---
name: context7-docs
description: Fetch and cite current package documentation with Context7, using resolve-first MCP lookup and compact source-grounded answers.
---

# Context7 Docs

Use this skill when the user asks for current documentation facts, examples, setup guidance, migration notes, or API behavior for a library, framework, SDK, API, CLI, or cloud service.

## Workflow

1. Sanitize the user's question into a docs-safe query with one library and one concept. Split unrelated APIs, errors, or migrations into separate lookups.
2. Run one resolve cycle with `libraryName` and the sanitized `query` unless the user supplied an exact `/org/project` ID.
3. Query docs with the selected `libraryId` and the user's full sanitized question.
4. After resolution, use up to three concept-scoped `query-docs` calls; retries consume query slots, while the resolve cycle does not. State when an answer combines more than one Context7 result.
5. If MCP fails, use CLI fallback if available and disclose the fallback.
6. Answer with the practical result first, then the relevant command, option, or API detail.

## References

- Read [references/mcp-workflow.md](references/mcp-workflow.md) for resolve and query details.
- Read [references/output-style.md](references/output-style.md) for answer format and citation behavior.
