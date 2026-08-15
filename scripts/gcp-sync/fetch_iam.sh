#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-aimhi-analyzer-sandbox}"
OUTPUT_DIR="${1:-gcp-state/iam}"
mkdir -p "${OUTPUT_DIR}"

echo "{\"event\":\"fetch_iam_start\",\"project\":\"${PROJECT_ID}\"}"
gcloud projects get-iam-policy "${PROJECT_ID}" --format=json > "${OUTPUT_DIR}/policy.json"
echo "{\"event\":\"fetch_iam_complete\",\"output\":\"${OUTPUT_DIR}/policy.json\"}"
