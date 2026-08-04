# Modal Browser And Release Workflow

Use this generic workflow before routing to a focused skill. It intentionally has no
project profile, environment, app, secret, or MCP identity.

## Browser Runtime

Route browser-image work to `$modal-browser-runtime`. Preserve the build order:
install pinned Python requirements, install the browser, install library assets, then
add source and bind the image. Require a no-state `about:blank` or data-URL Chromium
launch proof that imports the runtime and reports versions without credentials or
durable state.

## Release Operations

Route history, readiness, bounded logs, canaries, and recovery planning to
`$modal-release-operations`. Resolve an app ID from an app list, snapshot history
before any mutation, bound log windows, retain startup logs, and create—but do not
execute—a rollback preview by app ID and recorded version.

## 1.5.2 And 1.5.3 Notes

- 1.5.2 includes startup output in `modal container logs`.
- 1.5.3 adds programmatic `stream`, `fetch`, and `tail` log methods on Function,
  Server, and FunctionCall objects.
- Current CLI JSON keys are normalized to lowercase with underscores. Project
  parsers should retain legacy fixtures while accepting current output.

Sources: [Modal changelog](https://modal.com/docs/sdk/py/changelog),
[Python API reference](https://modal.com/docs/sdk/py/latest), and
[CLI reference](https://modal.com/docs/cli/latest).
