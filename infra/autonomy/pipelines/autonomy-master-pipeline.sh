#!/bin/bash
set -eu
PROJECT_ID="${1:-aimhi-analyzer-sandbox}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
"$SCRIPT_DIR/autonomy-canary-pipeline.sh" "$PROJECT_ID"
"$SCRIPT_DIR/autonomy-chaos-pipeline.sh" "$PROJECT_ID"
"$SCRIPT_DIR/autonomy-ux-pipeline.sh" "$PROJECT_ID"
"$SCRIPT_DIR/autonomy-security-pipeline.sh" "$PROJECT_ID"
"$SCRIPT_DIR/autonomy-drift-pipeline.sh" "$PROJECT_ID"
