#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$script_dir/start-context7-mcp.sh" --help >/tmp/context7-mcp-help.txt

if [[ "${CONTEXT7_LIVE_SMOKE:-0}" == "1" ]]; then
  npx_bin="$("$script_dir/find-node-tool.sh" npx)"
  package="${CONTEXT7_MCP_PACKAGE:-@upstash/context7-mcp@3.2.4}"
  "$npx_bin" -y "$package" --version >/tmp/context7-mcp-version.txt
fi

echo "Context7 MCP smoke passed"
