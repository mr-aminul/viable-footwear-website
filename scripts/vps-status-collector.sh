#!/usr/bin/env bash
# Collect host + stack health for the public status page.
# Installed by scripts/deploy-vps.sh → cron every minute.
# Writes /var/lib/vps-status/report.json (world-readable, no secrets).
set -euo pipefail

STATE_DIR="${STATE_DIR:-/var/lib/vps-status}"
REPORT_FILE="${REPORT_FILE:-${STATE_DIR}/report.json}"
HISTORY_FILE="${HISTORY_FILE:-${STATE_DIR}/history.jsonl}"
HISTORY_MAX="${HISTORY_MAX:-90}"
CURL_TIMEOUT_SEC="${CURL_TIMEOUT_SEC:-4}"

mkdir -p "$STATE_DIR"
chmod 755 "$STATE_DIR"

tmp="$(mktemp)"
hist_tmp="$(mktemp)"
trap 'rm -f "$tmp" "$hist_tmp"' EXIT

json_escape() {
  # Minimal JSON string escape for shell values.
  python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().rstrip("\n")), end="")' <<<"$1"
}

read_bytes_field() {
  # Usage: read_bytes_field MemTotal /proc/meminfo → bytes
  local key="$1" file="$2"
  local kib
  kib="$(awk -v k="$key" '$1 == k ":" { print $2; exit }' "$file" 2>/dev/null || echo 0)"
  echo $((kib * 1024))
}

now_iso="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
now_epoch="$(date +%s)"
hostname_s="$(hostname -s 2>/dev/null || hostname)"
os_pretty="$(. /etc/os-release 2>/dev/null; echo "${PRETTY_NAME:-unknown}")"
kernel_s="$(uname -r)"
arch_s="$(uname -m)"
cpus="$(nproc 2>/dev/null || echo 1)"
cpu_model="$(awk -F: '/model name/ { gsub(/^ +/, "", $2); print $2; exit }' /proc/cpuinfo 2>/dev/null || echo unknown)"
uptime_sec="$(cut -d. -f1 /proc/uptime 2>/dev/null || echo 0)"

# Load averages
read -r load1 load5 load15 _ </proc/loadavg

mem_total="$(read_bytes_field MemTotal /proc/meminfo)"
mem_available="$(read_bytes_field MemAvailable /proc/meminfo)"
mem_used=$((mem_total - mem_available))
mem_pct=0
if (( mem_total > 0 )); then
  mem_pct=$((mem_used * 100 / mem_total))
fi
swap_total="$(read_bytes_field SwapTotal /proc/meminfo)"
swap_free="$(read_bytes_field SwapFree /proc/meminfo)"
swap_used=$((swap_total - swap_free))

# Root disk
disk_line="$(df -B1 --output=source,fstype,size,used,avail,pcent,target / 2>/dev/null | tail -1)"
disk_source="$(awk '{print $1}' <<<"$disk_line")"
disk_fstype="$(awk '{print $2}' <<<"$disk_line")"
disk_total="$(awk '{print $3}' <<<"$disk_line")"
disk_used="$(awk '{print $4}' <<<"$disk_line")"
disk_avail="$(awk '{print $5}' <<<"$disk_line")"
disk_pct_raw="$(awk '{print $6}' <<<"$disk_line")"
disk_pct="${disk_pct_raw%%%}"
disk_mount="$(awk '{print $7}' <<<"$disk_line")"

# Primary NIC traffic (prefer eth0, else first non-lo)
net_iface="eth0"
if [[ ! -e "/sys/class/net/${net_iface}" ]]; then
  net_iface="$(ls /sys/class/net 2>/dev/null | awk '$1!="lo" && $1!~/^docker/ && $1!~/^veth/ {print; exit}')"
fi
rx_bytes=0
tx_bytes=0
if [[ -n "${net_iface}" && -r "/sys/class/net/${net_iface}/statistics/rx_bytes" ]]; then
  rx_bytes="$(cat "/sys/class/net/${net_iface}/statistics/rx_bytes")"
  tx_bytes="$(cat "/sys/class/net/${net_iface}/statistics/tx_bytes")"
fi

unit_state() {
  systemctl is-active "$1" 2>/dev/null || echo inactive
}

probe_http() {
  local id="$1" label="$2" url="$3"
  local start end ms code
  start="$(date +%s%3N)"
  code="$(curl -fsS -o /dev/null -w '%{http_code}' --connect-timeout "$CURL_TIMEOUT_SEC" --max-time "$CURL_TIMEOUT_SEC" "$url" 2>/dev/null || echo 000)"
  end="$(date +%s%3N)"
  ms=$((end - start))
  local ok=false
  if [[ "$code" =~ ^(200|204|301|302|307|308|401|403)$ ]]; then
    ok=true
  fi
  printf '{"id":%s,"label":%s,"url":%s,"ok":%s,"latencyMs":%s,"httpStatus":%s}' \
    "$(json_escape "$id")" "$(json_escape "$label")" "$(json_escape "$url")" "$ok" "$ms" "$code"
}

# systemd units we care about on this shared Contabo box
services_json="["
first_svc=1
add_service() {
  local id="$1" label="$2" unit="$3"
  local state
  state="$(unit_state "$unit")"
  local status="down"
  case "$state" in
    active) status="up" ;;
    activating|reloading) status="degraded" ;;
    *) status="down" ;;
  esac
  if (( first_svc == 0 )); then services_json+=","; fi
  first_svc=0
  services_json+=$(printf '{"id":%s,"label":%s,"kind":"systemd","unit":%s,"status":%s,"detail":%s}' \
    "$(json_escape "$id")" "$(json_escape "$label")" "$(json_escape "$unit")" \
    "$(json_escape "$status")" "$(json_escape "$state")")
}

