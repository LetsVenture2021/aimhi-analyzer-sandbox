#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-aimhi-analyzer-sandbox}"
OUTPUT_DIR="${1:-gcp-state/logging}"
mkdir -p "${OUTPUT_DIR}"

echo "{\"event\":\"fetch_logging_start\",\"project\":\"${PROJECT_ID}\"}"
gcloud logging sinks list --project="${PROJECT_ID}" --format=json > "${OUTPUT_DIR}/sinks.json"
echo "{\"event\":\"fetch_logging_complete\",\"output\":\"${OUTPUT_DIR}/sinks.json\"}"
