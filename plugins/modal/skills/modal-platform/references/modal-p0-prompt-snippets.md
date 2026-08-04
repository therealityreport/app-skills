# Modal P0 Prompt Snippets

Use these snippets when a user asks to turn the approved P0 Modal GitHub repos
into concrete Modal plugin behavior. They are prompts, not copied repo docs.
Before producing exact API or CLI syntax, refresh official Modal docs or use the
current local `modal --help` surface.

## modal-client

```text
Use the Modal SDK source-of-truth lane to design this workflow. Confirm the
current Modal primitive, CLI command, Python version requirement, deployment
surface, and validation command before writing code. Treat modal-client as SDK
behavior evidence, but verify public signatures against Modal docs.
```

## modal-examples

```text
Start from Modal examples only as a pattern catalog. Pick the closest example
shape, then adapt it to this project with explicit image dependencies, secrets,
storage, timeout, retries, local run command, and deploy/no-deploy policy.
```

## credential-injection

```text
Design a credential-safe Modal workflow. Keep API tokens in modal.Secret, keep
proxy or credential-injection boundaries server-side, redact logs and artifacts,
and state which code can and cannot see credentials before proposing execution.
```

## networking-demos

```text
Build the Modal networking plan first. Identify what must connect to what,
which side initiates the connection, whether a proxy, tunnel, endpoint, or
container-connectivity pattern is needed, and the smallest smoke command that
proves connectivity without exposing secrets.
```

## ci-on-modal

```text
Turn this validation command into a Modal CI/smoke job. Package dependencies in
a Modal image, pass only required secrets, run the check with modal run, report
the exit status and key log lines, and only then outline a GitHub Actions hook.
```

## search-california

```text
Shape this as a scheduled ingestion and enrichment pipeline. Split fetch,
normalize, enrich, persist, and serve steps; define the idempotency key,
database or artifact destination, schedule, backfill command, endpoint smoke,
and rollback or disable path.
```

## Usage Rules

- Use one snippet per repo lane; combine snippets only when the workflow truly
  spans multiple concerns.
- Keep user-specific names explicit: Modal app, environment, secret, database,
  queue, volume, schedule, and endpoint owner.
- Convert snippets into project-local prompts instead of pasting them as final
  answers.
- Do not let repo evidence override official Modal docs.
