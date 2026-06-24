#!/usr/bin/env python3
"""
CEX Tokenomics Screener — Streamlit 仪表盘
=============================================
小资金交易者的「筹码真空」筛选器。
数据源:
  - Binance Futures API — USDT 永续合约 24hr 行情
  - CoinMarketCap Pro API — 流通市值、供应量、7日涨跌（单次调用 1000+ 币）
"""

import streamlit as st
import pandas as pd
import requests
import time
import random
from datetime import datetime

# ─────────────────────────────────────────────
# 配置
# ─────────────────────────────────────────────
BINANCE_FAPI = "https://fapi.binance.com"
# Binance API 备选镜像（自动 fallback）
BINANCE_MIRRORS = [
    "https://fapi.binance.com",
    "https://api.binance.com/fapi",
    "https://fapi.binance.me",       # 部分 CN 用户可用
]
CMC_BASE = "https://pro-api.coinmarketcap.com/v1"
CMC_API_KEY = "7b857f20da3b4a2ea1194ec94646fa68"
REQUEST_TIMEOUT = 15

# 代理配置（优先从 Session State > Streamlit Secrets > 环境变量）
import os
_PROXY_FROM_ENV = (
    st.secrets.get("BINANCE_PROXY") if hasattr(st, "secrets") else None
) or os.environ.get("BINANCE_PROXY") or os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY") or None
PROXY = st.session_state.get("user_proxy") or _PROXY_FROM_ENV

STARS_MAP = {5: "⭐⭐⭐⭐⭐", 4: "⭐⭐⭐⭐", 3: "⭐⭐⭐", 2: "⭐⭐", 1: "⭐", 0: "—"}


# ══════════════════════════════════════════════
# 1. Binance 数据
# ══════════════════════════════════════════════

def _binance_request(path, proxies=None):
    """依次尝试所有镜像 URL，返回第一个成功的响应 JSON。"""
    last_err = None
    for base in BINANCE_MIRRORS:
        url = f"{base}{path}"
        try:
            r = requests.get(url, timeout=REQUEST_TIMEOUT, proxies=proxies)
            if r.status_code == 451:
                last_err = f"{base} 返回 451（区域封锁）"
                continue
            r.raise_for_status()
            return r.json()
        except requests.exceptions.ConnectTimeout:
            last_err = f"{base} 连接超时"
            continue
        except requests.exceptions.ConnectionError:
            last_err = f"{base} 连接被拒绝"
            continue
        except Exception as e:
            last_err = f"{base}: {e}"
            continue
    raise RuntimeError(f"Binance API 所有镜像均不可用: {last_err}")


@st.cache_data(ttl=120, show_spinner="📡 连接 Binance Futures ...")
def fetch_binance_data():
    """获取 USDT 永续合约列表 + 24hr ticker。"""
    proxies = {"https": PROXY, "http": PROXY} if PROXY else None
    try:
        # 交易对列表
        info = _binance_request("/fapi/v1/exchangeInfo", proxies)
        symbols = [
            s["symbol"] for s in info["symbols"]
            if s["quoteAsset"] == "USDT" and s["status"] == "TRADING"
        ]

        # 24hr ticker（一次性返回全部）
        ticker_raw = _binance_request("/fapi/v1/ticker/24hr", proxies)
        ticker = {t["symbol"]: t for t in ticker_raw}

        rows = []
        for sym in symbols:
            t = ticker.get(sym)
            if not t:
                continue
            price = float(t["lastPrice"])
            high = float(t["highPrice"])
            low = float(t["lowPrice"])
            rows.append({
                "symbol": sym,
                "base_asset": sym.replace("USDT", ""),
                "price": price,
                "change_24h_pct": round(float(t["priceChangePercent"]), 2),
                "amplitude_24h_pct": round((high - low) / price * 100, 2) if price > 0 else 0,
                "volume_24h_usdt": float(t["quoteVolume"]),
                "high_24h": high,
                "low_24h": low,
            })
        return pd.DataFrame(rows)

    except Exception as e:
        st.warning(f"⚠️ Binance API 失败: {e}")
        return _mock_binance_data()


