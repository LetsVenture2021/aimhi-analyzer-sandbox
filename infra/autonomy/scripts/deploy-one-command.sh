#!/bin/bash
set -eu
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_ID="${PROJECT_ID:-aimhi-analyzer-sandbox}"
mkdir -p "$ROOT_DIR/bigquery" "$ROOT_DIR/logging" "$ROOT_DIR/telemetry" "$ROOT_DIR/grafana" "$ROOT_DIR/looker" "$ROOT_DIR/pipelines" "$ROOT_DIR/cloudbuild" "$ROOT_DIR/scripts"
chmod +x "$ROOT_DIR/scripts"/*.sh "$ROOT_DIR/pipelines"/*.sh
"$ROOT_DIR/scripts/autonomy-master.sh" "$PROJECT_ID"
