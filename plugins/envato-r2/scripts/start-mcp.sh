#!/bin/sh

set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "envato-r2 MCP: node is required." >&2
  exit 1
fi

if [ ! -d node_modules/@modelcontextprotocol/sdk ] || [ ! -d node_modules/@aws-sdk/client-s3 ] || [ ! -d node_modules/playwright-core ]; then
  if [ -f package-lock.json ]; then
    echo "envato-r2 MCP: installing npm dependencies with npm ci..." >&2
    npm ci --omit=dev --ignore-scripts >&2
  else
    echo "envato-r2 MCP: installing npm dependencies..." >&2
    npm install --omit=dev --ignore-scripts >&2
  fi
fi

exec node ./src/server.mjs
