#!/usr/bin/env bash
set -euo pipefail

SOURCE_BRANCH="${1:?source branch required}"
TARGET_BRANCH="${2:?target branch required}"

if [[ "$SOURCE_BRANCH" == "$TARGET_BRANCH" ]]; then
  echo "Source and target branches are identical; skipping."
  exit 0
fi

git fetch origin "$SOURCE_BRANCH" "$TARGET_BRANCH"

if git merge-base --is-ancestor "origin/$SOURCE_BRANCH" "origin/$TARGET_BRANCH"; then
  echo "No new commits to merge from $SOURCE_BRANCH into $TARGET_BRANCH."
  exit 0
fi

git checkout -B "$TARGET_BRANCH" "origin/$TARGET_BRANCH"
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

set +e
git merge --no-ff --no-commit "origin/$SOURCE_BRANCH"
MERGE_EXIT=$?
set -e

if [[ $MERGE_EXIT -ne 0 ]]; then
  mapfile -t conflicted_files < <(git diff --name-only --diff-filter=U)

  for file in "${conflicted_files[@]}"; do
    case "$file" in
      engine/*|*/engine/*)
        git checkout --theirs -- "$file"
        ;;
      ui/*|*/ui/*)
        git checkout --ours -- "$file"
        ;;
      data/synthetic/*|*/synthetic/*)
        git checkout --theirs -- "$file"
        ;;
      data/experimental/*|*/experimental/*)
        git checkout --ours -- "$file"
        ;;
      *)
        if [[ "$TARGET_BRANCH" == "main" ]]; then
          git checkout --ours -- "$file"
        else
          git checkout --theirs -- "$file"
        fi
        ;;
    esac
    git add -- "$file"
  done

  if [[ -n "$(git diff --name-only --diff-filter=U)" ]]; then
    echo "Unresolved conflicts remain after deterministic resolution rules."
    git merge --abort
    exit 1
  fi
fi

if [[ "$TARGET_BRANCH" == "main" && -f package.json ]]; then
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi

  if node -e "const s=require('./package.json').scripts||{};process.exit(s['lint']?0:1)"; then
    npm run lint
  fi

  if node -e "const s=require('./package.json').scripts||{};process.exit(s['typecheck']?0:1)"; then
    npm run typecheck
  fi

  if node -e "const s=require('./package.json').scripts||{};process.exit(s['test']?0:1)"; then
    npm test
  fi
fi

git commit -m "chore(auto-merge): ${SOURCE_BRANCH} -> ${TARGET_BRANCH}"
git push origin "$TARGET_BRANCH"