def _mock_binance_data():
    """备用模拟数据（50 个币）。"""
    random.seed(42)
    data = [
        ("BTCUSDT","BTC"),("ETHUSDT","ETH"),("SOLUSDT","SOL"),("BNBUSDT","BNB"),
        ("DOGEUSDT","DOGE"),("XRPUSDT","XRP"),("ADAUSDT","ADA"),("AVAXUSDT","AVAX"),
        ("DOTUSDT","DOT"),("LINKUSDT","LINK"),("UNIUSDT","UNI"),("FILUSDT","FIL"),
        ("ATOMUSDT","ATOM"),("APTUSDT","APT"),("WLDUSDT","WLD"),("BEATUSDT","BEAT"),
        ("DEXEUSDT","DEXE"),("VVVUSDT","VVV"),("ONDOUSDT","ONDO"),("JUPUSDT","JUP"),
        ("JTOUSDT","JTO"),("STABLEUSDT","STABLE"),("ALGOUSDT","ALGO"),("ETCUSDT","ETC"),
        ("KASUSDT","KAS"),("AAVEUSDT","AAVE"),("MORPHOUSDT","MORPHO"),("ENAUSDT","ENA"),
        ("WLFIUSDT","WLFI"),("NIGHTUSDT","NIGHT"),("ZECUSDT","ZEC"),("NEARUSDT","NEAR"),
        ("HYPEUSDT","HYPE"),("AEROUSDT","AERO"),("GRASSUSDT","GRASS"),("IOUSDT","IO"),
        ("LTCUSDT","LTC"),("ARBUSDT","ARB"),("OPUSDT","OP"),("INJUSDT","INJ"),
        ("SEIUSDT","SEI"),("SUIUSDT","SUI"),("PEPEUSDT","PEPE"),("WIFUSDT","WIF"),
        ("RENDERUSDT","RENDER"),("SKYUSDT","SKY"),("LABUSDT","LAB"),
        ("AIOUSDT","AI"),("FIOUSDT","FIO"),
    ]
    rows = []
    base_price = {
        "BTC":68000,"ETH":3400,"SOL":145,"BNB":580,"DOGE":0.12,"XRP":0.52,
        "ADA":0.38,"AVAX":25,"DOT":5.2,"LINK":14,"UNI":7.5,"FIL":4.2,"ATOM":6.8,
        "APT":6.5,"WLD":2.1,"BEAT":0.65,"DEXE":20,"VVV":7.8,"ONDO":0.75,
        "JUP":1.0,"JTO":2.8,"STABLE":0.035,"ALGO":0.09,"ETC":22,"KAS":0.035,
        "AAVE":110,"MORPHO":1.6,"ENA":0.08,"WLFI":0.018,"NIGHT":0.018,
        "ZEC":24,"NEAR":2.0,"HYPE":16.5,"AERO":0.32,"GRASS":0.11,"IO":0.08,
        "LTC":72,"ARB":0.85,"OP":1.8,"INJ":25,"SEI":0.35,"SUI":1.1,
        "PEPE":0.00001,"WIF":1.8,"RENDER":1.55,"SKY":0.055,"LAB":5.0,
        "AI":0.5,"FIO":0.03,
    }
    for sym, ba in data:
        bp = base_price.get(ba, random.uniform(0.05, 500))
        chg = round(random.uniform(-30, 80), 2)
        price = bp * (1 + chg / 100)
        amp = round(random.uniform(3, 40), 2)
        vol = price * random.uniform(5e5, 3e9)
        rows.append({
            "symbol": sym, "base_asset": ba, "price": round(price, 8),
            "change_24h_pct": chg, "amplitude_24h_pct": amp,
            "volume_24h_usdt": round(vol, 0),
            "high_24h": round(price * 1.05, 8), "low_24h": round(price * 0.95, 8),
        })
    return pd.DataFrame(rows)


