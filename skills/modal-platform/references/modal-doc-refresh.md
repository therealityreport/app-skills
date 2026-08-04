# Modal Docs Refresh

Source of truth: official Modal docs at `https://modal.com/llms.txt`.

Use this when exact Modal syntax, CLI names, limits, or behavior may have changed.

## Compact Index Refresh

Prefer a task-local artifact path outside the plugin tree:

```bash
mkdir -p .plan-work/modal-platform-refresh
curl -LfsS https://modal.com/llms.txt -o .plan-work/modal-platform-refresh/modal-llms.txt
curl -LfsS https://modal.com/docs/reference -o .plan-work/modal-platform-refresh/reference.html
curl -LfsS https://modal.com/docs/cli/latest -o .plan-work/modal-platform-refresh/cli.html
test -s .plan-work/modal-platform-refresh/modal-llms.txt
test -s .plan-work/modal-platform-refresh/reference.html
test -s .plan-work/modal-platform-refresh/cli.html
```

If Scrapling is available and useful for the current task:

```bash
scrapling extract get --ai-targeted https://modal.com/llms.txt .plan-work/modal-platform-refresh/modal-llms.txt
test -s .plan-work/modal-platform-refresh/modal-llms.txt
```

## Full Corpus Guard

Do not copy `https://modal.com/llms-full.txt` into the live plugin tree. If it is needed for comparison, sample only the sections relevant to the task or write generated output under a task-local artifact root such as `.plan-work/modal-platform-refresh/`.

## API And CLI Drift Check

Run this after refreshing official docs and after editing `modal-api-index.md` or `modal-cli-index.md`:

```bash
MODAL_REFERENCE_HTML=.plan-work/modal-platform-refresh/reference.html MODAL_CLI_HTML=.plan-work/modal-platform-refresh/cli.html node ./skills/modal-platform/scripts/check-modal-reference-coverage.mjs
```

Expected result: the script exits zero, verifies required canonical links against
separate API and CLI sources, and writes a drift report when requested. The saved
fixture test protects parsing and required-link assertions; live link counts are
reported for review, never treated as an acceptance threshold.

To write a machine-readable drift report with link counts and changed links:

```bash
MODAL_REFERENCE_HTML=.plan-work/modal-platform-refresh/reference.html MODAL_CLI_HTML=.plan-work/modal-platform-refresh/cli.html node ./skills/modal-platform/scripts/check-modal-reference-coverage.mjs --report .plan-work/modal-platform-refresh/reference-coverage.json
```

## Repository Refresh

Use GitHub lightly:

- Required repos are listed in `modal-repo-index.md`.
- Fetch README and top-level package files first.
- Add new repos only when they map to an existing workflow bucket.
- Keep long repo content out of the live plugin tree.

For the curated Modal and adjacent repo lists, use the inventory helper:

```bash
node ./skills/modal-platform/scripts/refresh-modal-github-inventory.mjs
```

Expected result: raw JSON and a markdown report under `.plan-work/modal-platform-refresh/`. Treat the report as review input, not as an automatic source of checked-in reference changes.

## Provenance Rule

Reference files should cite official Modal URLs and task-local artifacts. Avoid project-specific saved-note paths, generated cache paths, and stale scratch paths as sources.

## Refresh Checklist

- Compare Guide coverage against `https://modal.com/docs/guide`.
- Compare Examples coverage against `https://modal.com/docs/examples`.
- Compare API and CLI coverage against `https://modal.com/docs/reference`.
- Compare repo routing against `references/modal-repo-index.md`.
- Compare adjacent tool routing against `references/modal-adjacent-tools.md` when that file exists.
- Run `modal --version` and `modal <command> --help` before documenting local CLI behavior.
