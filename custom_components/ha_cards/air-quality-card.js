/**
 * Air Quality Card · PIXEL EDITION — Nothing 点阵像素风空气质量卡片 v2
 *
 * 设计语言：#0d0d0d 微网格底（22px 细格缓慢漂移）、5x7 点阵字形渲染全部数值、
 * LED 方灯 + 红色方块品牌标、VU 分段电平条（逐段错峰点亮）、等宽字体小标签。
 * 动效：数值滚动 tween（逐帧重绘点阵）、电平条 stagger 点亮、LED 呼吸辉光、
 * 背景网格 38s 漂移、级联入场揭示。尊重 prefers-reduced-motion。
 *
 * 用法：
 *   type: custom:air-quality-card
 *   title: 地下室空气
 *   overall: sensor.di_xia_shi_kong_qi_zhi_liang_zong_ping
 *   co2 / pm25 / tvoc / humidity / temperature: <entity_id>
 */

const CARD_VERSION = "2.0.1-pixel";

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
  "%":["11001","11010","00010","00100","01000","01011","10011"],
  "-":["00000","00000","00000","01110","00000","00000","00000"],
  " ":["0","0","0","0","0","0","0"],
  "A":["01110","10001","10001","11111","10001","10001","10001"],
  "B":["11110","10001","10001","11110","10001","10001","11110"],
  "D":["11110","10001","10001","10001","10001","10001","11110"],
  "F":["11111","10000","10000","11110","10000","10000","10000"],
  "G":["01110","10001","10000","10111","10001","10001","01110"],
  "I":["01110","00100","00100","00100","00100","00100","01110"],
  "O":["01110","10001","10001","10001","10001","10001","01110"],
  "P":["11110","10001","10001","11110","10000","10000","10000"],
  "R":["11110","10001","10001","11110","10100","10010","10001"],
};

function cellsOf(t) {
  let n = 0;
  for (const ch of t) { const g = G[ch]; if (g) n += g[0].length + 1; }
  return Math.max(n - 1, 0);
}

/* 点阵文字渲染：亮点用主色，灭点留 7% 底纹（像素屏质感的关键） */
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

/* ---------- 指标定义 ---------- */
const METRICS = {
  co2:         { label: "CO2",   unit: "PPM",   max: 2000, decimals: 0, bands: [800, 1500] },
  pm25:        { label: "PM2.5", unit: "UG/M3", max: 150,  decimals: 0, bands: [35, 75] },
  tvoc:        { label: "TVOC",  unit: "UG/M3", max: 1500, decimals: 0, bands: [300, 1000] },
  humidity:    { label: "HUMI",  unit: "%",     max: 100,  decimals: 0, bands: [70, 80], lowBad: 30 },
  temperature: { label: "TEMP",  unit: "°C",    max: 40,   decimals: 1, bands: null },
};

const OVERALL = {
  "优":   { word: "GOOD", color: C.green,  blocks: 4 },
  "良":   { word: "FAIR", color: C.amber,  blocks: 3 },
  "一般": { word: "POOR", color: C.orange, blocks: 2 },
  "差":   { word: "BAD",  color: C.red,    blocks: 1 },
};

function statusColor(key, v) {
  const m = METRICS[key];
  if (!m.bands) return C.text;
  if (m.lowBad !== undefined && v < m.lowBad) return C.red;
  if (v < m.bands[0]) return C.green;
  if (v < m.bands[1]) return C.amber;
  return C.red;
}

const SEGS = 14; // 每根 VU 条的分段数

class AirQualityCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._values = {};
    this._revealed = false;
  }

  setConfig(config) {
    this._config = {
      title: "地下室空气",
      overall: "", co2: "", pm25: "", tvoc: "", humidity: "", temperature: "",
      ...config,
    };
    this._render();
  }

  set hass(hass) { this._hass = hass; this._update(); }

  getCardSize() { return 4; }

  static getStubConfig() {
    return {
      title: "地下室空气",
      overall: "sensor.di_xia_shi_kong_qi_zhi_liang_zong_ping",
      co2: "sensor.daikin_air_sensor_899078_daikin_co2_sensor",
      pm25: "sensor.daikin_air_sensor_899078_daikin_pm2_5_sensor",
      tvoc: "sensor.daikin_air_sensor_899078_daikin_tvoc_sensor",
      humidity: "sensor.daikin_air_sensor_899078_daikin_humidity_sensor",
      temperature: "sensor.daikin_air_sensor_899078_daikin_temperature_sensor",
    };
  }

  _num(id) {
    const s = this._hass?.states?.[id];
    const v = parseFloat(s?.state);
    return isNaN(v) ? null : v;
  }

  _render() {
    const keys = Object.keys(METRICS);
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

        /* ---------- 顶栏 ---------- */
        .top { display: flex; align-items: center; gap: 10px; }
        .sq { width: 6px; height: 6px; background: ${C.brand}; flex: none; }
        .ttl { font-size: 9px; letter-spacing: .24em; color: ${C.dim}; text-transform: uppercase; }
        .top .right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
        .led {
          width: 7px; height: 7px; background: ${C.off}; flex: none;
          transition: background .4s ease;
        }
        .led.on { animation: led-breathe 3s ease-in-out infinite; }
        @keyframes led-breathe {
          0%, 100% { box-shadow: 0 0 4px var(--led-glow, rgba(63,191,111,.4)); }
          50%      { box-shadow: 0 0 10px var(--led-glow, rgba(63,191,111,.7)); }
        }
        .st-txt { font-size: 9px; letter-spacing: .18em; color: ${C.dim}; }

        /* ---------- 总评区 ---------- */
        .hero { display: flex; align-items: center; gap: 18px; padding: 16px 0 14px; }
        .hero .word { flex: none; }
        .hero .meta { flex: 1 1 auto; min-width: 0; }
        .hero .cn { font-size: 20px; font-weight: 600; letter-spacing: .3em; color: ${C.text}; }
        .hero .sub { margin-top: 6px; font-size: 9px; letter-spacing: .24em; color: ${C.faint}; text-transform: uppercase; }

        /* 总评电平块 */
        .blocks { display: flex; gap: 5px; margin-top: 10px; }
        .blk {
          width: 16px; height: 8px; background: ${C.off};
          border-radius: 2px;
          transition: background .4s ease, box-shadow .4s ease;
        }
        .blk.on { box-shadow: 0 0 8px var(--blk-glow, transparent); }
        ${[0,1,2,3].map(i => `.blk:nth-child(${i+1}) { transition-delay: ${i * 90}ms; }`).join("")}

        .divider { height: 1px; background: ${C.hair}; margin: 0 -16px; }

        /* ---------- 指标列 ---------- */
        .metrics { display: flex; padding-top: 12px; }
        .m {
          flex: 1; min-width: 0; display: flex; flex-direction: column;
          align-items: center; gap: 8px; padding: 0 4px;
        }
        .m + .m { border-left: 1px solid rgba(255,255,255,.07); }
        .m .num { height: 28px; display: flex; align-items: center; }
        .m .lb { font-size: 8px; letter-spacing: .18em; color: ${C.faint}; }
        .m .un { font-size: 8px; letter-spacing: .1em; color: ${C.faint}; margin-top: -5px; }

        /* VU 分段电平条 */
        .vu { display: flex; gap: 2px; }
        .seg {
          width: 4px; height: 12px; background: ${C.off};
          border-radius: 1.5px;
          transition: background .35s ease;
        }
        .seg:nth-child(1)  { transition-delay: 0ms; }   .seg:nth-child(2)  { transition-delay: 30ms; }
        .seg:nth-child(3)  { transition-delay: 60ms; }  .seg:nth-child(4)  { transition-delay: 90ms; }
        .seg:nth-child(5)  { transition-delay: 120ms; } .seg:nth-child(6)  { transition-delay: 150ms; }
        .seg:nth-child(7)  { transition-delay: 180ms; } .seg:nth-child(8)  { transition-delay: 210ms; }
        .seg:nth-child(9)  { transition-delay: 240ms; } .seg:nth-child(10) { transition-delay: 270ms; }
        .seg:nth-child(11) { transition-delay: 300ms; } .seg:nth-child(12) { transition-delay: 330ms; }
        .seg:nth-child(13) { transition-delay: 360ms; } .seg:nth-child(14) { transition-delay: 390ms; }

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
          <span class="ttl">AIR MON // ${this._config.title}</span>
          <span class="right">
            <span class="led"></span>
            <span class="st-txt">--</span>
          </span>
        </div>

        <div class="hero reveal" style="--i:1">
          <canvas class="word"></canvas>
          <div class="meta">
            <div class="cn">--</div>
            <div class="sub">OVERALL // 空气总评</div>
            <div class="blocks">
              <span class="blk"></span><span class="blk"></span>
              <span class="blk"></span><span class="blk"></span>
            </div>
          </div>
        </div>

        <div class="divider reveal" style="--i:2"></div>

        <div class="metrics">
          ${keys.map((k, i) => `
            <div class="m reveal" style="--i:${3 + i}" data-m="${k}">
              <div class="num"><canvas></canvas></div>
              <div class="vu">${"<span class='seg'></span>".repeat(SEGS)}</div>
              <div class="lb">${METRICS[k].label}</div>
              <div class="un">${METRICS[k].unit}</div>
            </div>`).join("")}
        </div>
      </div>
    `;

    this._wordCv = this.shadowRoot.querySelector(".word");
    this._metricEls = {};
    this.shadowRoot.querySelectorAll(".m").forEach((el) => {
      this._metricEls[el.dataset.m] = {
        cv: el.querySelector("canvas"),
        segs: el.querySelectorAll(".seg"),
      };
    });

    if (!this._revealed) {
      this._revealed = true;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => this.setAttribute("data-revealed", ""))
      );
    }
    this._update();
  }

  /* 数值滚动：逐帧重绘点阵数字 */
  _tweenPixels(key, cv, from, to, decimals, color) {
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
    segs.forEach((s, i) => {
      const on = i < lit;
      s.style.background = on ? color : C.off;
    });
  }

  _update() {
    if (!this._hass || !this._config) return;
    const cfg = this._config;

    /* ---- 总评 ---- */
    const st = this._hass.states?.[cfg.overall]?.state || "--";
    if (this._overall !== st) {
      this._overall = st;
      const o = OVERALL[st];
      const color = o ? o.color : C.dim;
      drawPixels(this._wordCv, o ? o.word : "--", 7, color);
      this.shadowRoot.querySelector(".hero .cn").textContent = st === "--" ? "读取中" : st;
      this.shadowRoot.querySelector(".hero .cn").style.color = color;
      const stTxt = this.shadowRoot.querySelector(".st-txt");
      stTxt.textContent = st === "--" ? "SYNC…" : st;
      const led = this.shadowRoot.querySelector(".led");
      led.classList.add("on");
      led.style.background = color;
      led.style.setProperty("--led-glow", color + "aa");
      this.shadowRoot.querySelectorAll(".blk").forEach((b, i) => {
        const on = o && i < o.blocks;
        b.classList.toggle("on", !!on);
        b.style.background = on ? color : C.off;
        b.style.setProperty("--blk-glow", on ? color + "88" : "transparent");
      });
    }

    /* ---- 指标 ---- */
    for (const key of Object.keys(METRICS)) {
      const m = METRICS[key];
      const els = this._metricEls[key];
      if (!els) continue;
      const v = this._num(cfg[key]);
      if (v === null) {
        drawPixels(els.cv, "--", 4, C.faint);
        this._setVu(els.segs, 0, C.off);
        continue;
      }
      const color = statusColor(key, v);
      const prev = this._values[key];
      if (prev === undefined || prev === null) {
        drawPixels(els.cv, v.toFixed(m.decimals), 4, color);
      } else if (Math.abs(prev - v) > 1e-9) {
        this._tweenPixels(key, els.cv, prev, v, m.decimals, color);
      }
      this._values[key] = v;
      this._setVu(els.segs, v / m.max, color);
    }
  }
}

if (!customElements.get("air-quality-card")) {
  customElements.define("air-quality-card", AirQualityCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "air-quality-card",
  name: "空气质量卡片 · 像素版",
  description: "Nothing 点阵像素风：5x7 点阵数值、VU 电平条、LED 呼吸灯、网格漂移背景",
  preview: true,
});

console.info(`%c AIR-QUALITY-CARD %c v${CARD_VERSION} `, "color:#0d0d0d;background:#e04b34;font-weight:700", "color:#e04b34;background:#0d0d0d");
