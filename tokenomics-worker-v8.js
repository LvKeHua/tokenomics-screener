// 绛圭爜绛涢€?Worker (ES Module) v7 鈥?Exchange Proxy + Source Guard
const KV_HTML_KEY = 'dashboard_html';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
  });
}
function html(content, status = 200) {
  return new Response(content, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
  });
}
function normalizePath(p) {
  for (const pre of ['/screener', '']) {
    if (p === pre || p === pre + '/') return '/';
    if (p.startsWith(pre + '/')) return p.slice(pre.length);
  }
  return p;
}
function matchMarketKey(baseAsset, symbol, map) {
  const ua = (baseAsset || '').toUpperCase();
  if (map[ua]) return map[ua];
  if (map[symbol]) return map[symbol];
  const cleaned = ua.replace(/^\d{4,}x?/, '');
  if (cleaned && cleaned !== ua && map[cleaned]) return map[cleaned];
  return null;
}
function crossValidateRatio(cmcRatio, cgRatio) {
  if (cmcRatio == null || cgRatio == null) return null;
  const max = Math.max(cmcRatio, cgRatio);
  const min = Math.min(cmcRatio, cgRatio);
  if (max === 0) return null;
  const diff = (max - min) / max;
  if (diff > 0.3) {
    return { conflicted: true, cmc_ratio: Math.round(cmcRatio * 10000) / 10000, cg_ratio: Math.round(cgRatio * 10000) / 10000, discrepancy: Math.round(diff * 100) };
  }
  return null;
}

