#!/bin/bash
# ═══════════════════════════════════════════════════════════
# 筹码筛选 relay 运行脚本（VPS cron 入口）
# - forward 必须成功；本轮若 coinfilter 到期但失败，也必须立即重试
# - 最多2轮；仍失败则返回非零，禁止监控假绿
# ═══════════════════════════════════════════════════════════
cd /tmp/s 2>/dev/null && timeout 20 git pull --quiet 2>/dev/null && cp -f relay.mjs /opt/screener/relay.mjs 2>/dev/null
cd /opt/screener
set -a; source relay.env; set +a
exec 9>/opt/screener/.relay.lock
if flock -n 9; then
  success=0
  for attempt in 1 2; do
    echo "===== [$(date -u +%H:%M:%S)] relay attempt $attempt =====" >> relay.log
    out=$(node relay.mjs 2>&1)
    echo "$out" >> relay.log
    if echo "$out" | grep -q "Forward relay OK" && ! echo "$out" | grep -q "Heavy modules incomplete"; then
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
