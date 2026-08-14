/**
 * Light Card · PIXEL EDITION v1.0.0
 * Nothing 点阵像素风灯光卡片 —— 与 air-quality / dishwasher / power / weather 统一设计语言。
 * 支持 HA 可视化编辑器（选择实体即可，无需手写 YAML）。
 *
 * 用法：
 *   type: custom:light-pixel-card
 *   entity: light.yeelink_cn_xxx          # 必填
 *   name: 客厅射灯
 */

const CARD_VERSION = "1.0.0-pixel";

const C = {
  bg: "#0d0d0d", grid: "rgba(255,255,255,.05)", text: "#eeeeee", dim: "#8a8a8a",
  faint: "#5a5a5a", off: "rgba(255,255,255,.07)", hair: "rgba(255,255,255,.1)",
  brand: "#e04b34", green: "#3fbf6f", amber: "#d9c24a", orange: "#e07834",
  red: "#ff5a3c", blue: "#4a9eff",
};
const MONO = 'ui-monospace,"SF Mono",Menlo,Consolas,"PingFang SC","Microsoft YaHei",monospace';
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const G = {
  "0":["01110","10001","10011","10101","11001","10001","01110"],
  "1":["00100","01100","00100","00100","00100","00100","01110"],
  "2":["01110","10001","00001","00010","00100","01000","11111"],
  "3":["11111","00010","00100","00010","00001","10001","01110"],
  "4":["00010","00110","01010","10010","11111","00010","00010"],
  "5":["11111","10000","11110","00001","00001","10001","01110"],
  "6":["00110","01000","10000","11110","10001","10001","01110"],
  "7":["11111","00001","00010","00100","01000","01000","01000"],
  "8":["01110","10001","10001","01110","10001","10001","01110"],
  "9":["01110","10001","10001","01111","00001","00010","01100"],
  ".":["00","00","00","00","00","11","11"],
  "-":["00000","00000","00000","01110","00000","00000","00000"],
  " ":["0","0","0","0","0","0","0"],
  "A":["01110","10001","10001","11111","10001","10001","10001"],
  "B":["11110","10001","10001","11110","10001","10001","11110"],
  "C":["01110","10001","10000","10000","10000","10001","01110"],
  "D":["11110","10001","10001","10001","10001","10001","11110"],
  "E":["11111","10000","10000","11110","10000","10000","11111"],
  "F":["11111","10000","10000","11110","10000","10000","10000"],
  "G":["01110","10000","10000","10111","10001","10001","01110"],
  "H":["10001","10001","10001","11111","10001","10001","10001"],
  "I":["01110","00100","00100","00100","00100","00100","01110"],
  "K":["10001","10010","10100","11000","10100","10010","10001"],
  "L":["10000","10000","10000","10000","10000","10000","11111"],
  "N":["10001","11001","10101","10011","10001","10001","10001"],
  "O":["01110","10001","10001","10001","10001","10001","01110"],
  "P":["11110","10001","10001","11110","10000","10000","10000"],
  "R":["11110","10001","10001","11110","10100","10010","10001"],
  "S":["01111","10000","10000","01110","00001","00001","11110"],
  "T":["11111","00100","00100","00100","00100","00100","00100"],
  "U":["10001","10001","10001","10001","10001","10001","01110"],
  "W":["10001","10001","10001","10101","10101","10101","01110"],
  "Y":["10001","10001","01010","00100","00100","00100","00100"],
};

function cellsOf(t) {
  let n = 0;
  for (const ch of t) { const g = G[ch]; if (g) n += g[0].length + 1; }
  return Math.max(n - 1, 0);
}

function drawPixels(cv, text, px, litColor) {
  const dpr = window.devicePixelRatio || 1;
  const w = cellsOf(text) * px, h = 7 * px;
  cv.width = w * dpr; cv.height = h * dpr;
  cv.style.width = w + "px"; cv.style.height = h + "px";
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  const dot = Math.max(px - Math.max(1, Math.round(px * 0.28)), 1);
  let cx = 0;
  for (const ch of text) {
    const g = G[ch]; if (!g) continue;
    const gw = g[0].length;
    for (let r = 0; r < 7; r++) for (let c = 0; c < gw; c++) {
      ctx.fillStyle = g[r][c] === "1" ? litColor : C.off;
      ctx.fillRect((cx + c) * px, r * px, dot, dot);
    }
    cx += gw + 1;
  }
}

