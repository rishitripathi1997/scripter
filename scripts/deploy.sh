#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/connectx-scripts}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
GIT_BRANCH="${GIT_BRANCH:-main}"

cd "$APP_DIR"

echo "==> Pulling latest from origin/${GIT_BRANCH}"
git fetch origin
git checkout "$GIT_BRANCH"
git pull origin "$GIT_BRANCH"

echo "==> Rebuilding and restarting containers"
docker compose -f "$COMPOSE_FILE" up -d --build

echo "==> Pruning unused images"
docker image prune -f

echo "==> Deploy complete"
docker compose -f "$COMPOSE_FILE" ps
