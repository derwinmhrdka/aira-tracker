#!/usr/bin/env bash
set -euo pipefail

BRANCH="${DEPLOY_BRANCH:-main}"
REMOTE="${DEPLOY_REMOTE:-origin}"

echo "==> Syncing ${REMOTE}/${BRANCH} in $(pwd)..."
git fetch "$REMOTE" "$BRANCH"
git checkout "$BRANCH"
git reset --hard "${REMOTE}/${BRANCH}"

echo "==> Sync complete at $(git rev-parse --short HEAD)"
