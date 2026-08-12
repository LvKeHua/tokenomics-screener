// relay.mjs - Exchange ticker relay: Binance / Bybit / OKX -> Cloudflare Worker
// + Demon scanner: Binance OI (open interest) -> /api/relay-demon (volume/OI ratio)
// Runs on GitHub Actions (US IP) to bypass Workers IP blocks from Binance/Bybit
//
// Environment variables (set as GitHub Actions secrets):
//   WORKER_URL      - e.g. https://app.slinglab.xyz/screener/api/relay-tickers
//   RELAY_AUTH_KEY  - matches Worker's RELAY_AUTH_KEY secret
//   DEMON_URL       - e.g. https://app.slinglab.xyz/screener/api/relay-demon
//   DEMON_RELAY_KEY - matches Worker's DEMON_RELAY_KEY secret
//   (optional) DEBUG - set "1" to print fetched ticker counts
const WORKER_URL = process.env.WORKER_URL || 'https://app.slinglab.xyz/screener/api/relay-tickers';
const AUTH_KEY = process.env.RELAY_AUTH_KEY;
const DEMON_URL = process.env.DEMON_URL || 'https://app.slinglab.xyz/screener/api/relay-demon';
const DEMON_RELAY_KEY = process.env.DEMON_RELAY_KEY || '0eb3f463c85e160bbedbec6b3131bb862bdd0c82ccf9f390';
// 小币筛选: 复用 DEMON 认证，relay 路径换成 /relay-coinfilter
const COINFILTER_URL = process.env.DEMON_URL ? process.env.DEMON_URL.replace('/relay-demon', '/relay-coinfilter') : 'https://app.slinglab.xyz/screener/api/relay-coinfilter';
const COINFILTER_RELAY_KEY = process.env.DEMON_RELAY_KEY || '0eb3f463c85e160bbedbec6b3131bb862bdd0c82ccf9f390';
const DEMON_MIN_VOL = 0;
// 不再硬编码上限 — 新合约自动包含，随 Binance ticker 数量动态扩展
const OI_CONCURRENCY = 15;
const TIMEOUT_MS = 20000;

import net from 'node:net';
import tls from 'node:tls';

// ── 代理 fetch: 当 HTTPS_PROXY/HTTP_PROXY 存在时走 CONNECT 隧道 ──
const PROXY_URL = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy || null;

function proxiedFetch(url, opts = {}) {
  if (!PROXY_URL) return fetch(url, opts);
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const proxy = new URL(PROXY_URL.includes('://') ? PROXY_URL : 'http://' + PROXY_URL);
    const targetPort = u.port || (u.protocol === 'https:' ? 443 : 80);
    let settled = false;
    const timer = setTimeout(() => { if (!settled) { settled = true; socket.destroy(); reject(new Error('proxiedFetch timeout')); } }, opts.timeoutMs || TIMEOUT_MS);
    const socket = net.connect(Number(proxy.port || 7897), proxy.hostname, () => {
      socket.write(`CONNECT ${u.hostname}:${targetPort} HTTP/1.1\r\nHost: ${u.hostname}:${targetPort}\r\n\r\n`);
    });
    let handshake = '';
    const done = (fn) => (v) => { if (!settled) { settled = true; clearTimeout(timer); socket.destroy(); fn(v); } };
    socket.on('data', (d) => {
      handshake += d.toString();
      if (!handshake.includes('\r\n\r\n')) return;
      if (!handshake.startsWith('HTTP/1.1 200')) {
        return done(reject)(new Error('CONNECT failed: ' + handshake.split('\r\n')[0]));
      }
      socket.removeAllListeners('data');
      const tlsSock = tls.connect({ socket, servername: u.hostname }, () => {
        const headers = { ...(opts.headers || {}) };
        headers['Host'] = u.hostname;
        headers['Connection'] = 'close';
        const body = opts.body || '';
        if (body) headers['Content-Length'] = Buffer.byteLength(body);
        const head = `${opts.method || 'GET'} ${u.pathname}${u.search} HTTP/1.1\r\n` +
          Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\r\n') + '\r\n\r\n';
        tlsSock.write(head + body);
      });
      let raw = '';
      tlsSock.on('data', (c) => { raw += c; });
      tlsSock.on('error', done(reject));
      tlsSock.on('close', () => {
        try {
          const idx = raw.indexOf('\r\n\r\n');
          if (idx < 0) return done(reject)(new Error('No HTTP response'));
          const headStr = raw.slice(0, idx);
          const status = parseInt(headStr.split(' ')[1], 10);
          let respBody = raw.slice(idx + 4);
          // 解码 chunked transfer-encoding（OKX/CF 使用）
          if (/transfer-encoding:\s*chunked/i.test(headStr)) {
            let decoded = '';
            let pos = 0;
            while (pos < respBody.length) {
              const lineEnd = respBody.indexOf('\r\n', pos);
              if (lineEnd < 0) break;
              const sizeHex = respBody.slice(pos, lineEnd).trim();
              if (!sizeHex) { pos = lineEnd + 2; continue; }
              const size = parseInt(sizeHex, 16);
              if (isNaN(size) || size === 0) break;
              decoded += respBody.slice(lineEnd + 2, lineEnd + 2 + size);
              pos = lineEnd + 2 + size + 2;
            }
            respBody = decoded;
          }
          resolve(new Response(respBody, { status, headers: { 'content-type': 'application/json' } }));
        } catch (e) { done(reject)(e); }
      });
    });
    socket.on('error', done(reject));
  });
}

async function fetchBinance() {
  // 偶发网络抖动重试 + 域名轮询：最多3轮，每轮换域名，间隔 5s/10s
  let lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const data = await fetchBinanceApi('/fapi/v1/ticker/24hr', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' } });
      const rows = [];
      for (const t of data) {
        if (!t.symbol.endsWith('USDT')) continue;
        const price = parseFloat(t.lastPrice);
        const high = parseFloat(t.highPrice);
        const low = parseFloat(t.lowPrice);
        if (isNaN(price) || price <= 0) continue;
        const vol = parseFloat(t.quoteVolume || '0');
        const chg = parseFloat(t.priceChangePercent || '0');
        rows.push({
          symbol: t.symbol,
          base_asset: t.symbol.replace('USDT', ''),
          price,
          change_24h_pct: Math.round(chg * 100) / 100,
          amplitude_24h_pct: (high && low && high > 0 && low > 0)
            ? Math.round(((high - low) / price) * 100 * 100) / 100
            : 0,
          volume_24h_usdt: vol,
          // 原始字段名兼容：worker hRL 归档读 priceChangePercent/quoteVolume/lastPrice
          priceChangePercent: Math.round(chg * 100) / 100,
          quoteVolume: vol,
          lastPrice: price,
        });
      }
      if (process.env.DEBUG && attempt > 1) console.log(`Binance: retry #${attempt-1} OK`);
      return rows;
    } catch (e) {
      lastErr = e;
      if (process.env.DEBUG) console.log(`Binance: attempt ${attempt} failed: ${e.message}`);
      if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 5000));
    }
  }
  throw lastErr || new Error('Binance fetch failed');
}

