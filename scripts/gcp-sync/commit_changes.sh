#!/usr/bin/env bash
set -euo pipefail

TARGET_BRANCH="${1:-main}"
COMMIT_AUTHOR_NAME="${GIT_AUTHOR_NAME:-autonomy-sync-bot}"
COMMIT_AUTHOR_EMAIL="${GIT_AUTHOR_EMAIL:-autonomy-sync-bot@users.noreply.github.com}"

echo "{\"event\":\"commit_changes_start\",\"branch\":\"${TARGET_BRANCH}\"}"
git config user.name "${COMMIT_AUTHOR_NAME}"
git config user.email "${COMMIT_AUTHOR_EMAIL}"
git add gcp-state github-actions scripts/gcp-sync agent-interface || true
if git diff --staged --quiet; then
  echo '{"event":"commit_changes_skipped","reason":"no_changes"}'
  exit 0
fi
git commit -m "chore(sync): update GCP state snapshot"
git push origin "${TARGET_BRANCH}"
echo "{\"event\":\"commit_changes_complete\",\"branch\":\"${TARGET_BRANCH}\"}"
