#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STATE_DIR="${ROOT_DIR}/gcp-state"
mkdir -p "${STATE_DIR}"

echo '{"event":"gcp_sync_start"}'
bash "${ROOT_DIR}/scripts/gcp-sync/fetch_iam.sh" "${STATE_DIR}/iam"
bash "${ROOT_DIR}/scripts/gcp-sync/fetch_bigquery.sh" "${STATE_DIR}/bigquery"
bash "${ROOT_DIR}/scripts/gcp-sync/fetch_logging.sh" "${STATE_DIR}/logging"
bash "${ROOT_DIR}/scripts/gcp-sync/fetch_cloud_run.sh" "${STATE_DIR}/cloud-run"
bash "${ROOT_DIR}/scripts/gcp-sync/fetch_pipelines.sh" "${STATE_DIR}/pipelines"
bash "${ROOT_DIR}/scripts/gcp-sync/fetch_dashboards.sh" "${STATE_DIR}/dashboards"
bash "${ROOT_DIR}/scripts/gcp-sync/fetch_looker.sh" "${STATE_DIR}/looker"
find "${STATE_DIR}" -type f -name "*.json" -print0 | xargs -0 -I{} sh -c 'tmp="${1}.tmp" && jq -S . "${1}" > "${tmp}" && mv "${tmp}" "${1}"' sh {}
echo '{"event":"gcp_sync_complete"}'
