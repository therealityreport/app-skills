# Context7 CLI Auth

## Device Authorization

For an interactive Context7 account session, run the current CLI in an attended terminal:

```bash
npx -y ctx7@0.5.5 login
```

The CLI's device authorization flow displays a verification location and short-lived device code. Open the location yourself and complete the account flow there. Do not paste the URL, device code, session output, or browser cookies into chat, source, logs, or plugin configuration.

Use `ctx7 logout` to remove the local CLI session. It does not revoke, print, or alter `CONTEXT7_API_KEY`.

Use `ctx7 login --no-browser` when the attended terminal must not launch a browser automatically. Use `ctx7 whoami` to check sign-in state without printing credentials.

## Environment Variables

Use environment variables for credentials. Do not write credential values into files.

Allowed to mention by name:

```text
CONTEXT7_API_KEY
```

Never print, commit, log, or paste the value.

## Safe Checks

To check whether a variable is present without exposing it:

```bash
test -n "${CONTEXT7_API_KEY:-}" && echo "CONTEXT7_API_KEY is set" || echo "CONTEXT7_API_KEY is not set"
```

Do not use `env`, `printenv`, shell tracing, or debug logs that might reveal secrets.

## XDG State

Context7 CLI state follows XDG locations. If a login appears stale, first inspect whether `XDG_CONFIG_HOME`, `XDG_STATE_HOME`, or `XDG_CACHE_HOME` is intentionally set. When unset, the paths are:

- config credentials: `~/.config/context7/credentials.json` (`0600`)
- update state: `~/.local/state/context7/cli-state.json`
- cached previews: `~/.cache/context7/previews/`

Do not delete those paths as routine troubleshooting; use `ctx7 logout`, then sign in again only when an attended session is appropriate. If credentials permissions differ from `0600`, correct only that file after confirming it is the Context7 credentials file.

## Auth Failures

For authentication errors:

- Confirm the variable is set without printing it.
- Confirm the command is using the expected shell environment.
- Retry once after fixing environment propagation.
- Stop after a repeated identical auth failure and report the exact command and redacted error.
