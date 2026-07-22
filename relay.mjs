// relay.mjs 鈥?Exchange ticker relay: Binance / Bybit / OKX 鈫?Cloudflare Worker
// Runs on GitHub Actions (US IP) to bypass Workers IP blocks from Binance/Bybit
//
// Environment variables (set as GitHub Actions secrets):
//   WORKER_URL      鈥?e.g. https://app.slinglab.xyz/screener/api/relay-tickers
//   RELAY_AUTH_KEY  鈥?matches Worker's RELAY_AUTH_KEY secret
//   (optional) DEBUG 鈥?set "1" to print fetched ticker counts

const WORKER_URL = process.env.WORKER_URL || 'https://app.slinglab.xyz/screener/api/relay-tickers';
const AUTH_KEY = process.env.RELAY_AUTH_KEY;
const TIMEOUT_MS = 20000;

// 鈹€鈹€ Binance Futures 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
async function fetchBinance() {
  const url = 'https://fapi.binance.com/fapi/v1/ticker/24hr';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) { throw new Error(`Binance HTTP ${res.status}`); }
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

// 鈹€鈹€ Bybit Linear 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
async function fetchBybit() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // Get tradable symbols + ticker data
    const [instrRes, tickRes] = await Promise.all([
      fetch('https://api.bybit.com/v5/market/instruments-info?category=linear', { signal: controller.signal }),
      fetch('https://api.bybit.com/v5/market/tickers?category=linear', { signal: controller.signal }),
    ]);
    if (!instrRes.ok) throw new Error(`Bybit instr HTTP ${instrRes.status}`);
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

// 鈹€鈹€ OKX SWAP 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
async function fetchOkx() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch('https://www.okx.com/api/v5/market/tickers?instType=SWAP', { signal: controller.signal });
    if (!res.ok) throw new Error(`OKX HTTP ${res.status}`);
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
      rows.push({
        symbol: ba + 'USDT',
        base_asset: ba,
        price,
        change_24h_pct: Math.round(parseFloat(t.change24h || '0') * 100 * 100) / 100,
        amplitude_24h_pct: (high && low && high > 0 && low > 0)
          ? Math.round(((high - low) / price) * 100 * 100) / 100
          : 0,
        volume_24h_usdt: parseFloat(t.volCcy24h || '0'),
      });
    }
    return rows;
  } finally { clearTimeout(timer); }
}

// 鈹€鈹€ Main 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
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
      process.exit(1);
    }
  } finally { clearTimeout(timer); }
}

main().catch(err => {
  console.error('Unhandled relay error:', err);
  process.exit(1);
});
