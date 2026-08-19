/**
 * Dishwasher Card v3.0.0 — 简洁风
 * 深色底、大号清晰数字，信息优先。
 *
 * 用法：
 *   type: custom:dishwasher-card
 *   entity: switch.cp7_cp7_relay            # 电源开关（必填）
 *   name: 洗碗机
 *   state / running / progress / time_remaining / current_power
 *   phase / program / energy / cycle_count: <entity_id>
 */

const CARD_VERSION = "3.0.0";
const FONT = 'var(--primary-font-family, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif)';

class DishwasherCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  setConfig(config) {
    this._config = {
      entity: "", name: "洗碗机",
      state: "", running: "", progress: "", time_remaining: "",
      current_power: "", phase: "", program: "", energy: "", cycle_count: "",
      ...config,
    };
    if (!this._config.entity) throw new Error("dishwasher-card: 需要配置 entity");
    this._render();
  }

  set hass(hass) { this._hass = hass; this._update(); }

  getCardSize() { return 4; }

  _st(eid) { return this._hass?.states?.[eid]; }
  _num(eid) { const v = parseFloat(this._st(eid)?.state); return isNaN(v) ? null : v; }

  _status() {
    const s = String(this._st(this._config.state)?.state || "").toLowerCase();
    if (["finish", "finished", "done", "clean"].includes(s)) return { text: "完成", color: "#4cde8b", bg: "rgba(76,222,139,.15)" };
    const run = this._st(this._config.running)?.state;
    if (run === "on" || (s && !["off", "idle", "standby", "unknown", "unavailable", "empty", "none"].includes(s))) return { text: "运行中", color: "#4cde8b", bg: "rgba(76,222,139,.15)" };
    const p = this._num(this._config.current_power);
    if (p !== null && p > 10) return { text: "运行中", color: "#4cde8b", bg: "rgba(76,222,139,.15)" };
    return { text: "空闲", color: "#9aa0a6", bg: "rgba(255,255,255,.07)" };
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        .card {
          background: #141417; border: 1px solid rgba(255,255,255,.08);
          border-radius: 14px; color: #eee; font-family: ${FONT}; padding: 16px 18px;
        }
        .head { display: flex; align-items: center; gap: 10px; }
        .icon { width: 34px; height: 34px; border-radius: 9px; flex: none; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,.08); }
        .icon ha-icon { width: 20px; height: 20px; color: #fff; }
        .name { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .status { margin-left: auto; flex: none; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px; }
        .value-row { display: flex; align-items: baseline; gap: 10px; padding: 14px 0 4px; }
        .value { font-size: 34px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.1; }
        .value .unit { font-size: 15px; font-weight: 500; color: #9aa0a6; margin-left: 4px; }
        .sub { font-size: 12px; color: #9aa0a6; }
        .bar-wrap { margin-top: 12px; height: 6px; border-radius: 3px; background: rgba(255,255,255,.08); overflow: hidden; }
        .bar-fill { height: 100%; border-radius: 3px; background: #2b6ff2; transition: width .4s ease; }
        .rows { margin-top: 8px; }
        .row { display: flex; justify-content: space-between; padding: 9px 0; border-top: 1px solid rgba(255,255,255,.07); font-size: 13px; }
        .row .k { color: #9aa0a6; }
        .row .v { font-weight: 600; font-variant-numeric: tabular-nums; }
        .actions { display: flex; gap: 8px; margin-top: 12px; }
        .btn { flex: 1; text-align: center; padding: 10px 0; border-radius: 10px; font-size: 13px; font-weight: 600; border: none; cursor: pointer; font-family: inherit; background: rgba(255,255,255,.08); color: #e0e0e0; }
        .btn.power.on { background: #2b6ff2; color: #fff; }
        .btn:active { filter: brightness(.9); }
      </style>
      <div class="card">
        <div class="head">
          <div class="icon"><ha-icon icon="mdi:dishwasher"></ha-icon></div>
          <div class="name">${this._config.name}</div>
          <div class="status" data-status>--</div>
        </div>
        <div class="value-row"><div class="value" data-value>--</div></div>
        <div class="sub">洗涤进度</div>
        <div class="bar-wrap"><div class="bar-fill" data-bar style="width:0%"></div></div>
        <div class="rows">
          <div class="row"><span class="k">剩余时间</span><span class="v" data-time>--</span></div>
          <div class="row"><span class="k">当前功率</span><span class="v" data-power>--</span></div>
          <div class="row"><span class="k">当前阶段</span><span class="v" data-phase>--</span></div>
          <div class="row"><span class="k">洗涤程序</span><span class="v" data-program>--</span></div>
          <div class="row"><span class="k">总能耗</span><span class="v" data-energy>--</span></div>
          <div class="row"><span class="k">循环次数</span><span class="v" data-cycles>--</span></div>
        </div>
        <div class="actions">
          <button class="btn power" data-act="power">开机</button>
          <button class="btn" data-act="info">详情</button>
        </div>
      </div>
    `;
    this.shadowRoot.querySelector(".card").addEventListener("click", (ev) => {
      const act = ev.target.closest("[data-act]")?.dataset.act;
      if (act === "info") {
        window.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: this._config.state || this._config.entity } }));
      } else {
        const eid = this._config.entity;
        this._hass.callService(eid.split(".")[0], "toggle", { entity_id: eid });
      }
    });
    this._update();
  }

  _fmtTime(min) {
    if (min === null || isNaN(min)) return "--";
    if (min >= 60) { const h = Math.floor(min / 60), m = Math.round(min % 60); return h + "小时" + (m ? m + "分" : ""); }
    return Math.round(min) + " 分钟";
  }

  _update() {
    if (!this._hass || !this._config) return;
    const cfg = this._config;
    const on = this._st(cfg.entity)?.state === "on";
    const st = this._status();
    const status = this.shadowRoot.querySelector("[data-status]");
    status.textContent = st.text;
    status.style.color = st.color;
    status.style.background = st.bg;

    const prog = this._num(cfg.progress);
    const value = this.shadowRoot.querySelector("[data-value]");
    if (prog !== null) {
      value.textContent = Math.round(prog) + "%";
      this.shadowRoot.querySelector("[data-bar]").style.width = Math.min(100, Math.max(0, prog)) + "%";
    } else {
      value.textContent = on ? "运行中" : "已关机";
      this.shadowRoot.querySelector("[data-bar]").style.width = "0%";
    }

    const set = (sel, txt) => { const el = this.shadowRoot.querySelector(sel); if (el) el.textContent = txt; };
    set("[data-time]", this._fmtTime(this._num(cfg.time_remaining)));
    const pw = this._num(cfg.current_power);
    set("[data-power]", pw === null ? "--" : pw >= 1000 ? (pw / 1000).toFixed(2) + " kW" : pw.toFixed(0) + " W");
    set("[data-phase]", this._st(cfg.phase)?.state || "--");
    set("[data-program]", this._st(cfg.program)?.state || "--");
    const en = this._st(cfg.energy);
    set("[data-energy]", en ? `${en.state} ${en.attributes?.unit_of_measurement || ""}`.trim() : "--");
    set("[data-cycles]", this._st(cfg.cycle_count)?.state || "--");

    const btn = this.shadowRoot.querySelector(".btn.power");
    btn.textContent = on ? "关机" : "开机";
    btn.classList.toggle("on", on);
  }
}

window.customCards = window.customCards || [];
if (!customElements.get("dishwasher-card")) customElements.define("dishwasher-card", DishwasherCard);
if (!window.customCards.some((c) => c.type === "dishwasher-card")) {
  window.customCards.push({ type: "dishwasher-card", name: "洗碗机卡片", description: "简洁风洗碗机状态卡：进度/剩余时间/阶段/能耗", preview: true });
}
console.info(`%c DISHWASHER-CARD %c v${CARD_VERSION} `, "color:#fff;background:#2b6ff2;font-weight:700", "color:#2b6ff2;background:#fff");
