#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-aimhi-analyzer-sandbox}"
OUTPUT_DIR="${1:-gcp-state/bigquery}"
mkdir -p "${OUTPUT_DIR}"

echo "{\"event\":\"fetch_bigquery_start\",\"project\":\"${PROJECT_ID}\"}"
bq ls --format=json --project_id="${PROJECT_ID}" > "${OUTPUT_DIR}/datasets.json" || echo "[]" > "${OUTPUT_DIR}/datasets.json"
echo "{\"event\":\"fetch_bigquery_complete\",\"output\":\"${OUTPUT_DIR}/datasets.json\"}"
