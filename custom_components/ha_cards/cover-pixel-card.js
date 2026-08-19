/**
 * Cover Card v2.0.0 — 简洁风
 * 深色底、大号清晰开度数字，信息优先。支持可视化编辑。
 *
 * 用法：
 *   type: custom:cover-pixel-card
 *   entity: cover.xxx            # 必填
 *   name: 客厅窗帘
 */

const CARD_VERSION = "2.0.0";
const FONT = 'var(--primary-font-family, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif)';

class CoverPixelCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); }

  setConfig(config) {
    this._config = { entity: "", name: "", ...config };
    if (!this._config.entity) throw new Error("cover-pixel-card: 需要配置 entity");
    this._render();
  }

  set hass(hass) { this._hass = hass; this._update(); }
  getCardSize() { return 3; }

  static async getConfigElement() { return document.createElement("cover-pixel-card-editor"); }
  static getStubConfig() { return { entity: "", name: "窗帘" }; }

  _st() { return this._hass?.states?.[this._config.entity]; }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        .card { background: #141417; border: 1px solid rgba(255,255,255,.08); border-radius: 14px; color: #eee; font-family: ${FONT}; padding: 14px 16px; }
        .head { display: flex; align-items: center; gap: 10px; }
        .icon { width: 32px; height: 32px; border-radius: 9px; flex: none; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,.08); }
        .icon ha-icon { width: 18px; height: 18px; color: #fff; }
        .name { font-size: 14px; font-weight: 600; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .status { flex: none; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px; }
        .value { margin-top: 10px; font-size: 30px; font-weight: 700; font-variant-numeric: tabular-nums; }
        .value .unit { font-size: 14px; font-weight: 500; color: #9aa0a6; margin-left: 4px; }
        .bar-wrap { margin-top: 10px; height: 6px; border-radius: 3px; background: rgba(255,255,255,.08); overflow: hidden; }
        .bar-fill { height: 100%; border-radius: 3px; background: #2b6ff2; transition: width .4s ease; }
        .actions { display: flex; gap: 8px; margin-top: 12px; }
        .btn { flex: 1; text-align: center; padding: 10px 0; border-radius: 10px; font-size: 13px; font-weight: 600; border: none; cursor: pointer; font-family: inherit; background: rgba(255,255,255,.08); color: #e0e0e0; }
        .btn.primary { background: #2b6ff2; color: #fff; }
        .btn:active { filter: brightness(.9); }
      </style>
      <div class="card">
        <div class="head">
          <div class="icon"><ha-icon icon="mdi:curtains"></ha-icon></div>
          <div class="name">${this._config.name || "窗帘"}</div>
          <div class="status" data-status>--</div>
        </div>
        <div class="value" data-value>--<span class="unit">%</span></div>
        <div class="bar-wrap"><div class="bar-fill" data-bar style="width:0%"></div></div>
        <div class="actions">
          <button class="btn primary" data-act="open">打开</button>
          <button class="btn" data-act="stop">停止</button>
          <button class="btn" data-act="close">关闭</button>
        </div>
      </div>
    `;
    this.shadowRoot.querySelector(".card").addEventListener("click", (ev) => {
      const act = ev.target.closest("[data-act]")?.dataset.act;
      if (!act) return;
      const svc = { open: "open_cover", stop: "stop_cover", close: "close_cover" }[act];
      this._hass.callService("cover", svc, { entity_id: this._config.entity });
    });
    this._update();
  }

  _update() {
    if (!this._hass || !this._config) return;
    const st = this._st();
    if (!st) return;
    const pos = parseFloat(st.attributes.current_position);
    const pct = !isNaN(pos) ? pos : (st.state === "open" ? 100 : st.state === "closed" ? 0 : null);
    const status = this.shadowRoot.querySelector("[data-status]");
    const map = { open: "已打开", closed: "已关闭", opening: "正在打开", closing: "正在关闭", stopped: "已停止" };
    status.textContent = map[st.state] || st.state;
    status.style.background = st.state === "open" || st.state === "closed" ? "rgba(76,222,139,.15)" : "rgba(255,255,255,.07)";
    status.style.color = st.state === "open" || st.state === "closed" ? "#4cde8b" : "#9aa0a6";
    if (pct !== null) {
      this.shadowRoot.querySelector("[data-value]").innerHTML = `${Math.round(pct)}<span class="unit">%</span>`;
      this.shadowRoot.querySelector("[data-bar]").style.width = pct + "%";
    }
  }
}

class CoverPixelCardEditor extends HTMLElement {
  setConfig(config) { this._config = config || {}; }
  set hass(hass) { this._hass = hass; this._render(); }
  get config() { return this._config; }
  _render() {
    if (!this._hass) return;
    this.innerHTML = `<style>.grid{display:flex;flex-direction:column;gap:12px;padding:8px 0}.row{display:flex;align-items:center;gap:8px}.row label{min-width:56px;font-size:13px;color:var(--primary-text-color)}</style>
      <div class="grid"><div class="row"><label>实体</label><ha-entity-picker id="entity" style="flex:1"></ha-entity-picker></div>
      <div class="row"><label>名称</label><ha-textfield id="name" style="flex:1" label="名称"></ha-textfield></div></div>`;
    const picker = this.querySelector("#entity");
    picker.hass = this._hass; picker.value = this._config.entity || ""; picker.includeDomains = ["cover"];
    picker.addEventListener("value-changed", (e) => this._set("entity", e.detail.value));
    const name = this.querySelector("#name");
    name.value = this._config.name || "窗帘";
    name.addEventListener("input", (e) => this._set("name", e.target.value));
  }
  _set(k, v) { this._config = { ...this._config, [k]: v }; this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true })); }
}

customElements.define("cover-pixel-card-editor", CoverPixelCardEditor);
window.customCards = window.customCards || [];
if (!customElements.get("cover-pixel-card")) customElements.define("cover-pixel-card", CoverPixelCard);
if (!window.customCards.some((c) => c.type === "cover-pixel-card")) {
  window.customCards.push({ type: "cover-pixel-card", name: "窗帘卡片", description: "简洁风窗帘卡：开度大字 + 开/停/关，支持可视化编辑", preview: true });
}
console.info(`%c COVER-CARD %c v${CARD_VERSION} `, "color:#fff;background:#2b6ff2;font-weight:700", "color:#2b6ff2;background:#fff");
