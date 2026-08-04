---
name: modal-release-operations
description: "Use when planning or reviewing safe Modal release operations: identity confirmation, deployment-history snapshots, readiness, timestamp-bounded logs, bounded canaries, app-ID rollback previews, and evidence receipts without automatic remote mutation."
---
# Modal Release Operations

Use this for generic operational planning and read-only evidence. A project adapter
must provide any project-specific target, secrets, runbooks, or MCP integration.

## Identity Before Commands

Confirm the intended workspace, profile, environment, app display name, and app ID
from an explicit read-only listing. Treat the app ID—not a mutable display description
or guessed name—as the history and rollback identifier. Capture the current deployed
version before preparing a deployment or rollback command.

## Evidence Sequence

1. Capture an identity receipt: timestamp, CLI/client version, workspace/profile,
   environment, app ID, display name, current version, and history snapshot.
2. Review the deploy strategy and state what it can replace. Do not issue deploy,
   rollback, stop, secret, profile, workspace, or environment mutations without
   explicit project authority.
3. Run or request bounded readiness and a representative no-write canary after a
   release. Include expected version/image telemetry where the project exposes it.
4. Inspect logs in a fixed time window with function/container filters when available;
   preserve startup logs as part of the receipt.
5. Produce a rollback command preview using the recorded app ID and prior version.
   The executing owner must confirm target and strategy immediately before use.

## Current Client Notes

- Modal 1.5.3 exposes programmatic `stream`, `fetch`, and `tail` log methods on
  Function, Server, and FunctionCall objects; use them where the project can safely
  authenticate and retain a CLI fallback.
- Modal 1.5.2 makes `modal container logs` include startup logs. Keep that coverage
  when parsing CLI output or investigating image/startup failures.
- Normalize lowercase JSON keys from current CLI output while retaining legacy-key
  compatibility in project parsers and fixtures.

## Receipt

Return `identity`, `pre_deploy_history`, `strategy`, `readiness`, `canary`,
`log_window`, `rollback_preview`, `mutation_authority`, and `residual_risks`.
