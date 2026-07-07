#!/usr/bin/env bash
# Setup cron job for baby-tracker push reminders
# Usage: CRON_SECRET="secret" APP_URL="https://aira.teknodika.com" ./scripts/setup-cron.sh

set -euo pipefail

CRON_SECRET="${CRON_SECRET:-}"
APP_URL="${APP_URL:-}"

if [ -z "$CRON_SECRET" ] || [ -z "$APP_URL" ]; then
  echo "Usage: CRON_SECRET=\"your-secret\" APP_URL=\"https://your-domain.com\" $0"
  exit 1
fi

CRON_LINE="*/15 * * * * curl -sf -H \"x-cron-secret: ${CRON_SECRET}\" ${APP_URL}/api/push/cron >> /var/log/baby-tracker-cron.log 2>&1"

# Avoid duplicate entries
(crontab -l 2>/dev/null | grep -v "baby-tracker-cron" || true; echo "$CRON_LINE") | crontab -

echo "Cron installed:"
echo "  $CRON_LINE"
echo ""
echo "Test with:"
echo "  curl -H \"x-cron-secret: ${CRON_SECRET}\" ${APP_URL}/api/push/cron"
