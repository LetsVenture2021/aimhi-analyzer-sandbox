#!/bin/bash
set -eu
PROJECT_ID="${1:-aimhi-analyzer-sandbox}"
DATASET_ID="${2:-autonomy_telemetry}"
TABLE_ID="${3:-events}"
SCHEMA_FILE="$(cd "$(dirname "$0")/.." && pwd)/bigquery/telemetry_schema.json"
bq --project_id="$PROJECT_ID" mk --dataset --location=US "$PROJECT_ID:$DATASET_ID" >/dev/null 2>&1 || true
bq --project_id="$PROJECT_ID" mk --table "$PROJECT_ID:$DATASET_ID.$TABLE_ID" "$SCHEMA_FILE" >/dev/null 2>&1 || true
