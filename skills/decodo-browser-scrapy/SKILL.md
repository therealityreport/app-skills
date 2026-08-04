---
name: decodo-browser-scrapy
description: Apply Decodo proxy and scraping patterns to Playwright, Puppeteer, Selenium, and Scrapy workflows when MCP or SDK/API is not enough.
---

# Decodo Browser Scrapy

Use this skill for browser automation or Scrapy-based scraper integration with Decodo.

## When to use

- The user needs Playwright, Puppeteer, Selenium, or Scrapy proxy setup guidance.
- A target requires JavaScript execution, delayed content, browser cookies, or middleware control.
- Existing app scrapers need Decodo proxy rotation or geo behavior.
- The user needs browser debug artifacts such as screenshots, HAR-like logs, or sanitized traces.

## When not to use

- Do not use browser automation when Decodo MCP/API can return the needed content more simply.
- Do not use browser state to access private or auth-gated content without rights and lawful basis.
- Do not use this for purchase automation, checkout automation, or queue manipulation.
- Do not treat browser examples as active tools unless a script or skill explicitly invokes them.

## Preferred Decodo surface

- Prefer MCP for straightforward agent-facing page retrieval.
- Prefer SDK/API for raw HTML, JSON, or target-specific payloads.
- Use browser/Scrapy only for JavaScript-heavy, middleware-heavy, or app-integrated scraper workflows.
- Use `decodo-proxy-ops` for proxy pool, rotation, sticky-session, and geo decisions.

## Inputs

- Framework: Playwright, Puppeteer, Selenium, Scrapy, or mixed app scraper.
- Target behavior: JavaScript rendering, delayed content, login-owned session, middleware, screenshot, or parse extraction.
- Proxy model: none, managed Decodo, explicit proxy URL, rotating, sticky, or geo-targeted.
- Debug output needed and live network permission.

## Output contract

- Recommend the smallest browser/Scrapy integration that meets the goal.
- Provide redacted proxy configuration patterns, not raw credentials.
- Define expected debug artifacts and where they should be stored or reported.
- State when the workflow should be moved back to MCP or SDK/API.

## Proxy Strategy

- Use one isolated browser context per workflow or account-owned session.
- Keep sticky sessions for stateful browser paths and rotation for independent targets.
- Do not mix cookies across unrelated targets.
- Keep headless JavaScript rendering opt-in because it increases cost and failure surface.
- Limit concurrency and use backoff before switching proxy pools.

## Compliance limits

- Use only for lawful, legitimate research or commercial purposes.
- Do not assist scraping private, auth-gated, paywalled, or sensitive personal data without rights and lawful basis.
- Do not help with fraud, credential abuse, stalking, harassment, spam, malware, DoS, unauthorized access, or purchase automation.
- Keep Amazon/ecommerce workflows out of active V1.

## Failure modes

- Proxy authentication fails in the browser runtime.
- Browser context leaks cookies or state between tasks.
- JavaScript rendering hides parse drift or empty content.
- Delayed content timing is brittle.
- Scrapy middleware conflicts with existing app settings.

## Debug artifacts

- Framework and version notes.
- Redacted proxy configuration.
- Screenshot or page snapshot path when generated.
- Sanitized console, network, timeout, or middleware errors.
- Session isolation and concurrency settings.

