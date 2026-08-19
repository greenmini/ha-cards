/**
 * Light Card v2.0.0 — 简洁风
 * 深色底、大号清晰亮度数字，信息优先。支持可视化编辑。
 *
 * 用法：
 *   type: custom:light-pixel-card
 *   entity: light.xxx            # 必填
 *   name: 客厅射灯
 */

const CARD_VERSION = "2.0.0";
const FONT = 'var(--primary-font-family, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif)';

class LightPixelCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); }

  setConfig(config) {
    this._config = { entity: "", name: "", ...config };
    if (!this._config.entity) throw new Error("light-pixel-card: 需要配置 entity");
    this._render();
  }

  set hass(hass) { this._hass = hass; this._update(); }
  getCardSize() { return 2; }

  static async getConfigElement() { return document.createElement("light-pixel-card-editor"); }
  static getStubConfig() { return { entity: "", name: "灯光" }; }

  _st() { return this._hass?.states?.[this._config.entity]; }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        .card { background: #141417; border: 1px solid rgba(255,255,255,.08); border-radius: 14px; color: #eee; font-family: ${FONT}; padding: 14px 16px; cursor: pointer; }
        .head { display: flex; align-items: center; gap: 10px; }
        .icon { width: 32px; height: 32px; border-radius: 9px; flex: none; display: flex; align-items: center; justify-content: center; }
        .icon ha-icon { width: 18px; height: 18px; }
        .name { font-size: 14px; font-weight: 600; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .status { flex: none; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px; }
        .value { margin-top: 10px; font-size: 26px; font-weight: 700; font-variant-numeric: tabular-nums; }
        .value .unit { font-size: 13px; font-weight: 500; color: #9aa0a6; margin-left: 4px; }
      </style>
      <div class="card">
        <div class="head">
          <div class="icon" data-icon><ha-icon icon="mdi:lightbulb-off-outline"></ha-icon></div>
          <div class="name">${this._config.name || "灯光"}</div>
          <div class="status" data-status>--</div>
        </div>
        <div class="value" data-value>--</div>
      </div>
    `;
    this.shadowRoot.querySelector(".card").addEventListener("click", () => {
      this._hass.callService("light", "toggle", { entity_id: this._config.entity });
    });
    this._update();
  }

  _update() {
    if (!this._hass || !this._config) return;
    const st = this._st();
    const on = st?.state === "on";
    const color = on ? "#ffd166" : "#9aa0a6";
    const icon = this.shadowRoot.querySelector("[data-icon]");
    icon.style.background = on ? "rgba(255,209,102,.18)" : "rgba(255,255,255,.08)";
    icon.innerHTML = `<ha-icon icon="${on ? "mdi:lightbulb-on" : "mdi:lightbulb-off-outline"}" style="color:${color}"></ha-icon>`;
    const status = this.shadowRoot.querySelector("[data-status]");
    status.textContent = on ? "已开启" : "已关闭";
    status.style.color = color;
    status.style.background = on ? "rgba(255,209,102,.15)" : "rgba(255,255,255,.07)";
    const bri = on ? (parseFloat(st.attributes.brightness) || 100) : 0;
    this.shadowRoot.querySelector("[data-value]").innerHTML = on ? `${Math.round(bri)}<span class="unit">% 亮度</span>` : "关闭";
  }
}

class LightPixelCardEditor extends HTMLElement {
  setConfig(config) { this._config = config || {}; }
  set hass(hass) { this._hass = hass; this._render(); }
  get config() { return this._config; }
  _render() {
    if (!this._hass) return;
    this.innerHTML = `<style>.grid{display:flex;flex-direction:column;gap:12px;padding:8px 0}.row{display:flex;align-items:center;gap:8px}.row label{min-width:56px;font-size:13px;color:var(--primary-text-color)}</style>
      <div class="grid"><div class="row"><label>实体</label><ha-entity-picker id="entity" style="flex:1"></ha-entity-picker></div>
      <div class="row"><label>名称</label><ha-textfield id="name" style="flex:1" label="名称"></ha-textfield></div></div>`;
    const picker = this.querySelector("#entity");
    picker.hass = this._hass; picker.value = this._config.entity || ""; picker.includeDomains = ["light"];
    picker.addEventListener("value-changed", (e) => this._set("entity", e.detail.value));
    const name = this.querySelector("#name");
    name.value = this._config.name || "灯光";
    name.addEventListener("input", (e) => this._set("name", e.target.value));
  }
  _set(k, v) { this._config = { ...this._config, [k]: v }; this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true })); }
}

customElements.define("light-pixel-card-editor", LightPixelCardEditor);
window.customCards = window.customCards || [];
if (!customElements.get("light-pixel-card")) customElements.define("light-pixel-card", LightPixelCard);
if (!window.customCards.some((c) => c.type === "light-pixel-card")) {
  window.customCards.push({ type: "light-pixel-card", name: "灯光卡片", description: "简洁风灯光卡：亮度大字，点击开关，支持可视化编辑", preview: true });
}
console.info(`%c LIGHT-CARD %c v${CARD_VERSION} `, "color:#fff;background:#2b6ff2;font-weight:700", "color:#2b6ff2;background:#fff");
