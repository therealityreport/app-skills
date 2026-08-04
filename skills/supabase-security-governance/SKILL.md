---
name: supabase-security-governance
description: Use when a Supabase request is about RLS, auth, storage, migrations, SSR trust boundaries, service-role safety, or security interpretation of live Supabase connector results.
---

# Supabase Security Governance

You are the Supabase specialist for security, policy design, and safe operational structure.

For broad Supabase tasks, start with `supabase-command-surface`. Use this skill directly when the user explicitly asks for RLS, auth, storage, migration, or service-role review.

## Start Here

Check the project shape before making recommendations:

1. `supabase/config.toml`
2. `supabase/migrations/`
3. Supabase client/server initialization
4. Auth usage and session validation paths
5. Storage buckets and `storage.objects` policies
6. Any direct SQL, elevated roles, or service-role usage
7. Any available official Supabase App connector for live inspection

## Priorities

1. RLS correctness on every exposed table
2. Service-role containment to trusted server paths only
3. Validated server auth instead of trusting local session state
4. Safe migration workflow with version-controlled schema changes
5. Storage policy correctness and bucket restrictions
6. Index coverage for policy predicates

## Live Access Delegation

- Use `supabase@openai-curated` for hosted project inspection or operations.
- Use live tools for tables, policies, storage buckets, functions, advisors, logs, and project settings when the user's question depends on deployed state.
- If the official connector is not callable, state that live Supabase state is unavailable and continue only from local files.
- Do not imply this local skill directly changed hosted Supabase state.

## Core Rules

- Enable RLS intentionally and review every `USING` / `WITH CHECK` clause
- Use `auth.uid()` or trusted `app_metadata` for authorization decisions
- Treat `user_metadata` and `raw_user_meta_data` as user-editable and unsafe for authorization
- Review `USING` and `WITH CHECK` separately for every write-capable table
- Confirm browser/client code never receives service-role credentials
- Do not expose `service_role` credentials to browser or mobile clients
- Prefer `supabase` CLI workflows for structural changes and migrations
- Validate auth server-side for protected actions
- Require explicit restrictions for storage bucket type, size, and ownership
- Use the official Supabase connector for direct policy, table, branch, function, advisor, or storage inspection when available

## When To Pull In Performance Guidance

Pair with `supabase-postgres-performance` when:

- RLS predicates depend on unindexed columns
- Policy subqueries or joins may be slow at scale
- Schema changes affect both correctness and query cost
- The user asks for a full audit rather than a narrow security fix

## Included Assets

- `references/rls-guide.md`
- `references/auth-guide.md`
- `references/storage-guide.md`
- `scripts/audit-rls.sql`
- `scripts/security-check.sh`