async function refreshData(kv, env) {
  // 1) Try exchange proxy from KV first (fresh < 5 min)
  const proxyRaw = await kv.get('exchange_proxy').catch(() => null);
  const proxyUpdated = await kv.get('exchange_proxy_updated').catch(() => null);
  const proxyAge = proxyUpdated ? Date.now() - new Date(proxyUpdated).getTime() : Infinity;
  const hasFreshProxy = proxyRaw && proxyAge < 5 * 60 * 1000;

  let binanceRows = null, bybitRows = null, okxRows = null;
  let proxySources = 0;

  if (hasFreshProxy) {
    // Use proxy data instead of direct exchange calls
    try {
      const proxy = JSON.parse(proxyRaw);
      if (proxy.binance) { binanceRows = proxy.binance; proxySources++; }
      if (proxy.bybit) { bybitRows = proxy.bybit; proxySources++; }
      if (proxy.okx) { okxRows = proxy.okx; proxySources++; }
      console.log('Using exchange proxy:', proxySources, 'sources, age:', Math.round(proxyAge / 1000) + 's');
    } catch (e) { console.error('Proxy parse error:', e); }
  }

  // 2) If no proxy, fetch from exchanges directly
  let binanceResult, bybitResult, okxResult;
  if (!hasFreshProxy) {
    [binanceResult, bybitResult, okxResult] = await Promise.allSettled([
      fetchBinanceData(),
      fetchBybitData(),
      fetchOKXData(),
    ]);
    if (binanceResult.status === 'fulfilled') { binanceRows = binanceResult.value; proxySources++; }
    if (bybitResult.status === 'fulfilled') { bybitRows = bybitResult.value; proxySources++; }
    if (okxResult.status === 'fulfilled') { okxRows = okxResult.value; proxySources++; }
  }

  const exchangeDebug = {};
  exchangeDebug.Binance = binanceRows ? { tickers: binanceRows.length, status: 'ok' } : { error: 'unavailable', status: 'rejected' };
  exchangeDebug.Bybit = bybitRows ? { tickers: bybitRows.length, status: 'ok' } : { error: 'unavailable', status: 'rejected' };
  exchangeDebug.OKX = okxRows ? { tickers: okxRows.length, status: 'ok' } : { error: 'unavailable', status: 'rejected' };
  exchangeDebug.proxy = { active: hasFreshProxy, sources: proxySources, age_seconds: Math.round(proxyAge / 1000) };
  await kv.put('exchange_debug', JSON.stringify(exchangeDebug)).catch(() => {});

  // 3) Fetch CMC + CoinGecko
  const cmcResult = await fetchCmcData(env).catch(e => { console.error('CMC failed:', e); return null; });
  exchangeDebug.CMC = { coins: cmcResult ? Object.keys(cmcResult).length : 0, status: cmcResult ? 'ok' : 'rejected' };

  let cgMap = null;
  const lastCg = await kv.get('last_cg_fetch').catch(() => null);
  const needCg = !lastCg || Date.now() - new Date(lastCg).getTime() > 60 * 60 * 1000;
  if (needCg) {
    cgMap = await fetchCoinGeckoData(env).catch(e => { console.error('CoinGecko failed:', e); return null; });
    if (cgMap) await kv.put('last_cg_fetch', new Date().toISOString()).catch(() => {});
  }
  await kv.put('exchange_debug', JSON.stringify(exchangeDebug)).catch(() => {});

  // 4) Merge exchange rows (dedup by symbol, keep highest volume)
  const exchangeRows = [];
  {
    const seen = {};
    for (const rows of [binanceRows, bybitRows, okxRows]) {
      if (!rows) continue;
      for (const row of rows) {
        const sym = row.symbol;
        if (!seen[sym] || (row.volume_24h_usdt || 0) > (seen[sym].volume_24h_usdt || 0)) {
          seen[sym] = row;
        }
      }
    }
    for (const sym of Object.keys(seen)) exchangeRows.push(seen[sym]);
    console.log('Exchange tickers: ' + exchangeRows.length + ' unique from ' + proxySources + ' sources');
  }

  function applyValidation(coin, cgKeyOrSymbol) {
    if (!cgMap) return coin;
    const cg = cgMap[cgKeyOrSymbol] || matchMarketKey(coin.base_asset, coin.symbol, cgMap);
    if (!cg) return coin;
    const conflict = crossValidateRatio(coin.circulating_ratio, cg.circulating_ratio);
    if (conflict) {
      coin.data_conflict = true;
      coin.discrepancy_pct = conflict.discrepancy;
      coin.cmc_ratio = conflict.cmc_ratio;
      coin.cg_ratio = conflict.cg_ratio;
      if (coin.market_cap != null && cg.market_cap != null && conflict.cg_ratio < conflict.cmc_ratio * 0.5 && cg.market_cap < coin.market_cap * 0.5) {
        coin.stale_cg_data = true;
      }
      coin.unlock_risk = unlockLabel((coin.circulating_ratio + cg.circulating_ratio) / 2);
    }
    return coin;
  }

  // 5) Branch 1: Exchange + CMC merge (only if 鈮?2 exchange sources available)
  if (exchangeRows.length > 0 && cmcResult && proxySources >= 2) {
    const merged = [];
    for (const row of exchangeRows) {
      const ba = (row.base_asset || '').toUpperCase();
      const cmc = matchMarketKey(ba, row.symbol, cmcResult);
      const mcap = cmc ? cmc.market_cap : null;
      const cr = cmc ? cmc.circulating_ratio : null;
      let coin = { symbol: row.symbol, name: cmc ? cmc.name : ba, base_asset: row.base_asset, price: row.price, market_cap: mcap, circulating_supply: cmc ? cmc.circulating_supply : null, total_supply: cmc ? cmc.total_supply : null, max_supply: cmc ? cmc.max_supply : null, circulating_ratio: cr, cmc_rank: cmc ? cmc.cmc_rank : null, volume_24h_usdt: row.volume_24h_usdt, percent_change_7d: cmc ? cmc.percent_change_7d : null, change_24h_pct: row.change_24h_pct, amplitude_24h_pct: row.amplitude_24h_pct, star_rating: assignStars(mcap, cr, false), unlock_risk: unlockLabel(cr), momentum_alert: (cmc && cmc.percent_change_7d != null && cmc.percent_change_7d > 0 && row.amplitude_24h_pct > 10) || false };
      coin = applyValidation(coin, ba);
      coin.star_rating = assignStars(coin.market_cap, coin.circulating_ratio, coin.data_conflict, coin.stale_cg_data);
      merged.push(coin);
    }
    const filtered = merged.filter(r => r.market_cap != null && r.market_cap >= 15000000);
    if (filtered.length > 0) {
      await kv.put('data', JSON.stringify(filtered));
      await kv.put('last_updated', new Date().toISOString());
      await kv.put('count', String(filtered.length));
      console.log('Branch 1 (exchange+CMC):', filtered.length, 'coins from', proxySources, 'sources');
      return;
    }
  }

  // 6) Branch 2: CMC only (always works, gives 800+ coins with market cap data)
  if (cmcResult) {
    const coins = [];
    for (const [sym, c] of Object.entries(cmcResult)) {
      if (c.market_cap == null || c.market_cap < 15000000) continue;
      let coin = { symbol: c.symbol || '', name: c.name || (c.symbol || '').toUpperCase(), base_asset: (c.symbol || '').toUpperCase(), price: c.price, market_cap: c.market_cap, circulating_supply: c.circulating_supply, total_supply: c.total_supply, max_supply: c.max_supply, circulating_ratio: c.circulating_ratio, cmc_rank: c.cmc_rank, volume_24h_usdt: c.volume_24h_usdt, percent_change_7d: c.percent_change_7d, change_24h_pct: null, amplitude_24h_pct: null, star_rating: assignStars(c.market_cap, c.circulating_ratio, false), unlock_risk: unlockLabel(c.circulating_ratio), momentum_alert: false };
      coin = applyValidation(coin, sym);
      coin.star_rating = assignStars(coin.market_cap, coin.circulating_ratio, coin.data_conflict, coin.stale_cg_data);
      coins.push(coin);
    }
    if (coins.length > 0) {
      await kv.put('data', JSON.stringify(coins));
      await kv.put('last_updated', new Date().toISOString());
      await kv.put('count', String(coins.length));
      console.log('Branch 2 (CMC-only):', coins.length, 'coins');
      return;
    }
  }

  // 7) Branch 3: Exchange only (no CMC, bare minimum)
  if (exchangeRows.length > 0) {
    const coins = exchangeRows.map(row => ({ symbol: row.symbol, name: (row.base_asset || '').toUpperCase(), base_asset: row.base_asset, price: row.price, market_cap: null, circulating_supply: null, total_supply: null, max_supply: null, circulating_ratio: null, cmc_rank: null, volume_24h_usdt: row.volume_24h_usdt, percent_change_7d: null, change_24h_pct: row.change_24h_pct, amplitude_24h_pct: row.amplitude_24h_pct, star_rating: 0, unlock_risk: unlockLabel(null), momentum_alert: false }));
    await kv.put('data', JSON.stringify(coins));
    await kv.put('last_updated', new Date().toISOString());
    await kv.put('count', String(coins.length));
    console.log('Branch 3 (exchange-only):', coins.length, 'coins');
  }
}

