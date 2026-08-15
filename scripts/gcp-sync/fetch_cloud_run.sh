#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-aimhi-analyzer-sandbox}"
REGION="${GCP_REGION:-us-central1}"
OUTPUT_DIR="${1:-gcp-state/cloud-run}"
mkdir -p "${OUTPUT_DIR}"

echo "{\"event\":\"fetch_cloud_run_start\",\"project\":\"${PROJECT_ID}\",\"region\":\"${REGION}\"}"
gcloud run services list --project="${PROJECT_ID}" --region="${REGION}" --format=json > "${OUTPUT_DIR}/services.json"
echo "{\"event\":\"fetch_cloud_run_complete\",\"output\":\"${OUTPUT_DIR}/services.json\"}"
