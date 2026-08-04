#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
npx_bin="$("$script_dir/find-node-tool.sh" npx)"
package="${CONTEXT7_CLI_PACKAGE:-ctx7@0.5.5}"

"$npx_bin" -y "$package" --help >/tmp/context7-cli-help.txt

if [[ "${CONTEXT7_LIVE_SMOKE:-0}" == "1" ]]; then
  "$npx_bin" -y "$package" library react "React useEffect cleanup" --json >/tmp/context7-cli-library.json
fi

echo "Context7 CLI smoke passed"
