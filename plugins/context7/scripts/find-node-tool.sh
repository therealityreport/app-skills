#!/usr/bin/env bash
set -euo pipefail

tool="${1:-npx}"

case "$tool" in
  node)
    env_var="${CONTEXT7_NODE:-}"
    homebrew="/opt/homebrew/bin/node"
    bundled="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
    ;;
  npm)
    env_var="${CONTEXT7_NPM:-}"
    homebrew="/opt/homebrew/bin/npm"
    bundled="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/npm"
    ;;
  npx)
    env_var="${CONTEXT7_NPX:-}"
    homebrew="/opt/homebrew/bin/npx"
    bundled="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/npx"
    ;;
  *)
    echo "Unsupported tool: $tool" >&2
    exit 2
    ;;
esac

if [[ -n "$env_var" && -x "$env_var" ]]; then
  printf '%s\n' "$env_var"
  exit 0
fi

if [[ -x "$homebrew" ]]; then
  printf '%s\n' "$homebrew"
  exit 0
fi

if command -v "$tool" >/dev/null 2>&1; then
  command -v "$tool"
  exit 0
fi

if [[ -x "$bundled" ]]; then
  printf '%s\n' "$bundled"
  exit 0
fi

echo "Could not find executable '$tool'. Set CONTEXT7_${tool^^} to an executable path or install Node.js/npm." >&2
exit 1