add_service "caddy" "Website gateway" "caddy.service"
add_service "postgres" "Database" "postgresql@17-main.service"
add_service "minio" "Photo & file storage" "minio.service"
add_service "docker" "App platform" "docker.service"
add_service "viable-web" "Viable website" "viable-web.service"
add_service "govibe-web" "GoVibe website" "govibe-web.service"
services_json+="]"

# Docker containers (names + status only)
containers_json="["
if command -v docker >/dev/null 2>&1; then
  first_c=1
  while IFS='|' read -r name status; do
    [[ -z "${name:-}" ]] && continue
    local_status="down"
    if [[ "$status" == Up* ]]; then local_status="up"; fi
    if (( first_c == 0 )); then containers_json+=","; fi
    first_c=0
    containers_json+=$(printf '{"name":%s,"status":%s,"detail":%s}' \
      "$(json_escape "$name")" "$(json_escape "$local_status")" "$(json_escape "$status")")
  done < <(docker ps -a --format '{{.Names}}|{{.Status}}' 2>/dev/null || true)
fi
containers_json+="]"

probes_json="["
probes_json+=$(probe_http "viable-local" "Viable website" "http://127.0.0.1:3000/")
probes_json+=","
probes_json+=$(probe_http "govibe-local" "GoVibe website" "http://127.0.0.1:3003/")
probes_json+=","
probes_json+=$(probe_http "viable-api" "Viable data API" "http://127.0.0.1:3001/")
probes_json+=","
probes_json+=$(probe_http "govibe-api" "GoVibe data API" "http://127.0.0.1:3002/")
probes_json+=","
probes_json+=$(probe_http "minio-live" "File storage" "http://127.0.0.1:9000/minio/health/live")
probes_json+=","
probes_json+=$(probe_http "viable-public" "viable.fashion (public)" "https://viable.fashion/")
probes_json+=","
probes_json+=$(probe_http "s3-public" "Image CDN (public)" "https://s3.viable.fashion/minio/health/live")
probes_json+="]"

# Overall rollup
overall="operational"
python3 - "$services_json" "$containers_json" "$probes_json" "$mem_pct" "$disk_pct" <<'PY' >"$tmp.overall" || true
import json, sys
services = json.loads(sys.argv[1])
containers = json.loads(sys.argv[2])
probes = json.loads(sys.argv[3])
mem_pct = int(sys.argv[4])
disk_pct = int(sys.argv[5])
down_services = sum(1 for s in services if s.get("status") == "down")
down_containers = sum(1 for c in containers if c.get("status") != "up")
failed_probes = sum(1 for p in probes if not p.get("ok"))
critical_down = any(
  s.get("id") in {"caddy", "postgres", "docker", "minio"} and s.get("status") == "down"
  for s in services
)
if critical_down or failed_probes >= 3 or down_services >= 2:
    print("outage")
elif down_services or down_containers or failed_probes or mem_pct >= 90 or disk_pct >= 90:
    print("degraded")
else:
    print("operational")
PY
overall="$(cat "$tmp.overall" 2>/dev/null || echo operational)"
rm -f "$tmp.overall"

# Append history sample + keep last HISTORY_MAX lines
printf '{"t":%s,"load1":%s,"memPercent":%s,"diskPercent":%s}\n' \
  "$now_epoch" "$load1" "$mem_pct" "$disk_pct" >>"$HISTORY_FILE"
tail -n "$HISTORY_MAX" "$HISTORY_FILE" >"$hist_tmp"
mv "$hist_tmp" "$HISTORY_FILE"

history_json="$(python3 - <<PY
import json
rows = []
try:
  with open("$HISTORY_FILE") as f:
    for line in f:
      line = line.strip()
      if not line:
        continue
      try:
        rows.append(json.loads(line))
      except Exception:
        pass
except FileNotFoundError:
  pass
print(json.dumps(rows))
PY
)"

cat >"$tmp" <<EOF
{
  "generatedAt": $(json_escape "$now_iso"),
  "hostname": $(json_escape "$hostname_s"),
  "platform": {
    "os": $(json_escape "$os_pretty"),
    "kernel": $(json_escape "$kernel_s"),
    "arch": $(json_escape "$arch_s"),
    "cpus": ${cpus},
    "cpuModel": $(json_escape "$cpu_model")
  },
  "uptimeSec": ${uptime_sec},
  "load": { "1": ${load1}, "5": ${load5}, "15": ${load15} },
  "memory": {
    "total": ${mem_total},
    "used": ${mem_used},
    "available": ${mem_available},
    "usedPercent": ${mem_pct}
  },
  "swap": {
    "total": ${swap_total},
    "used": ${swap_used}
  },
  "disks": [
    {
      "mount": $(json_escape "$disk_mount"),
      "device": $(json_escape "$disk_source"),
      "fstype": $(json_escape "$disk_fstype"),
      "total": ${disk_total:-0},
      "used": ${disk_used:-0},
      "available": ${disk_avail:-0},
      "usedPercent": ${disk_pct:-0}
    }
  ],
  "network": [
    {
      "iface": $(json_escape "${net_iface:-unknown}"),
      "rxBytes": ${rx_bytes},
      "txBytes": ${tx_bytes}
    }
  ],
  "services": ${services_json},
  "containers": ${containers_json},
  "probes": ${probes_json},
  "overall": $(json_escape "$overall"),
  "history": ${history_json}
}
EOF

python3 -m json.tool "$tmp" >"${REPORT_FILE}.new"
chmod 644 "${REPORT_FILE}.new"
mv "${REPORT_FILE}.new" "$REPORT_FILE"
echo "wrote ${REPORT_FILE} overall=${overall}"
