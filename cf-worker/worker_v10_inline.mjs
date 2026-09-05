// 筹码筛选 Worker (Service Worker) v10 — Exchange Proxy + Source Guard + Coinfilter + Demon + Mentioned
globalThis.INLINE_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>筹码真空 · 代币筛选器</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0b1120;
  --surface:#111b2e;
  --surface-alt:#0f1729;
  --surface-hover:#1a2640;
  --border:rgba(255,255,255,0.07);
  --border-active:rgba(59,130,246,0.5);
  --text:#f1f5f9;
  --text-secondary:#94a3b8;
  --text-muted:#475569;
  --accent:#3b82f6;
  --accent-hover:#2563eb;
  --accent-glow:rgba(59,130,246,0.25);
  --success:#10b981;
  --success-bg:rgba(16,185,129,0.12);
  --warning:#f59e0b;
  --warning-bg:rgba(245,158,11,0.12);
  --danger:#ef4444;
  --danger-bg:rgba(239,68,68,0.12);
  --star:#f59e0b;
  --radius:12px;
  --radius-sm:8px;
  --radius-lg:16px;
  --shadow:0 4px 24px rgba(0,0,0,0.3);
  --transition:0.25s cubic-bezier(0.4,0,0.2,1);
  --font:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif;
}
html{font-size:15px}
body{
  background:var(--bg);
  color:var(--text);
  font-family:var(--font);
  padding:20px;
  min-height:100vh;
  background-image:radial-gradient(ellipse at 20% 50%,rgba(59,130,246,0.06) 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,rgba(16,185,129,0.04) 0%,transparent 50%);
  background-attachment:fixed;
}
#root{animation:fadeIn .4s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.8}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 8px var(--accent-glow)}50%{box-shadow:0 0 20px var(--accent-glow)}}

/* Loading state */
.loading-root{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:16px}
.loading-root .spinner{width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.loading-root .loading-text{color:var(--text-muted);font-size:.85rem;letter-spacing:.3px}

/* Header */
.app-header{background:linear-gradient(135deg,rgba(59,130,246,0.1),rgba(16,185,129,0.05));border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px 28px;margin-bottom:16px;position:relative;overflow:hidden}
.app-header::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--accent),transparent);opacity:.5}
.app-header h1{font-size:1.35rem;font-weight:700;background:linear-gradient(135deg,#f1f5f9,#94a3b8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.app-header p{font-size:.8rem;color:var(--text-secondary);margin-top:6px}

/* Info banner */
.info-banner{background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:var(--radius-sm);padding:10px 14px;font-size:.75rem;color:#60a5fa;margin-bottom:12px;line-height:1.5}
.info-banner.warn{background:var(--warning-bg);border-color:rgba(245,158,11,0.25);color:var(--warning)}

/* Status bar */
.status-bar{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;font-size:.75rem;margin-bottom:14px;border-radius:var(--radius-sm);backdrop-filter:blur(12px)}
.status-bar.ok{background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.15);color:var(--success)}
.status-bar.warn{background:var(--warning-bg);border:1px solid rgba(245,158,11,0.2);color:var(--warning)}
.status-bar span{display:flex;align-items:center;gap:4px}

/* Layout */
.layout{display:flex;gap:16px;animation:slideUp .5s ease}
.sidebar{width:280px;flex-shrink:0;display:flex;flex-direction:column;gap:10px}
.main{flex:1;min-width:0}

/* Presets */
.preset-row{display:flex;gap:8px}
.preset-btn{flex:1;padding:10px 12px;border:none;border-radius:var(--radius-sm);font-weight:600;font-size:.8rem;cursor:pointer;color:#fff;transition:var(--transition);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;position:relative}
.preset-btn:hover{transform:translateY(-1px);filter:brightness(1.15)}
.preset-btn:active{transform:translateY(0)}
.preset-a{background:linear-gradient(135deg,#dc2626,#b91c1c);box-shadow:0 2px 12px rgba(220,38,38,0.25)}
.preset-b{background:linear-gradient(135deg,#d97706,#b45309);box-shadow:0 2px 12px rgba(217,119,6,0.25)}

/* Filter cards */
.filter-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;transition:var(--transition)}
.filter-card:hover{border-color:rgba(255,255,255,0.12)}
.filter-card .label{font-size:.65rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px}
.filter-card input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;background:rgba(255,255,255,0.1);outline:none;margin:8px 0;transition:var(--transition)}
.filter-card input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:16px;height:16px;border-radius:50%;background:var(--accent);border:2px solid var(--surface);cursor:pointer;box-shadow:0 0 8px var(--accent-glow);transition:var(--transition)}
.filter-card input[type=range]::-webkit-slider-thumb:hover{transform:scale(1.15);box-shadow:0 0 12px var(--accent-glow)}
.filter-card input[type=range]::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:var(--accent);border:2px solid var(--surface);cursor:pointer;box-shadow:0 0 8px var(--accent-glow)}
.filter-card .input-row{display:flex;gap:8px;align-items:center;margin-bottom:4px}
.filter-card .input-row .filter-input{flex:1;padding:6px 8px;border:1px solid rgba(255,255,255,0.1);border-radius:var(--radius-sm);font-size:.8rem;width:0;min-width:0;text-align:center;background:var(--surface-alt);color:var(--text);transition:var(--transition);font-variant-numeric:tabular-nums}
.filter-card .input-row .filter-input:focus{border-color:var(--accent);outline:none;box-shadow:0 0 0 3px var(--accent-glow)}
.filter-card .input-row .range-sep{color:var(--text-muted);font-size:.8rem;flex-shrink:0}

/* KPI cards */
.kpi-row{display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap}
.kpi-card{flex:1;min-width:100px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px 18px;text-align:center;transition:var(--transition);position:relative;overflow:hidden}
.kpi-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)}
.kpi-card:hover{border-color:rgba(255,255,255,0.15);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.2)}
.kpi-card .kpi-label{font-size:.65rem;color:var(--text-muted);font-weight:500;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px}
.kpi-card .kpi-value{font-size:1.4rem;font-weight:700;color:var(--text);font-variant-numeric:tabular-nums;letter-spacing:-.3px}

