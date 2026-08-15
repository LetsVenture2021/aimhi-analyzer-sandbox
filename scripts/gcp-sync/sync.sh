#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"
mkdir -p gcp-state/iam gcp-state/bigquery/tables gcp-state/logging gcp-state/cloud-run/services gcp-state/cloud-build gcp-state/pipelines gcp-state/dashboards gcp-state/models gcp-state/scripts
touch gcp-state/iam/project.json gcp-state/iam/service-accounts.json gcp-state/iam/bigquery-dataset.json gcp-state/iam/logging-sink.json gcp-state/bigquery/datasets.json gcp-state/bigquery/tables/telemetry.json gcp-state/logging/sinks.json gcp-state/cloud-run/services/autonomy-service.json gcp-state/cloud-build/triggers.json gcp-state/cloud-build/history.json gcp-state/pipelines/autonomy_master_pipeline.yaml gcp-state/pipelines/autonomy_chaos_pipeline.yaml gcp-state/pipelines/autonomy_canary_pipeline.yaml gcp-state/pipelines/autonomy_ux_pipeline.yaml gcp-state/pipelines/autonomy_security_pipeline.yaml gcp-state/pipelines/autonomy_drift_pipeline.yaml gcp-state/dashboards/grafana_autonomy_dashboard.json gcp-state/models/looker_autonomy.model.lkml gcp-state/models/autonomy.view.lkml gcp-state/scripts/emit_autonomy_telemetry.sh
"$SCRIPT_DIR/fetch_iam.sh"
"$SCRIPT_DIR/fetch_bigquery.sh"
"$SCRIPT_DIR/fetch_logging.sh"
"$SCRIPT_DIR/fetch_cloud_run.sh"
"$SCRIPT_DIR/fetch_cloud_build.sh"
"$SCRIPT_DIR/fetch_pipelines.sh"
"$SCRIPT_DIR/fetch_dashboards.sh"
"$SCRIPT_DIR/fetch_models.sh"
"$SCRIPT_DIR/fetch_scripts.sh"
"$SCRIPT_DIR/commit_changes.sh"
