#!/bin/bash
# ═══════════════════════════════════════════════════════════
# 筹码筛选 relay 运行脚本（VPS cron 入口）
# 默认运行核心管线；--health 每5分钟检查 stale，异常时自动触发恢复
# 成功必须同时包含 Coinfilter relay OK 和 Forward relay OK
# ═══════════════════════════════════════════════════════════
if [ "${1:-}" = "--health" ]; then
  health=$(python3 - <<'PY'
import json
import urllib.request

try:
    with urllib.request.urlopen("https://app.slinglab.xyz/screener/api/screener?watchdog=1", timeout=20) as response:
        payload = json.load(response)
    print("healthy" if payload.get("stale") is False else "stale")
except Exception:
    print("unknown")
PY
  )
  if [ "$health" = "healthy" ]; then
    echo "===== [$(date -u +%H:%M:%S)] WATCHDOG healthy =====" >> /opt/screener/relay.log
  else
    echo "===== [$(date -u +%H:%M:%S)] WATCHDOG $health, triggering relay =====" >> /opt/screener/relay.log
    /opt/screener/run.sh
  fi
else
  cd /tmp/s 2>/dev/null && timeout 20 git pull --quiet 2>/dev/null && cp -f relay.mjs /opt/screener/relay.mjs 2>/dev/null
  cd /opt/screener
  set -a; source relay.env; set +a
  exec 9>/opt/screener/.relay.lock
  if flock -n 9; then
    success=0
    for attempt in 1 2; do
      echo "===== [$(date -u +%H:%M:%S)] relay attempt $attempt =====" >> relay.log
      out=$(RELAY_ROUNDS=1 RELAY_ROUND_INTERVAL_MS=0 timeout 12m node relay.mjs 2>&1)
      echo "$out" >> relay.log
      if echo "$out" | grep -q "Coinfilter relay OK" && echo "$out" | grep -q "Forward relay OK"; then
        echo "===== [$(date -u +%H:%M:%S)] SUCCESS on attempt $attempt =====" >> relay.log
        success=1
        break
      else
        echo "===== [$(date -u +%H:%M:%S)] core update incomplete on attempt $attempt =====" >> relay.log
        if [ "$attempt" -lt 2 ]; then sleep 60; fi
      fi
    done
    if [ "$success" -eq 0 ]; then
      echo "===== [$(date -u +%H:%M:%S)] FAILURE after 2 attempts =====" >> relay.log
      exit 1
    fi
  else
    echo "===== [$(date -u +%H:%M:%S)] SKIP overlapping relay =====" >> relay.log
  fi
fi
