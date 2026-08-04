---
name: decodo-serp-rank-tracking
description: Plan Decodo SERP scraping, rank tracking, AI Overview citation monitoring, and search feature analysis across geo, device, and locale settings.
---

# Decodo SERP Rank Tracking

Use this skill for search result monitoring and rank intelligence.

## When to use

- The user needs Google, Bing, or other SERP scraping through Decodo.
- The user wants keyword rank tracking across locations, devices, or languages.
- The user asks about AI Overview citations, SERP features, snippets, PAA, ads, discussions, or related searches.
- The workflow needs scheduling or repeated comparison guidance.

## When not to use

- Do not use this for generic page scraping; use `decodo-mcp-scraping`.
- Do not conflate AI Overview citations with Google AI Mode.
- Do not use this for ecommerce monitoring or purchase automation.
- Do not run high-volume SERP jobs without cost and request ceilings.

## Preferred Decodo surface

- Prefer Decodo MCP search toolsets when the installed tool list confirms the target.
- Prefer SDK/API for endpoint-specific SERP payloads, raw JSON, rank history, and scheduled workflows.
- Use references from `rank-tracker` for workflow shape, not as auto-loaded code.
- Use `decodo-proxy-ops` when location, rotation, or sticky-session behavior is the key issue.

## Inputs

- Keywords, brands, competitor domains, or tracked URLs.
- Search engine, country, city/region, language, device, and freshness requirements.
- Result features to monitor: organic rank, AI Overview citations, snippets, PAA, ads, discussions, local packs, or related searches.
- Output cadence: one-off report, recurring snapshot, or comparison.

## Output contract

- Define the exact SERP feature terms used in the request.
- Return a rank-tracking plan with source URLs, timestamps, geo/device/locale settings, and output fields.
- Separate AI Overview citations, Google AI Mode, and general SERP features.
- Include cost/rate controls and a maximum request count for live checks.

## Proxy Strategy

- Use geo targeting intentionally; do not infer location-sensitive ranks from a generic proxy pool.
- Use sticky sessions only when consistent search context is needed.
- Use rotation for independent keyword/location checks, with low concurrency and backoff.
- Avoid personalized account state and authenticated search sessions unless the user has a lawful basis and explicit need.

## Compliance limits

- Use only for lawful, legitimate research or commercial purposes.
- Do not target private accounts or auth-gated content.
- Do not use SERP scraping for spam, harassment, fraud, malware, unauthorized access, or purchase automation.
- Keep Amazon/ecommerce workflows out of active V1.

## Failure modes

- Search target is not available in the installed MCP tool list.
- Geo, language, or device settings are wrong or ignored.
- SERP feature names are mixed up, causing bad conclusions.
- Rank results drift due to personalization, timing, or localization.
- Request volume or premium rendering mode becomes too expensive.

## Debug artifacts

- Keyword and target matrix.
- Geo/device/locale settings.
- SERP feature definitions used.
- Timestamped source URLs and result snapshots.
- Request count and cost-control notes.

