#!/bin/bash
set -eu
PROJECT_ID="${1:-aimhi-analyzer-sandbox}"
DATASET_ID="${2:-autonomy_telemetry}"
AGENT_SA="coding-agent@aimhi-analyzer-sandbox.iam.gserviceaccount.com"
LOGGING_SA="service-784473183307@gcp-sa-logging.iam.gserviceaccount.com"
gcloud config set project "$PROJECT_ID"
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$AGENT_SA" --role="roles/bigquery.admin" >/dev/null
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$AGENT_SA" --role="roles/logging.admin" >/dev/null
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$AGENT_SA" --role="roles/run.admin" >/dev/null
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$AGENT_SA" --role="roles/cloudbuild.builds.editor" >/dev/null
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$AGENT_SA" --role="roles/secretmanager.secretAccessor" >/dev/null
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$AGENT_SA" --role="roles/iam.serviceAccountTokenCreator" >/dev/null
bq --project_id="$PROJECT_ID" mk --dataset --location=US "$PROJECT_ID:$DATASET_ID" >/dev/null 2>&1 || true
bq --project_id="$PROJECT_ID" add-iam-policy-binding --member="serviceAccount:$LOGGING_SA" --role="roles/bigquery.dataEditor" "$PROJECT_ID:$DATASET_ID" >/dev/null
