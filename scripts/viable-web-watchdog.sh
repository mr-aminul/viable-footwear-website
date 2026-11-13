#!/usr/bin/env bash
# Health watchdog for viable-web.service.
# If Next on :3000 stops answering, restart — same idea as the old VPS auto-heal.
# Installed by scripts/deploy-vps.sh as /etc/cron.d/viable-web-watchdog (every minute).
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-viable-web.service}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/}"
CURL_TIMEOUT_SEC="${CURL_TIMEOUT_SEC:-5}"
# Need this many consecutive failures before restart (avoids blips during deploy).
FAILS_BEFORE_RESTART="${FAILS_BEFORE_RESTART:-2}"
# Do not restart again within this window after a successful heal.
COOLDOWN_SEC="${COOLDOWN_SEC:-120}"

STATE_DIR="${STATE_DIR:-/run/viable-web-watchdog}"
FAIL_FILE="${STATE_DIR}/fail_count"
COOLDOWN_FILE="${STATE_DIR}/last_restart"

mkdir -p "$STATE_DIR"

log() {
  logger -t viable-web-watchdog -- "$*"
  echo "$*"
}

now_epoch() { date +%s; }

read_int() {
  local f="$1" default="$2"
  if [[ -f "$f" ]]; then
    local v
    v="$(tr -cd '0-9' <"$f" || true)"
    [[ -n "$v" ]] && echo "$v" && return
  fi
  echo "$default"
}

# Skip while systemd says the unit is starting/stopping/reloading.
active_state="$(systemctl show -p ActiveState --value "$SERVICE_NAME" 2>/dev/null || echo unknown)"
if [[ "$active_state" != "active" ]]; then
  echo "0" >"$FAIL_FILE"
  exit 0
fi

code="$(curl -fsS -o /dev/null -w '%{http_code}' --connect-timeout "$CURL_TIMEOUT_SEC" --max-time "$CURL_TIMEOUT_SEC" "$HEALTH_URL" || true)"
if [[ "$code" == "200" || "$code" == "301" || "$code" == "302" || "$code" == "308" ]]; then
  echo "0" >"$FAIL_FILE"
  exit 0
fi

fails="$(read_int "$FAIL_FILE" 0)"
fails=$((fails + 1))
echo "$fails" >"$FAIL_FILE"
log "health fail code=${code:-000} fails=${fails}/${FAILS_BEFORE_RESTART}"

if (( fails < FAILS_BEFORE_RESTART )); then
  exit 0
fi

last_restart="$(read_int "$COOLDOWN_FILE" 0)"
now="$(now_epoch)"
if (( now - last_restart < COOLDOWN_SEC )); then
  log "unhealthy but in cooldown (${COOLDOWN_SEC}s) — skip restart"
  exit 0
fi

log "restarting ${SERVICE_NAME} after ${fails} failed health checks"
echo "$now" >"$COOLDOWN_FILE"
echo "0" >"$FAIL_FILE"
systemctl restart "$SERVICE_NAME"
exit 0
