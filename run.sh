#!/bin/bash
# ═══════════════════════════════════════════════════════════
# 筹码筛选 relay 运行脚本 (VPS cron 入口)
# - 自动同步最新 relay.mjs (git pull, 20s超时, 失败不阻塞)
# - 整条管线重试最多2轮，直到 forward 推送成功
#   coinfilter 受节流控制，不能作为每次 cron 的成功条件
# ═══════════════════════════════════════════════════════════
cd /tmp/s 2>/dev/null && timeout 20 git pull --quiet 2>/dev/null && cp -f relay.mjs /opt/screener/relay.mjs 2>/dev/null
cd /opt/screener
set -a; source relay.env; set +a

for attempt in 1 2; do
  echo "===== [$(date -u +%H:%M:%S)] relay attempt $attempt =====" >> relay.log
  out=$(node relay.mjs 2>&1)
  echo "$out" >> relay.log
  if echo "$out" | grep -q "Forward relay OK"; then
    echo "===== [$(date -u +%H:%M:%S)] SUCCESS on attempt $attempt =====" >> relay.log
    break
  else
    echo "===== [$(date -u +%H:%M:%S)] forward not OK, retry in 60s =====" >> relay.log
  fi
  sleep 60
done
