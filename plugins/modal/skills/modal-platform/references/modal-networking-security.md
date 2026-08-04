# Modal Networking And Security

Use this for Modal networking, egress, OIDC, sandbox, and credential-boundary
questions. Official Modal docs remain the contract source.

For Decodo, proxy scraping, HTTPX scraping workers, Playwright/Crawlee/Scrapy
fallbacks, and token redaction rules, route to
`references/modal-decodo-patterns.md`.

## First-Party Docs To Check First

- [Proxy](https://modal.com/docs/reference/modal.Proxy)
- [Tunnel](https://modal.com/docs/reference/modal.Tunnel)
- [forward](https://modal.com/docs/reference/modal.forward)
- [Sandbox](https://modal.com/docs/reference/modal.Sandbox)
- [SandboxSnapshot](https://modal.com/docs/reference/modal.SandboxSnapshot)
- [Secret](https://modal.com/docs/reference/modal.Secret)
- [OIDC integration](https://modal.com/docs/guide/oidc-integration.md)
- [Cluster networking](https://modal.com/docs/guide/private-networking.md)
- [Tunnels](https://modal.com/docs/guide/tunnels.md)
- [Proxies](https://modal.com/docs/guide/proxy-ips.md)
- [Running untrusted code in Functions](https://modal.com/docs/guide/restricted-access.md)

## Repo-Derived Context

### `modal-labs/vprox`

Use for split tunnel VPN, static egress, WireGuard, and Modal OIDC authentication patterns.

Safety notes:

- Treat `vprox` as infrastructure-level guidance.
- It can require root access, Linux networking settings, WireGuard, and firewall changes.
- Do not suggest it for ordinary Modal endpoint routing unless static egress or VPN behavior is explicitly required.

### `modal-labs/asgiproxy`

Use for ASGI proxy patterns when a Modal app needs to bridge ASGI request
handling to another service or container boundary.

Safety notes:

- Treat it as a repo-derived implementation pattern, not a replacement for
  official Modal web endpoint, tunnel, or proxy docs.
- Keep request headers, cookies, bearer tokens, and upstream URLs redacted in
  logs and examples.
- Confirm whether the user needs ASGI request proxying, Modal Tunnels, or Modal
  Proxies before choosing this pattern.

### `modal-labs/networking-demos`

Use for practical examples of connecting to Modal containers.

Safety notes:

- Keep it as example context; use official networking docs for supported API
  behavior.
- Do not route credentialed scraping workflows here. Use
  `modal-decodo-patterns.md` for Decodo or proxy-scraping architecture.
- Confirm the connection direction and trust boundary before recommending a
  demo pattern.

### `modal-labs/credential-injection`

Use for sandbox credential-injecting egress proxy patterns.

Safety notes:

- Prefer `modal.Secret` and official sandbox docs for normal credential handling.
- Use this repo only when the user specifically needs controlled credential injection for sandboxed outbound access.
- Keep credential boundaries explicit; never inline tokens or secrets in generated code.

### `modal-labs/cni-plugins`

Use only as an appendix for low-level container networking plugin background.

Safety notes:

- This is not normal Modal app guidance.
- Do not route standard Modal networking questions here.
- If CNI work appears necessary, stop and confirm the target environment and ownership boundary.

## Operator Safety

- Confirm workspace, profile, environment, app, proxy, secret, and volume names before remote mutations.
- Ask before destructive, overwriting, production, profile, workspace, or environment changes.
- Keep untrusted code, sandbox networking, and credential injection as security design topics, not only compute topics.
