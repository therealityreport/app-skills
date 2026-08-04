# Legacy Registry Migration

The current Context7 CLI no longer provides the older `ctx7 skills` registry workflow. Treat references to Context7 skill search, install, or removal commands as migration work, not commands to run.

## Search

Search existing skill paths first:

```bash
find context7/skills -maxdepth 2 -name SKILL.md | sort
rg -n "name:|description:" context7/skills
```

Use the platform's plugin or skill discovery tools only when local files do not answer the question. Record the source identity and installed version before proposing any change.

## Install

Use the platform-native installer only when the user explicitly asks or the approved plan includes installation. Do not substitute a deprecated Context7 CLI command.

Before installing:

- Confirm the source.
- Confirm the destination.
- Confirm whether the install is project-local or user-global.
- Avoid overwriting existing skills without reading them first.

## Remove

Remove only when the user explicitly asks.

Before removing:

- List affected files.
- Check whether another plugin or skill depends on them.
- Back up conflicting files only when the active task requires risky cleanup.

## Verification

After registry edits:

```bash
find context7/skills -maxdepth 3 -type f | sort
rg -n "^name:|^description:" context7/skills
```