# ══════════════════════════════════════════════
# 2. CoinMarketCap 代币经济学
# ══════════════════════════════════════════════

@st.cache_data(ttl=300, show_spinner="📊 读取 CoinMarketCap ...")
def fetch_cmc_data():
    """单次调用 CMC listings/latest -> 市值、供应量、7日涨跌。"""
    try:
        headers = {
            "X-CMC_PRO_API_KEY": CMC_API_KEY,
            "Accept": "application/json",
        }
        params = {
            "start": 1,
            "limit": 1000,
            "convert": "USD",
        }
        r = requests.get(
            f"{CMC_BASE}/cryptocurrency/listings/latest",
            headers=headers, params=params, timeout=REQUEST_TIMEOUT,
        )
        r.raise_for_status()
        data = r.json()["data"]

        cmc_map = {}
        for coin in data:
            sym = coin["symbol"]  # "BTC", "ETH" ...
            q = coin["quote"]["USD"]
            total_sup = coin.get("total_supply")
            circ_sup = coin.get("circulating_supply")
            max_sup = coin.get("max_supply")
            # 流通率 = circulating / total（total 可能为 ∞）
            circ_ratio = None
            if total_sup and total_sup > 0 and circ_sup is not None:
                circ_ratio = circ_sup / total_sup
            elif max_sup and max_sup > 0 and circ_sup is not None:
                circ_ratio = circ_sup / max_sup

            cmc_map[sym.upper()] = {
                "market_cap": q.get("market_cap"),
                "circulating_supply": circ_sup,
                "total_supply": total_sup,
                "max_supply": max_sup,
                "circulating_ratio": round(circ_ratio, 4) if circ_ratio else None,
                "cmc_rank": coin.get("cmc_rank"),
                "name": coin.get("name"),
                "percent_change_7d": q.get("percent_change_7d"),
            }
        return cmc_map

    except Exception as e:
        st.warning(f"⚠️ CMC API 失败: {e}，使用模拟数据。")
        return None


def _mock_cmc_data(binance_df):
    """备用模拟代币经济学。"""
    random.seed(42)
    cmc = {}
    for ba in binance_df["base_asset"].unique():
        mcap = random.choice([random.uniform(15e6, 100e6), random.uniform(100e6, 500e6),
                              random.uniform(500e6, 2e9), random.uniform(2e9, 500e9)])
        cr = random.choice([
            random.uniform(0.05, 0.30), random.uniform(0.30, 0.50),
            random.uniform(0.50, 0.80), 1.0,
        ])
        price_row = binance_df[binance_df["base_asset"] == ba]
        price = price_row["price"].values[0] if not price_row.empty else 1
        total_sup = mcap / price if price > 0 else 1e9
        circ_sup = total_sup * cr
        cmc[ba] = {
            "market_cap": mcap, "circulating_supply": circ_sup,
            "total_supply": total_sup, "max_supply": total_sup * 1.2 if random.random() > 0.5 else None,
            "circulating_ratio": round(cr, 4), "cmc_rank": random.randint(1, 1000),
            "name": ba, "percent_change_7d": round(random.uniform(-30, 80), 2),
        }
    return cmc


# ══════════════════════════════════════════════
# 3. 评分 & 逻辑
# ══════════════════════════════════════════════

def assign_stars(mcap, cr):
    """市值 × 流通率 => 1-5★"""
    if mcap is None or cr is None or mcap < 15_000_000:
        return 0
    if mcap <= 100_000_000 and cr < 0.30:
        return 5
    if 100_000_000 < mcap <= 500_000_000 and cr < 0.30:
        return 5
    if mcap <= 100_000_000 and cr < 0.50:
        return 4
    if 100_000_000 < mcap <= 500_000_000 and cr < 0.50:
        return 3
    if 500_000_000 < mcap <= 2_000_000_000 and cr < 0.50:
        return 3
    if mcap > 2_000_000_000:
        return 1 if cr >= 0.50 else 2
    if cr >= 0.80:
        return 1
    return 2


