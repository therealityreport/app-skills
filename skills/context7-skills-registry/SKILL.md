---
name: context7-skills-registry
description: Inventory and migrate legacy Context7 skill-registry workflows while preserving trust boundaries and avoiding deprecated Context7 CLI skill commands.
---

# Context7 Skills Registry

Use this skill when auditing legacy Context7 skill-registry documentation, migrating a previous `ctx7 skills` workflow, or checking locally installed skills and plugins. Context7 CLI skill commands are deprecated; do not present this skill as an installer.

## Workflow

1. Identify whether the request relies on a deprecated Context7 CLI skill command.
2. Search local skill and plugin registries before adding anything new.
3. Use the platform-native plugin/skill installer for any requested install or removal; do not substitute an old Context7 CLI command.
4. Check trust, blocking, and source identity before using a newly found skill.
5. Keep registry changes scoped and reversible.

## References

- Read [references/search-install-remove.md](references/search-install-remove.md) for registry operations.
- Read [references/trust-and-blocking.md](references/trust-and-blocking.md) for trust decisions and blocked sources.
