# Decodo TypeScript SDK

Verified date: 2026-05-28

Repo: https://github.com/Decodo/sdk-ts

## Use In This Plugin

- Skill owner: `skills/decodo-sdk-api/SKILL.md`
- Tool helper: `tools/decodo-sdk-runner/`
- Smoke wrapper: `scripts/smoke-decodo-sdk.mjs`

## Role

Use the SDK for typed local helpers, endpoint/version exploration, schema-safe examples, and raw/structured outputs that are not confirmed through MCP.

NPM check on 2026-05-28:

- Package: `@decodo/sdk-ts`
- Version observed: `2.0.1`
- Node requirement observed: `>=18.0.0`
- Module type observed: ESM with CJS export also available.

## Guardrails

- Do not vendor the SDK source.
- Import from the published package after Phase 0 verifies the current package name and API.
- SDK import checks should succeed without credentials.
- Networked SDK calls must require explicit live mode.
