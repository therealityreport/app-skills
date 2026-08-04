# Context7 Privacy

## Query Sanitization

Before using MCP or CLI lookup, rewrite the user request into a docs query that keeps only what the docs service needs:

- Library, package, framework, service, or CLI name.
- Version or runtime if relevant.
- The specific API, command, configuration, error class, or migration topic.
- Publicly safe error text after removing secrets and local identifiers.

Remove:

- API keys, tokens, passwords, session IDs, cookies, and private URLs.
- Customer names, private project names, proprietary feature details, and business data.
- Absolute local paths unless the path itself is the subject of local troubleshooting.
- Full source files, large stack traces, or unrelated chat context.

## Secrets Rule

Never write secret values to plugin files, skill files, logs, examples, or validation output.

It is acceptable to reference environment variable names, such as `CONTEXT7_API_KEY`, but never include a real value.

## Attempt Limits

Use no more than 3 docs lookup attempts per user question unless the user explicitly asks for deeper research.

Count each of these as one attempt:

- A `resolve-library-id` query.
- A docs query with a selected library ID.
- A CLI lookup.
- A retry with alternate package spelling.

Stop early if the fetched docs answer the question.
