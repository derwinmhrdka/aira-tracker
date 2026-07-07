#!/usr/bin/env bash
# First-time VPS bootstrap for aira-tracker (run once on the server)
set -euo pipefail

APP_DIR="${APP_DIR:-/apps/aira-tracker}"
DOMAIN="${DOMAIN:-aira.teknodika.com}"
REPO_URL="${REPO_URL:-https://github.com/derwinmhrdka/aira-tracker.git}"

echo "==> Baby Tracker VPS setup"
echo "    App dir : ${APP_DIR}"
echo "    Domain  : ${DOMAIN}"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker not installed. Install Docker + docker compose plugin first." >&2
  exit 1
fi

if [ ! -d "$APP_DIR/.git" ]; then
  mkdir -p "$(dirname "$APP_DIR")"
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "==> Created .env from .env.example — EDIT SECRETS before deploy:"
  echo "    nano ${APP_DIR}/.env"
  exit 0
fi

chmod +x deploy/git-sync.sh deploy/docker-deploy.sh scripts/setup-cron.sh 2>/dev/null || true

echo "==> Nginx (host) — copy and enable site config:"
echo "    sudo cp deploy/aira.conf /etc/nginx/sites-available/aira.conf"
echo "    sudo ln -sf /etc/nginx/sites-available/aira.conf /etc/nginx/sites-enabled/"
echo "    sudo nginx -t && sudo systemctl reload nginx"
echo "    sudo certbot --nginx -d ${DOMAIN}"
echo ""
echo "==> Then deploy:"
echo "    cd ${APP_DIR} && bash deploy/docker-deploy.sh"
echo ""
echo "==> GitHub Actions secrets (for auto deploy):"
echo "    VPS_HOST, VPS_USER, VPS_SSH_KEY, VPS_APP_DIR=${APP_DIR}"
