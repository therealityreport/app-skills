# Context7 Advanced Plugin Terms

This plugin is local packaging around MIT-licensed upstream Context7 tooling. It helps Codex route documentation questions to Context7 MCP or CLI lookup, but it does not change the license terms of Context7, Upstash packages, package-manager dependencies, or any documentation returned by upstream services.

Use this plugin for local development and documentation research. Review retrieved examples and generated code before shipping them, especially when the answer depends on package versions, service limits, authentication, or cloud-provider behavior.

Upstream project and service terms may apply when using Context7 or Upstash-hosted functionality:

- Context7 upstream: `https://github.com/upstash/context7`
- Upstash terms: `https://upstash.com/terms`
- Upstash privacy: `https://upstash.com/privacy`

If a project has its own compliance requirements, treat Context7 queries as outbound documentation lookups and avoid including source code, secrets, personal data, or proprietary content in the query.

Interactive device authorization requires an attended user session. This plugin must not automate browser confirmation, store device codes, or represent an unconfirmed authentication prompt as approved.
