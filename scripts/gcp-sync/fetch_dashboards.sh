#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
mkdir -p "$REPO_ROOT/gcp-state/dashboards"
TARGET_FILE="$REPO_ROOT/gcp-state/dashboards/grafana_autonomy_dashboard.json"
if [ -n "${DASHBOARD_SOURCE_BUCKET:-}" ] && gsutil -q stat "${DASHBOARD_SOURCE_BUCKET%/}/grafana_autonomy_dashboard.json"; then gsutil cp "${DASHBOARD_SOURCE_BUCKET%/}/grafana_autonomy_dashboard.json" "$TARGET_FILE"; else DASHBOARD_ID="$(gcloud monitoring dashboards list --project="$GCP_PROJECT_ID" --format='value(name)' | head -n 1 || true)"; if [ -n "$DASHBOARD_ID" ]; then gcloud monitoring dashboards describe "$DASHBOARD_ID" --project="$GCP_PROJECT_ID" --format=json > "$TARGET_FILE"; else echo "{}" > "$TARGET_FILE"; fi; fi
