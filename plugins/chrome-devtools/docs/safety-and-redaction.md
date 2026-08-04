# Safety And Redaction

This plugin is designed to collect debugging evidence without leaking browser credentials, session state, or unrelated tab details.

## Route defaults

- Use isolated upstream Chrome sessions by default.
- Require explicit route-token ownership for profile-connected modes: `autoConnect`, `browserUrl`, and `wsEndpoint`.
- Require or strongly warn for URL allow/block policy in profile-connected modes.
- Use friendly profile labels in visible output, such as `Codex`, `TRR`, `THB`, or `openai-agent`.
- Do not expose raw profile folders, email addresses, account identifiers, or browser credential state.

## Always redact

- `Cookie`
- `Authorization`
- bearer tokens
- API keys
- CSRF tokens
- session headers
- password-like fields
- secret query parameters such as `token`, `key`, `secret`, `code`, `session`, and `auth`

## cURL generation

Redacted cURL output should keep enough structure to reproduce a request shape while removing credential material.

Allowed:

- method
- redacted URL
- safe content type
- safe request body fields
- non-secret headers

Blocked:

- cookies
- bearer tokens
- raw session identifiers
- unbounded body data
- unresolved fixture bodies

## Response metadata

Response body capture is metadata-only by default. Store status, timing, content type, byte count, and redaction status before considering body snippets.

## Live evidence bundles

Live bundles are redaction-first. Raw upstream output must be normalized through local evidence serializers before it is summarized, replayed, compared, converted to cURL, or shown as API inventory.

Bounded live evidence may include:

- Network request summaries and one bounded request detail.
- Console messages.
- DOM snapshot metadata.
- Screenshot artifacts.
- Lighthouse summary.
- Performance trace summary.

Full response bodies and full performance traces require explicit bounded capture settings. If a value is unresolved or unredacted, block it from user-facing output.

## Target preview

Target previews may show:

- safe title
- origin/path
- profile label
- recency
- match reason

Target previews must not show:

- unrelated tabs
- raw profile folders
- account identifiers
- full URLs with sensitive query strings
- browser credential state

## Upstream MCP defaults

The default upstream invocation must preserve these safety flags:

```bash
npx -y chrome-devtools-mcp@1.6.0 --isolated --experimentalPageIdRouting --redactNetworkHeaders --no-usage-statistics --no-performance-crux
```

## Heap analysis

Memory analysis has a narrower policy than ordinary live delegation:

- Do not add `--memoryDebugging` to global or external runtime configuration.
- The local memory aliases enable it only in their spawned upstream child.
- Only relative `.heapsnapshot` paths without parent traversal are accepted.
- Pagination and retaining-path depth, node, and sibling counts are bounded.
- Duplicate strings return a SHA-256 hash, a redacted preview, and count/size metadata. Original values are never returned.

Do not enable usage statistics or performance CrUX by default. Do not remove network header redaction.

## Page-exposed tools

WebMCP and third-party developer tools exposed by a page are untrusted. `@ChromeDevTools` may list them as discovery metadata, but execution is disabled by default. Do not run page-exposed tools as part of normal evidence collection.
