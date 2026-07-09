#!/usr/bin/env bash
# Shared helpers for the spec-kit shim scripts (bash port of common.ps1).
# Resolves the active feature from .specify/feature.json (falls back to newest specs/*).

repo_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd
}

feature_dir() {
  local root="$1"
  local fj="$root/.specify/feature.json"
  if [ -f "$fj" ]; then
    local fd
    fd=$(grep -oE '"feature_directory"[[:space:]]*:[[:space:]]*"[^"]+"' "$fj" | sed -E 's/.*"([^"]+)"$/\1/')
    if [ -n "$fd" ]; then echo "$root/$fd"; return; fi
  fi
  ls -d "$root"/specs/*/ 2>/dev/null | sort | tail -1
}

available_docs() {
  local fd="$1"
  local out=()
  for f in spec.md plan.md tasks.md research.md data-model.md quickstart.md; do
    [ -f "$fd/$f" ] && out+=("\"$f\"")
  done
  [ -d "$fd/contracts" ] && out+=("\"contracts/\"")
  local IFS=,
  echo "[${out[*]}]"
}
