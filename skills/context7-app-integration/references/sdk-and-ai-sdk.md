# Context7 SDK And AI SDK APIs

This reference is verified against the published TypeScript declarations for `@upstash/context7-sdk@0.3.1` and `@upstash/context7-tools-ai-sdk@0.2.4` from the upstream `upstash/context7` package source.

## Direct SDK

Use the direct SDK when application code needs a controlled two-step lookup:

```ts
import { Context7, Context7Error } from "@upstash/context7-sdk";

const context7 = new Context7();
const libraries = await context7.searchLibrary(
  "React useEffect cleanup behavior",
  "react"
);
const docs = await context7.getContext(
  "React useEffect cleanup behavior",
  libraries[0].id
);
```

- `Context7` is the client.
- `searchLibrary(query, libraryName)` resolves library candidates.
- `getContext(query, libraryId)` fetches documentation; use `{ type: "txt" }` only when plain text is intentionally needed.
- Catch `Context7Error` separately. Treat a non-JSON response body, HTML login page, or malformed response as a failed lookup: retain only a redacted status/error summary and do not render or parse it as documentation.

Use one concept per `searchLibrary`/`getContext` pair. Keep interacting APIs in the same query only when their interaction is the concept under investigation.

## Vercel AI SDK Tools

Use `resolveLibraryId` and `queryDocs` with `generateText` or `streamText` when the model should select and call Context7 tools:

```ts
import { resolveLibraryId, queryDocs } from "@upstash/context7-tools-ai-sdk";
import { generateText } from "ai";

const result = await generateText({
  model,
  prompt: "Explain one React useEffect cleanup concept.",
  tools: { resolveLibraryId: resolveLibraryId(), queryDocs: queryDocs() }
});
```

The same tools can be supplied to `streamText`. Bound tool-loop steps and keep the prompt to one documentation concept; record the selected library ID rather than copying raw tool output into logs.

## Context7 Agent

`Context7Agent` is the preconfigured AI SDK agent for the resolve-then-query workflow. Use it only when its multi-step tool loop fits the application; otherwise keep explicit control with `resolveLibraryId` and `queryDocs`.

Do not place API keys, device codes, raw non-JSON response bodies, or full upstream error payloads in prompts, telemetry, or user-visible errors.
