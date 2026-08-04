#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
npx_bin="$("$script_dir/find-node-tool.sh" npx)"
log_file="${CONTEXT7_MCP_LAUNCH_LOG:-$HOME/.codex/tmp/context7-mcp-launch.log}"
quota_env_file="${CONTEXT7_QUOTA_ENV_FILE:-$HOME/.codex/context7.env}"
mkdir -p "$(dirname "$log_file")" 2>/dev/null || true

# The launch log is worth keeping -- it is what let us measure the leak rate
# against launch count -- but it appends on every start (~150-430/day) and had
# grown to 1.7MB unbounded. Keep one previous generation and start fresh.
log_max_bytes="${CONTEXT7_MCP_LAUNCH_LOG_MAX_BYTES:-1048576}"
rotate_launch_log() {
  [[ -f "$log_file" ]] || return 0
  local size
  size="$(wc -c <"$log_file" 2>/dev/null | tr -d '[:space:]')" || return 0
  [[ -n "$size" && "$size" -gt "$log_max_bytes" ]] || return 0
  mv -f "$log_file" "$log_file.1" 2>/dev/null || true
}
rotate_launch_log

load_context7_quota_env() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  while IFS= read -r raw_line || [[ -n "$raw_line" ]]; do
    local line="${raw_line#"${raw_line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ -z "$line" || "$line" == \#* ]] && continue
    if [[ "$line" =~ ^(CONTEXT7_API_KEY|CONTEXT7_FALLBACK_API_KEY|CONTEXT7_MCP_PACKAGE|CONTEXT7_MCP_LAUNCH_LOG)=(.*)$ ]]; then
      local key="${BASH_REMATCH[1]}"
      local value="${BASH_REMATCH[2]}"
      value="${value%\"}"
      value="${value#\"}"
      value="${value%\'}"
      value="${value#\'}"
      if [[ -z "${!key:-}" ]]; then
        export "$key=$value"
      fi
    fi
  done <"$file"
}

export CONTEXT7_QUOTA_ENV_FILE="$quota_env_file"
load_context7_quota_env "$quota_env_file"
package="${CONTEXT7_MCP_PACKAGE:-@upstash/context7-mcp@3.2.4}"

package_is_pinned() {
  [[ "$1" =~ ^@upstash/context7-mcp@[0-9]+\.[0-9]+\.[0-9]+([-.][A-Za-z0-9.]+)?$ ]]
}

if ! package_is_pinned "$package"; then
  echo "Refusing to launch unpinned Context7 MCP package: $package" >&2
  echo "Set CONTEXT7_MCP_PACKAGE to an explicit version such as @upstash/context7-mcp@3.2.4." >&2
  exit 64
fi

if [[ $# -gt 0 ]]; then
  printf '%s start-context7-mcp mode=upstream cwd=%q package=%q quota_env=%q quota_key_configured=%q fallback_key_configured=%q args=%q\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$PWD" "$package" "$quota_env_file" "${CONTEXT7_API_KEY:+yes}" "${CONTEXT7_FALLBACK_API_KEY:+yes}" "$*" >>"$log_file" 2>/dev/null || true
  exec "$npx_bin" -y "$package" "$@"
fi

export CONTEXT7_NPX_BIN="$npx_bin"
printf '%s start-context7-mcp mode=compat cwd=%q package=%q quota_env=%q quota_key_configured=%q fallback_key_configured=%q\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$PWD" "$package" "$quota_env_file" "${CONTEXT7_API_KEY:+yes}" "${CONTEXT7_FALLBACK_API_KEY:+yes}" >>"$log_file" 2>/dev/null || true
exec node "$script_dir/context7-app-compat-mcp.mjs"
