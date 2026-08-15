#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
mkdir -p "$REPO_ROOT/gcp-state/bigquery/tables"
bq ls --project_id="$GCP_PROJECT_ID" --format=prettyjson > "$REPO_ROOT/gcp-state/bigquery/datasets.json" || echo "[]" > "$REPO_ROOT/gcp-state/bigquery/datasets.json"
DATASET_NAME="${BIGQUERY_DATASET:-telemetry}"
TABLE_NAME="${BIGQUERY_TABLE:-telemetry}"
bq show --format=prettyjson "${GCP_PROJECT_ID}:${DATASET_NAME}.${TABLE_NAME}" > "$REPO_ROOT/gcp-state/bigquery/tables/telemetry.json" || echo "{}" > "$REPO_ROOT/gcp-state/bigquery/tables/telemetry.json"
