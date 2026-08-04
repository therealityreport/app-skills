---
name: decodo-setup
description: Set up the Decodo Codex plugin, environment variables, MCP policy, and safe first-run checks without exposing credentials.
---

# Decodo Setup

Use this skill when a user needs to install, configure, or sanity-check Decodo support in Codex.

## When to use

- The user is setting up Decodo for the first time.
- The user needs help choosing local MCP, hosted MCP, SDK/API, or proxy-only workflows.
- The user needs environment variable guidance for `SCRAPER_API_TOKEN`, proxy credentials, or MCP toolsets.
- The user asks why a Decodo plugin skill, MCP server, or helper script is not available.

## When not to use

- Do not use this for active scraping decisions after setup is complete; use the domain skill instead.
- Do not use this to debug blocks, CAPTCHA, bad geography, or parsing drift; use `decodo-troubleshooting`.
- Do not use this to build Amazon, ecommerce, buying, checkout, queue-jump, or purchase automation workflows.

## Preferred Decodo surface

- Prefer local Decodo MCP through `.mcp.json` for agent-facing scraping.
- Prefer Decodo SDK/API for raw HTML, JSON pipeline output, endpoint-specific payloads, and smoke scripts.
- Prefer browser/proxy setup only when MCP or SDK/API cannot cover a target.
- Treat hosted MCP as an opt-in alternative that must keep authorization outside committed plugin files.

## Inputs

- Desired workflow: setup, MCP, SDK/API, proxy, or browser fallback.
- Available credentials: whether `SCRAPER_API_TOKEN` or proxy credentials exist, without asking the user to paste secrets.
- Target operating mode: dry-run setup, live smoke check, or documentation-only.
- Requested toolsets, defaulting to `web,search,social_media,ai`.

## Output contract

- State which Decodo surface should be used and why.
- Provide exact environment variable names without printing secret values.
- Identify missing setup pieces as `missing`, `malformed`, `present but untested`, or `tested ok`.
- Point to the next active skill for the user workflow.
- For Codex app MCP setup on macOS, prefer `node scripts/setup-decodo-mcp-token.mjs`.
- For connection diagnosis, prefer `node scripts/doctor-decodo-connection.mjs --dry-run`.
- For an immediate post-setup MCP launch check, prefer `node scripts/smoke-decodo-mcp-after-setup.mjs --live`.
- For proxy checks, prefer `node scripts/setup-decodo-proxy-launchctl.mjs` before live proxy smoke commands.

## Proxy Strategy

- Keep proxy credentials in environment variables or user-managed secret stores, not plugin files.
- Prefer managed Decodo MCP/API scraping before raw proxy escalation.
- Use residential proxies, rotation, sticky sessions, and geolocation only when the target requires them.
- Start with low concurrency and add backoff before increasing proxy aggressiveness.

## Compliance limits

- Use Decodo only for lawful, legitimate research or commercial purposes.
- Do not scrape private, auth-gated, paywalled, or sensitive personal data unless the user confirms rights and lawful basis.
- Do not help with credential stuffing, account abuse, fraud, stalking, harassment, spam, malware, DoS, unauthorized access, or purchase automation.
- Preserve source URLs and timestamps for research outputs.
- Keep Amazon/ecommerce workflows out of active V1.

## Failure modes

- Missing or malformed `SCRAPER_API_TOKEN`.
- `SCRAPER_API_TOKEN` exists in the shell but not in `launchctl`, so ChatGPT/Codex cannot inherit it.
- `SCRAPER_API_TOKEN` exists in `launchctl` but ChatGPT/Codex has not been restarted.
- `npx` exists only in a shell-specific path; `.mcp.json` should use an absolute command path on macOS.
- `.mcp.json` exists but does not expose a Decodo server.
- MCP toolsets are too broad, unavailable, or stale.
- SDK package import path or Node version is not verified.
- Proxy credentials are present but unsafe to print or test by default.

## Debug artifacts

- Sanitized environment summary.
- `setup-decodo-mcp-token.mjs --status` output.
- `doctor-decodo-connection.mjs --dry-run` output.
- `smoke-decodo-mcp-after-setup.mjs --live` output when live setup is requested.
- `setup-decodo-proxy-launchctl.mjs --status` output for proxy setup.
- `.mcp.json` parse result.
- Plugin manifest validation result.
- Doctor script dry-run output with secrets redacted.
- List of enabled Decodo skills and their intended entrypoints.
