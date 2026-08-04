# Quotas And Live Lookup

## Attempt Budget

Use one library-resolution cycle followed by up to three concept-scoped documentation queries per user question unless the user explicitly asks for more research. A query retry consumes a query slot; resolution does not.

Examples that consume one of the three query slots:

- Query docs.
- CLI lookup.
- Retry of a docs query.

## Live Smoke

Default smoke tests should check help or version output only.

Run live lookup only when:

- The user approved it directly, or
- The environment variable is explicitly set:

```bash
CONTEXT7_LIVE_SMOKE=1
```

## Quota Errors

For quota or rate-limit errors:

- Stop live lookup attempts.
- Report the redacted error.
- Preserve local validation results.
- Suggest waiting, narrowing the query, or retrying with the user's approval.

## Query Narrowing

Narrow by:

- Library ID.
- Version.
- API, command, or config key.
- Exact error class after redaction.