async function fetchBybitData() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const [instrRes, tickRes] = await Promise.all([
      fetch('https://api.bybit.com/v5/market/instruments-info?category=linear', { signal: controller.signal }),
      fetch('https://api.bybit.com/v5/market/tickers?category=linear', { signal: controller.signal }),
    ]);
    if (!instrRes.ok) throw new Error('Bybit instr: ' + instrRes.status);
    if (!tickRes.ok) throw new Error('Bybit tick: ' + tickRes.status);
    const instrData = await instrRes.json();
    const symbols = new Set(instrData.result.list.filter(s => s.status === 'Trading' && s.quoteCoin === 'USDT' && s.contractType === 'LinearPerpetual').map(s => s.symbol));
    const tickData = await tickRes.json();
    const tickerMap = new Map();
    for (const t of tickData.result.list) tickerMap.set(t.symbol, t);
    const rows = [];
    for (const sym of symbols) {
      const t = tickerMap.get(sym); if (!t) continue;
      const price = parseFloat(t.lastPrice);
      const high = parseFloat(t.highPrice24h);
      const low = parseFloat(t.lowPrice24h);
      const pcnt = parseFloat(t.price24hPcnt || '0') * 100;
      if (isNaN(price) || price <= 0) continue;
      rows.push({ symbol: sym, base_asset: sym.replace('USDT', ''), price, change_24h_pct: Math.round(pcnt * 100) / 100, amplitude_24h_pct: Math.round(((high - low) / price) * 100 * 100) / 100, volume_24h_usdt: parseFloat(t.turnover24h || '0') });
    }
    return rows;
  } finally { clearTimeout(timeout); }
}
async function fetchBinanceData() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr', { signal: controller.signal });
    if (!res.ok) throw new Error('Binance: ' + res.status);
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
      rows.push({ symbol: t.symbol, base_asset: t.symbol.replace('USDT', ''), price, change_24h_pct: Math.round(chg * 100) / 100, amplitude_24h_pct: high && low && high > 0 && low > 0 ? Math.round(((high - low) / price) * 100 * 100) / 100 : 0, volume_24h_usdt: vol });
    }
    return rows;
  } finally { clearTimeout(timeout); }
}
async function fetchOKXData() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch('https://www.okx.com/api/v5/market/tickers?instType=SWAP', { signal: controller.signal });
    if (!res.ok) throw new Error('OKX: ' + res.status);
    const data = await res.json();
    if (!data.data) return [];
    const rows = [];
    for (const t of data.data) {
      if (!t.instId.endsWith('-USDT-SWAP')) continue;
      const price = parseFloat(t.last);
      const high = parseFloat(t.high24h);
      const low = parseFloat(t.low24h);
      if (isNaN(price) || price <= 0) continue;
      const ba = t.instId.replace('-USDT-SWAP', '');
      const vol = parseFloat(t.volCcy24h || '0');
      const chg = parseFloat(t.change24h || '0') * 100;
      rows.push({ symbol: ba + 'USDT', base_asset: ba, price, change_24h_pct: Math.round(chg * 100) / 100, amplitude_24h_pct: high && low && high > 0 && low > 0 ? Math.round(((high - low) / price) * 100 * 100) / 100 : 0, volume_24h_usdt: vol });
    }
    return rows;
  } finally { clearTimeout(timeout); }
}
async function fetchCmcData(env) {
  // Service Worker format: secrets are globals; ES module: env param
  const cmcKey = env?.CMC_API_KEY || (typeof CMC_API_KEY !== 'undefined' ? CMC_API_KEY : null);
  if (cmcKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const res = await fetch('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=1&limit=1000&convert=USD', { headers: { 'X-CMC_PRO_API_KEY': cmcKey, 'Accept': 'application/json' }, signal: controller.signal });
        if (res.ok) { const data = await res.json(); return parseCmcResponse(data); }
        try { const errBody = await res.json(); console.error('CMC API error:', res.status, errBody); } catch (e) {}
      } finally { clearTimeout(timeout); }
    } catch (e) { console.error('CMC fetch error:', e); }
  }
  return null;
}
function parseCmcResponse(data) {
  const map = {};
  for (const coin of data.data) {
    const sym = coin.symbol;
    const q = coin.quote.USD;
    const circSup = coin.circulating_supply;
    const totalSup = coin.total_supply;
    const maxSup = coin.max_supply;
    let cr = null;
    if (totalSup && totalSup > 0 && circSup != null) cr = circSup / totalSup;
    else if (maxSup && maxSup > 0 && circSup != null) cr = circSup / maxSup;
    map[sym.toUpperCase()] = { symbol: sym, market_cap: q.market_cap || null, circulating_supply: circSup, total_supply: totalSup, max_supply: maxSup, circulating_ratio: cr != null ? Math.round(cr * 10000) / 10000 : null, cmc_rank: coin.cmc_rank || null, name: coin.name || sym, percent_change_7d: q.percent_change_7d != null ? Math.round(q.percent_change_7d * 100) / 100 : null, price: q.price != null ? Math.round(q.price * 10000) / 10000 : null, volume_24h_usdt: q.volume_24h != null ? Math.round(q.volume_24h * 100) / 100 : null };
  }
  return map;
}
async function fetchCoinGeckoData(env) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const headers = { 'User-Agent': 'CryptoScreener/5.0' };
    const cgKey = env?.COINGECKO_API_KEY || (typeof COINGECKO_API_KEY !== 'undefined' ? COINGECKO_API_KEY : null);
    if (cgKey) {
      headers['x-cg-demo-api-key'] = cgKey;
    }
    const pages = [1, 2, 3, 4, 5, 6, 7, 8];
    const results = await Promise.allSettled(
      pages.map(page =>
        fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=' + page + '&sparkline=false&price_change_percentage=7d', { headers, signal: controller.signal }).then(res => {
          if (!res.ok) throw new Error('CG page ' + page + ' status ' + res.status);
          return res.json();
        })
      )
    );
    const map = {};
    for (const result of results) {
      if (result.status !== 'fulfilled' || !Array.isArray(result.value)) continue;
      for (const c of result.value) {
        const sym = (c.symbol || '').toUpperCase();
        if (map[sym]) continue;
        const circSup = c.circulating_supply;
        const totalSup = c.total_supply;
        let cr = null;
        if (totalSup && totalSup > 0 && circSup != null) cr = circSup / totalSup;
        map[sym] = { symbol: sym, market_cap: c.market_cap || null, circulating_supply: circSup, total_supply: totalSup, max_supply: c.max_supply || null, circulating_ratio: cr != null ? Math.round(cr * 10000) / 10000 : null, cmc_rank: c.market_cap_rank || null, name: c.name || sym, percent_change_7d: c.price_change_percentage_7d_in_currency != null ? Math.round(c.price_change_percentage_7d_in_currency * 100) / 100 : null, price: c.current_price != null ? Math.round(c.current_price * 10000) / 10000 : null, volume_24h_usdt: c.total_volume != null ? Math.round(c.total_volume * 100) / 100 : null };
      }
    }
    const pageCount = results.filter(r => r.status === 'fulfilled').length;
    console.log('CoinGecko: ' + Object.keys(map).length + ' unique coins from ' + pageCount + '/' + pages.length + ' pages');
    return Object.keys(map).length > 0 ? map : null;
  } catch (e) {
    console.error('CoinGecko fetch error:', e);
    return null;
  } finally { clearTimeout(timeout); }
}
function assignStars(mcap, cr, conflicted, staleCg) {
  if (mcap == null || cr == null || mcap < 15000000) return 0;
  const raw = crunchStars(mcap, cr);
  if (conflicted) {
    return staleCg ? Math.max(1, raw - 1) : raw;
  }
  return raw;
}
function crunchStars(mcap, cr) {
  if (mcap <= 500000000 && cr < 0.3) return 5;
  if (mcap <= 100000000 && cr < 0.5) return 4;
  if (mcap <= 500000000 && cr < 0.5) return 3;
  if (mcap <= 2000000000 && cr < 0.5) return 3;
  if (mcap > 2000000000) return cr >= 0.5 ? 1 : 2;
  if (cr >= 0.8) return 1;
  return 2;
}
function unlockLabel(cr) {
  if (cr == null) return '\u26a0\ufe0f \u672a\u77e5';
  if (cr < 0.3) return '\ud83d\udd34 \u9ad8\u901a\u80c0\u98ce\u9669';
  if (cr < 0.5) return '\ud83d\udfe1 \u89e3\u9501\u98ce\u9669';
  return '\ud83d\udfe2 \u4f4e\u98ce\u9669';
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);
    const kv = env.MARKET_DATA;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Key' } });
    }

    if (path === '/api/debug-exchange') { return handleDebugExchange(kv); }
    if (path === '/api/data') { return handleApiData(kv); }
    if (path === '/api/refresh' && request.method === 'POST') { return handleRefresh(kv, env); }
    if (path === '/api/upload' && request.method === 'POST') { return handleUpload(request, kv, env); }
    if (path === '/api/relay-tickers' && request.method === 'POST') { return handleRelayTickers(request, kv, env); }
    if (path === '/api/status') { return handleStatus(kv); }
    return handleDashboard(kv);
  },
  async scheduled(controller, env, ctx) {
    const kv = env.MARKET_DATA;
    ctx.waitUntil((async () => {
      console.log('Scheduled refresh starting...');
      await refreshData(kv, env);
      await handleDebugExchange(kv).catch(e => console.error('debug-exchange failed:', e));
      console.log('Scheduled refresh complete.');
    })());
  },
};