// -- Bybit Linear ------------------------------------------------------------
async function fetchBybit() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // Get tradable symbols + ticker data
    const [instrRes, tickRes] = await Promise.all([
      proxiedFetch('https://api.bybit.com/v5/market/instruments-info?category=linear', { signal: controller.signal }),
      proxiedFetch('https://api.bybit.com/v5/market/tickers?category=linear', { signal: controller.signal }),
    ]);
    if (!instrRes.ok) { const t = await instrRes.text().catch(()=>''); throw new Error(`Bybit instr HTTP ${instrRes.status} ${t.slice(0,120)}`); }
    if (!tickRes.ok) throw new Error(`Bybit tick HTTP ${tickRes.status}`);

    const instrData = await instrRes.json();
    const symbols = new Set(
      instrData.result.list
        .filter(s => s.status === 'Trading' && s.quoteCoin === 'USDT' && s.contractType === 'LinearPerpetual')
        .map(s => s.symbol)
    );

    const tickData = await tickRes.json();
    const tickerMap = new Map();
    for (const t of tickData.result.list) tickerMap.set(t.symbol, t);

    const rows = [];
    for (const sym of symbols) {
      const t = tickerMap.get(sym);
      if (!t) continue;
      const price = parseFloat(t.lastPrice);
      const high = parseFloat(t.highPrice24h);
      const low = parseFloat(t.lowPrice24h);
      const pcnt = parseFloat(t.price24hPcnt || '0') * 100;
      if (isNaN(price) || price <= 0) continue;
      rows.push({
        symbol: sym,
        base_asset: sym.replace('USDT', ''),
        price,
        change_24h_pct: Math.round(pcnt * 100) / 100,
        amplitude_24h_pct: Math.round(((high - low) / price) * 100 * 100) / 100,
        volume_24h_usdt: parseFloat(t.turnover24h || '0'),
        open_interest_value: parseFloat(t.openInterestValue || '0'),
      });
    }
    return rows;
  } finally { clearTimeout(timer); }
}

// -- OKX SWAP ----------------------------------------------------------------
async function fetchOkx() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await proxiedFetch('https://www.okx.com/api/v5/market/tickers?instType=SWAP', { signal: controller.signal });
    if (!res.ok) throw new Error(`OKX HTTP ${res.status}`);
    const data = await res.json();
    if (!data.data) return [];

    const rows = [];
    for (const t of data.data) {
      if (!t.instId.endsWith('-USDT-SWAP')) continue;
      const price = parseFloat(t.last);
      const high = parseFloat(t.high24h);
      const low = parseFloat(t.low24h);
      const open24h = parseFloat(t.open24h);
      if (isNaN(price) || price <= 0) continue;
      const ba = t.instId.replace('-USDT-SWAP', '');
      rows.push({
        symbol: ba + 'USDT',
        base_asset: ba,
        price,
        change_24h_pct: (open24h && open24h > 0) ? Math.round(((price - open24h) / open24h) * 100 * 100) / 100 : 0,
        amplitude_24h_pct: (high && low && high > 0 && low > 0)
          ? Math.round(((high - low) / price) * 100 * 100) / 100
          : 0,
        volume_24h_usdt: parseFloat(t.volCcy24h || '0'),
      });
    }
    return rows;
  } finally { clearTimeout(timer); }
}

// -- OKX OI 全量（1 请求，不带 instId 返回全部 SWAP 合约 OI）----------------
async function fetchOkxOi() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await proxiedFetch('https://www.okx.com/api/v5/public/open-interest?instType=SWAP', { signal: controller.signal });
    if (!res.ok) throw new Error(`OKX OI HTTP ${res.status}`);
    const data = await res.json();
    if (!data.data) return new Map();
    const m = new Map();
    for (const t of data.data) {
      if (!t.instId.endsWith('-USDT-SWAP')) continue;
      const ba = t.instId.replace('-USDT-SWAP', '');
      const oi = parseFloat(t.oi || '0');
      const oiCcy = parseFloat(t.oiCcy || '0');
      if (isNaN(oi) || oi <= 0) continue;
      // oi = 张数，oiCcy = 币数；USD 值 = 币数 × 价格（用 ticker 价格在聚合时算）
      m.set(ba + 'USDT', { contracts: oi, coin: oiCcy });
    }
    return m;
  } finally { clearTimeout(timer); }
}

// -- Main --------------------------------------------------------------------

