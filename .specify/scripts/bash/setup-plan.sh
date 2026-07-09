#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
root="$(repo_root)"; fd="$(feature_dir "$root")"; fd="${fd%/}"
printf '{"FEATURE_SPEC":"%s","IMPL_PLAN":"%s","SPECS_DIR":"%s","BRANCH":"%s"}\n' \
  "$fd/spec.md" "$fd/plan.md" "$fd" "$(basename "$fd")"
