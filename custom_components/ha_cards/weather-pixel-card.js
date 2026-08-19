/**
 * Weather Card v2.0.0 — 简洁风
 * 深色底、大号清晰温度，信息优先。含当前天气、体感/湿度/风/气压、4天预报。
 *
 * 用法：
 *   type: custom:weather-pixel-card
 *   entity: weather.he_feng_tian_qi
 *   name: 天气
 */

const CARD_VERSION = "2.0.0";
const FONT = 'var(--primary-font-family, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif)';

const CONDITIONS = {
  "clear-night": { cn: "晴夜", icon: "mdi:weather-night", color: "#6ea8ff" },
  cloudy: { cn: "阴", icon: "mdi:weather-cloudy", color: "#9aa0a6" },
  fog: { cn: "雾", icon: "mdi:weather-fog", color: "#9aa0a6" },
  hail: { cn: "冰雹", icon: "mdi:weather-hail", color: "#6ea8ff" },
  lightning: { cn: "雷", icon: "mdi:weather-lightning", color: "#ffb020" },
  "lightning-rainy": { cn: "雷阵雨", icon: "mdi:weather-lightning-rainy", color: "#ffb020" },
  partlycloudy: { cn: "多云", icon: "mdi:weather-partly-cloudy", color: "#ffd166" },
  pouring: { cn: "大雨", icon: "mdi:weather-pouring", color: "#6ea8ff" },
  rainy: { cn: "雨", icon: "mdi:weather-rainy", color: "#6ea8ff" },
  snowy: { cn: "雪", icon: "mdi:weather-snowy", color: "#9ad8ff" },
  "snowy-rainy": { cn: "雨夹雪", icon: "mdi:weather-snowy-rainy", color: "#9ad8ff" },
  sunny: { cn: "晴", icon: "mdi:weather-sunny", color: "#ffd166" },
  windy: { cn: "大风", icon: "mdi:weather-windy", color: "#4cde8b" },
  "windy-variant": { cn: "强风", icon: "mdi:weather-windy-variant", color: "#4cde8b" },
  exceptional: { cn: "异常", icon: "mdi:alert", color: "#ff5a5a" },
};

class WeatherPixelCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); }

  setConfig(config) {
    this._config = { entity: "", name: "天气", ...config };
    if (!this._config.entity) throw new Error("weather-pixel-card: 需要配置 entity");
    this._render();
  }

  set hass(hass) { this._hass = hass; this._update(); }
  getCardSize() { return 4; }

  _cond() { const s = this._hass?.states?.[this._config.entity]; return CONDITIONS[s?.state] || CONDITIONS.exceptional; }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        .card { background: #141417; border: 1px solid rgba(255,255,255,.08); border-radius: 14px; color: #eee; font-family: ${FONT}; padding: 16px 18px; }
        .head { display: flex; align-items: center; gap: 10px; }
        .icon { width: 34px; height: 34px; border-radius: 9px; flex: none; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,.08); }
        .icon ha-icon { width: 20px; height: 20px; color: #fff; }
        .name { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cond { margin-left: auto; display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; }
        .cond ha-icon { width: 18px; height: 18px; }
        .value-row { display: flex; align-items: baseline; gap: 10px; padding: 14px 0 4px; }
        .value { font-size: 40px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.1; }
        .value .unit { font-size: 16px; font-weight: 500; color: #9aa0a6; margin-left: 4px; }
        .sub { font-size: 12px; color: #9aa0a6; }
        .rows { margin-top: 8px; }
        .row { display: flex; justify-content: space-between; padding: 9px 0; border-top: 1px solid rgba(255,255,255,.07); font-size: 13px; }
        .row .k { color: #9aa0a6; }
        .row .v { font-weight: 600; font-variant-numeric: tabular-nums; }
        .fc { display: flex; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,.07); }
        .f { flex: 1; text-align: center; padding: 8px 4px; border-radius: 10px; background: rgba(255,255,255,.05); }
        .f .day { font-size: 11px; color: #9aa0a6; }
        .f ha-icon { width: 20px; height: 20px; margin: 6px auto; display: block; }
        .f .t { font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; }
        .f .t .lo { color: #9aa0a6; font-weight: 500; }
      </style>
      <div class="card">
        <div class="head">
          <div class="icon"><ha-icon icon="mdi:weather-partly-cloudy"></ha-icon></div>
          <div class="name">${this._config.name}</div>
          <div class="cond" data-cond>--</div>
        </div>
        <div class="value-row"><div class="value" data-temp>--<span class="unit">°C</span></div></div>
        <div class="sub" data-sub>--</div>
        <div class="rows" data-rows></div>
        <div class="fc" data-fc></div>
      </div>
    `;
    this._update();
  }

  _update() {
    if (!this._hass || !this._config) return;
    const ent = this._hass?.states?.[this._config.entity];
    const cond = this._cond();
    const condEl = this.shadowRoot.querySelector("[data-cond]");
    condEl.innerHTML = `<ha-icon icon="${cond.icon}"></ha-icon><span style="color:${cond.color}">${cond.cn}</span>`;

    const t = parseFloat(ent?.attributes?.temperature);
    if (!isNaN(t)) this.shadowRoot.querySelector("[data-temp]").innerHTML = `${t.toFixed(0)}<span class="unit">°C</span>`;

    const feel = parseFloat(ent?.attributes?.apparent_temperature);
    const humi = ent?.attributes?.humidity;
    const sub = [isNaN(feel) ? null : `体感 ${feel.toFixed(0)}°`, humi == null ? null : `湿度 ${humi}%`].filter(Boolean).join(" · ");
    this.shadowRoot.querySelector("[data-sub]").textContent = sub || "--";

    const rows = [];
    const r = (k, v) => `<div class="row"><span class="k">${k}</span><span class="v">${v}</span></div>`;
    const wind = parseFloat(ent?.attributes?.wind_speed);
    if (wind != null && !isNaN(wind)) rows.push(r("风速", wind.toFixed(0) + " km/h"));
    if (ent?.attributes?.wind_bearing) rows.push(r("风向", ent.attributes.wind_bearing));
    const pres = parseFloat(ent?.attributes?.pressure);
    if (pres != null && !isNaN(pres)) rows.push(r("气压", pres.toFixed(0) + " hPa"));
    const vis = parseFloat(ent?.attributes?.visibility);
    if (vis != null && !isNaN(vis)) rows.push(r("能见度", vis.toFixed(0) + " km"));
    this.shadowRoot.querySelector("[data-rows]").innerHTML = rows.join("");

    const fc = ent?.attributes?.forecast;
    const fcEl = this.shadowRoot.querySelector("[data-fc]");
    if (Array.isArray(fc) && fc.length) {
      const days = ["日", "一", "二", "三", "四", "五", "六"];
      fcEl.innerHTML = fc.slice(0, 4).map((d, i) => {
        const when = new Date((d.datetime || "").replace(/-/g, "/"));
        const day = i === 0 ? "今天" : isNaN(when.getTime()) ? "DAY" + (i + 1) : "周" + days[when.getDay()];
        const c = CONDITIONS[d.condition] || CONDITIONS.exceptional;
        const hi = parseFloat(d.temperature), lo = parseFloat(d.templow);
        return `<div class="f"><div class="day">${day}</div><ha-icon icon="${c.icon}" style="color:${c.color}"></ha-icon><div class="t">${isNaN(hi) ? "--" : hi.toFixed(0)}° <span class="lo">${isNaN(lo) ? "--" : lo.toFixed(0)}°</span></div></div>`;
      }).join("");
    } else {
      fcEl.innerHTML = "";
    }
  }
}

window.customCards = window.customCards || [];
if (!customElements.get("weather-pixel-card")) customElements.define("weather-pixel-card", WeatherPixelCard);
if (!window.customCards.some((c) => c.type === "weather-pixel-card")) {
  window.customCards.push({ type: "weather-pixel-card", name: "天气卡片", description: "简洁风天气卡：当前温度/体感/湿度/风/气压、4天预报", preview: true });
}
console.info(`%c WEATHER-CARD %c v${CARD_VERSION} `, "color:#fff;background:#2b6ff2;font-weight:700", "color:#2b6ff2;background:#fff");
