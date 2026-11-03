/**
 * Dashboard styles. Plain CSS in a string so consumers need no CSS loader and
 * the stylesheet ships inside the lazy-loaded devtools chunk only. Every class
 * is prefixed `rp-` to stay out of the host app's way. Layout switches use
 * container queries so the dashboard adapts to its panel, not the window.
 */
export const CSS = `
.rp-root,.rp-host{
  --rp-bg:#ffffff;--rp-surface:#f5f6f8;--rp-raised:#ffffff;--rp-border:#e1e4e9;--rp-text:#171a21;
  --rp-muted:#677082;--rp-accent:#4b57d6;--rp-accent-bg:#e9ebff;--rp-ok:#12805c;--rp-ok-bg:#dcf5ea;
  --rp-warn:#9a5b00;--rp-warn-bg:#fff0d1;--rp-danger:#c42b45;--rp-danger-bg:#fde4e8;--rp-shadow:0 8px 28px rgba(15,20,35,.18);
  --rp-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;
}
.rp-root[data-theme="dark"],.rp-host[data-theme="dark"]{
  --rp-bg:#0f1115;--rp-surface:#161920;--rp-raised:#1c2029;--rp-border:#2a2f3a;--rp-text:#e7e9ee;
  --rp-muted:#8b92a0;--rp-accent:#8f9bff;--rp-accent-bg:#232844;--rp-ok:#45d6a0;--rp-ok-bg:#12332a;
  --rp-warn:#f3b94d;--rp-warn-bg:#3a2d12;--rp-danger:#ff6b86;--rp-danger-bg:#401a24;--rp-shadow:0 8px 28px rgba(0,0,0,.5);
}
.rp-root,.rp-root *,.rp-host *{box-sizing:border-box}
.rp-root{
  display:flex;flex-direction:column;width:100%;height:100%;min-height:0;container-type:inline-size;
  background:var(--rp-bg);color:var(--rp-text);font:13px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
}
.rp-root button,.rp-root input,.rp-root select,.rp-host button{font:inherit;color:inherit}
.rp-mono{font-family:var(--rp-mono);font-size:12px}
.rp-muted{color:var(--rp-muted);font-weight:400}
.rp-ellipsis{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.rp-num{font-family:var(--rp-mono);font-size:12px;text-align:right;font-variant-numeric:tabular-nums}
.rp-slow{color:var(--rp-danger)!important}
.rp-visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}

.rp-toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:8px 12px;border-bottom:1px solid var(--rp-border);background:var(--rp-surface)}
.rp-brand{display:flex;align-items:center;gap:6px;font-weight:600;margin-right:4px}
.rp-status{font-size:11px;font-weight:500;padding:1px 8px;border-radius:999px;border:1px solid var(--rp-border);color:var(--rp-muted)}
.rp-status-recording{color:var(--rp-ok);background:var(--rp-ok-bg);border-color:transparent}
.rp-status-paused{color:var(--rp-warn);background:var(--rp-warn-bg);border-color:transparent}
.rp-input{height:28px;padding:0 8px;border:1px solid var(--rp-border);border-radius:6px;background:var(--rp-bg)}
.rp-input:focus-visible,.rp-btn:focus-visible,.rp-tab:focus-visible,.rp-row:focus-visible,.rp-hrow:focus-visible,.rp-tick:focus-visible,.rp-bar-row:focus-visible,.rp-launcher:focus-visible{outline:2px solid var(--rp-accent);outline-offset:1px}
.rp-search{flex:1 1 160px;min-width:120px;max-width:300px}
.rp-actions{display:flex;flex-wrap:wrap;gap:6px;margin-left:auto}
.rp-btn{height:28px;padding:0 10px;border:1px solid var(--rp-border);border-radius:6px;background:var(--rp-raised);cursor:pointer;transition:background-color .1s}
.rp-btn:hover{background:var(--rp-accent-bg)}

.rp-banner{display:flex;align-items:center;gap:8px;padding:6px 12px;background:var(--rp-accent-bg);border-bottom:1px solid var(--rp-border)}
.rp-banner span{flex:1}
.rp-banner-error{background:var(--rp-danger-bg);color:var(--rp-danger)}

.rp-tabs{display:flex;gap:2px;padding:0 8px;border-bottom:1px solid var(--rp-border)}
.rp-tab{display:flex;align-items:center;gap:6px;height:34px;padding:0 12px;border:0;border-bottom:2px solid transparent;background:none;cursor:pointer;color:var(--rp-muted)}
.rp-tab:hover{color:var(--rp-text)}
.rp-tab[aria-selected="true"]{color:var(--rp-text);border-bottom-color:var(--rp-accent);font-weight:600}
.rp-count{font-size:11px;min-width:18px;padding:0 5px;border-radius:999px;background:var(--rp-surface);border:1px solid var(--rp-border);text-align:center;color:var(--rp-muted)}
.rp-count-warn{background:var(--rp-danger-bg);color:var(--rp-danger);border-color:transparent}

.rp-body{flex:1;min-height:0;overflow:hidden}
.rp-split{display:grid;grid-template-columns:minmax(260px,2fr) 3fr;height:100%}
.rp-pane{min-height:0;overflow:auto}
.rp-split>.rp-pane:first-child{border-right:1px solid var(--rp-border)}
.rp-pane-full{height:100%;padding:12px}
.rp-empty{padding:24px 16px;color:var(--rp-muted);text-align:center}
@container (max-width: 640px){
  .rp-split{grid-template-columns:1fr;grid-template-rows:minmax(120px,40%) 1fr}
  .rp-split>.rp-pane:first-child{border-right:0;border-bottom:1px solid var(--rp-border)}
  .rp-search{max-width:none;flex-basis:100%}
  .rp-toolbar select.rp-input{flex:1 1 0;min-width:0}
  .rp-actions{margin-left:0;flex-wrap:nowrap;overflow-x:auto;width:100%;padding-bottom:2px}
  .rp-actions .rp-btn{flex:none}
  .rp-stats,.rp-tiles{grid-template-columns:repeat(3,minmax(0,1fr))}
  .rp-bar-row{grid-template-columns:minmax(0,90px) 1fr 96px}
  .rp-hrow{grid-template-columns:40px 84px 52px 60px minmax(0,1fr)}
  .rp-tl-axis{padding-left:0}
  .rp-lane{grid-template-columns:76px 1fr}
}

.rp-list{display:flex;flex-direction:column}
.rp-list-head,.rp-row{display:grid;grid-template-columns:minmax(0,1fr) 56px 64px 64px;gap:8px;align-items:center;padding:6px 12px}
.rp-list-head{position:sticky;top:0;background:var(--rp-surface);border-bottom:1px solid var(--rp-border);color:var(--rp-muted);font-size:11px;text-transform:uppercase;letter-spacing:.04em}
.rp-list-head span:not(:first-child){text-align:right}
.rp-row{width:100%;border:0;border-bottom:1px solid var(--rp-border);background:none;text-align:left;cursor:pointer}
.rp-row:hover{background:var(--rp-surface)}
.rp-row[aria-selected="true"]{background:var(--rp-accent-bg)}
.rp-row-name{display:flex;align-items:center;gap:6px;min-width:0;font-weight:500}

.rp-badge{display:inline-block;font-size:11px;font-weight:500;line-height:16px;padding:0 6px;border-radius:4px;background:var(--rp-surface);border:1px solid var(--rp-border);color:var(--rp-muted);margin-left:4px;flex:none}
.rp-badge-danger{background:var(--rp-danger-bg);color:var(--rp-danger);border-color:transparent}
.rp-badge-warn{background:var(--rp-warn-bg);color:var(--rp-warn);border-color:transparent}
.rp-badge-ok{background:var(--rp-ok-bg);color:var(--rp-ok);border-color:transparent}

.rp-details{padding:12px 14px;display:flex;flex-direction:column;gap:14px}
.rp-details-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px}
.rp-title{margin:0;font-size:16px}
.rp-h3{margin:0 0 6px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--rp-muted)}
.rp-h3 .rp-muted{text-transform:none;letter-spacing:0}
.rp-note{margin:0;font-size:12px;color:var(--rp-muted)}
.rp-stats,.rp-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:8px;margin:0}
.rp-stat,.rp-tile{padding:8px 10px;border:1px solid var(--rp-border);border-radius:8px;background:var(--rp-surface);min-width:0}
.rp-stat dt,.rp-tile dt{font-size:11px;color:var(--rp-muted)}
.rp-stat dd,.rp-tile dd{margin:2px 0 0;font:600 15px var(--rp-mono)}
.rp-chips,.rp-plain,.rp-reasons,.rp-bars{list-style:none;margin:0;padding:0}
.rp-chips{display:flex;flex-wrap:wrap;gap:6px}
.rp-chip{padding:2px 8px;border:1px solid var(--rp-border);border-radius:999px;font:12px var(--rp-mono);background:var(--rp-surface)}
.rp-reasons li{padding:2px 0}
.rp-plain li{padding:3px 0;border-bottom:1px solid var(--rp-border);overflow-wrap:anywhere}
.rp-plain li:last-child{border-bottom:0}

.rp-table{width:100%;border-collapse:collapse;margin-top:8px;table-layout:fixed}
.rp-table th{text-align:left;font-size:11px;font-weight:600;color:var(--rp-muted);padding:4px 8px;border-bottom:1px solid var(--rp-border)}
.rp-table td{padding:5px 8px;border-bottom:1px solid var(--rp-border);vertical-align:top;overflow-wrap:anywhere}
.rp-table th:first-child{width:30%}
.rp-prev{background:var(--rp-danger-bg);color:var(--rp-danger)}
.rp-next{background:var(--rp-ok-bg);color:var(--rp-ok)}

.rp-history{max-height:260px;overflow:auto;border:1px solid var(--rp-border);border-radius:8px}
.rp-hrow{display:grid;grid-template-columns:44px 96px 64px 64px minmax(0,1fr);gap:8px;align-items:center;width:100%;padding:4px 10px;border:0;border-bottom:1px solid var(--rp-border);background:none;text-align:left;cursor:pointer}
.rp-hrow:last-child{border-bottom:0}
.rp-hrow:hover{background:var(--rp-surface)}
.rp-hrow[aria-selected="true"]{background:var(--rp-accent-bg)}

.rp-perf{padding:0;display:flex;flex-direction:column;gap:16px}
.rp-bar-row{display:grid;grid-template-columns:minmax(0,160px) 1fr 120px;gap:10px;align-items:center;width:100%;padding:4px 0;border:0;background:none;cursor:pointer;text-align:left}
.rp-bar-row:hover{background:var(--rp-surface)}
.rp-bar-track{position:relative;height:10px;border-radius:4px;background:var(--rp-surface);overflow:hidden}
.rp-bar-avg,.rp-bar-max{position:absolute;left:0;top:0;bottom:0;border-radius:4px;background:var(--rp-accent)}
.rp-bar-max{opacity:.3}
.rp-bar-slow{background:var(--rp-danger)}
.rp-bar-limit{position:absolute;top:0;bottom:0;width:2px;background:var(--rp-text);opacity:.5}
.rp-note-block code{font-family:var(--rp-mono);font-size:12px}

.rp-timeline{display:flex;flex-direction:column;gap:6px}
.rp-tl-axis{display:flex;justify-content:space-between;padding-left:140px}
.rp-lane{display:grid;grid-template-columns:130px 1fr;gap:10px;align-items:center}
.rp-lane-track{position:relative;height:34px;border-radius:6px;background:var(--rp-surface);border:1px solid var(--rp-border)}
.rp-tick{position:absolute;bottom:2px;width:4px;margin-left:-2px;padding:0;border:0;border-radius:2px;background:var(--rp-accent);cursor:pointer}
.rp-tick::after{content:"";position:absolute;inset:-4px -5px}
.rp-tick-slow{background:var(--rp-danger)}
.rp-tick-mount{background:transparent;box-shadow:inset 0 0 0 1.5px var(--rp-accent)}
.rp-tick-mount.rp-tick-slow{box-shadow:inset 0 0 0 1.5px var(--rp-danger)}

.rp-launcher{position:fixed;right:16px;bottom:16px;z-index:2147483000;display:flex;align-items:center;gap:6px;height:34px;padding:0 12px;border:1px solid var(--rp-border);border-radius:999px;background:var(--rp-raised);color:var(--rp-text);box-shadow:var(--rp-shadow);cursor:pointer;font:600 13px system-ui,sans-serif}
.rp-panel{position:fixed;z-index:2147483000;background:var(--rp-bg);box-shadow:var(--rp-shadow);display:flex;min-width:0;min-height:0}
.rp-panel-bottom{left:0;right:0;bottom:0;max-height:85vh;border-top:1px solid var(--rp-border)}
.rp-panel-right{top:0;right:0;bottom:0;max-width:100vw;border-left:1px solid var(--rp-border)}
.rp-resize{position:absolute;z-index:1;background:transparent}
.rp-resize-bottom{left:0;right:0;top:-3px;height:6px;cursor:ns-resize}
.rp-resize-right{top:0;bottom:0;left:-3px;width:6px;cursor:ew-resize}
.rp-resize:hover{background:var(--rp-accent);opacity:.5}
.rp-panel>.rp-root{flex:1}

.rp-toasts{position:fixed;z-index:2147483001;right:16px;top:16px;display:flex;flex-direction:column;gap:8px;max-width:min(380px,calc(100vw - 32px))}
.rp-toasts-left{right:auto;left:16px}
.rp-toast{position:relative;padding:10px 32px 10px 12px;border:1px solid var(--rp-border);border-radius:8px;background:var(--rp-raised);color:var(--rp-text);box-shadow:var(--rp-shadow);font:13px/1.4 system-ui,sans-serif;overflow-wrap:anywhere}
.rp-toast-close{position:absolute;top:6px;right:6px;border:0;background:none;color:var(--rp-muted);cursor:pointer}
@media (prefers-reduced-motion: no-preference){.rp-btn,.rp-row,.rp-hrow{transition:background-color .1s}}
`;
