#!/bin/bash
# ═══════════════════════════════════════════════════════════
# 筹码筛选 Relay 一键部署 v2 (Evoxt VPS)
# 短命令版: 密钥从 GitHub Actions secrets 同步的已知值读取
# 用法: bash <(curl -sL .../setup2.sh)
# ═══════════════════════════════════════════════════════════
set -e

# 密钥（与本地 relay-runner.js 完全一致，已核对）
RELAY_AUTH_KEY="55e313c395c3c93a212754423b53ffff0396cfa98f32c4c9fe5b45000f803a99"
DEMON_RELAY_KEY="0eb3f463c85e160bbedbec6b3131bb862bdd0c82ccf9f390"
COINALYZE_API_KEY="aa861aac-7194-430b-a4da-aab3ea98cb74"

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
# 每次运行前尝试同步最新 relay.mjs，但带超时+容错：git pull 失败/卡住绝不影响 relay 主流程
# （cron 非交互环境下 git pull 可能卡住，这里限制 20 秒并忽略失败）
cd /tmp/s 2>/dev/null && timeout 20 git pull --quiet 2>/dev/null && cp -f relay.mjs /opt/screener/relay.mjs 2>/dev/null
cd /opt/screener
set -a; source relay.env; set +a
node relay.mjs >> relay.log 2>&1
EOF
chmod +x /opt/screener/run.sh

echo ""
echo "=== 4/5 安装 cron + 定时任务 ==="
if ! command -v crontab >/dev/null 2>&1; then
  echo "install cron..."
  apt-get install -y -qq cron || { echo "FAIL: cron install. Manual: apt-get install -y cron"; exit 1; }
fi
systemctl enable cron >/dev/null 2>&1 || service cron start >/dev/null 2>&1 || true
( crontab -l 2>/dev/null | grep -v "screener/run.sh"; echo "*/15 * * * * /opt/screener/run.sh" ) | crontab -
echo "crontab:"
crontab -l | grep screener || echo "(not found)"

echo ""
echo "=== 5/5 立即运行验证 ==="
/opt/screener/run.sh
echo "--- relay.log tail ---"
tail -15 /opt/screener/relay.log

echo ""
echo "DONE. cron: every 15min. log: /opt/screener/relay.log"
