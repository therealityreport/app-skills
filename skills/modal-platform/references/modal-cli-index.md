# Modal CLI Index

Source of truth: `https://modal.com/docs/reference`, `https://modal.com/docs/cli/latest`, and local `modal --help`.

Use this for command routing. Validate exact flags with `modal <command> --help` before running commands that mutate remote state.

## Core Execution
- [`modal run`](https://modal.com/docs/cli/latest/run): run a local entrypoint or function on Modal.
- [`modal serve`](https://modal.com/docs/cli/latest/serve): run web endpoints with hot reload for local iteration.
- [`modal deploy`](https://modal.com/docs/cli/latest/deploy): deploy an app for stable remote invocation. Confirm project, profile, environment, app name, and rollback path first.
- [`modal shell`](https://modal.com/docs/cli/latest/shell): open a command or interactive shell inside a Modal container.
- [`modal curl`](https://modal.com/docs/cli/latest/curl): call a Modal web endpoint from the CLI.

## Deployments And Observability
- [`modal app`](https://modal.com/docs/cli/latest/app): list apps, stream logs, show history, open dashboard, stop apps, and roll back deployments. Confirm before `stop` or `rollback`.
- [`modal container`](https://modal.com/docs/cli/latest/container): manage or connect to running containers.
- [`modal dashboard`](https://modal.com/docs/cli/latest/dashboard): open the dashboard.
- [`modal endpoint`](https://modal.com/docs/cli/latest/endpoint): inspect and operate web endpoints.
- [`modal changelog`](https://modal.com/docs/cli/latest/changelog): fetch Modal release notes.
- [`modal billing`](https://modal.com/docs/cli/latest/billing): inspect workspace billing.

## Storage And State
- [`modal secret`](https://modal.com/docs/cli/latest/secret): list, create, and delete secrets. Confirm before overwriting or deleting; keep secret names project-owned.
- [`modal volume`](https://modal.com/docs/cli/latest/volume): create, list, rename, open dashboard, get, put, list files, copy, remove, and delete volumes. Confirm before `rm`, `delete`, or large overwrite.
- [`modal queue`](https://modal.com/docs/cli/latest/queue): inspect and manage `modal.Queue` objects.
- [`modal dict`](https://modal.com/docs/cli/latest/dict): inspect and manage `modal.Dict` objects.

## Images, Configuration, And Identity
- [`modal image`](https://modal.com/docs/cli/latest/image): inspect and manage Modal images.
- [`modal token`](https://modal.com/docs/cli/latest/token): create, set, and inspect account credentials. Prefer explicit token commands over vague setup instructions when profile ownership matters.
- [`modal setup`](https://modal.com/docs/cli/latest/setup): bootstrap local configuration; use only when setting up a new local machine or profile intentionally.
- [`modal profile`](https://modal.com/docs/cli/latest/profile): inspect or switch profiles. Confirm project boundary before activation.
- [`modal workspace`](https://modal.com/docs/cli/latest/workspace): inspect or manage Modal workspaces.
- [`modal environment`](https://modal.com/docs/cli/latest/environment): create and interact with environments. Confirm dev/prod target before mutation.
- [`modal config`](https://modal.com/docs/cli/latest/config): inspect or set client configuration for the current profile.
- [`modal bootstrap`](https://modal.com/docs/cli/latest/bootstrap): initialize a sample Modal app.
- [`modal skills`](https://modal.com/docs/cli/latest/skills): inspect Modal CLI skill support.

## Pre-Run Checklist
- Check `modal --version`.
- Check `modal token info` before remote operations.
- Check active profile and environment before deploy or resource mutation.
- Do not reuse another project's profiles, environments, apps, secrets, volumes, queues, dicts, or dispatch URLs without explicit approval.
