# Decodo Proxy Patterns

Verified date: 2026-05-28

Repo: https://github.com/Decodo/Decodo

## Use In This Plugin

- Skill owner: `skills/decodo-proxy-ops/SKILL.md`
- Troubleshooting owner: `skills/decodo-troubleshooting/SKILL.md`

## Topics

- Residential vs datacenter proxies.
- HTTP(S) and SOCKS5 configuration.
- Username/password proxy auth.
- Rotation vs sticky sessions.
- Geolocation choice.
- Concurrency and backoff.
- Cost-sensitive use of premium proxy pools and JavaScript rendering.

## Guardrails

- Do not print proxy URLs with embedded credentials.
- Prefer Decodo managed API/MCP scraping before raw proxy escalation.
- Use sticky sessions for continuity-sensitive workflows and rotation for independent public fetches.

