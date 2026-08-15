#!/bin/bash
set -eu
PROJECT_ID="${1:-aimhi-analyzer-sandbox}"
REGION="${2:-us-central1}"
SERVICE_ACCOUNT_EMAIL="${3:-coding-agent@aimhi-analyzer-sandbox.iam.gserviceaccount.com}"
SERVICE_NAME="autonomy-emitter"
IMAGE="gcr.io/$PROJECT_ID/autonomy-emitter:latest"
gcloud run deploy "$SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION" --image="$IMAGE" --service-account="$SERVICE_ACCOUNT_EMAIL" --allow-unauthenticated --set-env-vars="PROJECT_ID=$PROJECT_ID"
