#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-aimhi-analyzer-sandbox}"
OUTPUT_DIR="${1:-gcp-state/dashboards}"
mkdir -p "${OUTPUT_DIR}"

echo "{\"event\":\"fetch_dashboards_start\",\"project\":\"${PROJECT_ID}\"}"
gcloud monitoring dashboards list --project="${PROJECT_ID}" --format=json > "${OUTPUT_DIR}/dashboards.json"
echo "{\"event\":\"fetch_dashboards_complete\",\"output\":\"${OUTPUT_DIR}/dashboards.json\"}"
