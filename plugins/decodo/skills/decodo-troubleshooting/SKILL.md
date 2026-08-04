---
name: decodo-troubleshooting
description: Diagnose Decodo auth failures, blocks, CAPTCHA, timeouts, parse drift, wrong geography, empty content, session issues, and secret redaction risks.
---

# Decodo Troubleshooting

Use this skill when a Decodo workflow fails or behaves inconsistently.

## When to use

- The user reports auth errors, proxy errors, blocked requests, CAPTCHA, timeouts, empty content, parse drift, wrong geography, or session contamination.
- A skill or agent workflow needs a stop-and-diagnose path.
- The user needs sanitized error capture or redaction checks.
- A live check failed and the root cause is unclear.

## When not to use

- Do not retry the same failing command more than twice with the same substantive error.
- Do not escalate proxy aggressiveness without evidence.
- Do not debug unsafe, unauthorized, purchase, checkout, or queue-jump automation.
- Do not fix broad plugin structure outside the Decodo troubleshooting path.

## Preferred Decodo surface

- Start with local evidence: skill used, MCP/toolset choice, SDK/API payload, proxy strategy, logs, config, and credentials presence.
- For MCP connection failures in the Codex app, run `node scripts/doctor-decodo-connection.mjs --dry-run` before changing credentials.
- Use MCP dry checks and SDK/API dry-run fixtures before live network checks.
- Use proxy doctors only with redacted output.
- Escalate to current primary Decodo/OpenAI docs when the failure involves third-party tooling or time-sensitive behavior.

## Inputs

- Exact command, workflow, toolset, or skill used.
- Sanitized error, stack trace, timeout, response status, or empty-output example.
- Target surface: MCP, SDK/API, browser/Scrapy, proxy, or agent workflow.
- Recent changes and whether live network use is allowed.

## Output contract

- Classify the issue: auth, endpoint, toolset, proxy, geo, parsing, target block, rate/cost, compliance, or unknown.
- List 3-5 plausible causes when evidence is incomplete.
- Recommend the smallest evidence-backed next fix.
- Preserve secrets by redacting tokens, authorization headers, proxy credentials, and `.env` contents.

## Proxy Strategy

- Check credential shape, geo, protocol, rotation, sticky-session state, and concurrency before changing pools.
- Prefer backoff and session isolation over force-through retries.
- Separate missing, malformed, present-but-untested, and tested-ok proxy states.
- Stop when the target or requested behavior is not allowed.

## Compliance limits

- Use only for lawful, legitimate research or commercial purposes.
- Do not debug workflows that target private, auth-gated, paywalled, or sensitive personal data without rights and lawful basis.
- Do not help with credential stuffing, account abuse, fraud, stalking, harassment, spam, malware, DoS, unauthorized access, or purchase automation.
- Keep Amazon/ecommerce workflows out of active V1.

## Failure modes

- Logs contain secrets and must be redacted before analysis.
- The same command fails twice with the same substantive error.
- ChatGPT/Codex is using stale plugin cache from a previous local version.
- The token is set in a terminal shell but not in macOS `launchctl`.
- The token is set in `launchctl` but the app has not been restarted.
- The MCP command uses `npx`, but the app process cannot find shell-only paths.
- MCP toolset assumptions are stale.
- Endpoint version or target schema is wrong.
- Browser/proxy state is contaminated or not isolated.

## Debug artifacts

- Redacted error log.
- Failing command or workflow summary.
- `doctor-decodo-connection.mjs --dry-run` output.
- `reset-decodo-plugin-cache.mjs --apply` output when stale plugin rows are suspected.
- Plugin version and active cache path, when stale UI is suspected.
- Surface and toolset decision record.
- Sanitized request fixture or proxy state.
- Evidence-backed next action and stop reason, when applicable.
