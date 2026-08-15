#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-aimhi-analyzer-sandbox}"
OUTPUT_DIR="${1:-gcp-state/pipelines}"
mkdir -p "${OUTPUT_DIR}"

echo "{\"event\":\"fetch_pipelines_start\",\"project\":\"${PROJECT_ID}\"}"
gcloud builds triggers list --project="${PROJECT_ID}" --format=json > "${OUTPUT_DIR}/build_triggers.json"
echo "{\"event\":\"fetch_pipelines_complete\",\"output\":\"${OUTPUT_DIR}/build_triggers.json\"}"
