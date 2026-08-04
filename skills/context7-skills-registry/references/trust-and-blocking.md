# Trust And Blocking

## Trust Checks

Before using or installing a registry result, check:

- Source path or package identity.
- Whether it is project-local, user-level, generated cache, or remote.
- Whether it has a clear `SKILL.md` with name and description.
- Whether it asks for unexpected network, shell, or global config changes.

## Block Conditions

Stop and ask before proceeding if:

- The skill source is unknown or suspicious.
- Installation would overwrite unrelated files.
- The operation would change global config without user approval.
- The skill contains secret values or asks to store secrets in files.
- The registry result conflicts with the approved plan or current user request.

## Source Preference

Prefer sources in this order:

1. Current project files named by the user or approved plan.
2. User-level plugin source of truth.
3. Installed trusted plugin metadata.
4. Remote or generated cache only when the user asked for it or local sources are unavailable.