def flag_momentum(row):
    r7 = row.get("return_7d_pct") if pd.notna(row.get("return_7d_pct")) else None
    amp = row.get("amplitude_24h_pct") if pd.notna(row.get("amplitude_24h_pct")) else None
    if r7 is not None and amp is not None:
        return r7 > 0 and amp > 10
    return False


def unlock_label(cr):
    if cr is None:
        return "⚠️ 未知"
    if cr < 0.30:
        return "🔴 高通胀风险"
    if cr < 0.50:
        return "🟡 解锁风险"
    return "🟢 低风险"


def merge_data(binance_df, cmc_map):
    """Binance 行情 + CMC 代币经济学。"""
    df = binance_df.copy()
    mc, ts, cs, cr, r7, nm, rk = [], [], [], [], [], [], []
    for _, row in df.iterrows():
        ba = row["base_asset"]
        c = cmc_map.get(ba, {})
        mc.append(c.get("market_cap"))
        ts.append(c.get("total_supply"))
        cs.append(c.get("circulating_supply"))
        cr_val = c.get("circulating_ratio")
        cr.append(cr_val)
        r7.append(c.get("percent_change_7d"))
        nm.append(c.get("name", ba))
        rk.append(c.get("cmc_rank"))

    df["market_cap"] = mc
    df["total_supply"] = ts
    df["circulating_supply"] = cs
    df["circulating_ratio"] = cr
    df["return_7d_pct"] = r7
    df["name"] = nm
    df["cmc_rank"] = rk
    df["unlock_risk"] = df["circulating_ratio"].apply(unlock_label)
    df["star_rating"] = df.apply(lambda r: assign_stars(r["market_cap"], r["circulating_ratio"]), axis=1)
    df["star_display"] = df["star_rating"].map(STARS_MAP)
    df["momentum_alert"] = df.apply(flag_momentum, axis=1)

    # 过滤无效
    df = df[df["market_cap"].notna() & (df["market_cap"] >= 15_000_000)].copy()
    return df


# ══════════════════════════════════════════════
# 4. Streamlit UI
# ══════════════════════════════════════════════

st.set_page_config(page_title="筹码真空筛选器", page_icon="🔬", layout="wide")

