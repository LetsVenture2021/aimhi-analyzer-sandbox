#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
mkdir -p "$REPO_ROOT/gcp-state/logging"
gcloud logging sinks list --project="$GCP_PROJECT_ID" --format=json > "$REPO_ROOT/gcp-state/logging/sinks.json" || echo "[]" > "$REPO_ROOT/gcp-state/logging/sinks.json"
