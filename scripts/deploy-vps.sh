#!/usr/bin/env bash
# Deploy Viable storefront on the production VPS (run on that server as root).
# App: /var/www/viable  Service: viable-web.service :3000
# Domains: viable.fashion + s3.viable.fashion (PostgREST /viable-rest)
# SSH host and credentials: local gitignored .env / docs/ops.local.md — not this file.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/viable}"
BRANCH="${BRANCH:-main}"
SERVICE_NAME="${SERVICE_NAME:-viable-web.service}"

cd "$APP_DIR"
git fetch origin
git reset --hard "origin/${BRANCH}"

# Re-exec so the rest of this deploy uses the script that was just pulled
# (bash keeps running the old file contents otherwise).
if [[ "${VIABLE_DEPLOY_REEXEC:-}" != "1" ]]; then
  export VIABLE_DEPLOY_REEXEC=1
  exec bash "$APP_DIR/scripts/deploy-vps.sh"
fi

npm ci
# Build may need more RAM than the running app; this only affects `npm run build`.
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}"
npm run build

# --- Resource guardrails (memory cap + health watchdog + nightly restart) ---
DROPIN_DIR="/etc/systemd/system/${SERVICE_NAME}.d"
mkdir -p "$DROPIN_DIR"
cp "$APP_DIR/scripts/systemd/viable-web-memory.conf" "$DROPIN_DIR/memory.conf"
systemctl daemon-reload

# Intelligent heal: if :3000 stops answering, restart (old VPS behaviour).
WATCHDOG_SRC="$APP_DIR/scripts/viable-web-watchdog.sh"
WATCHDOG_BIN="/usr/local/sbin/viable-web-watchdog"
install -m 755 "$WATCHDOG_SRC" "$WATCHDOG_BIN"
WATCHDOG_CRON="/etc/cron.d/viable-web-watchdog"
cat >"$WATCHDOG_CRON" <<EOF
# Restart Viable when local health check fails (hung Next / memory pressure).
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
* * * * * root ${WATCHDOG_BIN}
EOF
chmod 644 "$WATCHDOG_CRON"

# Nightly restart at 03:15 local time — clears memory creep with a short blip.
CRON_FILE="/etc/cron.d/viable-web-nightly"
cat >"$CRON_FILE" <<EOF
# Restart Viable overnight so memory creep does not accumulate.
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
15 3 * * * root /bin/systemctl restart ${SERVICE_NAME}
EOF
chmod 644 "$CRON_FILE"

# Weekly wipe of Next image/data cache (Sunday 03:05), then restart covers it.
CACHE_CRON="/etc/cron.d/viable-web-cache-wipe"
cat >"$CACHE_CRON" <<EOF
# Clear Next.js on-disk cache weekly to limit disk/memory creep.
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
5 3 * * 0 root /bin/rm -rf ${APP_DIR}/.next/cache && /bin/systemctl restart ${SERVICE_NAME}
EOF
chmod 644 "$CACHE_CRON"

systemctl restart "$SERVICE_NAME"
systemctl --no-pager --full status "$SERVICE_NAME" | head -20

# next start needs a moment after systemd restart
health=000
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  health="$(curl -fsS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ || true)"
  if [[ "$health" == "200" ]]; then
    break
  fi
  sleep 2
done
echo "health=${health}"
if [[ "$health" != "200" ]]; then
  echo "Deploy finished but local health check did not return 200." >&2
  exit 1
fi

echo "Deploy complete ($(git rev-parse --short HEAD))."
echo "Memory cap + health watchdog + nightly restart + weekly cache wipe are active."
