---
name: decodo-proxy-ops
description: Choose and troubleshoot Decodo residential proxies, datacenter proxies, rotations, sticky sessions, geolocation, and proxy health checks.
---

# Decodo Proxy Ops

Use this skill when proxy behavior is central to the task.

## When to use

- The user asks about residential proxies, datacenter proxies, rotation, sticky sessions, SOCKS5, HTTP(S), geo targeting, or proxy health.
- A scraper has blocks, wrong geography, session contamination, or inconsistent results.
- The user needs safe proxy defaults before browser or API scraping.
- The workflow needs cost and concurrency guidance for proxy-backed scraping.

## When not to use

- Do not use proxies to bypass access controls, paywalls, account restrictions, or legal limits.
- Do not use this as the first option when Decodo MCP/API managed scraping can solve the task.
- Do not optimize for high-volume force-through behavior.
- Do not support purchase automation, queue manipulation, or ecommerce checkout flows.

## Preferred Decodo surface

- Prefer Decodo MCP/API managed scraping first.
- Use proxy configuration when a browser, Scrapy, SDK/API, or external app needs explicit proxy routing.
- Use scripts such as proxy doctors or rotation smoke checks only in dry-run by default.
- Use live proxy checks only when the user explicitly allows network use and credentials are available.

## Inputs

- Target site or workflow category.
- Required country, state/region, city, language, and device context.
- Session model: single sticky session, rotating per request, rotating per task, or fixed debug session.
- Proxy protocol and credential source, without exposing values.
- Maximum concurrency and request ceiling.

## Output contract

- Recommend a proxy strategy with pool type, rotation model, sticky-session needs, geo settings, and backoff policy.
- State cost/rate assumptions and when premium or JavaScript rendering modes are likely unnecessary.
- Provide redacted config examples only.
- Identify when the request should stop for compliance, missing rights, or unsafe intent.

## Proxy Strategy

- Residential proxies are for location-sensitive, block-prone, or consumer-web flows where legitimacy and cost are understood.
- Datacenter proxies are for cheaper, lower-risk, less block-prone workflows.
- Sticky sessions are for stateful flows; rotation is for independent requests.
- Keep concurrency low by default and add exponential backoff before changing pools.
- Use separate sessions per workflow to avoid cross-task contamination.

## Compliance limits

- Use Decodo only for lawful, legitimate research or commercial purposes.
- Do not scrape private, auth-gated, paywalled, or sensitive personal data without rights and lawful basis.
- Do not help with fraud, harassment, spam, malware, DoS, unauthorized access, credential abuse, or purchase automation.
- Preserve source URLs and timestamps for research outputs.
- Keep Amazon/ecommerce workflows out of active V1.

## Failure modes

- Proxy credentials are missing, malformed, expired, or accidentally logged.
- Wrong geo pool causes mismatched results.
- Rotation breaks session-dependent flows.
- Sticky sessions preserve bad state or contaminated cookies.
- Concurrency causes blocks, timeouts, or cost spikes.

## Debug artifacts

- Redacted proxy configuration summary.
- Session and rotation decision record.
- Geo verification result.
- Request ceiling and concurrency setting.
- Sanitized block, timeout, or authentication error.

