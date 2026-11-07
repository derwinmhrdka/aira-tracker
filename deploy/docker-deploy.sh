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

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

echo "==> Building and starting containers (db, app)..."
echo "    HTTPS is handled by host nginx — see deploy/nginx-aira.conf.example"

echo "==> Disk space before build:"
df -h / /tmp 2>/dev/null || df -h /
echo "==> Memory before build:"
free -h 2>/dev/null || true

# A Next.js image build on this 1.7 GB VPS swaps forever when RAM and swap
# are already full, and the SSH session hits its 90 minute limit.
avail_kb="$(awk '/MemAvailable:/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)"
swap_total_kb="$(awk '/SwapTotal:/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)"
swap_free_kb="$(awk '/SwapFree:/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)"
if [ "${avail_kb}" -lt 600000 ] || { [ "${swap_total_kb}" -gt 0 ] && [ "${swap_free_kb}" -lt 200000 ]; }; then
  echo "ERROR: Not enough free memory to build the app image." >&2
  echo "       MemAvailable=$((avail_kb / 1024)) MB, SwapFree=$((swap_free_kb / 1024)) MB." >&2
  echo "       Stop other app containers, wait until available memory is above 600 MB, then redeploy." >&2
  echo "       Leave database containers and teknodika-nginx running." >&2
  exit 1
fi

echo "==> Pruning stopped containers and dangling images..."
# Do not prune the BuildKit cache here. That cache is what skips the
# ~15 minute npm ci when package-lock.json has not changed.
docker container prune -f --filter "until=24h" 2>/dev/null || true
docker image prune -f 2>/dev/null || true

# `restart: unless-stopped` can start the app again between Compose's
# stop and remove, which fails with "container is running". Force-remove
# the app only. The database container is left running.
app_id="$($COMPOSE ps -aq app 2>/dev/null || true)"
if [ -n "${app_id}" ]; then
  echo "==> Force-removing app container ${app_id} before recreate..."
  docker update --restart=no "${app_id}" 2>/dev/null || true
  docker rm -f "${app_id}"
fi

$COMPOSE up -d --build --remove-orphans

# teknodika-nginx proxies to aira-tracker-app-1:3000 and keeps the IP it
# resolved at startup. A recreated app gets a new IP, so HTTPS stays 502
# until this container is on teknodika_shared and nginx is reloaded.
APP_NAME="aira-tracker-app-1"
SHARED_NET="teknodika_shared"
if docker inspect -f '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}} {{end}}' "$APP_NAME" | grep -qw "$SHARED_NET"; then
  echo "==> ${APP_NAME} is on ${SHARED_NET}"
else
  echo "==> Attaching ${APP_NAME} to ${SHARED_NET}..."
  docker network connect "$SHARED_NET" "$APP_NAME"
fi

if docker ps --format '{{.Names}}' | grep -qx 'teknodika-nginx'; then
  echo "==> Reloading teknodika-nginx so it uses the current app address..."
  docker exec teknodika-nginx nginx -s reload
else
  echo "WARNING: teknodika-nginx is not running. https://${DOMAIN} will 502 until that proxy reloads." >&2
fi

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
