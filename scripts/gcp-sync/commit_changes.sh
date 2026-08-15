#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$REPO_ROOT"
if git diff --quiet --exit-code -- gcp-state; then echo "No GCP state changes detected."; exit 0; fi
git add gcp-state
if git diff --cached --quiet --exit-code; then echo "No staged GCP state changes detected."; exit 0; fi
git config user.name "${GIT_AUTHOR_NAME:-github-actions[bot]}"
git config user.email "${GIT_AUTHOR_EMAIL:-41898282+github-actions[bot]@users.noreply.github.com}"
git commit -m "chore: sync gcp state $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git push origin HEAD:main
