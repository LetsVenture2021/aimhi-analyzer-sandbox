#!/bin/bash
set -eu
PROJECT_ID="${1:-aimhi-analyzer-sandbox}"
DATASET_ID="${2:-autonomy_telemetry}"
SINK_NAME="${3:-autonomy-telemetry-sink}"
DESTINATION="bigquery.googleapis.com/projects/$PROJECT_ID/datasets/$DATASET_ID"
FILTER="resource.type=("cloud_run_revision" OR "cloud_function")"
gcloud logging sinks describe "$SINK_NAME" --project="$PROJECT_ID" >/dev/null 2>&1 && gcloud logging sinks update "$SINK_NAME" "$DESTINATION" --log-filter="$FILTER" --project="$PROJECT_ID" >/dev/null || gcloud logging sinks create "$SINK_NAME" "$DESTINATION" --log-filter="$FILTER" --project="$PROJECT_ID" >/dev/null