// ─── 妖币扫描: Binance OI ──────────────────────────────────
async function fetchWithTimeout(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await proxiedFetch(url, { ...opts, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally { clearTimeout(timer); }
}

// ── Binance fAPI 域名轮询：官方备用域名 fapi1-5.binance.com 数据一致，
//    任一域名失败自动换下一个，规避 Evoxt IP 对单域名间歇性限流/失败 ──
const BINANCE_FAPI_HOSTS = [
  'fapi.binance.com', 'fapi1.binance.com', 'fapi2.binance.com',
  'fapi3.binance.com', 'fapi4.binance.com', 'fapi5.binance.com',
];
let binanceHostIdx = 0; // 记住上次成功域名，下次优先

async function fetchBinanceApi(path, opts = {}) {
  let lastErr = null;
  for (let i = 0; i < BINANCE_FAPI_HOSTS.length; i++) {
    const idx = (binanceHostIdx + i) % BINANCE_FAPI_HOSTS.length;
    const host = BINANCE_FAPI_HOSTS[idx];
    const url = `https://${host}${path}`;
    try {
      const d = await fetchWithTimeout(url, opts);
      binanceHostIdx = idx; // 记住成功域名
      if (process.env.DEBUG && i > 0) console.log(`Binance: ${host} OK (fallback ${i})`);
      return d;
    } catch (e) {
      lastErr = e;
      if (process.env.DEBUG) console.log(`Binance: ${host} failed (${e.message})`);
    }
  }
  throw lastErr || new Error('all binance hosts failed');
}

async function fetchOpenInterest(symbols) {
  const results = new Map();
  let idx = 0;
  const started = Date.now();
  async function worker() {
    while (idx < symbols.length) {
      // 整体超时 150s：防止 418/限流时无限重试拖垮管线
      if (Date.now() - started > 150000) return;
      const sym = symbols[idx++];
      try {
        const d = await fetchBinanceApi(`/fapi/v1/openInterest?symbol=${sym}`);
        const oi = parseFloat(d.openInterest);
        if (!isNaN(oi)) results.set(sym, oi);
      } catch (e) {
        if (process.env.DEBUG) console.log(`OI ${sym}: FAILED ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(OI_CONCURRENCY, symbols.length) }, worker));
  return results;
}

async function relayDemon(binanceRows, agg, sharedOiMap) {
  if (!Array.isArray(binanceRows) || binanceRows.length === 0) {
    console.log('Demon: no binance rows, skip');
    return;
  }
  const sorted = binanceRows.slice().sort((a, b) => (b.volume_24h_usdt || 0) - (a.volume_24h_usdt || 0));
  const candidates = sorted.filter(r => (r.volume_24h_usdt || 0) >= DEMON_MIN_VOL);
  if (candidates.length === 0) { console.log('Demon: no candidates, skip'); return; }
  let oiMap = sharedOiMap;
  if (!oiMap || oiMap.size === 0) {
    console.log(`Demon: fetching OI for ${candidates.length} symbols...`);
    oiMap = await fetchOpenInterest(candidates.map(r => r.symbol));
    console.log(`Demon: got ${oiMap.size} OI values`);
  } else {
    console.log(`Demon: using shared OI (${oiMap.size} values)`);
  }
  const payload = [];
  for (const r of sorted) {
    const oi = oiMap.get(r.symbol);
    if (oi == null) continue;
    // 全市场聚合：OI = Binance + Bybit + OKX；交易量 = 三所之和
    const aggOi = agg && agg.oi ? (agg.oi.get(r.symbol) || 0) : 0;
    const aggVol = agg && agg.vol ? (agg.vol.get(r.symbol) || 0) : 0;
    const oiValue = oi * r.price + aggOi;
    const volUsdt = aggVol > 0 ? aggVol : r.volume_24h_usdt;
    const stage = computeOiStage(oiValue);
    payload.push({
      symbol: r.symbol,
      base_asset: r.base_asset,
      price: r.price,
      change_24h_pct: r.change_24h_pct,
      amplitude_24h_pct: r.amplitude_24h_pct,
      volume_24h_usdt: Math.round(volUsdt * 100) / 100,
      trade_count: r.trade_count || 0,
      oi_value: Math.round(oiValue * 100) / 100,
      oi_contracts: oi,
      volume_oi_ratio: oiValue > 0 ? Math.round((volUsdt / oiValue) * 10000) / 10000 : 0,
      oi_stage: stage.stage,
      oi_stage_label: stage.label,
    });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const resp = await fetch(DEMON_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Key': DEMON_RELAY_KEY },
      body: JSON.stringify({ data: payload }),
      signal: controller.signal,
    });
    const result = await resp.json();
    if (resp.ok && result.ok) {
      console.log(`Demon relay OK: ${result.coins} coins — updated ${result.updated}`);
    } else {
      console.error(`Demon relay error (HTTP ${resp.status}):`, JSON.stringify(result));
    }
  } catch (e) {
    console.error('Demon relay failed:', e.message);
  } finally { clearTimeout(timer); }
}

// ─── 小币筛选: Binance 资金费率 / 盘口深度 / 上线时间 ──────────
const DEPTH_CONCURRENCY = 4;
const DEPTH_DELAY_MS = 150; // 每次请求后延迟 150ms，limit=5 权重=2，679币×2权重/4并发 ≈ 26秒，总 1358权重
const MENTIONED_DEFAULT = 'SIREN,RAVE,STO,LAB,TRADOOR,BSB,ESPORTS,BANK,IDOL,UB,BILL,RIVER,PTB,ACE,SAHARA,VELVET,ALLO,BLUAI,AGT,NOM,PIPPIN,WLFI,RESOLV,USR,INX';

// ─── Coinalyze 补充数据: 多空比 / 清算 / OI历史 / 预测资费 ──────────
// 限流 40次/分钟。只对候选币查询（每次最多20个symbol），分2批错峰
const COINALYZE_KEY = process.env.COINALYZE_API_KEY || '';
const COINALYZE_BASE = 'https://api.coinalyze.net/v1';
const COINALYZE_MAX_SYMS = 20;       // 每次请求最多20个symbol
const COINALYZE_BATCH_DELAY = 1200;  // 批间延迟，避免40次/分钟限流
const COINALYZE_ENABLED = !!COINALYZE_KEY;

// Coinalyze 交易所代码映射 (A=Binance, 6=Bybit, Y=Gate, 3=OKX, 4=Huobi, H=Hyperliquid)
const COINALYZE_EXCHANGES = { 'binance': 'A', 'bybit': '6', 'okx': '3', 'gate': 'Y', 'huobi': '4', 'hyperliquid': 'H' };

// 从 Binance symbol (如 VANRYUSDT) 转 Coinalyze symbol (如 VANRYUSDT_PERP.A)
function coinalyzeSymbol(binanceSymbol) {
  return binanceSymbol + '_PERP.A'; // 我们只用 Binance 永续，映射到 Coinalyze Binance 代码
}

// 通用 Coinalyze GET（限流按 symbol 数计：40 symbols/min，不是请求数）
let coinalyzeSymbolTimestamps = []; // 每次调用的 symbol 数时间戳，用于滚动窗口
async function coinalyzeFetch(path, params = {}, symbolCount = 20) {
  if (!COINALYZE_ENABLED) return null;
  // 滚动窗口限流：移除60s前的记录，若剩余+本次超过38则等待
  const nowMs = Date.now();
  coinalyzeSymbolTimestamps = coinalyzeSymbolTimestamps.filter(t => nowMs - t < 60000);
  const used = coinalyzeSymbolTimestamps.length;
  if (used + symbolCount > 38) {
    const waitMs = 60000 - (nowMs - (coinalyzeSymbolTimestamps[0] || nowMs));
    if (process.env.DEBUG) console.log(`Coinalyze rate-limit: used ${used}/38, waiting ${Math.ceil(waitMs/1000)}s...`);
    await new Promise(r => setTimeout(r, Math.max(waitMs, 3000)));
    coinalyzeSymbolTimestamps = coinalyzeSymbolTimestamps.filter(t => Date.now() - t < 60000);
  }
  const qs = new URLSearchParams({ api_key: COINALYZE_KEY, ...params });
  try {
    const res = await fetchWithTimeout(`${COINALYZE_BASE}${path}?${qs}`);
    // 成功后记录本次消耗的 symbol 数
    for (let i = 0; i < symbolCount; i++) coinalyzeSymbolTimestamps.push(Date.now());
    return res;
  } catch (e) {
    // 429 限流：等 30s 后重试一次
    if (e.message && e.message.includes('429')) {
      if (process.env.DEBUG) console.log(`Coinalyze 429, waiting 30s...`);
      await new Promise(r => setTimeout(r, 30000));
      const res = await fetchWithTimeout(`${COINALYZE_BASE}${path}?${qs}`);
      for (let i = 0; i < symbolCount; i++) coinalyzeSymbolTimestamps.push(Date.now());
      return res;
    }
    throw e;
  }
}

// 批量查询多空比（一次最多20个symbol，返回 Map<binanceSym, {ratio, long_pct, short_pct}>）
async function fetchCoinalyzeLongShort(binanceSymbols) {
  const result = new Map();
  if (!COINALYZE_ENABLED || binanceSymbols.length === 0) return result;
  const cySyms = binanceSymbols.map(coinalyzeSymbol);
  const nowSec = Math.floor(Date.now() / 1000);
  for (let i = 0; i < cySyms.length; i += COINALYZE_MAX_SYMS) {
    const batch = cySyms.slice(i, i + COINALYZE_MAX_SYMS).join(',');
    try {
      const d = await coinalyzeFetch('/long-short-ratio-history', {
        symbols: batch, interval: '1hour',
        from: nowSec - 7200, to: nowSec, limit: '1',
      });
      if (Array.isArray(d)) {
        for (const row of d) {
          // Coinalyze symbol (VANRYUSDT_PERP.A) → Binance symbol (VANRYUSDT)
          const sym = (row.symbol || '').replace(/_PERP\..*$/, '');
          const hist = (row.history || []);
          const last = hist[hist.length - 1];
          if (last) {
            result.set(sym, {
              ratio: Math.round(last.r * 10000) / 10000,
              long_pct: last.l != null ? Math.round(last.l * 100) / 100 : null,
              short_pct: last.s != null ? Math.round(last.s * 100) / 100 : null,
            });
          }
        }
      }
    } catch (e) {
      if (process.env.DEBUG) console.log(`Coinalyze LSR batch ${i}: FAILED ${e.message}`);
    }
    if (i + COINALYZE_MAX_SYMS < cySyms.length) await new Promise(r => setTimeout(r, COINALYZE_BATCH_DELAY));
  }
  return result;
}

// 批量查询清算历史（返回 Map<binanceSym, {long_liq, short_liq, total}>，近24h累计）
async function fetchCoinalyzeLiquidations(binanceSymbols) {
  const result = new Map();
  if (!COINALYZE_ENABLED || binanceSymbols.length === 0) return result;
  const cySyms = binanceSymbols.map(coinalyzeSymbol);
  const nowSec = Math.floor(Date.now() / 1000);
  for (let i = 0; i < cySyms.length; i += COINALYZE_MAX_SYMS) {
    const batch = cySyms.slice(i, i + COINALYZE_MAX_SYMS).join(',');
    try {
      const d = await coinalyzeFetch('/liquidation-history', {
        symbols: batch, interval: '1hour',
        from: nowSec - 86400, to: nowSec, limit: '24',
      });
      if (Array.isArray(d)) {
        for (const row of d) {
          const sym = (row.symbol || '').replace(/_PERP\..*$/, '');
          let longLiq = 0, shortLiq = 0;
          for (const h of (row.history || [])) {
            longLiq += (h.l || 0);
            shortLiq += (h.s || 0);
          }
          if (longLiq > 0 || shortLiq > 0) {
            result.set(sym, {
              long_liq_usdt: Math.round(longLiq),
              short_liq_usdt: Math.round(shortLiq),
              total_liq_usdt: Math.round(longLiq + shortLiq),
            });
          }
        }
      }
    } catch (e) {
      if (process.env.DEBUG) console.log(`Coinalyze Liq batch ${i}: FAILED ${e.message}`);
    }
    if (i + COINALYZE_MAX_SYMS < cySyms.length) await new Promise(r => setTimeout(r, COINALYZE_BATCH_DELAY));
  }
  return result;
}

// 批量查询 OI 历史趋势（近24h OI 变化方向）→ 判断吸筹/派发
async function fetchCoinalyzeOiTrend(binanceSymbols) {
  const result = new Map();
  if (!COINALYZE_ENABLED || binanceSymbols.length === 0) return result;
  const cySyms = binanceSymbols.map(coinalyzeSymbol);
  const nowSec = Math.floor(Date.now() / 1000);
  for (let i = 0; i < cySyms.length; i += COINALYZE_MAX_SYMS) {
    const batch = cySyms.slice(i, i + COINALYZE_MAX_SYMS).join(',');
    try {
      const d = await coinalyzeFetch('/open-interest-history', {
        symbols: batch, interval: '1hour',
        from: nowSec - 86400, to: nowSec, limit: '24',
      });
      if (Array.isArray(d)) {
        for (const row of d) {
          const sym = (row.symbol || '').replace(/_PERP\..*$/, '');
          const hist = (row.history || []);
          if (hist.length >= 2) {
            const first = hist[0], last = hist[hist.length - 1];
            const changePct = first.c > 0 ? ((last.c - first.c) / first.c) * 100 : 0;
            result.set(sym, {
              oi_24h_change_pct: Math.round(changePct * 100) / 100,
              oi_start: Math.round(first.c),
              oi_end: Math.round(last.c),
            });
          }
        }
      }
    } catch (e) {
      if (process.env.DEBUG) console.log(`Coinalyze OIH batch ${i}: FAILED ${e.message}`);
    }
    if (i + COINALYZE_MAX_SYMS < cySyms.length) await new Promise(r => setTimeout(r, COINALYZE_BATCH_DELAY));
  }
  return result;
}
const MENTIONED = (process.env.MENTIONED_COINS || MENTIONED_DEFAULT).split(',').map(s => s.trim()).filter(Boolean);

async function fetchFundingRates(symbols) {
  const results = new Map();
  try {
    // 批量接口: 一次返回所有 symbol 的最新资金费率，避免逐 symbol 请求触发限流
    const d = await fetchBinanceApi('/fapi/v1/premiumIndex');
    if (Array.isArray(d)) {
      const symSet = new Set(symbols);
      for (const row of d) {
        if (!symSet.has(row.symbol)) continue;
        const fr = parseFloat(row.lastFundingRate);
        if (!isNaN(fr)) results.set(row.symbol, fr * 100); // 转为百分比
      }
    }
  } catch (e) {
    if (process.env.DEBUG) console.log(`Funding batch: FAILED ${e.message}`);
  }
  return results;
}

async function fetchOrderbookDepths(symbols) {
  const results = new Map();
  let idx = 0;
  const started = Date.now();
  async function worker() {
    while (idx < symbols.length) {
      // 整体超时 120s：防止 418 封禁时无限重试拖垮整条管线
      if (Date.now() - started > 120000) return;
      const sym = symbols[idx++];
      let attempt = 0;
      while (attempt < 2) {
        attempt++;
        try {
          const d = await fetchBinanceApi(`/fapi/v1/depth?symbol=${sym}&limit=5`);
          let total = 0;
          if (d && Array.isArray(d.bids) && Array.isArray(d.asks)) {
            for (const [p, q] of d.bids) total += parseFloat(p) * parseFloat(q);
            for (const [p, q] of d.asks) total += parseFloat(p) * parseFloat(q);
          }
          if (!isNaN(total) && total > 0) results.set(sym, Math.round(total * 100) / 100);
          // 限速：limit=5 权重=2，4并发×2权重÷0.15s ≈ 53权重/秒 ≈ 3180权重/分钟，安全
          await new Promise(r => setTimeout(r, DEPTH_DELAY_MS));
          break;
        } catch (e) {
          if (attempt < 2) await new Promise(r => setTimeout(r, 250));
          else if (process.env.DEBUG) console.log(`Depth ${sym}: FAILED ${e.message}`);
        }
      }
    }
  }
  await Promise.all(Array.from({ length: DEPTH_CONCURRENCY }, worker));
  return results;
}

let LISTING_INFO_CACHE = null;

async function fetchListingDates() {
  if (!LISTING_INFO_CACHE) {
    try {
      const d = await fetchBinanceApi('/fapi/v1/exchangeInfo');
      const map = new Map();
      if (d && Array.isArray(d.symbols)) {
        for (const s of d.symbols) {
          if (!s.onboardDate) continue;
          const listingMs = parseInt(s.onboardDate, 10);
          if (isNaN(listingMs)) continue;
          const listingDate = new Date(listingMs);
          const daysSinceListing = Math.floor((Date.now() - listingMs) / 86400000);
          map.set(s.symbol, {
            listing_date: listingDate.toISOString().slice(0, 10),
            days_since_listing: daysSinceListing,
          });
        }
      }
      LISTING_INFO_CACHE = map;
    } catch (e) {
      if (process.env.DEBUG) console.log(`ListingDates: FAILED ${e.message}`);
      LISTING_INFO_CACHE = new Map(); // 空缓存，避免反复重试
    }
  }
  return LISTING_INFO_CACHE;
}

function computeOiStage(oiValue) {
  if (oiValue < 2000000) return { stage: 'accumulation', label: '蓄水期' };
  if (oiValue <= 8000000) return { stage: 'early_pump', label: '小币候选' };
  if (oiValue <= 30000000) return { stage: 'pump', label: '拉升早期' };
  if (oiValue <= 80000000) return { stage: 'mid', label: '中期' };
  return { stage: 'late_distribution', label: '大后期' };
}

function computeCoinfilterTags(r, oiValue, volumeOiRatio, fundingRatePct, depthUsdt, listing) {
  const tags = [];
  if (oiValue > 0 && volumeOiRatio >= 10 && oiValue > 5000000) tags.push('squeeze');
  if (oiValue >= 2000000 && oiValue <= 8000000) tags.push('small_cap');
  if (oiValue > 8000000 && oiValue <= 30000000 && r.change_24h_pct > 0) tags.push('early_pump');
  if (depthUsdt != null && depthUsdt < 200000) tags.push('thin_book');
  if (oiValue > 80000000 && volumeOiRatio < 3 && r.change_24h_pct < -10) tags.push('distribution');
  if (r.change_24h_pct < -5) tags.push('kill_longs');
  if (MENTIONED.includes(r.base_asset)) tags.push('mentioned');
  if (listing && listing.days_since_listing <= 30) tags.push('new_listing');
  if (fundingRatePct != null && (fundingRatePct > 0.05 || fundingRatePct < -0.05)) tags.push('funding_anomaly');
  return tags;
}

async function relayCoinfilter(binanceRows, oiMap, fundingMap, depthMap, listingMap, agg) {
  if (!Array.isArray(binanceRows) || binanceRows.length === 0) {
    console.log('Coinfilter: no binance rows, skip');
    return;
  }
  const sorted = binanceRows.slice().sort((a, b) => (b.volume_24h_usdt || 0) - (a.volume_24h_usdt || 0));
  const candidates = sorted.filter(r => (r.volume_24h_usdt || 0) >= DEMON_MIN_VOL);
  if (candidates.length === 0) { console.log('Coinfilter: no candidates, skip'); return; }

  const syms = candidates.map(r => r.symbol);
  oiMap = oiMap || await fetchOpenInterest(syms);
  fundingMap = fundingMap || await fetchFundingRates(syms);
  // depth: 全量抓取，4并发+150ms限速，约85秒完成679币
  depthMap = depthMap || await fetchOrderbookDepths(syms);
  listingMap = listingMap || await fetchListingDates();
  console.log(`Coinfilter: got OI=${oiMap.size} funding=${fundingMap.size} depth=${depthMap.size} listing=${listingMap.size}`);

  const payload = [];
  // Coinalyze 补充数据：只对候选币查询（小币区间+有换手+他提过的），串行调用避免 40次/分钟 限流
  let lsrMap = new Map(), liqMap = new Map(), oiTrendMap = new Map(), pfrMap = new Map();
  if (COINALYZE_ENABLED) {
    // 候选条件：OI 2M-80M（排除大币/僵尸）且 vol/OI≥3x（有换手），或他提过的币（无论状态都关注）
    // 薄盘口不列为候选条件（小币普遍薄，93%都是<200K），只作为标签显示
    const cyCandidates = sorted.filter(r => {
      const oi = oiMap.get(r.symbol);
      if (oi == null) return false;
      const oiValue = oi * r.price;
      const ratio = oiValue > 0 ? r.volume_24h_usdt / oiValue : 0;
      const inRange = oiValue >= 2000000 && oiValue <= 80000000;
      const hasTurnover = ratio >= 3;
      const mentioned = MENTIONED.includes(r.base_asset);
      return (inRange && hasTurnover) || mentioned;
    }).map(r => r.symbol);
    // 上限 20 个：20×3端点(LSR/Liq/OI-trend) = 60 symbol-calls，滚动窗口 38/min 约1.6分钟，适配5分钟周期
    // 预测资费(PFR)价值低，不查，省限流预算
    const cySyms = cyCandidates.slice(0, 20);
    if (cySyms.length > 0) {
      console.log(`Coinalyze: fetching for ${cySyms.length} candidates (LSR/liq/OI-trend)...`);
      // 串行执行，滚动窗口按 symbol 数限流（40 symbols/min）
      lsrMap = await fetchCoinalyzeLongShort(cySyms);
      liqMap = await fetchCoinalyzeLiquidations(cySyms);
      oiTrendMap = await fetchCoinalyzeOiTrend(cySyms);
      console.log(`Coinalyze: got LSR=${lsrMap.size} Liq=${liqMap.size} OI-trend=${oiTrendMap.size}`);
    }
  }
  for (const r of sorted) {
    const oi = oiMap.get(r.symbol);
    if (oi == null) continue;
    // 全市场聚合：OI = Binance + Bybit + OKX；交易量 = 三所之和
    const aggOi = agg && agg.oi ? (agg.oi.get(r.symbol) || 0) : 0;
    const aggVol = agg && agg.vol ? (agg.vol.get(r.symbol) || 0) : 0;
    const oiValue = oi * r.price + aggOi;
    const volUsdt = aggVol > 0 ? aggVol : r.volume_24h_usdt;
    const volumeOiRatio = oiValue > 0 ? volUsdt / oiValue : 0;
    const fundingRatePct = fundingMap.get(r.symbol);
    const depthUsdt = depthMap.get(r.symbol);
    const listing = listingMap.get(r.symbol);
    const stage = computeOiStage(oiValue);
    const tags = computeCoinfilterTags(r, oiValue, volumeOiRatio, fundingRatePct, depthUsdt, listing);
    payload.push({
      symbol: r.symbol,
      base_asset: r.base_asset,
      price: r.price,
      change_24h_pct: r.change_24h_pct,
      amplitude_24h_pct: r.amplitude_24h_pct,
      volume_24h_usdt: Math.round(volUsdt * 100) / 100,
      oi_value: Math.round(oiValue * 100) / 100,
      oi_contracts: oi,
      volume_oi_ratio: Math.round(volumeOiRatio * 10000) / 10000,
      funding_rate_pct: fundingRatePct != null ? Math.round(fundingRatePct * 10000) / 10000 : null,
      orderbook_depth_usdt: depthUsdt != null ? depthUsdt : null,
      listing_date: listing ? listing.listing_date : null,
      days_since_listing: listing ? listing.days_since_listing : null,
      oi_stage: stage.stage,
      oi_stage_label: stage.label,
      tags,
      // Coinalyze 补充字段（无数据则为 null）
      long_short_ratio: lsrMap.get(r.symbol) ? lsrMap.get(r.symbol).ratio : null,
      long_pct: lsrMap.get(r.symbol) ? lsrMap.get(r.symbol).long_pct : null,
      short_pct: lsrMap.get(r.symbol) ? lsrMap.get(r.symbol).short_pct : null,
      liq_24h_usdt: liqMap.get(r.symbol) ? liqMap.get(r.symbol).total_liq_usdt : null,
      liq_long_24h_usdt: liqMap.get(r.symbol) ? liqMap.get(r.symbol).long_liq_usdt : null,
      liq_short_24h_usdt: liqMap.get(r.symbol) ? liqMap.get(r.symbol).short_liq_usdt : null,
      oi_24h_change_pct: oiTrendMap.get(r.symbol) ? oiTrendMap.get(r.symbol).oi_24h_change_pct : null,
      predicted_funding_rate_pct: pfrMap.get(r.symbol) != null ? pfrMap.get(r.symbol) : null,
    });
  }
  if (payload.length === 0) { console.log('Coinfilter: no payload, skip'); return; }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const resp = await fetch(COINFILTER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Key': COINFILTER_RELAY_KEY },
      body: JSON.stringify({ data: payload, mentioned: MENTIONED }),
      signal: controller.signal,
    });
    const result = await resp.json();
    if (resp.ok && result.ok) {
      console.log(`Coinfilter relay OK: ${result.coins} coins — updated ${result.updated}`);
    } else {
      console.error(`Coinfilter relay error (HTTP ${resp.status}):`, JSON.stringify(result));
    }
  } catch (e) {
    console.error('Coinfilter relay failed:', e.message);
  } finally { clearTimeout(timer); }
}

// ── 全市场聚合：交易量 = Binance+Bybit+OKX 三所之和；OI = 三所 OI 之和 ──
// 输入: binanceRows(含 OI 现值) + bybitRows(含 open_interest_value) + okxRows + okxOiMap
// 输出: Map<symbol, { volume_24h_usdt, oi_value, oi_contracts }>
function aggregateMarket(binanceRows, bybitRows, okxRows, okxOiMap) {
  const vol = new Map();   // symbol -> 三所 24h 交易量之和
  const oi = new Map();    // symbol -> 三所 OI 现值之和(USD)
  const price = new Map(); // symbol -> Binance 价格(基准)
  for (const r of binanceRows) {
    vol.set(r.symbol, r.volume_24h_usdt || 0);
    price.set(r.symbol, r.price);
  }
  for (const r of bybitRows || []) {
    vol.set(r.symbol, (vol.get(r.symbol) || 0) + (r.volume_24h_usdt || 0));
  }
  for (const r of okxRows || []) {
    vol.set(r.symbol, (vol.get(r.symbol) || 0) + (r.volume_24h_usdt || 0));
  }
  // OI: Binance 现值在调用方传入（oiMap），这里只聚合 Bybit/OKX 增量
  for (const r of bybitRows || []) {
    if (r.open_interest_value && r.open_interest_value > 0) {
      oi.set(r.symbol, (oi.get(r.symbol) || 0) + r.open_interest_value);
    }
  }
  if (okxOiMap) {
    for (const [sym, v] of okxOiMap) {
      const p = price.get(sym);
      if (p && v.coin > 0) {
        oi.set(sym, (oi.get(sym) || 0) + v.coin * p);
      }
    }
  }
  return { vol, oi, price };
}

async function main() {
  const results = await Promise.allSettled([
    fetchBinance(),
    fetchBybit(),
    fetchOkx(),
  ]);

  const payload = {};
  const labels = ['binance', 'bybit', 'okx'];
  let total = 0;

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const name = labels[i];
    if (r.status === 'fulfilled' && r.value.length > 0) {
      payload[name] = r.value;
      total += r.value.length;
      if (process.env.DEBUG) console.log(`${name}: ${r.value.length} tickers`);
    } else {
      if (process.env.DEBUG) console.log(`${name}: FAILED 鈥?${r.reason?.message || 'no data'}`);
    }
  }

  const sourceCount = Object.keys(payload).length;
  if (sourceCount === 0) {
    console.error('FATAL: All exchange fetches failed. Nothing to relay.');
    process.exit(1);
  }

  if (!AUTH_KEY) {
    console.error('FATAL: RELAY_AUTH_KEY not set.');
    process.exit(1);
  }

  console.log(`Relaying ${total} tickers from ${sourceCount} source(s): ${Object.keys(payload).join(', ')}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const resp = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Key': AUTH_KEY,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const result = await resp.json();
    if (resp.ok && result.ok) {
      console.log(`Relay OK: ${result.sources} 鈥?updated ${result.updated}`);
    } else {
      console.error(`Relay error (HTTP ${resp.status}):`, JSON.stringify(result));
      // KV 限额等写入失败不阻断 demon/coinfilter 管道
    }
  } catch (e) {
    console.error('Tickers relay failed:', e.message);
  } finally { clearTimeout(timer); }

  // 全市场聚合：OI = Binance(一次全量) + Bybit(ticker自带) + OKX(全量接口)
  const okxOiMap = await fetchOkxOi().catch(() => new Map());
  const agg = aggregateMarket(payload.binance, payload.bybit, payload.okx, okxOiMap);
  // Binance OI 只抓一次，三个模块复用（避免 3×679 请求触发限流卡死）
  const oiMap = await fetchOpenInterest(payload.binance.map(r => r.symbol)).catch(() => new Map());
  console.log(`Main: fetched OI=${oiMap.size} (shared across demon/coinfilter/forward)`);

  // 妖币扫描数据（基于本次 Binance ticker + 全市场聚合）
  if (payload.binance) {
    await relayDemon(payload.binance, agg, oiMap).catch(e => console.error('Demon relay failed:', e.message));
  }

  // 小币筛选数据（基于本次 Binance ticker）
  if (payload.binance) {
    await relayCoinfilter(payload.binance, oiMap, null, null, null, agg).catch(e => console.error('Coinfilter relay failed:', e.message));
  }

  // 前导筛选数据（基于本次 Binance ticker）
  if (payload.binance) {
    await relayForward(payload.binance, process.env.DEBUG, agg, oiMap).catch(e => console.error('Forward relay failed:', e.message));
  }
}

// ═══════════════════════════════════════════════════════════
// 🧭 前导筛选（Forward Screener）——基于 2026-08-06 数据验证
// 验证结论（多期 5×530 币 + 三个月 OKX 4592 事件）：
//   ① 额/OI>5 事件日追高 = 负 EV（fwd5 -1.7%），只能当回避信号
//   ② 吸筹结构（底部+横盘+缩量+无新低+无异动）的真实价值是下行保护：
//      dn10（5天跌超10%概率）从全市场 9.7% 降到 3.3%，均值持平
//   ③ OI 分位叠加反而更差（-1.5%）——OI 持续缩的币是资金在跑，不是建仓
//   ④ 环境开关仍然第一优先：环境向上时信号才有正期望
// 本模块：计算 环境开关 / 吸筹结构五要素 / OI 分位（展示用），
//         推送 /api/relay-forward，前端渲染吸筹候选池 + 回避名单
// ═══════════════════════════════════════════════════════════
const FORWARD_URL = process.env.FORWARD_URL || (DEMON_URL ? DEMON_URL.replace('/relay-demon', '/relay-forward') : 'https://app.slinglab.xyz/screener/api/relay-forward');
const FORWARD_RELAY_KEY = process.env.DEMON_RELAY_KEY || '0eb3f463c85e160bbedbec6b3131bb862bdd0c82ccf9f390';
const FORWARD_KLINES_CONCURRENCY = 12;
const FORWARD_KLINES_LIMIT = 100;   // 100 天日线：60天回撤 + 横盘宽度 + 缩量 + 波动
const FORWARD_OIH_CONCURRENCY = 4;
const FORWARD_OIH_DELAY_MS = 300;   // openInterestHist 权重10/请求，4并发×0.3s≈133权重/s

// 市场环境开关：BTC 20日均线方向（验证：环境决定蓄水信号是否有效）
async function fetchBtcEnv() {
  try {
    const k = await fetchBinanceApi('/fapi/v1/klines?symbol=BTCUSDT&interval=1d&limit=25');
    if (!Array.isArray(k) || k.length < 20) return { up: null, close: null, sma20: null };
    const closes = k.map(x => parseFloat(x[4]));
    const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    return { up: closes[closes.length - 1] > sma20, close: closes[closes.length - 1], sma20 };
  } catch (e) {
    if (process.env.DEBUG) console.log('BTC env: FAILED', e.message);
    return { up: null, close: null, sma20: null };
  }
}

// 100 天日线（60天回撤 + 横盘宽度 + 缩量 + 波动压缩 + 异动检测）
async function fetchKlineHistory(symbols, limit = FORWARD_KLINES_LIMIT) {
  const results = new Map();
  let idx = 0;
  const started = Date.now();
  async function worker() {
    while (idx < symbols.length) {
      // 整体超时 120s：防止网络抖动时无限等待拖垮整条管线
      if (Date.now() - started > 120000) return;
      const sym = symbols[idx++];
      try {
        const k = await fetchBinanceApi(`/fapi/v1/klines?symbol=${sym}&interval=1d&limit=${limit}`);
        if (Array.isArray(k) && k.length >= 20) results.set(sym, k);
      } catch (e) { /* skip */ }
    }
  }
  await Promise.all(Array.from({ length: Math.min(FORWARD_KLINES_CONCURRENCY, symbols.length) }, worker));
  return results;
}

// OI 30天历史 → 当前 OI 分位（展示用，不再参与评分——验证显示 OI 低位叠加反而更差）
async function fetchOiHistory(symbols) {
  const results = new Map();
  let idx = 0;
  const started = Date.now();
  async function worker() {
    while (idx < symbols.length) {
      // 整体超时 120s
      if (Date.now() - started > 120000) return;
      const sym = symbols[idx++];
      try {
        const h = await fetchBinanceApi(`/futures/data/openInterestHist?symbol=${sym}&period=1d&limit=31`);
        if (Array.isArray(h) && h.length >= 10) results.set(sym, h);
      } catch (e) { /* skip */ }
      await new Promise(r => setTimeout(r, FORWARD_OIH_DELAY_MS));
    }
  }
  await Promise.all(Array.from({ length: Math.min(FORWARD_OIH_CONCURRENCY, symbols.length) }, worker));
  return results;
}

// 吸筹结构评分（2026-08-06 多期验证 + 2026-08-07 @derrrrrrrq 推文校准）
// 推文原汁原味规则（可计算化）：
//   ① "一般要起势都会拉一根大阳线，然后盘整个1-2周，后面等价格达到底部后，而且几乎没有量了，庄会再次拉升"（05-05）
//      → 大阳线后盘整结构：60天内出现≥15%大阳线，且之后盘整
//   ② "2M - 8M oi的时候，我基本上oi持仓都是在2%左右"（05-01）
//      → OI 2M-8M 是甜蜜区，优先
//   ③ "吸筹前期的变化是价格涨的很缓慢的，oi和价格不会波动很剧烈，1小时的oi和价格可能都不会涨超过百分之1"（04-09）
//      → 缓涨：近10日累计涨幅 0~15%（不是急跌也不是暴涨）
//   ④ "玩新不玩旧，别人筹码都派发几波了，还想着拉上来，想多了"（06-02）
//      → 派发排除：回撤<25%但横盘很久 = 旧币派发嫌疑，不列为候选
//   ⑤ "前面没有对底部做二次测试，突然拉升，而且拉升前也没有spring…这其实是比较危险的信号"（05-23）
//      → Spring 标记：跌破前低后收回 = 有测试结构（推文视为更可信的底部）
// 硬门槛（吸筹结构成立，dn10 3.3% vs 全市场 9.7%）：
//   ① 距60天高点回撤 ≥40%（底部）
//   ② 近20日区间宽度 <30%（横盘，不是下跌中继）
//   ③ 近5日均额 ≤ 60日峰额的20%（量能枯竭）
//   ④ 收盘价 > 近20日低点×1.03（不在创新低）
//   ⑤ 近5日无单日|涨跌|>15%（无异常波动）
// 强度分（排序用）：
//   +1 回撤≥60%（深底）
//   +1 横盘宽度<20%（更横）
//   +1 缩量<10%（更枯竭）
//   +1 近5日振幅<8%（低波动）
//   +1 OI 2M-8M（推文甜蜜区） 或 OI 8M-30M
//   +1 大阳线后盘整结构（推文①：起势前的标准形态）
//   +1 缓涨（推文③：近10日涨幅 0~15%）
//   +1 Spring 测试结构（推文⑤）
//   +1 上线≤180天（新合约）
//   -3 额/OI≥5（事件日回避）
// 候选资格：结构成立 + 评分≥4（含推文维度）
function computeForwardScore(f) {
  // 硬门槛
  const accStructure = (
    f.drawdown_60d != null && f.drawdown_60d >= 0.40 &&
    f.range_20d != null && f.range_20d < 0.30 &&
    f.vol_shrink_20d != null && f.vol_shrink_20d < 0.20 &&
    f.near_low_20d != null && f.near_low_20d > 1.03 &&
    f.big_move_5d != null && !f.big_move_5d
  );
  if (!accStructure) {
    if (f.volume_oi_ratio >= 5) return -3;
    return 0;
  }
  let s = 3; // 结构成立基础分
  if (f.drawdown_60d >= 0.60) s += 1;
  if (f.range_20d < 0.20) s += 1;
  if (f.vol_shrink_20d < 0.10) s += 1;
  if (f.vol_compress_5d != null && f.vol_compress_5d < 0.08) s += 1;
  // 推文②：OI 2M-8M 甜蜜区优先（8M-30M 次之）
  if (f.oi_value >= 2e6 && f.oi_value < 8e6) s += 2;
  else if (f.oi_value >= 8e6 && f.oi_value < 30e6) s += 1;
  // 推文①：大阳线后盘整
  if (f.breakout_consolidation) s += 1;
  // 推文③：缓涨
  if (f.ret_10d != null && f.ret_10d >= -0.05 && f.ret_10d <= 0.15) s += 1;
  // 推文⑤：Spring 测试结构
  if (f.spring_test) s += 1;
  // dotyyds1234 维度：资金费结构（2025-12-18："资金费高就是吸引套利搞套利的"）
  //   正资金费高（>0.05%/8h）→ 套利者聚集，有肉吃 → +1
  //   负资金费 + 价格在涨 → 现货绝对控盘搞纯做空（2025-12-18）→ 排除
  if (f.funding_rate_pct != null) {
    if (f.funding_rate_pct > 0.05) s += 1;
    else if (f.funding_rate_pct < -0.05 && f.change_24h_pct > 0) s -= 3; // 负费率+拉盘=控盘做空
  }
  if (f.days_since_listing != null && f.days_since_listing <= 180) s += 1;
  if (f.volume_oi_ratio >= 5) s -= 3;
  return s;
}

async function relayForward(binanceRows, debug, agg, sharedOiMap) {
  if (!Array.isArray(binanceRows) || binanceRows.length === 0) {
    console.log('Forward: no binance rows, skip');
    return;
  }
  const sorted = binanceRows.slice().sort((a, b) => (b.volume_24h_usdt || 0) - (a.volume_24h_usdt || 0));
  const candidates = sorted.filter(r => (r.volume_24h_usdt || 0) >= DEMON_MIN_VOL);
  if (candidates.length === 0) { console.log('Forward: no candidates, skip'); return; }

  const syms = candidates.map(r => r.symbol);
  let oiMap = sharedOiMap;
  if (!oiMap || oiMap.size === 0) {
    oiMap = await fetchOpenInterest(syms);
  }
  console.log(`Forward: using OI=${oiMap.size}`);

  // 只对 OI 2M-80M 的候选算 OI 历史分位（全量 530 币权重10×530=5300超限）
  const oiRangeSyms = syms.filter(sym => {
    const oi = oiMap.get(sym);
    const r = sorted.find(x => x.symbol === sym);
    if (oi == null || !r) return false;
    const oiValue = oi * r.price;
    return oiValue >= 2000000 && oiValue <= 80000000;
  });
  const klineMap = await fetchKlineHistory(syms);
  const oiHistMap = await fetchOiHistory(oiRangeSyms);
  const listingMap = await fetchListingDates();
  // dotyyds1234 维度：资金费（premiumIndex 批量 1 请求，权重低）
  const fundingMap = await fetchFundingRates(syms);
  // BTC 方向提示（仅展示，不参与评分/筛选）
  const btcEnv = await fetchBtcEnv();
  console.log(`Forward: klines=${klineMap.size} oiHist=${oiHistMap.size} funding=${fundingMap.size}`);

  const payload = [];
  for (const r of sorted) {
    const oi = oiMap.get(r.symbol);
    if (oi == null) continue;
    // 全市场聚合：OI = Binance + Bybit + OKX；交易量 = 三所之和
    const aggOi = agg && agg.oi ? (agg.oi.get(r.symbol) || 0) : 0;
    const aggVol = agg && agg.vol ? (agg.vol.get(r.symbol) || 0) : 0;
    const oiValue = oi * r.price + aggOi;
    const volUsdt = aggVol > 0 ? aggVol : r.volume_24h_usdt;
    const volumeOiRatio = oiValue > 0 ? volUsdt / oiValue : 0;
    const k = klineMap.get(r.symbol);
    const h = oiHistMap.get(r.symbol);
    const listing = listingMap.get(r.symbol);
    const fundingRatePct = fundingMap.get(r.symbol); // 百分比，如 0.05 = 0.05%/8h
    const f = {
      symbol: r.symbol,
      base_asset: r.base_asset,
      price: r.price,
      change_24h_pct: r.change_24h_pct,
      amplitude_24h_pct: r.amplitude_24h_pct,
      volume_24h_usdt: Math.round(volUsdt * 100) / 100,
      oi_value: Math.round(oiValue * 100) / 100,
      oi_contracts: oi,
      volume_oi_ratio: Math.round(volumeOiRatio * 10000) / 10000,
      oi_stage: computeOiStage(oiValue).stage,
      oi_stage_label: computeOiStage(oiValue).label,
      days_since_listing: listing ? listing.days_since_listing : null,
      btc_env_up: null,
      btc_close: null,
      btc_sma20: null,
      oi_pctile_30d: null,
      drawdown_60d: null,
      range_20d: null,
      vol_shrink_20d: null,
      near_low_20d: null,
      big_move_5d: null,
      vol_compress_5d: null,
      ret_10d: null,
      breakout_consolidation: false,
      spring_test: false,
      funding_rate_pct: fundingRatePct != null ? Math.round(fundingRatePct * 10000) / 10000 : null,
      forward_score: null,
      signal: null,
    };
    if (k && k.length >= 20) {
      const closes = k.map(x => parseFloat(x[4]));
      const hi60 = Math.max(...closes.slice(-60));
      const cur = closes[closes.length - 1];
      f.drawdown_60d = hi60 > 0 ? Math.round((1 - cur / hi60) * 10000) / 10000 : null;
      // 横盘宽度：近20日收盘区间 (max-min)/min
      const win20 = closes.slice(-20);
      const mn = Math.min(...win20), mx = Math.max(...win20);
      f.range_20d = mn > 0 ? Math.round(((mx - mn) / mn) * 10000) / 10000 : null;
      f.near_low_20d = mn > 0 ? Math.round((cur / mn) * 10000) / 10000 : null;
      // 量能枯竭：近5日均额 / 60日峰额
      const turns = k.slice(-60).map(x => parseFloat(x[7]));
      const turnMax = Math.max(...turns);
      const turn5 = turns.slice(-5).reduce((a, b) => a + b, 0) / 5;
      f.vol_shrink_20d = turnMax > 0 ? Math.round((turn5 / turnMax) * 10000) / 10000 : null;
      // 近5日单日异动
      const dayrets = closes.slice(-6).map((c, i, arr) => i === 0 ? 0 : c / arr[i - 1] - 1);
      f.big_move_5d = dayrets.slice(-5).some(x => Math.abs(x) > 0.15);
      // 近5日平均振幅
      const amps = k.slice(-5).map(x => (parseFloat(x[2]) - parseFloat(x[3])) / parseFloat(x[4]));
      f.vol_compress_5d = Math.round((amps.reduce((a, b) => a + b, 0) / amps.length) * 10000) / 10000;
      // 近10日涨幅（推文③：吸筹前期价格涨的很缓慢）
      f.ret_10d = closes.length > 11 ? Math.round((cur / closes[closes.length - 11] - 1) * 10000) / 10000 : null;
      // 大阳线后盘整（推文①：起势都会拉一根大阳线，然后盘整个1-2周）
      //   近60天内出现单日涨幅≥15%的大阳线，且其后20天内价格仍在底部区间盘整
      f.breakout_consolidation = false;
      for (let i = Math.max(1, closes.length - 60); i < closes.length - 5; i++) {
        const dret = closes[i] / closes[i - 1] - 1;
        if (dret >= 0.15) {
          // 大阳线后：未来20天高点不超过大阳线日高点×1.15（盘整而非继续拉升）
          const futureHigh = Math.max(...closes.slice(i, Math.min(i + 20, closes.length)));
          const candleHigh = parseFloat(k[i][2]);
          if (futureHigh <= candleHigh * 1.15) { f.breakout_consolidation = true; break; }
        }
      }
      // Spring 测试（推文⑤：跌破前低后收回 = 底部测试）
      //   近60天内：价格跌破前期低点（≥8%），随后5天内收回至跌破前水平
      f.spring_test = false;
      for (let i = Math.max(2, closes.length - 60); i < closes.length - 5; i++) {
        const priorLow = Math.min(...closes.slice(Math.max(0, i - 20), i));
        if (priorLow > 0 && closes[i] <= priorLow * 0.92) {
          const recovered = Math.max(...closes.slice(i, i + 6));
          if (recovered >= priorLow) { f.spring_test = true; break; }
        }
      }
    }
    if (h && h.length >= 10) {
      const oiUsdSeries = h.map(x => parseFloat(x.sumOpenInterestValue)).filter(v => v > 0);
      if (oiUsdSeries.length >= 10) {
        const cur = oiUsdSeries[oiUsdSeries.length - 1];
        f.oi_pctile_30d = Math.round((oiUsdSeries.filter(v => v <= cur).length / oiUsdSeries.length) * 10000) / 10000;
      }
    }
    f.forward_score = computeForwardScore(f);
    // 信号：吸筹结构候选（结构成立 + 评分≥4，纯小币维度，无 BTC 环境开关）
    if (f.forward_score >= 4) f.signal = 'acc_candidate';
    else if (f.volume_oi_ratio >= 5) f.signal = 'avoid_event';
    else if (f.forward_score > 0) f.signal = 'watch';
    else f.signal = 'noise';
    payload.push(f);
  }
  if (payload.length === 0) { console.log('Forward: no payload, skip'); return; }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const resp = await fetch(FORWARD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Key': FORWARD_RELAY_KEY },
      body: JSON.stringify({ data: payload, env: btcEnv }),
      signal: controller.signal,
    });
    const result = await resp.json();
    if (resp.ok && result.ok) {
      console.log(`Forward relay OK: ${result.coins} coins — updated ${result.updated}`);
    } else {
      console.error(`Forward relay error (HTTP ${resp.status}):`, JSON.stringify(result));
    }
  } catch (e) {
    console.error('Forward relay failed:', e.message);
  } finally { clearTimeout(timer); }
  // 🩹 涨幅榜历史自愈：复用已抓取的 klineMap（100 天日线），检查最近 3 天归档缺失并回填
  await healGainerHistory(syms, klineMap).catch(e => console.error('Heal gainer history failed:', e.message));
}

// 🩹 涨幅榜历史自愈：检查最近 3 天 gainer_hist 归档，缺失/为空时用日线 klines 回填
// 复用 relayForward 的 klineMap（100 天日线），零额外抓取；回填走 /api/gainer-backfill（仅接受 3 天内日期）
async function healGainerHistory(syms, klineMap) {
  if (!Array.isArray(syms) || syms.length === 0 || !klineMap || klineMap.size === 0) return;
  const base = WORKER_URL.replace(/\/api\/relay-tickers$/, '');
  const now = new Date();
  const days = [];
  for (let i = 0; i < 3; i++) {
    const bj = new Date(now.getTime() + 8 * 3600 * 1000 - i * 86400000);
    days.push(bj.toISOString().slice(0, 10));
  }
  // 检查哪些天缺失/为空（day-gainers 轻量探测）
  const missing = [];
  for (const ds of days) {
    try {
      const r = await fetch(`${base}/api/day-gainers?date=${ds}&topn=1`);
      const d = await r.json();
      if (!d.ok || !d.total_archived) missing.push(ds);
    } catch (e) { /* skip */ }
  }
  if (missing.length === 0) return;
  console.log(`Heal: missing gainer archives: ${missing.join(', ')}`);
  for (const ds of missing) {
    const prevDs = new Date(Date.parse(ds) - 86400000).toISOString().slice(0, 10);
    const gainers = [];
    for (const [sym, k] of klineMap) {
      const cur = k.find(x => new Date(x[0] + 8 * 3600 * 1000).toISOString().slice(0, 10) === ds);
      const pv = k.find(x => new Date(x[0] + 8 * 3600 * 1000).toISOString().slice(0, 10) === prevDs);
      if (!cur || !pv) continue;
      const c = parseFloat(cur[4]), p = parseFloat(pv[4]);
      if (p <= 0) continue;
      gainers.push({
        symbol: sym,
        base_asset: sym.replace('USDT', ''),
        change_24h_pct: Math.round((c / p - 1) * 10000) / 100,
        volume_24h_usdt: parseFloat(cur[7]),
        last_price: c,
      });
    }
    if (gainers.length === 0) { console.log(`Heal: no klines for ${ds}, skip`); continue; }
    try {
      const resp = await fetch(`${base}/api/gainer-backfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Key': AUTH_KEY },
        body: JSON.stringify({ date: ds, gainers, updated: new Date().toISOString() }),
      });
      const result = await resp.json();
      if (resp.ok && result.ok) console.log(`Heal: backfilled ${ds} (${result.count} gainers)`);
      else if (result.skipped) console.log(`Heal: ${ds} already has ${result.existing}, skip`);
      else console.error(`Heal: backfill ${ds} failed:`, JSON.stringify(result));
    } catch (e) {
      console.error(`Heal: backfill ${ds} error:`, e.message);
    }
  }
}

main().catch(err => {
  console.error('Unhandled relay error:', err);
  process.exit(1);
});
