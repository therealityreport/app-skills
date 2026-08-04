# Modal SDK Internals

Source repositories:

- `modal-labs/modal-client`
- `modal-labs/synchronicity`
- `modal-labs/libmodal`

Official docs remain the API contract. Use this file only when SDK source context helps explain behavior.

## Python SDK

- The `modal-client` README identifies the Python SDK as the supported local entrypoint for on-demand serverless cloud compute from Python.
- Current README evidence says the Python SDK requires Python `3.10` through `3.14`.
- Setup can be done with package install plus `python3 -m modal setup`, but exact setup guidance should still be checked against official docs and `modal setup --help`.

## JavaScript, TypeScript, And Go SDKs

- `modal-client` hosts JS/TS and Go SDK surfaces.
- `libmodal` is migration context, not the first source for new work. Its README says JS and Go SDKs migrated to `modal-client`.
- For new Go work, prefer current `modal-client/go` guidance over legacy `libmodal/modal-go` imports.

## Sync And Async Behavior

- `synchronicity` explains the sync/async wrapper pattern used in SDK-style libraries.
- The important concept is that wrapped objects can expose synchronous behavior while retaining async access through `.aio`.
- Use this context when a user is confused by synchronous Modal calls, async Modal calls, generators, context managers, or event-loop preservation.

## Routing Guidance

- For exact public method names and signatures, use `modal-api-index.md` and official docs.
- For CLI setup and identity commands, use `modal-cli-index.md`.
- For implementation details, source-code archaeology, or migration questions, use GitHub after opening this file.
