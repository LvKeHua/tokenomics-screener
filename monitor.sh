#!/bin/bash
set -u

STATUS_URL="${STATUS_URL:-https://app.slinglab.xyz/screener/api/status?monitor=1}"
JP_HOST="${JP_HOST:-23.27.52.165}"
JP_USER="${JP_USER:-root}"
JP_KEY="${JP_KEY:-/opt/screener-monitor/id_ed25519}"
LOG_FILE="${LOG_FILE:-/opt/screener-monitor/monitor.log}"
LOCK_FILE="${LOCK_FILE:-/opt/screener-monitor/.monitor.lock}"

check_health() {
  python3 - "$STATUS_URL" <<'PY'
import json
import sys
import urllib.request

try:
    with urllib.request.urlopen(sys.argv[1], timeout=20) as response:
        payload = json.load(response)
    print("healthy" if payload.get("stale") is False else "stale")
except Exception:
    print("unknown")
PY
}

trigger_recovery() {
  timeout 30 ssh -i "$JP_KEY" \
    -o BatchMode=yes \
    -o StrictHostKeyChecking=yes \
    -o ConnectTimeout=15 \
    -o ServerAliveInterval=5 \
    -o ServerAliveCountMax=2 \
    "$JP_USER@$JP_HOST" true >/dev/null 2>&1
}

mkdir -p "$(dirname "$LOG_FILE")"
exec 9>"$LOCK_FILE"
if flock -n 9; then
  health=$(check_health)
  if [ "${MONITOR_FORCE_RECOVERY:-0}" = "1" ]; then
    health="forced"
  fi
  now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  if [ "$health" = "healthy" ]; then
    echo "$now healthy" >> "$LOG_FILE"
  else
    if trigger_recovery; then
      echo "$now $health recovery-triggered" >> "$LOG_FILE"
    else
      echo "$now $health recovery-failed" >> "$LOG_FILE"
    fi
  fi
else
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) overlapping-monitor-skipped" >> "$LOG_FILE"
fi
