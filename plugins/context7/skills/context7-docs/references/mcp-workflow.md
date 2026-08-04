# MCP Docs Workflow

## Resolve

Call `resolve-library-id` with both:

- `libraryName`: the official library, framework, SDK, API, CLI, or cloud-service name.
- `query`: the sanitized user question or task, including the specific API, command, configuration, migration, or error when relevant.

If the user gives `/org/project`, skip resolve and use that exact ID.

Good resolve queries include:

```text
next.js app router metadata generateMetadata current docs
prisma migrate deploy shadow database error
tailwind css v4 theme tokens config
```

Avoid sending:

- Private source code.
- Secret values.
- Long chat transcripts.
- Absolute local paths that are not needed.

## Select

Choose the result that best matches:

- Name and package identity.
- The topic in the user question.
- Version, if named.
- Higher source reputation.
- Useful snippet count and score.

If two results are close, prefer official package docs over mirrors or examples.

## Query

Use `query-docs` with:

- `libraryId`: the selected Context7 library ID.
- `query`: the user's full sanitized question, including the specific version, feature, command, or error when relevant.

## Payload Examples

Resolve payload:

```json
{
  "libraryName": "React",
  "query": "React useEffect cleanup current documentation"
}
```

Query payload:

```json
{
  "libraryId": "/reactjs/react.dev",
  "query": "React useEffect cleanup current documentation"
}
```

Do not query one-word topics. Specific questions return better docs and reduce noisy answers.

## Query Budget

Use one resolve cycle, then up to three concept-scoped `query-docs` calls. A retry consumes a query slot; resolving does not. If a library result is clearly wrong, correct the library identity within the same resolve cycle before spending a query slot.

Split unrelated concepts into separate queries. Keep interacting APIs together when their behavior depends on that interaction.