# ── 全局 CSS（专业干净风格，微暗但不压抑） ──
st.markdown("""
<style>
    /* ── 基底 ── */
    .stApp { background: #f4f6fa; }
    .block-container { padding-top: 1.2rem; max-width: 1400px; }
    h1, h2, h3, h4, h5, h6 { color: #1a2332 !important; font-weight: 600; }
    p, li, .caption { color: #3d4a5c; }
    a { color: #2563eb; }

    /* ── 主标题区 ── */
    .app-header {
        background: linear-gradient(135deg, #ffffff 0%, #f0f4fe 100%);
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 20px 28px;
        margin-bottom: 20px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .app-header h1 { margin: 0; font-size: 1.7rem; color: #111827 !important; }
    .app-header p { margin: 4px 0 0 0; color: #6b7280; font-size: 0.9rem; }

    /* ── 指标卡片 ── */
    div[data-testid="metric-container"] {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 14px 18px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        transition: box-shadow 0.15s;
    }
    div[data-testid="metric-container"]:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    div[data-testid="metric-container"] label {
        color: #6b7280 !important;
        font-size: 0.75rem !important;
        font-weight: 500;
        letter-spacing: 0.3px;
    }
    div[data-testid="metric-container"] div[data-testid="metric-value"] {
        color: #111827 !important;
        font-weight: 700;
        font-size: 1.6rem !important;
    }

    /* ── 侧栏 ── */
    section[data-testid="stSidebar"] {
        background: #ffffff;
        border-right: 1px solid #e2e8f0;
    }
    section[data-testid="stSidebar"] .sidebar-content { padding: 0 0.8rem; }

    /* 侧栏筛选分组卡片 */
    .filter-group {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 14px 16px;
        margin-bottom: 14px;
    }
    .filter-group .group-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .filter-group .group-label span { font-size: 1rem; }
    /* 侧栏 number_input 和 slider 的 label 颜色 */
    section[data-testid="stSidebar"] .stNumberInput label,
    section[data-testid="stSidebar"] .stSlider label {
        color: #374151 !important;
        font-size: 0.8rem !important;
        font-weight: 500;
    }
    /* 侧栏输入框美化 */
    section[data-testid="stSidebar"] .stNumberInput input {
        background: #ffffff;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        padding: 4px 10px;
        font-size: 0.85rem;
    }
    section[data-testid="stSidebar"] .stNumberInput input:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 2px rgba(37,99,235,0.15);
    }

    /* ── 按钮 ── */
    .stButton > button {
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.85rem;
        border: none;
        transition: all 0.15s;
        padding: 6px 16px;
    }
    .stButton > button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    /* Preset 按钮特殊色 */
    div[data-testid="column"]:nth-child(1) .stButton button {
        background: linear-gradient(135deg, #dc2626, #b91c1c);
        color: white;
        border: none;
    }
    div[data-testid="column"]:nth-child(1) .stButton button:hover { background: linear-gradient(135deg, #b91c1c, #991b1b); }
    div[data-testid="column"]:nth-child(2) .stButton button {
        background: linear-gradient(135deg, #e67e22, #d97706);
        color: white;
        border: none;
    }
    div[data-testid="column"]:nth-child(2) .stButton button:hover { background: linear-gradient(135deg, #d97706, #b45309); }

    /* ── 数据表容器 ── */
    .stDataFrame {
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid #e2e8f0;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .stDataFrame table { font-size: 0.8rem; }
    .stDataFrame thead tr th {
        background: #f8fafc !important;
        color: #374151 !important;
        font-weight: 600;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        padding: 10px 12px !important;
        border-bottom: 2px solid #e2e8f0 !important;
    }
    .stDataFrame tbody tr td {
        padding: 8px 12px !important;
        border-bottom: 1px solid #f1f5f9 !important;
        color: #1f2937;
    }
    .stDataFrame tbody tr:hover td { background: #f0f7ff !important; }

    /* ── 分割线 ── */
    hr { border-color: #e2e8f0 !important; margin: 1.2rem 0; }

    /* ── expander ── */
    .streamlit-expanderHeader {
        color: #374151 !important;
        font-weight: 500;
        background: #f8fafc;
        border-radius: 8px;
        padding: 8px 12px !important;
    }

    /* ── 资金计算器卡片 ── */
    .calculator-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 20px 24px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .calculator-card h3 { margin-top: 0; }

    /* ── 侧栏刷新按钮区 ── */
    .sidebar-footer {
        border-top: 1px solid #e2e8f0;
        padding-top: 14px;
        margin-top: 6px;
    }
    .sidebar-footer .caption { color: #9ca3af; font-size: 0.75rem; }

    /* ── Divider 替代间距 ── */
    .section-gap { height: 4px; }
</style>
""", unsafe_allow_html=True)

# ── 顶栏 ──
st.markdown("""
<div class="app-header">
    <h1>🔬 筹码真空 · 代币筛选器</h1>
    <p>小资金百倍潜力挖掘 — 低流通 / 全流通小市值 — 数据源: Binance Futures + CoinMarketCap</p>
</div>
""", unsafe_allow_html=True)