async function handleApiData(kv) {
  const raw = await kv.get('data');
  const updated = await kv.get('last_updated');
  if (!raw) return json({ ok: false, error: '\u6570\u636e\u5c1a\u672a\u52a0\u8f7d', data: [], updated: null });
  const parsed = JSON.parse(raw);
  return json({ ok: true, updated, data: parsed, count: parsed.length });
}
async function handleDashboard(kv) {
  const kvHtml = await kv.get(KV_HTML_KEY);
  if (kvHtml) return html(kvHtml);
  return new Response('Dashboard not loaded yet', { status: 503 });
}
async function handleRefresh(kv, env) {
  const mem = await kv.get('data');
  console.log('Refresh started, current coins:', mem ? JSON.parse(mem).length : 0);
  await refreshData(kv, env);
  const updated = await kv.get('last_updated');
  const count = await kv.get('count');
  console.log('Refresh completed:', count, 'coins at', updated);
  return json({ ok: true, updated, coins: parseInt(count || '0') });
}
async function handleUpload(request, kv, env) {
  const expectedKey = env?.UPLOAD_AUTH_KEY;
  const auth = request.headers.get('X-Auth-Key');
  if (!expectedKey || auth !== expectedKey) { return json({ ok: false, error: 'Unauthorized' }, 401); }
  try {
    const body = await request.json();
    if (!Array.isArray(body)) { return json({ ok: false, error: 'Body must be a JSON array of coins' }, 400); }
    await kv.put('data', JSON.stringify(body));
    const now = new Date().toISOString();
    await kv.put('last_updated', now);
    await kv.put('count', String(body.length));
    return json({ ok: true, coins: body.length, updated: now });
  } catch (e) { return json({ ok: false, error: e.message }, 400); }
}
async function handleRelayTickers(request, kv, env) {
  // Authenticate with RELAY_AUTH_KEY (different from upload key, for relay access)
  const expectedKey = env?.RELAY_AUTH_KEY;
  const auth = request.headers.get('X-Auth-Key');
  if (!expectedKey || auth !== expectedKey) { return json({ ok: false, error: 'Unauthorized' }, 401); }
  try {
    const body = await request.json();
    // Expected: { binance?: [...], bybit?: [...], okx?: [...] }
    if (!body || typeof body !== 'object') { return json({ ok: false, error: 'Body must be an object with exchange arrays' }, 400); }
    await kv.put('exchange_proxy', JSON.stringify(body));
    const now = new Date().toISOString();
    await kv.put('exchange_proxy_updated', now);
    const sources = [];
    if (body.binance) sources.push('binance:' + body.binance.length);
    if (body.bybit) sources.push('bybit:' + body.bybit.length);
    if (body.okx) sources.push('okx:' + body.okx.length);
    return json({ ok: true, sources: sources.join(', '), updated: now });
  } catch (e) { return json({ ok: false, error: e.message }, 400); }
}
async function handleStatus(kv) {
  const raw = await kv.get('data');
  const updated = await kv.get('last_updated');
  const count = await kv.get('count');
  return json({ project: '\u7b79\u7801\u7b5b\u9009 \u00b7 \u4ee3\u5e01\u7b5b\u9009\u5668', ok: !!raw, coins: parseInt(count || '0'), updated });
}
async function handleDebugExchange(kv) {
  const endpoints = [
    { name: 'Binance fapi', url: 'https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=BTCUSDT' },
    { name: 'Binance spot', url: 'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT' },
    { name: 'Bybit linear', url: 'https://api.bybit.com/v5/market/tickers?category=linear&symbol=BTCUSDT' },
    { name: 'OKX swap', url: 'https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT-SWAP' },
    { name: 'Binance + XFF', url: 'https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=BTCUSDT', headers: { 'X-Forwarded-For': '8.8.8.8' } },
  ];
  const results = {};
  for (const ep of endpoints) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(ep.url, { signal: controller.signal, headers: ep.headers || {} });
      clearTimeout(timeout);
      const text = await res.text().catch(() => '');
      results[ep.name] = { status: res.status, body_preview: text.slice(0, 200) };
    } catch (e) {
      clearTimeout(timeout);
      results[ep.name] = { error: e.message };
    }
  }
  await kv.put('debug_exchange', JSON.stringify(results)).catch(() => {});
  return json(results);
}
