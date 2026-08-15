#!/usr/bin/env bash
set -euo pipefail
gcloud logging write analyzer-autonomy "event=startup source=telemetry-emitter" --project="${GCP_PROJECT_ID:-unset-project}" --severity=INFO