# ── Sidebar ──
with st.sidebar:
    st.markdown("""
    <div style="padding:4px 0 14px 0;">
        <span style="font-size:1.1rem;font-weight:700;color:#111827;">⚙️ 筛选面板</span>
    </div>
    """, unsafe_allow_html=True)

    # ── 市值范围 ──
    st.markdown("""
    <div class="filter-group">
        <div class="group-label"><span>💎</span> 市值范围</div>
    """, unsafe_allow_html=True)
    mcap_min = st.number_input("最低市值 ($)", min_value=1_000_000, value=15_000_000,
                                step=1_000_000, format="%d", label_visibility="collapsed")
    mcap_max = st.number_input("最高市值 ($)", min_value=1_000_000, value=500_000_000_000,
                                step=10_000_000, format="%d", label_visibility="collapsed")
    st.markdown("</div>", unsafe_allow_html=True)

    # ── 流通率范围 ──
    st.markdown("""
    <div class="filter-group">
        <div class="group-label"><span>📦</span> 流通率范围</div>
    """, unsafe_allow_html=True)
    col_cr1, col_cr2 = st.columns(2)
    with col_cr1:
        cr_min_pct = st.number_input("最低 %", min_value=0, max_value=100, value=0,
                                      step=1, format="%d", label_visibility="collapsed")
    with col_cr2:
        cr_max_pct = st.number_input("最高 %", min_value=0, max_value=100, value=100,
                                      step=1, format="%d", label_visibility="collapsed")
    cr_min = cr_min_pct / 100.0
    cr_max = cr_max_pct / 100.0
    st.markdown("</div>", unsafe_allow_html=True)

    # ── 动量过滤 ──
    st.markdown("""
    <div class="filter-group">
        <div class="group-label"><span>📈</span> 动量过滤</div>
    """, unsafe_allow_html=True)
    min_amp = st.slider("最低 24h 振幅 (%)", 0.0, 100.0, 0.0, 1.0)
    min_r7 = st.slider("最低 7日涨幅 (%)", -100.0, 500.0, -100.0, 5.0)
    st.markdown("</div>", unsafe_allow_html=True)

    # ── 代理配置（折叠） ──
    with st.expander("🌐 代理设置（Binance 被封时使用）", expanded=False):
        proxy_input = st.text_input(
            "HTTP/HTTPS 代理",
            value=PROXY or "",
            placeholder="例如 http://127.0.0.1:7890",
            label_visibility="visible",
            help="如果 Binance API 返回 451 错误，填你的代理地址（Shadowsocks/V2Ray 等）",
        )
        if proxy_input != (PROXY or ""):
            st.session_state["user_proxy"] = proxy_input
            st.caption("✅ 已保存，点击下方刷新按钮生效")
        st.caption("也可以在 Streamlit Cloud Secrets 中设置 BINANCE_PROXY 环境变量")

    # ── 底部操作 ──
    st.markdown("""
    <div class="sidebar-footer">
    """, unsafe_allow_html=True)
    st.caption("🔄 Binance 2分钟 / CMC 5分钟 自动刷新")
    if st.button("🔄 强制刷新数据", use_container_width=True):
        st.cache_data.clear()
        st.rerun()
    st.markdown("</div>", unsafe_allow_html=True)


# ── 加载数据 ──
with st.spinner("正在加载数据（首次约 20-40 秒）..."):
    binance_df = fetch_binance_data()
    if binance_df.empty:
        st.error("❌ 无法获取数据，请检查网络。")
        st.stop()

    cmc_raw = fetch_cmc_data()
    if cmc_raw is None:
        cmc_raw = _mock_cmc_data(binance_df)
        st.info("ℹ️ CMC 不可用，已切换至模拟数据。")

    df = merge_data(binance_df, cmc_raw)

# ── Preset 按钮 ──
st.markdown("""
<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:18px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <span style="font-weight:600;color:#111827;font-size:0.95rem;white-space:nowrap;">🚀 一键筛选</span>
""", unsafe_allow_html=True)
col_a, col_b, col_sp = st.columns([1.2, 1.6, 3])
preset = None
with col_a:
    if st.button("🔴 Preset A · 窒息流低流通", use_container_width=True):
        preset = "A"
with col_b:
    if st.button("🟡 Preset B · 全流通热点妖币", use_container_width=True):
        preset = "B"
st.markdown("</div></div>", unsafe_allow_html=True)

# ── 执行筛选 ──
f = df.copy()
if preset == "A":
    mcap_min, mcap_max = 15_000_000, 100_000_000
    cr_min, cr_max = 0.0, 0.30
    min_amp, min_r7 = 0.0, -100.0
    st.success("✅ Preset A 激活: 市值 $15M-$100M | 流通率 < 30% | 按流通率升序")
