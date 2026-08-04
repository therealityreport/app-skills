---
name: supabase-command-surface
description: Use as the single connector-aware Supabase entrypoint. Checks the shared Supabase App connector first, uses live project tools when hosted state matters, owns local marketplace routing and project conventions, and applies Supabase Fullstack guidance for RLS, auth, storage, migrations, and Postgres performance.
---

# Supabase Command Surface

Use this skill as the front door for any Supabase request. It does not replace the shared Supabase App connector. It decides whether the request needs live project access, local code review, or both, and it prefers live connector evidence whenever hosted state affects the answer.

## Ownership Boundary

Supabase Fullstack is the editable user/system-level plugin for Supabase marketplace aggregation, project routing, and user-specific conventions. Keep repository-specific conventions in that repository's instructions, outside this public package.

The OpenAI-built `supabase@openai-curated` plugin and shared `$supabase` App connector are not the customization target. Use the app connector when live hosted Supabase access is needed and the tools are callable.

If the Supabase App connector is missing, unloaded, unauthenticated, or not exposed in the current thread, say that plainly and continue from local files, Supabase CLI output, or explicit database evidence without making live hosted-state claims.

## Live Access Delegation

For live Supabase project work, use the shared Supabase App connector first.

Live access is required for:

- Listing or selecting Supabase projects
- Reading live schemas, tables, policies, storage buckets, Edge Functions, branches, advisors, logs, or project settings
- Running SQL against a hosted Supabase project
- Applying schema, policy, storage, branch, function, or configuration changes
- Confirming whether deployed project state matches local migrations

When live access is needed:

1. Check whether Supabase App tools are callable in the current thread.
2. If plugin metadata matters, check whether `supabase@openai-curated` is installed and enabled.
3. If tools are callable, use them before making claims about hosted schemas, policies, branches, logs, advisors, functions, storage, or settings.
4. If tools are not callable, say the connector is not loaded or authenticated, and ask for connector reload or reauthentication before making live-state claims.
5. Continue with local repo review only if the user asks for code guidance or the live connector is unavailable.

Do not claim that Supabase Fullstack queried, changed, or verified hosted Supabase state unless a live Supabase tool or an explicit CLI/database connection actually did that work.

## Routing Rule

- Use this skill first for broad Supabase requests.
- Route all three Supabase marketplace sources through this plugin before applying them to projects.
- Route security, RLS, auth, storage, service-role, SSR, and migration safety work to `supabase-security-governance`.
- Route query tuning, indexes, schema design, connection pooling, locks, advisors, and RLS performance work to `supabase-postgres-performance`.
- For mixed work, run security/governance first, then performance.
- For live inspection or operations, use the shared Supabase App connector first and apply the local skills to interpret the results.

## Marketplace Capability Sources

Preserve the original capabilities from these sources and apply local project routing before using them:

- `supabase/agent-skills`: broad Supabase coverage, Supabase Postgres best practices, and skill-creation patterns.
- `supabase/server`: server-side Supabase usage, request-scoped auth, server/client boundaries, Edge Functions, and `@supabase/server` behavior.
- `supabase/supabase`: safe SQL execution, Vitest, Vercel composition patterns, Studio testing, E2E, telemetry, error handling, best practices, queries, UI patterns, effect events, dev-toolbar review, and mock API tests.

## Startup Status Check

At the start of a Supabase task, report a compact status when it affects the answer:

- `Supabase App connector`: callable, not exposed, unauthenticated, or unknown
- `Official Supabase plugin`: installed/enabled or missing when plugin metadata matters
- `Supabase Fullstack`: available for local review guidance
- `Evidence mode`: live project, local repo, or both

If this is a pure local code review, keep the status short. If the user asks why Supabase tools are missing, include the app ID if it is known from the plugin manifest.

## Review Defaults

For RLS and auth requests:

- Treat `auth.uid()` and trusted `app_metadata` as normal policy inputs.
- Treat `user_metadata` as user-editable and unsafe for authorization.
- Check `USING` and `WITH CHECK` separately.
- Check whether every exposed table has RLS enabled and intentional policies.
- Check service-role usage and browser/client boundaries before recommending policy changes.
- Check storage bucket policies alongside table policies when file ownership matters.
- Check indexes for policy predicates that will run at scale.

## Output Shape

Use this concise structure when routing matters:

1. `Supabase status`: editable target is Supabase Fullstack; live connector is `$supabase`; include whether live tools are callable
2. `Route`: Supabase App connector, Supabase Fullstack guidance, or both
3. `Findings or next action`: grounded in live evidence, local files, or the connector/auth blocker
