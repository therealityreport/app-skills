# Target Preview

Target preview helps users confirm which browser target a dry-run command would use before any live attachment work exists.

## Safe fields

- `title`: trimmed page title.
- `origin`: scheme and host.
- `path`: path with sensitive query values removed.
- `profileLabel`: friendly profile name such as `Codex`, `Codex`, or `Codex`.
- `lastSeenAt`: recency timestamp or relative age.
- `matchReason`: why this target was selected.

## Ambiguity handling

If more than one target matches, show a bounded list of safe previews and ask the user to choose. Do not guess when two targets have similar titles, paths, or recency.

## Route tokens

Future live work must claim a target with a route token before a subagent can use it. A claim records the page ID, target ID, profile label, source route, owning agent/session, and URL policy status. The preview must still strip query strings and fragments.

Route records now include a label, owner label, TTL, expiry, evidence policy, status, and an upstream dry-run command preview. Isolated routes are the safe default. Profile-connected modes such as `autoConnect`, `browserUrl`, and `wsEndpoint` require route-token ownership, and strict profile-connected routes must include an allow/block URL policy before creation succeeds.

## Deferred live attach

This slice does not connect to Chrome, browser-use, or CDP. The preview command may describe planned adapter calls, but it must not open sockets, inspect live tabs, or mutate browser state.
