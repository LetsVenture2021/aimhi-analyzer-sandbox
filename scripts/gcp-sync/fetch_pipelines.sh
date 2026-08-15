#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
mkdir -p "$REPO_ROOT/gcp-state/pipelines"
for PIPELINE_FILE in autonomy_master_pipeline.yaml autonomy_chaos_pipeline.yaml autonomy_canary_pipeline.yaml autonomy_ux_pipeline.yaml autonomy_security_pipeline.yaml autonomy_drift_pipeline.yaml; do PIPELINE_NAME="${PIPELINE_FILE%.yaml}"; TARGET_FILE="$REPO_ROOT/gcp-state/pipelines/$PIPELINE_FILE"; if [ -n "${PIPELINE_SOURCE_BUCKET:-}" ] && gsutil -q stat "${PIPELINE_SOURCE_BUCKET%/}/$PIPELINE_FILE"; then gsutil cp "${PIPELINE_SOURCE_BUCKET%/}/$PIPELINE_FILE" "$TARGET_FILE"; else SCHEDULE_VALUE="$(gcloud scheduler jobs list --project="$GCP_PROJECT_ID" --location="$GCP_REGION" --filter="name~$PIPELINE_NAME" --format='value(schedule)' | head -n 1 || true)"; printf "pipeline_name: %s\nsource: gcp-generated\nschedule: %s\n" "$PIPELINE_NAME" "${SCHEDULE_VALUE:-unscheduled}" > "$TARGET_FILE"; fi; done
