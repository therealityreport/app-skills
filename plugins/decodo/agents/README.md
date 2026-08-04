# Decodo Agent Workflow Specs

The files in this directory are workflow specs. They are not auto-loaded Codex plugin components and they do not expose tools by folder name.

Active usage path:

1. A user asks for a Decodo workflow.
2. Codex loads an active skill under `skills/`.
3. The active skill references the matching agent spec in this directory.
4. The skill executes the workflow through Decodo MCP, SDK/API, scripts, or references as allowed by the spec.

Agent specs:

- `decodo-research-agent.md`
- `decodo-social-listening-agent.md`
- `decodo-rank-tracking-agent.md`
- `decodo-proxy-ops-agent.md`
- `decodo-scraper-debug-agent.md`

Global limits:

- No purchase automation.
- No Amazon/ecommerce active workflow in V1.
- No credential stuffing, account abuse, fraud, stalking, harassment, spam, malware, DoS, unauthorized access, or private data scraping without rights and lawful basis.
- Preserve source URLs and timestamps for research outputs.
- Redact tokens, authorization headers, proxy credentials, dashboard-generated credentials, and `.env` contents.

