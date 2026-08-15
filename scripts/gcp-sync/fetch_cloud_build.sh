#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
mkdir -p "$REPO_ROOT/gcp-state/cloud-build"
gcloud builds triggers list --project="$GCP_PROJECT_ID" --format=json > "$REPO_ROOT/gcp-state/cloud-build/triggers.json" || echo "[]" > "$REPO_ROOT/gcp-state/cloud-build/triggers.json"
gcloud builds list --project="$GCP_PROJECT_ID" --limit=100 --sort-by=~createTime --format=json > "$REPO_ROOT/gcp-state/cloud-build/history.json" || echo "[]" > "$REPO_ROOT/gcp-state/cloud-build/history.json"
