#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
mkdir -p "$REPO_ROOT/gcp-state/cloud-run/services"
SERVICE_NAME="${CLOUD_RUN_SERVICE:-autonomy-service}"
SERVICE_TMP="$(mktemp)"
REVISIONS_TMP="$(mktemp)"
gcloud run services describe "$SERVICE_NAME" --region="$GCP_REGION" --project="$GCP_PROJECT_ID" --platform=managed --format=json > "$SERVICE_TMP" || echo "{}" > "$SERVICE_TMP"
gcloud run revisions list --region="$GCP_REGION" --project="$GCP_PROJECT_ID" --service="$SERVICE_NAME" --format=json > "$REVISIONS_TMP" || echo "[]" > "$REVISIONS_TMP"
jq -n --slurpfile service "$SERVICE_TMP" --slurpfile revisions "$REVISIONS_TMP" '{service:($service[0] // {}),revisions:($revisions[0] // [])}' > "$REPO_ROOT/gcp-state/cloud-run/services/autonomy-service.json"
rm -f "$SERVICE_TMP" "$REVISIONS_TMP"
