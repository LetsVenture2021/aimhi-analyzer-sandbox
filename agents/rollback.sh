#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-analyzer-api}"
REGION="${REGION:-us-central1}"
PROJECT_ID="${PROJECT_ID:-aimhi-analyzer-sandbox}"
BLUE="${SERVICE_NAME}-blue"

if gcloud run services describe "$BLUE" \
  --region="$REGION" \
  --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud run services update-traffic "$SERVICE_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --to-revisions "${BLUE}=100"
  echo "Rollback completed: routed 100% traffic to $BLUE."
else
  echo "Rollback skipped: $BLUE does not exist."
fi
