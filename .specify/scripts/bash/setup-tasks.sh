#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
root="$(repo_root)"; fd="$(feature_dir "$root")"; fd="${fd%/}"
printf '{"FEATURE_DIR":"%s","TASKS_TEMPLATE":"%s","AVAILABLE_DOCS":%s}\n' \
  "$fd" "$root/.specify/templates/tasks-template.md" "$(available_docs "$fd")"
