---
name: vintone-studio
description: Use when the user asks to create or edit VINTONE designs, prepare copy-first Photoshop edits, generate VINTONE edit packets, produce Computer Use handoff runbooks, or build export checklists.
metadata:
  short-description: Copy-first VINTONE planning and Photoshop runbooks
---

# VINTONE Studio

Use this skill for VINTONE design planning and Photoshop handoff work.

## Operating Rules

- Paid VINTONE assets are never bundled in this plugin.
- Treat local VINTONE paths as user-owned references, not plugin assets.
- Live Photoshop work is copy-first. Work on a confirmed copy, not the original document.
- Use Computer Use only when the active Codex session has that capability and the runbook has a clear start state, visible goal, stop conditions, proof, and rollback path.
- Stop before overwrite, deletion, upload, destructive save, unclear prompts, or any action that could affect the original asset.

## MCP Tools

- `vintone_check_setup`: check provided local paths and live-work facts without failing destructively when they are missing.
- `vintone_create_design_plan`: turn a VINTONE design idea into a practical design plan.
- `vintone_create_edit_packet`: create a copy-first edit packet with scope, safety metadata, proof, and rollback notes.
- `vintone_create_computer_runbook`: create a visible Photoshop runbook for the main Codex session to perform through Computer Use.
- `vintone_export_checklist`: create a preview or printer handoff checklist.

## Typical Requests

Use this skill when the user says things like:

```text
Use VINTONE Studio to check setup.
Create a VINTONE design plan for a vintage pizza shop tee.
Make a copy-first edit packet for this VINTONE change.
Create a Computer Use runbook for toggling one VINTONE texture in Photoshop.
Create an export checklist for this VINTONE working copy.
```

## CLI Fallback

Use the CLI when MCP tools are not loaded yet:

```bash
cd .
npm run check
node ./src/cli.mjs plan --intent "vintage seafood tee"
node ./src/cli.mjs packet --intent "change accent color" --source "/path/to/original.psb" --working-copy "/path/to/copy.psb"
node ./src/cli.mjs runbook --task "toggle one texture" --working-copy "/path/to/copy.psb"
node ./src/cli.mjs export-checklist --working-copy "/path/to/copy.psb" --format png
```
