#!/bin/bash
set -eu
PROJECT_ID="${1:-aimhi-analyzer-sandbox}"
REGION="${2:-us-central1}"
SERVICE_ACCOUNT_EMAIL="${3:-coding-agent@aimhi-analyzer-sandbox.iam.gserviceaccount.com}"
gcloud functions deploy autonomyTelemetryEmitter --project="$PROJECT_ID" --region="$REGION" --runtime=python312 --source="$(cd "$(dirname "$0")/.." && pwd)/telemetry" --entry-point=emit_autonomy_event --trigger-http --allow-unauthenticated --service-account="$SERVICE_ACCOUNT_EMAIL"
