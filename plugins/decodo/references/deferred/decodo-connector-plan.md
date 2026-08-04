# Decodo Connector Plan

Verified date: 2026-05-28

## Status

Deferred. Do not create `.app.json` or add `"apps": "./.app.json"` to the plugin manifest until
there is a real registered Decodo connector id from the Codex/ChatGPT app connector system.

## Required Input

- Registered connector id, such as `connector_...`, issued by the connector platform.
- Connector owner and auth model.
- User-facing consent text.
- Supported actions and dashboard URLs.
- Whether the connector is private/internal or publishable.

## Promotion Checklist

- Confirm the connector id opens without 404 or `NSURLErrorDomain error -1011`.
- Add `.app.json` with only the registered connector id.
- Add `"apps": "./.app.json"` to `.codex-plugin/plugin.json`.
- Keep all Decodo API tokens and proxy credentials out of plugin files.
- Validate the plugin after adding the app mapping.
- Update the README so users know when to use the app connector versus MCP.

## Non-Goals

- Do not use placeholder ids such as `connector_decodo`.
- Do not use the app connector for MCP startup.
- Do not store Decodo tokens in `.app.json`.
- Do not add purchase automation or unsupported account actions.
