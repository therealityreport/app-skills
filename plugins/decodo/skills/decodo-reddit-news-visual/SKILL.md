---
name: decodo-reddit-news-visual
description: Run Decodo-backed Reddit intelligence, Google News monitoring, and Google Lens visual-search workflows with source preservation and safe routing.
---

# Decodo Reddit News Visual

Use this skill for social listening, news monitoring, and visual-search scraping workflows.

## When to use

- The user needs Reddit topic, subreddit, post, comment, sentiment, or theme research.
- The user needs Google News monitoring or headline/source tracking.
- The user needs Google Lens or reverse-image visual-search extraction.
- The user needs a workflow spec from `agents/decodo-social-listening-agent.md`.

## When not to use

- Do not use this for generic web scraping; use `decodo-mcp-scraping`.
- Do not assume Google News has MCP support unless the installed tool list confirms it.
- Do not use this for private, auth-gated, paywalled, or sensitive personal data without rights and lawful basis.
- Do not use this for Amazon/ecommerce or purchase automation workflows.

## Preferred Decodo surface

- Prefer MCP social toolsets for Reddit only when verified in the installed tool list.
- Prefer SDK/API/reference workflows for Google News unless MCP support is verified.
- Prefer MCP search or SDK/API for Google Lens depending on verified target support.
- Use browser/proxy fallback only when Decodo managed surfaces cannot provide the needed output.

## Inputs

- Workflow type: Reddit, Google News, Google Lens, or combined research.
- Queries, subreddit names, URLs, image inputs, sources, geography, language, date range, and freshness needs.
- Desired output: summary, themes, source list, sentiment notes, visual matches, or export-ready rows.
- Live network permission and request ceiling.

## Output contract

- Preserve source URLs, timestamps, query terms, and target settings.
- Separate observed data from interpretation.
- Return structured findings with evidence snippets short enough to respect source limits.
- State which Decodo surface was used or why another surface is required.

## Proxy Strategy

- Use geo and language settings for news and visual search when location affects results.
- Use low concurrency and backoff for social/news workflows.
- Avoid authenticated or personalized sessions unless the user owns the account/session and has lawful basis.
- Escalate proxy issues to `decodo-proxy-ops`.

## Compliance limits

- Use only for lawful, legitimate research or commercial purposes.
- Do not deanonymize users, collect sensitive personal data, or support harassment/stalking.
- Do not bypass private communities, auth-gated content, paywalls, or access controls.
- Do not help with spam, fraud, malware, DoS, unauthorized access, or purchase automation.
- Keep Amazon/ecommerce workflows out of active V1.

## Failure modes

- Reddit, Google News, or Google Lens target is not available through the expected surface.
- Search freshness, location, or language settings cause inconsistent results.
- Image input is invalid, inaccessible, or too ambiguous.
- Social sentiment or themes are over-inferred from sparse data.
- Source timestamps or URLs are missing.

## Debug artifacts

- Query/source matrix.
- Target surface decision and verification status.
- Source URLs and timestamps.
- Geo/language/freshness settings.
- Sanitized errors, empty-result notes, and fallback recommendation.

