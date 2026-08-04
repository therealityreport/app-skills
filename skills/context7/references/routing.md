# Context7 Routing

## Use Context7

Use Context7 for questions about current behavior or syntax for:

- Libraries and frameworks, such as React, Next.js, Prisma, Tailwind, Express, Django, or Spring Boot.
- SDKs, APIs, CLIs, cloud services, hosted platforms, and MCP servers.
- Version migrations, setup steps, configuration, package-specific errors, or command options.
- Code changes where correctness depends on package docs or recent API behavior.

## Do Not Use Context7

Do not use Context7 for:

- Pure code refactors that do not depend on package behavior.
- Business logic bugs in the user's own code.
- General programming concepts.
- Code review findings that can be proven from local files.
- Secrets, credentials, private data lookup, or repository history questions.

## Resolve-First Selection

Always start with `resolve-library-id` unless the user gives an exact `/org/project` library ID.

Pick the best result by:

- Exact library or package name match.
- Description relevance to the user question.
- Source reputation, preferring High or Medium.
- Snippet count and benchmark score.
- Version match when the user named a version.

If the result set looks wrong, correct it within one resolve cycle using an alternate spelling or package name. Then use up to three concept-scoped docs queries or retries; resolution is not one of those query slots.

## MCP First, CLI Fallback

Use Context7 MCP first. If MCP tools are missing or fail, use CLI fallback when the local plugin provides it.

When falling back, say briefly:

```text
Context7 MCP was unavailable, so I used the Context7 CLI fallback.
```

Do not hide fallback behavior in high-stakes setup, migration, or debugging answers.
