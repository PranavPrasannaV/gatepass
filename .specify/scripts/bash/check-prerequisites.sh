#!/usr/bin/env bash
# Usage: check-prerequisites.sh [--json] [--require-tasks] [--include-tasks] [--paths-only]
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

require_tasks=0
for arg in "$@"; do
  case "$arg" in
    -Json|--json|-RequireTasks|--require-tasks|-IncludeTasks|--include-tasks|-PathsOnly|--paths-only) : ;;
  esac
  [[ "$arg" == *RequireTasks* || "$arg" == *require-tasks* ]] && require_tasks=1
done

root="$(repo_root)"
fd="$(feature_dir "$root")"
fd="${fd%/}"
[ -z "$fd" ] && { echo "No feature found. Run /speckit-specify first." >&2; exit 1; }
if [ "$require_tasks" = "1" ] && [ ! -f "$fd/tasks.md" ]; then
  echo "tasks.md missing. Run /speckit-tasks first." >&2; exit 1
fi
printf '{"FEATURE_DIR":"%s","AVAILABLE_DOCS":%s}\n' "$fd" "$(available_docs "$fd")"
