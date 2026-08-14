/**
 * Weather Card · PIXEL EDITION v1.0.0
 * Nothing 点阵像素风天气卡片 —— 与 air-quality / dishwasher / power 卡片统一设计语言：
 * #0d0d0d 微网格底、5x7 点阵字形、VU 分段电平条、LED 呼吸灯、级联入场。
 *
 * 功能：
 *   - 当前温度（大字点阵）+ 天气状态（mdi 图标 + 中英文）
 *   - 体感温度 / 湿度 / 风速 / 气压 / 能见度
 *   - 未来 4 天预报（日期 + 图标 + 高/低温点阵）
 *   - 状态色随天气变化（晴=琥珀 / 雨雪=蓝 / 雷暴=橙红）
 *
 * 用法：
 *   type: custom:weather-pixel-card
 *   entity: weather.he_feng_tian_qi
 *   name: 天气
 */

const CARD_VERSION = "1.0.0-pixel";

const C = {
  bg: "#0d0d0d",
  grid: "rgba(255,255,255,.05)",
  text: "#eeeeee",
  dim: "#8a8a8a",
  faint: "#5a5a5a",
  off: "rgba(255,255,255,.07)",
  hair: "rgba(255,255,255,.1)",
  brand: "#e04b34",
  green: "#3fbf6f",
  amber: "#d9c24a",
  orange: "#e07834",
  red: "#ff5a3c",
  blue: "#4a9eff",
};

const MONO = 'ui-monospace,"SF Mono",Menlo,Consolas,"PingFang SC","Microsoft YaHei",monospace';
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/* ---------- 5x7 点阵字形 ---------- */
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

/* ---------- 天气状态映射 ---------- */
const CONDITIONS = {
  "clear-night":    { cn: "晴夜",     word: "CLEAR", icon: "mdi:weather-night",         color: C.blue },
  cloudy:           { cn: "阴",       word: "CLOUDY", icon: "mdi:weather-cloudy",       color: C.dim },
  fog:              { cn: "雾",       word: "FOG",    icon: "mdi:weather-fog",          color: C.dim },
  hail:             { cn: "冰雹",     word: "HAIL",   icon: "mdi:weather-hail",         color: C.blue },
  lightning:        { cn: "雷",       word: "STORM",  icon: "mdi:weather-lightning",    color: C.orange },
  "lightning-rainy":{ cn: "雷阵雨",   word: "STORM",  icon: "mdi:weather-lightning-rainy", color: C.orange },
  partlycloudy:     { cn: "多云",     word: "CLOUDY", icon: "mdi:weather-partly-cloudy", color: C.amber },
  pouring:          { cn: "大雨",     word: "RAIN",   icon: "mdi:weather-pouring",      color: C.blue },
  rainy:            { cn: "雨",       word: "RAIN",   icon: "mdi:weather-rainy",        color: C.blue },
  snowy:            { cn: "雪",       word: "SNOW",   icon: "mdi:weather-snowy",        color: C.blue },
  "snowy-rainy":    { cn: "雨夹雪",   word: "SLEET",  icon: "mdi:weather-snowy-rainy",  color: C.blue },
  sunny:            { cn: "晴",       word: "SUNNY",  icon: "mdi:weather-sunny",        color: C.amber },
  windy:            { cn: "大风",     word: "WINDY",  icon: "mdi:weather-windy",        color: C.green },
  "windy-variant":  { cn: "强风",     word: "WINDY",  icon: "mdi:weather-windy-variant",color: C.green },
  exceptional:      { cn: "异常",     word: "ALERT",  icon: "mdi:alert",                color: C.red },
};

const SEGS = 14;

class WeatherPixelCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._revealed = false;
    this._values = {};
  }

  setConfig(config) {
    this._config = {
      entity: "", name: "天气",
      ...config,
    };
    if (!this._config.entity) {
      throw new Error("weather-pixel-card: 需要配置 entity（天气实体）");
    }
    this._render();
  }

  set hass(hass) { this._hass = hass; this._update(); }

  getCardSize() { return 5; }

  _num(key) {
    const s = this._hass?.states?.[this._config.entity];
    const v = parseFloat(s?.attributes?.[key]);
    return isNaN(v) ? null : v;
  }

  _cond() {
    const s = this._hass?.states?.[this._config.entity];
    return CONDITIONS[s?.state] || CONDITIONS.exceptional;
  }

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
          border: 1px solid ${C.hair};
          border-radius: 14px;
          color: ${C.text};
          font-family: ${MONO};
          padding: 14px 16px 12px;
          animation: grid-pan 38s linear infinite;
        }
        @keyframes grid-pan { to { background-position: 0 22px, 22px 0, 0 0; } }

        .reveal {
          opacity: 0; transform: translateY(6px);
          transition: opacity 0.6s ${EASE}, transform 0.6s ${EASE};
          transition-delay: calc(var(--i, 0) * 70ms);
        }
        :host([data-revealed]) .reveal { opacity: 1; transform: translateY(0); }

        .top { display: flex; align-items: center; gap: 10px; }
        .sq { width: 6px; height: 6px; background: ${C.brand}; flex: none; }
        .ttl { font-size: 9px; letter-spacing: .24em; color: ${C.dim}; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .top .right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
        .led { width: 7px; height: 7px; background: ${C.off}; flex: none; transition: background .4s ease; }
        .led.on { animation: led-breathe 3s ease-in-out infinite; }
        @keyframes led-breathe {
          0%, 100% { box-shadow: 0 0 4px var(--led-glow, rgba(217,194,74,.4)); }
          50%      { box-shadow: 0 0 10px var(--led-glow, rgba(217,194,74,.7)); }
        }
        .st-txt { font-size: 9px; letter-spacing: .18em; color: ${C.dim}; }

        .hero { display: flex; align-items: center; gap: 18px; padding: 14px 0 12px; }
        .hero .num { flex: none; }
        .hero .meta { flex: 1 1 auto; min-width: 0; }
        .hero .cn { font-size: 18px; font-weight: 600; letter-spacing: .3em; display: flex; align-items: center; gap: 8px; }
        .hero .cn ha-icon { width: 20px; height: 20px; }
        .hero .sub { margin-top: 6px; font-size: 9px; letter-spacing: .24em; color: ${C.faint}; text-transform: uppercase; }
        .hero .unit { margin-top: 4px; font-size: 9px; letter-spacing: .2em; color: ${C.faint}; }

        .blocks { display: flex; gap: 5px; margin-top: 10px; }
        .blk { width: 16px; height: 8px; background: ${C.off}; border-radius: 2px; transition: background .4s ease, box-shadow .4s ease; }
        .blk.on { box-shadow: 0 0 8px var(--blk-glow, transparent); }
        ${[0,1,2,3].map(i => `.blk:nth-child(${i+1}) { transition-delay: ${i * 90}ms; }`).join("")}

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

        /* ---------- 预报 ---------- */
        .fc { display: flex; padding-top: 12px; }
        .f { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 0 2px; }
        .f + .f { border-left: 1px solid rgba(255,255,255,.07); }
        .f .day { font-size: 8px; letter-spacing: .14em; color: ${C.faint}; white-space: nowrap; }
        .f ha-icon { width: 16px; height: 16px; color: var(--fc-c, ${C.dim}); }
        .f .temps { display: flex; gap: 6px; align-items: flex-end; }
        .f .temps .hi { }
        .f .temps .lo { opacity: .55; }

        .rows { padding-top: 12px; }
        .row { display: flex; align-items: center; gap: 10px; padding: 7px 2px; border-top: 1px solid rgba(255,255,255,.07); font-size: 9px; letter-spacing: .16em; }
        .row:first-child { border-top: none; padding-top: 0; }
        .row .k { flex: 1; color: ${C.faint}; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .row .v { color: ${C.text}; text-align: right; }

        .actions { display: flex; gap: 8px; padding-top: 12px; }
        .btn {
          flex: 1; text-align: center; padding: 10px 0;
          font-family: ${MONO}; font-size: 9px; letter-spacing: .24em;
          border: 1px solid ${C.hair}; border-radius: 2px;
          background: transparent; color: ${C.dim}; cursor: pointer;
          text-transform: uppercase; transition: background .3s ease, color .3s ease;
        }
        .btn:active { background: rgba(255,255,255,.08); }

        @media (max-width: 400px) {
          .metrics { flex-wrap: wrap; }
          .m { flex: 0 0 33%; padding: 6px 4px; }
          .m + .m { border-left: 0; }
        }
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
          <span class="ttl">WTHR // ${this._config.name}</span>
          <span class="right"><span class="led"></span><span class="st-txt">--</span></span>
        </div>

        <div class="hero reveal" style="--i:1">
          <canvas class="num"></canvas>
          <div class="meta">
            <div class="cn">--</div>
            <div class="sub">NOW // 当前天气</div>
            <div class="blocks"><span class="blk"></span><span class="blk"></span><span class="blk"></span><span class="blk"></span></div>
          </div>
        </div>

        <div class="divider reveal" style="--i:2"></div>

        <div class="metrics">
          <div class="m reveal" style="--i:3" data-m="humi">
            <div class="num"><canvas></canvas></div>
            <div class="vu">${"<span class='seg'></span>".repeat(SEGS)}</div>
            <div class="lb">HUMIDITY</div><div class="un">%</div>
          </div>
          <div class="m reveal" style="--i:4" data-m="wind">
            <div class="num"><canvas></canvas></div>
            <div class="vu">${"<span class='seg'></span>".repeat(SEGS)}</div>
            <div class="lb">WIND</div><div class="un">KM/H</div>
          </div>
          <div class="m reveal" style="--i:5" data-m="pres">
            <div class="num"><canvas></canvas></div>
            <div class="vu">${"<span class='seg'></span>".repeat(SEGS)}</div>
            <div class="lb">PRESSURE</div><div class="un">HPA</div>
          </div>
        </div>

        <div class="fc reveal" style="--i:6" data-part="fc"></div>
        <div class="rows reveal" style="--i:7" data-part="rows"></div>

        <div class="actions reveal" style="--i:8">
          <button class="btn" data-act="info">INFO</button>
        </div>
      </div>
    `;

    this._heroCv = this.shadowRoot.querySelector(".hero .num");
    this._metricEls = {};
    this.shadowRoot.querySelectorAll(".m").forEach((el) => {
      this._metricEls[el.dataset.m] = {
        cv: el.querySelector("canvas"),
        segs: el.querySelectorAll(".seg"),
      };
    });

    this.shadowRoot.querySelector(".card").addEventListener("click", (ev) => {
      if (ev.target.closest("[data-act='info']")) this._moreInfo();
    });

    if (!this._revealed) {
      this._revealed = true;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => this.setAttribute("data-revealed", ""))
      );
    }
    this._update();
  }

  _tweenPixels(cv, from, to, decimals, color) {
    if (cv._raf) cancelAnimationFrame(cv._raf);
    const start = performance.now(), dur = 650;
    const step = (now) => {
      const t = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - t, 3);
      drawPixels(cv, (from + (to - from) * e).toFixed(decimals), 4, color);
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
    const cfg = this._config;
    const ent = this._hass?.states?.[cfg.entity];
    const cond = this._cond();
    const color = cond.color;

    /* 状态区 */
    if (this._statusKey !== cond.word) {
      this._statusKey = cond.word;
      const cn = this.shadowRoot.querySelector(".hero .cn");
      cn.innerHTML = `<ha-icon icon="${cond.icon}"></ha-icon><span>${cond.cn}</span>`;
      cn.style.color = color;
      const stTxt = this.shadowRoot.querySelector(".st-txt");
      stTxt.textContent = cond.word;
      stTxt.style.color = color;
      const led = this.shadowRoot.querySelector(".led");
      led.classList.add("on");
      led.style.background = color;
      led.style.setProperty("--led-glow", color + "aa");
    }

    /* hero 温度 */
    const t = parseFloat(ent?.attributes?.temperature);
    if (!isNaN(t)) {
      drawPixels(this._heroCv, t.toFixed(0) + "°", 8, color);
    } else {
      drawPixels(this._heroCv, "--", 8, C.faint);
    }

    /* 湿度/风/气压 VU */
    const setM = (key, attr, max, color2, d) => {
      const els = this._metricEls[key];
      if (!els) return;
      const v = parseFloat(ent?.attributes?.[attr]);
      if (isNaN(v)) { drawPixels(els.cv, "--", 4, C.faint); this._setVu(els.segs, 0, C.off); return; }
      const prev = this._values[key];
      if (prev === undefined || prev === null) {
        drawPixels(els.cv, v.toFixed(d || 0), 4, color2);
      } else if (Math.abs(prev - v) > 1e-9) {
        this._tweenPixels(els.cv, prev, v, d || 0, color2);
      }
      this._values[key] = v;
      this._setVu(els.segs, Math.min(v, max) / max, color2);
    };
    setM("humi", "humidity", 100, C.blue, 0);
    setM("wind", "wind_speed", 60, C.green, 0);
    setM("pres", "pressure", 1050, C.text, 0);

    /* 云量电平块 */
    const cloud = parseFloat(ent?.attributes?.cloud_coverage);
    const blkColor = isNaN(cloud) ? C.dim : (cloud >= 80 ? C.dim : C.amber);
    this.shadowRoot.querySelectorAll(".blk").forEach((b, i) => {
      const on = !isNaN(cloud) && i < Math.ceil((cloud / 100) * 4);
      b.classList.toggle("on", !!on);
      b.style.background = on ? blkColor : C.off;
      b.style.setProperty("--blk-glow", on ? blkColor + "88" : "transparent");
    });

    /* 预报 */
    const fc = ent?.attributes?.forecast;
    const fcEl = this.shadowRoot.querySelector('[data-part="fc"]');
    if (Array.isArray(fc) && fc.length) {
      const days = ["日", "一", "二", "三", "四", "五", "六"];
      const today = new Date();
      const html = fc.slice(0, 4).map((d, i) => {
        const when = new Date((d.datetime || "").replace(/-/g, "/"));
        const dayLabel = i === 0 ? "TODAY" : (isNaN(when.getTime()) ? "DAY" + (i + 1) : (days[when.getDay()] ? "周" + days[when.getDay()] : "DAY" + (i + 1)));
        const c = CONDITIONS[d.condition] || CONDITIONS.exceptional;
        const hi = parseFloat(d.temperature);
        const lo = parseFloat(d.templow);
        const hiTxt = isNaN(hi) ? "--" : hi.toFixed(0);
        const loTxt = isNaN(lo) ? "--" : lo.toFixed(0);
        return `<div class="f">
          <span class="day">${dayLabel}</span>
          <ha-icon icon="${c.icon}" style="--fc-c:${c.color}"></ha-icon>
          <div class="temps">
            <span class="hi"><canvas data-hi></canvas></span>
            <span class="lo"><canvas data-lo></canvas></span>
          </div>
        </div>`;
      }).join("");
      fcEl.innerHTML = html;
      fcEl.querySelectorAll(".f").forEach((f, i) => {
        const d = fc[i];
        const hi = parseFloat(d?.temperature), lo = parseFloat(d?.templow);
        drawPixels(f.querySelector("[data-hi]"), isNaN(hi) ? "--" : hi.toFixed(0), 3, C.text);
        drawPixels(f.querySelector("[data-lo]"), isNaN(lo) ? "--" : lo.toFixed(0), 3, C.dim);
      });
    } else {
      fcEl.innerHTML = `<div class="row" style="width:100%"><span class="k">FORECAST</span><span class="v">--</span></div>`;
    }

    /* 明细行 */
    const rows = [];
    const row = (k, v) => `<div class="row"><span class="k">${k}</span><span class="v">${v}</span></div>`;
    const feel = parseFloat(ent?.attributes?.apparent_temperature);
    if (!isNaN(feel)) rows.push(row("体感温度", feel.toFixed(0) + "°C"));
    if (ent?.attributes?.wind_bearing) rows.push(row("风向", ent.attributes.wind_bearing));
    const vis = parseFloat(ent?.attributes?.visibility);
    if (!isNaN(vis)) rows.push(row("能见度", vis.toFixed(0) + " km"));
    this.shadowRoot.querySelector('[data-part="rows"]').innerHTML = rows.join("");
  }

  _moreInfo() {
    window.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: this._config.entity } }));
  }
}

if (!customElements.get("weather-pixel-card")) {
  customElements.define("weather-pixel-card", WeatherPixelCard);
}
if (!window.customCards.some((c) => c.type === "weather-pixel-card")) {
  window.customCards.push({
    type: "weather-pixel-card",
    name: "天气卡片 · 像素版",
    description: "Nothing 点阵像素风：当前温度、状态图标、湿度/风速/气压、4天预报",
    preview: true,
  });
}

console.info(`%c WEATHER-PIXEL-CARD %c v${CARD_VERSION} `, "color:#0d0d0d;background:#e04b34;font-weight:700", "color:#e04b34;background:#0d0d0d");
