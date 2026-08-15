#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
mkdir -p "$REPO_ROOT/gcp-state/scripts"
TARGET_FILE="$REPO_ROOT/gcp-state/scripts/emit_autonomy_telemetry.sh"
if [ -n "${SCRIPT_SOURCE_BUCKET:-}" ] && gsutil -q stat "${SCRIPT_SOURCE_BUCKET%/}/emit_autonomy_telemetry.sh"; then gsutil cp "${SCRIPT_SOURCE_BUCKET%/}/emit_autonomy_telemetry.sh" "$TARGET_FILE"; else printf "#!/usr/bin/env bash\nset -euo pipefail\necho \"autonomy_telemetry emitted at \\$(date -u +%%Y-%%m-%%dT%%H:%%M:%%SZ)\"\n" > "$TARGET_FILE"; fi
chmod +x "$TARGET_FILE"
