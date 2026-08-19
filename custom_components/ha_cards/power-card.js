/**
 * Power Card v2.0.0 — 简洁风
 * 深色底、大号清晰数字、tabular-nums，信息优先，适合 HA 仪表盘。
 * 保留：今日/本月/今年用电、电费、实时功率、7天柱状图、较昨日 KPI。
 *
 * 用法：
 *   type: custom:power-card
 *   today: sensor.ri_yong_dian_liang
 *   month: sensor.yue_yong_dian_liang
 *   year: sensor.nian_yong_dian_liang
 *   month_fee: sensor.yue_dian_fei
 *   year_fee: sensor.nian_dian_fei
 *   balance: sensor.dian_fei_yu_e
 *   power: sensor.cmpower_7abfb9_24_gong_lu
 *   flat / valley / peak / tip: <分时用电传感器>
 *   low_balance: 50
 */

const CARD_VERSION = "2.0.0";

const FONT = 'var(--primary-font-family, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif)';

class PowerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hist = null;
    this._histLoading = false;
  }

  setConfig(config) {
    this._config = {
      name: "用电",
      today: "", month: "", year: "",
      month_fee: "", year_fee: "", balance: "",
      power: "",
      flat: "", valley: "", peak: "", tip: "",
      low_balance: 50,
      history_days: 7,
      ...config,
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
    this._loadHistory();
  }

  getCardSize() { return 5; }

  _st(eid) { return this._hass?.states?.[eid]; }
  _num(eid) {
    const v = parseFloat(this._st(eid)?.state);
    return isNaN(v) ? null : v;
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        .card {
          background: #141417;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 14px;
          color: #eeeeee;
          font-family: ${FONT};
          padding: 16px 18px;
        }
        .head { display: flex; align-items: center; gap: 10px; }
        .icon {
          width: 34px; height: 34px; border-radius: 9px; flex: none;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,.08);
        }
        .icon ha-icon { width: 20px; height: 20px; color: #ffffff; }
        .name { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .status {
          margin-left: auto; flex: none; font-size: 12px; font-weight: 600;
          padding: 3px 10px; border-radius: 999px;
        }
        .value-row { display: flex; align-items: baseline; gap: 10px; padding: 14px 0 4px; }
        .value { font-size: 34px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.1; }
        .value .unit { font-size: 15px; font-weight: 500; color: #9aa0a6; margin-left: 4px; }
        .delta { font-size: 13px; font-weight: 600; padding: 3px 8px; border-radius: 8px; }
        .delta.up { color: #ff5a5a; background: rgba(255,90,90,.12); }
        .delta.down { color: #4cde8b; background: rgba(76,222,139,.12); }
        .delta.flat { color: #9aa0a6; background: rgba(255,255,255,.06); }
        .sub { font-size: 12px; color: #9aa0a6; }
        .rows { margin-top: 8px; }
        .row { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; border-top: 1px solid rgba(255,255,255,.07); font-size: 13px; }
        .row .k { color: #9aa0a6; }
        .row .v { font-weight: 600; font-variant-numeric: tabular-nums; }
        .row .v.warn { color: #ff5a5a; }
        .chart { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,.07); }
        .chart .hd { display: flex; justify-content: space-between; font-size: 12px; color: #9aa0a6; margin-bottom: 8px; }
        .bars { display: flex; align-items: flex-end; gap: 6px; height: 64px; }
        .bar { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 4px; min-width: 0; }
        .bar .fill { width: 100%; border-radius: 4px 4px 2px 2px; min-height: 2px; }
        .bar .day { font-size: 10px; color: #9aa0a6; white-space: nowrap; }
        .actions { display: flex; gap: 8px; margin-top: 12px; }
        .btn {
          flex: 1; text-align: center; padding: 10px 0; border-radius: 10px;
          font-size: 13px; font-weight: 600; border: none; cursor: pointer; font-family: inherit;
          background: rgba(255,255,255,.08); color: #e0e0e0;
        }
        .btn.primary { background: #2b6ff2; color: #fff; }
        .btn:active { filter: brightness(.9); }
      </style>

      <div class="card">
        <div class="head">
          <div class="icon"><ha-icon icon="mdi:flash"></ha-icon></div>
          <div class="name">${this._config.name}</div>
          <div class="status" data-status>--</div>
        </div>
        <div class="value-row">
          <div class="value" data-value>--<span class="unit">kWh</span></div>
          <div class="delta" data-delta hidden></div>
        </div>
        <div class="sub">今日用电</div>
        <div class="rows">
          <div class="row"><span class="k">本月用电</span><span class="v" data-m>--</span></div>
          <div class="row"><span class="k">今年用电</span><span class="v" data-y>--</span></div>
          <div class="row"><span class="k">实时功率</span><span class="v" data-p>--</span></div>
          <div class="row"><span class="k">本月电费</span><span class="v" data-mf>--</span></div>
          <div class="row"><span class="k">今年电费</span><span class="v" data-yf>--</span></div>
          <div class="row"><span class="k">电费余额</span><span class="v" data-bal>--</span></div>
        </div>
        <div class="chart">
          <div class="hd"><span>近7天用电</span><span>kWh/天</span></div>
          <div class="bars" data-bars></div>
        </div>
        <div class="actions">
          <button class="btn primary" data-act="info">详情</button>
        </div>
      </div>
    `;
    this.shadowRoot.querySelector(".card").addEventListener("click", (ev) => {
      if (ev.target.closest("[data-act='info']")) {
        const eid = this._config.today || this._config.month;
        window.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: eid } }));
      }
    });
    this._update();
    this._loadHistory();
  }

  _setText(sel, txt) {
    const el = this.shadowRoot.querySelector(sel);
    if (el) el.textContent = txt;
  }

  _update() {
    if (!this._hass || !this._config) return;
    const cfg = this._config;
    const today = this._num(cfg.today);
    const month = this._num(cfg.month);
    const year = this._num(cfg.year);
    const power = this._num(cfg.power);
    const mf = this._num(cfg.month_fee);
    const yf = this._num(cfg.year_fee);
    const bal = this._num(cfg.balance);

    const status = this.shadowRoot.querySelector("[data-status]");
    if (bal !== null && bal < cfg.low_balance) {
      status.textContent = "余额低";
      status.style.background = "rgba(255,90,90,.15)";
      status.style.color = "#ff5a5a";
    } else if (power !== null && power > 10) {
      status.textContent = "用电中";
      status.style.background = "rgba(76,222,139,.15)";
      status.style.color = "#4cde8b";
    } else {
      status.textContent = "正常";
      status.style.background = "rgba(255,255,255,.07)";
      status.style.color = "#9aa0a6";
    }

    if (today !== null) this.shadowRoot.querySelector("[data-value]").innerHTML = `${today.toFixed(1)}<span class="unit">kWh</span>`;
    const deltaEl = this.shadowRoot.querySelector("[data-delta]");
    if (this._delta && this._delta.valid) {
      const pct = this._delta.pct;
      deltaEl.hidden = false;
      deltaEl.textContent = pct > 0.5 ? `较昨日 ▲ ${pct.toFixed(0)}%` : pct < -0.5 ? `较昨日 ▼ ${Math.abs(pct).toFixed(0)}%` : "与昨日持平";
      deltaEl.className = "delta " + (pct > 0.5 ? "up" : pct < -0.5 ? "down" : "flat");
    } else deltaEl.hidden = true;

    this._setText("[data-m]", month === null ? "--" : month.toFixed(0) + " kWh");
    this._setText("[data-y]", year === null ? "--" : year.toFixed(0) + " kWh");
    this._setText("[data-p]", power === null ? "--" : power >= 1000 ? (power / 1000).toFixed(2) + " kW" : power.toFixed(0) + " W");
    this._setText("[data-mf]", mf === null ? "--" : mf.toFixed(1) + " 元");
    this._setText("[data-yf]", yf === null ? "--" : yf.toFixed(1) + " 元");
    const balEl = this.shadowRoot.querySelector("[data-bal]");
    if (balEl) {
      balEl.textContent = bal === null ? "--" : bal.toFixed(1) + " 元";
      balEl.classList.toggle("warn", bal !== null && bal < cfg.low_balance);
    }
  }

  /* 近 7 天：WebSocket history/stream，每天取最大值 */
  _loadHistory(force) {
    const cfg = this._config;
    if (!cfg.today || !this._hass || this._histLoading) return;
    if (this._hist && !force) return;
    const days = Math.max(2, Math.min(14, cfg.history_days || 7));
    this._histLoading = true;
    const end = new Date();
    const start = new Date(end.getTime() - (days + 1) * 86400000);
    const req = {
      type: "history/stream", entity_ids: [cfg.today],
      start_time: start.toISOString(), end_time: end.toISOString(),
      minimal_response: true, no_attributes: true,
    };
    const onData = (data) => {
      const series = (data && data[0]) || [];
      const byDay = {};
      for (const s of series) {
        const d = new Date(s.last_changed);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const v = parseFloat(s.state);
        if (!isNaN(v)) byDay[key] = Math.max(byDay[key] || 0, v);
      }
      const out = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(end.getTime() - i * 86400000);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        out.push({ date: d, v: byDay[key] ?? null });
      }
      this._hist = out;
      const todayV = out[out.length - 1]?.v;
      const yestV = out[out.length - 2]?.v;
      this._delta = (todayV != null && yestV != null && yestV > 0) ? { valid: true, pct: ((todayV - yestV) / yestV) * 100 } : { valid: false };
      this._renderChart();
      this._update();
    };
    if (this._hass.callWS) this._hass.callWS(req).then(onData).catch(() => { this._histLoading = false; });
    else {
      const url = `/api/history/period/${start.toISOString()}?filter_entity_id=${encodeURIComponent(cfg.today)}&end_time=${end.toISOString()}&minimal_response&no_attributes`;
      const token = this._hass.auth?.accessToken || this._hass.auth?.access_token;
      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json()).then(onData).catch(() => { this._histLoading = false; });
    }
  }

  _renderChart() {
    const el = this.shadowRoot.querySelector("[data-bars]");
    if (!el || !this._hist) return;
    const days = this._hist;
    const max = Math.max(...days.map((d) => d.v || 0), 1);
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    el.innerHTML = days.map((d) => {
      const v = d.v || 0;
      const h = Math.max(4, Math.round((v / max) * 60));
      const isToday = `${d.date.getFullYear()}-${d.date.getMonth()}-${d.date.getDate()}` === todayKey;
      const color = isToday ? "#2b6ff2" : "#3a3a42";
      return `<div class="bar"><div class="fill" style="height:${h}px;background:${color}" title="${v.toFixed(1)} kWh"></div><div class="day">${d.date.getMonth() + 1}/${d.date.getDate()}</div></div>`;
    }).join("");
  }
}

window.customCards = window.customCards || [];
if (!customElements.get("power-card")) customElements.define("power-card", PowerCard);
if (!window.customCards.some((c) => c.type === "power-card")) {
  window.customCards.push({ type: "power-card", name: "电力卡片", description: "简洁风用电卡：今日/本月/今年用电、电费、功率、7天柱状图", preview: true });
}
console.info(`%c POWER-CARD %c v${CARD_VERSION} `, "color:#fff;background:#2b6ff2;font-weight:700", "color:#2b6ff2;background:#fff");
