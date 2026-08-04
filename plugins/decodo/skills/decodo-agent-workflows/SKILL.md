---
name: decodo-agent-workflows
description: Load Decodo agent workflow specs from agents/ and apply them through active Codex skills instead of treating agents/ as an auto-loaded plugin surface.
---

# Decodo Agent Workflows

Use this skill when the user asks for a Decodo research, social-listening, rank-tracking, proxy-ops, or scraper-debugging agent.

## Important loading rule

Files under `agents/` are workflow specs, not auto-loaded Codex plugin components. Codex uses them only when an active skill reads or references them. This skill is the primary entrypoint that maps agent specs to active skills.

## Agent mapping

| Agent spec | Owning active skill | Supporting skills |
|---|---|---|
| `agents/decodo-research-agent.md` | `decodo-agent-workflows` | `decodo-mcp-scraping`, `decodo-sdk-api`, `decodo-proxy-ops` |
| `agents/decodo-social-listening-agent.md` | `decodo-reddit-news-visual` | `decodo-agent-workflows`, `decodo-proxy-ops`, `decodo-troubleshooting` |
| `agents/decodo-rank-tracking-agent.md` | `decodo-serp-rank-tracking` | `decodo-agent-workflows`, `decodo-sdk-api`, `decodo-proxy-ops` |
| `agents/decodo-proxy-ops-agent.md` | `decodo-proxy-ops` | `decodo-agent-workflows`, `decodo-troubleshooting` |
| `agents/decodo-scraper-debug-agent.md` | `decodo-troubleshooting` | `decodo-agent-workflows`, `decodo-browser-scrapy`, `decodo-proxy-ops` |

## When to use

- The user explicitly asks for a Decodo agent workflow.
- The task needs a structured role, inputs, outputs, allowed surfaces, and stop conditions.
- A Decodo workflow crosses multiple active skills.
- The user wants repeatable research, social listening, rank tracking, proxy operations, or debugging behavior.

## When not to use

- Do not use this when a single domain skill is enough.
- Do not assume files in `agents/` are callable tools or plugin components.
- Do not run agent workflows that require unsupported targets, unsafe access, or purchase automation.
- Do not create Amazon/ecommerce active workflows in V1.

## Preferred Decodo surface

- Use the owning active skill to choose MCP, SDK/API, browser/Scrapy, scripts, or references.
- Prefer Decodo MCP for agent-facing retrieval when the needed toolset is verified.
- Prefer SDK/API for raw, structured, endpoint-specific, or scheduled outputs.
- Prefer scripts only when a skill names the script and its dry-run/live behavior is understood.

## Inputs

- Requested agent name or workflow goal.
- Target URLs, queries, keywords, subreddits, images, proxy symptoms, or error logs.
- Output format and acceptable live network scope.
- Compliance context and ownership/lawful-basis confirmation when needed.

## Output contract

- Name the selected agent spec and owning active skill.
- Summarize the workflow steps without exposing secrets.
- Return the requested report, decision record, troubleshooting path, or stop reason.
- State which Decodo surfaces were allowed and which were not used.

## Proxy Strategy

- Delegate proxy decisions to `decodo-proxy-ops`.
- Every agent workflow that scrapes must define whether it needs managed proxies, residential proxies, datacenter proxies, rotation, sticky sessions, or no explicit proxy.
- Use low concurrency and backoff by default.
- Stop rather than escalating proxy behavior for unsafe or unauthorized targets.

## Compliance limits

- Use Decodo only for lawful, legitimate research or commercial purposes.
- Do not scrape private, auth-gated, paywalled, or sensitive personal data without rights and lawful basis.
- Do not help with credential abuse, account abuse, fraud, stalking, harassment, spam, malware, DoS, unauthorized access, purchase automation, or queue manipulation.
- Preserve source URLs and timestamps for research outputs.
- Keep Amazon/ecommerce workflows out of active V1.

## Failure modes

- Requested agent spec does not exist.
- Agent request maps to a deferred or excluded workflow.
- The needed Decodo surface is not verified.
- Compliance context is missing for sensitive data.
- Required inputs are absent or too broad to run safely.

## Debug artifacts

- Selected agent spec path.
- Owning active skill and supporting skills.
- Surface decision record.
- Sanitized input summary.
- Stop condition or fallback recommendation.

