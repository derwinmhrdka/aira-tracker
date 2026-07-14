#!/usr/bin/env bash
set -euo pipefail

COMPOSE="${COMPOSE_CMD:-docker compose}"

if [ ! -f .env ]; then
  echo "ERROR: .env not found in $(pwd). Copy .env.example to .env first." >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

DOMAIN="${DOMAIN:-aira.teknodika.com}"
APP_URL="${APP_URL:-https://${DOMAIN}}"

if [[ "$APP_URL" != https://* ]]; then
  echo "ERROR: APP_URL must be https:// for production (current: ${APP_URL})" >&2
  echo "       Set APP_URL=https://${DOMAIN} in .env" >&2
  exit 1
fi

if [ -z "${SESSION_SECRET:-}" ] || [ "${#SESSION_SECRET}" -lt 32 ]; then
  echo "ERROR: SESSION_SECRET must be at least 32 characters in .env" >&2
  exit 1
fi

if [ -z "${POSTGRES_PASSWORD:-}" ] || [ "$POSTGRES_PASSWORD" = "change-me-strong-password" ]; then
  echo "WARNING: Change POSTGRES_PASSWORD from the default in .env" >&2
fi

PG_USER="${POSTGRES_USER:-baby_tracker}"
PG_DB="${POSTGRES_DB:-baby_tracker}"
if [ -n "${DATABASE_URL:-}" ] && ! echo "$DATABASE_URL" | grep -q "@db:5432/${PG_DB}"; then
  echo "WARNING: DATABASE_URL may not match Docker (expected host db, db ${PG_DB})" >&2
  echo "         Docker uses: postgresql://${PG_USER}:****@db:5432/${PG_DB}" >&2
fi

echo "==> Building and starting containers (db, app)..."
echo "    HTTPS is handled by host nginx — see deploy/nginx-aira.conf.example"

echo "==> Disk space before build:"
df -h / /tmp 2>/dev/null || df -h /

echo "==> Pruning unused Docker data (free disk for build)..."
docker system prune -f --filter "until=24h" 2>/dev/null || true
docker builder prune -f --filter "until=24h" 2>/dev/null || true
docker image prune -f --filter "until=24h" 2>/dev/null || true

$COMPOSE up -d --build --remove-orphans

echo "==> Container status:"
$COMPOSE ps

echo "==> Applying database schema..."
$COMPOSE exec -T -u root app prisma db push --skip-generate --accept-data-loss

echo "==> Seeding database (safe to re-run — skips if data exists)..."
$COMPOSE exec -T -u root app node node_modules/tsx/dist/cli.mjs prisma/seed.ts || true

echo "==> Waiting for app health..."
APP_READY=false
for i in $(seq 1 30); do
  if curl -fsS -o /dev/null http://127.0.0.1:13082/login 2>/dev/null \
    || wget -qO- http://127.0.0.1:13082/login >/dev/null 2>&1; then
    echo "==> App OK on 127.0.0.1:13082"
    APP_READY=true
    break
  fi
  echo "Attempt $i: app not ready, waiting 3s..."
  sleep 3
done

if [ "$APP_READY" = false ]; then
  echo "ERROR: App not responding on 127.0.0.1:13082" >&2
  $COMPOSE logs app --tail 50
  exit 1
fi

echo "==> Login page check..."
if curl -fsS http://127.0.0.1:13082/login 2>/dev/null | grep -qi 'pin\|login\|PIN'; then
  echo "==> /login OK"
else
  echo "WARNING: /login check did not match expected content" >&2
fi

echo "==> Checking public HTTPS (host nginx)..."
if curl -fsS -o /dev/null "https://${DOMAIN}" 2>/dev/null; then
  echo "==> Deploy finished OK — https://${DOMAIN}"
else
  echo "==> Containers OK. HTTPS not reachable yet at https://${DOMAIN}" >&2
  echo "    Configure host nginx: deploy/nginx-aira.conf.example" >&2
  echo "    Then: sudo certbot --nginx -d ${DOMAIN}" >&2
fi

if [ -n "${CRON_SECRET:-}" ]; then
  echo "==> Tip: install push cron with:"
  echo "    CRON_SECRET=\"...\" APP_URL=\"${APP_URL}\" bash scripts/setup-cron.sh"
fi