const SEGS = 14;

class LightPixelCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._revealed = false;
    this._values = {};
  }

  setConfig(config) {
    this._config = { entity: "", name: "", ...config };
    if (!this._config.entity) throw new Error("light-pixel-card: 需要配置 entity");
    this._render();
  }

  set hass(hass) { this._hass = hass; this._update(); }

  getCardSize() { return 3; }

  static async getConfigElement() {
    return document.createElement("light-pixel-card-editor");
  }

  static getStubConfig() {
    return { entity: "", name: "灯光" };
  }

  _st() { return this._hass?.states?.[this._config.entity]; }
  _isOn() { return this._st()?.state === "on"; }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        .card {
          display: block; position: relative; overflow: hidden;
          background:
            linear-gradient(${C.grid} 1px, transparent 1px) 0 0 / 100% 22px,
            linear-gradient(90deg, ${C.grid} 1px, transparent 1px) 0 0 / 22px 100%,
            ${C.bg};
          border: 1px solid ${C.hair}; border-radius: 14px;
          color: ${C.text}; font-family: ${MONO};
          padding: 14px 16px 12px;
          animation: grid-pan 38s linear infinite; cursor: pointer;
        }
        @keyframes grid-pan { to { background-position: 0 22px, 22px 0, 0 0; } }
        .reveal { opacity: 0; transform: translateY(6px); transition: opacity .6s ${EASE}, transform .6s ${EASE}; transition-delay: calc(var(--i,0)*70ms); }
        :host([data-revealed]) .reveal { opacity: 1; transform: translateY(0); }

        .top { display: flex; align-items: center; gap: 10px; }
        .sq { width: 6px; height: 6px; background: ${C.brand}; flex: none; }
        .ttl { font-size: 9px; letter-spacing: .24em; color: ${C.dim}; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .top .right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
        .led { width: 7px; height: 7px; background: ${C.off}; flex: none; transition: background .4s ease; }
        .led.on { animation: led-breathe 3s ease-in-out infinite; }
        @keyframes led-breathe { 0%,100% { box-shadow: 0 0 4px var(--led-glow,rgba(217,194,74,.4)); } 50% { box-shadow: 0 0 10px var(--led-glow,rgba(217,194,74,.7)); } }
        .st-txt { font-size: 9px; letter-spacing: .18em; color: ${C.dim}; }

        .hero { display: flex; align-items: center; gap: 18px; padding: 12px 0 10px; }
        .hero .num { flex: none; }
        .hero .meta { flex: 1 1 auto; min-width: 0; }
        .hero .cn { font-size: 18px; font-weight: 600; letter-spacing: .3em; display: flex; align-items: center; gap: 8px; }
        .hero .cn ha-icon { width: 20px; height: 20px; }
        .hero .sub { margin-top: 6px; font-size: 9px; letter-spacing: .24em; color: ${C.faint}; text-transform: uppercase; }

        .blocks { display: flex; gap: 5px; margin-top: 10px; }
        .blk { width: 16px; height: 8px; background: ${C.off}; border-radius: 2px; transition: background .4s ease, box-shadow .4s ease; }
        .blk.on { box-shadow: 0 0 8px var(--blk-glow,transparent); }
        ${[0,1,2,3].map(i => `.blk:nth-child(${i+1}) { transition-delay: ${i*90}ms; }`).join("")}

        .divider { height: 1px; background: ${C.hair}; margin: 0 -16px; }

        .metrics { display: flex; padding-top: 12px; }
        .m { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 0 4px; }
        .m + .m { border-left: 1px solid rgba(255,255,255,.07); }
        .m .num { height: 28px; display: flex; align-items: center; }
        .m .lb { font-size: 8px; letter-spacing: .18em; color: ${C.faint}; }
        .m .un { font-size: 8px; letter-spacing: .1em; color: ${C.faint}; margin-top: -5px; }

        .vu { display: flex; gap: 2px; }
        .seg { width: 4px; height: 12px; background: ${C.off}; border-radius: 1.5px; transition: background .35s ease; }
        .seg:nth-child(1)  { transition-delay: 0ms; }   .seg:nth-child(2)  { transition-delay: 30ms; }
        .seg:nth-child(3)  { transition-delay: 60ms; }  .seg:nth-child(4)  { transition-delay: 90ms; }
        .seg:nth-child(5)  { transition-delay: 120ms; } .seg:nth-child(6)  { transition-delay: 150ms; }
        .seg:nth-child(7)  { transition-delay: 180ms; } .seg:nth-child(8)  { transition-delay: 210ms; }
        .seg:nth-child(9)  { transition-delay: 240ms; } .seg:nth-child(10) { transition-delay: 270ms; }
        .seg:nth-child(11) { transition-delay: 300ms; } .seg:nth-child(12) { transition-delay: 330ms; }
        .seg:nth-child(13) { transition-delay: 360ms; } .seg:nth-child(14) { transition-delay: 390ms; }

        .actions { display: flex; gap: 8px; padding-top: 12px; }
        .btn { flex: 1; text-align: center; padding: 10px 0; font-family: ${MONO}; font-size: 9px; letter-spacing: .24em; border: 1px solid ${C.hair}; border-radius: 2px; background: transparent; color: ${C.dim}; cursor: pointer; text-transform: uppercase; transition: background .3s ease, color .3s ease; }
        .btn.power.on { border-color: var(--pw-c,${C.amber}); color: var(--pw-c,${C.amber}); }
        .btn:active { background: rgba(255,255,255,.08); }

        @media (prefers-reduced-motion: reduce) {
          .card { animation: none; }
          .reveal { transition: none; opacity: 1; transform: none; }
          .led.on { animation: none; }
          .seg, .blk { transition: none; }
        }
      </style>

      <div class="card">
        <div class="top reveal" style="--i:0">
          <span class="sq"></span>
          <span class="ttl">LGT // ${this._config.name}</span>
          <span class="right"><span class="led"></span><span class="st-txt">--</span></span>
        </div>
        <div class="hero reveal" style="--i:1">
          <canvas class="num"></canvas>
          <div class="meta">
            <div class="cn">--</div>
            <div class="sub">LIGHT // 灯光状态</div>
            <div class="blocks"><span class="blk"></span><span class="blk"></span><span class="blk"></span><span class="blk"></span></div>
          </div>
        </div>
        <div class="divider reveal" style="--i:2"></div>
        <div class="metrics">
          <div class="m reveal" style="--i:3" data-m="bright">
            <div class="num"><canvas></canvas></div>
            <div class="vu">${"<span class='seg'></span>".repeat(SEGS)}</div>
            <div class="lb">BRIGHTNESS</div><div class="un">%</div>
          </div>
        </div>
        <div class="actions reveal" style="--i:4">
          <button class="btn power" data-act="power">POWER</button>
          <button class="btn" data-act="info">INFO</button>
        </div>
      </div>
    `;

    this._heroCv = this.shadowRoot.querySelector(".hero .num");
    this._brightEls = { cv: this.shadowRoot.querySelector('[data-m="bright"] canvas'), segs: this.shadowRoot.querySelectorAll('[data-m="bright"] .seg') };
    this.shadowRoot.querySelector(".card").addEventListener("click", (ev) => {
      const act = ev.target.closest("[data-act]")?.dataset.act;
      if (act === "info") { this._moreInfo(); return; }
      this._toggle();
    });
    if (!this._revealed) {
      this._revealed = true;
      requestAnimationFrame(() => requestAnimationFrame(() => this.setAttribute("data-revealed", "")));
    }
    this._update();
  }

  _tweenPixels(cv, from, to, color) {
    if (cv._raf) cancelAnimationFrame(cv._raf);
    const start = performance.now(), dur = 650;
    const step = (now) => {
      const t = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - t, 3);
      drawPixels(cv, Math.round(from + (to - from) * e).toString(), 4, color);
      if (t < 1) cv._raf = requestAnimationFrame(step);
    };
    cv._raf = requestAnimationFrame(step);
  }

  _setVu(segs, fraction, color) {
    const lit = Math.round(Math.max(0, Math.min(1, fraction)) * SEGS);
    segs.forEach((s, i) => { s.style.background = i < lit ? color : C.off; });
  }

  _update() {
    if (!this._hass || !this._config) return;
    const st = this._st();
    const on = st?.state === "on";
    const color = on ? C.amber : C.dim;

    if (this._statusKey !== (on ? "ON" : "OFF")) {
      this._statusKey = on ? "ON" : "OFF";
      const cn = this.shadowRoot.querySelector(".hero .cn");
      cn.innerHTML = `<ha-icon icon="${on ? "mdi:lightbulb-on" : "mdi:lightbulb-off-outline"}"></ha-icon><span>${on ? "已开启" : "已关闭"}</span>`;
      cn.style.color = color;
      const stTxt = this.shadowRoot.querySelector(".st-txt");
      stTxt.textContent = on ? "ON" : "OFF";
      stTxt.style.color = color;
      const led = this.shadowRoot.querySelector(".led");
      led.classList.add("on");
      led.style.background = color;
      led.style.setProperty("--led-glow", color + "aa");
    }

    const bri = on ? parseFloat(st.attributes.brightness) || 100 : 0;
    drawPixels(this._heroCv, on ? Math.round(bri).toString() : "OFF", on ? 7 : 6, color);
    const prev = this._values.bright;
    if (prev === undefined) drawPixels(this._brightEls.cv, Math.round(bri).toString(), 4, color);
    else if (Math.abs(prev - bri) > 0.5) this._tweenPixels(this._brightEls.cv, prev, bri, color);
    this._values.bright = bri;
    this._setVu(this._brightEls.segs, on ? bri / 100 : 0, color);

    this.shadowRoot.querySelectorAll(".blk").forEach((b, i) => {
      const litB = on && i < Math.ceil((bri / 100) * 4);
      b.classList.toggle("on", !!litB);
      b.style.background = litB ? color : C.off;
      b.style.setProperty("--blk-glow", litB ? color + "88" : "transparent");
    });

    const pBtn = this.shadowRoot.querySelector(".btn.power");
    pBtn.textContent = on ? "PWR OFF" : "PWR ON";
    pBtn.classList.toggle("on", on);
    pBtn.style.setProperty("--pw-c", color);
  }

  _toggle() {
    const eid = this._config.entity;
    if (!eid) return;
    this._hass.callService("light", "toggle", { entity_id: eid });
  }

  _moreInfo() {
    window.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: this._config.entity } }));
  }
}

class LightPixelCardEditor extends HTMLElement {
  setConfig(config) { this._config = config || {}; }
  set hass(hass) { this._hass = hass; this._render(); }
  get config() { return this._config; }

  _render() {
    if (!this._hass) return;
    this.innerHTML = `
      <style>
        .grid { display: flex; flex-direction: column; gap: 12px; padding: 8px 0; }
        .row { display: flex; align-items: center; gap: 8px; }
        .row label { min-width: 56px; font-size: 13px; color: var(--primary-text-color); }
      </style>
      <div class="grid">
        <div class="row">
          <label>实体</label>
          <ha-entity-picker id="entity" style="flex:1"></ha-entity-picker>
        </div>
        <div class="row">
          <label>名称</label>
          <ha-textfield id="name" style="flex:1" label="名称"></ha-textfield>
        </div>
      </div>
    `;
    const picker = this.querySelector("#entity");
    picker.hass = this._hass;
    picker.value = this._config.entity || "";
    picker.includeDomains = ["light"];
    picker.addEventListener("value-changed", (e) => this._set("entity", e.detail.value));
    const name = this.querySelector("#name");
    name.value = this._config.name || "灯光";
    name.addEventListener("input", (e) => this._set("name", e.target.value));
  }

  _set(k, v) {
    this._config = { ...this._config, [k]: v };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
  }
}

customElements.define("light-pixel-card-editor", LightPixelCardEditor);
window.customCards = window.customCards || [];
if (!customElements.get("light-pixel-card")) {
  customElements.define("light-pixel-card", LightPixelCard);
}
if (!window.customCards.some((c) => c.type === "light-pixel-card")) {
  window.customCards.push({
    type: "light-pixel-card",
    name: "灯光卡片 · 像素版",
    description: "Nothing 点阵像素风灯光卡：亮度点阵 + VU 电平，支持可视化编辑",
    preview: true,
  });
}
console.info(`%c LIGHT-PIXEL-CARD %c v${CARD_VERSION} `, "color:#0d0d0d;background:#e04b34;font-weight:700", "color:#e04b34;background:#0d0d0d");
