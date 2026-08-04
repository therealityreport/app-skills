---
name: decodo-mcp-scraping
description: Use Decodo MCP for agent-facing web, search, social, and AI scraping workflows with safe output routing and toolset checks.
---

# Decodo MCP Scraping

Use this skill when the user wants Codex to scrape or retrieve web data through Decodo MCP.

## Launch policy

- Treat Decodo MCP as on-demand. Do not add it to plugin manifest startup registration.
- Start or connect Decodo MCP only for Decodo scraping, Decodo setup/debugging, or work on Decodo plugin/code.
- For unrelated chats, keep Decodo available through skills and scripts only; do not keep `@decodo/mcp-server` running.

## When to use

- The user needs LLM-readable page content, search results, social data, or AI-search output.
- The workflow should use Decodo as a callable MCP server from Codex.
- The user needs a safe hosted-vs-local MCP decision.
- The user asks which MCP toolset should handle a scrape.

## When not to use

- Do not use MCP when the required output is raw HTML, bulk JSON, CSV, or an endpoint-specific payload; use `decodo-sdk-api`.
- Do not use MCP when the installed tool list has not been verified for the target.
- Do not use MCP to force access to private, auth-gated, or sensitive data.
- Do not use this for Amazon/ecommerce or purchase automation workflows.

## Preferred Decodo surface

- Prefer local stdio MCP with `@decodo/mcp-server` and toolsets `web,search,social_media,ai`.
- Use the plugin `.mcp.json` only as explicit launcher metadata, not as an always-on plugin registration.
- Use hosted MCP only when the user has explicitly configured authorization outside plugin files.
- Route raw HTML, JSON, CSV, and target-specific endpoint work to SDK/API.
- Route browser-specific failures to `decodo-browser-scrapy` or `decodo-troubleshooting`.

## Inputs

- Target URL, search query, social target, or AI-search prompt.
- Desired output type: markdown, screenshot, parsed search/social result, or diagnostic artifact.
- Geography, language, device, and freshness requirements when relevant.
- Whether live network use is allowed.

## Output contract

- Identify the Decodo MCP toolset and expected output shape.
- Preserve source URLs, query parameters, geography/device settings, and timestamps.
- Return concise findings plus raw artifact references when available.
- State when SDK/API fallback is required because MCP support is unverified or insufficient.

## Proxy Strategy

- Let Decodo MCP/API manage proxy details by default.
- Specify geography, device, or locale only when the task requires it.
- Do not increase concurrency to bypass blocks; use backoff and troubleshooting first.
- Escalate to explicit proxy operations only through `decodo-proxy-ops`.

## Compliance limits

- Use only for lawful, legitimate research or commercial purposes.
- Do not help with credential abuse, account abuse, scraping private data without rights, spam, harassment, malware, DoS, or purchase automation.
- Keep logs and examples free of authorization headers, tokens, proxy credentials, and `.env` values.
- Keep Amazon/ecommerce workflows out of active V1.

## Failure modes

- Decodo MCP server is not configured or not running.
- Toolset does not expose the needed target.
- Output mode is assumed but not supported by the installed MCP version.
- Target returns blocks, empty content, geo mismatch, or rate-limit behavior.
- The user requested an output that belongs to SDK/API instead.

## Debug artifacts

- MCP server configuration summary with secrets redacted.
- Verified toolset list and selected tool.
- Request settings: target, geography, language, device, and output mode.
- Sanitized error message or timeout details.
- Recommendation for SDK/API, proxy ops, or troubleshooting fallback.
