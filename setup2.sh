#!/bin/bash
# ═══════════════════════════════════════════════════════════
# 筹码筛选 Relay 一键部署 v2 (Evoxt VPS)
# 短命令版: 密钥从 GitHub Actions secrets 同步的已知值读取
# 用法: bash <(curl -sL .../setup2.sh)
# ═══════════════════════════════════════════════════════════
set -e

# 密钥从环境变量读取（勿硬编码入库）
# 用法: RELAY_AUTH_KEY=xxx DEMON_RELAY_KEY=xxx COINALYZE_API_KEY=xxx bash setup2.sh
RELAY_AUTH_KEY="${RELAY_AUTH_KEY:-}"
DEMON_RELAY_KEY="${DEMON_RELAY_KEY:-}"
COINALYZE_API_KEY="${COINALYZE_API_KEY:-}"
if [ -z "$RELAY_AUTH_KEY" ] || [ -z "$DEMON_RELAY_KEY" ]; then
  echo "❌ 缺少密钥环境变量。请先设置 RELAY_AUTH_KEY / DEMON_RELAY_KEY 再运行。"
  exit 1
fi

echo "=== 密钥校验 ==="
echo "RELAY_AUTH_KEY    长度=${#RELAY_AUTH_KEY} (期望64)"
echo "DEMON_RELAY_KEY   长度=${#DEMON_RELAY_KEY} (期望48)"
echo "COINALYZE_API_KEY 长度=${#COINALYZE_API_KEY} (期望36)"

echo ""
echo "=== 1/5 Node.js ==="
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1 || {
    echo "nodesource 失败, 尝试 apt..."
    apt-get update -qq && apt-get install -y -qq nodejs npm
  }
  apt-get install -y -qq nodejs >/dev/null 2>&1 || true
fi
node --version || { echo "FAIL: node install"; exit 1; }

echo ""
echo "=== 2/5 获取 relay.mjs（git clone 主域名，raw 域名在VPS被拦） ==="
mkdir -p /opt/screener
if [ -f /tmp/s/relay.mjs ]; then
  cp -f /tmp/s/relay.mjs /opt/screener/relay.mjs
  echo "from /tmp/s (existing clone)"
else
  git clone --depth 1 https://github.com/LvKeHua/tokenomics-screener.git /tmp/s 2>/dev/null || true
  cp -f /tmp/s/relay.mjs /opt/screener/relay.mjs 2>/dev/null || { echo "FAIL: relay.mjs not found"; exit 1; }
fi
wc -l /opt/screener/relay.mjs

echo ""
echo "=== 3/5 写入配置 ==="
cat > /opt/screener/relay.env <<EOF
WORKER_URL=https://app.slinglab.xyz/screener/api/relay-tickers
RELAY_AUTH_KEY=${RELAY_AUTH_KEY}
DEMON_URL=https://app.slinglab.xyz/screener/api/relay-demon
DEMON_RELAY_KEY=${DEMON_RELAY_KEY}
COINALYZE_API_KEY=${COINALYZE_API_KEY}
EOF
chmod 600 /opt/screener/relay.env

cat > /opt/screener/run.sh <<'EOF'
#!/bin/bash
# 默认运行核心管线；--health 每5分钟检查 stale，异常时自动触发恢复
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
EOF
chmod +x /opt/screener/run.sh

echo ""
echo "=== 4.5/5 写入本地兜底开关（默认关闭） ==="
cat > /opt/screener/.fallback_disabled <<'EOF'
# 本文件表示 relay 已切换为 VPS 唯一来源，本地兜底已停用。
# 如需回退，删除本文件并在本机启动 relay-loop.js（已从仓库移除）。
EOF

echo ""
echo "=== 4/5 安装 cron + 定时任务 ==="
if ! command -v crontab >/dev/null 2>&1; then
  echo "install cron..."
  apt-get install -y -qq cron || { echo "FAIL: cron install. Manual: apt-get install -y cron"; exit 1; }
fi
systemctl enable cron >/dev/null 2>&1 || service cron start >/dev/null 2>&1 || true
( crontab -l 2>/dev/null | grep -v "screener/run.sh"; echo "*/15 * * * * /opt/screener/run.sh"; echo "*/5 * * * * /opt/screener/run.sh --health" ) | crontab -
echo "crontab:"
crontab -l | grep screener || echo "(not found)"

echo ""
echo "=== 5/5 立即运行验证 ==="
/opt/screener/run.sh
echo "--- relay.log tail ---"
tail -15 /opt/screener/relay.log

echo ""
echo "DONE. cron: every 15min. log: /opt/screener/relay.log"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  本地兜底已停用"
echo "  - relay-loop.js / relay-runner.bat 已从仓库删除"
echo "  - 请勿在本机再跑 relay 定时任务，避免双写 KV"
echo "  - 如需本地调试：node relay.mjs（一次性）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
