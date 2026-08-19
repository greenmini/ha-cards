/**
 * Air Quality Card v3.0.0 — 简洁风
 * 深色底、大号清晰数字、5 级色阶、近 24h 趋势条（WebSocket 拉历史）。信息优先。
 *
 * 用法：
 *   type: custom:air-quality-card
 *   title: 地下室空气
 *   overall: sensor.di_xia_shi_kong_qi_zhi_liang_zong_ping
 *   co2 / pm25 / tvoc / humidity / temperature: <entity_id>
 */

const CARD_VERSION = "3.0.0";
const FONT = 'var(--primary-font-family, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif)';

const LEVELS = [
  { color: "#4cde8b", label: "优" },
  { color: "#8bc34a", label: "良" },
  { color: "#ffd166", label: "一般" },
  { color: "#ff9f43", label: "较差" },
  { color: "#ff5a5a", label: "差" },
];
function levelOf(v, bands) {
  if (!bands) return -1;
  if (v < bands[0]) return 0;
  if (v < bands[1]) return 1;
  if (v < bands[2]) return 2;
  if (v < bands[3]) return 3;
  return 4;
}

const METRICS = {
  co2:         { label: "CO₂", unit: "ppm",  bands: [600, 800, 1500, 2000] },
  pm25:        { label: "PM2.5", unit: "µg/m³", bands: [15, 35, 75, 150] },
  tvoc:        { label: "TVOC", unit: "µg/m³", bands: [200, 300, 1000, 2000] },
  humidity:    { label: "湿度", unit: "%",   bands: [45, 60, 70, 85], lowBad: 30 },
  temperature: { label: "温度", unit: "°C",  bands: null },
};

class AirQualityCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._trendLoading = false; }

  setConfig(config) {
    this._config = { title: "空气", overall: "", co2: "", pm25: "", tvoc: "", humidity: "", temperature: "", ...config };
    this._render();
  }

  set hass(hass) { this._hass = hass; this._update(); this._loadTrend(); }
  getCardSize() { return 5; }

  _st(eid) { return this._hass?.states?.[eid]; }
  _num(eid) { const v = parseFloat(this._st(eid)?.state); return isNaN(v) ? null : v; }

  _render() {
    const keys = Object.keys(METRICS);
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        .card { background: #141417; border: 1px solid rgba(255,255,255,.08); border-radius: 14px; color: #eee; font-family: ${FONT}; padding: 16px 18px; }
        .head { display: flex; align-items: center; gap: 10px; }
        .icon { width: 34px; height: 34px; border-radius: 9px; flex: none; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,.08); }
        .icon ha-icon { width: 20px; height: 20px; color: #fff; }
        .title { font-size: 14px; font-weight: 600; }
        .overall { margin-left: auto; font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 999px; }
        .value-row { display: flex; align-items: baseline; gap: 10px; padding: 14px 0 4px; }
        .value { font-size: 34px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.1; }
        .sub { font-size: 12px; color: #9aa0a6; }
        .rows { margin-top: 8px; }
        .row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-top: 1px solid rgba(255,255,255,.07); font-size: 13px; }
        .row .k { flex: 1; color: #9aa0a6; }
        .row .bar { width: 90px; height: 6px; border-radius: 3px; background: rgba(255,255,255,.08); overflow: hidden; }
        .row .bar i { display: block; height: 100%; border-radius: 3px; }
        .row .v { width: 86px; text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
        .trend { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,.07); }
        .trend .hd { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #9aa0a6; margin-bottom: 8px; }
        .trend .delta { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 8px; }
        .trend .delta.up { color: #ff5a5a; background: rgba(255,90,90,.12); }
        .trend .delta.down { color: #4cde8b; background: rgba(76,222,139,.12); }
        .trend .delta.flat { color: #9aa0a6; background: rgba(255,255,255,.06); }
        .bars { display: flex; align-items: flex-end; gap: 3px; height: 44px; }
        .bars i { flex: 1; border-radius: 3px 3px 1px 1px; background: rgba(255,255,255,.06); }
      </style>
      <div class="card">
        <div class="head">
          <div class="icon"><ha-icon icon="mdi:air-filter"></ha-icon></div>
          <div class="title">${this._config.title}</div>
          <div class="overall" data-overall>--</div>
        </div>
        <div class="value-row"><div class="value" data-hero>--</div></div>
        <div class="sub" data-sub>--</div>
        <div class="rows">
          ${keys.map((k) => `<div class="row"><span class="k">${METRICS[k].label}</span><span class="bar"><i data-bar="${k}"></i></span><span class="v" data-v="${k}">--</span></div>`).join("")}
        </div>
        <div class="trend">
          <div class="hd"><span data-trend-label>近24h 趋势</span><span class="delta" data-delta hidden></span></div>
          <div class="bars" data-bars></div>
        </div>
      </div>
    `;
    this._update();
    this._loadTrend();
  }

  _update() {
    if (!this._hass || !this._config) return;
    const cfg = this._config;
    const overall = this._st(cfg.overall)?.state;
    const overallEl = this.shadowRoot.querySelector("[data-overall]");
    const overallLv = { "优": 0, "良": 1, "一般": 2, "较差": 3, "差": 4 }[overall];
    if (overallLv !== undefined) {
      const c = LEVELS[overallLv];
      overallEl.textContent = overall;
      overallEl.style.color = c.color;
      overallEl.style.background = c.color + "24";
    } else {
      overallEl.textContent = overall || "--";
      overallEl.style.color = "#9aa0a6";
      overallEl.style.background = "rgba(255,255,255,.07)";
    }

    let heroKey = null;
    for (const k of ["pm25", "co2", "tvoc"]) {
      if (cfg[k] && this._num(cfg[k]) !== null) { heroKey = k; break; }
    }
    const heroV = heroKey ? this._num(cfg[heroKey]) : null;
    const hero = this.shadowRoot.querySelector("[data-hero]");
    const sub = this.shadowRoot.querySelector("[data-sub]");
    if (heroV !== null && heroKey) {
      const lv = Math.max(0, Math.min(4, levelOf(heroV, METRICS[heroKey].bands)));
      hero.innerHTML = `${heroV.toFixed(0)}<span style="font-size:15px;font-weight:500;color:${LEVELS[lv].color};margin-left:6px">${METRICS[heroKey].unit}</span>`;
      sub.textContent = `${METRICS[heroKey].label} ${LEVELS[lv].label}`;
    } else {
      hero.textContent = "--";
      sub.textContent = "空气质量";
    }

    for (const k of Object.keys(METRICS)) {
      const v = this._num(cfg[k]);
      const barEl = this.shadowRoot.querySelector(`[data-bar="${k}"]`);
      const vEl = this.shadowRoot.querySelector(`[data-v="${k}"]`);
      if (v === null || !barEl) continue;
      const m = METRICS[k];
      const lv = Math.max(0, Math.min(4, levelOf(v, m.bands)));
      const frac = Math.min(1, v / m.bands[m.bands.length - 1]);
      barEl.style.background = LEVELS[lv].color;
      barEl.style.width = Math.max(4, frac * 100) + "%";
      vEl.textContent = v.toFixed(0) + " " + m.unit;
      vEl.style.color = lv >= 0 ? LEVELS[lv].color : "#eee";
    }
  }

  /* 近 24h 趋势（WebSocket history/stream） */
  _loadTrend() {
    const cfg = this._config;
    const key = (["pm25", "co2", "tvoc", "humidity", "temperature"]).find((k) => cfg[k] && this._hass?.states?.[cfg[k]]);
    if (!key || this._trendLoading) return;
    this._trendLoading = true;
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 3600000);
    const req = {
      type: "history/stream", entity_ids: [cfg[key]],
      start_time: start.toISOString(), end_time: end.toISOString(),
      minimal_response: true, no_attributes: true,
    };
    const onData = (data) => {
      const series = (data && data[0]) || [];
      const vals = series.map((s) => parseFloat(s.state)).filter((v) => !isNaN(v));
      if (vals.length < 2) return;
      const step = Math.max(1, Math.floor(vals.length / 12));
      const sampled = [];
      for (let i = vals.length - 1; i >= 0; i -= step) sampled.unshift(vals[i]);
      const last = sampled.slice(-12);
      const max = Math.max(...last, 1);
      const bars = this.shadowRoot.querySelector("[data-bars]");
      const lv0 = Math.max(0, Math.min(4, levelOf(last[0], METRICS[key].bands)));
      bars.innerHTML = last.map((v) => {
        const h = Math.max(6, (v / max) * 40);
        return `<i style="height:${h}px;background:${LEVELS[lv0].color}"></i>`;
      }).join("");
      const d = last[last.length - 1] - last[0];
      const delta = this.shadowRoot.querySelector("[data-delta]");
      if (Math.abs(d) < 1e-9) { delta.textContent = "—"; delta.className = "delta flat"; delta.hidden = false; }
      else if (d > 0) { delta.textContent = `▲ ${d.toFixed(1)}`; delta.className = "delta up"; delta.hidden = false; }
      else { delta.textContent = `▼ ${Math.abs(d).toFixed(1)}`; delta.className = "delta down"; delta.hidden = false; }
      this.shadowRoot.querySelector("[data-trend-label]").textContent = `近24h ${METRICS[key].label} 趋势`;
    };
    if (this._hass.callWS) this._hass.callWS(req).then(onData).catch(() => { this._trendLoading = false; });
    else {
      const url = `/api/history/period/${start.toISOString()}?filter_entity_id=${encodeURIComponent(cfg[key])}&end_time=${end.toISOString()}&minimal_response&no_attributes`;
      const token = this._hass.auth?.accessToken || this._hass.auth?.access_token;
      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json()).then(onData).catch(() => { this._trendLoading = false; });
    }
  }
}

window.customCards = window.customCards || [];
if (!customElements.get("air-quality-card")) customElements.define("air-quality-card", AirQualityCard);
if (!window.customCards.some((c) => c.type === "air-quality-card")) {
  window.customCards.push({ type: "air-quality-card", name: "空气质量卡片", description: "简洁风空气质量卡：总评 + 5级色阶指标 + 24h趋势", preview: true });
}
console.info(`%c AIR-QUALITY-CARD %c v${CARD_VERSION} `, "color:#fff;background:#2b6ff2;font-weight:700", "color:#2b6ff2;background:#fff");
