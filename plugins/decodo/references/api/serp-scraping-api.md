# Decodo SERP Scraping API

Verified date: 2026-05-28

Repo: https://github.com/Decodo/SERP-Scraping-API

## Use In This Plugin

- Skill owner: `skills/decodo-serp-rank-tracking/SKILL.md`
- Workflow reference: `references/workflows/rank-tracker.md`

## Terminology

- AI Overview citations: rank/SERP output.
- Google AI Mode: separate target/tool when verified.
- SERP features: snippets, PAA, ads, discussions, related searches, local packs, and related result blocks.

## Guardrails

- Record query, geo, locale, device, language, and pages for repeatability.
- Keep live rank checks bounded and low concurrency.
- Do not assume Google News support through MCP until live tool listing confirms it.

