# VINTONE Studio

VINTONE Studio is a local Codex plugin shell for planning VINTONE-style Photoshop work. It helps Codex create design plans, safety-first edit packets, Computer Use runbooks, and export checklists.

## What This Plugin Does

- Checks whether local VINTONE asset paths and live-work facts have been supplied.
- Creates a plain-language design plan for a requested VINTONE edit or new concept.
- Creates a copy-first edit packet that says what may change, what must stop, and what proof is expected.
- Creates a Photoshop runbook that the main Codex session can perform through Computer Use when that capability is available.
- Creates a checklist for preview/export handoff.

## Asset Rules

Paid VINTONE files are never bundled in this plugin. The plugin must not contain `VINTONE.psb`, `VINTONE.psd`, `.pat` files, paid templates, licensed textures, or other proprietary source assets.

The user keeps licensed files in their own local folders. This plugin only records paths or missing-path diagnostics when the user provides them.

## Live Edit Rules

Live Photoshop work is copy-first. Codex must work on a confirmed copy, not the original paid source document.

Stop before any overwrite, deletion, upload, destructive save, or unclear Photoshop prompt unless the user explicitly approves that next action.

## CLI

```bash
cd .
npm run check
node ./src/cli.mjs plan --intent "retro restaurant tee"
node ./src/cli.mjs packet --intent "toggle one texture" --source "/path/to/VINTONE.psb" --working-copy "/path/to/VINTONE-copy.psb"
node ./src/cli.mjs runbook --task "toggle one texture" --working-copy "/path/to/VINTONE-copy.psb"
node ./src/cli.mjs export-checklist --working-copy "/path/to/VINTONE-copy.psb" --format png
```

The CLI is intentionally minimal for W1. Later workers can add knowledge files, safety policy modules, and richer runbook generation without changing the shell contract.

## MCP Tools

- `vintone_check_setup`
- `vintone_create_design_plan`
- `vintone_create_edit_packet`
- `vintone_create_computer_runbook`
- `vintone_export_checklist`

The MCP server uses Node built-ins only, so the W1 shell does not require `npm install`.
