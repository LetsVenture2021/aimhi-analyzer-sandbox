#!/usr/bin/env bash
set -euo pipefail

OUTPUT_DIR="${1:-gcp-state/looker}"
mkdir -p "${OUTPUT_DIR}"

echo '{"event":"fetch_looker_start"}'
echo '{"status":"noop","reason":"looker_api_not_configured","models":[]}' > "${OUTPUT_DIR}/models.json"
echo "{\"event\":\"fetch_looker_complete\",\"output\":\"${OUTPUT_DIR}/models.json\"}"