elif preset == "B":
    mcap_min, mcap_max = 15_000_000, 50_000_000
    cr_min, cr_max = 0.98, 1.0
    min_amp, min_r7 = 0.0, -100.0
    st.success("✅ Preset B 激活: 市值 $15M-$50M | 流通率 ≥ 98% | 按 7日涨幅降序")

f = f[
    (f["market_cap"].fillna(0) >= mcap_min)
    & (f["market_cap"].fillna(0) <= mcap_max)
    & (f["circulating_ratio"].fillna(1) >= cr_min)
    & (f["circulating_ratio"].fillna(1) <= cr_max)
    & (f["amplitude_24h_pct"].fillna(0) >= min_amp)
    & (f["return_7d_pct"].fillna(-999) >= min_r7)
]

if preset == "A":
    f = f.sort_values("circulating_ratio", ascending=True)
elif preset == "B":
    f = f.sort_values("return_7d_pct", ascending=False)
else:
    f = f.sort_values("star_rating", ascending=False)

f = f.reset_index(drop=True)

# ── KPI 卡片 ──
st.markdown("<div style='height:4px'></div>", unsafe_allow_html=True)
k1, k2, k3, k4, k5 = st.columns(5)
with k1:
    st.metric("📊 全部可交易", f"{len(df):,}")
with k2:
    st.metric("🔍 筛选命中", f"{len(f):,}")
with k3:
    pos_pct = (f["return_7d_pct"].dropna() > 0).mean() * 100 if len(f) > 0 else 0
    st.metric("📈 7日正收益占比", f"{pos_pct:.1f}%")
with k4:
    avg_s = f["star_rating"].mean() if len(f) > 0 else 0
    st.metric("⭐ 平均潜力评分", f"{avg_s:.2f}")
with k5:
    alert_n = int(f["momentum_alert"].sum())
    st.metric("🔥 主力介入信号", f"{alert_n}")

# ── 数据表 ──
st.markdown("<div style='height:4px'></div>", unsafe_allow_html=True)
st.markdown("""
<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:6px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
    <span style="font-weight:600;color:#111827;font-size:1rem;">📋 筛选结果</span>
    <span style="color:#6b7280;font-size:0.8rem;margin-left:10px;">点击表头排序 · 绿色行=主力介入信号</span>
</div>
""", unsafe_allow_html=True)

display_map = {
    "symbol": "交易对", "name": "名称", "price": "价格",
    "market_cap": "流通市值", "circulating_ratio": "流通率",
    "total_supply": "总供应", "circulating_supply": "流通供应",
    "star_display": "⭐ 潜力", "return_7d_pct": "7日涨幅",
    "change_24h_pct": "24h涨跌", "amplitude_24h_pct": "24h振幅",
    "volume_24h_usdt": "24h交易量", "unlock_risk": "🔓 解锁风险",
    "momentum_alert": "🔥 主力",
}

if not f.empty:
    d = f[list(display_map.keys())].copy().rename(columns=display_map)

    # 格式化
    for c in ["流通市值", "总供应", "流通供应", "24h交易量"]:
        if c in d:
            d[c] = d[c].apply(lambda x: f"${x:,.0f}" if pd.notna(x) else "N/A")
    for c in ["7日涨幅", "24h涨跌"]:
        if c in d:
            d[c] = d[c].apply(lambda x: f"{x:+.2f}%" if pd.notna(x) else "N/A")
    if "24h振幅" in d:
        d["24h振幅"] = d["24h振幅"].apply(lambda x: f"{x:.2f}%" if pd.notna(x) else "N/A")
    if "流通率" in d:
        d["流通率"] = d["流通率"].apply(lambda x: f"{x*100:.1f}%" if pd.notna(x) else "N/A")
    if "价格" in d:
        d["价格"] = d["价格"].apply(
            lambda x: f"${x:.8f}" if x < 0.001 else (f"${x:.4f}" if x < 1 else f"${x:.2f}")
            if pd.notna(x) else "N/A"
        )

    def hl(row):
        if row.get("🔥 主力") == True:
            return ["background-color: #d1fae5; color: #065f46; font-weight:500"] * len(row)
        star = row.get("⭐ 潜力", "")
        if "⭐⭐⭐⭐⭐" in str(star):
            return ["background-color: #fefce8; color: #92400e"] * len(row)
        return [""] * len(row)

    st.dataframe(
        d.style.apply(hl, axis=1),
        use_container_width=True,
        height=min(600, 35 * len(d) + 40),
        column_config={"🔥 主力": st.column_config.CheckboxColumn(disabled=True)},
    )
