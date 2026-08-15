#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
mkdir -p "$REPO_ROOT/gcp-state/iam"
gcloud projects get-iam-policy "$GCP_PROJECT_ID" --format=json > "$REPO_ROOT/gcp-state/iam/project.json"
TMP_DIR="$(mktemp -d)"
gcloud iam service-accounts list --project="$GCP_PROJECT_ID" --format="value(email)" | while IFS= read -r SA_EMAIL; do [ -n "$SA_EMAIL" ] && gcloud iam service-accounts get-iam-policy "$SA_EMAIL" --project="$GCP_PROJECT_ID" --format=json > "$TMP_DIR/${SA_EMAIL//@/_}.json" || true; done
if find "$TMP_DIR" -maxdepth 1 -name '*.json' | grep -q .; then jq -s '.' "$TMP_DIR"/*.json > "$REPO_ROOT/gcp-state/iam/service-accounts.json"; else echo "[]" > "$REPO_ROOT/gcp-state/iam/service-accounts.json"; fi
DATASET_NAME="${BIGQUERY_DATASET:-telemetry}"
bq show --format=prettyjson "${GCP_PROJECT_ID}:${DATASET_NAME}" | jq '{datasetReference:.datasetReference,access:(.access // [])}' > "$REPO_ROOT/gcp-state/iam/bigquery-dataset.json" || echo "{}" > "$REPO_ROOT/gcp-state/iam/bigquery-dataset.json"
SINK_NAME="${LOGGING_SINK:-autonomy-sink}"
gcloud logging sinks describe "$SINK_NAME" --project="$GCP_PROJECT_ID" --format=json | jq '{name:.name,destination:.destination,filter:.filter,writerIdentity:.writerIdentity,includeChildren:.includeChildren}' > "$REPO_ROOT/gcp-state/iam/logging-sink.json" || echo "{}" > "$REPO_ROOT/gcp-state/iam/logging-sink.json"
rm -rf "$TMP_DIR"
