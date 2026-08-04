# Modal Guide Index

Source of truth: `https://modal.com/llms.txt` and `https://modal.com/docs/guide`.

Use this as the first routing map for Modal guide pages. Open the official linked page when exact syntax, limits, or current behavior matters.

## Start And Project Shape
- [Introduction](https://modal.com/docs/guide)
- [Apps, Functions, and entrypoints](https://modal.com/docs/guide/apps.md)
- [File and project structure](https://modal.com/docs/guide/project-structure.md)
- [Developing and debugging](https://modal.com/docs/guide/developing-debugging.md)
- [Developing Modal code with LLMs](https://modal.com/docs/guide/developing-with-llms.md)
- [Modal 1.0 migration guide](https://modal.com/docs/guide/modal-1-0-migration.md)
- [Feature maturity](https://modal.com/docs/guide/feature-maturity.md)

## Images, Resources, And GPU
- [Defining Images](https://modal.com/docs/guide/images.md)
- [Using existing container images](https://modal.com/docs/guide/existing-images.md)
- [Fast pull from registry](https://modal.com/docs/guide/fast-pull-from-registry.md)
- [Configuring CPU, memory, and disk](https://modal.com/docs/guide/resources.md)
- [GPU acceleration](https://modal.com/docs/guide/gpu.md)
- [Using CUDA on Modal](https://modal.com/docs/guide/cuda.md)
- [GPU health](https://modal.com/docs/guide/gpu-health.md)
- [GPU Metrics](https://modal.com/docs/guide/gpu-metrics.md)
- [Region selection](https://modal.com/docs/guide/region-selection.md)

## Functions, Classes, Scaling, And Reliability
- [Scaling out](https://modal.com/docs/guide/scale.md)
- [Input concurrency](https://modal.com/docs/guide/concurrent-inputs.md)
- [Batch processing](https://modal.com/docs/guide/batch-processing.md)
- [Job queues](https://modal.com/docs/guide/job-queue.md)
- [Dynamic batching](https://modal.com/docs/guide/dynamic-batching.md)
- [Multi-node clusters (beta)](https://modal.com/docs/guide/multi-node-training.md)
- [Container lifecycle hooks](https://modal.com/docs/guide/lifecycle-functions.md)
- [Parametrized functions](https://modal.com/docs/guide/parametrized-functions.md)
- [Asynchronous API usage](https://modal.com/docs/guide/async.md)
- [Global variables](https://modal.com/docs/guide/global-variables.md)
- [Failures and retries](https://modal.com/docs/guide/retries.md)
- [Preemption](https://modal.com/docs/guide/preemption.md)
- [Timeouts](https://modal.com/docs/guide/timeouts.md)
- [Troubleshooting](https://modal.com/docs/guide/troubleshooting.md)

## Web Endpoints And Networking
- [Web Functions](https://modal.com/docs/guide/webhooks.md)
- [Streaming endpoints](https://modal.com/docs/guide/streaming-endpoints.md)
- [Web Function URLs](https://modal.com/docs/guide/webhook-urls.md)
- [Request timeouts](https://modal.com/docs/guide/webhook-timeouts.md)
- [Proxy Auth Tokens](https://modal.com/docs/guide/webhook-proxy-auth.md)
- [Tunnels](https://modal.com/docs/guide/tunnels.md)
- [Proxies (beta)](https://modal.com/docs/guide/proxy-ips.md)
- [Cluster networking](https://modal.com/docs/guide/private-networking.md)
- [S3 Gateway endpoints](https://modal.com/docs/guide/s3-gateway-endpoints.md)

## State, Storage, And Configuration
- [Secrets](https://modal.com/docs/guide/secrets.md)
- [Environment variables](https://modal.com/docs/guide/environment_variables.md)
- [Passing local data](https://modal.com/docs/guide/local-data.md)
- [Volumes](https://modal.com/docs/guide/volumes.md)
- [Storing model weights](https://modal.com/docs/guide/model-weights.md)
- [Cloud bucket mounts](https://modal.com/docs/guide/cloud-bucket-mounts.md)
- [Dicts](https://modal.com/docs/guide/dicts.md)
- [Queues](https://modal.com/docs/guide/queues.md)
- [Dataset ingestion](https://modal.com/docs/guide/dataset-ingestion.md)

## Performance
- [Cold start performance](https://modal.com/docs/guide/cold-start.md)
- [Memory Snapshots](https://modal.com/docs/guide/memory-snapshots.md)
- [High-performance LLM inference](https://modal.com/docs/guide/high-performance-llm-inference.md)
- [Geographic latency](https://modal.com/docs/guide/geographic-latency.md)

## Scheduling, Sandboxes, And Operations
- [Scheduling and cron jobs](https://modal.com/docs/guide/cron)
- [Sandboxes](https://modal.com/docs/guide/sandboxes.md)
- [Running commands](https://modal.com/docs/guide/sandbox-spawn.md)
- [Networking and security](https://modal.com/docs/guide/sandbox-networking.md)
- [File access](https://modal.com/docs/guide/sandbox-files.md)
- [Snapshots](https://modal.com/docs/guide/sandbox-snapshots.md)
- [Docker in Sandboxes (Alpha)](https://modal.com/docs/guide/docker-in-sandboxes.md)
- [Managing deployments](https://modal.com/docs/guide/managing-deployments.md)
- [Invoking deployed functions](https://modal.com/docs/guide/trigger-deployed-functions.md)
- [Continuous deployment](https://modal.com/docs/guide/continuous-deployment.md)
- [Running untrusted code in Functions](https://modal.com/docs/guide/restricted-access.md)

## Notebooks And SDKs
- [Modal Notebooks](https://modal.com/docs/guide/notebooks)
- [Jupyter notebooks](https://modal.com/docs/guide/jupyter-notebooks.md)
- [JavaScript/Go SDKs](https://modal.com/docs/guide/sdk-javascript-go.md)

## Workspace, Account, Security, And Integrations
- [Workspaces](https://modal.com/docs/guide/workspaces.md)
- [Environments](https://modal.com/docs/guide/environments.md)
- [Modal user account setup](https://modal.com/docs/guide/modal-user-account-setup.md)
- [Service users](https://modal.com/docs/guide/service-users.md)
- [Role-Based Access Control (RBAC)](https://modal.com/docs/guide/rbac.md)
- [Billing](https://modal.com/docs/guide/billing.md)
- [Security and privacy](https://modal.com/docs/guide/security.md)
- [Audit logs](https://modal.com/docs/guide/audit-logs.md)
- [Using OIDC to authenticate with external services](https://modal.com/docs/guide/oidc-integration.md)
- [Connecting Modal to your Datadog account](https://modal.com/docs/guide/datadog-integration.md)
- [Connecting Modal to your OpenTelemetry provider](https://modal.com/docs/guide/otel-integration.md)
- [Okta SSO](https://modal.com/docs/guide/okta-sso.md)
- [Custom SAML SSO](https://modal.com/docs/guide/saml-sso.md)
- [Slack notifications (beta)](https://modal.com/docs/guide/slack-notifications.md)
