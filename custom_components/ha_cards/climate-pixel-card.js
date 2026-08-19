/**
 * Climate Card v2.0.0 — 简洁风
 * 深色底、大号清晰温度，信息优先。支持可视化编辑。
 *
 * 用法：
 *   type: custom:climate-pixel-card
 *   entity: climate.xxx            # 必填
 *   name: 客厅空调
 */

const CARD_VERSION = "2.0.0";
const FONT = 'var(--primary-font-family, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif)';

const HVAC = {
  cool: { cn: "制冷", icon: "mdi:snowflake", color: "#6ea8ff" },
  heat: { cn: "制热", icon: "mdi:fire", color: "#ff7a5a" },
  auto: { cn: "自动", icon: "mdi:autorenew", color: "#4cde8b" },
  dry: { cn: "除湿", icon: "mdi:water-percent", color: "#ffd166" },
  fan_only: { cn: "送风", icon: "mdi:fan", color: "#4cde8b" },
  heat_cool: { cn: "自动", icon: "mdi:thermostat-auto", color: "#4cde8b" },
  off: { cn: "关机", icon: "mdi:power", color: "#9aa0a6" },
};

class ClimatePixelCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); }

  setConfig(config) {
    this._config = { entity: "", name: "", ...config };
    if (!this._config.entity) throw new Error("climate-pixel-card: 需要配置 entity");
    this._render();
  }

  set hass(hass) { this._hass = hass; this._update(); }
  getCardSize() { return 3; }

  static async getConfigElement() { return document.createElement("climate-pixel-card-editor"); }
  static getStubConfig() { return { entity: "", name: "空调" }; }

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
        .mode { flex: none; display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px; }
        .mode ha-icon { width: 14px; height: 14px; }
        .value { margin-top: 10px; font-size: 30px; font-weight: 700; font-variant-numeric: tabular-nums; }
        .value .unit { font-size: 14px; font-weight: 500; color: #9aa0a6; margin-left: 4px; }
        .sub { font-size: 12px; color: #9aa0a6; margin-top: 2px; }
      </style>
      <div class="card">
        <div class="head">
          <div class="icon" data-icon><ha-icon icon="mdi:air-conditioner"></ha-icon></div>
          <div class="name">${this._config.name || "空调"}</div>
          <div class="mode" data-mode>--</div>
        </div>
        <div class="value" data-temp>--<span class="unit">°C</span></div>
        <div class="sub" data-sub>--</div>
      </div>
    `;
    this.shadowRoot.querySelector(".card").addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: this._config.entity } }));
    });
    this._update();
  }

  _update() {
    if (!this._hass || !this._config) return;
    const st = this._st();
    if (!st) return;
    const hv = HVAC[st.state] || HVAC.off;
    const icon = this.shadowRoot.querySelector("[data-icon]");
    icon.style.background = hv.color + "2e";
    icon.innerHTML = `<ha-icon icon="${hv.icon}" style="color:${hv.color}"></ha-icon>`;
    const mode = this.shadowRoot.querySelector("[data-mode]");
    mode.innerHTML = `<ha-icon icon="${hv.icon}"></ha-icon><span>${hv.cn}</span>`;
    mode.style.color = hv.color;
    mode.style.background = hv.color + "24";

    const cur = parseFloat(st.attributes.current_temperature);
    const target = parseFloat(st.attributes.temperature);
    if (!isNaN(cur)) this.shadowRoot.querySelector("[data-temp]").innerHTML = `${cur.toFixed(1)}<span class="unit">°C</span>`;
    const parts = [];
    if (!isNaN(target)) parts.push(`设定 ${target.toFixed(0)}°`);
    if (st.attributes.fan_mode) parts.push(`风量 ${st.attributes.fan_mode}`);
    this.shadowRoot.querySelector("[data-sub]").textContent = parts.join(" · ") || hv.cn;
  }
}

class ClimatePixelCardEditor extends HTMLElement {
  setConfig(config) { this._config = config || {}; }
  set hass(hass) { this._hass = hass; this._render(); }
  get config() { return this._config; }
  _render() {
    if (!this._hass) return;
    this.innerHTML = `<style>.grid{display:flex;flex-direction:column;gap:12px;padding:8px 0}.row{display:flex;align-items:center;gap:8px}.row label{min-width:56px;font-size:13px;color:var(--primary-text-color)}</style>
      <div class="grid"><div class="row"><label>实体</label><ha-entity-picker id="entity" style="flex:1"></ha-entity-picker></div>
      <div class="row"><label>名称</label><ha-textfield id="name" style="flex:1" label="名称"></ha-textfield></div></div>`;
    const picker = this.querySelector("#entity");
    picker.hass = this._hass; picker.value = this._config.entity || ""; picker.includeDomains = ["climate"];
    picker.addEventListener("value-changed", (e) => this._set("entity", e.detail.value));
    const name = this.querySelector("#name");
    name.value = this._config.name || "空调";
    name.addEventListener("input", (e) => this._set("name", e.target.value));
  }
  _set(k, v) { this._config = { ...this._config, [k]: v }; this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true })); }
}

customElements.define("climate-pixel-card-editor", ClimatePixelCardEditor);
window.customCards = window.customCards || [];
if (!customElements.get("climate-pixel-card")) customElements.define("climate-pixel-card", ClimatePixelCard);
if (!window.customCards.some((c) => c.type === "climate-pixel-card")) {
  window.customCards.push({ type: "climate-pixel-card", name: "空调卡片", description: "简洁风空调卡：当前/设定温度、模式状态，支持可视化编辑", preview: true });
}
console.info(`%c CLIMATE-CARD %c v${CARD_VERSION} `, "color:#fff;background:#2b6ff2;font-weight:700", "color:#2b6ff2;background:#fff");
