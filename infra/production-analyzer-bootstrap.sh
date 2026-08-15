#!/bin/bash
# production-analyzer-bootstrap.sh
set -e

PROJECT_ID="aimhi-analyzer-sandbox"
AGENT_ID="coding-agent"
AGENT_SA="$AGENT_ID@$PROJECT_ID.iam.gserviceaccount.com"
DEPLOYER_SA="github-actions-deployer@$PROJECT_ID.iam.gserviceaccount.com"
BUILDER_SA="784473183307-compute@developer.gserviceaccount.com"

echo "=== Setting project ==="
gcloud config set project "$PROJECT_ID"

echo "=== Enabling production APIs ==="
gcloud services enable \
  run.googleapis.com \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  compute.googleapis.com \
  pubsub.googleapis.com \
  cloudscheduler.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  aiplatform.googleapis.com

echo "=== Ensuring coding-agent service account exists ==="
EXISTING=$(gcloud iam service-accounts list \
  --project="$PROJECT_ID" \
  --filter="email:$AGENT_SA" \
  --format="value(email)" || true)

if [[ -z "$EXISTING" ]]; then
  gcloud iam service-accounts create "$AGENT_ID" \
    --display-name="Production Analyzer Agent" \
    --project="$PROJECT_ID"
else
  echo "Service account $AGENT_SA already exists; skipping creation."
fi

echo "=== Ensuring GitHub deployer SA exists ==="
DEPLOYER_EXISTS=$(gcloud iam service-accounts list \
  --project="$PROJECT_ID" \
  --filter="email:$DEPLOYER_SA" \
  --format="value(email)" || true)

if [[ -z "$DEPLOYER_EXISTS" ]]; then
  gcloud iam service-accounts create github-actions-deployer \
    --display-name="GitHub Actions Deployer" \
    --project="$PROJECT_ID"
else
  echo "Service account $DEPLOYER_SA already exists; skipping creation."
fi

echo "=== Assigning production roles to coding-agent ==="
ROLES=(
  "roles/run.admin"
  "roles/cloudfunctions.admin"
  "roles/cloudbuild.builds.editor"
  "roles/secretmanager.secretAccessor"
  "roles/storage.admin"
  "roles/compute.admin"
  "roles/logging.logWriter"
  "roles/monitoring.metricWriter"
)

for ROLE in "${ROLES[@]}"; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$AGENT_SA" \
    --role="$ROLE"
done

echo "=== Assigning deployer roles to GitHub Actions SA ==="
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$DEPLOYER_SA" \
  --role="roles/iam.serviceAccountTokenCreator"

echo "=== Assigning Cloud Build builder role ==="
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$BUILDER_SA" \
  --role="roles/cloudbuild.builds.builder"

echo "=== Production analyzer cloud configuration complete ==="
