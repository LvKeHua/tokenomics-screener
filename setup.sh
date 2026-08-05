#!/bin/bash
# ═══════════════════════════════════════════════════════════
# 筹码筛选 Relay 一键部署脚本 (Evoxt VPS)
# 用法:
#   bash <(curl -sL https://raw.githubusercontent.com/LvKeHua/tokenomics-screener/main/setup.sh) \
#     <RELAY_AUTH_KEY> <DEMON_RELAY_KEY> <COINALYZE_API_KEY>
# ═══════════════════════════════════════════════════════════
set -e

RELAY_AUTH_KEY="${1:-}"
DEMON_RELAY_KEY="${2:-}"
COINALYZE_API_KEY="${3:-}"

# ── 密钥长度校验（防止 VNC 粘贴丢失字符导致密钥损坏）──
echo "=== 密钥校验 ==="
echo "RELAY_AUTH_KEY    长度=${#RELAY_AUTH_KEY} (期望64)"
echo "DEMON_RELAY_KEY   长度=${#DEMON_RELAY_KEY} (期望48)"
echo "COINALYZE_API_KEY 长度=${#COINALYZE_API_KEY} (期望36, 可空)"
KEY_OK=1
if [ "${#RELAY_AUTH_KEY}" -ne 64 ]; then echo "❌ RELAY_AUTH_KEY 长度错误"; KEY_OK=0; fi
if [ "${#DEMON_RELAY_KEY}" -ne 48 ]; then echo "❌ DEMON_RELAY_KEY 长度错误"; KEY_OK=0; fi
if [ -n "$COINALYZE_API_KEY" ] && [ "${#COINALYZE_API_KEY}" -ne 36 ]; then echo "⚠️ COINALYZE_API_KEY 长度错误(不影响推送,仅Coinalyze数据)"; fi
if [ "$KEY_OK" -ne 1 ]; then
  echo ""
  echo "❌ 密钥粘贴可能损坏！请重新运行，核对命令里的密钥与邮件一致。"
  exit 1
fi
echo "✅ 密钥长度正确"

echo ""
echo "=== 1/5 Node.js ==="
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1 || {
    echo "nodesource 失败, 尝试 apt..."
    apt-get update -qq && apt-get install -y -qq nodejs npm
  }
  apt-get install -y -qq nodejs >/dev/null 2>&1 || true
fi
node --version || { echo "❌ Node 安装失败"; exit 1; }

echo ""
echo "=== 2/5 下载 relay.mjs ==="
mkdir -p /opt/screener
curl -fsSL https://raw.githubusercontent.com/LvKeHua/tokenomics-screener/main/relay.mjs -o /opt/screener/relay.mjs
wc -l /opt/screener/relay.mjs

echo ""
echo "=== 3/5 写入密钥配置 ==="
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
cd /opt/screener
set -a; source relay.env; set +a
node relay.mjs >> relay.log 2>&1
EOF
chmod +x /opt/screener/run.sh
echo "✅ 配置已写入 /opt/screener/relay.env"

echo ""
echo "=== 4/5 安装 cron + 建立 15 分钟定时任务 ==="
if ! command -v crontab >/dev/null 2>&1; then
  echo "安装 cron..."
  apt-get install -y -qq cron || { echo "❌ cron 安装失败，请手动执行: apt-get install -y cron"; exit 1; }
fi
systemctl enable cron >/dev/null 2>&1 || service cron start >/dev/null 2>&1 || true
( crontab -l 2>/dev/null | grep -v "screener/run.sh"; echo "*/15 * * * * /opt/screener/run.sh" ) | crontab -
echo "crontab 已配置:"
crontab -l | grep screener || echo "(未找到，检查 cron 服务)"

echo ""
echo "=== 5/5 立即运行一次验证 ==="
/opt/screener/run.sh
echo "--- relay.log 尾部 ---"
tail -15 /opt/screener/relay.log

echo ""
echo "✅ 部署完成！"
echo "  定时任务: 每15分钟自动运行"
echo "  日志文件: /opt/screener/relay.log"
echo "  手动运行: /opt/screener/run.sh"
echo "  查看日志: tail -20 /opt/screener/relay.log"
