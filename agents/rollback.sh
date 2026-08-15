#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-analyzer-api}"
REGION="${REGION:-us-central1}"
PROJECT_ID="${PROJECT_ID:-aimhi-analyzer-sandbox}"

if gcloud run services describe "$SERVICE_NAME" \
  --region="$REGION" \
  --project="$PROJECT_ID" >/dev/null 2>&1; then
  CURRENT_REVISION="$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format='value(status.traffic[0].revisionName)')"

  TARGET_REVISION="$(gcloud run revisions list \
    --service="$SERVICE_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format='value(metadata.name)' \
    --sort-by='~metadata.creationTimestamp' \
    | awk -v current="$CURRENT_REVISION" '$1 != current {print; exit}')"

  if [[ -z "$TARGET_REVISION" ]]; then
    echo "Rollback skipped: no prior revision found for $SERVICE_NAME."
    exit 0
  fi

  gcloud run services update-traffic "$SERVICE_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --to-revisions "${TARGET_REVISION}=100"
  echo "Rollback completed: routed 100% traffic to $TARGET_REVISION."
else
  echo "Rollback skipped: $SERVICE_NAME does not exist."
fi