else:
    st.info("空结果，请放宽筛选条件。")

# ── 🎰 资金计算器 ──
st.markdown("<div style='height:8px'></div>", unsafe_allow_html=True)
st.markdown("""
<div class="calculator-card">
    <h3 style="margin:0 0 14px 0;font-size:1rem;">🎰 资金分布式彩票计算器</h3>
    <p style="color:#6b7280;font-size:0.8rem;margin:0 0 14px 0;">将本金等额分配至评分最高的 N 个标的，适合小资金均仓策略。</p>
""", unsafe_allow_html=True)
col_w1, col_w2, _ = st.columns([1, 1, 3])
with col_w1:
    capital = st.number_input("总本金 ($)", 10.0, 1_000_000.0, 1000.0, 100.0, format="%.0f")
with col_w2:
    n_pos = st.number_input("买入标的数", 1, min(20, len(f) if not f.empty else 1),
                             min(5, len(f) if not f.empty else 1), 1)

if not f.empty and capital > 0 and n_pos > 0:
    top = f.sort_values(["star_rating", "circulating_ratio"], ascending=[False, True]).head(n_pos)
    alloc = capital / n_pos
    st.markdown(
        f"<div style='background:#f0f4fe;border-radius:8px;padding:12px 16px;margin:10px 0;"
        f"font-weight:600;color:#1e40af;font-size:0.95rem;'>"
        f"💰 均仓分配: ${capital:,.0f} → {n_pos} 个标的 → 每个 ${alloc:,.2f}</div>",
        unsafe_allow_html=True,
    )

    pos = []
    for _, r in top.iterrows():
        qty = alloc / r["price"] if r["price"] and r["price"] > 0 else 0
        pos.append({
            "标的": r["symbol"], "价格": r["price"], "分配": round(alloc, 2),
            "数量": round(qty, 6), "合约张数(1x)": round(qty, 4),
            "⭐": r["star_rating"],
        })
    st.dataframe(pd.DataFrame(pos), use_container_width=True, hide_index=True)
    st.caption("⚠️ 张数为 1x 杠杆估算，请以交易所规格为准。")
else:
    st.info("无筛选结果，请先调整条件。")
st.markdown("</div>", unsafe_allow_html=True)

# ── 底部 ──
st.markdown("<div style='height:12px'></div>", unsafe_allow_html=True)
with st.expander("📌 数据来源与免责"):
    st.markdown("""
| 项目 | 说明 |
|---|---|
| **价格行情** | Binance Futures USDT 永续合约 24hr ticker |
| **代币经济学** | CoinMarketCap Pro API `listings/latest`（单次调用 1000 币） |
| **流通率** | = circulating_supply / total_supply（total=∞ 时用 max_supply） |
| **潜力评分** | 市值 × 流通率 → 1-5★（窒息流=5★ → 大盘高流通=1★） |
| **解锁风险** | 仅基于流通率截面估算，非真实解锁时间线 |
| **模拟数据** | API 不可用时自动切换，不影响功能演示 |

⚠️ **本工具仅供研究参考，不构成任何投资建议。加密货币投资风险极高。**
""")
st.markdown(
    f"<div style='text-align:center;color:#9ca3af;font-size:0.75rem;padding:8px 0;'>"
    f"🕐 最后更新: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</div>",
    unsafe_allow_html=True,
)
