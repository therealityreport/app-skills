# Docs Output Style

## Answer Shape

Use this order:

1. Practical answer in plain language.
2. Exact command, config, option, or code shape when useful.
3. Caveats, version notes, or migration differences.
4. Source disclosure and fallback disclosure when relevant.

Keep answers compact. Do not dump docs text.

## Source Grounding

When docs were fetched, say which docs result was used, such as:

```text
I used the Context7 docs result for `/vercel/next.js`.
```

If making an inference from docs, label it:

```text
Inference: this option should be set in the build command because the docs describe it as a CLI flag, not a config field.
```

## Fallback Wording

If MCP failed and CLI fallback was used:

```text
Context7 MCP was unavailable, so I used the Context7 CLI fallback.
```

If both MCP and CLI are unavailable:

```text
I could not reach Context7 from this environment. I answered from local evidence only, so current package docs were not verified.
```

## Avoid

- Long copied docs sections.
- Unsourced claims about current package behavior.
- Hiding failed docs lookup when the user asked for current docs.
- Sending private data as examples.
