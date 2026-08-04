#!/bin/sh

set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "vintone-studio MCP: node is required." >&2
  exit 1
fi

exec node ./src/server.mjs
