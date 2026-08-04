---
name: supabase-fullstack-review
description: Use when a Supabase request spans both security and performance, including mixed RLS, auth, storage, migrations, schema review, or live-project interpretation after official Supabase connector access.
---

# Supabase Fullstack Review

You are the broad-entry Supabase reviewer. Start with live connector evidence when the request depends on hosted state; otherwise scan the repo and classify the request before answering.

For a single front door, prefer `supabase-command-surface` first. Use this skill when the request is already clearly a fullstack review or when the command surface routes here.

## Review Flow

1. Check live-access needs first:
   - If the user asks for hosted project state, project lists, SQL execution, advisors, logs, storage buckets, Edge Functions, branches, or deployed config, use the shared Supabase App connector before making claims
   - If the connector is unavailable, say the answer is limited to local repo evidence and do not claim live verification
2. Check project shape when local code affects the answer:
   - `supabase/config.toml`
   - `supabase/migrations/`
   - package manifests for `@supabase/supabase-js` or `@supabase/ssr`
   - client/server initialization paths
   - direct SQL, RLS policies, storage usage, and auth entrypoints
3. Classify the work:
   - Security/governance heavy
   - Performance/schema heavy
   - Cross-cutting full-project review
4. Route your depth accordingly:
   - For security/governance-heavy requests, apply `supabase-security-governance`
   - For performance/schema-heavy requests, apply `supabase-postgres-performance`
   - For cross-cutting reviews, use both playbooks before answering
5. If the Supabase App connector is available, use it for direct inspection or operations instead of guessing from static code alone

## Output Rules

- Keep findings evidence-based and tied to concrete files, queries, policies, or config
- Separate security/correctness risks from scale/performance risks
- When both domains matter, present security first, then performance
- If the issue crosses boundaries, say why it needs both perspectives
- Use the shared Supabase App connector for direct schema, storage, functions, advisors, SQL, or branch state when live evidence matters
- Include a short connector status when live evidence is requested but unavailable

## Common Cross-Cutting Cases

- RLS policy correctness that also needs indexing
- SSR/server auth setup that affects query shape or connection usage
- Storage policies that depend on auth ownership and efficient lookups
- Migrations that change schema constraints, indexes, or policy predicates
