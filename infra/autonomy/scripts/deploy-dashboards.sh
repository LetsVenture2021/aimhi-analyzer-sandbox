#!/bin/bash
set -eu
PROJECT_ID="${1:-aimhi-analyzer-sandbox}"
SOURCE_FILE="$(cd "$(dirname "$0")/.." && pwd)/grafana/autonomy-dashboard.json"
TARGET_BUCKET="gs://$PROJECT_ID-autonomy-dashboards"
gsutil ls "$TARGET_BUCKET" >/dev/null 2>&1 || gsutil mb -p "$PROJECT_ID" "$TARGET_BUCKET"
gsutil cp "$SOURCE_FILE" "$TARGET_BUCKET/autonomy-dashboard.json"
