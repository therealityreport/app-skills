---
name: modal-browser-runtime
description: Use when building or validating a Modal image that runs Playwright, Patchright, Scrapling, Chromium, or another browser runtime, including dependency pins, image invalidation, browser assets, no-state launch proof, telemetry, and rollback planning.
---
# Modal Browser Runtime

Use this for browser-runtime work after Modal is already the compute owner. Keep
project identity, secrets, persistent browser state, and deployment authority out of
this skill unless a project adapter supplies them.

## Build Contract

1. Record Python, Modal, Playwright, Patchright, Scrapling, and browser revisions
   before changing the image recipe.
2. Pin browser-library requirements in the project's declared requirements or lock
   workflow. Regenerate only with the repository's recorded resolver command.
3. Preserve image order: install pinned requirements, install the selected browser,
   run any library asset installer (for example `scrapling install --force`), then add
   application source and bind the completed image to existing functions.
4. Treat dependency changes, browser revisions, installer flags, and source copied
   into an image as invalidation inputs. Capture the resulting image/build identity.

## No-State Launch Proof

Make one bounded probe that imports the browser stack, reports exact package
versions, launches Chromium against `about:blank` or a data URL, closes it in
`finally`, and returns structured evidence. The probe must not use credentials,
cookies, browser storage, a database, a volume, queue, schedule, or external site.

Record at least: image/build identity, Python version, Modal client version,
Playwright/Patchright/Scrapling versions when installed, browser executable/version,
launch result, elapsed time, timestamp, and error class/message with secrets redacted.

## Failure And Rollback

- Diagnose image build/import/asset/launch failures locally before retrying remote
  work. Stop after two equivalent failures and preserve the first error and build ID.
- Do not deploy or roll back from this skill. Prepare a rollback preview that names
  the known-good image or application version and requires the release owner to
  approve and execute it.
- Do not collect or retain screenshots, HAR files, videos, cookies, or traces unless
  the project explicitly needs them and supplies retention/redaction rules.
