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
  const url = 'https://fapi.binance.com/fapi/v1/ticker/24hr';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await proxiedFetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' } });
    if (!res.ok) { const t = await res.text().catch(()=>''); throw new Error(`Binance HTTP ${res.status} ${t.slice(0,120)}`); }
    const data = await res.json();
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
      });
    }
    return rows;
  } finally { clearTimeout(timer); }
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

async function fetchOpenInterest(symbols) {
  const results = new Map();
  let idx = 0;
  async function worker() {
    while (idx < symbols.length) {
      const sym = symbols[idx++];
      try {
        const d = await fetchWithTimeout(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${sym}`);
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

async function relayDemon(binanceRows) {
  if (!Array.isArray(binanceRows) || binanceRows.length === 0) {
    console.log('Demon: no binance rows, skip');
    return;
  }
  const sorted = binanceRows.slice().sort((a, b) => (b.volume_24h_usdt || 0) - (a.volume_24h_usdt || 0));
  const candidates = sorted.filter(r => (r.volume_24h_usdt || 0) >= DEMON_MIN_VOL);
  if (candidates.length === 0) { console.log('Demon: no candidates, skip'); return; }
  console.log(`Demon: fetching OI for ${candidates.length} symbols...`);
  const oiMap = await fetchOpenInterest(candidates.map(r => r.symbol));
  console.log(`Demon: got ${oiMap.size} OI values`);
  const payload = [];
  for (const r of sorted) {
    const oi = oiMap.get(r.symbol);
    if (oi == null) continue;
    const oiValue = oi * r.price;
    const stage = computeOiStage(oiValue);
    payload.push({
      symbol: r.symbol,
      base_asset: r.base_asset,
      price: r.price,
      change_24h_pct: r.change_24h_pct,
      amplitude_24h_pct: r.amplitude_24h_pct,
      volume_24h_usdt: r.volume_24h_usdt,
      trade_count: r.trade_count || 0,
      oi_value: Math.round(oiValue * 100) / 100,
      oi_contracts: oi,
      volume_oi_ratio: oiValue > 0 ? Math.round((r.volume_24h_usdt / oiValue) * 10000) / 10000 : 0,
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
const MENTIONED = (process.env.MENTIONED_COINS || MENTIONED_DEFAULT).split(',').map(s => s.trim()).filter(Boolean);

async function fetchFundingRates(symbols) {
  const results = new Map();
  try {
    // 批量接口: 一次返回所有 symbol 的最新资金费率，避免逐 symbol 请求触发限流
    const d = await fetchWithTimeout('https://fapi.binance.com/fapi/v1/premiumIndex');
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
  async function worker() {
    while (idx < symbols.length) {
      const sym = symbols[idx++];
      let attempt = 0;
      while (attempt < 2) {
        attempt++;
        try {
          const d = await fetchWithTimeout(`https://fapi.binance.com/fapi/v1/depth?symbol=${sym}&limit=5`);
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
    const d = await fetchWithTimeout('https://fapi.binance.com/fapi/v1/exchangeInfo');
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

async function relayCoinfilter(binanceRows, oiMap, fundingMap, depthMap, listingMap) {
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
  for (const r of sorted) {
    const oi = oiMap.get(r.symbol);
    if (oi == null) continue;
    const oiValue = oi * r.price;
    const volumeOiRatio = oiValue > 0 ? r.volume_24h_usdt / oiValue : 0;
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
      volume_24h_usdt: r.volume_24h_usdt,
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

  // 妖币扫描数据（基于本次 Binance ticker）
  if (payload.binance) {
    await relayDemon(payload.binance);
  }

  // 小币筛选数据（基于本次 Binance ticker）
  if (payload.binance) {
    await relayCoinfilter(payload.binance);
  }
}

main().catch(err => {
  console.error('Unhandled relay error:', err);
  process.exit(1);
});