/* Table */
.table-wrap{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:12px;transition:var(--transition)}
.table-wrap:hover{border-color:rgba(255,255,255,0.12)}
.table-wrap .table-title{padding:14px 18px;font-weight:600;font-size:.85rem;color:var(--text);border-bottom:1px solid var(--border)}
.table-scroll{overflow-x:auto;max-height:72vh;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.08) transparent}
.table-scroll::-webkit-scrollbar{width:6px;height:6px}
.table-scroll::-webkit-scrollbar-track{background:transparent}
.table-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:3px}
.table-scroll::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.15)}
table{width:100%;border-collapse:collapse;font-size:.78rem;white-space:nowrap}
th{background:rgba(255,255,255,0.03);color:var(--text-secondary);font-weight:600;font-size:.65rem;text-transform:uppercase;letter-spacing:.6px;padding:10px 12px;border-bottom:1px solid var(--border);cursor:pointer;user-select:none;position:sticky;top:0;z-index:1;backdrop-filter:blur(8px);transition:var(--transition)}
th:hover{color:var(--text);background:rgba(255,255,255,0.06)}
td{padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.04);color:var(--text);font-variant-numeric:tabular-nums;transition:var(--transition)}
tr{transition:var(--transition)}
tr:hover td{background:rgba(255,255,255,0.02)}
tr.momentum td{color:#34d399!important}
tr.momentum td:first-child{position:relative}
tr.momentum td:first-child::before{content:'';position:absolute;left:0;top:4px;bottom:4px;width:3px;background:linear-gradient(180deg,var(--success),#059669);border-radius:2px}
tr.star5 td{color:var(--warning)!important}
tr.star5 td:first-child{position:relative}
tr.star5 td:first-child::before{content:'';position:absolute;left:0;top:4px;bottom:4px;width:3px;background:linear-gradient(180deg,var(--warning),#d97706);border-radius:2px}
tr.conflict td{color:#fbbf24!important}
tr.conflict td:first-child{position:relative}
tr.conflict td:first-child::before{content:'';position:absolute;left:0;top:4px;bottom:4px;width:3px;background:linear-gradient(180deg,#f59e0b,#b45309);border-radius:2px}
.empty-msg{text-align:center;padding:40px 20px;color:var(--text-muted);font-size:.85rem}

/* Buttons */
.btn{padding:8px 18px;background:linear-gradient(135deg,var(--accent),var(--accent-hover));color:#fff;border:none;border-radius:var(--radius-sm);font-size:.8rem;font-weight:600;cursor:pointer;transition:var(--transition);position:relative;overflow:hidden}
.btn:hover{transform:translateY(-1px);box-shadow:0 4px 16px var(--accent-glow)}
.btn:active{transform:translateY(0)}
.refresh-btn{width:100%;padding:10px;background:linear-gradient(135deg,var(--accent),var(--accent-hover));color:#fff;border:none;border-radius:var(--radius-sm);font-weight:600;font-size:.8rem;cursor:pointer;transition:var(--transition);position:relative;overflow:hidden}
.refresh-btn:hover{transform:translateY(-1px);box-shadow:0 4px 16px var(--accent-glow)}
.refresh-btn:active{transform:translateY(0)}

/* Calc card */
.calc-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:18px;margin-bottom:12px;transition:var(--transition)}
.calc-card:hover{border-color:rgba(255,255,255,0.12)}
.calc-card h3{font-size:.9rem;font-weight:600;color:var(--text);margin-bottom:4px}
.calc-row{display:flex;gap:10px;margin:10px 0}
.calc-row input{flex:1;padding:8px 12px;border:1px solid rgba(255,255,255,0.1);border-radius:var(--radius-sm);font-size:.85rem;background:var(--surface-alt);color:var(--text);transition:var(--transition);font-variant-numeric:tabular-nums}
.calc-row input:focus{border-color:var(--accent);outline:none;box-shadow:0 0 0 3px var(--accent-glow)}
.calc-result{background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.15);border-radius:var(--radius-sm);padding:12px 16px;font-weight:600;color:var(--success);font-size:.85rem;margin:10px 0;line-height:1.5}


/* Source reliability badges */
.dual-ratio{display:inline-flex;align-items:center;gap:6px}
.dual-ratio .cr-cg{font-size:.6rem;color:var(--text-muted);background:rgba(255,255,255,0.06);padding:1px 5px;border-radius:3px}
.stale-badge{display:inline-flex;align-items:center;gap:3px;background:var(--danger-bg);color:var(--danger);border:1px solid rgba(239,68,68,0.25);border-radius:4px;padding:2px 6px;font-size:.55rem;font-weight:600;cursor:help;transition:var(--transition);margin-left:4px}
.stale-badge:hover{background:rgba(239,68,68,0.18)}
/* Conflict badge */
.conflict-badge{display:inline-flex;align-items:center;gap:4px;background:var(--warning-bg);color:var(--warning);border:1px solid rgba(245,158,11,0.25);border-radius:4px;padding:2px 8px;font-size:.6rem;font-weight:600;cursor:help;transition:var(--transition)}
.conflict-badge:hover{background:rgba(245,158,11,0.18)}
.star-conflict{opacity:.55;position:relative}
.star-conflict::after{content:'?';position:absolute;top:-4px;right:-7px;font-size:.55rem;color:var(--warning);font-weight:700}
.data-source-info{font-size:.6rem;color:var(--text-muted);padding:4px 14px;text-align:right;border-top:1px solid var(--border)}

/* Footer */
.footer{text-align:center;color:var(--text-muted);font-size:.65rem;padding:16px 0;letter-spacing:.2px;line-height:1.6}

/* Responsive */
@media(max-width:768px){
  body{padding:12px}
  .layout{flex-direction:column}
  .sidebar{width:100%}
  .kpi-card{min-width:calc(50% - 5px)}
  .kpi-card .kpi-value{font-size:1.15rem}
  .app-header{padding:18px 20px}
  .app-header h1{font-size:1.15rem}
  .scatter-wrap,.cf-scatter-wrap{height:240px}
  .scatter-plot,.cf-scatter-plot{left:30px;right:20px}
  .scatter-tick-y,.cf-scatter-tick-y{font-size:.48rem}
  .scatter-tick-x,.cf-scatter-tick-x{font-size:.48rem}
  .scatter-legend,.cf-scatter-legend{font-size:.48rem;gap:4px}
}
</style><style>
/* ═══ 妖币扫描器 视图样式 ═══ */
#tabbar{display:flex;gap:8px;margin-bottom:14px}
.tab-btn{flex:1;max-width:220px;padding:11px 16px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--text-secondary);font-size:.85rem;font-weight:600;cursor:pointer;transition:var(--transition);letter-spacing:.5px}
.tab-btn:hover{border-color:var(--border-active);color:var(--text)}
.tab-btn.active{background:linear-gradient(135deg,rgba(59,130,246,0.18),rgba(16,185,129,0.08));border-color:var(--border-active);color:var(--text);box-shadow:0 0 16px var(--accent-glow)}
.demon-preset-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.demon-preset{flex:1;min-width:88px;padding:9px 8px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface);color:var(--text-secondary);font-size:.72rem;font-weight:600;cursor:pointer;transition:var(--transition)}
.demon-preset:hover{border-color:var(--border-active);color:var(--text)}
.demon-preset.active{background:linear-gradient(135deg,rgba(239,68,68,0.18),rgba(245,158,11,0.12));border-color:rgba(239,68,68,0.4);color:#fca5a5;box-shadow:0 0 12px rgba(239,68,68,0.15)}
.demon-filter-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px;margin-bottom:10px}
.demon-filter-card .label{font-size:.62rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px}
.demon-filter-card .input-row{display:flex;gap:8px;align-items:center;margin-bottom:4px}
.demon-filter-card .filter-input{flex:1;padding:6px 8px;border:1px solid rgba(255,255,255,0.1);border-radius:var(--radius-sm);font-size:.8rem;width:0;min-width:0;text-align:center;background:var(--surface-alt);color:var(--text);transition:var(--transition);font-variant-numeric:tabular-nums}
.demon-filter-card .filter-input:focus{border-color:var(--accent);outline:none;box-shadow:0 0 0 3px var(--accent-glow)}
.demon-filter-card .range-sep{color:var(--text-muted);font-size:.8rem;flex-shrink:0}
.demon-filter-card input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;background:rgba(255,255,255,0.1);outline:none;margin:8px 0;transition:var(--transition)}
.demon-filter-card input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;border-radius:50%;background:var(--accent);border:2px solid var(--surface);cursor:pointer;box-shadow:0 0 8px var(--accent-glow)}
.demon-filter-card input[type=range]::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:var(--accent);border:2px solid var(--surface);cursor:pointer}
.demon-sort-row{display:flex;gap:8px;margin-top:4px}
.demon-sort-row select{flex:1;padding:6px 8px;border:1px solid rgba(255,255,255,0.1);border-radius:var(--radius-sm);font-size:.75rem;background:var(--surface-alt);color:var(--text)}
.sig-badge{display:inline-block;font-size:.58rem;font-weight:600;padding:2px 6px;border-radius:4px;margin:1px 2px;white-space:nowrap}
.sig-squeeze{background:rgba(239,68,68,0.18);color:#fca5a5;border:1px solid rgba(239,68,68,0.3)}
.sig-pump{background:rgba(16,185,129,0.16);color:#34d399;border:1px solid rgba(16,185,129,0.3)}
.sig-dump{background:rgba(245,158,11,0.16);color:#fbbf24;border:1px solid rgba(245,158,11,0.3)}
.sig-tag{background:rgba(139,92,246,0.16);color:#c4b5fd;border:1px solid rgba(139,92,246,0.3)}
.sig-lowoi{background:rgba(59,130,246,0.14);color:#93c5fd;border:1px solid rgba(59,130,246,0.3)}
.sig-higoi{background:rgba(239,68,68,0.24);color:#f87171;border:1px solid rgba(239,68,68,0.4)}
tr.squeeze-row td{color:#fca5a5!important}
tr.squeeze-row td:first-child{position:relative}
tr.squeeze-row td:first-child::before{content:'';position:absolute;left:0;top:4px;bottom:4px;width:3px;background:linear-gradient(180deg,#ef4444,#b91c1c);border-radius:2px}
.demon-chart-wrap{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;margin-bottom:12px}
.demon-chart-wrap h4{font-size:.8rem;font-weight:600;color:var(--text);margin-bottom:10px}
.hbar-row{display:flex;align-items:center;gap:8px;margin:3px 0;font-size:.66rem}
.hbar-label{width:52px;text-align:right;color:var(--text-secondary);flex-shrink:0;font-variant-numeric:tabular-nums}
.hbar-track{flex:1;height:12px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden}
.hbar-fill{height:100%;background:linear-gradient(90deg,#ef4444,#f59e0b);border-radius:3px;min-width:2px}
.hbar-val{width:56px;color:var(--text-muted);flex-shrink:0;font-variant-numeric:tabular-nums}
.hist-wrap{display:flex;align-items:flex-end;gap:4px;height:110px;padding-top:4px}
.hist-bar{flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%}
.hist-fill{background:linear-gradient(180deg,#3b82f6,#1d4ed8);border-radius:3px 3px 0 0;min-height:2px;transition:height .3s}
.hist-fill.neg{background:linear-gradient(180deg,#f59e0b,#d97706)}
.hist-label{font-size:.55rem;color:var(--text-muted);text-align:center;margin-top:4px;white-space:nowrap}
.scatter-wrap{position:relative;height:300px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:var(--radius-sm);overflow:visible}
.scatter-plot{position:absolute;top:24px;right:36px;bottom:28px;left:44px;overflow:hidden;border-radius:4px}
.scatter-dot{position:absolute;border-radius:50%;opacity:.85;cursor:pointer;transition:transform .15s,box-shadow .15s;transform:translate(-50%,-50%);z-index:2}
.scatter-dot:hover{transform:translate(-50%,-50%) scale(1.6);opacity:1;z-index:6;box-shadow:0 0 10px rgba(255,255,255,0.25)}
.scatter-grid{position:absolute;pointer-events:none;background:rgba(255,255,255,0.05);z-index:0}
.scatter-grid-v{top:0;bottom:0;width:1px}
.scatter-grid-h{left:0;right:0;height:1px}
.scatter-tick{position:absolute;font-size:.55rem;color:var(--text-muted);pointer-events:none;font-variant-numeric:tabular-nums;z-index:1;white-space:nowrap}
.scatter-tick-x{bottom:-16px;transform:translateX(-50%)}
.scatter-tick-y{left:-4px;transform:translateX(-100%) translateY(50%);text-align:right}
.scatter-axis{position:absolute;font-size:.58rem;color:var(--text-secondary);z-index:3;background:var(--surface);padding:0 4px;white-space:nowrap}
.scatter-x{left:44px;bottom:2px}
.scatter-y{top:2px;right:8px}
.scatter-tip{position:absolute;left:50%;transform:translateX(-50%);background:#111827;border:1px solid rgba(255,255,255,0.2);color:#e5e7eb;font-size:.62rem;padding:6px 10px;border-radius:8px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .15s;z-index:30;box-shadow:0 4px 16px rgba(0,0,0,0.5);line-height:1.5}
.scatter-tip.above{bottom:calc(100% + 6px)}
.scatter-tip.below{top:calc(100% + 6px)}
.scatter-dot:hover .scatter-tip{opacity:1}
.scatter-legend{position:absolute;left:48px;bottom:6px;display:flex;gap:8px;z-index:3;font-size:.55rem;color:var(--text-muted);background:rgba(15,23,42,0.85);padding:3px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.08)}
.scatter-legend-item{display:flex;align-items:center;gap:3px}
.scatter-legend-item i{width:8px;height:8px;border-radius:50%;display:inline-block}
.demon-note{font-size:.62rem;color:var(--text-muted);margin-top:8px;line-height:1.6}
</style><style>
/* ═══ 🪙 小币筛选器 视图样式 ═══ */
/* 主题与 _demon.css 一致，使用 var(--*) 基础变量，cf- 前缀避免类名冲突 */

/* 第三 Tab 激活态（金色系，区别于蓝/红的其他两 Tab） */
.tab-btn.tab-coinfilter.active{background:linear-gradient(135deg,rgba(245,158,11,0.2),rgba(16,185,129,0.1));border-color:rgba(245,158,11,0.45);color:var(--text);box-shadow:0 0 16px rgba(245,158,11,0.18)}

/* ── 预设按钮（与 demon 同款样式）── */
.cf-preset-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.cf-preset{flex:1;min-width:88px;padding:9px 8px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface);color:var(--text-secondary);font-size:.72rem;font-weight:600;cursor:pointer;transition:var(--transition)}
.cf-preset:hover{border-color:var(--border-active);color:var(--text)}
.cf-preset.active{background:linear-gradient(135deg,rgba(245,158,11,0.18),rgba(16,185,129,0.12));border-color:rgba(245,158,11,0.4);color:#fcd34d;box-shadow:0 0 12px rgba(245,158,11,0.15)}

/* ── 筛选卡片 ── */
.cf-filter-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px;margin-bottom:10px}
.cf-filter-card .label{font-size:.62rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px}
.cf-filter-card .input-row{display:flex;gap:8px;align-items:center;margin-bottom:4px}
.cf-filter-card .filter-input{flex:1;padding:6px 8px;border:1px solid rgba(255,255,255,0.1);border-radius:var(--radius-sm);font-size:.8rem;width:0;min-width:0;text-align:center;background:var(--surface-alt);color:var(--text);transition:var(--transition);font-variant-numeric:tabular-nums}
.cf-filter-card .filter-input:focus{border-color:var(--accent);outline:none;box-shadow:0 0 0 3px var(--accent-glow)}
.cf-filter-card .range-sep{color:var(--text-muted);font-size:.8rem;flex-shrink:0}
.cf-filter-card input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;background:rgba(255,255,255,0.1);outline:none;margin:8px 0;transition:var(--transition)}
.cf-filter-card input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;border-radius:50%;background:#f59e0b;border:2px solid var(--surface);cursor:pointer;box-shadow:0 0 8px rgba(245,158,11,0.4)}
.cf-filter-card input[type=range]::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#f59e0b;border:2px solid var(--surface);cursor:pointer}
.cf-sort-row{display:flex;gap:8px;margin-top:4px}
.cf-sort-row select{flex:1;padding:6px 8px;border:1px solid rgba(255,255,255,0.1);border-radius:var(--radius-sm);font-size:.75rem;background:var(--surface-alt);color:var(--text)}

/* ── 信号标签徽章 ── */
.cf-tag{display:inline-block;font-size:.58rem;font-weight:600;padding:2px 6px;border-radius:4px;margin:1px 2px;white-space:nowrap}
.cf-tag-squeeze{background:rgba(239,68,68,0.18);color:#fca5a5;border:1px solid rgba(239,68,68,0.3)}
.cf-tag-small_cap{background:rgba(59,130,246,0.14);color:#93c5fd;border:1px solid rgba(59,130,246,0.3)}
.cf-tag-early_pump{background:rgba(16,185,129,0.16);color:#34d399;border:1px solid rgba(16,185,129,0.3)}
.cf-tag-thin_book{background:rgba(245,158,11,0.16);color:#fbbf24;border:1px solid rgba(245,158,11,0.3)}
.cf-tag-distribution{background:rgba(239,68,68,0.24);color:#f87171;border:1px solid rgba(239,68,68,0.4)}
.cf-tag-kill_longs{background:rgba(249,115,22,0.16);color:#fdba74;border:1px solid rgba(249,115,22,0.3)}
.cf-tag-mentioned{background:rgba(139,92,246,0.16);color:#c4b5fd;border:1px solid rgba(139,92,246,0.3)}
.cf-tag-new_listing{background:rgba(6,182,212,0.14);color:#67e8f9;border:1px solid rgba(6,182,212,0.3)}
.cf-tag-funding_anomaly{background:rgba(245,158,11,0.16);color:#fbbf24;border:1px solid rgba(245,158,11,0.3)}

/* ── OI 阶段徽章 ── */
.cf-stage{display:inline-block;font-size:.58rem;font-weight:600;padding:2px 6px;border-radius:4px;white-space:nowrap}
.cf-stage-accumulation{background:rgba(100,116,139,0.16);color:#94a3b8;border:1px solid rgba(100,116,139,0.3)}
.cf-stage-early_pump{background:rgba(59,130,246,0.14);color:#93c5fd;border:1px solid rgba(59,130,246,0.3)}
.cf-stage-pump{background:rgba(16,185,129,0.16);color:#34d399;border:1px solid rgba(16,185,129,0.3)}
.cf-stage-mid{background:rgba(245,158,11,0.16);color:#fbbf24;border:1px solid rgba(245,158,11,0.3)}
.cf-stage-late_distribution{background:rgba(239,68,68,0.22);color:#f87171;border:1px solid rgba(239,68,68,0.4)}

/* ── 资费率着色 ── */
.cf-fund{font-variant-numeric:tabular-nums}
.cf-fund-pos{color:#34d399}
.cf-fund-neg{color:#f87171}

/* 挤压行高亮（同妖币 squeeze-row） */
tr.cf-squeeze-row td{color:#fca5a5!important}
tr.cf-squeeze-row td:first-child{position:relative}
tr.cf-squeeze-row td:first-child::before{content:'';position:absolute;left:0;top:4px;bottom:4px;width:3px;background:linear-gradient(180deg,#ef4444,#b91c1c);border-radius:2px}

/* ── 信号计数统计条 ── */
.cf-stats{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px}
.cf-stat-chip{display:inline-flex;align-items:center;gap:4px;font-size:.66rem;font-weight:600;padding:3px 10px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:var(--text-secondary)}
.cf-stat-chip b{color:var(--text);font-variant-numeric:tabular-nums;font-weight:700}
.cf-chip-squeeze{background:rgba(239,68,68,0.12);color:#fca5a5;border-color:rgba(239,68,68,0.35)}
.cf-chip-small_cap{background:rgba(59,130,246,0.12);color:#93c5fd;border-color:rgba(59,130,246,0.35)}
.cf-chip-early_pump{background:rgba(16,185,129,0.12);color:#34d399;border-color:rgba(16,185,129,0.35)}
.cf-chip-thin_book{background:rgba(245,158,11,0.12);color:#fbbf24;border-color:rgba(245,158,11,0.35)}
.cf-chip-distribution{background:rgba(239,68,68,0.16);color:#f87171;border-color:rgba(239,68,68,0.4)}
.cf-chip-kill_longs{background:rgba(249,115,22,0.12);color:#fdba74;border-color:rgba(249,115,22,0.35)}
.cf-chip-mentioned{background:rgba(139,92,246,0.12);color:#c4b5fd;border-color:rgba(139,92,246,0.35)}
.cf-chip-new_listing{background:rgba(6,182,212,0.12);color:#67e8f9;border-color:rgba(6,182,212,0.35)}
.cf-chip-funding_anomaly{background:rgba(245,158,11,0.12);color:#fbbf24;border-color:rgba(245,158,11,0.35)}
.cf-chip-squeeze b,.cf-chip-distribution b{color:#fca5a5}
.cf-chip-small_cap b,.cf-chip-new_listing b{color:#93c5fd}
.cf-chip-early_pump b{color:#34d399}
.cf-chip-thin_book b,.cf-chip-funding_anomaly b{color:#fbbf24}
.cf-chip-kill_longs b{color:#fdba74}
.cf-chip-mentioned b{color:#c4b5fd}

/* ── 可展开表格 ── */
tr.cf-row-click{cursor:pointer}
tr.cf-row-click:hover td{background:rgba(255,255,255,0.035)}
.cf-expand-arrow{color:var(--text-muted);font-size:.7rem;width:20px;text-align:center;user-select:none}
.cf-detail-row td{background:rgba(255,255,255,0.02)!important;padding:12px 16px!important;border-top:none!important;cursor:default}
.cf-detail-inner{max-width:100%}

/* ── 5步检查清单 ── */
.cf-checklist{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-sm);padding:10px 12px}
.cf-checklist-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:8px}
.cf-checklist-head span:first-child{font-size:.75rem;font-weight:600;color:var(--text)}
.cf-checklist-hint{font-size:.58rem;color:var(--text-muted)}
.cf-checklist-steps{display:flex;gap:6px;flex-wrap:wrap}
.cf-check-step{flex:1;min-width:140px;display:flex;align-items:center;gap:6px;padding:7px 9px;border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-sm);background:var(--surface);cursor:pointer;transition:var(--transition)}
.cf-check-step:hover{border-color:var(--border-active)}
.cf-check-mark{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;flex-shrink:0;font-variant-numeric:tabular-nums}
.cf-check-blank{background:rgba(255,255,255,0.06);color:var(--text-muted);border:1px dashed rgba(255,255,255,0.22)}
.cf-check-ok{background:rgba(16,185,129,0.2);color:#34d399;border:1px solid rgba(16,185,129,0.4)}
.cf-check-no{background:rgba(239,68,68,0.2);color:#f87171;border:1px solid rgba(239,68,68,0.4)}
.cf-check-name{font-size:.68rem;font-weight:600;color:var(--text);white-space:nowrap}
.cf-check-desc{font-size:.58rem;color:var(--text-muted);line-height:1.4}

/* ── 展开详情元信息 ── */
.cf-detail-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.cf-meta-item{display:flex;gap:6px;align-items:center;font-size:.66rem;color:var(--text-secondary);background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);padding:4px 10px;border-radius:6px;font-variant-numeric:tabular-nums}
.cf-meta-label{color:var(--text-muted)}

/* ── 图表 ── */
.cf-chart-wrap{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;margin-bottom:12px}
.cf-chart-wrap h4{font-size:.8rem;font-weight:600;color:var(--text);margin-bottom:10px}
.cf-hbar-row{display:flex;align-items:center;gap:8px;margin:3px 0;font-size:.66rem}
.cf-hbar-label{width:52px;text-align:right;color:var(--text-secondary);flex-shrink:0;font-variant-numeric:tabular-nums}
.cf-hbar-track{flex:1;height:12px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden}
.cf-hbar-fill{height:100%;background:linear-gradient(90deg,#f59e0b,#10b981);border-radius:3px;min-width:2px}
.cf-hbar-val{width:56px;color:var(--text-muted);flex-shrink:0;font-variant-numeric:tabular-nums}
.cf-hist-wrap{display:flex;align-items:flex-end;gap:4px;height:110px;padding-top:4px}
.cf-hist-bar{flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%}
.cf-hist-fill{background:linear-gradient(180deg,#3b82f6,#1d4ed8);border-radius:3px 3px 0 0;min-height:2px;transition:height .3s}
.cf-hist-fill.neg{background:linear-gradient(180deg,#ef4444,#b91c1c)}
.cf-hist-fill.pos{background:linear-gradient(180deg,#10b981,#059669)}
.cf-hist-label{font-size:.55rem;color:var(--text-muted);text-align:center;margin-top:4px;white-space:nowrap}
.cf-scatter-wrap{position:relative;height:300px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:var(--radius-sm);overflow:visible;margin-bottom:22px}
.cf-scatter-plot{position:absolute;top:24px;right:36px;bottom:28px;left:44px;overflow:hidden;border-radius:4px}
.cf-scatter-dot{position:absolute;border-radius:50%;opacity:.85;cursor:pointer;transition:transform .15s,box-shadow .15s;transform:translate(-50%,-50%);z-index:2}
.cf-scatter-dot:hover{transform:translate(-50%,-50%) scale(1.6);opacity:1;z-index:6;box-shadow:0 0 10px rgba(255,255,255,0.25)}
.cf-scatter-grid{position:absolute;pointer-events:none;background:rgba(255,255,255,0.05);z-index:0}
.cf-scatter-grid-v{top:0;bottom:0;width:1px}
.cf-scatter-grid-h{left:0;right:0;height:1px}
.cf-scatter-tick{position:absolute;font-size:.55rem;color:var(--text-muted);pointer-events:none;font-variant-numeric:tabular-nums;z-index:1;white-space:nowrap}
.cf-scatter-tick-x{bottom:-16px;transform:translateX(-50%)}
.cf-scatter-tick-y{left:-4px;transform:translateX(-100%) translateY(50%);text-align:right}
.cf-scatter-axis{position:absolute;font-size:.58rem;color:var(--text-secondary);z-index:3;background:var(--surface);padding:0 4px;white-space:nowrap}
.cf-scatter-x{left:44px;bottom:2px}
.cf-scatter-y{top:2px;right:8px}
.cf-scatter-tip{position:absolute;left:50%;transform:translateX(-50%);background:#111827;border:1px solid rgba(255,255,255,0.2);color:#e5e7eb;font-size:.62rem;padding:6px 10px;border-radius:8px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .15s;z-index:30;box-shadow:0 4px 16px rgba(0,0,0,0.5);line-height:1.5}
.cf-scatter-tip.above{bottom:calc(100% + 6px)}
.cf-scatter-tip.below{top:calc(100% + 6px)}
.cf-scatter-dot:hover .cf-scatter-tip{opacity:1}
.cf-scatter-legend{position:absolute;left:48px;bottom:6px;display:flex;gap:8px;z-index:3;font-size:.55rem;color:var(--text-muted);background:rgba(15,23,42,0.85);padding:3px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.08)}
.cf-scatter-legend-item{display:flex;align-items:center;gap:3px}
.cf-scatter-legend-item i{width:8px;height:8px;border-radius:50%;display:inline-block}
.cf-note{font-size:.62rem;color:var(--text-muted);margin-top:8px;line-height:1.6}

/* ── 移动端适配 ── */
@media(max-width:768px){
  .cf-scatter-wrap{height:240px}
  .cf-scatter-plot{left:30px;right:20px}
  .cf-scatter-tick-y{font-size:.48rem}
  .cf-scatter-tick-x{font-size:.48rem}
  .cf-scatter-legend{font-size:.48rem;gap:4px}
}

/* ── Coinalyze 补充列样式：多空比 / 清算 / OI趋势 / 预测资费 ── */
.cf-lsr{font-variant-numeric:tabular-nums;white-space:nowrap}
.cf-lsr-high{color:#f87171;font-weight:700}   /* 多空比>2 = 多头拥挤 */
.cf-lsr-low{color:#34d399;font-weight:700}    /* 多空比<0.5 = 空头拥挤(挤压燃料) */
.cf-liq{color:#fbbf24;font-variant-numeric:tabular-nums}
.cf-oit{font-variant-numeric:tabular-nums;white-space:nowrap}
.cf-oit-up{color:#34d399}
.cf-oit-down{color:#f87171}
.cf-detail-meta{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08)}


/* 🧭 前导筛选 视图样式 */
.fwd-wrap{display:flex;flex-direction:column;gap:12px}
.fwd-env{padding:12px 14px;border-radius:var(--radius);font-size:13px;line-height:1.6}
.fwd-env-bull{background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.45);color:#34d399}
.fwd-env-bear{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.45);color:#f87171}
.fwd-env-na{background:rgba(148,163,184,.1);border:1px solid rgba(148,163,184,.4);color:#94a3b8}
.fwd-hint{padding:8px 14px;border-radius:var(--radius);font-size:12px;line-height:1.5;opacity:.9}
.fwd-hint-bull{background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.3);color:#34d399}
.fwd-hint-bear{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);color:#f87171}
.fwd-hint-na{background:rgba(148,163,184,.08);border:1px solid rgba(148,163,184,.3);color:#94a3b8}
.fwd-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.fwd-stats{font-size:12px;color:var(--text-dim,#94a3b8)}
.fwd-tbl th{font-size:11px;padding:6px 8px;white-space:nowrap}
.fwd-tbl td{font-size:12px;padding:6px 8px;white-space:nowrap}
.fwd-acc td{background:rgba(16,185,129,.06)}
.fwd-avoid td{background:rgba(239,68,68,.08)}
.fwd-avoid .score{color:#f87171;font-weight:700}
.tag-low{background:rgba(16,185,129,.18);color:#34d399}
.tag-new{background:rgba(59,130,246,.18);color:#60a5fa}
.tag-watch{background:rgba(245,158,11,.18);color:#fbbf24}
.tag-fund{background:rgba(16,185,129,.18);color:#34d399}
.tag-danger{background:rgba(239,68,68,.25);color:#f87171}
.tag-noise{opacity:.35}
.fwd-foot{font-size:11px;padding-top:8px;border-top:1px solid var(--border,#ffffff22)}
.score{font-weight:700}
/* ═══════════ UI 增强层（纯视觉，不动逻辑）═══════════ */
body{scrollbar-width:thin;scrollbar-color:rgba(148,163,184,.3) transparent}
::-webkit-scrollbar{width:8px;height:8px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(148,163,184,.25);border-radius:4px}
::-webkit-scrollbar-thumb:hover{background:rgba(148,163,184,.45)}
#tabbar{position:sticky;top:0;z-index:100;background:linear-gradient(180deg,rgba(11,17,32,.97),rgba(11,17,32,.85));backdrop-filter:blur(12px);padding:10px 0 12px;border-bottom:1px solid rgba(255,255,255,.05)}
#tabbar .tab-btn{transition:transform .2s cubic-bezier(.4,0,.2,1),box-shadow .2s,border-color .2s,background .2s}
#tabbar .tab-btn:hover{transform:translateY(-2px);box-shadow:0 4px 14px rgba(59,130,246,.25)}
#tabbar .tab-btn.active{transform:translateY(-1px)}
.tab-btn{transition:transform .2s cubic-bezier(.4,0,.2,1),box-shadow .2s,border-color .2s,background .2s}
.tab-btn:hover{transform:translateY(-2px);box-shadow:0 4px 14px rgba(59,130,246,.2)}
.tab-btn.active{box-shadow:0 0 20px rgba(59,130,246,.3)}
table{animation:fadeIn .3s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
tr{transition:background .15s}
tbody tr:hover td{background:rgba(59,130,246,.06)!important}
th{background:#141a26;user-select:none}
th.sortable:hover{color:#60a5fa}
.btn{transition:transform .15s,box-shadow .2s,border-color .2s,background .2s}
.btn:hover{transform:translateY(-1px);box-shadow:0 3px 10px rgba(59,130,246,.25)}
.btn:active{transform:translateY(0) scale(.97)}
.btn-sm{transition:transform .15s,background .15s}
.btn-sm:hover{transform:scale(1.05)}
.fwd-env,.fwd-hint{transition:opacity .3s}
.status-bar{animation:fadeIn .3s ease}
.app-header{animation:fadeIn .4s ease}
.kpi-card{transition:transform .2s,box-shadow .2s,border-color .2s}
.kpi-card:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.35)}
.filter-card{transition:border-color .2s,box-shadow .2s}
.filter-card:hover{border-color:rgba(59,130,246,.35);box-shadow:0 2px 12px rgba(59,130,246,.08)}
.preset-btn{transition:transform .2s,filter .2s,box-shadow .2s}
.preset-btn:hover{transform:translateY(-2px) scale(1.02);filter:brightness(1.15)}
.tag,.sig-badge,.cf-stat-chip{transition:transform .15s}
.tag:hover,.sig-badge:hover,.cf-stat-chip:hover{transform:scale(1.08)}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
</head><body>
<div id="tabbar"><button class="tab-btn tab-chip active" onclick="switchTab('chip')">🧲 筹码筛选</button><button class="tab-btn tab-demon" onclick="switchTab('demon')">👺 妖币扫描</button><button class="tab-btn tab-coinfilter" onclick="switchTab('coinfilter')">🪙 小币筛选</button><button class="tab-btn tab-forward" onclick="switchTab('forward')">🧭 前导筛选</button><button class="tab-btn tab-watchlist" onclick="switchTab('watchlist')">🧭 筛币工作台</button><button class="tab-btn tab-overlap" onclick="switchTab('overlap')">🎯 涨幅榜重合</button></div>
<div id="root"><div class="loading-root"><div class="spinner"></div><div class="loading-text">正在加载数据...</div></div></div>
<script>
var BASE = (window.location.pathname || "/").replace(/\\/+$/, "");
var fd = [], fl = [], sc = "star_rating", sa = false, pa = "";
var lu = "", mcMin = null, mcMax = null, crMin = null, crMax = null, mA = null, mR = null;
var hasMC = false, hasCR = false, hasP7 = false, hasBybit = false;
function lX(){var x=new XMLHttpRequest();x.open("GET",BASE+"/api/data",true);
x.onload=function(){try{var d=JSON.parse(x.responseText);if(d.error&&!d.data)throw Error(d.error);
fd=d.data||[];lu=d.updated||"";fl=[].concat(fd);detectFlags();rD();}catch(e){sE(e.message);}};
x.onerror=function(){sE("网络请求失败");};x.timeout=15000;x.send();}
function sE(m){document.getElementById("root").innerHTML="<div class=\\"empty-msg\\">加载失败: "+m+"<br><br><button class=\\"btn\\" onclick=\\"load()\\">重试</button></div>";}
function detectFlags(){hasMC=false;hasCR=false;hasP7=false;hasBybit=false;
var n=Math.min(fd.length,100);for(var i=0;i<n;i++){var r=fd[i];if(r.market_cap!=null)hasMC=true;
if(r.circulating_ratio!=null)hasCR=true;if(r.percent_change_7d!=null)hasP7=true;
if(r.price!=null||r.volume_24h_usdt!=null)hasBybit=true;if(hasMC&&hasCR&&hasP7&&hasBybit)break;}}
function gV(v,d){return v!=null?v:d;}
async function load(){try{var re=await fetch(BASE+"/api/data");var d=await re.json();
if(d.error&&!d.data)throw Error(d.error);fd=d.data||[];lu=d.updated||"";fl=[].concat(fd);detectFlags();rD();
}catch(e){console.warn(e);lX();}}
function setP(p){pa=p;if(p==="A"){mcMin=hasMC?15:null;mcMax=hasMC?100:null;crMin=0;crMax=30;mA=0;mR=null;}
else if(p==="B"){mcMin=hasMC?15:null;mcMax=hasMC?50:null;crMin=98;crMax=100;mA=0;mR=null;}sS();aF();}
function sS(){
var mcP=document.getElementById("mcap-panel"),crP=document.getElementById("cr-panel");if(mcP)mcP.style.display=hasMC?"block":"none";if(crP)crP.style.display=hasCR?"block":"none";
var mAmp=document.getElementById("amp-panel");if(mAmp)mAmp.style.display=hasBybit?"block":"none";var r7p=document.getElementById("r7-panel");if(r7p)r7p.style.display=hasP7?"block":"none";
var pA=document.getElementById("preset-a"),pB=document.getElementById("preset-b");if(pA)pA.style.display=hasMC?"":"none";if(pB)pB.style.display=(hasMC&&hasCR)?"":"none";
function g(i){return document.getElementById(i);}
if(hasMC&&g("mcap-min")){g("mcap-min").value=gV(mcMin,15);g("mcap-max").value=gV(mcMax,500000);if(g("mcap-min-i"))g("mcap-min-i").value=gV(mcMin,15);if(g("mcap-max-i"))g("mcap-max-i").value=gV(mcMax,500000);}
if(hasCR&&g("cr-min")){g("cr-min").value=gV(crMin,0);g("cr-max").value=gV(crMax,100);if(g("cr-min-i"))g("cr-min-i").value=gV(crMin,0);if(g("cr-max-i"))g("cr-max-i").value=gV(crMax,100);}
if(g("amp"))g("amp").value=gV(mA,0);if(g("r7"))g("r7").value=gV(mR,-100);if(g("amp-i"))g("amp-i").value=gV(mA,0);if(g("r7-i"))g("r7-i").value=gV(mR,-100);}
function aF(){var c1=gV(crMin,0)/100,c2=gV(crMax,100)/100;var mn=hasMC&&mcMin!=null?mcMin*1e6:0,mx=hasMC&&mcMax!=null?mcMax*1e6:5e14;var am=gV(mA,0),r7=gV(mR,-100);
fl=fd.filter(function(r){if(hasMC&&mcMin!=null&&(r.market_cap==null||r.market_cap<mn||r.market_cap>mx))return false;
if(hasCR&&crMin!=null){var cr=r.circulating_ratio!=null?r.circulating_ratio:1;if(cr<c1||cr>c2)return false;}
if(mA!=null&&(r.amplitude_24h_pct||0)<am)return false;if(mR!=null&&(r.percent_change_7d||-999)<r7)return false;return true;});
if(pa==="A"){fl.sort(function(a,b){return (a.circulating_ratio||1)-(b.circulating_ratio||1);});
}else if(pa==="B"){fl.sort(function(a,b){return (b.percent_change_7d||-999)-(a.percent_change_7d||-999);});
}else{fl.sort(function(a,b){var av=a[sc]||0,bv=b[sc]||0;return sa?av>bv?1:-1:av<bv?1:-1;});}rD();}
function ap(){function g(i){return document.getElementById(i);}
if(hasMC&&g("mcap-min")){mcMin=+g("mcap-min").value;mcMax=+g("mcap-max").value;if(g("mcap-min-i"))g("mcap-min-i").value=Math.round(mcMin);if(g("mcap-max-i"))g("mcap-max-i").value=Math.round(mcMax);}
if(hasCR&&g("cr-min")){crMin=+g("cr-min").value;crMax=+g("cr-max").value;if(g("cr-min-i"))g("cr-min-i").value=crMin;if(g("cr-max-i"))g("cr-max-i").value=crMax;}
mA=+g("amp").value;mR=+g("r7").value;if(g("amp-i"))g("amp-i").value=mA;if(g("r7-i"))g("r7-i").value=mR;aF();}
function oIC(g){function h(i){return document.getElementById(i);}
if(g==="mcap"&&hasMC){var mn=+h("mcap-min-i").value||15,mx=+h("mcap-max-i").value||5e5;if(mn>mx){var t=mn;mn=mx;mx=t;}if(mn<1)mn=1;mcMin=mn;mcMax=mx;if(h("mcap-min"))h("mcap-min").value=mn;if(h("mcap-max"))h("mcap-max").value=mx;
}else if(g==="cr"&&hasCR){var mn=+h("cr-min-i").value||0,mx=+h("cr-max-i").value||100;if(mn>mx){var t=mn;mn=mx;mx=t;}if(mn<0)mn=0;if(mx>100)mx=100;crMin=mn;crMax=mx;if(h("cr-min"))h("cr-min").value=mn;if(h("cr-max"))h("cr-max").value=mx;
}else if(g==="amp"){mA=Math.min(Math.max(+h("amp-i").value||0,0),100);if(h("amp"))h("amp").value=mA;}
else if(g==="r7"){mR=Math.max(+h("r7-i").value||-100,-100);if(mR>500)mR=500;if(h("r7"))h("r7").value=mR;}
sS();aF();}
function srt(c){if(sc===c)sa=!sa;else{sc=c;sa=false;}pa="";aF();}
function rD(){
var el=document.getElementById("root");
var p7=fl.filter(function(r){return (r.percent_change_7d||-999)>0;}).length;
var pp=fl.length>0&&hasP7?(p7/fl.length*100).toFixed(1):"--";
var as=fl.length>0&&hasMC?(fl.reduce(function(s,r){return s+(r.star_rating||0);},0)/fl.length).toFixed(2):"--";
var an=fl.filter(function(r){return r.momentum_alert;}).length;
var us=lu?new Date(lu).toLocaleString("zh-CN"):"--";
var rows="";
for(var i=0;i<fl.length;i++){var r=fl[i];
var cls=r.momentum_alert?"class=\\"momentum\\"":r.star_rating>=5?"class=\\"star5\\"":r.data_conflict?"class=\\"conflict\\"":"";
rows+="<tr "+cls+"><td><b>"+e(r.symbol)+"</b></td><td>"+e(r.name||"")+"</td>";
if(hasBybit)rows+="<td>"+fP(r.price)+"</td>";
rows+="<td>"+fL(r.market_cap)+"</td><td>"+(r.data_conflict&&r.cg_ratio!=null?"<span class='dual-ratio'>"+fR(r.circulating_ratio)+" <span class='cr-cg'>CG:"+fR(r.cg_ratio)+"</span></span>":fR(r.circulating_ratio))+"</td><td>"+fC(r.percent_change_7d)+"</td>";
if(hasBybit){rows+="<td class=\\"col-24h\\">"+fC(r.change_24h_pct)+"</td><td class=\\"col-24h\\">"+fC(r.amplitude_24h_pct)+"</td><td class=\\"col-24h\\">"+fL(r.volume_24h_usdt)+"</td>";}
rows+="<td>"+(r.data_conflict?"<span class=\\"star-conflict\\">":"")+fS(r.star_rating)+(r.data_conflict?"</span>":"")+"</td><td>"+e(r.unlock_risk)+"</td><td>"+(r.data_conflict?"<span class=\\"conflict-badge\\" title=\\"CMC流通率"+fR(r.circulating_ratio)+", CoinGecko流通率"+fR(r.cg_ratio)+", 偏差"+(r.discrepancy_pct||0)+"%\\">⚠️ "+r.discrepancy_pct+"%</span>":"")+(r.stale_cg_data?"<span class=\\"stale-badge\\" title=\\"CoinGecko\\u6570\\u636e\\u53ef\\u80fd\\u8fc7\\u65f6(\\u6d41\\u901a\\u7387"+fR(r.cg_ratio)+"\\u660e\\u663e\\u4f4e\\u4e8eCMC"+fR(r.circulating_ratio)+")\\">CG\\u8fc7\\u65f6</span>":"")+"</td></tr>";}
var H="<div class=\\"app-header\\"><h1>筹码真空 · 代币筛选器</h1>";
if(hasMC&&!hasBybit)H+="<p style=\\"color:#60a5fa\\">数据来源: CoinMarketCap 市值/流通/素材 · Bybit 实时价格未连接，24h 数据为 N/A</p>";
else if(hasBybit)H+="<p>小资金百倍潜力挖掘 &mdash; 数据源: Bybit + CoinMarketCap</p>";
else H+="<p>小资金百倍潜力挖掘</p>";
H+="</div>";
if(hasMC&&!hasBybit)H+="<div class=\\"info-banner\\">⚠️ Bybit API 未连通，价格、24h涨跌、振幅、交易量数据不可用。已显示 CoinMarketCap 市值、流通率、7日涨跌及星级评分。尽快连接 Bybit 后可获取完整数据。</div>";
else if(!hasMC&&hasBybit)H+="<div class=\\"info-banner warn\\">⚠️ CMC/CoinGecko API 未连接，仅显示 Bybit 交易数据，无市值、流通率评分</div>";
var sbCls=hasMC?"ok":"warn";
H+="<div class=\\"status-bar "+sbCls+"\\"><span>全部可交易 "+fd.length+" · 筛选命中 "+fl.length+"</span><span>更新 "+us+"</span></div>";
H+="<div class=\\"layout\\"><div class=\\"sidebar\\"><div class=\\"preset-row\\">";
H+="<button id=\\"preset-a\\" class=\\"preset-btn preset-a\\" onclick=\\"setP('A')\\" style=\\"display:none\\">窒息流 A</button>";
H+="<button id=\\"preset-b\\" class=\\"preset-btn preset-b\\" onclick=\\"setP('B')\\" style=\\"display:none\\">全流通 B</button></div>";
H+="<button class=\\"btn\\" style=\\"width:100%;margin-bottom:6px;background:linear-gradient(135deg,#475569,#334155)\\" onclick=\\"cP()\\">清除筛选</button>";
H+="<div id=\\"mcap-panel\\" class=\\"filter-card\\"><div class=\\"label\\">市值 (百万$)</div><div class=\\"input-row\\"><input type=\\"number\\" id=\\"mcap-min-i\\" class=\\"filter-input\\" value=\\"15\\" min=\\"1\\" max=\\"500000\\" onchange=\\"oIC('mcap')\\" step=\\"1\\"><span class=\\"range-sep\\">~</span><input type=\\"number\\" id=\\"mcap-max-i\\" class=\\"filter-input\\" value=\\"500000\\" min=\\"1\\" onchange=\\"oIC('mcap')\\" step=\\"1\\"></div><input type=\\"range\\" id=\\"mcap-min\\" min=\\"1\\" max=\\"5000\\" value=\\"15\\" oninput=\\"ap()\\"><input type=\\"range\\" id=\\"mcap-max\\" min=\\"1\\" max=\\"500000\\" value=\\"500000\\" oninput=\\"ap()\\"></div>";
H+="<div id=\\"cr-panel\\" class=\\"filter-card\\"><div class=\\"label\\">流通率 (%)</div><div class=\\"input-row\\"><input type=\\"number\\" id=\\"cr-min-i\\" class=\\"filter-input\\" value=\\"0\\" min=\\"0\\" max=\\"100\\" onchange=\\"oIC('cr')\\" step=\\"1\\"><span class=\\"range-sep\\">~</span><input type=\\"number\\" id=\\"cr-max-i\\" class=\\"filter-input\\" value=\\"100\\" min=\\"0\\" max=\\"100\\" onchange=\\"oIC('cr')\\" step=\\"1\\"></div><input type=\\"range\\" id=\\"cr-min\\" min=\\"0\\" max=\\"100\\" value=\\"0\\" oninput=\\"ap()\\"><input type=\\"range\\" id=\\"cr-max\\" min=\\"0\\" max=\\"100\\" value=\\"100\\" oninput=\\"ap()\\"></div>";
H+="<div id=\\"amp-panel\\" class=\\"filter-card\\"><div class=\\"label\\">振幅</div><div style=\\"font-size:.75rem;color:var(--text-muted)\\">最低 24h 振幅 (%)</div><div class=\\"input-row\\" style=\\"margin-bottom:2px\\"><input type=\\"number\\" id=\\"amp-i\\" class=\\"filter-input\\" value=\\"0\\" min=\\"0\\" max=\\"100\\" onchange=\\"oIC('amp')\\" step=\\"1\\"></div><input type=\\"range\\" id=\\"amp\\" min=\\"0\\" max=\\"100\\" value=\\"0\\" oninput=\\"ap()\\"></div>";
H+="<div id=\\"r7-panel\\" class=\\"filter-card\\"><div class=\\"label\\">7日涨跌</div><div style=\\"font-size:.75rem;color:var(--text-muted)\\">最低 7日涨跌 (%)</div><div class=\\"input-row\\" style=\\"margin-bottom:2px\\"><input type=\\"number\\" id=\\"r7-i\\" class=\\"filter-input\\" value=\\"-100\\" min=\\"-100\\" max=\\"500\\" onchange=\\"oIC('r7')\\" step=\\"1\\"></div><input type=\\"range\\" id=\\"r7\\" min=\\"-100\\" max=\\"500\\" value=\\"-100\\" oninput=\\"ap()\\"></div>";
H+="<button class=\\"refresh-btn\\" onclick=\\"rf()\\">刷新数据</button><div style=\\"font-size:.6rem;color:var(--text-muted);text-align:center;margin-top:8px;letter-spacing:.2px\\">数据每5分钟自动更新</div></div>";
H+="<div class=\\"main\\"><div class=\\"kpi-row\\">";
H+="<div class=\\"kpi-card\\"><div class=\\"kpi-label\\">全部</div><div class=\\"kpi-value\\">"+fd.length+"</div></div>";
H+="<div class=\\"kpi-card\\"><div class=\\"kpi-label\\">命中</div><div class=\\"kpi-value\\">"+fl.length+"</div></div>";
H+="<div class=\\"kpi-card\\"><div class=\\"kpi-label\\">7日正收益</div><div class=\\"kpi-value\\">"+pp+"</div></div>";
H+="<div class=\\"kpi-card\\"><div class=\\"kpi-label\\">平均潜力</div><div class=\\"kpi-value\\">"+as+"</div></div>";
if(hasBybit)H+="<div class=\\"kpi-card\\"><div class=\\"kpi-label\\">主力信号</div><div class=\\"kpi-value\\">"+an+"</div></div>";
H+="</div>";
H+="<div class=\\"table-wrap\\"><div class=\\"table-title\\">筛选结果 <span style=\\"font-weight:400;font-size:.7rem;color:var(--text-muted);margin-left:8px\\">点击表头排序</span></div><div class=\\"table-scroll\\"><table><thead><tr>";
H+="<th onclick=\\"srt('symbol')\\">交易对</th><th onclick=\\"srt('name')\\">名称</th>";
if(hasBybit)H+="<th onclick=\\"srt('price')\\">价格</th>";
H+="<th onclick=\\"srt('market_cap')\\">流通市值</th><th onclick=\\"srt('circulating_ratio')\\">流通率</th><th onclick=\\"srt('percent_change_7d')\\">7日</th>";
if(hasBybit){H+="<th onclick=\\"srt('change_24h_pct')\\">24h</th><th onclick=\\"srt('amplitude_24h_pct')\\">振幅</th><th onclick=\\"srt('volume_24h_usdt')\\">交易量</th>";}
H+="<th onclick=\\"srt('star_rating')\\">潜力</th><th>解锁</th><th title=\\"CMC与CoinGecko流通率偏差超过30%标红\\">数据</th></tr></thead><tbody>";
var nCols=hasBybit?12:8;H+=rows||'<tr><td colspan="'+nCols+'" class="empty-msg">无匹配结果</td></tr>';
H+="</tbody></table></div></div>";
H+="<div class=\\"calc-card\\"><h3>资金分配器</h3><p style=\\"font-size:.75rem;color:var(--text-muted);margin-bottom:8px\\">按评分分配本金至最佳 N 个标的</p><div class=\\"calc-row\\"><input type=\\"number\\" id=\\"capital\\" value=\\"1000\\" min=\\"10\\" oninput=\\"cf()\\"><input type=\\"number\\" id=\\"npos\\" value=\\"5\\" min=\\"1\\" oninput=\\"cf()\\"></div><div id=\\"calc-result\\"></div></div>";
H+="</div></div><div class=\\"footer\\">⚠️ 仅供研究参考，不构成投资建议<br>最后更新 "+us+"</div>";
el.innerHTML=H;sS();cf();}
function cP(){pa="";mcMin=null;mcMax=null;crMin=null;crMax=null;mA=null;mR=null;sS();aF();}
async function rf(){try{await fetch(BASE+"/api/refresh",{method:"POST"});}catch(e){}load();}
function cf(){if(!hasBybit){var el=document.getElementById("calc-result");if(el)el.innerHTML="<div class=\\"calc-result\\" style=\\"color:var(--text-muted)\\">缺少价格数据，连接Bybit后可启用资金分配器</div>";return;}var el=document.getElementById("calc-result");if(!el)return;
var cap=+document.getElementById("capital").value||1000;var np=+document.getElementById("npos").value||5;
var top=fl.concat().sort(function(a,b){if(b.star_rating!==a.star_rating)return b.star_rating-a.star_rating;return (a.circulating_ratio||1)-(b.circulating_ratio||1);}).slice(0,np);
if(top.length===0){el.innerHTML="";return;}var al=cap/top.length;
var hh="<div class=\\"calc-result\\">均仓: $"+cap.toLocaleString()+" → "+top.length+" 个 → 每个 $"+al.toFixed(2)+"</div><table><thead><tr><th>标的</th><th>价格</th><th>分配</th><th>数量</th><th>潜力</th></tr></thead><tbody>";
for(var i=0;i<top.length;i++){var r=top[i];var q=r.price>0?al/r.price:0;
hh+="<tr><td>"+e(r.symbol)+"</td><td>"+fP(r.price)+"</td><td>$"+al.toFixed(2)+"</td><td>"+q.toFixed(6)+"</td><td>"+fS(r.star_rating)+"</td></tr>";}
hh+="</tbody></table>";el.innerHTML=hh;}
function e(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function fP(v){if(v==null)return "N/A";if(v<0.001)return "$"+v.toFixed(8);if(v<1)return "$"+v.toFixed(4);return "$"+v.toFixed(2);}
function fL(v){if(v==null)return "N/A";return "$"+Number(v).toLocaleString("en-US",{maximumFractionDigits:0});}
function fC(v){if(v==null)return "N/A";return (v>=0?"+":"")+Number(v).toFixed(2)+"%";}
function fR(v){if(v==null)return "N/A";return (v*100).toFixed(1)+"%";}
function fS(v){return ["☆","★☆☆☆☆","★★☆☆☆","★★★☆☆","★★★★☆","★★★★★"][Math.min(v||0,5)]||"☆";}
load();
</script><script>
// ═══════════════════════════════════════════════════════════
// 妖币扫描器 视图（基于 @derrrrrrrq 方法论：换手高 / 涨幅大 / OI低）
// 核心指标：额/OI比 = 24h成交额 / OI价值（挤压空间）
// ═══════════════════════════════════════════════════════════

// ── 他推文中提过的 25 个币 ──
var DEMON_MENTIONED = ['SIREN','RAVE','STO','LAB','TRADOOR','BSB','ESPORTS','BANK','IDOL','UB','BILL','RIVER','PTB','ACE','SAHARA','VELVET','ALLO','BLUAI','AGT','NOM','PIPPIN','WLFI','RESOLV','USR','INX'];
var MENTIONED_DEFAULT = DEMON_MENTIONED.slice();
// 从 API 动态加载他提过的币列表（新增合约自动包含）
fetch('/api/mentioned').then(function(r){return r.json()}).then(function(d){if(d.ok&&Array.isArray(d.mentioned)&&d.mentioned.length>0){DEMON_MENTIONED=d.mentioned;CF_MENTIONED=d.mentioned}}).catch(function(){});

// ── 状态 ──
var curTab = 'chip';
var demonData = [], demonUpdated = null, demonLoaded = false;
var dPreset = 'default', dQuery = '', dSort = 'ratio', dAsc = false;
var dVolMin = 0, dOiMax = 100000, dRatioMin = 0, dChgMin = -100, dChgMax = 100;

// ── 挂接：现有 rD() 在妖币 Tab 下改为渲染妖币视图 ──
var __chipRD = rD;
rD = function () {
  if (curTab === 'demon') { renderDemon(); return; }
  __chipRD();
};

function switchTab(t) {
  curTab = t;
  var tb = document.getElementById('tabbar');
  if (tb) {
    tb.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
    var btn = t === 'demon' ? tb.querySelector('.tab-demon') : tb.querySelector('.tab-chip');
    if (btn) btn.classList.add('active');
  }
  if (t === 'demon') {
    if (!demonLoaded) demonLoad(); else renderDemon();
  } else {
    __chipRD();
  }
}

// ═══════════════════════════════════════════════════════════
// 🧭 前导筛选器 视图（基于 2026-08-06 数据验证结论）
// 验证结论：
//   ① 额/OI>5 事件日追高 = 负 EV（三个月 4592 事件，fwd5 -1.7%）→ 只当回避信号
//   ② 蓄水信号（OI 30天分位低 + 60天回撤大）edge 是条件性的：
//      环境向上 +0.8%/胜率56%，环境向下 -5.3%/胜率31% → 环境开关是第一优先
// 数据: GET /api/forward（relay 推送：OI分位/回撤/波动压缩/BTC环境）
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// 🧭 前导筛选器 视图（基于 2026-08-06 数据验证结论）
// 验证结论：
//   ① 额/OI>5 事件日追高 = 负 EV（三个月 4592 事件，fwd5 -1.7%）→ 只当回避信号
//   ② 蓄水信号（OI 30天分位低 + 60天回撤大）edge 是条件性的：
//      环境向上 +0.8%/胜率56%，环境向下 -5.3%/胜率31% → 环境开关是第一优先
// 数据: GET /api/forward（relay 推送：吸筹结构因子/BTC环境）
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// 🧭 前导筛选器 视图（基于 2026-08-06 数据验证结论）
// 验证结论：
//   ① 额/OI>5 事件日追高 = 负 EV（三个月 4592 事件，fwd5 -1.7%）→ 只当回避信号
//   ② 蓄水信号（OI 30天分位低 + 60天回撤大）edge 是条件性的：
//      环境向上 +0.8%/胜率56%，环境向下 -5.3%/胜率31% → 环境开关是第一优先
// 数据: GET /api/forward（relay 推送：吸筹结构因子/BTC环境）
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// 🧭 前导筛选器 视图（基于 2026-08-06 数据验证结论）
// 验证结论：
//   ① 额/OI>5 事件日追高 = 负 EV（三个月 4592 事件，fwd5 -1.7%）→ 只当回避信号
//   ② 蓄水信号（OI 30天分位低 + 60天回撤大）edge 是条件性的：
//      环境向上 +0.8%/胜率56%，环境向下 -5.3%/胜率31% → 环境开关是第一优先
// 数据: GET /api/forward（relay 推送：吸筹结构因子/BTC环境）
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// 🧭 前导筛选器 视图（基于 2026-08-06 数据验证结论）
// 验证结论：
//   ① 额/OI>5 事件日追高 = 负 EV（三个月 4592 事件，fwd5 -1.7%）→ 只当回避信号
//   ② 蓄水信号（OI 30天分位低 + 60天回撤大）edge 是条件性的：
//      环境向上 +0.8%/胜率56%，环境向下 -5.3%/胜率31% → 环境开关是第一优先
// 数据: GET /api/forward（relay 推送：吸筹结构因子/BTC环境）
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// 🧭 前导筛选器 视图（基于 2026-08-06 数据验证结论）
// 验证结论：
//   ① 额/OI>5 事件日追高 = 负 EV（三个月 4592 事件，fwd5 -1.7%）→ 只当回避信号
//   ② 蓄水信号（OI 30天分位低 + 60天回撤大）edge 是条件性的：
//      环境向上 +0.8%/胜率56%，环境向下 -5.3%/胜率31% → 环境开关是第一优先
// 数据: GET /api/forward（relay 推送：吸筹结构因子/BTC环境）
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// 🧭 前导筛选器 视图（基于 2026-08-06 数据验证结论）
// 验证结论：
//   ① 额/OI>5 事件日追高 = 负 EV（三个月 4592 事件，fwd5 -1.7%）→ 只当回避信号
//   ② 蓄水信号（OI 30天分位低 + 60天回撤大）edge 是条件性的：
//      环境向上 +0.8%/胜率56%，环境向下 -5.3%/胜率31% → 环境开关是第一优先
// 数据: GET /api/forward（relay 推送：吸筹结构因子/BTC环境）
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// 🧭 前导筛选器 视图（基于 2026-08-06 数据验证结论）
// 验证结论：
//   ① 额/OI>5 事件日追高 = 负 EV（三个月 4592 事件，fwd5 -1.7%）→ 只当回避信号
//   ② 蓄水信号（OI 30天分位低 + 60天回撤大）edge 是条件性的：
//      环境向上 +0.8%/胜率56%，环境向下 -5.3%/胜率31% → 环境开关是第一优先
// 数据: GET /api/forward（relay 推送：吸筹结构因子/BTC环境）
// ═══════════════════════════════════════════════════════════

if (typeof curTab === 'undefined') var curTab = 'chip';
var forwardData = [], forwardUpdated = null, forwardEnv = null, forwardLoaded = false;
var fwdAutoTimer = null;

// ── 自动刷新：每 5 分钟重新拉取数据并重渲染（VPS cron 每 15 分钟更新数据）──
function fwdStartAutoRefresh() {
  if (fwdAutoTimer) return;
  fwdAutoTimer = setInterval(function () {
    if (curTab !== 'forward') return; // 不在前导 tab 时跳过
    fetch(BASE + '/api/forward').then(function (r) { return r.json(); }).then(function (d) {
      var coins = d.data || [];
      if (!coins.length) return;
      forwardData = coins;
      forwardUpdated = d.updated || forwardUpdated;
      if (curTab === 'forward') renderForward();
    }).catch(function () { /* 静默失败，下次再试 */ });
  }, 300000); // 5 分钟
}
var fSort = 'forward_score', fAsc = false, fTag = '', fMinScore = 0;
// OI 范围自定义（客户端过滤，默认不设限 = 全市场，逻辑不变）
var fwdOiMin = null, fwdOiMax = null;

// ── 挂接 Tab 切换（与 _coinfilter.js 同模式，链式调用）──
var __fwdSwitchTab = (typeof switchTab === 'function') ? switchTab : null;
switchTab = function (t) {
  if (t === 'forward') {
    curTab = t;
    var tb = document.getElementById('tabbar');
    if (tb) {
      tb.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
      var btn = tb.querySelector('.tab-forward');
      if (btn) btn.classList.add('active');
    }
    if (!forwardLoaded) forwardLoad(); else renderForward();
    return;
  }
  if (__fwdSwitchTab) { __fwdSwitchTab(t); return; }
  if (t === 'demon' && typeof renderDemon === 'function') { renderDemon(); return; }
  if (typeof rD === 'function') rD();
};

var __fwdRD = (typeof rD === 'function') ? rD : null;
rD = function () {
  if (curTab === 'forward') { renderForward(); return; }
  if (__fwdRD) __fwdRD();
};

// ── 数据加载 ──
function forwardLoad() {
  var root = document.getElementById('root');
  root.innerHTML = '<div class="empty-msg">🧭 正在加载前导筛选数据（吸筹结构/BTC环境）...</div>';
  fetch(BASE + '/api/forward').then(function (r) { return r.json(); }).then(function (d) {
    var coins = d.data || [];
    if (d.error && !coins.length) throw new Error(d.error);
    if (!coins.length) throw new Error('forward 暂无数据（relay 可能未配置 /api/relay-forward）');
    forwardData = coins;
    forwardUpdated = d.updated || null;
    forwardEnv = d.env || null;
    forwardLoaded = true;
    fwdStartAutoRefresh();
    fwdHistLoad();
    renderForward();
  }).catch(function (err) {
    root.innerHTML = '<div class="empty-msg">🧭 前导数据加载失败: ' + e(err.message) + '<br><br><button class="btn" onclick="forwardLoad()">重试</button></div>';
  });
}

function fwdReload() { forwardLoaded = false; forwardLoad(); }

// ── 📅 历史候选（/api/forward-history，北京日界）──
var fwdHistData = null, fwdHistLoaded = false, fwdHistOpen = false, fwdJumpSym = null;
function fwdHistLoad() {
  fetch(BASE + '/api/forward-history?days=14').then(function (r) { return r.json(); }).then(function (d) {
    if (d && d.ok && d.history) { fwdHistData = d.history; fwdHistLoaded = true; }
    renderForward();
  }).catch(function () { /* 静默失败，面板显示错误 */ fwdHistLoaded = false; renderForward(); });
}
function fwdHistToggle() { fwdHistOpen = !fwdHistOpen; renderForward(); }
function fwdHistPanel() {
  var H = '';
  H += '<div class="fwd-bar" style="flex-wrap:wrap;gap:6px;align-items:center;border-top:1px solid var(--border);margin-top:6px;padding-top:6px">';
  H += '<button class="btn" onclick="fwdHistToggle()">📅 历史候选' + (fwdHistOpen ? ' ▾' : ' ▸') + '</button>';
  H += '<span class="dim">每天筛选器筛出的蓄水候选（北京日界，可回测）</span>';
  H += '</div>';
  if (!fwdHistOpen) return H;
  if (!fwdHistLoaded) {
    H += '<div class="empty-msg">历史数据加载中' + (fwdHistData ? '' : '…（首次进入自动拉取）') + '</div>';
    return H;
  }
  if (!fwdHistData) { H += '<div class="empty-msg">历史数据不可用</div>'; return H; }
  var days = Object.keys(fwdHistData).sort().reverse();
  if (!days.length) { H += '<div class="empty-msg">暂无历史记录</div>'; return H; }
  H += '<div class="table-wrap"><table class="tbl fwd-tbl"><thead><tr>';
  H += '<th>日期(北京)</th><th>候选数</th><th>候选币（点击跳转当前筛选）</th><th>数据源</th></tr></thead><tbody>';
  days.forEach(function (d) {
    var h = fwdHistData[d];
    var cands = h.candidates || [];
    var chips = cands.map(function (c) {
      var sym = (c.symbol || '').replace('USDT', '');
      return '<span style="display:inline-block;padding:1px 6px;margin:1px 2px;background:var(--surface-alt,#152238);border:1px solid var(--border,#233);border-radius:4px;font-size:11px" onclick="fwdHistJump(\\'' + sym + '\\')">' + sym + ' <span class="dim">' + (c.forward_score != null ? c.forward_score : '') + '</span></span>';
    }).join('');
    var src = h.seed ? '<span class="dim">重建(seed)</span>' : '<span style="color:#4ade80">实时</span>';
    H += '<tr><td class="mono">' + d + '</td><td class="mono">' + h.count + '</td><td>' + (chips || '<span class="dim">—</span>') + '</td><td>' + src + '</td></tr>';
  });
  H += '</tbody></table></div>';
  return H;
}
function fwdHistJump(sym) {
  fwdHistOpen = false;
  fwdJumpSym = sym;
  renderForward();
}


// ── 筛选/排序 ──
function fwdFiltered() {
  var rows = forwardData.slice();
  if (fTag === 'acc') rows = rows.filter(function (r) { return r.signal === 'acc_candidate'; });
  else if (fTag === 'avoid') rows = rows.filter(function (r) { return r.volume_oi_ratio >= 5; });
  else if (fTag === 'watch') rows = rows.filter(function (r) { return r.signal === 'watch'; });
  if (fwdJumpSym) rows = rows.filter(function (r) { return (r.symbol || '').indexOf(fwdJumpSym) >= 0 || (r.base_asset || '').indexOf(fwdJumpSym) >= 0; });
  // OI 范围过滤（默认不设限 = 全市场）
  if (fwdOiMin != null) rows = rows.filter(function (r) { return (r.oi_value || 0) >= fwdOiMin; });
  if (fwdOiMax != null) rows = rows.filter(function (r) { return (r.oi_value || 0) <= fwdOiMax; });
  rows = rows.filter(function (r) { return (r.forward_score || 0) >= fMinScore; });
  rows.sort(function (a, b) {
    var va = a[fSort] || 0, vb = b[fSort] || 0;
    return fAsc ? va - vb : vb - va;
  });
  return rows;
}

// OI 范围控件（与筛币工作台同款）
function fwdSetOiRange() {
  var minEl = document.getElementById('fwd-oi-min');
  var maxEl = document.getElementById('fwd-oi-max');
  var minV = minEl ? parseFloat(minEl.value) : NaN;
  var maxV = maxEl ? parseFloat(maxEl.value) : NaN;
  fwdOiMin = !isNaN(minV) && minV > 0 ? minV * 1e6 : null;
  fwdOiMax = !isNaN(maxV) && maxV > 0 ? maxV * 1e6 : null;
  renderForward();
}
function fwdClearOiRange() {
  fwdOiMin = null; fwdOiMax = null;
  var minEl = document.getElementById('fwd-oi-min');
  var maxEl = document.getElementById('fwd-oi-max');
  if (minEl) minEl.value = '';
  if (maxEl) maxEl.value = '';
  renderForward();
}

function fwdSetPreset(tag) {
  fTag = tag;
  fMinScore = (tag === 'acc') ? 3 : 0;
  renderForward();
}

function fwdSortBy(k) {
  if (fSort === k) fAsc = !fAsc; else { fSort = k; fAsc = false; }
  renderForward();
}

function fwdTagHtml(r) {
  var tags = [];
  if (r.signal === 'acc_candidate') tags.push('<span class="tag tag-acc">🧭蓄水候选</span>');
  else if (r.signal === 'avoid_event') tags.push('<span class="tag tag-danger">⛔事件回避</span>');
  else if (r.signal === 'watch') tags.push('<span class="tag tag-watch">👁观察</span>');
  else tags.push('<span class="tag tag-noise">·</span>');
  if (r.drawdown_60d != null && r.drawdown_60d >= 0.40) tags.push('<span class="tag tag-low">深底</span>');
  if (r.range_20d != null && r.range_20d < 0.30) tags.push('<span class="tag tag-low">横盘</span>');
  if (r.vol_shrink_20d != null && r.vol_shrink_20d < 0.20) tags.push('<span class="tag tag-low">缩量</span>');
  if (r.breakout_consolidation) tags.push('<span class="tag tag-new">大阳线后盘整</span>');
  if (r.spring_test) tags.push('<span class="tag tag-new">Spring测试</span>');
  if (r.funding_rate_pct != null && r.funding_rate_pct > 0.05) tags.push('<span class="tag tag-fund">💰正费率</span>');
  if (r.funding_rate_pct != null && r.funding_rate_pct < -0.05 && r.change_24h_pct > 0) tags.push('<span class="tag tag-danger">⛔负费率拉盘</span>');
  if (r.ret_10d != null && r.ret_10d >= -0.05 && r.ret_10d <= 0.15) tags.push('<span class="tag tag-watch">缓涨</span>');
  if (r.vol_compress_5d != null && r.vol_compress_5d < 0.05) tags.push('<span class="tag tag-low">缩波</span>');
  if (r.days_since_listing != null && r.days_since_listing <= 180) tags.push('<span class="tag tag-new">新上</span>');
  return tags.join(' ');
}

// ── 观察池标记（localStorage）──
function fwdWatchKey() { return 'fwd_watchlist'; }
function fwdGetWatch() {
  try { return JSON.parse(localStorage.getItem(fwdWatchKey()) || '{}'); } catch (e) { return {}; }
}
function fwdToggleWatch(sym) {
  var w = fwdGetWatch();
  if (w[sym]) delete w[sym]; else w[sym] = Date.now();
  try { localStorage.setItem(fwdWatchKey(), JSON.stringify(w)); } catch (e) {}
  renderForward();
}

// ── BTC 方向提示（仅展示，不参与评分/筛选）──
function fwdEnvHint() {
  var env = forwardEnv;
  if (!env || env.up == null) {
    return '<div class="fwd-hint fwd-hint-na">BTC 方向：未知（仅供参考，不影响筛选）</div>';
  }
  if (env.up === true) {
    return '<div class="fwd-hint fwd-hint-bull">BTC 方向：向上（BTC ' + fP(env.close) + ' &gt; SMA20 ' + fP(env.sma20) + '）— 仅供参考，不参与筛选</div>';
  }
  return '<div class="fwd-hint fwd-hint-bear">BTC 方向：向下（BTC ' + fP(env.close) + ' &lt; SMA20 ' + fP(env.sma20) + '）— 仅供参考，不参与筛选</div>';
}

// ── 主渲染 ──
function renderForward() {
  var root = document.getElementById('root');
  var rows = fwdFiltered();
  var watch = fwdGetWatch();
  var accN = forwardData.filter(function (r) { return r.signal === 'acc_candidate'; }).length;
  var avoidN = forwardData.filter(function (r) { return r.volume_oi_ratio >= 5; }).length;
  var watchN = Object.keys(watch).length;

  var H = '<div class="fwd-wrap">';
  H += fwdEnvHint();
  H += '<div class="fwd-bar">';
  H += '<button class="btn' + (fTag === '' ? ' btn-active' : '') + '" onclick="fwdSetPreset(\\'\\')">🎯 全部 (' + rows.length + ')</button>';
  H += '<button class="btn' + (fTag === 'acc' ? ' btn-active' : '') + '" onclick="fwdSetPreset(\\'acc\\')">🧭 蓄水候选 (' + accN + ')</button>';
  H += '<button class="btn' + (fTag === 'avoid' ? ' btn-active' : '') + '" onclick="fwdSetPreset(\\'avoid\\')">⛔ 回避名单 (' + avoidN + ')</button>';
  H += '<button class="btn' + (fTag === 'watch' ? ' btn-active' : '') + '" onclick="fwdSetPreset(\\'watch\\')">👁 观察池 (' + watchN + ')</button>';
  H += '<span class="dim" style="margin-left:auto">更新: ' + (forwardUpdated ? new Date(forwardUpdated).toLocaleString() : '—') + '</span>';
  H += '</div>';
  H += '<div class="fwd-bar" style="flex-wrap:wrap;gap:6px;align-items:center">';
  H += '<span class="dim">OI 范围 (USDT):</span>';
  H += '<input id="fwd-oi-min" type="number" placeholder="最小 M" style="width:90px;padding:4px 6px;background:var(--surface-alt);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px" value="' + (fwdOiMin != null ? (fwdOiMin / 1e6) : '') + '" onkeydown="if(event.key===' + "'Enter'" + ')fwdSetOiRange()">';
  H += '<span class="dim">—</span>';
  H += '<input id="fwd-oi-max" type="number" placeholder="最大 M" style="width:90px;padding:4px 6px;background:var(--surface-alt);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px" value="' + (fwdOiMax != null ? (fwdOiMax / 1e6) : '') + '" onkeydown="if(event.key===' + "'Enter'" + ')fwdSetOiRange()">';
  H += '<button class="btn btn-sm" style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;font-weight:700" onclick="fwdSetOiRange()">✓ 确定</button>';
  H += '<button class="btn btn-sm" onclick="fwdClearOiRange()">清除</button>';
  H += '<span class="dim" id="fwd-oi-status">' + (fwdOiMin != null || fwdOiMax != null ? '🔍 已过滤 OI ' + (fwdOiMin != null ? (fwdOiMin/1e6) : '0') + 'M ~ ' + (fwdOiMax != null ? (fwdOiMax/1e6) : '∞') + 'M' : '未过滤（全市场）') + '</span>';
  H += '</div>';
  H += '<div class="fwd-stats">🧭候选 ' + accN + ' · ⛔回避 ' + avoidN + ' · 👁已标记 ' + watchN + '</div>';
  H += fwdHistPanel();

  if (rows.length === 0) {
    H += '<div class="empty-msg">没有符合条件的币。</div>';
  } else {
    H += '<div class="table-wrap"><table class="tbl fwd-tbl"><thead><tr>';
    H += '<th></th><th class="sortable" onclick="fwdSortBy(\\'symbol\\')">币种</th>';
    H += '<th class="sortable" onclick="fwdSortBy(\\'price\\')">价格</th>';
    H += '<th class="sortable" onclick="fwdSortBy(\\'change_24h_pct\\')">24h%</th>';
    H += '<th class="sortable" onclick="fwdSortBy(\\'oi_value\\')">OI($M)</th>';
    H += '<th class="sortable" onclick="fwdSortBy(\\'volume_oi_ratio\\')">额/OI</th>';
    H += '<th class="sortable" onclick="fwdSortBy(\\'drawdown_60d\\')">回撤60d</th>';
    H += '<th class="sortable" onclick="fwdSortBy(\\'range_20d\\')">横盘20d</th>';
    H += '<th class="sortable" onclick="fwdSortBy(\\'vol_shrink_20d\\')">缩量</th>';
    H += '<th class="sortable" onclick="fwdSortBy(\\'near_low_20d\\')">距低点</th>';
    H += '<th class="sortable" onclick="fwdSortBy(\\'funding_rate_pct\\')">资费%</th>';
    H += '<th class="sortable" onclick="fwdSortBy(\\'days_since_listing\\')">上线</th>';
    H += '<th class="sortable" onclick="fwdSortBy(\\'forward_score\\')">评分</th>';
    H += '<th>信号</th><th></th>';
    H += '</tr></thead><tbody>';
    rows.slice(0, 200).forEach(function (r) {
      var isAvoid = r.volume_oi_ratio >= 5;
      var rowCls = isAvoid ? 'fwd-avoid' : (r.signal === 'acc_candidate' ? 'fwd-acc' : '');
      var marked = !!watch[r.symbol];
      H += '<tr class="' + rowCls + '">';
      H += '<td>' + (marked ? '✅' : '') + '</td>';
      H += '<td class="mono">' + r.symbol.replace('USDT', '') + '</td>';
      H += '<td class="mono">' + fP(r.price) + '</td>';
      H += '<td class="' + (r.change_24h_pct >= 0 ? 'up' : 'down') + '">' + fC(r.change_24h_pct) + '</td>';
      H += '<td class="mono">' + (r.oi_value != null ? (r.oi_value / 1e6).toFixed(1) : '—') + '</td>';
      H += '<td class="mono">' + (r.volume_oi_ratio != null ? r.volume_oi_ratio.toFixed(1) + 'x' : '—') + '</td>';
      H += '<td class="mono">' + (r.drawdown_60d != null ? (r.drawdown_60d * 100).toFixed(0) + '%' : '—') + '</td>';
      H += '<td class="mono">' + (r.range_20d != null ? (r.range_20d * 100).toFixed(0) + '%' : '—') + '</td>';
      H += '<td class="mono">' + (r.vol_shrink_20d != null ? (r.vol_shrink_20d * 100).toFixed(0) + '%' : '—') + '</td>';
      H += '<td class="mono">' + (r.near_low_20d != null ? r.near_low_20d.toFixed(2) : '—') + '</td>';
      H += '<td class="mono">' + (r.funding_rate_pct != null ? r.funding_rate_pct.toFixed(3) + '%' : '—') + '</td>';
      H += '<td class="mono">' + (r.days_since_listing != null ? r.days_since_listing + 'd' : '—') + '</td>';
      H += '<td class="mono score">' + (r.forward_score != null ? r.forward_score : '—') + '</td>';
      H += '<td>' + fwdTagHtml(r) + '</td>';
      H += '<td><button class="btn btn-sm" onclick="fwdToggleWatch(\\'' + r.symbol + '\\')">' + (marked ? '取消' : '标记') + '</button></td>';
      H += '</tr>';
    });
    H += '</tbody></table></div>';
  }
  H += '<div class="fwd-foot dim">规则来源：@derrrrrrrq 推文校准（2026-08-07）— ①额/OI≥5 是回避信号不是入场信号（验证 fwd5 -1.7%）；②吸筹结构=深底+横盘+缩量+无新低（dn10 3.3% vs 全市场 9.7%）；③推文维度：起势前有大阳线后盘整、吸筹期价格缓涨、有Spring测试更可信、OI 2M-8M 是甜蜜区；④dotyyds1234维度：正资金费高=套利者聚集有肉吃，负费率+拉盘=控盘做空排除；⑤玩新不玩旧：派发后期的旧币自动排除；⑥纯小币筛选器（无 BTC 环境开关）。仅供研究参考，不构成投资建议。</div>';
  H += '</div>';
  root.innerHTML = H;
}

function demonLoad() {
  var root = document.getElementById('root');
  root.innerHTML = '<div class="empty-msg">正在加载妖币数据 (币安合约额/OI)...</div>';
  fetch(BASE + '/api/demon').then(function (r) { return r.json(); }).then(function (d) {
    demonData = (d.data || []).map(function (r) {
      if (!r.oi_stage) {
        var oi = r.oi_value || 0;
        if (oi < 2e6) { r.oi_stage = 'accumulation'; r.oi_stage_label = '⏳蓄水'; }
        else if (oi < 8e6) { r.oi_stage = 'early_pump'; r.oi_stage_label = '💎小币'; }
        else if (oi < 30e6) { r.oi_stage = 'pump'; r.oi_stage_label = '🚀拉升'; }
        else if (oi < 80e6) { r.oi_stage = 'mid'; r.oi_stage_label = '⚡中期'; }
        else { r.oi_stage = 'late_distribution'; r.oi_stage_label = '⛔大后期'; }
      }
      return r;
    });
    demonUpdated = d.updated || null;
    demonLoaded = true;
    renderDemon();
  }).catch(function (err) {
    root.innerHTML = '<div class="empty-msg">妖币数据加载失败: ' + e(err.message) + '<br><br><button class="btn" onclick="demonLoad()">重试</button></div>';
  });
}

// ── 排序列映射 ──
function demonSortKey() {
  return { ratio: 'volume_oi_ratio', vol: 'volume_24h_usdt', oi: 'oi_value', chg: 'change_24h_pct', count: 'trade_count' }[dSort] || 'volume_oi_ratio';
}

// ── 过滤 + 排序 ──
function demonFiltered() {
  var q = (dQuery || '').toUpperCase().trim();
  var list = demonData.filter(function (r) {
    var vol = r.volume_24h_usdt || 0, oi = r.oi_value || 0, ratio = r.volume_oi_ratio || 0, chg = r.change_24h_pct || 0;
    if (dVolMin > 0 && vol < dVolMin * 1e6) return false;
    if (dOiMax < 100000 && oi > dOiMax * 1e6) return false;
    if (dRatioMin > 0 && ratio < dRatioMin) return false;
    if (chg < dChgMin || chg > dChgMax) return false;
    if (dPreset === 'tag' && DEMON_MENTIONED.indexOf(r.base_asset) < 0) return false;
    if (q && (r.symbol || '').indexOf(q) < 0 && (r.base_asset || '').indexOf(q) < 0) return false;
    return true;
  });
  var key = demonSortKey();
  list.sort(function (a, b) {
    var av = a[key] || 0, bv = b[key] || 0;
    return dAsc ? av - bv : bv - av;
  });
  return list;
}

function demonSetPreset(p) {
  dPreset = p;
  dVolMin = 0; dOiMax = 100000; dRatioMin = 0; dChgMin = -100; dChgMax = 100; dQuery = ''; dSort = 'ratio'; dAsc = false;
  if (p === 'squeeze') { dRatioMin = 8; dVolMin = 1; }
  else if (p === 'small') { dOiMax = 30; dSort = 'oi'; dAsc = true; }
  else if (p === 'pump') { dChgMin = 5; }
  else if (p === 'dump') { dChgMax = -5; }
  else if (p === 'tag') { dSort = 'vol'; }
  else if (p === 'all') { dSort = 'vol'; dVolMin = 0; dOiMax = 100000; dRatioMin = 0; dChgMin = -100; dChgMax = 100; }
  demonSyncInputs();
  renderDemon();
}

function demonSyncInputs() {
  var g = function (id) { return document.getElementById(id); };
  var set = function (id, v) { var el = g(id); if (el) el.value = v; };
  set('d-vol-min', dVolMin); set('d-oi-max', dOiMax); set('d-ratio-min', dRatioMin);
  set('d-chg-min', dChgMin); set('d-chg-max', dChgMax);
  set('d-vol-min-i', dVolMin); set('d-oi-max-i', dOiMax); set('d-ratio-min-i', dRatioMin);
  set('d-chg-min-i', dChgMin); set('d-chg-max-i', dChgMax);
  set('d-query', dQuery); set('d-sort', dSort);
  if (g('d-preset-' + dPreset)) {
    var all = document.querySelectorAll('.demon-preset');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
    g('d-preset-' + dPreset).classList.add('active');
  }
}

function demonApply() {
  var g = function (id) { return document.getElementById(id); };
  dVolMin = +g('d-vol-min').value || 0;
  dOiMax = +g('d-oi-max').value || 0;
  dRatioMin = +g('d-ratio-min').value || 0;
  var a = +g('d-chg-min').value, b = +g('d-chg-max').value;
  if (a > b) { var t = a; a = b; b = t; }
  dChgMin = a; dChgMax = b;
  dSort = g('d-sort').value; dQuery = g('d-query').value;
  dPreset = '';
  var all = document.querySelectorAll('.demon-preset');
  for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
  demonSyncInputs();
  renderDemon();
}

function demonSortBy(k) {
  if (dSort === k) dAsc = !dAsc; else { dSort = k; dAsc = false; }
  demonSyncInputs();
  renderDemon();
}

// ── 信号标签 ──
function demonTags(r) {
  var t = [];
  var ratio = r.volume_oi_ratio || 0, oi = r.oi_value || 0, chg = r.change_24h_pct || 0;
  if (ratio > 8) t.push('<span class="sig-badge sig-squeeze">🔥挤压空间</span>');
  if (chg > 5) t.push('<span class="sig-badge sig-pump">🚀拉升</span>');
  if (chg < -5) t.push('<span class="sig-badge sig-dump">📉杀多</span>');
  if (DEMON_MENTIONED.indexOf(r.base_asset) >= 0) t.push('<span class="sig-badge sig-tag">📌他提过</span>');
  if (oi > 0 && oi < 10e6) t.push('<span class="sig-badge sig-lowoi">低OI</span>');
  if (oi > 100e6) t.push('<span class="sig-badge sig-higoi">⚠高OI</span>');
  return t.join('');
}

// ── 图表：额/OI比 Top20 ──
function demonChartRatio(list) {
  var top = list.slice().sort(function (a, b) { return (b.volume_oi_ratio || 0) - (a.volume_oi_ratio || 0); }).slice(0, 20);
  var max = 1; top.forEach(function (r) { if ((r.volume_oi_ratio || 0) > max) max = r.volume_oi_ratio || 0; });
  var h = '';
  top.forEach(function (r) {
    var v = r.volume_oi_ratio || 0;
    h += '<div class="hbar-row"><span class="hbar-label">' + e(r.base_asset) + '</span><div class="hbar-track"><div class="hbar-fill" style="width:' + (v / max * 100) + '%"></div></div><span class="hbar-val">' + v.toFixed(1) + 'x</span></div>';
  });
  return h;
}

// ── 图表：涨幅分布直方图 ──
function demonChartGain(list) {
  var b = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  list.forEach(function (r) {
    var c = r.change_24h_pct || 0;
    if (c < -40 || c > 40) return;
    var idx = Math.floor((c + 40) / 8);
    if (idx < 0) idx = 0; if (idx > 9) idx = 9;
    b[idx]++;
  });
  var max = 1; b.forEach(function (v) { if (v > max) max = v; });
  var h = '<div class="hist-wrap">';
  for (var i = 0; i < 10; i++) {
    var lo = -40 + i * 8;
    h += '<div class="hist-bar"><div class="hist-fill' + (lo + 4 < 0 ? ' neg' : '') + '" style="height:' + (b[i] / max * 100) + '%"></div><div class="hist-label">' + (lo >= 0 ? '+' : '') + lo + '%</div></div>';
  }
  h += '</div>';
  return h;
}

// ── 图表：OI值分布直方图 ──
function demonChartOi(list) {
  var labels = ['<5M', '5-10M', '10-30M', '30-100M', '>100M'];
  var b = [0, 0, 0, 0, 0];
  list.forEach(function (r) {
    var o = r.oi_value || 0;
    if (o < 5e6) b[0]++; else if (o < 10e6) b[1]++; else if (o < 30e6) b[2]++; else if (o < 100e6) b[3]++; else b[4]++;
  });
  var max = 1; b.forEach(function (v) { if (v > max) max = v; });
  var h = '<div class="hist-wrap">';
  for (var i = 0; i < 5; i++) {
    h += '<div class="hist-bar"><div class="hist-fill" style="height:' + (b[i] / max * 100) + '%"></div><div class="hist-label">' + labels[i] + '</div></div>';
  }
  h += '</div>';
  return h;
}

// ── 图表：OI值 vs 24h额 气泡图（对数坐标，点大小=额/OI比） ──
function demonChartScatter(list) {
  // 自适应对数范围（与小币筛选器同款）
  var pts = [];
  list.forEach(function (r) {
    var oi = r.oi_value, vol = r.volume_24h_usdt;
    if (oi == null || oi <= 0 || vol == null || vol <= 0) return;
    pts.push(r);
  });
  if (pts.length < 2) return '<div class="scatter-wrap" style="display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:.7rem">暂无足够数据</div>';
  var oiVals = pts.map(function (r) { return r.oi_value; });
  var volVals = pts.map(function (r) { return r.volume_24h_usdt; });
  function niceLogLo(arr) { var mn = Math.min.apply(null, arr); if (mn <= 0) mn = 1e4; return Math.pow(10, Math.floor(Math.log10(mn))); }
  function niceLogHi(arr) { var mx = Math.max.apply(null, arr); return Math.pow(10, Math.ceil(Math.log10(mx))); }
  var xLo = niceLogLo(oiVals), xHi = niceLogHi(oiVals);
  var yLo = niceLogLo(volVals), yHi = niceLogHi(volVals);
  if (xHi / xLo < 4) xHi = xLo * 10; if (yHi / yLo < 4) yHi = yLo * 10;
  var xMin = Math.log10(xLo), xMax = Math.log10(xHi);
  var yMin = Math.log10(yLo), yMax = Math.log10(yHi);
  var stageColor = { accumulation: '#64748b', early_pump: '#3b82f6', pump: '#10b981', mid: '#f59e0b', late_distribution: '#ef4444' };
  var stageLabel = { accumulation: '⏳蓄水', early_pump: '💎小币', pump: '🚀拉升', mid: '⚡中期', late_distribution: '⛔大后期' };
  function ticks(lo, hi) {
    var out = [];
    for (var v = lo; v <= hi * 1.001; v *= 10) out.push(v);
    if (out.length < 3) { out = []; for (var i = 0; i < 5; i++) out.push(lo * Math.pow(Math.pow(hi / lo, 1 / 4), i)); }
    return out;
  }
  var xTicks = ticks(xLo, xHi), yTicks = ticks(yLo, yHi);
  var h = '<div class="scatter-wrap">';
  h += '<div class="scatter-plot">';
  // 网格线 + 刻度标签
  xTicks.forEach(function (tv) {
    var pct = (Math.log10(tv) - xMin) / (xMax - xMin) * 100;
    if (pct < 0 || pct > 100) return;
    h += '<div class="scatter-grid scatter-grid-v" style="left:' + pct + '%"></div>';
    h += '<div class="scatter-tick scatter-tick-x" style="left:' + pct + '%">' + fL(tv) + '</div>';
  });
  yTicks.forEach(function (tv) {
    var pct = 100 - (Math.log10(tv) - yMin) / (yMax - yMin) * 100;
    if (pct < 0 || pct > 100) return;
    h += '<div class="scatter-grid scatter-grid-h" style="top:' + pct + '%"></div>';
    h += '<div class="scatter-tick scatter-tick-y" style="top:' + pct + '%">' + fL(tv) + '</div>';
  });
  // 气泡点（按额/OI比排序，取 top 80）
  var top = pts.slice().sort(function (a, b) { return (b.volume_oi_ratio || 0) - (a.volume_oi_ratio || 0); }).slice(0, 80);
  top.forEach(function (r) {
    var oi = Math.max(r.oi_value, xLo), vol = Math.max(r.volume_24h_usdt, yLo);
    var x = (Math.log10(oi) - xMin) / (xMax - xMin) * 100;
    var y = 100 - (Math.log10(vol) - yMin) / (yMax - yMin) * 100;
    x = Math.max(1, Math.min(99, x)); y = Math.max(1, Math.min(99, y));
    var ratio = r.volume_oi_ratio || 0;
    var size = Math.min(20, 4 + ratio / 2);
    var stage = r.oi_stage || 'accumulation';
    var color = stageColor[stage] || '#64748b';
    var tipDir = y < 35 ? 'below' : 'above';
    var tip = e(r.base_asset) + ' | OI ' + fL(r.oi_value) + ' | 24h额 ' + fL(r.volume_24h_usdt) + ' | 额/OI ' + ratio.toFixed(1) + 'x | ' + (stageLabel[stage] || stage);
    h += '<div class="scatter-dot" data-sym="' + e(r.base_asset) + '" style="left:' + x + '%;top:' + y + '%;width:' + size + 'px;height:' + size + 'px;background:' + color + '"><span class="scatter-tip ' + tipDir + '">' + tip + '</span></div>';
  });
  h += '</div>'; // close scatter-plot
  // 轴标题
  h += '<div class="scatter-axis scatter-x">OI值 (对数) →</div><div class="scatter-axis scatter-y">↑ 24h额 (对数)</div>';
  // 图例
  h += '<div class="scatter-legend">';
  ['accumulation', 'early_pump', 'pump', 'mid', 'late_distribution'].forEach(function (k) {
    h += '<span class="scatter-legend-item"><i style="background:' + stageColor[k] + '"></i>' + stageLabel[k] + '</span>';
  });
  h += '</div></div>';
  return h;
}

// ── 主渲染 ──
function renderDemon() {
  var root = document.getElementById('root');
  var list = demonFiltered();
  var up = 0; list.forEach(function (r) { if ((r.change_24h_pct || 0) > 0) up++; });
  var totalVol = 0; list.forEach(function (r) { totalVol += r.volume_24h_usdt || 0; });
  var activeMention = 0; demonData.forEach(function (r) {
    if (DEMON_MENTIONED.indexOf(r.base_asset) >= 0 && (r.volume_24h_usdt || 0) >= 1e6) activeMention++;
  });
  var squeezeN = 0; demonData.forEach(function (r) { if ((r.volume_oi_ratio || 0) > 10) squeezeN++; });
  var upPct = list.length > 0 ? (up / list.length * 100).toFixed(1) : '--';
  var us = demonUpdated ? new Date(demonUpdated).toLocaleString('zh-CN') : '--';

  var rows = '';
  list.forEach(function (r) {
    var ratio = r.volume_oi_ratio || 0;
    var cls = ratio > 8 ? 'class="squeeze-row"' : '';
    rows += '<tr ' + cls + '>'
      + '<td><b>' + e(r.base_asset) + '</b></td>'
      + '<td>' + fP(r.price) + '</td>'
      + '<td>' + fL(r.volume_24h_usdt) + '</td>'
      + '<td>' + fC(r.change_24h_pct) + '</td>'
      + '<td>' + fC(r.amplitude_24h_pct) + '</td>'
      + '<td>' + fL(r.oi_value) + '</td>'
      + '<td><b>' + ratio.toFixed(1) + 'x</b></td>'
      + '<td>' + ((r.trade_count || 0) >= 1000 ? Math.round((r.trade_count || 0) / 1000) + 'k' : (r.trade_count || 0)) + '</td>'
      + '<td>' + demonTags(r) + '</td>'
      + '</tr>';
  });

  var H = '';
  H += '<div class="app-header"><h1>👺 妖币扫描器</h1><p>基于 @derrrrrrrq 方法论 — 换手高 · 涨幅大 · OI低 — 数据源: 币安合约 (额/OI比 = 挤压空间)</p></div>';
  H += '<div class="status-bar ok"><span>扫描 ' + demonData.length + ' 个合约 · 筛选命中 ' + list.length + '</span><span>更新 ' + us + '</span></div>';
  H += '<div class="layout"><div class="sidebar">';
  H += '<div class="demon-preset-row">';
  var presets = [['default', '🎯默认'], ['squeeze', '🔥挤压空间'], ['small', '💎小币候选'], ['pump', '🚀拉升'], ['dump', '📉杀多'], ['tag', '📌他提过'], ['all', '📋全部']];
  for (var i = 0; i < presets.length; i++) {
    H += '<button class="demon-preset' + (dPreset === presets[i][0] ? ' active' : '') + '" id="d-preset-' + presets[i][0] + '" onclick="demonSetPreset(\\'' + presets[i][0] + '\\')">' + presets[i][1] + '</button>';
  }
  H += '</div>';
  H += '<div class="demon-filter-card"><div class="label">24h成交额 (百万$)</div><div class="input-row"><input type="number" id="d-vol-min-i" class="filter-input" value="0" min="0" step="1" onchange="demonApply()"><span class="range-sep">≥</span></div><input type="range" id="d-vol-min" min="0" max="500" value="0" oninput="demonApply()"></div>';
  H += '<div class="demon-filter-card"><div class="label">OI值上限 (百万$)</div><div class="input-row"><input type="number" id="d-oi-max-i" class="filter-input" value="100000" min="0" step="1" onchange="demonApply()"><span class="range-sep">≤</span></div><input type="range" id="d-oi-max" min="0" max="500" value="100000" oninput="demonApply()"></div>';
  H += '<div class="demon-filter-card"><div class="label">额/OI比下限 (x)</div><div class="input-row"><input type="number" id="d-ratio-min-i" class="filter-input" value="0" min="0" step="1" onchange="demonApply()"><span class="range-sep">≥</span></div><input type="range" id="d-ratio-min" min="0" max="50" value="0" oninput="demonApply()"></div>';
  H += '<div class="demon-filter-card"><div class="label">24h涨幅范围 (%)</div><div class="input-row"><input type="number" id="d-chg-min-i" class="filter-input" value="-100" min="-100" max="500" step="1" onchange="demonApply()"><span class="range-sep">~</span><input type="number" id="d-chg-max-i" class="filter-input" value="100" min="-100" max="500" step="1" onchange="demonApply()"></div><div class="input-row"><input type="range" id="d-chg-min" min="-100" max="100" value="-100" oninput="demonApply()"><input type="range" id="d-chg-max" min="-100" max="100" value="100" oninput="demonApply()"></div></div>';
  H += '<div class="demon-filter-card"><div class="label">搜索币种</div><input type="text" id="d-query" class="filter-input" style="width:100%" placeholder="如: BANK" oninput="demonApply()"></div>';
  H += '<div class="demon-filter-card"><div class="label">排序方式</div><div class="demon-sort-row"><select id="d-sort" onchange="demonApply()">'
    + '<option value="ratio">额/OI比</option><option value="vol">24h成交额</option><option value="oi">OI值</option><option value="chg">24h涨幅</option><option value="count">成交笔数</option></select></div></div>';
  H += '<button class="refresh-btn" onclick="demonReload()">刷新数据</button>';
  H += '<div style="font-size:.6rem;color:var(--text-muted);text-align:center;margin-top:8px">本地中继推送 · 每5分钟</div>';
  H += '</div><div class="main">';
  H += '<div class="kpi-row">';
  H += '<div class="kpi-card"><div class="kpi-label">扫描合约</div><div class="kpi-value">' + demonData.length + '</div></div>';
  H += '<div class="kpi-card"><div class="kpi-label">筛选命中</div><div class="kpi-value">' + list.length + '</div></div>';
  H += '<div class="kpi-card"><div class="kpi-label">上涨占比</div><div class="kpi-value">' + upPct + '%</div></div>';
  H += '<div class="kpi-card"><div class="kpi-label">他关注活跃</div><div class="kpi-value">' + activeMention + '</div></div>';
  H += '<div class="kpi-card"><div class="kpi-label">额/OI&gt;10x</div><div class="kpi-value">' + squeezeN + '</div></div>';
  H += '</div>';
  H += '<div class="table-wrap"><div class="table-title">妖币扫描结果 <span style="font-weight:400;font-size:.7rem;color:var(--text-muted);margin-left:8px">点击表头排序 · 红行=挤压空间(额/OI&gt;8x) · 24h额合计 $' + fL(totalVol) + '</span></div><div class="table-scroll"><table><thead><tr>';
  H += '<th onclick="demonSortBy(\\'ratio\\')">交易对</th><th>价格</th><th onclick="demonSortBy(\\'vol\\')">24h额</th><th onclick="demonSortBy(\\'chg\\')">24h涨幅</th><th>振幅</th><th onclick="demonSortBy(\\'oi\\')">OI值</th><th onclick="demonSortBy(\\'ratio\\')">额/OI比</th><th onclick="demonSortBy(\\'count\\')">成交笔数</th><th>信号</th>';
  H += '</tr></thead><tbody>' + (rows || '<tr><td colspan="9" class="empty-msg">无匹配结果</td></tr>') + '</tbody></table></div></div>';
  H += '<div class="demon-chart-wrap"><h4>🔥 额/OI比 Top20（换手高但OI未跟上 → 庄家蓄水）</h4>' + demonChartRatio(list) + '</div>';
  H += '<div class="demon-chart-wrap"><h4>📊 24h涨幅分布</h4>' + demonChartGain(list) + '</div>';
  H += '<div class="demon-chart-wrap"><h4>📊 OI值分布</h4>' + demonChartOi(list) + '</div>';
  H += '<div class="demon-chart-wrap"><h4>🫧 OI值 vs 24h额（对数坐标，点大小=额/OI比）</h4>' + demonChartScatter(list) + '</div>';
  H += '<div class="demon-note">核心条件: 额/OI比 &gt; 10x（换手高但OI没跟上）· 辅助: 24h额 &gt; $2M（流动性够）· 涨幅 &gt; 5%（盘面激活）· OI &lt; $30M（小币挤压空间大）<br>排除: 大币(BTC/ETH/SOL) · OI &gt; $100M（庄家已完成布局）· 所有人注意力的币 · 派发后期的币</div>';
  H += '<div class="footer">⚠️ 仅供研究参考，不构成投资建议<br>最后更新 ' + us + '</div>';
  H += '</div></div>';
  root.innerHTML = H;
  demonSyncInputs();
}

function demonReload() {
  demonLoaded = false;
  demonLoad();
}

</script><script>
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// 🪙 小币筛选器 视图（基于 @derrrrrrrq 方法论：小币OI区间 + 换手 + 盘口深度）
// 数据: GET /api/coinfilter（币安合约 资费率/盘口深度/上线日期）
//       降级: GET /api/demon（妖币中继数据，无资费/深度/上线日期则显示 N/A）
// ═══════════════════════════════════════════════════════════

// ── 他推文中提过的 25 个币（DEMON_MENTIONED 的兜底副本）──
var CF_MENTIONED = (typeof DEMON_MENTIONED !== 'undefined' && DEMON_MENTIONED) ? DEMON_MENTIONED
  : ['SIREN','RAVE','STO','LAB','TRADOOR','BSB','ESPORTS','BANK','IDOL','UB','BILL','RIVER','PTB','ACE','SAHARA','VELVET','ALLO','BLUAI','AGT','NOM','PIPPIN','WLFI','RESOLV','USR','INX'];

// ── 状态 ──
if (typeof curTab === 'undefined') var curTab = 'chip';
var coinfilterData = [], coinfilterUpdated = null, coinfilterLoaded = false, coinfilterSource = 'coinfilter';
var cPreset = 'default', cQuery = '', cSort = 'ratio', cAsc = false, cTag = '';
var cRatioMin = 0, cRatioMax = 999, cOiMin = 0, cOiMax = 9999;
var cChgMin = -100, cChgMax = 100, cVolMin = 0, cVolMax = 99999;
var cFundMin = -1, cFundMax = 1, cDepthMin = 0, cDepthMax = 999999;

// ── 挂接 Tab 切换（兼容已存在的 switchTab / rD 覆盖链）──
var __cfSwitchTab = (typeof switchTab === 'function') ? switchTab : null;
switchTab = function (t) {
  if (t === 'coinfilter') {
    curTab = t;
    var tb = document.getElementById('tabbar');
    if (tb) {
      tb.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
      var btn = tb.querySelector('.tab-coinfilter');
      if (btn) btn.classList.add('active');
    }
    if (!coinfilterLoaded) coinfilterLoad(); else renderCoinfilter();
    return;
  }
  if (__cfSwitchTab) { __cfSwitchTab(t); return; }
  if (t === 'demon' && typeof renderDemon === 'function') { renderDemon(); return; }
  if (typeof rD === 'function') rD();
};

var __cfRD = (typeof rD === 'function') ? rD : null;
rD = function () {
  if (curTab === 'coinfilter') { renderCoinfilter(); return; }
  if (__cfRD) __cfRD();
};

// ── 数据加载（/api/coinfilter → 降级 /api/demon）──
function coinfilterLoad() {
  var root = document.getElementById('root');
  root.innerHTML = '<div class="empty-msg">🪙 正在加载小币筛选数据（币安合约 资费率/盘口深度/上线日期）...</div>';
  fetch(BASE + '/api/coinfilter').then(function (r) { return r.json(); }).then(function (d) {
    var coins = d.coins || d.data || [];
    if (d.error && !coins.length) throw new Error(d.error);
    if (!coins.length) throw new Error('coinfilter 暂无数据');
    coinfilterData = coins.map(cfEnrich);
    coinfilterUpdated = d.updated || null;
    coinfilterLoaded = true;
    coinfilterSource = 'coinfilter';
    renderCoinfilter();
  }).catch(function (err) {
    // 降级: 妖币中继数据（无资费/深度/上线日期字段）
    fetch(BASE + '/api/demon').then(function (r) { return r.json(); }).then(function (d) {
      var coins = d.data || [];
      if (!coins.length) throw new Error('demon 也无数据');
      coinfilterData = coins.map(cfEnrich);
      coinfilterUpdated = d.updated || null;
      coinfilterLoaded = true;
      coinfilterSource = 'demon';
      renderCoinfilter();
    }).catch(function (err2) {
      root.innerHTML = '<div class="empty-msg">小币筛选数据加载失败: ' + e(err2.message) + '<br><br><button class="btn" onclick="coinfilterLoad()">重试</button></div>';
    });
  });
}

function cfReload() {
  coinfilterLoaded = false;
  coinfilterLoad();
}

// ── 数据补充: OI阶段 / 上市天数 / 信号标签（全部客户端计算）──
function cfEnrich(r) {
  var oi = r.oi_value || 0;
  var stage = 'accumulation', label = '⏳ 蓄水期';
  if (oi < 2e6) { stage = 'accumulation'; label = '⏳ 蓄水期'; }
  else if (oi < 8e6) { stage = 'early_pump'; label = '💎 小币候选'; }
  else if (oi < 30e6) { stage = 'pump'; label = '🚀 拉升期'; }
  else if (oi < 80e6) { stage = 'mid'; label = '⚡ 中期'; }
  else { stage = 'late_distribution'; label = '⛔ 大后期'; }
  r.base_asset = r.base_asset || r.symbol || '';
  r.oi_stage = stage;
  r.oi_stage_label = label;
  if (r.days_since_listing == null && r.listing_date) {
    var ld = new Date(r.listing_date);
    if (!isNaN(ld.getTime())) r.days_since_listing = Math.max(0, Math.floor((Date.now() - ld.getTime()) / 86400000));
  }
  r.tags = cfTags(r);
  return r;
}

// ── 信号标签（自动）──
var CF_TAG_DEFS = [
  ['squeeze', '🔥挤压'],
  ['small_cap', '💎小币'],
  ['early_pump', '🚀拉升'],
  ['thin_book', '⚠️薄盘口'],
  ['distribution', '⛔大后期'],
  ['kill_longs', '📉杀多'],
  ['mentioned', '📌他提过'],
  ['new_listing', '🆕新上'],
  ['funding_anomaly', '💰资费异']
];

function cfTags(r) {
  var t = {};
  var ratio = r.volume_oi_ratio || 0, oi = r.oi_value || 0, chg = r.change_24h_pct || 0;
  var depth = r.orderbook_depth_usdt, fund = r.funding_rate_pct, days = r.days_since_listing;
  var base = r.base_asset || r.symbol || '';
  t.squeeze = ratio >= 10 && oi > 5e6;
  t.small_cap = oi >= 2e6 && oi < 8e6;
  t.early_pump = oi >= 8e6 && oi < 30e6 && chg > 0;
  t.thin_book = depth != null && depth < 200000;
  t.distribution = oi > 80e6 && ratio < 3 && chg < -10;
  t.kill_longs = chg < -5;
  t.mentioned = CF_MENTIONED.indexOf(base) >= 0;
  t.new_listing = days != null && days <= 30;
  t.funding_anomaly = fund != null && (fund > 0.05 || fund < -0.05);
  return t;
}

function cfTagHtml(r) {
  var h = '';
  for (var i = 0; i < CF_TAG_DEFS.length; i++) {
    var k = CF_TAG_DEFS[i][0];
    if (r.tags && r.tags[k]) h += '<span class="cf-tag cf-tag-' + k + '">' + CF_TAG_DEFS[i][1] + '</span>';
  }
  return h;
}

// ── 5步检查清单（点击循环 ✓ → ✕ → 空白，localStorage 持久化）──
var CF_CHECK_STEPS = [
  ['📡 扫盘', '换手高(额/OI≥10x)·涨幅大(>5%)·OI低(<30M)'],
  ['🧹 筛选', 'OI 2M-8M 小币候选 / 8M-30M 拉升早期'],
  ['🔍 确认', '盘口不薄·无派发迹象·量价配合'],
  ['🎯 入场', '回调不破位·放量突破确认'],
  ['🛡️ 风控', '止损明确·仓位合理·资费正常']
];

function cfGetChecklist(sym) {
  try {
    var d = JSON.parse(localStorage.getItem('cf_checklist_v1') || '{}');
    return d[sym] || [0, 0, 0, 0, 0];
  } catch (e) { return [0, 0, 0, 0, 0]; }
}

function cfCycleCheck(sym, idx) {
  var d = {};
  try { d = JSON.parse(localStorage.getItem('cf_checklist_v1') || '{}'); } catch (e) {}
  var arr = d[sym] || [0, 0, 0, 0, 0];
  arr[idx] = (arr[idx] + 1) % 3;
  d[sym] = arr;
  try { localStorage.setItem('cf_checklist_v1', JSON.stringify(d)); } catch (e) {}
  var mark = document.getElementById('cfm-' + sym + '-' + idx);
  if (mark) {
    var st = arr[idx];
    mark.className = 'cf-check-mark cf-check-' + (st === 1 ? 'ok' : st === 2 ? 'no' : 'blank');
    mark.textContent = st === 1 ? '✓' : st === 2 ? '✕' : '·';
  }
}

function cfChecklistHtml(sym) {
  var cl = cfGetChecklist(sym);
  var h = '<div class="cf-checklist"><div class="cf-checklist-head"><span>📋 5步检查清单</span><span class="cf-checklist-hint">点击切换 ✓ / ✕ / 空白 · 自动保存</span></div><div class="cf-checklist-steps">';
  for (var i = 0; i < CF_CHECK_STEPS.length; i++) {
    var st = cl[i] || 0;
    h += '<div class="cf-check-step" onclick="cfCycleCheck(\\'' + sym + '\\',' + i + ')">'
      + '<span id="cfm-' + sym + '-' + i + '" class="cf-check-mark cf-check-' + (st === 1 ? 'ok' : st === 2 ? 'no' : 'blank') + '">' + (st === 1 ? '✓' : st === 2 ? '✕' : '·') + '</span>'
      + '<span class="cf-check-name">' + CF_CHECK_STEPS[i][0] + '</span>'
      + '<span class="cf-check-desc">' + CF_CHECK_STEPS[i][1] + '</span>'
      + '</div>';
  }
  h += '</div></div>';
  return h;
}

// ── 展开行: 切换显示 ──
function cfToggleRow(tr) {
  var detail = tr.nextElementSibling;
  if (!detail || !detail.classList.contains('cf-detail-row')) return;
  var show = detail.style.display === 'none';
  detail.style.display = show ? 'table-row' : 'none';
  var arrow = tr.querySelector('.cf-expand-arrow');
  if (arrow) arrow.textContent = show ? '▾' : '▸';
}

// ── 排序列映射 ──
function cfSortKeyVal(r, k) {
  if (k === 'oi') return r.oi_value || 0;
  if (k === 'chg') return r.change_24h_pct || 0;
  if (k === 'vol') return r.volume_24h_usdt || 0;
  if (k === 'depth') return r.orderbook_depth_usdt || 0;
  if (k === 'lsr') return r.long_short_ratio || 0;
  if (k === 'liq') return r.liq_24h_usdt || 0;
  if (k === 'oit') return r.oi_24h_change_pct || 0;
  if (k === 'sym') return r.base_asset || r.symbol || '';
  return r.volume_oi_ratio || 0;
}

// ── 过滤 + 排序 ──
function cfFiltered() {
  var q = (cQuery || '').toUpperCase().trim();
  var list = coinfilterData.filter(function (r) {
    var ratio = r.volume_oi_ratio || 0, oi = r.oi_value || 0, chg = r.change_24h_pct || 0, vol = r.volume_24h_usdt || 0;
    var fund = r.funding_rate_pct, depth = r.orderbook_depth_usdt;
    if (ratio < cRatioMin || ratio > cRatioMax) return false;
    if (oi < cOiMin * 1e6 || oi > cOiMax * 1e6) return false;
    if (chg < cChgMin || chg > cChgMax) return false;
    if (vol < cVolMin * 1e6 || vol > cVolMax * 1e6) return false;
    if (fund != null && (fund < cFundMin || fund > cFundMax)) return false;
    if (depth != null && (depth < cDepthMin * 1000 || depth > cDepthMax * 1000)) return false;
    if (cTag && !(r.tags && r.tags[cTag])) return false;
    if (q && (r.symbol || '').indexOf(q) < 0 && (r.base_asset || '').indexOf(q) < 0) return false;
    return true;
  });
  list.sort(function (a, b) {
    var k = cSort;
    if (k === 'depth') return cfSortKeyVal(a, k) - cfSortKeyVal(b, k); // 深度恒为升序
    var av = cfSortKeyVal(a, k), bv = cfSortKeyVal(b, k);
    if (typeof av === 'string') return cAsc ? (av < bv ? -1 : av > bv ? 1 : 0) : (av < bv ? 1 : av > bv ? -1 : 0);
    return cAsc ? av - bv : bv - av;
  });
  return list;
}

// ── 8 个预设 ──
var CF_PRESETS = [
  ['default', '🎯默认'],
  ['small', '💎小币2-8M'],
  ['pump', '🚀拉升早期8-30M'],
  ['thin', '⚠️薄盘口'],
  ['kill', '📉杀多'],
  ['late', '⛔大后期'],
  ['tag', '📌他提过'],
  ['all', '📋全部']
];

function cfSetPreset(p) {
  cPreset = p; cTag = '';
  cRatioMin = 0; cRatioMax = 999; cOiMin = 0; cOiMax = 9999;
  cChgMin = -100; cChgMax = 100; cVolMin = 0; cVolMax = 99999;
  cFundMin = -1; cFundMax = 1; cDepthMin = 0; cDepthMax = 999999;
  cQuery = ''; cSort = 'ratio'; cAsc = false;
  if (p === 'default') { cVolMin = 0.3; }
  else if (p === 'small') { cOiMin = 2; cOiMax = 8; cSort = 'oi'; cAsc = true; }
  else if (p === 'pump') { cOiMin = 8; cOiMax = 30; cChgMin = 0; }
  else if (p === 'thin') { cDepthMax = 200; cSort = 'depth'; }
  else if (p === 'kill') { cChgMax = -5; }
  else if (p === 'late') { cOiMin = 80; cRatioMax = 3; cChgMax = -10; }
  else if (p === 'tag') { cTag = 'mentioned'; cSort = 'vol'; }
  else if (p === 'all') { cVolMin = 0; cSort = 'vol'; }
  cfSyncInputs();
  renderCoinfilter();
}

// ── 同步控件 ──
function cfSyncInputs() {
  var g = function (id) { return document.getElementById(id); };
  var set = function (id, v) { var el = g(id); if (el) el.value = v; };
  set('c-ratio-min', cRatioMin); set('c-ratio-max', cRatioMax);
  set('c-ratio-min-i', cRatioMin); set('c-ratio-max-i', cRatioMax);
  set('c-oi-min', cOiMin); set('c-oi-max', cOiMax);
  set('c-oi-min-i', cOiMin); set('c-oi-max-i', cOiMax);
  set('c-chg-min', cChgMin); set('c-chg-max', cChgMax);
  set('c-chg-min-i', cChgMin); set('c-chg-max-i', cChgMax);
  set('c-vol-min', cVolMin); set('c-vol-max', cVolMax);
  set('c-vol-min-i', cVolMin); set('c-vol-max-i', cVolMax);
  set('c-fund-min', cFundMin); set('c-fund-max', cFundMax);
  set('c-fund-min-i', cFundMin); set('c-fund-max-i', cFundMax);
  set('c-depth-min', cDepthMin); set('c-depth-max', cDepthMax);
  set('c-depth-min-i', cDepthMin); set('c-depth-max-i', cDepthMax);
  set('c-query', cQuery); set('c-sort', cSort);
  var all = document.querySelectorAll('.cf-preset');
  for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
  var act = g('c-preset-' + cPreset);
  if (act) act.classList.add('active');
}

// ── 手动筛选应用 ──
function cfApply() {
  var g = function (id) { return document.getElementById(id); };
  function num(id, def) { var v = parseFloat(g(id).value); return isNaN(v) ? def : v; }
  function pair(minId, maxId, dMin, dMax) {
    var a = num(minId, dMin), b = num(maxId, dMax);
    if (a > b) { var t = a; a = b; b = t; }
    return [a, b];
  }
  var pr = pair('c-ratio-min-i', 'c-ratio-max-i', 0, 999); cRatioMin = pr[0]; cRatioMax = pr[1];
  var po = pair('c-oi-min-i', 'c-oi-max-i', 0, 9999); cOiMin = po[0]; cOiMax = po[1];
  var pc = pair('c-chg-min-i', 'c-chg-max-i', -100, 100); cChgMin = pc[0]; cChgMax = pc[1];
  var pv = pair('c-vol-min-i', 'c-vol-max-i', 0, 99999); cVolMin = pv[0]; cVolMax = pv[1];
  var pf = pair('c-fund-min-i', 'c-fund-max-i', -1, 1); cFundMin = pf[0]; cFundMax = pf[1];
  var pd = pair('c-depth-min-i', 'c-depth-max-i', 0, 999999); cDepthMin = pd[0]; cDepthMax = pd[1];
  cQuery = g('c-query').value;
  cSort = g('c-sort').value;
  if (cSort === 'depth') cAsc = false;
  cPreset = ''; cTag = '';
  cfSyncInputs();
  renderCoinfilter();
}

function cfSortBy(k) {
  if (k === 'depth') { cSort = k; cAsc = false; }
  else if (cSort === k) cAsc = !cAsc;
  else { cSort = k; cAsc = false; }
  var sel = document.getElementById('c-sort');
  if (sel) sel.value = cSort;
  var all = document.querySelectorAll('.cf-preset');
  for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
  cPreset = '';
  renderCoinfilter();
}

// ── 工具函数 ──
function cfDepth(v) {
  if (v == null) return 'N/A';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
  return String(Math.round(v));
}

// ── 图表 1: 额/OI比 Top20 ──
function cfChartRatio(list) {
  var top = list.slice().sort(function (a, b) { return (b.volume_oi_ratio || 0) - (a.volume_oi_ratio || 0); }).slice(0, 20);
  var max = 1; top.forEach(function (r) { if ((r.volume_oi_ratio || 0) > max) max = r.volume_oi_ratio || 0; });
  var h = '';
  top.forEach(function (r) {
    var v = r.volume_oi_ratio || 0;
    h += '<div class="cf-hbar-row"><span class="cf-hbar-label">' + e(r.base_asset) + '</span><div class="cf-hbar-track"><div class="cf-hbar-fill" style="width:' + (v / max * 100) + '%"></div></div><span class="cf-hbar-val">' + v.toFixed(1) + 'x</span></div>';
  });
  return h;
}

// ── 图表 2: OI区间分布直方图（按阶段着色）──
function cfChartOi(list) {
  var labels = ['<2M', '2-8M', '8-30M', '30-80M', '>80M'];
  var colors = ['#64748b', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
  var b = [0, 0, 0, 0, 0];
  list.forEach(function (r) {
    var o = r.oi_value || 0;
    if (o < 2e6) b[0]++; else if (o < 8e6) b[1]++; else if (o < 30e6) b[2]++; else if (o < 80e6) b[3]++; else b[4]++;
  });
  var max = 1; b.forEach(function (v) { if (v > max) max = v; });
  var h = '<div class="cf-hist-wrap">';
  for (var i = 0; i < 5; i++) {
    h += '<div class="cf-hist-bar"><div class="cf-hist-fill" style="height:' + (b[i] / max * 100) + '%;background:' + colors[i] + '"></div><div class="cf-hist-label">' + labels[i] + '</div></div>';
  }
  h += '</div>';
  return h;
}

// ── 图表 3: OI值 vs 24h额 气泡图（对数坐标，点大小=额/OI比，颜色=OI阶段）──
function cfChartScatter(list) {
  // 自适应对数范围: 从实际数据算 min/max，避免点全挤在左下角
  var pts = [];
  list.forEach(function (r) {
    var oi = r.oi_value, vol = r.volume_24h_usdt;
    if (oi == null || oi <= 0 || vol == null || vol <= 0) return;
    pts.push(r);
  });
  if (pts.length < 2) return '<div class="cf-scatter-wrap" style="display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:.7rem">暂无足够数据</div>';
  var oiVals = pts.map(function (r) { return r.oi_value; });
  var volVals = pts.map(function (r) { return r.volume_24h_usdt; });
  function niceLogLo(arr) { var mn = Math.min.apply(null, arr); if (mn <= 0) mn = 1e4; return Math.pow(10, Math.floor(Math.log10(mn))); }
  function niceLogHi(arr) { var mx = Math.max.apply(null, arr); return Math.pow(10, Math.ceil(Math.log10(mx))); }
  var xLo = niceLogLo(oiVals), xHi = niceLogHi(oiVals);
  var yLo = niceLogLo(volVals), yHi = niceLogHi(volVals);
  if (xHi / xLo < 4) xHi = xLo * 10; if (yHi / yLo < 4) yHi = yLo * 10;
  var xMin = Math.log10(xLo), xMax = Math.log10(xHi);
  var yMin = Math.log10(yLo), yMax = Math.log10(yHi);
  var stageColor = { accumulation: '#64748b', early_pump: '#3b82f6', pump: '#10b981', mid: '#f59e0b', late_distribution: '#ef4444' };
  var stageLabel = { accumulation: '⏳蓄水', early_pump: '💎小币', pump: '🚀拉升', mid: '⚡中期', late_distribution: '⛔大后期' };
  // 刻度: 每轴 5 个对数刻度
  function ticks(lo, hi) {
    var out = [];
    for (var v = lo; v <= hi * 1.001; v *= 10) out.push(v);
    if (out.length < 3) { out = []; for (var i = 0; i < 5; i++) out.push(lo * Math.pow(Math.pow(hi / lo, 1 / 4), i)); }
    return out;
  }
  var xTicks = ticks(xLo, xHi), yTicks = ticks(yLo, yHi);
  var h = '<div class="cf-scatter-wrap">';
  // 绘图区域（内边距留给刻度标签和轴标题）
  h += '<div class="cf-scatter-plot">';
  // 网格线 + 刻度标签（相对于 plot 区域）
  xTicks.forEach(function (tv) {
    var pct = (Math.log10(tv) - xMin) / (xMax - xMin) * 100;
    if (pct < 0 || pct > 100) return;
    h += '<div class="cf-scatter-grid cf-scatter-grid-v" style="left:' + pct + '%"></div>';
    h += '<div class="cf-scatter-tick cf-scatter-tick-x" style="left:' + pct + '%">' + fL(tv) + '</div>';
  });
  yTicks.forEach(function (tv) {
    var pct = 100 - (Math.log10(tv) - yMin) / (yMax - yMin) * 100;
    if (pct < 0 || pct > 100) return;
    h += '<div class="cf-scatter-grid cf-scatter-grid-h" style="top:' + pct + '%"></div>';
    h += '<div class="cf-scatter-tick cf-scatter-tick-y" style="top:' + pct + '%">' + fL(tv) + '</div>';
  });
  // 气泡点（顶部 40% 的点 tooltip 向下，其余向上）
  var top = pts.slice().sort(function (a, b) { return (b.volume_oi_ratio || 0) - (a.volume_oi_ratio || 0); }).slice(0, 80);
  top.forEach(function (r) {
    var oi = Math.max(r.oi_value, xLo), vol = Math.max(r.volume_24h_usdt, yLo);
    var x = (Math.log10(oi) - xMin) / (xMax - xMin) * 100;
    var y = 100 - (Math.log10(vol) - yMin) / (yMax - yMin) * 100;
    x = Math.max(1, Math.min(99, x)); y = Math.max(1, Math.min(99, y));
    var ratio = r.volume_oi_ratio || 0;
    var size = Math.min(24, 5 + ratio / 1.8);
    var color = stageColor[r.oi_stage] || '#64748b';
    var tipDir = y < 35 ? 'below' : 'above';
    var tip = e(r.base_asset) + ' | OI ' + fL(r.oi_value) + ' | 24h额 ' + fL(r.volume_24h_usdt) + ' | 额/OI ' + ratio.toFixed(1) + 'x | ' + (r.oi_stage_label || '');
    h += '<div class="cf-scatter-dot" data-sym="' + e(r.symbol) + '" style="left:' + x + '%;top:' + y + '%;width:' + size + 'px;height:' + size + 'px;background:' + color + '"><span class="cf-scatter-tip ' + tipDir + '">' + tip + '</span></div>';
  });
  h += '</div>'; // close cf-scatter-plot
  // 轴标题（在外层 wrap，不受 plot overflow 裁剪）
  h += '<div class="cf-scatter-axis cf-scatter-x">OI值 (对数) →</div><div class="cf-scatter-axis cf-scatter-y">↑ 24h额 (对数)</div>';
  // 图例（在外层 wrap）
  h += '<div class="cf-scatter-legend">';
  ['accumulation', 'early_pump', 'pump', 'mid', 'late_distribution'].forEach(function (k) {
    h += '<span class="cf-scatter-legend-item"><i style="background:' + stageColor[k] + '"></i>' + stageLabel[k] + '</span>';
  });
  h += '</div></div>';
  return h;
}

// ── 图表 4: 资费率分布直方图（-0.2% ~ +0.2%，负红正绿）──
function cfChartFunding(list) {
  var nb = 10, step = 0.04;
  var b = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  list.forEach(function (r) {
    var f = r.funding_rate_pct;
    if (f == null) return;
    if (f < -0.2 || f > 0.2) return;
    var idx = Math.floor((f + 0.2) / step);
    if (idx < 0) idx = 0; if (idx > nb - 1) idx = nb - 1;
    b[idx]++;
  });
  var max = 1; b.forEach(function (v) { if (v > max) max = v; });
  var h = '<div class="cf-hist-wrap">';
  for (var i = 0; i < nb; i++) {
    var lo = -0.2 + i * step, mid = lo + step / 2;
    var cls = mid < 0 ? ' neg' : (mid > 0 ? ' pos' : '');
    h += '<div class="cf-hist-bar"><div class="cf-hist-fill' + cls + '" style="height:' + (b[i] / max * 100) + '%"></div><div class="cf-hist-label">' + (lo >= 0 ? '+' : '') + lo.toFixed(2) + '</div></div>';
  }
  h += '</div>';
  return h;
}

// ── 信号计数统计条 ──
function cfStatsBar(list) {
  var keys = ['squeeze', 'small_cap', 'early_pump', 'thin_book', 'distribution', 'kill_longs', 'mentioned', 'new_listing', 'funding_anomaly'];
  var counts = {};
  keys.forEach(function (k) { counts[k] = 0; });
  list.forEach(function (r) {
    var t = r.tags || {};
    keys.forEach(function (k) { if (t[k]) counts[k]++; });
  });
  var names = { squeeze: '🔥挤压', small_cap: '💎小币', early_pump: '🚀拉升', thin_book: '⚠️薄盘口', distribution: '⛔大后期', kill_longs: '📉杀多', mentioned: '📌他提过', new_listing: '🆕新上', funding_anomaly: '💰资费异' };
  var h = '<div class="cf-stats">';
  keys.forEach(function (k) {
    h += '<span class="cf-stat-chip cf-chip-' + k + '">' + names[k] + ' <b>' + counts[k] + '</b></span>';
  });
  h += '</div>';
  return h;
}

// ── 展开详情: 元信息 ──
function cfDetailMetaHtml(r) {
  var amp = r.amplitude_pct != null ? r.amplitude_pct : r.amplitude_24h_pct;
  var tc = r.trade_count;
  var h = '<div class="cf-detail-meta">';
  h += '<div class="cf-meta-item"><span class="cf-meta-label">上线日期</span><span>' + e(r.listing_date || 'N/A') + '</span></div>';
  h += '<div class="cf-meta-item"><span class="cf-meta-label">上市天数</span><span>' + (r.days_since_listing != null ? r.days_since_listing + ' 天' : 'N/A') + '</span></div>';
  h += '<div class="cf-meta-item"><span class="cf-meta-label">24h振幅</span><span>' + (amp != null ? amp.toFixed(1) + '%' : 'N/A') + '</span></div>';
  h += '<div class="cf-meta-item"><span class="cf-meta-label">成交笔数</span><span>' + (tc != null ? (tc >= 1000 ? Math.round(tc / 1000) + 'k' : tc) : 'N/A') + '</span></div>';
  h += '<div class="cf-meta-item"><span class="cf-meta-label">OI阶段</span><span>' + e(r.oi_stage_label) + '</span></div>';
  if (r.long_short_ratio != null) h += '<div class="cf-meta-item"><span class="cf-meta-label">多空比</span><span>' + r.long_short_ratio.toFixed(2) + (r.long_pct != null ? ' (多头' + r.long_pct.toFixed(0) + '% / 空头' + r.short_pct.toFixed(0) + '%)' : '') + '</span></div>';
  if (r.liq_24h_usdt != null) h += '<div class="cf-meta-item"><span class="cf-meta-label">24h清算</span><span>' + cfDepth(r.liq_24h_usdt) + ' (多' + cfDepth(r.liq_long_24h_usdt || 0) + ' / 空' + cfDepth(r.liq_short_24h_usdt || 0) + ')</span></div>';
  if (r.oi_24h_change_pct != null) h += '<div class="cf-meta-item"><span class="cf-meta-label">OI 24h趋势</span><span>' + (r.oi_24h_change_pct > 0 ? '+' : '') + r.oi_24h_change_pct.toFixed(1) + '%</span></div>';
  if (r.predicted_funding_rate_pct != null) h += '<div class="cf-meta-item"><span class="cf-meta-label">预测资费</span><span>' + r.predicted_funding_rate_pct.toFixed(4) + '%</span></div>';
  h += '</div>';
  return h;
}

// ── 主渲染 ──
function renderCoinfilter(container) {
  var root = container || document.getElementById('root');
  if (!root) return;
  if (!coinfilterLoaded) {
    root.innerHTML = '<div class="empty-msg">🪙 数据加载中...（币安合约 资费率/盘口深度/上线日期 抓取中，每5分钟更新）<br><br><button class="btn" onclick="coinfilterLoad()">重试</button></div>';
    return;
  }
  var list = cfFiltered();
  var up = 0; list.forEach(function (r) { if ((r.change_24h_pct || 0) > 0) up++; });
  var totalVol = 0; list.forEach(function (r) { totalVol += r.volume_24h_usdt || 0; });
  var fundN = 0, newN = 0;
  list.forEach(function (r) {
    if (r.tags.funding_anomaly) fundN++;
    if (r.tags.new_listing) newN++;
  });
  var upPct = list.length > 0 ? (up / list.length * 100).toFixed(1) : '--';
  var us = coinfilterUpdated ? new Date(coinfilterUpdated).toLocaleString('zh-CN') : '--';
  var src = coinfilterSource === 'demon' ? '妖币中继(降级, 无资费/深度/上线日期)' : '币安合约(资费率/盘口/上线日期)';

  var rows = '';
  list.forEach(function (r) {
    var fund = r.funding_rate_pct != null
      ? '<span class="cf-fund' + (r.funding_rate_pct > 0 ? ' cf-fund-pos' : r.funding_rate_pct < 0 ? ' cf-fund-neg' : '') + '">' + (r.funding_rate_pct > 0 ? '+' : '') + r.funding_rate_pct.toFixed(3) + '%</span>'
      : 'N/A';
    var depth = r.orderbook_depth_usdt != null ? cfDepth(r.orderbook_depth_usdt) : 'N/A';
    // Coinalyze 补充列：多空比 / 清算 / OI趋势
    var lsr = r.long_short_ratio != null
      ? '<span class="cf-lsr' + (r.long_short_ratio > 2 ? ' cf-lsr-high' : r.long_short_ratio < 0.5 ? ' cf-lsr-low' : '') + '">' + r.long_short_ratio.toFixed(2) + ' (' + (r.long_pct != null ? r.long_pct.toFixed(0) : '?') + '/' + (r.short_pct != null ? r.short_pct.toFixed(0) : '?') + ')</span>'
      : 'N/A';
    var liq = r.liq_24h_usdt != null && r.liq_24h_usdt > 0
      ? '<span class="cf-liq">' + cfDepth(r.liq_24h_usdt) + '</span>'
      : 'N/A';
    var oiT = r.oi_24h_change_pct != null
      ? '<span class="cf-oit cf-oit-' + (r.oi_24h_change_pct > 0 ? 'up' : r.oi_24h_change_pct < 0 ? 'down' : '') + '">' + (r.oi_24h_change_pct > 0 ? '+' : '') + r.oi_24h_change_pct.toFixed(1) + '%</span>'
      : 'N/A';
    var cls = r.tags.squeeze ? ' class="cf-squeeze-row cf-row-click"' : ' class="cf-row-click"';
    rows += '<tr' + cls + ' onclick="cfToggleRow(this)">'
      + '<td class="cf-expand-arrow">▸</td>'
      + '<td><b>' + e(r.base_asset) + '</b></td>'
      + '<td>' + fP(r.price) + '</td>'
      + '<td>' + fL(r.volume_24h_usdt) + '</td>'
      + '<td>' + fC(r.change_24h_pct) + '</td>'
      + '<td>' + fL(r.oi_value) + '</td>'
      + '<td><b>' + (r.volume_oi_ratio || 0).toFixed(1) + 'x</b></td>'
      + '<td>' + fund + '</td>'
      + '<td>' + depth + '</td>'
      + '<td>' + lsr + '</td>'
      + '<td>' + liq + '</td>'
      + '<td>' + oiT + '</td>'
      + '<td><span class="cf-stage cf-stage-' + e(r.oi_stage) + '">' + e(r.oi_stage_label) + '</span></td>'
      + '<td>' + cfTagHtml(r) + '</td>'
      + '</tr>'
      + '<tr class="cf-detail-row" style="display:none"><td colspan="14">'
      + cfChecklistHtml(r.base_asset)
      + cfDetailMetaHtml(r)
      + '</td></tr>';
  });

  var H = '';
  H += '<div class="app-header"><h1>🪙 小币筛选器</h1><p>基于 @derrrrrrrq 方法论 — 小币OI区间 · 换手 · 盘口深度 — 数据源: 币安合约 (每5分钟中继)</p></div>';
  H += '<div class="status-bar ok"><span>扫描 ' + coinfilterData.length + ' 个合约 · 筛选命中 ' + list.length + '</span><span>数据源: ' + src + ' · 更新 ' + us + '</span></div>';
  H += '<div class="layout"><div class="sidebar">';
  H += '<div class="cf-preset-row">';
  for (var i = 0; i < CF_PRESETS.length; i++) {
    H += '<button class="cf-preset' + (cPreset === CF_PRESETS[i][0] ? ' active' : '') + '" id="c-preset-' + CF_PRESETS[i][0] + '" onclick="cfSetPreset(\\'' + CF_PRESETS[i][0] + '\\')">' + CF_PRESETS[i][1] + '</button>';
  }
  H += '</div>';
  H += '<div class="cf-filter-card"><div class="label">额/OI比 (x)</div><div class="input-row"><input type="number" id="c-ratio-min-i" class="filter-input" value="0" min="0" step="1" onchange="cfApply()"><span class="range-sep">~</span><input type="number" id="c-ratio-max-i" class="filter-input" value="999" min="0" step="1" onchange="cfApply()"></div><div class="input-row"><input type="range" id="c-ratio-min" min="0" max="200" value="0" oninput="cfApply()"><input type="range" id="c-ratio-max" min="0" max="200" value="200" oninput="cfApply()"></div></div>';
  H += '<div class="cf-filter-card"><div class="label">OI区间 (百万$)</div><div class="input-row"><input type="number" id="c-oi-min-i" class="filter-input" value="0" min="0" step="1" onchange="cfApply()"><span class="range-sep">~</span><input type="number" id="c-oi-max-i" class="filter-input" value="9999" min="0" step="1" onchange="cfApply()"></div><div class="input-row"><input type="range" id="c-oi-min" min="0" max="500" value="0" oninput="cfApply()"><input type="range" id="c-oi-max" min="0" max="500" value="500" oninput="cfApply()"></div></div>';
  H += '<div class="cf-filter-card"><div class="label">24h涨幅 (%)</div><div class="input-row"><input type="number" id="c-chg-min-i" class="filter-input" value="-100" min="-100" max="500" step="1" onchange="cfApply()"><span class="range-sep">~</span><input type="number" id="c-chg-max-i" class="filter-input" value="100" min="-100" max="500" step="1" onchange="cfApply()"></div><div class="input-row"><input type="range" id="c-chg-min" min="-100" max="100" value="-100" oninput="cfApply()"><input type="range" id="c-chg-max" min="-100" max="100" value="100" oninput="cfApply()"></div></div>';
  H += '<div class="cf-filter-card"><div class="label">24h成交额 (百万$)</div><div class="input-row"><input type="number" id="c-vol-min-i" class="filter-input" value="0" min="0" step="1" onchange="cfApply()"><span class="range-sep">~</span><input type="number" id="c-vol-max-i" class="filter-input" value="99999" min="0" step="1" onchange="cfApply()"></div><div class="input-row"><input type="range" id="c-vol-min" min="0" max="2000" value="0" oninput="cfApply()"><input type="range" id="c-vol-max" min="0" max="2000" value="2000" oninput="cfApply()"></div></div>';
  H += '<div class="cf-filter-card"><div class="label">资费率 (%)</div><div class="input-row"><input type="number" id="c-fund-min-i" class="filter-input" value="-1" min="-5" max="5" step="0.01" onchange="cfApply()"><span class="range-sep">~</span><input type="number" id="c-fund-max-i" class="filter-input" value="1" min="-5" max="5" step="0.01" onchange="cfApply()"></div><div class="input-row"><input type="range" id="c-fund-min" min="-1" max="1" step="0.01" value="-1" oninput="cfApply()"><input type="range" id="c-fund-max" min="-1" max="1" step="0.01" value="1" oninput="cfApply()"></div></div>';
  H += '<div class="cf-filter-card"><div class="label">盘口深度 (K$)</div><div class="input-row"><input type="number" id="c-depth-min-i" class="filter-input" value="0" min="0" step="1" onchange="cfApply()"><span class="range-sep">~</span><input type="number" id="c-depth-max-i" class="filter-input" value="999999" min="0" step="1" onchange="cfApply()"></div><div class="input-row"><input type="range" id="c-depth-min" min="0" max="2000" value="0" oninput="cfApply()"><input type="range" id="c-depth-max" min="0" max="2000" value="2000" oninput="cfApply()"></div></div>';
  H += '<div class="cf-filter-card"><div class="label">搜索币种</div><input type="text" id="c-query" class="filter-input" style="width:100%" placeholder="如: BANK" oninput="cfApply()"></div>';
  H += '<div class="cf-filter-card"><div class="label">排序方式</div><div class="cf-sort-row"><select id="c-sort" onchange="cfApply()">'
    + '<option value="ratio">额/OI比 ↓</option><option value="oi">OI值 ↓</option><option value="chg">24h涨幅 ↓</option><option value="depth">盘口深度 ↑</option><option value="lsr">多空比 ↓</option><option value="liq">清算 ↓</option><option value="oit">OI趋势 ↓</option></select></div></div>';
  H += '<button class="refresh-btn" onclick="cfReload()">刷新数据</button>';
  H += '<div style="font-size:.6rem;color:var(--text-muted);text-align:center;margin-top:8px">本地中继推送 · 每5分钟</div>';
  H += '</div><div class="main">';
  H += '<div class="kpi-row">';
  H += '<div class="kpi-card"><div class="kpi-label">扫描合约</div><div class="kpi-value">' + coinfilterData.length + '</div></div>';
  H += '<div class="kpi-card"><div class="kpi-label">筛选命中</div><div class="kpi-value">' + list.length + '</div></div>';
  H += '<div class="kpi-card"><div class="kpi-label">上涨占比</div><div class="kpi-value">' + upPct + '%</div></div>';
  H += '<div class="kpi-card"><div class="kpi-label">💰资费异</div><div class="kpi-value">' + fundN + '</div></div>';
  H += '<div class="kpi-card"><div class="kpi-label">🆕新上</div><div class="kpi-value">' + newN + '</div></div>';
  H += '</div>';
  H += cfStatsBar(list);
  H += '<div class="table-wrap"><div class="table-title">🪙 小币筛选结果 <span style="font-weight:400;font-size:.7rem;color:var(--text-muted);margin-left:8px">点击表头排序 · 点击行展开检查清单 · 24h额合计 $' + fL(totalVol) + '</span></div><div class="table-scroll"><table><thead><tr>';
  H += '<th></th><th onclick="cfSortBy(\\'sym\\')">交易对</th><th>价格</th><th onclick="cfSortBy(\\'vol\\')">24h额</th><th onclick="cfSortBy(\\'chg\\')">24h涨幅</th><th onclick="cfSortBy(\\'oi\\')">OI值</th><th onclick="cfSortBy(\\'ratio\\')">额/OI比</th><th>资费率</th><th onclick="cfSortBy(\\'depth\\')">盘口深度</th><th>多空比</th><th>24h清算</th><th>OI 24h</th><th>阶段</th><th>信号</th>';
  H += '</tr></thead><tbody>' + (rows || '<tr><td colspan="14" class="empty-msg">无匹配结果</td></tr>') + '</tbody></table></div></div>';
  H += '<div class="cf-chart-wrap"><h4>🔥 额/OI比 Top20（换手高但OI没跟上 → 挤压空间）</h4>' + cfChartRatio(list) + '</div>';
  H += '<div class="cf-chart-wrap"><h4>📊 OI区间分布（灰=蓄水 · 蓝=小币候选 · 绿=拉升期 · 橙=中期 · 红=大后期）</h4>' + cfChartOi(list) + '</div>';
  H += '<div class="cf-chart-wrap"><h4>🫧 OI值 vs 24h额（对数坐标 · 点大小=额/OI比 · 颜色=OI阶段）</h4>' + cfChartScatter(list) + '</div>';
  H += '<div class="cf-chart-wrap"><h4>💰 资费率分布（% · 负=做多付费 / 正=做空付费）</h4>' + cfChartFunding(list) + '</div>';
  H += '<div class="cf-note">信号规则: 🔥挤压 额/OI≥10x 且 OI&gt;5M · 💎小币 OI 2M-8M · 🚀拉升早期 OI 8M-30M 且 24h&gt;0% · ⚠️薄盘口 深度&lt;200K · ⛔大后期 OI&gt;80M 且 额/OI&lt;3x 且 跌幅&gt;10% · 📉杀多 24h&lt;-5% · 📌他提过 25个币 · 🆕新上 ≤30天 · 💰资费异常 资费率&gt;+0.05% 或 &lt;-0.05%<br>OI阶段: ⏳蓄水&lt;2M · 💎小币候选 2M-8M · 🚀拉升期 8M-30M · ⚡中期 30M-80M · ⛔大后期&gt;80M · 资费/盘口/上线日期 由本地中继每5分钟抓取（未就绪时自动降级妖币数据）</div>';
  H += '<div class="footer">⚠️ 仅供研究参考，不构成投资建议<br>最后更新 ' + us + '</div>';
  H += '</div></div>';
  root.innerHTML = H;
  cfSyncInputs();
}

// ═══════════════════════════════════════════════════════════
// 📡 🧭 筛币工作台 视图（第 5 tab）— L0-L5 完整筛币逻辑
// 数据: GET /api/screener（服务端合并 forward + coinfilter + data，计算环境闸门/排除层/告警）
// 规则: 硬门槛五要素(下行保护 dn10 3.3%) + 强度分(叙事+1) + 事件回避(-3, fwd5 -1.7%)
// ═══════════════════════════════════════════════════════════
var scData = [], scLoaded = false, scTag = '', scSort = 'forward_score', scAsc = false, scAppearTotal = 0;
var scEnv = null, scSources = null, scUpdated = null, scStale = true;
// 历史出现面板
var scAhHours = 24, scAhCache = {};
function scAhSet(h) { scAhHours = h; scAhLoad(); }
function scAhLoad() {
  var panel = document.getElementById('sc-ah-panel');
  var status = document.getElementById('sc-ah-status');
  if (!panel) return;
  if (scAhCache[scAhHours]) { scAhRender(scAhCache[scAhHours]); return; }
  panel.innerHTML = '<div class="empty-msg" style="padding:14px">🕘 正在查询 ' + scAhHours + ' 小时内入选过的币...</div>';
  if (status) status.innerHTML = '';
  fetch(BASE + '/api/appear-history?hours=' + scAhHours).then(function (r) { return r.json(); }).then(function (d) {
    if (d.error) throw new Error(d.error);
    scAhCache[scAhHours] = d;
    scAhRender(d);
  }).catch(function (err) {
    panel.innerHTML = '<div class="empty-msg" style="padding:14px">查询失败: ' + e(err.message) + ' <button class="btn btn-sm" onclick="scAhLoad()">重试</button></div>';
  });
}
function scAhRender(d) {
  var panel = document.getElementById('sc-ah-panel');
  var status = document.getElementById('sc-ah-status');
  if (!panel) return;
  if (status) status.innerHTML = '共 ' + d.count + ' 个币';
  var rows = d.data || [];
  if (!rows.length) { panel.innerHTML = '<div class="empty-msg" style="padding:14px">该时间范围内没有币入选过候选池</div>'; return; }
  var H = '<div class="table-wrap" style="margin-top:6px"><table class="tbl fwd-tbl"><thead><tr>';
  H += '<th>币种</th><th>首次入选</th><th>最后入选</th><th>入选天数</th><th>出现次数</th><th>最高评分</th><th></th>';
  H += '</tr></thead><tbody>';
  rows.forEach(function (r) {
    var fs = r.first_seen, ls = r.last_seen;
    function fmt(iso) {
      if (!iso) return '—';
      var t = new Date(iso);
      if (isNaN(t.getTime())) return iso;
      var bj = new Date(t.getTime() + 8 * 3600 * 1000);
      return ('0' + (bj.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + bj.getUTCDate()).slice(-2) + ' ' + ('0' + bj.getUTCHours()).slice(-2) + ':' + ('0' + bj.getUTCMinutes()).slice(-2);
    }
    H += '<tr style="border-bottom:1px solid rgba(255,255,255,0.04)">';
    H += '<td class="mono"><b>' + e(r.base_asset) + '</b></td>';
    H += '<td class="mono" style="font-size:11px;color:#94a3b8">' + fmt(fs) + '</td>';
    H += '<td class="mono" style="font-size:11px;color:#34d399">' + fmt(ls) + '</td>';
    H += '<td class="mono">' + r.days + '天</td>';
    H += '<td class="mono" style="' + (r.appear_count >= 10 ? 'color:#fbbf24;font-weight:800' : (r.appear_count >= 5 ? 'color:#f59e0b;font-weight:700' : 'color:#94a3b8')) + '">' + (r.appear_count > 0 ? r.appear_count + '次' : '—') + '</td>';
    H += '<td class="mono score">' + (r.best_score != null ? r.best_score : '—') + '</td>';
    H += '<td><button class="btn btn-sm" onclick="evJump(\\'' + r.base_asset + '\\')">查看</button></td>';
    H += '</tr>';
  });
  H += '</tbody></table></div>';
  panel.innerHTML = H;
}
// OI 范围自定义（客户端过滤，默认不设限 = 全市场，逻辑不变）
var scOiMin = null, scOiMax = null;

var __scSwitchTab = (typeof switchTab === 'function') ? switchTab : null;
switchTab = function (t) {
  if (t === 'watchlist') {
    curTab = t;
    var tb = document.getElementById('tabbar');
    if (tb) {
      tb.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
      var btn = tb.querySelector('.tab-watchlist');
      if (btn) btn.classList.add('active');
    }
    if (!scLoaded) scLoad(); else renderScreener();
    return;
  }
  if (__scSwitchTab) { __scSwitchTab(t); return; }
  if (t === 'demon' && typeof renderDemon === 'function') { renderDemon(); return; }
  if (typeof rD === 'function') rD();
};

var __scRD = (typeof rD === 'function') ? rD : null;
rD = function () {
  if (curTab === 'watchlist') { renderScreener(); return; }
  if (__scRD) __scRD();
};

// ═══════════════════════════════════════════════════════════
// 🎯 涨幅榜重合 视图（第 6 tab）— 每日候选池 ∩ 当日涨幅榜
// 数据: GET /api/overlap-stats（服务端算重合，候选=forward 归档，涨幅榜=ticker 归档）
// 口径: 北京日界；涨幅榜=Binance 永续 24h 涨幅 TopN；minvol 过滤僵尸币
// ═══════════════════════════════════════════════════════════
// ⚡ 事件雷达（第 6 tab）— 上榜 TopN 或单日涨幅 ≥20% 的事件记录
// 数据: GET /api/events（候选池归档 + 涨幅榜归档 合并推导，北京日界）
// 视图: KPI 卡片 + 趋势图 + 事件明细 + 命中率漏斗
// ═══════════════════════════════════════════════════════════
// 📅 日榜回看（第 6 tab）— 点开某一天 → 看当天涨幅榜，标注筛选器候选
// 数据: GET /api/day-gainers?date=YYYY-MM-DD&topn=N（候选关联 = 往前30天候选池归档）
// 视图: 日期列表 → 点击展开单日完整榜（命中候选高亮 + 领先天数 + 评分）
// ═══════════════════════════════════════════════════════════
// 📅 日榜回看 Pro（第 6 tab）— 玻璃拟态 + 骨架屏 + 缓存
// 数据: GET /api/day-gainers?date=YYYY-MM-DD&topn=N
// 体验: 已加载日期本地缓存 → 切换秒开；骨架屏加载；行动画；涨幅条
// ═══════════════════════════════════════════════════════════
var dgData = null, dgLoaded = false, dgDays = 14, dgTopN = 30, dgActive = null;
var dgPerf = null, dgPerfLoaded = false;
var dgCache = {};   // date -> {detail, ts}
var dgFetching = null;

// ── 骨架屏（加载中）──
function dgSkeleton() {
  var sk = function (w) {
    return '<div style="height:14px;border-radius:6px;background:linear-gradient(90deg,rgba(255,255,255,0.04),rgba(255,255,255,0.10),rgba(255,255,255,0.04));background-size:200% 100%;animation:dgShimmer 1.4s infinite;width:' + w + '"></div>';
  };
  var H = '<div class="fwd-wrap">';
  H += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0">';
  for (var i = 0; i < 8; i++) H += '<div style="width:92px;height:28px;border-radius:8px;background:rgba(255,255,255,0.05)"></div>';
  H += '</div>';
  H += '<div style="display:flex;gap:8px;margin:10px 0">' + sk('38%') + sk('25%') + sk('20%') + '</div>';
  H += '<div style="border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:14px;background:rgba(255,255,255,0.02)">';
  for (var r = 0; r < 8; r++) H += '<div style="display:flex;gap:10px;margin:10px 0">' + sk('6%') + sk('12%') + sk('10%') + sk('14%') + sk('18%') + sk('12%') + sk('8%') + sk('8%') + '</div>';
  H += '</div></div>';
  return '<style>@keyframes dgShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}</style>' + H;
}

function dgLoad() {
  var root = document.getElementById('root');
  root.innerHTML = dgSkeleton();
  fetch(BASE + '/api/overlap-stats?days=' + dgDays + '&topn=20&minvol=0')
    .then(function (r) { return r.json(); }).then(function (d) {
      if (d.error && !d.history) throw new Error(d.error);
      var hist = d.history || {};
      var dates = Object.keys(hist).filter(function (ds) { return hist[ds].total_gainers > 0; }).sort().reverse();
      dgData = { dates: dates };
      dgLoaded = true;
      dgPerfLoad();
      if (dates.length) dgOpen(dates[0], true);
      else renderDayList();
    }).catch(function () {
      root.innerHTML = '<div class="empty-msg">📅 日榜数据加载失败<br><br><button class="btn" onclick="dgLoad()">重试</button></div>';
    });
}
function dgOpen(date, instant) {
  if (dgActive === date && dgCache[date] && !instant) { renderDayList(); return; }
  dgActive = date;
  renderDayList();
  if (dgCache[date]) { dgData.detail = dgCache[date]; renderDayList(); return; }
  if (dgFetching) return;
  dgFetching = date;
  var seq = date;
  fetch(BASE + '/api/day-gainers?date=' + date + '&topn=' + dgTopN)
    .then(function (r) { return r.json(); }).then(function (d) {
      if (seq !== dgFetching) return;
      if (d.error) throw new Error(d.error);
      dgCache[date] = d;
      if (dgActive === date) { dgData.detail = d; renderDayList(); }
    }).catch(function () {
      if (seq !== dgFetching) return;
      if (dgActive === date) { dgData.detail = null; renderDayList(); }
    }).finally(function () { dgFetching = null; });
}
function dgSetTopN(n) {
  dgTopN = n; dgCache = {};
  if (dgActive) dgOpen(dgActive);
}

// ── 📊 候选池表现（fwd 收益 vs BTC）──
function dgPerfLoad() {
  fetch(BASE + '/api/perf?days=' + dgDays)
    .then(function (r) { return r.json(); }).then(function (d) {
      if (d.error && !d.summary) throw new Error(d.error);
      dgPerf = d;
      dgPerfLoaded = true;
      renderDayList();
    }).catch(function () { dgPerfLoaded = false; });
}
function dgPerfBar(v, maxV, invert) {
  var w = maxV > 0 ? Math.max(3, Math.round(Math.abs(v) / maxV * 100)) : 3;
  var color = v >= 0 ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#ef4444,#f87171)';
  return '<div style="display:flex;align-items:center;gap:6px"><div style="width:60px;height:5px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden"><div style="height:100%;width:' + w + '%;background:' + color + ';border-radius:3px"></div></div><span style="font-size:11.5px;font-weight:700;color:' + (v >= 0 ? '#34d399' : '#f87171') + '">' + (v >= 0 ? '+' : '') + (v * 100).toFixed(2) + '%</span></div>';
}

// ── 工具：bar-in-cell 涨幅条 ──
function dgBar(chg, maxChg) {
  var w = Math.max(4, Math.round(Math.abs(chg) / maxChg * 100));
  var color = chg >= 0 ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#ef4444,#f87171)';
  return '<div style="display:flex;align-items:center;gap:6px"><div style="width:70px;height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;flex-shrink:0"><div style="height:100%;width:' + w + '%;background:' + color + ';border-radius:3px"></div></div><span style="font-weight:700;font-size:12.5px;color:' + (chg >= 0 ? '#34d399' : '#f87171') + '">' + (chg >= 0 ? '+' : '') + chg + '%</span></div>';
}

function renderDayList() {
  var root = document.getElementById('root');
  if (!dgData) { root.innerHTML = '<div class="empty-msg">暂无数据</div>'; return; }
  var dates = dgData.dates || [];
  var detail = dgData.detail || null;
  var loading = dgActive && !detail;

  var H = '<div class="fwd-wrap">';

  // ── 顶部工具条 ──
  H += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">';
  H += '<span style="font-size:15px;font-weight:800;background:linear-gradient(90deg,#60a5fa,#34d399);-webkit-background-clip:text;background-clip:text;color:transparent">📅 日榜回看</span>';
  H += '<span class="dim" style="font-size:12px">点日期看当天涨幅榜，🏆 = 你的筛选器筛出过</span>';
  H += '<span style="margin-left:auto;display:flex;gap:4px;align-items:center">';
  H += '<span class="dim" style="font-size:12px">榜长</span>';
  [20, 30, 50].forEach(function (n) {
    H += '<button class="btn btn-sm' + (dgTopN === n ? ' btn-active' : '') + '" style="padding:4px 10px;border-radius:8px" onclick="dgSetTopN(' + n + ')">' + n + '</button>';
  });
  H += '<button class="btn btn-sm" style="padding:4px 10px;border-radius:8px" onclick="dgLoad()">⟳ 刷新</button>';
  H += '</span></div>';

  // ── 日期胶囊行 ──
  H += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">';
  dates.forEach(function (ds) {
    var active = ds === dgActive;
    H += '<button class="btn btn-sm' + (active ? ' btn-active' : '') + '" style="padding:6px 14px;border-radius:999px;font-size:12.5px;letter-spacing:.3px;' + (active ? 'background:linear-gradient(135deg,rgba(59,130,246,0.25),rgba(16,185,129,0.15));border-color:rgba(96,165,250,0.6);color:#93c5fd;box-shadow:0 0 14px rgba(59,130,246,0.15)' : '') + '" onclick="dgOpen(\\'' + ds + '\\')">' + ds + '</button>';
  });
  H += '</div>';

  // ── 📊 候选池表现分析 ──
  if (dgPerf && dgPerf.summary) {
    var s = dgPerf.summary;
    H += '<div style="border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:14px 16px;margin-bottom:14px;background:linear-gradient(160deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))">';
    H += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><span style="font-size:13px;font-weight:800;color:#e2e8f0">📊 候选池表现</span><span class="dim" style="font-size:11px">每日入选候选的 fwd 收益 vs BTC（' + dgPerf.summary.n_days + ' 天样本）</span></div>';
    H += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">';
    H += '<div><div class="dim" style="font-size:10px;letter-spacing:.4px">FWD 1D 均值</div>' + dgPerfBar(s.f1_mean, Math.max(Math.abs(s.f1_mean || 0), 0.05), false) + '</div>';
    H += '<div><div class="dim" style="font-size:10px;letter-spacing:.4px">FWD 3D 均值</div>' + dgPerfBar(s.f3_mean, Math.max(Math.abs(s.f3_mean || 0), 0.05), false) + '</div>';
    H += '<div><div class="dim" style="font-size:10px;letter-spacing:.4px">FWD 5D 均值</div>' + dgPerfBar(s.f5_mean, Math.max(Math.abs(s.f5_mean || 0), 0.05), false) + '</div>';
    H += '<div><div class="dim" style="font-size:10px;letter-spacing:.4px">超额 3D（vs BTC）</div>' + dgPerfBar(s.excess_f3_mean, Math.max(Math.abs(s.excess_f3_mean || 0), 0.05), false) + '</div>';
    H += '<div style="border-left:1px solid rgba(255,255,255,0.08);padding-left:12px"><div class="dim" style="font-size:10px;letter-spacing:.4px">3D 胜率</div><div style="font-size:18px;font-weight:800;color:#4ade80">' + (s.win3 != null ? s.win3.toFixed(1) : '—') + '%</div></div>';
    H += '</div>';
    H += '<div class="dim" style="font-size:10px;margin-top:8px">fwd = 入选日收盘 → +N 日收盘；种子日价格由日线补齐（08-04~08-10），08-11 起实时归档</div>';
    H += '</div>';
  }

  // ── 详情 ──
  if (dgActive && detail && detail.date === dgActive) {
    var gs = detail.gainers || [];
    var hitN = gs.filter(function (g) { return g.ever_candidate; }).length;
    var maxChg = 1;
    gs.forEach(function (g) { if (Math.abs(g.change_24h_pct) > maxChg) maxChg = Math.abs(g.change_24h_pct); });

    // 统计条
    H += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">';
    H += '<div style="flex:1;min-width:130px;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:10px 14px;background:linear-gradient(160deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015));backdrop-filter:blur(6px)">';
    H += '<div class="dim" style="font-size:10.5px;letter-spacing:.5px">榜单日期</div>';
    H += '<div style="font-size:16px;font-weight:800;color:#e2e8f0">' + detail.date + '</div></div>';
    H += '<div style="flex:1;min-width:130px;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:10px 14px;background:linear-gradient(160deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))">';
    H += '<div class="dim" style="font-size:10.5px;letter-spacing:.5px">榜单长度</div>';
    H += '<div style="font-size:16px;font-weight:800;color:#e2e8f0">Top ' + gs.length + '</div></div>';
    H += '<div style="flex:1;min-width:130px;border:1px solid rgba(96,165,250,0.25);border-radius:14px;padding:10px 14px;background:linear-gradient(160deg,rgba(59,130,246,0.12),rgba(16,185,129,0.06))">';
    H += '<div class="dim" style="font-size:10.5px;letter-spacing:.5px">🏆 筛选器命中</div>';
    H += '<div style="font-size:16px;font-weight:800;color:#4ade80">' + hitN + ' / ' + gs.length + '</div></div>';
    H += '</div>';

    // 表
    H += '<div style="border:1px solid rgba(255,255,255,0.07);border-radius:14px;overflow:hidden;background:rgba(255,255,255,0.015)">';
    H += '<table class="tbl fwd-tbl" style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr style="background:rgba(255,255,255,0.03)">';
    ['#', '币种', '24H 涨幅', '成交额', '筛选器状态', '入选价 → 上榜价', '埋伏收益', '领先(首次入选·次数)', '评分', ''].forEach(function (h) {
      H += '<th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;letter-spacing:.5px;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.06)">' + h + '</th>';
    });
    H += '</tr></thead><tbody>';
    gs.forEach(function (g, idx) {
      var isHit = g.ever_candidate;
      var lateHit = isHit && g.first_seen && g.first_seen > dgActive;
      var rowBg = g.is_candidate ? 'rgba(16,185,129,0.08)' : (isHit ? 'rgba(251,191,36,0.06)' : 'transparent');
      var statHtml;
      if (g.is_candidate) statHtml = '<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:10.5px;font-weight:700;background:rgba(16,185,129,0.15);color:#34d399">🏆 当天候选</span>';
      else if (lateHit) statHtml = '<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:10.5px;font-weight:600;background:rgba(239,68,68,0.12);color:#f87171">上榜后才入选</span>';
      else if (isHit) statHtml = '<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:10.5px;font-weight:700;background:rgba(251,191,36,0.12);color:#fbbf24">🏆 之前筛出过</span>';
      else statHtml = '<span class="dim">—</span>';
      var vol = g.volume_24h_usdt != null ? (g.volume_24h_usdt >= 1e9 ? (g.volume_24h_usdt / 1e9).toFixed(1) + 'B' : (g.volume_24h_usdt / 1e6).toFixed(1) + 'M') : '—';
      var leadHtml = g.ever_candidate ? (lateHit ? '<span class="dim">—</span>' : (g.lead_days > 0 ? '<span style="font-weight:700;color:#fbbf24">+' + g.lead_days + 'd</span>' : '<span style="color:#94a3b8">同天</span>')) : '<span class="dim">—</span>';
      var leadTimeHtml = '';
      if (g.ever_candidate && g.first_seen) {
        // first_seen 是 ISO 时间戳，转北京时间显示（分钟级）
        var ts = g.first_seen.indexOf('T') > 0 ? new Date(g.first_seen) : null;
        if (ts && !isNaN(ts.getTime())) {
          var bj = new Date(ts.getTime() + 8 * 3600 * 1000);
          var mo = ('0' + (bj.getUTCMonth() + 1)).slice(-2), dd = ('0' + bj.getUTCDate()).slice(-2);
          var hh = ('0' + bj.getUTCHours()).slice(-2), mm = ('0' + bj.getUTCMinutes()).slice(-2);
          leadTimeHtml = '<div style="font-size:10.5px;color:#64748b;margin-top:2px">' + mo + '-' + dd + ' ' + hh + ':' + mm + (g.cand_days > 1 ? ' · 入选' + g.cand_days + '天' : '') + '</div>';
        }
      }
      H += '<tr style="background:' + rowBg + ';animation:dgFadeIn .35s ease ' + Math.min(idx * 25, 400) + 'ms both;border-bottom:1px solid rgba(255,255,255,0.04);transition:background .15s" onmouseover="this.style.background=\\'rgba(255,255,255,0.05)\\'" onmouseout="this.style.background=\\'' + rowBg + '\\'">';
      H += '<td style="padding:9px 12px;color:#64748b;font-size:11px">' + g.rank + '</td>';
      H += '<td style="padding:9px 12px;font-weight:800;color:#e2e8f0">' + g.base_asset + '</td>';
      H += '<td style="padding:9px 12px">' + dgBar(g.change_24h_pct, maxChg) + '</td>';
      H += '<td style="padding:9px 12px;color:#94a3b8;font-size:11.5px">' + vol + '</td>';
      H += '<td style="padding:9px 12px">' + statHtml + '</td>';
      var entryCell = g.ever_candidate && g.entry_price != null ? '<span class="mono" style="font-size:11px;color:#94a3b8">' + g.entry_price + ' <span style="color:#475569">→</span> ' + g.gain_price + '</span>' : '<span class="dim">—</span>';
      var entryGainHtml;
      if (g.ever_candidate && g.entry_gain_pct != null) {
        var gc = g.entry_gain_pct >= 0 ? '#34d399' : '#f87171';
        var gf = g.entry_gain_pct >= 0 ? '+' : '';
        entryGainHtml = '<span style="font-weight:800;font-size:12px;color:' + gc + '">' + gf + (g.entry_gain_pct * 100).toFixed(1) + '%</span>';
      } else entryGainHtml = '<span class="dim">—</span>';
      H += '<td style="padding:9px 12px">' + entryCell + '</td>';
      H += '<td style="padding:9px 12px">' + entryGainHtml + '</td>';
      H += '<td style="padding:9px 12px">' + leadHtml + leadTimeHtml + '</td>';
      H += '<td style="padding:9px 12px;color:#94a3b8;font-size:11.5px">' + (g.forward_score != null ? g.forward_score : '—') + '</td>';
      H += '<td style="padding:9px 12px"><button class="btn btn-sm" style="padding:3px 10px;border-radius:8px;font-size:11px" onclick="evJump(\\'' + g.base_asset + '\\')">查看</button></td>';
      H += '</tr>';
    });
    H += '</tbody></table></div>';
    H += '<div class="dim" style="font-size:11px;margin-top:10px">🏆 当天候选 = 该币当天在筛选器候选池；之前筛出过 = 往前30天内入选过；**埋伏收益 = 首次入选日收盘价 → 上榜日收盘价**（= 筛选器提前埋伏的账面收益，非当日涨幅）。点击币可跳前导筛选。</div>';
  } else if (dgActive && loading) {
    H += dgSkeleton();
  } else {
    H += '<div class="empty-msg">点击上方日期查看当天涨幅榜</div>';
  }
  H += '<style>@keyframes dgFadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}</style>';
  H += '</div>';
  root.innerHTML = H;
}
function evJump(sym) {
  try { switchTab('forward'); } catch (e) {}
  setTimeout(function () {
    if (typeof fwdHistJump === 'function') fwdHistJump(sym);
  }, 300);
}

var __ovSwitchTab = (typeof switchTab === 'function') ? switchTab : null;
switchTab = function (t) {
  if (t === 'overlap') {
    curTab = t;
    var tb = document.getElementById('tabbar');
    if (tb) {
      tb.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
      var btn = tb.querySelector('.tab-overlap');
      if (btn) btn.classList.add('active');
    }
    if (!dgLoaded) dgLoad(); else renderDayList();
    return;
  }
  if (__ovSwitchTab) { __ovSwitchTab(t); return; }
  if (t === 'demon' && typeof renderDemon === 'function') { renderDemon(); return; }
  if (typeof rD === 'function') rD();
};
var __ovRD = (typeof rD === 'function') ? rD : null;
rD = function () {
  if (curTab === 'overlap') { renderDayList(); return; }
  if (__ovRD) __ovRD();
};

// 🔄 全局自动刷新：每 5 分钟按当前 tab 重新拉取（与 relay 更新周期对齐）
setInterval(function () {
  try {
    if (curTab === 'chip') { lX(); }
    else if (curTab === 'demon' && typeof demonLoad === 'function') { demonLoad(); }
    else if (curTab === 'coinfilter' && typeof coinfilterLoad === 'function') { coinfilterLoad(); }
    else if (curTab === 'forward' && typeof forwardLoad === 'function') { forwardLoad(); }
    else if (curTab === 'watchlist' && typeof scLoad === 'function') { scLoad(); }
    else if (curTab === 'overlap' && typeof dgLoad === 'function') { dgLoad(); }
  } catch (e) { /* 静默失败，下次再试 */ }
}, 300000); // 5 分钟

function scLoad() {
  var root = document.getElementById('root');
  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, 20000);
  root.innerHTML = '<div class="empty-msg">🧭 正在加载筛币工作台（L0 环境闸门 + 候选池 + 排除层 + 告警）...</div>';
  fetch(BASE + '/api/screener?t=' + Date.now(), { cache: 'no-store', signal: controller.signal }).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }).then(function (d) {
    var rows = d.data || [];
    if (d.error && !rows.length) throw new Error(d.error);
    scData = rows;
    scEnv = d.env || null;
    scSources = d.sources || null;
    scUpdated = d.updated || null;
    scStale = !!d.stale;
    scAppearTotal = d.appear_total || 0;
    scAhCache = {};
    scLoaded = true;
    renderScreener();
  }).catch(function (err) {
    var message = err.name === 'AbortError' ? '请求超时（20秒）' : err.message;
    root.innerHTML = '<div class="empty-msg">🧭 数据加载失败: ' + e(message) + '<br><br><button class="btn" onclick="scLoad()">重试</button></div>';
  }).finally(function () { clearTimeout(timer); });
}

function scFiltered() {
  var rows = scData.slice();
  if (scTag === 'acc') rows = rows.filter(function (r) { return r.effective_signal === 'acc_candidate' || r.effective_signal === 'acc_candidate_env_bear'; });
  else if (scTag === 'avoid') rows = rows.filter(function (r) { return r.event_day || r.forward_signal === 'avoid_event'; });
  else if (scTag === 'alerts') rows = rows.filter(function (r) { return r.alerts && r.alerts.length > 0; });
  else if (scTag === 'thin') rows = rows.filter(function (r) { return r.thin_book; });
  // OI 范围过滤（默认不设限）
  if (scOiMin != null) rows = rows.filter(function (r) { return (r.oi_value || 0) >= scOiMin; });
  if (scOiMax != null) rows = rows.filter(function (r) { return (r.oi_value || 0) <= scOiMax; });
  rows.sort(function (a, b) {
    var va = a[scSort] || 0, vb = b[scSort] || 0;
    return scAsc ? va - vb : vb - va;
  });
  return rows;
}

// OI 范围控件
function scSetOiRange() {
  var minEl = document.getElementById('sc-oi-min');
  var maxEl = document.getElementById('sc-oi-max');
  var minV = minEl ? parseFloat(minEl.value) : NaN;
  var maxV = maxEl ? parseFloat(maxEl.value) : NaN;
  scOiMin = !isNaN(minV) && minV > 0 ? minV * 1e6 : null;
  scOiMax = !isNaN(maxV) && maxV > 0 ? maxV * 1e6 : null;
  renderScreener();
}
function scClearOiRange() {
  scOiMin = null; scOiMax = null;
  var minEl = document.getElementById('sc-oi-min');
  var maxEl = document.getElementById('sc-oi-max');
  if (minEl) minEl.value = '';
  if (maxEl) maxEl.value = '';
  renderScreener();
}

function scSetPreset(t) { scTag = t; renderScreener(); }
function scSortBy(k) { if (scSort === k) scAsc = !scAsc; else { scSort = k; scAsc = false; } renderScreener(); }

function scAgeText(seconds) {
  if (seconds == null || !isFinite(seconds)) return '未知';
  if (seconds < 60) return Math.max(0, Math.round(seconds)) + '秒';
  if (seconds < 3600) return Math.round(seconds / 60) + '分钟';
  return (seconds / 3600).toFixed(1) + '小时';
}

function scFreshnessHtml() {
  if (!scSources) return '<div class="fwd-hint fwd-hint-na">数据源时间未知，候选池冻结</div>';
  var labels = { market: '市值', coinfilter: 'OI/行情', forward: '结构评分' };
  var parts = [];
  ['market', 'coinfilter', 'forward'].forEach(function (key) {
    var source = scSources[key] || {};
    var color = source.stale ? '#f87171' : '#34d399';
    parts.push('<span style="color:' + color + '">' + labels[key] + ' ' + scAgeText(source.age_seconds) + '</span>');
  });
  var updated = scUpdated ? new Date(scUpdated).toLocaleString('zh-CN') : '未知';
  var cls = scStale ? 'fwd-hint fwd-hint-bear' : 'fwd-hint fwd-hint-bull';
  var state = scStale ? '数据源过期，候选池已冻结' : '数据源正常';
  return '<div class="' + cls + '">' + state + ' · ' + parts.join(' · ') + ' · 有效快照 ' + e(updated) + '</div>';
}

function scEnvHtml() {
  if (scStale) return '<div class="fwd-hint fwd-hint-bear">L0 环境闸门：冻结（关键数据源过期）</div>';
  if (!scEnv || scEnv.up == null) return '<div class="fwd-hint fwd-hint-na">L0 环境闸门：未知（候选池冻结，保守）</div>';
  if (scEnv.up) return '<div class="fwd-hint fwd-hint-bull">L0 环境闸门：🟢 放行（BTC ' + fP(scEnv.close) + ' &gt; SMA20 ' + fP(scEnv.sma20) + '）— 蓄水候选可启用（验证：涨市 +0.8%/胜率56%）</div>';
  return '<div class="fwd-hint fwd-hint-bear">L0 环境闸门：🔴 冻结（BTC ' + fP(scEnv.close) + ' &lt; SMA20 ' + fP(scEnv.sma20) + '）— 蓄水候选降级为 env_bear，禁止按候选池进场（验证：跌市 -5.3%/胜率31%）</div>';
}

function scSigTag(r) {
  var t = [];
  if (r.effective_signal === 'acc_candidate') t.push('<span class="tag tag-acc">🧭蓄水候选</span>');
  else if (r.effective_signal === 'acc_candidate_env_bear') t.push('<span class="tag tag-watch">🧭候选(环境冻结)</span>');
  else if (r.effective_signal === 'acc_candidate_stale') t.push('<span class="tag tag-danger">候选(数据过期)</span>');
  else if (r.forward_signal === 'avoid_event' || r.event_day) t.push('<span class="tag tag-danger">⛔事件回避</span>');
  else if (r.forward_signal === 'watch') t.push('<span class="tag tag-watch">👁观察</span>');
  if (r.thin_book) t.push('<span class="tag tag-watch">⚠️薄盘口</span>');
  if (r.distribution) t.push('<span class="tag tag-danger">⛔大后期</span>');
  if (r.kill_longs) t.push('<span class="tag tag-watch">📉杀多</span>');
  if (r.neg_fund_pump) t.push('<span class="tag tag-danger">⛔负费率拉盘</span>');
  if (r.tags && r.tags.indexOf('squeeze') >= 0) t.push('<span class="tag tag-danger">🔥挤压</span>');
  if (r.tags && r.tags.indexOf('small_cap') >= 0) t.push('<span class="tag tag-acc">💎小币</span>');
  if (r.tags && r.tags.indexOf('early_pump') >= 0) t.push('<span class="tag tag-new">🚀拉升</span>');
  return t.join(' ');
}

function scAlertHtml(r) {
  if (!r.alerts || !r.alerts.length) return '';
  return r.alerts.map(function (a) { return '<span class="tag tag-new">🔔' + e(a) + '</span>'; }).join(' ');
}

function renderScreener() {
  var root = document.getElementById('root');
  var rows = scFiltered();
  var nAcc = scData.filter(function (r) { return r.effective_signal === 'acc_candidate' || r.effective_signal === 'acc_candidate_env_bear'; }).length;
  var nAvoid = scData.filter(function (r) { return r.event_day || r.forward_signal === 'avoid_event'; }).length;
  var nAlert = scData.filter(function (r) { return r.alerts && r.alerts.length > 0; }).length;
  var nThin = scData.filter(function (r) { return r.thin_book; }).length;

  var H = '<div class="fwd-wrap">';
  H += scFreshnessHtml();
  H += scEnvHtml();
  H += '<div class="fwd-bar">';
  H += '<button class="btn' + (scTag === '' ? ' btn-active' : '') + '" onclick="scSetPreset(\\'\\')">🎯 全部 (' + rows.length + ')</button>';
  H += '<button class="btn' + (scTag === 'acc' ? ' btn-active' : '') + '" onclick="scSetPreset(\\'acc\\')">🧭 候选池 (' + nAcc + ')</button>';
  H += '<button class="btn' + (scTag === 'avoid' ? ' btn-active' : '') + '" onclick="scSetPreset(\\'avoid\\')">⛔ 回避名单 (' + nAvoid + ')</button>';
  H += '<button class="btn' + (scTag === 'alerts' ? ' btn-active' : '') + '" onclick="scSetPreset(\\'alerts\\')">🔔 告警 (' + nAlert + ')</button>';
  H += '<button class="btn' + (scTag === 'thin' ? ' btn-active' : '') + '" onclick="scSetPreset(\\'thin\\')">⚠️ 薄盘口 (' + nThin + ')</button>';
  H += '</div>';
  H += '<div class="fwd-bar" style="flex-wrap:wrap;gap:6px;align-items:center">';
  H += '<span class="dim">OI 范围 (USDT):</span>';
  H += '<input id="sc-oi-min" type="number" placeholder="最小 M" style="width:90px;padding:4px 6px;background:var(--surface-alt);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px" value="' + (scOiMin != null ? (scOiMin / 1e6) : '') + '" onkeydown="if(event.key===' + "'Enter'" + ')scSetOiRange()">';
  H += '<span class="dim">—</span>';
  H += '<input id="sc-oi-max" type="number" placeholder="最大 M" style="width:90px;padding:4px 6px;background:var(--surface-alt);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px" value="' + (scOiMax != null ? (scOiMax / 1e6) : '') + '" onkeydown="if(event.key===' + "'Enter'" + ')scSetOiRange()">';
  H += '<button class="btn btn-sm" style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;font-weight:700" onclick="scSetOiRange()">✓ 确定</button>';
  H += '<button class="btn btn-sm" onclick="scClearOiRange()">清除</button>';
  H += '<span class="dim" id="sc-oi-status">' + (scOiMin != null || scOiMax != null ? '🔍 已过滤 OI ' + (scOiMin != null ? (scOiMin/1e6) : '0') + 'M ~ ' + (scOiMax != null ? (scOiMax/1e6) : '∞') + 'M' : '未过滤（全市场）') + '</span>';
  H += '</div>';
  H += '<div class="fwd-stats">🧭候选 ' + nAcc + ' · ⛔回避 ' + nAvoid + ' · 🔔告警 ' + nAlert + ' · ⚠️薄盘口 ' + nThin + (scAppearTotal > 0 ? ' · 📊 7天出现 ' + scAppearTotal + ' 次' : '') + '</div>';
  H += '<div class="fwd-bar" style="margin-top:10px;flex-wrap:wrap;gap:6px;align-items:center">';
  H += '<span class="dim" style="font-weight:700;color:var(--accent,#60a5fa)">🕘 历史出现</span>';
  H += '<span class="dim">时间范围:</span>';
  [1,4,6,12,24,48,72,96,120].forEach(function (h) {
    H += '<button class="btn btn-sm' + (scAhHours === h ? ' btn-active' : '') + '" onclick="scAhSet(' + h + ')">' + (h < 24 ? h + 'h' : (h % 24 === 0 ? (h / 24) + 'd' : h + 'h')) + '</button>';
  });
  H += '<button class="btn btn-sm" onclick="scAhLoad()" style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;font-weight:700">查询</button>';
  H += '<span class="dim" id="sc-ah-status"></span>';
  H += '</div>';
  H += '<div id="sc-ah-panel"></div>';

  if (!rows.length) {
    H += '<div class="empty-msg">没有符合条件的币。</div>';
  } else {
    H += '<div class="table-wrap"><table class="tbl fwd-tbl"><thead><tr>';
    H += '<th class="sortable" onclick="scSortBy(\\'symbol\\')">币种</th>';
    H += '<th class="sortable" onclick="scSortBy(\\'price\\')">价格</th>';
    H += '<th class="sortable" onclick="scSortBy(\\'change_24h_pct\\')">24h%</th>';
    H += '<th class="sortable" onclick="scSortBy(\\'market_cap\\')">市值</th>';
    H += '<th class="sortable" onclick="scSortBy(\\'oi_value\\')">OI</th>';
    H += '<th class="sortable" onclick="scSortBy(\\'volume_oi_ratio\\')">额/OI</th>';
    H += '<th class="sortable" onclick="scSortBy(\\'funding_rate_pct\\')">资费%</th>';
    H += '<th class="sortable" onclick="scSortBy(\\'drawdown_60d\\')">回撤60d</th>';
    H += '<th class="sortable" onclick="scSortBy(\\'range_20d\\')">横盘20d</th>';
    H += '<th class="sortable" onclick="scSortBy(\\'vol_shrink_20d\\')">缩量</th>';
    H += '<th class="sortable" onclick="scSortBy(\\'forward_score\\')">评分</th>';
    H += '<th class="sortable" onclick="scSortBy(\\'appear_count\\')">出现次数</th>';
    H += '<th>信号</th><th>告警</th>';
    H += '</tr></thead><tbody>';
    rows.slice(0, 300).forEach(function (r) {
      var isAvoid = r.event_day || r.forward_signal === 'avoid_event';
      var rowCls = isAvoid ? 'fwd-avoid' : (r.effective_signal === 'acc_candidate' ? 'fwd-acc' : '');
      H += '<tr class="' + rowCls + '">';
      H += '<td class="mono"><b>' + e(r.base_asset) + '</b></td>';
      H += '<td class="mono">' + (r.price != null ? fP(r.price) : '—') + '</td>';
      H += '<td class="' + ((r.change_24h_pct || 0) >= 0 ? 'up' : 'down') + '">' + (r.change_24h_pct != null ? fC(r.change_24h_pct) : '—') + '</td>';
      H += '<td class="mono">' + (r.market_cap != null ? '$' + (r.market_cap / 1e6).toFixed(1) + 'M' : '—') + '</td>';
      H += '<td class="mono">' + (r.oi_value != null ? '$' + (r.oi_value / 1e6).toFixed(1) + 'M' : '—') + '</td>';
      H += '<td class="mono">' + (r.volume_oi_ratio != null ? r.volume_oi_ratio.toFixed(1) + 'x' : '—') + '</td>';
      H += '<td class="mono">' + (r.funding_rate_pct != null ? r.funding_rate_pct.toFixed(3) + '%' : '—') + '</td>';
      H += '<td class="mono">' + (r.drawdown_60d != null ? (r.drawdown_60d * 100).toFixed(0) + '%' : '—') + '</td>';
      H += '<td class="mono">' + (r.range_20d != null ? (r.range_20d * 100).toFixed(0) + '%' : '—') + '</td>';
      H += '<td class="mono">' + (r.vol_shrink_20d != null ? (r.vol_shrink_20d * 100).toFixed(0) + '%' : '—') + '</td>';
      H += '<td class="mono score">' + (r.forward_score != null ? r.forward_score : '—') + '</td>';
      H += '<td class="mono" style="' + (r.appear_count >= 10 ? 'color:#fbbf24;font-weight:800' : (r.appear_count >= 5 ? 'color:#f59e0b;font-weight:700' : 'color:#94a3b8')) + '">' + (r.appear_count > 0 ? r.appear_count + '次' : '—') + '</td>';
      H += '<td>' + scSigTag(r) + '</td>';
      H += '<td>' + scAlertHtml(r) + '</td>';
      H += '</tr>';
    });
    H += '</tbody></table></div>';
  }
  H += '<div class="fwd-foot dim">L0 环境闸门：BTC vs SMA20（验证：涨市 +0.8%/56%，跌市 -5.3%/31%）· L1 候选池：硬门槛五要素（dn10 3.3% vs 9.7% 下行保护）· L2 排除：事件回避(额/OI≥5, fwd5 -1.7%)/薄盘口/大后期/杀多/负费率拉盘 · L4 告警：ST-Spring/大阳线后盘整/放量+OI跟上/深负资费。叙事因子（大阳线/缓涨/Spring/资费）为 +1 加分，未统计验证。仅供研究参考，不构成投资建议。</div>';
  H += '</div>';
  root.innerHTML = H;
}
</script>
</body></html>
`;

const KV_HTML_KEY='dashboard_html';
function json(d,s=200){return new Response(JSON.stringify(d),{status:s,headers:{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'}})}
function html(c,s=200){return new Response(c,{status:s,headers:{'Content-Type':'text/html; charset=utf-8','Access-Control-Allow-Origin':'*'}})}
function normalizePath(p){for(const pre of['/screener','']){if(p===pre||p===pre+'/')return'/';if(p.startsWith(pre+'/'))return p.slice(pre.length)}return p}
function matchMarketKey(ba,sym,map){const u=(ba||'').toUpperCase();if(map[u])return map[u];if(map[sym])return map[sym];const c=u.replace(/^\d{4,}x?/,'');if(c&&c!==u&&map[c])return map[c];return null}
function crossValidateRatio(a,b){if(a==null||b==null)return null;const mx=Math.max(a,b),mn=Math.min(a,b);if(mx===0)return null;const d=(mx-mn)/mx;if(d>0.3)return{conflicted:true,cmc_ratio:Math.round(a*10000)/10000,cg_ratio:Math.round(b*10000)/10000,discrepancy:Math.round(d*100)};return null}
async function refreshData(kv,env){
  const pR=await kv.get('exchange_proxy').catch(()=>null);let pU=null;if(pR){try{pU=JSON.parse(pR).updated||null}catch(e){}}const pA=pU?Date.now()-new Date(pU).getTime():Infinity,has=pR&&pA<5*60*1000;
  let bn=null,bb=null,ok=null,src=0;
  if(has){try{const p=JSON.parse(pR);if(p.binance){bn=p.binance;src++}if(p.bybit){bb=p.bybit;src++}if(p.okx){ok=p.okx;src++}}catch(e){}}
  if(!has){const[a,b,c]=await Promise.allSettled([fBN(),fBB(),fOK()]);if(a.status==='fulfilled'){bn=a.value;src++}if(b.status==='fulfilled'){bb=b.value;src++}if(c.status==='fulfilled'){ok=c.value;src++}}
  const dbg={};dbg.Binance=bn?{t:bn.length,ok:true}:{e:'unavail'};dbg.Bybit=bb?{t:bb.length,ok:true}:{e:'unavail'};dbg.OKX=ok?{t:ok.length,ok:true}:{e:'unavail'};dbg.proxy={active:has,s:src};await kv.put('exchange_debug',JSON.stringify(dbg)).catch(()=>{});
  const cmc=await fCMC(env).catch(()=>null);let cg=null;const lC=await kv.get('last_cg_fetch').catch(()=>null);if(!lC||Date.now()-new Date(lC).getTime()>36e5){cg=await fCG(env).catch(()=>null);if(cg)await kv.put('last_cg_fetch',new Date().toISOString()).catch(()=>{})}
  const ex=[];{const s={};for(const r of[bn,bb,ok])if(r)for(const row of r){const sym=row.symbol;if(!s[sym]||(row.volume_24h_usdt||0)>(s[sym].volume_24h_usdt||0))s[sym]=row}for(const k of Object.keys(s))ex.push(s[k])}
  function va(coin,k){if(!cg)return coin;const g=cg[k]||matchMarketKey(coin.base_asset,coin.symbol,cg);if(!g)return coin;const cf=crossValidateRatio(coin.circulating_ratio,g.circulating_ratio);if(cf){coin.data_conflict=true;coin.discrepancy_pct=cf.discrepancy;coin.cmc_ratio=cf.cmc_ratio;coin.cg_ratio=cf.cg_ratio;if(coin.market_cap!=null&&g.market_cap!=null&&cf.cg_ratio<cf.cmc_ratio*0.5&&g.market_cap<coin.market_cap*0.5)coin.stale_cg_data=true;coin.unlock_risk=uL((coin.circulating_ratio+g.circulating_ratio)/2)}return coin}
  if(ex.length>0&&cmc&&src>=2){const m=[];for(const row of ex){const ba=(row.base_asset||'').toUpperCase(),c=matchMarketKey(ba,row.symbol,cmc),mcap=c?c.market_cap:null,cr=c?c.circulating_ratio:null;let coin={symbol:row.symbol,name:c?c.name:ba,base_asset:row.base_asset,price:row.price,market_cap:mcap,circulating_supply:c?c.circulating_supply:null,total_supply:c?c.total_supply:null,max_supply:c?c.max_supply:null,circulating_ratio:cr,cmc_rank:c?c.cmc_rank:null,volume_24h_usdt:row.volume_24h_usdt,percent_change_7d:c?c.percent_change_7d:null,change_24h_pct:row.change_24h_pct,amplitude_24h_pct:row.amplitude_24h_pct,star_rating:aS(mcap,cr,false),unlock_risk:uL(cr),momentum_alert:!!(c&&c.percent_change_7d!=null&&c.percent_change_7d>0&&row.amplitude_24h_pct>10)};coin=va(coin,ba);coin.star_rating=aS(coin.market_cap,coin.circulating_ratio,coin.data_conflict,coin.stale_cg_data);m.push(coin)}
    const f=m.filter(r=>r.market_cap!=null&&r.market_cap>=15e6);if(f.length>0){await kv.put('data',JSON.stringify(f));await kv.put('last_updated',new Date().toISOString());await kv.put('count',String(f.length));console.log('B1:',f.length,'coins');return}}
  if(cmc){const exMap={};for(const row of ex){const k=(row.base_asset||'').toUpperCase();exMap[k]=row;exMap[row.symbol]=row};const coins=[];for(const[sym,c] of Object.entries(cmc)){if(c.market_cap==null||c.market_cap<15e6)continue;const xr=exMap[sym]||exMap[(c.symbol||'').toUpperCase()]||matchMarketKey((c.symbol||'').toUpperCase(),sym,exMap);let coin={symbol:c.symbol||'',name:c.name||(c.symbol||'').toUpperCase(),base_asset:(c.symbol||'').toUpperCase(),price:xr?xr.price:c.price,market_cap:c.market_cap,circulating_supply:c.circulating_supply,total_supply:c.total_supply,max_supply:c.max_supply,circulating_ratio:c.circulating_ratio,cmc_rank:c.cmc_rank,volume_24h_usdt:xr?xr.volume_24h_usdt:c.volume_24h_usdt,percent_change_7d:c.percent_change_7d,change_24h_pct:xr?xr.change_24h_pct:null,amplitude_24h_pct:xr?xr.amplitude_24h_pct:null,star_rating:aS(c.market_cap,c.circulating_ratio,false),unlock_risk:uL(c.circulating_ratio),momentum_alert:!!(xr&&c.percent_change_7d>0&&xr.amplitude_24h_pct>10)};coin=va(coin,sym);if(coin.circulating_ratio>1){coin.supply_data_error=true;coin.circulating_ratio=1};if(coin.circulating_ratio>=1&&(!coin.volume_24h_usdt||coin.volume_24h_usdt<100)){coin.low_confidence_supply=true};coin.star_rating=aS(coin.market_cap,coin.circulating_ratio,coin.data_conflict||coin.supply_data_error,coin.stale_cg_data);coins.push(coin)}
    if(coins.length>0){await kv.put('data',JSON.stringify(coins));await kv.put('last_updated',new Date().toISOString());await kv.put('count',String(coins.length));console.log('B2:',coins.length,'coins');return}}
  if(ex.length>0){const coins=ex.map(r=>({symbol:r.symbol,name:(r.base_asset||'').toUpperCase(),base_asset:r.base_asset,price:r.price,market_cap:null,circulating_supply:null,total_supply:null,max_supply:null,circulating_ratio:null,cmc_rank:null,volume_24h_usdt:r.volume_24h_usdt,percent_change_7d:null,change_24h_pct:r.change_24h_pct,amplitude_24h_pct:r.amplitude_24h_pct,star_rating:0,unlock_risk:uL(null),momentum_alert:false}));await kv.put('data',JSON.stringify(coins));await kv.put('last_updated',new Date().toISOString());await kv.put('count',String(coins.length));console.log('B3:',coins.length,'coins')}
}
async function fBB(){const c=new AbortController,t=setTimeout(()=>c.abort(),15e3);try{const[i,tk]=await Promise.all([fetch('https://api.bybit.com/v5/market/instruments-info?category=linear',{signal:c.signal}),fetch('https://api.bybit.com/v5/market/tickers?category=linear',{signal:c.signal})]);if(!i.ok)throw new Error('BB i:'+i.status);if(!tk.ok)throw new Error('BB t:'+tk.status);const id=await i.json(),syms=new Set(id.result.list.filter(s=>s.status==='Trading'&&s.quoteCoin==='USDT'&&s.contractType==='LinearPerpetual').map(s=>s.symbol)),td=await tk.json(),map=new Map;for(const t of td.result.list)map.set(t.symbol,t);const rows=[];for(const s of syms){const t=map.get(s);if(!t)continue;const p=parseFloat(t.lastPrice),h=parseFloat(t.highPrice24h),l=parseFloat(t.lowPrice24h),pc=parseFloat(t.price24hPcnt||'0')*100;if(isNaN(p)||p<=0)continue;rows.push({symbol:s,base_asset:s.replace('USDT',''),price:p,change_24h_pct:Math.round(pc*100)/100,amplitude_24h_pct:Math.round(((h-l)/p)*100*100)/100,volume_24h_usdt:parseFloat(t.turnover24h||'0')})}return rows}finally{clearTimeout(t)}}
async function fBN(){const c=new AbortController,t=setTimeout(()=>c.abort(),15e3);try{const r=await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr',{signal:c.signal});if(!r.ok)throw new Error('BN:'+r.status);const d=await r.json(),rows=[];for(const t of d){if(!t.symbol.endsWith('USDT'))continue;const p=parseFloat(t.lastPrice),h=parseFloat(t.highPrice),l=parseFloat(t.lowPrice);if(isNaN(p)||p<=0)continue;rows.push({symbol:t.symbol,base_asset:t.symbol.replace('USDT',''),price:p,change_24h_pct:Math.round(parseFloat(t.priceChangePercent||'0')*100)/100,amplitude_24h_pct:h&&l&&h>0&&l>0?Math.round(((h-l)/p)*100*100)/100:0,volume_24h_usdt:parseFloat(t.quoteVolume||'0')})}return rows}finally{clearTimeout(t)}}
async function fOK(){const c=new AbortController,t=setTimeout(()=>c.abort(),15e3);try{const r=await fetch('https://www.okx.com/api/v5/market/tickers?instType=SWAP',{signal:c.signal});if(!r.ok)throw new Error('OK:'+r.status);const d=await r.json();if(!d.data)return[];const rows=[];for(const t of d.data){if(!t.instId.endsWith('-USDT-SWAP'))continue;const p=parseFloat(t.last),h=parseFloat(t.high24h),l=parseFloat(t.low24h),o=parseFloat(t.open24h);if(isNaN(p)||p<=0)continue;const ba=t.instId.replace('-USDT-SWAP','');rows.push({symbol:ba+'USDT',base_asset:ba,price:p,change_24h_pct:o&&o>0?Math.round(((p-o)/o)*100*100)/100:0,amplitude_24h_pct:h&&l&&h>0&&l>0?Math.round(((h-l)/p)*100*100)/100:0,volume_24h_usdt:parseFloat(t.volCcy24h||'0')})}return rows}finally{clearTimeout(t)}}
async function fCMC(env){const k=env?.CMC_API_KEY||(typeof CMC_API_KEY!==`undefined`?CMC_API_KEY:null);if(!k)return null;try{const c=new AbortController,t=setTimeout(()=>c.abort(),1e4);try{const r=await fetch('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=1&limit=1000&convert=USD',{headers:{'X-CMC_PRO_API_KEY':k,'Accept':'application/json'},signal:c.signal});if(r.ok){const d=await r.json();return pC(d)}try{const e=await r.json();console.error('CMC err:',r.status,e)}catch(e){}}finally{clearTimeout(t)}}catch(e){console.error('CMC fetch err:',e)}return null}
function pC(d){const m={};for(const c of d.data){const q=c.quote.USD,cs=c.circulating_supply,ts=c.total_supply,ms=c.max_supply;let cr=null;if(ts&&ts>0&&cs!=null)cr=cs/ts;else if(ms&&ms>0&&cs!=null)cr=cs/ms;m[c.symbol.toUpperCase()]={symbol:c.symbol,market_cap:q.market_cap||null,circulating_supply:cs,total_supply:ts,max_supply:ms,circulating_ratio:cr!=null?Math.round(cr*10000)/10000:null,cmc_rank:c.cmc_rank||null,name:c.name||c.symbol,percent_change_7d:q.percent_change_7d!=null?Math.round(q.percent_change_7d*100)/100:null,price:q.price!=null?Math.round(q.price*10000)/10000:null,volume_24h_usdt:q.volume_24h!=null?Math.round(q.volume_24h*100)/100:null};}return m}
async function fCG(env){const c=new AbortController;try{const h={'User-Agent':'CryptoScreener/5.0'};const cgK=env?.COINGECKO_API_KEY||(typeof COINGECKO_API_KEY!==`undefined`?COINGECKO_API_KEY:null);if(cgK)h['x-cg-demo-api-key']=cgK;const pages=[1,2,3,4,5,6,7,8];const r=[];for(const p of pages){const t=setTimeout(()=>c.abort(),15e3);try{const x=await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page='+p+'&sparkline=false&price_change_percentage=7d',{headers:h,signal:c.signal});if(!x.ok)throw new Error('CG p'+p+' '+x.status);try{r.push({status:'fulfilled',value:await x.json()})}catch(e){r.push({status:'rejected',reason:e})}}catch(e){r.push({status:'rejected',reason:e})}finally{clearTimeout(t)}await new Promise(d=>setTimeout(d,1300))}const m={};for(const result of r){if(result.status!=='fulfilled'||!Array.isArray(result.value))continue;for(const c of result.value){const sym=(c.symbol||'').toUpperCase();if(m[sym])continue;const cs=c.circulating_supply,ts=c.total_supply;let cr=null;if(ts&&ts>0&&cs!=null)cr=cs/ts;m[sym]={symbol:sym,market_cap:c.market_cap||null,circulating_supply:cs,total_supply:ts,max_supply:c.max_supply||null,circulating_ratio:cr!=null?Math.round(cr*10000)/10000:null,cmc_rank:c.market_cap_rank||null,name:c.name||sym,percent_change_7d:c.price_change_percentage_7d_in_currency!=null?Math.round(c.price_change_percentage_7d_in_currency*100)/100:null,price:c.current_price!=null?Math.round(c.current_price*10000)/10000:null,volume_24h_usdt:c.total_volume!=null?Math.round(c.total_volume*100)/100:null}}}console.log('CG:'+Object.keys(m).length+' coins');return Object.keys(m).length>0?m:null}catch(e){console.error('CG err:',e);return null}}
function aS(mcap,cr,conflicted,staleCg){if(mcap==null||cr==null||mcap<15e6)return 0;const raw=cS(mcap,cr);if(conflicted)return staleCg?Math.max(1,raw-1):raw;return raw}
function cS(mcap,cr){if(mcap<=5e8&&cr<0.3)return 5;if(mcap<=1e8&&cr<0.5)return 4;if(mcap<=5e8&&cr<0.5)return 3;if(mcap<=2e9&&cr<0.5)return 3;if(mcap>2e9)return cr>=0.5?1:2;if(cr>=0.8)return 1;return 2}
function uL(cr){if(cr==null)return '\u26a0\ufe0f \u672a\u77e5';if(cr<0.3)return '\ud83d\udd34 \u9ad8\u901a\u80c0\u98ce\u9669';if(cr<0.5)return '\ud83d\udfe1 \u89e3\u9501\u98ce\u9669';return '\ud83d\udfe2 \u4f4e\u98ce\u9669'}
addEventListener('fetch', event => {
  const url=new URL(event.request.url),path=normalizePath(url.pathname);
  if(event.request.method==='OPTIONS')return event.respondWith(new Response(null,{headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,X-Auth-Key'}}));
  if(path==='/api/debug-exchange')return event.respondWith(hDD(MARKET_DATA));
  if(path==='/api/data')return event.respondWith(hDA(MARKET_DATA));
  if(path==='/api/refresh'&&event.request.method==='POST')return event.respondWith(hRF(MARKET_DATA));
  if(path==='/api/upload'&&event.request.method==='POST')return event.respondWith(hUP(event.request,MARKET_DATA));
  if(path==='/api/relay-tickers'&&event.request.method==='POST')return event.respondWith(hRL(event.request,MARKET_DATA));
  if(path==='/api/demon')return event.respondWith(hDM(MARKET_DATA));
  if(path==='/api/relay-demon'&&event.request.method==='POST')return event.respondWith(hRD(event.request,MARKET_DATA));
  if(path==='/api/coinfilter')return event.respondWith(hCF(MARKET_DATA));
  if(path==='/api/relay-coinfilter'&&event.request.method==='POST')return event.respondWith(hRCF(event.request,MARKET_DATA));
  if(path==='/api/forward')return event.respondWith(hFW(MARKET_DATA));
  if(path==='/api/forward-history')return event.respondWith(hFH(MARKET_DATA,event.request.url));
  if(path==='/api/overlap-stats')return event.respondWith(hOV(MARKET_DATA,event.request.url));
  if(path==='/api/events')return event.respondWith(hEV(MARKET_DATA,event.request.url));
  if(path==='/api/day-gainers')return event.respondWith(hDG(MARKET_DATA,event.request.url));
  if(path==='/api/gainer-backfill'&&event.request.method==='POST')return event.respondWith(hGB(event.request,MARKET_DATA));
  if(path==='/api/perf')return event.respondWith(hPA(MARKET_DATA,event.request.url));
  if(path==='/api/relay-forward'&&event.request.method==='POST')return event.respondWith(hRWF(event.request,MARKET_DATA));
  if(path==='/api/mentioned')return event.respondWith(hML(MARKET_DATA));
  if(path==='/api/screener')return event.respondWith(hSC(MARKET_DATA));
  if(path==='/api/coin-history')return event.respondWith(hCH(MARKET_DATA,event.request.url));
  if(path==='/api/appear-history')return event.respondWith(hAH(MARKET_DATA,event.request.url));
  if(path==='/api/status')return event.respondWith(hST(MARKET_DATA));
  event.respondWith(hDB(MARKET_DATA));
});
addEventListener('scheduled', event => {
  event.waitUntil((async()=>{console.log('Refresh start');await refreshData(MARKET_DATA,{});await hDD(MARKET_DATA).catch(()=>{});await healGainerArchive(MARKET_DATA).catch(e=>console.log('heal error:',e.message));console.log('Refresh done')})());
});
// 🩹 涨幅榜归档自愈：当天 gainer_hist 为空时，从 exchange_proxy（relay 最新推送）回填
// 仅当 exchange_proxy 在 30 分钟内更新过才回填，防止 relay 长期故障时用旧数据污染归档
async function healGainerArchive(kv){
  const bj=new Date(Date.now()+8*3600*1000);const day=bj.toISOString().slice(0,10);
  const dayKey='gainer_hist_'+day.replace(/-/g,'');
  const prev=await kv.get(dayKey);
  let count=0;
  if(prev){try{count=(JSON.parse(prev).gainers||[]).length}catch(e){}}
  if(count>0)return;
  const pR=await kv.get('exchange_proxy').catch(()=>null);
  if(!pR)return;
  let p;try{p=JSON.parse(pR)}catch(e){return}
  const pU=p.updated?Date.now()-new Date(p.updated).getTime():Infinity;
  if(pU>30*60*1000){console.log('heal skip: exchange_proxy stale',pU/60000,'min');return}
  if(!Array.isArray(p.binance)||p.binance.length===0)return;
  const n=p.updated||new Date().toISOString();
  const bySym=new Map();
  for(const t of p.binance){
    if(!t||!t.symbol||t.symbol.indexOf('USDT')<0)continue;
    const chg=parseFloat(t.change_24h_pct!=null?t.change_24h_pct:t.priceChangePercent);
    const vol=parseFloat(t.volume_24h_usdt!=null?t.volume_24h_usdt:t.quoteVolume);
    const px=parseFloat(t.price!=null?t.price:t.lastPrice);
    if(isNaN(chg))continue;
    bySym.set(t.symbol,{symbol:t.symbol,base_asset:t.symbol.replace('USDT',''),change_24h_pct:chg,volume_24h_usdt:vol,last_price:isNaN(px)?null:px});
  }
  // 写前二次读 + 合并写（报告 C7）：scheduled 自愈与 relay 实时归档并发 RMW 同一 key，
  // 直接覆盖写会用旧快照冲掉 hRL 刚写入的实时数据；KV 无条件写 API，
  // 最小化覆盖窗口：二次读取若已有数据则合并（同 hRL 的 bySym 语义），不再标 healed
  const latest=await kv.get(dayKey).catch(()=>null);
  if(latest){
    try{
      const lp=JSON.parse(latest);
      if((lp.gainers||[]).length>0){
        const m=new Map(lp.gainers.map(g=>[g.symbol,g]));
        for(const g of bySym.values()){
          const ex=m.get(g.symbol);
          if(ex){
            if(g.change_24h_pct>ex.change_24h_pct){ex.change_24h_pct=g.change_24h_pct;ex.volume_24h_usdt=g.volume_24h_usdt}
            if(!isNaN(g.last_price))ex.last_price=g.last_price;
          }else m.set(g.symbol,g);
        }
        await kv.put(dayKey,JSON.stringify({date:day,gainers:Array.from(m.values()),updated:n}));
        console.log('healed gainer_hist',day,bySym.size,'(merged with live data)');
        return;
      }
    }catch(e){}
  }
  await kv.put(dayKey,JSON.stringify({date:day,gainers:Array.from(bySym.values()),updated:n,healed:true}));
  console.log('healed gainer_hist',day,bySym.size);
}
async function hDA(kv){const r=await kv.get('data'),u=await kv.get('last_updated');if(!r)return json({ok:false,error:'no data',data:[],updated:null});const p=JSON.parse(r);return json({ok:true,updated:u,data:p,count:p.length})}
async function hDB(kv){const h=await kv.get(KV_HTML_KEY);if(h)return html(h);if(globalThis.INLINE_HTML)return html(globalThis.INLINE_HTML);return new Response('No dashboard',{status:503})}
async function hRF(kv){const mem=await kv.get('data');console.log('Refresh start, current:',mem?JSON.parse(mem).length:0);await refreshData(kv,{});const u=await kv.get('last_updated'),c=await kv.get('count');return json({ok:true,updated:u,coins:parseInt(c||'0')})}
async function hUP(req,kv){const k=UPLOAD_AUTH_KEY,a=req.headers.get('X-Auth-Key');if(!k||a!==k)return json({ok:false,error:'Unauthorized'},401);try{const b=await req.json();if(!Array.isArray(b))return json({ok:false,error:'Must be array'},400);await kv.put('data',JSON.stringify(b));const n=new Date().toISOString();await kv.put('last_updated',n);await kv.put('count',String(b.length));return json({ok:true,coins:b.length,updated:n})}catch(e){return json({ok:false,error:e.message},400)}}
async function hRL(req,kv){const k=RELAY_AUTH_KEY,a=req.headers.get('X-Auth-Key');if(!k||a!==k)return json({ok:false,error:'Unauthorized'},401);try{const b=await req.json();if(!b||typeof b!=='object')return json({ok:false,error:'Must be object'},400);const n=new Date().toISOString();await kv.put('exchange_proxy',JSON.stringify({...b,updated:n}));
  // ── 每日涨幅榜归档（gainer_hist_YYYYMMDD 北京日界，当日快照，覆盖写回）──
  try{
    if(Array.isArray(b.binance)&&b.binance.length>0){
      const bj=new Date(new Date(n).getTime()+8*3600*1000);const day=bj.toISOString().slice(0,10);
      const dayKey='gainer_hist_'+day.replace(/-/g,'');
      const prev=await kv.get(dayKey);
      const hist=prev?JSON.parse(prev):{date:day,gainers:[],updated:n};
      const bySym=new Map((hist.gainers||[]).map(g=>[g.symbol,g]));
      for(const t of b.binance){
        if(!t||typeof t!=='object'||!t.symbol)continue;
        if(t.symbol.indexOf('USDT')<0)continue;
        // 兼容两种字段名：relay 推送的转换字段 / Binance 原始字段
        const chg=parseFloat(t.change_24h_pct!=null?t.change_24h_pct:t.priceChangePercent);
        const vol=parseFloat(t.volume_24h_usdt!=null?t.volume_24h_usdt:t.quoteVolume);
        const px=parseFloat(t.price!=null?t.price:t.lastPrice);
        if(isNaN(chg))continue;
        // 当日最高涨幅（覆盖写回）+ 收盘价快照（用于 fwd 收益）
        const ex=bySym.get(t.symbol);
        if(ex){ if(chg>ex.change_24h_pct){ex.change_24h_pct=chg;ex.volume_24h_usdt=vol;} if(!isNaN(px))ex.last_price=px; }
        else bySym.set(t.symbol,{symbol:t.symbol,base_asset:t.symbol.replace('USDT',''),change_24h_pct:chg,volume_24h_usdt:vol,last_price:isNaN(px)?null:px});
      }
      hist.gainers=Array.from(bySym.values());hist.updated=n;delete hist.healed;delete hist.backfilled;
      await kv.put(dayKey,JSON.stringify(hist));
    }
  }catch(e){console.log('gainer_hist archive error:',e.message)}
  const s=[];if(b.binance)s.push('binance:'+b.binance.length);if(b.bybit)s.push('bybit:'+b.bybit.length);if(b.okx)s.push('okx:'+b.okx.length);return json({ok:true,sources:s.join(', '),updated:n})}catch(e){return json({ok:false,error:e.message},400)}}
async function hRD(req,kv){const k=DEMON_RELAY_KEY,a=req.headers.get('X-Auth-Key');if(!k||a!==k)return json({ok:false,error:'Unauthorized'},401);try{const b=await req.json();if(!b||!Array.isArray(b.data))return json({ok:false,error:'Must be {data:[...]}'},400);const n=new Date().toISOString();await kv.put('demon_data',JSON.stringify({data:b.data,updated:n,count:b.data.length}));return json({ok:true,coins:b.data.length,updated:n})}catch(e){return json({ok:false,error:e.message},400)}}
async function hDM(kv){const r=await kv.get('demon_data');if(!r)return json({ok:false,error:'no demon data',data:[],updated:null});const p=JSON.parse(r);const arr=Array.isArray(p)?p:p.data||[];return json({ok:true,updated:p.updated||null,data:arr,count:p.count||arr.length})}
async function hRCF(req,kv){const k=DEMON_RELAY_KEY,a=req.headers.get('X-Auth-Key');if(!k||a!==k)return json({ok:false,error:'Unauthorized'},401);try{const b=await req.json();if(!b||!Array.isArray(b.data))return json({ok:false,error:'Must be {data:[...]}'},400);const rows=b.data;const usable=rows.filter(c=>c&&c.symbol&&c.base_asset&&Number.isFinite(c.price)&&Number.isFinite(c.oi_value)&&Number.isFinite(c.oi_contracts)).length;const minUsable=Math.max(100,Math.ceil(rows.length*0.8));if(rows.length<100||usable<minUsable)return json({ok:false,error:'Incomplete coinfilter snapshot rejected',quality:{row_count:rows.length,usable,min_usable:minUsable}},422);const n=b.updated||new Date().toISOString();const payload={data:rows,updated:n,count:rows.length,quality:{usable,coverage:Math.round(usable/rows.length*1000)/1000}};await kv.put('coinfilter_data',JSON.stringify(payload));if(Array.isArray(b.mentioned)&&b.mentioned.length>0){await kv.put('mentioned_list',JSON.stringify(b.mentioned)).catch(()=>{})}return json({ok:true,coins:rows.length,updated:n,quality:payload.quality})}catch(e){return json({ok:false,error:e.message},400)}}
async function hCF(kv){const r=await kv.get('coinfilter_data');if(!r)return json({ok:false,error:'no coinfilter data',data:[],updated:null,count:0});const p=JSON.parse(r);const arr=Array.isArray(p)?p:p.data||[];return json({ok:true,updated:p.updated||null,count:p.count||arr.length,quality:p.quality||null,data:arr})}
async function hRWF(req,kv){const k=DEMON_RELAY_KEY,a=req.headers.get('X-Auth-Key');if(!k||a!==k)return json({ok:false,error:'Unauthorized'},401);try{const b=await req.json();if(!b||!Array.isArray(b.data))return json({ok:false,error:'Must be {data:[...]}'},400);const rows=b.data;const structured=rows.filter(c=>c&&c.drawdown_60d!=null&&c.range_20d!=null&&c.vol_shrink_20d!=null).length;const envOk=!!(b.env&&typeof b.env.up==='boolean'&&Number.isFinite(b.env.close)&&Number.isFinite(b.env.sma20));const minStructured=Math.max(50,Math.ceil(rows.length*0.5));if(rows.length<100||structured<minStructured||!envOk)return json({ok:false,error:'Incomplete forward snapshot rejected',quality:{row_count:rows.length,structured,min_structured:minStructured,env_ok:envOk}},422);const n=b.updated||new Date().toISOString();const payload={data:rows,updated:n,count:rows.length,env:b.env,quality:{structured,coverage:Math.round(structured/rows.length*1000)/1000}};await kv.put('forward_data',JSON.stringify(payload));
  // ── 每日候选池归档（fwd_hist_YYYYMMDD 北京日界=UTC+8，当日并集，覆盖写回）──
  try{
    const bj = new Date(new Date(n).getTime() + 8*3600*1000); const day = bj.toISOString().slice(0,10);
    const dayKey = 'fwd_hist_' + day.replace(/-/g,'');
    const prev = await kv.get(dayKey);
    const hist = prev ? JSON.parse(prev) : {date:day,candidates:[],updated:n};
    const bySym = new Map((hist.candidates||[]).map(c=>[c.symbol,c]));
    for(const c of b.data){
      if(c.signal!=='acc_candidate') continue;
      const ex = bySym.get(c.symbol);
      if(ex){
        ex.last_seen = n;
        if(c.forward_score!=null && (ex.forward_score==null || c.forward_score>ex.forward_score)) ex.forward_score = c.forward_score;
      } else {
        bySym.set(c.symbol,{symbol:c.symbol,base_asset:c.base_asset,forward_score:c.forward_score,first_seen:n,last_seen:n});
      }
    }
    hist.candidates = Array.from(bySym.values());
    hist.updated = n;
    await kv.put(dayKey, JSON.stringify(hist));
  }catch(e){console.log('fwd_hist archive error:', e.message)}
  // 📊 出现次数统计：每次 relay-forward 推送时，对候选池币计数（appear_count KV，滚动 7 天）
  try{
    const bj = new Date(new Date(n).getTime() + 8*3600*1000); const day = bj.toISOString().slice(0,10);
    const acKey = 'appear_count';
    const prev = await kv.get(acKey);
    let ac = prev ? JSON.parse(prev) : {days:{},updated:n};
    if(!ac.days) ac.days = {};
    if(!ac.days[day]) ac.days[day] = {};
    const dayMap = ac.days[day];
    for(const c of b.data){
      if(c.signal!=='acc_candidate') continue;
      const ba = c.base_asset || (c.symbol||'').replace('USDT','');
      if(!ba) continue;
      dayMap[ba] = (dayMap[ba]||0) + 1;
    }
    // 滚动清理 7 天前的数据
    const cutoff = new Date(Date.parse(day) - 7*86400000).toISOString().slice(0,10);
    for(const d of Object.keys(ac.days)){ if(d < cutoff) delete ac.days[d]; }
    ac.updated = n;
    await kv.put(acKey, JSON.stringify(ac));
  }catch(e){console.log('appear_count error:', e.message)}
  return json({ok:true,coins:b.data.length,updated:n})}catch(e){return json({ok:false,error:e.message},400)}}
async function hFH(kv,url){const days=Math.min(parseInt(new URL(url).searchParams.get('days')||'7',10)||7,60);const out={};const now=new Date();for(let i=0;i<days;i++){const bj=new Date(now.getTime()+8*3600*1000-i*86400000);const ds=bj.toISOString().slice(0,10);const r=await kv.get('fwd_hist_'+ds.replace(/-/g,''));if(r){try{const p=JSON.parse(r);out[ds]={candidates:p.candidates||[],updated:p.updated||null,count:(p.candidates||[]).length,seed:p.seed||false}}catch(e){}}}return json({ok:true,days,tz:'UTC+8',history:out})}
// 🎯 重合统计：每日候选池 ∩ 当日涨幅榜（前N名，成交额≥minvol）
async function hOV(kv,url){const u=new URL(url);const days=Math.min(parseInt(u.searchParams.get('days')||'14',10)||14,60);const topn=Math.min(parseInt(u.searchParams.get('topn')||'20',10)||20,100);const minvol=parseFloat(u.searchParams.get('minvol')||'0');const out={};const now=new Date();
// 先读全部窗口内的候选池 + 涨幅榜
const daysArr=[];
for(let i=0;i<days;i++){const bj=new Date(now.getTime()+8*3600*1000-i*86400000);daysArr.push(bj.toISOString().slice(0,10));}
const raw={};
for(const ds of daysArr){const fk='fwd_hist_'+ds.replace(/-/g,'');const gk='gainer_hist_'+ds.replace(/-/g,'');const [fr,gr]=await Promise.all([kv.get(fk),kv.get(gk)]);raw[ds]={cands:null,gainers:null,cand_seed:false,gainer_seed:false};if(fr){try{const p=JSON.parse(fr);raw[ds].cands=(p.candidates||[]).map(c=>({symbol:c.symbol,base_asset:c.base_asset,forward_score:c.forward_score}));raw[ds].cand_seed=!!p.seed;}catch(e){}}if(gr){try{const p=JSON.parse(gr);let gs=(p.gainers||[]).slice();if(minvol>0)gs=gs.filter(g=>(g.volume_24h_usdt||0)>=minvol);gs.sort((a,b)=>(b.change_24h_pct||0)-(a.change_24h_pct||0));gs=gs.slice(0,topn);raw[ds].gainers=gs;raw[ds].gainer_seed=!!p.seed;}catch(e){}}}
// 每个候选的首次入选日（窗口内最早，含完整时间戳）
const firstSeen={};
for(const ds of daysArr){if(!raw[ds].cands)continue;for(const c of raw[ds].cands){const ts=c.first_seen||ds;if(!firstSeen[c.base_asset]||ts<firstSeen[c.base_asset])firstSeen[c.base_asset]=ts;}}
const bestScore={};
for(const ds of daysArr){if(!raw[ds].cands)continue;for(const c of raw[ds].cands){if(c.forward_score!=null&&(bestScore[c.base_asset]==null||c.forward_score>bestScore[c.base_asset]))bestScore[c.base_asset]=c.forward_score;}}
// 同日重合 + 领先命中（预兆口径）
for(const ds of daysArr){const day={date:ds,candidates:raw[ds].cands,total_candidates:raw[ds].cands?raw[ds].cands.length:0,gainers:raw[ds].gainers,total_gainers:raw[ds].gainers?raw[ds].gainers.length:0,overlap:[],overlap_count:0,pct:null,candidate_seed:raw[ds].cand_seed,gainer_seed:raw[ds].gainer_seed};if(raw[ds].cands&&raw[ds].gainers){const candSet=new Set(raw[ds].cands.map(c=>c.base_asset));day.overlap=raw[ds].gainers.filter(g=>candSet.has(g.base_asset)).map(g=>({base_asset:g.base_asset,change_24h_pct:g.change_24h_pct,rank:raw[ds].gainers.indexOf(g)+1,first_seen:firstSeen[g.base_asset],first_seen_date:(firstSeen[g.base_asset]||'').slice(0,10)}));day.overlap_count=day.overlap.length;day.pct=raw[ds].gainers.length>0?Math.round(day.overlap.length/raw[ds].gainers.length*1000)/10:null;}out[ds]=day;}
// 领先命中：上榜日之前就已入选候选池的币（上榜日-首次入选日>=1）
const leadEvents=[];
for(const ds of daysArr){if(!raw[ds].gainers)continue;for(let k=0;k<raw[ds].gainers.length;k++){const g=raw[ds].gainers[k];const fs=firstSeen[g.base_asset];if(!fs)continue;const fsDate=fs.slice(0,10);if(fsDate<ds){leadEvents.push({base_asset:g.base_asset,first_seen:fs,first_seen_date:fsDate,gain_day:ds,lead_days:(Date.parse(ds)-Date.parse(fsDate))/86400000,change_24h_pct:g.change_24h_pct,rank:k+1});}}}
const leadUnion={};
for(const e of leadEvents){if(!leadUnion[e.base_asset])leadUnion[e.base_asset]={times:0,best_gain:null,first_seen:e.first_seen};leadUnion[e.base_asset].times++;if(leadUnion[e.base_asset].best_gain==null||e.change_24h_pct>leadUnion[e.base_asset].best_gain)leadUnion[e.base_asset].best_gain=e.change_24h_pct;}
return json({ok:true,days,topn,minvol,tz:'UTC+8',history:out,lead_events:leadEvents,lead_union:leadUnion})}

// ⚡ 事件记录：上榜(TopN) 或 单日涨幅≥20% 的币，关联候选池状态
async function hEV(kv,url){const u=new URL(url);const days=Math.min(parseInt(u.searchParams.get('days')||'14',10)||14,60);const topn=Math.min(parseInt(u.searchParams.get('topn')||'20',10)||20,100);const big=parseFloat(u.searchParams.get('big')||'20');const now=new Date();const daysArr=[];for(let i=0;i<days;i++){const bj=new Date(now.getTime()+8*3600*1000-i*86400000);daysArr.push(bj.toISOString().slice(0,10));}
// 读窗口数据
const raw={};
for(const ds of daysArr){const fk='fwd_hist_'+ds.replace(/-/g,'');const gk='gainer_hist_'+ds.replace(/-/g,'');const [fr,gr]=await Promise.all([kv.get(fk),kv.get(gk)]);raw[ds]={cands:null,gainers:null,cand_seed:false,gainer_seed:false};if(fr){try{const p=JSON.parse(fr);raw[ds].cands=(p.candidates||[]).map(c=>({symbol:c.symbol,base_asset:c.base_asset,forward_score:c.forward_score}));raw[ds].cand_seed=!!p.seed;}catch(e){}}if(gr){try{const p=JSON.parse(gr);const gs=(p.gainers||[]).slice();gs.sort((a,b)=>(b.change_24h_pct||0)-(a.change_24h_pct||0));raw[ds].gainers=gs;raw[ds].gainer_seed=!!p.seed;}catch(e){}}}
// 候选首次入选日（窗口内最早）
const firstSeen={};
for(const ds of daysArr){if(!raw[ds].cands)continue;for(const c of raw[ds].cands){if(!firstSeen[c.base_asset]||ds<firstSeen[c.base_asset])firstSeen[c.base_asset]=ds;}}
const bestScore={};
for(const ds of daysArr){if(!raw[ds].cands)continue;for(const c of raw[ds].cands){if(c.forward_score!=null&&(bestScore[c.base_asset]==null||c.forward_score>bestScore[c.base_asset]))bestScore[c.base_asset]=c.forward_score;}}
// 生成事件
const events=[];
for(const ds of daysArr){const day=raw[ds];if(!day.gainers)continue;const candSet=new Set((day.cands||[]).map(c=>c.base_asset));
  for(let k=0;k<day.gainers.length;k++){const g=day.gainers[k];const rank=k+1;const chg=g.change_24h_pct||0;
    const isTop=rank<=topn;const isBig=chg>=big;
    if(!isTop&&!isBig)continue;
    const isCand=!!candSet.has(g.base_asset);
    const fs=firstSeen[g.base_asset];
    const everCand=!!fs;
    const leadDays=(fs&&fs<ds)?Math.round((Date.parse(ds)-Date.parse(fs))/86400000):0;
    const trigger=(isTop&&isBig)?'both':(isTop?'top':'big');
    events.push({date:ds,base_asset:g.base_asset,change_24h_pct:chg,rank:isTop?rank:null,trigger,is_candidate:isCand,ever_candidate:everCand,lead_days:leadDays,first_seen:fs||null,forward_score:bestScore[g.base_asset]!=null?bestScore[g.base_asset]:null});
  }}
// 统计
const byDay={};const byCoin={};let nTop=0,nBig=0,nBoth=0,nEver=0,leadSum=0,leadN=0;
for(const e of events){
  byDay[e.date]=byDay[e.date]||{total:0,top:0,big:0,both:0};
  byDay[e.date].total++;
  if(e.trigger==='top'){byDay[e.date].top++;nTop++;}
  else if(e.trigger==='big'){byDay[e.date].big++;nBig++;}
  else{byDay[e.date].both++;nBoth++;}
  if(e.ever_candidate){nEver++;if(e.lead_days>0){leadSum+=e.lead_days;leadN++;}}
  byCoin[e.base_asset]=byCoin[e.base_asset]||{events:0,top:0,big:0,both:0,ever_candidate:false,first_seen:null,max_chg:-999};
  const c=byCoin[e.base_asset];c.events++;c.ever_candidate=c.ever_candidate||e.ever_candidate;if(!c.first_seen||(e.first_seen&&e.first_seen<c.first_seen))c.first_seen=e.first_seen||c.first_seen;if(e.change_24h_pct>c.max_chg)c.max_chg=e.change_24h_pct;
  if(e.trigger==='top')c.top++;else if(e.trigger==='big')c.big++;else c.both++;
}
const leadByDays={};
for(const e of events){if(e.ever_candidate&&e.lead_days>0){leadByDays[e.lead_days]=(leadByDays[e.lead_days]||0)+1;}}
return json({ok:true,days,topn,big,tz:'UTC+8',events,by_day:byDay,by_coin:byCoin,kpi:{total_events:events.length,top_events:nTop,big_events:nBig,both_events:nBoth,ever_candidate:nEver,ever_rate:events.length?Math.round(nEver/events.length*1000)/10:0,avg_lead:leadN?Math.round(leadSum/leadN*10)/10:0,lead_by_days:leadByDays}})}

// 📅 日榜回看：指定日期的涨幅榜 + 候选池关联标注
async function hDG(kv,url){const u=new URL(url);const date=(u.searchParams.get('date')||'').trim();const topn=Math.min(parseInt(u.searchParams.get('topn')||'20',10)||20,100);const window=Math.min(parseInt(u.searchParams.get('window')||'30',10)||30,90);const now=new Date();const todayBJ=new Date(now.getTime()+8*3600*1000).toISOString().slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>todayBJ)return json({ok:false,error:'invalid date'},400);
const gk='gainer_hist_'+date.replace(/-/g,'');
// 读指定日涨幅榜
const gr=await kv.get(gk);if(!gr)return json({ok:true,date,topn,tz:'UTC+8',gainers:[],candidates:{},note:'no gainer archive for '+date});
let gs=[];let gSeed=false;try{const p=JSON.parse(gr);gs=(p.gainers||[]).slice();gSeed=!!p.seed;}catch(e){}
const archivedTotal=gs.length;
gs.sort((a,b)=>(b.change_24h_pct||0)-(a.change_24h_pct||0));gs=gs.slice(0,topn);
// 往前 window 天读候选池 → firstSeen / bestScore / 当天候选集合（并行读 KV）
const firstSeen={};const bestScore={};const candDays={};let dayCands=null;
const winDates=[];for(let i=0;i<window;i++){const bj=new Date(now.getTime()+8*3600*1000-i*86400000);winDates.push(bj.toISOString().slice(0,10));}
const winFrs=await Promise.all(winDates.map(ds=>kv.get('fwd_hist_'+ds.replace(/-/g,''))));
winDates.forEach((ds,idx)=>{const fr=winFrs[idx];if(!fr)return;try{const p=JSON.parse(fr);const cs=(p.candidates||[]);if(ds===date)dayCands=new Set(cs.map(c=>c.base_asset));for(const c of cs){const ts=c.first_seen||ds;if(!firstSeen[c.base_asset]||ts<firstSeen[c.base_asset])firstSeen[c.base_asset]=ts;if(!candDays[c.base_asset])candDays[c.base_asset]=0;candDays[c.base_asset]++;if(c.forward_score!=null&&(bestScore[c.base_asset]==null||c.forward_score>bestScore[c.base_asset]))bestScore[c.base_asset]=c.forward_score;}}catch(e){}});
// 窗口内每日价格快照（gainer_hist 的 last_price）→ 入选价 / 上榜价
const winGrs=await Promise.all(winDates.map(ds=>kv.get('gainer_hist_'+ds.replace(/-/g,''))));
const priceByDate={};
winDates.forEach((ds,idx)=>{const gr=winGrs[idx];if(!gr)return;try{const p=JSON.parse(gr);const m={};for(const g of (p.gainers||[])){if(g.last_price!=null)m[g.base_asset]=g.last_price;}priceByDate[ds]=m;}catch(e){}});
// 标注
const out=gs.map((g,k)=>{const ba=g.base_asset;const fs=firstSeen[ba];const fsDate=fs?fs.slice(0,10):null;const ever=!!fs;const lead=(fsDate&&fsDate<date)?Math.round((Date.parse(date)-Date.parse(fsDate))/86400000):0;
  const gainPx=priceByDate[date]?priceByDate[date][ba]:null;
  const entryPx=(ever&&fsDate&&priceByDate[fsDate])?priceByDate[fsDate][ba]:null;
  let entryGain=null;if(entryPx&&gainPx&&entryPx>0)entryGain=Math.round((gainPx/entryPx-1)*10000)/10000;
  return{base_asset:ba,change_24h_pct:g.change_24h_pct,rank:k+1,volume_24h_usdt:g.volume_24h_usdt||null,is_candidate:dayCands?dayCands.has(ba):false,ever_candidate:ever,first_seen:fs||null,first_seen_date:fsDate||null,cand_days:candDays[ba]||0,lead_days:lead,forward_score:bestScore[ba]!=null?bestScore[ba]:null,entry_price:entryPx,gain_price:gainPx,entry_gain_pct:entryGain};});
const candMeta={};Object.keys(firstSeen).forEach(ba=>{candMeta[ba]={first_seen:firstSeen[ba],forward_score:bestScore[ba]!=null?bestScore[ba]:null};});
return json({ok:true,date,topn,window,tz:'UTC+8',gainers:out,candidates:candMeta,gainer_seed:gSeed,total_archived:archivedTotal})}

// 🩹 涨幅榜历史回填：relay 用日线 klines 算单日涨幅，POST 覆盖写回指定日归档
// 仅接受 3 天内的日期（防误写），认证同 relay-tickers
async function hGB(req,kv){const k=RELAY_AUTH_KEY,a=req.headers.get('X-Auth-Key');if(!k||a!==k)return json({ok:false,error:'Unauthorized'},401);try{const b=await req.json();if(!b||!b.date||!Array.isArray(b.gainers))return json({ok:false,error:'Must be {date,gainers:[...]}'},400);if(!/^\d{4}-\d{2}-\d{2}$/.test(b.date))return json({ok:false,error:'invalid date'},400);const now=new Date();const todayBJ=new Date(now.getTime()+8*3600*1000).toISOString().slice(0,10);if(b.date>todayBJ)return json({ok:false,error:'future date'},400);const ageDays=Math.round((Date.parse(todayBJ)-Date.parse(b.date))/86400000);if(ageDays>3)return json({ok:false,error:'too old, max 3 days'},400);
const dayKey='gainer_hist_'+b.date.replace(/-/g,'');
const prev=await kv.get(dayKey);let prevCount=0;if(prev){try{prevCount=(JSON.parse(prev).gainers||[]).length}catch(e){}}
// 已有数据且非空 → 跳过（不覆盖 relay 实时归档）
if(prevCount>0)return json({ok:true,skipped:true,date:b.date,existing:prevCount});
const n=b.updated||new Date().toISOString();
await kv.put(dayKey,JSON.stringify({date:b.date,gainers:b.gainers,updated:n,backfilled:true}));
return json({ok:true,date:b.date,count:b.gainers.length})}catch(e){return json({ok:false,error:e.message},400)}}

// 📊 历史出现：按小时窗口查曾经入选候选池的币（fwd_hist 归档 + appear_count）
// 窗口: 1/4/6/12/24/48/72/96/120 小时；返回每币 首次入选/最后入选/入选天数/出现次数/最高分
async function hAH(kv,url){
  const u=new URL(url);
  const hours=Math.min(parseInt(u.searchParams.get('hours')||'24',10)||24,120);
  const now=new Date();
  const cutoff=new Date(now.getTime()-hours*3600*1000);
  // 读窗口内所有 fwd_hist 归档（北京日界，覆盖 hours 小时）
  const daysArr=[];
  for(let i=0;i<Math.ceil(hours/24)+1;i++){
    const bj=new Date(now.getTime()+8*3600*1000-i*86400000);
    daysArr.push(bj.toISOString().slice(0,10));
  }
  const frs=await Promise.all(daysArr.map(ds=>kv.get('fwd_hist_'+ds.replace(/-/g,''))));
  const acR=await kv.get('appear_count');
  let ac=null;if(acR){try{ac=JSON.parse(acR)}catch(e){}}
  const appear={};if(ac&&ac.days){for(const d of Object.keys(ac.days)){for(const ba of Object.keys(ac.days[d])){appear[ba]=(appear[ba]||0)+ac.days[d][ba];}}}
  const bySym={};
  daysArr.forEach((ds,idx)=>{
    const fr=frs[idx];if(!fr)return;
    try{
      const p=JSON.parse(fr);
      for(const c of (p.candidates||[])){
        const ba=c.base_asset;if(!ba)continue;
        const fs=c.first_seen||ds,ls=c.last_seen||ds;
        // 窗口过滤：首次入选或最后入选在窗口内
        const fsT=Date.parse(fs),lsT=Date.parse(ls);
        if(fsT<cutoff.getTime()&&lsT<cutoff.getTime())continue;
        const ex=bySym[ba];
        if(!ex){bySym[ba]={base_asset:ba,first_seen:fs,last_seen:ls,days:1,best_score:c.forward_score!=null?c.forward_score:null};}
        else{
          if(fs<ex.first_seen)ex.first_seen=fs;
          if(ls>ex.last_seen)ex.last_seen=ls;
          ex.days++;
          if(c.forward_score!=null&&(ex.best_score==null||c.forward_score>ex.best_score))ex.best_score=c.forward_score;
        }
      }
    }catch(e){}
  });
  const out=Object.values(bySym).map(x=>({...x,appear_count:appear[x.base_asset]||0}));
  out.sort((a,b)=>(b.last_seen||'').localeCompare(a.last_seen||''));
  return json({ok:true,hours,cutoff:cutoff.toISOString(),count:out.length,data:out});
}
// 🛤️ 单币历史轨迹：指定币在窗口内每天的候选池状态 + 涨幅榜状态 + 价格快照
// 参数: symbol=BTC 或 BTCUSDT（大小写不敏感）; days=30（默认，上限 90）
// 数据源: fwd_hist_*（候选池归档）+ gainer_hist_*（涨幅榜归档，含 last_price 收盘快照）
async function hCH(kv,url){
  const u=new URL(url);
  const sym=(u.searchParams.get('symbol')||'').trim().toUpperCase();
  if(!sym)return json({ok:false,error:'missing symbol'},400);
  const ba=sym.endsWith('USDT')?sym.slice(0,-4):sym;
  if(!/^[A-Z0-9]{1,20}$/.test(ba))return json({ok:false,error:'invalid symbol'},400);
  const days=Math.min(parseInt(u.searchParams.get('days')||'30',10)||30,90);
  const now=new Date();
  const daysArr=[];
  for(let i=0;i<days;i++){
    const bj=new Date(now.getTime()+8*3600*1000-i*86400000);
    daysArr.push(bj.toISOString().slice(0,10));
  }
  // 并行读窗口内候选池 + 涨幅榜归档
  const keys=daysArr.flatMap(ds=>['fwd_hist_'+ds.replace(/-/g,''),'gainer_hist_'+ds.replace(/-/g,'')]);
  const vals=await Promise.all(keys.map(k=>kv.get(k)));
  const timeline=[];
  let firstSeen=null,lastSeen=null,candDays=0,gainDays=0,bestScore=null,maxChg=null,lastPrice=null;
  daysArr.forEach((ds,idx)=>{
    const fr=vals[idx*2],gr=vals[idx*2+1];
    const day={date:ds,candidate:false,forward_score:null,first_seen:null,last_seen:null,gainer:false,change_24h_pct:null,rank:null,volume_24h_usdt:null,last_price:null};
    if(fr){
      try{
        const p=JSON.parse(fr);
        for(const c of (p.candidates||[])){
          if(c.base_asset!==ba&&c.symbol!==ba+'USDT')continue;
          day.candidate=true;
          day.forward_score=c.forward_score!=null?c.forward_score:null;
          day.first_seen=c.first_seen||null;
          day.last_seen=c.last_seen||null;
          if(!firstSeen||(c.first_seen&&c.first_seen<firstSeen))firstSeen=c.first_seen||ds;
          if(!lastSeen||(c.last_seen&&c.last_seen>lastSeen))lastSeen=c.last_seen||ds;
          if(c.forward_score!=null&&(bestScore==null||c.forward_score>bestScore))bestScore=c.forward_score;
        }
      }catch(e){}
    }
    if(gr){
      try{
        const p=JSON.parse(gr);
        const gs=(p.gainers||[]).slice();
        gs.sort((a,b)=>(b.change_24h_pct||0)-(a.change_24h_pct||0));
        for(let k=0;k<gs.length;k++){
          const g=gs[k];
          if(g.base_asset!==ba&&g.symbol!==ba+'USDT')continue;
          day.gainer=true;
          day.change_24h_pct=g.change_24h_pct!=null?g.change_24h_pct:null;
          day.rank=k+1;
          day.volume_24h_usdt=g.volume_24h_usdt!=null?g.volume_24h_usdt:null;
          day.last_price=g.last_price!=null?g.last_price:null;
          if(g.change_24h_pct!=null&&(maxChg==null||g.change_24h_pct>maxChg))maxChg=g.change_24h_pct;
          if(g.last_price!=null)lastPrice=g.last_price;
        }
      }catch(e){}
    }
    if(day.candidate)candDays++;
    if(day.gainer)gainDays++;
    timeline.push(day);
  });
  // 时间正序（今天在前 → 反转）
  timeline.reverse();
  // lastPrice 取窗口内最新日（daysArr 从今天往前，最后写入的是最旧日）
  if(timeline.length>0&&timeline[timeline.length-1].last_price!=null)lastPrice=timeline[timeline.length-1].last_price;
  return json({ok:true,symbol:ba+'USDT',base_asset:ba,days,tz:'UTC+8',
    summary:{first_seen:firstSeen,last_seen:lastSeen,candidate_days:candDays,gainer_days:gainDays,best_forward_score:bestScore,max_change_24h_pct:maxChg,last_price:lastPrice},
    timeline});
}

// 📊 候选池表现分析：每日候选 → fwd1/3/5 收益 vs 市场基准

// 📊 候选池表现分析：每日候选 → fwd1/3/5 收益 vs 市场基准
async function hPA(kv,url){const u=new URL(url);const days=Math.min(parseInt(u.searchParams.get('days')||'14',10)||14,60);const now=new Date();const daysArr=[];for(let i=0;i<days;i++){const bj=new Date(now.getTime()+8*3600*1000-i*86400000);daysArr.push(bj.toISOString().slice(0,10));}
// 读窗口：候选池 + 涨幅榜(含价格快照)
const raw={};
const allFrs=await Promise.all(daysArr.flatMap(ds=>['fwd_hist_'+ds.replace(/-/g,''),'gainer_hist_'+ds.replace(/-/g,'')].map(k=>kv.get(k))));
daysArr.forEach((ds,idx)=>{raw[ds]={cands:null,gainers:null};const fr=allFrs[idx*2];const gr=allFrs[idx*2+1];if(fr){try{const p=JSON.parse(fr);raw[ds].cands=(p.candidates||[]).map(c=>({base_asset:c.base_asset,forward_score:c.forward_score}));}catch(e){}}if(gr){try{const p=JSON.parse(gr);raw[ds].gainers=(p.gainers||[]);}catch(e){}}});
// 每日价格图：date -> {symbol: last_price}
const priceByDay={};
for(const ds of daysArr){const gs=raw[ds].gainers;if(!gs)continue;const m={};for(const g of gs){if(g.last_price!=null)m[g.base_asset]=g.last_price;}priceByDay[ds]=m;}
// 每币时间序列（用于 fwd 计算）
const pxSeries={};
for(const ds of daysArr){const m=priceByDay[ds];if(!m)continue;for(const ba of Object.keys(m)){if(!pxSeries[ba])pxSeries[ba]={};pxSeries[ba][ds]=m[ba];}}
// BTC 基准序列
const btcSeries=pxSeries['BTC']||{};
// 计算 fwd 收益：从 ds 日入选 → ds+1/+3/+5 日价格变化（跨日）
function fwdRet(series,ds,horizon){const daysSorted=Object.keys(series).sort();const i=daysSorted.indexOf(ds);if(i<0)return null;const p0=series[ds];if(!p0)return null;const j=i+horizon;if(j>=daysSorted.length)return null;const pn=series[daysSorted[j]];if(!pn||p0<=0)return null;return pn/p0-1;}
// 每日统计
const daily=[];
for(const ds of daysArr){const cands=raw[ds].cands||[];if(!cands.length)continue;const rets={f1:[],f3:[],f5:[]};const baseRet={f1:null,f3:null,f5:null};for(const h of[1,3,5]){baseRet['f'+h]=fwdRet(btcSeries,ds,h);}
  const scored=cands.filter(c=>c.forward_score!=null&&c.forward_score>=4);
  const pool=scored.length?scored:cands;
  for(const c of pool){const s=pxSeries[c.base_asset];if(!s)continue;for(const h of[1,3,5]){const r=fwdRet(s,ds,h);if(r!=null)rets['f'+h].push(r);}}
  const stats={date:ds,n_candidates:cands.length,scored:pool.length};
  for(const h of[1,3,5]){const arr=rets['f'+h];stats['f'+h+'_mean']=arr.length?Math.round(arr.reduce((a,b)=>a+b,0)/arr.length*10000)/10000:null;stats['f'+h+'_n']=arr.length;stats['f'+h+'_win']=arr.length?Math.round(arr.filter(x=>x>0).length/arr.length*1000)/10:null;stats['btc_'+h]=baseRet['f'+h]!=null?Math.round(baseRet['f'+h]*10000)/10000:null;}
  stats.excess_f3=stats.f3_mean!=null&&stats.btc_3!=null?Math.round((stats.f3_mean-stats.btc_3)*10000)/10000:null;
  daily.push(stats);}
// 汇总
const agg={f1:[],f3:[],f5:[],ex3:[]};let nDays=0;
for(const d of daily){if(d.f1_mean!=null){agg.f1.push(d.f1_mean);nDays++;}if(d.f3_mean!=null)agg.f3.push(d.f3_mean);if(d.f5_mean!=null)agg.f5.push(d.f5_mean);if(d.excess_f3!=null)agg.ex3.push(d.excess_f3);}
const mean=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length*10000)/10000:null;
const summary={n_days:nDays,f1_mean:mean(agg.f1),f3_mean:mean(agg.f3),f5_mean:mean(agg.f5),excess_f3_mean:mean(agg.ex3),win3:mean(daily.filter(d=>d.f3_mean!=null).map(d=>d.f3_win))};
return json({ok:true,days,tz:'UTC+8',daily,summary,note:'fwd 收益基于每日收盘价快照（last_price）；fwd 为入选日收盘到 +N 日收盘；excess=候选均值-BTC'})}
async function hFW(kv){const r=await kv.get('forward_data');if(!r)return json({ok:false,error:'no forward data',data:[],updated:null,count:0});const p=JSON.parse(r);const arr=Array.isArray(p)?p:p.data||[];return json({ok:true,updated:p.updated||null,count:p.count||arr.length,env:p.env||null,data:arr})}
async function hML(kv){const r=await kv.get('mentioned_list');if(!r)return json({ok:false,error:'no mentioned list',mentioned:[]});try{return json({ok:true,mentioned:JSON.parse(r)})}catch(e){return json({ok:false,error:e.message,mentioned:[]})}}
// 📡 他提过：合并 data(市值/量) + coinfilter(OI/资费/信号) + forward(吸筹评分)，按名单过滤
// 🧭 筛币工作台：L0 环境闸门 + L1 候选池 + L2 排除层 + L4 告警（服务端计算）
// 数据源: forward(吸筹结构/评分) + coinfilter(OI/资费/盘口/信号) + data(市值)
// 规则: 硬门槛五要素(下行保护验证 dn10 3.3%) + 强度分(叙事因子+1) + 事件回避(-3, fwd5 -1.7% 强验证)
async function hSC(kv){
  const [dr,cr,fr,ar,marketUpdated]=await Promise.all([kv.get('data'),kv.get('coinfilter_data'),kv.get('forward_data'),kv.get('appear_count'),kv.get('last_updated')]);
  const now=Date.now();
  const parseAge=(value)=>{const time=Date.parse(value||'');return Number.isFinite(time)?Math.max(0,Math.round((now-time)/1000)):null};
  const sourceMeta=(updated,maxAge)=>{const age=parseAge(updated);return{updated:updated||null,age_seconds:age,stale:age==null||age>maxAge}};
  let cfPayload={},fwPayload={};
  try{cfPayload=JSON.parse(cr||'{}')}catch(e){}
  try{fwPayload=JSON.parse(fr||'{}')}catch(e){}
  const cfUpdated=cfPayload.updated||null,forwardUpdated=fwPayload.updated||null;
  const sources={market:sourceMeta(marketUpdated,2*3600),coinfilter:sourceMeta(cfUpdated,3*3600),forward:sourceMeta(forwardUpdated,45*60)};
  const stale=Object.values(sources).some(source=>source.stale);
  const appear={};let appearTotal=0;
  if(ar){try{const p=JSON.parse(ar);if(p.days){for(const d of Object.keys(p.days)){for(const ba of Object.keys(p.days[d])){appear[ba]=(appear[ba]||0)+p.days[d][ba];appearTotal+=p.days[d][ba];}}}}catch(e){}}
  const base={};if(dr){try{const p=JSON.parse(dr);(Array.isArray(p)?p:p.data||[]).forEach(c=>{if(c.base_asset)base[c.base_asset]={market_cap:c.market_cap,volume_24h_usdt:c.volume_24h_usdt,cmc_rank:c.cmc_rank,circulating_ratio:c.circulating_ratio,unlock_risk:c.unlock_risk}})}catch(e){}}
  const cf={};(Array.isArray(cfPayload)?cfPayload:cfPayload.data||[]).forEach(c=>{if(c.base_asset)cf[c.base_asset]=c});
  const fw={};(Array.isArray(fwPayload)?fwPayload:fwPayload.data||[]).forEach(c=>{if(c.base_asset)fw[c.base_asset]=c});
  const env=fwPayload.env||null;
  const envUp=env?env.up:null;
  const rows=[];
  const allSyms=new Set([...Object.keys(cf),...Object.keys(fw)]);
  for(const sym of allSyms){
    const c=cf[sym]||{},f=fw[sym]||{},b=base[sym]||{};
    const oi=c.oi_value!=null?c.oi_value:(f.oi_value!=null?f.oi_value:null);
    const volOi=c.volume_oi_ratio!=null?c.volume_oi_ratio:(f.volume_oi_ratio!=null?f.volume_oi_ratio:null);
    const fund=c.funding_rate_pct!=null?c.funding_rate_pct:(f.funding_rate_pct!=null?f.funding_rate_pct:null);
    const chg=c.change_24h_pct!=null?c.change_24h_pct:(f.change_24h_pct!=null?f.change_24h_pct:null);
    const price=c.price!=null?c.price:(f.price!=null?f.price:null);
    const vol=c.volume_24h_usdt!=null?c.volume_24h_usdt:(b.volume_24h_usdt!=null?b.volume_24h_usdt:null);
    const score=f.forward_score!=null?f.forward_score:0;
    const sig=f.signal||'noise';
    let effSig=sig;
    if(sig==='acc_candidate'&&stale)effSig='acc_candidate_stale';
    else if(sig==='acc_candidate'&&envUp===false)effSig='acc_candidate_env_bear';
    const thinBook=c.orderbook_depth_usdt!=null&&c.orderbook_depth_usdt<200000;
    const distribution=oi!=null&&volOi!=null&&chg!=null&&oi>80e6&&volOi<3&&chg<-10;
    const killLongs=oi!=null&&chg!=null&&chg<-5;
    const eventDay=volOi!=null&&volOi>=5;
    const negFundPump=fund!=null&&fund<-0.05&&chg!=null&&chg>0;
    const alerts=[];
    if(f.spring_test)alerts.push('ST/Spring');
    if(f.breakout_consolidation)alerts.push('大阳线后盘整');
    if(c.oi_24h_change_pct!=null&&c.oi_24h_change_pct>2&&volOi!=null&&volOi>=5)alerts.push('放量+OI跟上');
    if(fund!=null&&fund<-0.05)alerts.push('深负资费');
    rows.push({symbol:c.symbol||f.symbol||sym+'USDT',base_asset:sym,price,change_24h_pct:chg,volume_24h_usdt:vol,market_cap:b.market_cap!=null?b.market_cap:null,oi_value:oi,volume_oi_ratio:volOi,funding_rate_pct:fund,orderbook_depth_usdt:c.orderbook_depth_usdt!=null?c.orderbook_depth_usdt:null,oi_stage_label:c.oi_stage_label||null,tags:c.tags||[],forward_score:score,forward_signal:sig,effective_signal:effSig,drawdown_60d:f.drawdown_60d,range_20d:f.range_20d,vol_shrink_20d:f.vol_shrink_20d,near_low_20d:f.near_low_20d,big_move_5d:f.big_move_5d,spring_test:!!f.spring_test,breakout_consolidation:!!f.breakout_consolidation,oi_24h_change_pct:c.oi_24h_change_pct!=null?c.oi_24h_change_pct:null,thin_book:thinBook,distribution,kill_longs:killLongs,event_day:eventDay,neg_fund_pump:negFundPump,appear_count:appear[sym]||0,alerts});
  }
  return json({ok:true,updated:forwardUpdated,count:rows.length,env,sources,stale,appear_total:appearTotal,data:rows});
}
async function hST(kv){const r=await kv.get('data'),u=await kv.get('last_updated'),c=await kv.get('count'),dr=await kv.get('demon_data'),cr=await kv.get('coinfilter_data'),fw=await kv.get('forward_data');let dc=0,du=null,cc=0,cu=null;if(dr){try{const dp=JSON.parse(dr);dc=dp.count||(Array.isArray(dp)?dp.length:0);du=dp.updated||null}catch(e){}}if(cr){try{const cp=JSON.parse(cr);cc=cp.count||(Array.isArray(cp)?cp.length:0);cu=cp.updated||null}catch(e){}}const ml=await kv.get('mentioned_list');let mentioned=[];if(ml){try{mentioned=JSON.parse(ml)}catch(e){}}return json({project:'筹码筛选',ok:!!r,coins:parseInt(c||'0'),updated:u,demon:{ok:!!dr,coins:parseInt(dc||'0'),updated:du},coinfilter:{ok:!!cr,coins:parseInt(cc||'0'),updated:cu},forward:{ok:!!fw,coins:fw?(()=>{try{return JSON.parse(fw).count||0}catch(e){return 0}})():0,updated:fw?(()=>{try{return JSON.parse(fw).updated||null}catch(e){return null}})():null},mentioned:mentioned})}
async function hDD(kv){const eps=[{n:'BN',u:'https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=BTCUSDT'},{n:'BN spot',u:'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT'},{n:'BB',u:'https://api.bybit.com/v5/market/tickers?category=linear&symbol=BTCUSDT'},{n:'OKX',u:'https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT-SWAP'}];const r={};for(const ep of eps){const c=new AbortController,t=setTimeout(()=>c.abort(),1e4);try{const res=await fetch(ep.u,{signal:c.signal});clearTimeout(t);const txt=await res.text().catch(()=>'');r[ep.n]={s:res.status,p:txt.slice(0,100)}}catch(e){clearTimeout(t);r[ep.n]={e:e.message}}}await kv.put('debug_exchange',JSON.stringify(r)).catch(()=>{});return json(r)}
