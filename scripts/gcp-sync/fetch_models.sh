#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
mkdir -p "$REPO_ROOT/gcp-state/models"
MODEL_TARGET="$REPO_ROOT/gcp-state/models/looker_autonomy.model.lkml"
VIEW_TARGET="$REPO_ROOT/gcp-state/models/autonomy.view.lkml"
if [ -n "${LOOKER_SOURCE_BUCKET:-}" ] && gsutil -q stat "${LOOKER_SOURCE_BUCKET%/}/looker_autonomy.model.lkml"; then gsutil cp "${LOOKER_SOURCE_BUCKET%/}/looker_autonomy.model.lkml" "$MODEL_TARGET"; else printf "connection: \"gcp_generated\"\ninclude: \"*.view\"\nexplore: autonomy {\n  label: \"Autonomy\"\n}\n" > "$MODEL_TARGET"; fi
if [ -n "${LOOKER_SOURCE_BUCKET:-}" ] && gsutil -q stat "${LOOKER_SOURCE_BUCKET%/}/autonomy.view.lkml"; then gsutil cp "${LOOKER_SOURCE_BUCKET%/}/autonomy.view.lkml" "$VIEW_TARGET"; else printf "view: autonomy {\n  sql_table_name: `autonomy.telemetry` ;;\n  dimension: id {\n    primary_key: yes\n    type: string\n    sql: \\${TABLE}.id ;;\n  }\n}\n" > "$VIEW_TARGET"; fi
