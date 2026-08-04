---
name: decodo-sdk-api
description: Use the Decodo TypeScript SDK and API references for typed scraping helpers, raw outputs, endpoint-specific payloads, and non-MCP fallbacks.
---

# Decodo SDK/API

Use this skill when MCP is not the right fit and the workflow needs typed API behavior.

## When to use

- The user needs raw HTML, structured JSON, CSV/export-oriented output, or endpoint-specific control.
- A target is available through Decodo API examples or SDK but not verified in MCP.
- The user needs schema fixtures, payload validation, or local helper scripts.
- The user needs to record endpoint versions and target names.

## When not to use

- Do not use SDK/API when MCP provides the needed agent-facing result more directly.
- Do not write live scrape scripts without a dry-run mode and request ceiling.
- Do not vendor Decodo SDK source into this plugin.
- Do not build Amazon/ecommerce or purchase automation workflows in V1.

## Preferred Decodo surface

- Prefer Decodo TypeScript SDK for typed Node helpers when the package and import path are verified.
- Prefer direct Decodo API examples when a target has endpoint-specific behavior.
- Use MCP for markdown-oriented page retrieval and agent-facing quick scraping.
- Use browser/Scrapy only for targets that need browser runtime behavior outside Decodo managed scraping.

## Inputs

- Target type and endpoint family: web scraping, SERP, Google Lens, social, or AI target.
- Desired output mode: raw HTML, JSON, CSV-oriented data, screenshot metadata, or parsed payload.
- Endpoint path, target name, auth format, sync/async behavior, parse/headless settings, and SDK equivalent if known.
- Dry-run versus live execution permission.

## Output contract

- Produce a payload plan with endpoint path, target name, auth format, supported outputs, and sync/async behavior.
- Prefer examples that can be schema-checked without live network by default.
- Keep code snippets token-safe and free of literal credentials.
- State when endpoint/version details are unverified and must be refreshed before coding.

## Proxy Strategy

- Prefer API-managed proxy behavior before manual proxy configuration.
- Document when premium proxy pools, JavaScript rendering, geo targeting, sticky sessions, or rotation change cost or behavior.
- Keep live tests low-volume and opt-in.
- Never print proxy URLs containing usernames or passwords.

## Compliance limits

- Use only for lawful, legitimate research or commercial purposes.
- Do not assist credential stuffing, spam, harassment, malware, DoS, unauthorized access, or purchase automation.
- Do not scrape private, auth-gated, paywalled, or sensitive personal data without rights and lawful basis.
- Preserve source URLs and timestamps for research outputs.
- Keep Amazon/ecommerce workflows out of active V1.

## Failure modes

- SDK package name, import path, or Node version is stale.
- Endpoint path or target schema differs by API family.
- Output mode is assumed but unsupported.
- Authentication is missing, malformed, or accidentally logged.
- Live execution fails due to rate limits, geo mismatch, blocks, or parse drift.

## Debug artifacts

- Sanitized SDK import check result.
- Endpoint/version matrix entry.
- Redacted request fixture and expected response shape.
- Dry-run validation output.
- Live-mode request count and ceiling, when explicitly allowed.

