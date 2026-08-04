# Security And Compliance

Verified date: 2026-05-28

## Purpose

This reference defines global safety, compliance, cost, and credential-handling rules for the Decodo plugin. Every active Decodo skill should include a shortened `Allowed / Not Allowed` section that points back here.

## Allowed

- Use Decodo for lawful, legitimate research or commercial purposes.
- Scrape public web data when the user has a valid reason and the target allows or reasonably supports the requested access.
- Preserve source URLs, timestamps, query parameters, geolocation choices, and output type in research artifacts.
- Prefer Decodo MCP/API managed scraping before escalating to raw browser automation or proxy troubleshooting.
- Use low concurrency, retry backoff, request ceilings, and explicit live mode for any networked check.

## Not Allowed

- Do not scrape private, auth-gated, paywalled, or sensitive personal data unless the user has rights and a lawful basis.
- Do not support credential stuffing, account abuse, fraud, stalking, harassment, spam, malware, denial-of-service, unauthorized access, or purchase automation.
- Do not help bypass access controls or force through blocks with high-concurrency proxy abuse.
- Do not add Amazon/ecommerce workflows to V1 unless the plan is explicitly revised.
- Do not store Decodo credentials, dashboard-generated credentials, proxy URLs with embedded credentials, or `.env` contents in plugin files.

## Redaction Requirements

Always redact:

- `Authorization: Basic ...`
- `SCRAPER_API_TOKEN`
- `DECODO_AUTH_TOKEN`
- Proxy URLs containing username/password.
- `username:password` pairs.
- Dashboard-generated curl credentials.
- `.env` contents.

## Cost And Rate Rules

- Treat JavaScript/headless rendering as opt-in.
- Treat premium proxy pools as opt-in.
- Keep live smoke tests under a hard request ceiling.
- Prefer dry-run checks unless the user explicitly asks for live verification and credentials are present.

