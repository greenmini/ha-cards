/**
 * Power Card · PIXEL EDITION v1.1.1
 * Nothing 点阵像素风电力/用电卡片 —— 与 ha-air-quality-card / dishwasher-card 统一设计语言：
 * #0d0d0d 微网格底、5x7 点阵字形、VU 分段电平条、LED 呼吸灯、级联入场。
 * v1.1.0：引入 Amicro mono-charts 数据处理 —— 5 级色阶、面积渐变条形图、
 *         较昨日 KPI 变化率、热力强度条。
 *
 * 功能：
 *   - 今日用电量（大字点阵 + 较昨日 KPI 变化率）
 *   - 本月 / 今年用电量 + 实时功率（点阵数字 + VU）
 *   - 峰/平/谷/尖 时段用电分布（像素电平条）
 *   - 近 7 天日用电量（像素条形图，5 级热力色 + 渐变，走 HA history API）
 *   - 本月/今年电费 + 电费余额（余额低时红色警示 + LED）
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

const CARD_VERSION = "1.1.1-pixel";

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
  lime: "#8bc34a",
  amber: "#d9c24a",
  orange: "#e07834",
  red: "#ff5a3c",
};

/* 5 级色阶（Amicro mono-charts 风格）：very good / good / fair / poor / very poor */
const LEVELS5 = [C.green, C.lime, C.amber, C.orange, C.red];
function progressLevel5(v) {
  if (v < 20) return 0;
  if (v < 40) return 1;
  if (v < 60) return 2;
  if (v < 80) return 3;
  return 4;
}
function hexToRgba(hex, a) {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

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
  "D":["11110","10001","10001","10001","10001","10001","11110"],
  "E":["11111","10000","10000","11110","10000","10000","11111"],
  "F":["11111","10000","10000","11110","10000","10000","10000"],
  "I":["01110","00100","00100","00100","00100","00100","01110"],
  "K":["10001","10010","10100","11000","10100","10010","10001"],
  "L":["10000","10000","10000","10000","10000","10000","11111"],
  "N":["10001","11001","10101","10011","10001","10001","10001"],
  "O":["01110","10001","10001","10001","10001","10001","01110"],
  "R":["11110","10001","10001","11110","10100","10010","10001"],
  "T":["11111","00100","00100","00100","00100","00100","00100"],
  "W":["10001","10001","10001","10101","10101","10101","01110"],
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

const SEGS = 14; // VU 分段数

class PowerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._values = {};
    this._revealed = false;
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
      max_month: 2000, max_year: 10000, max_power: 2000, max_today: 100,
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

  getCardSize() { return 6; }

  _num(eid) {
    const s = this._hass?.states?.[eid];
    const v = parseFloat(s?.state);
    return isNaN(v) ? null : v;
  }

  _status() {
    const bal = this._num(this._config.balance);
    if (bal !== null && bal < this._config.low_balance) {
      return { word: "LOW", cn: "余额低", color: C.red };
    }
    const pwr = this._num(this._config.power);
    if (pwr !== null && pwr > 10) {
      return { word: "RUN", cn: "用电中", color: C.green };
    }
    const today = this._num(this._config.today);
    if (today !== null && today > 0) {
      return { word: "OK", cn: "正常", color: C.green };
    }
    return { word: "IDLE", cn: "空闲", color: C.dim };
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

        /* ---------- 顶栏 ---------- */
        .top { display: flex; align-items: center; gap: 10px; }
        .sq { width: 6px; height: 6px; background: ${C.brand}; flex: none; }
        .ttl { font-size: 9px; letter-spacing: .24em; color: ${C.dim}; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .top .right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
        .led { width: 7px; height: 7px; background: ${C.off}; flex: none; transition: background .4s ease; }
        .led.on { animation: led-breathe 3s ease-in-out infinite; }
        @keyframes led-breathe {
          0%, 100% { box-shadow: 0 0 4px var(--led-glow, rgba(63,191,111,.4)); }
          50%      { box-shadow: 0 0 10px var(--led-glow, rgba(63,191,111,.7)); }
        }
        .st-txt { font-size: 9px; letter-spacing: .18em; color: ${C.dim}; }

        /* ---------- 主区 ---------- */
        .hero { display: flex; align-items: center; gap: 18px; padding: 14px 0 12px; }
        .hero .num { flex: none; }
        .hero .meta { flex: 1 1 auto; min-width: 0; }
        .hero .cn { font-size: 18px; font-weight: 600; letter-spacing: .3em; }
        .hero .sub { margin-top: 6px; font-size: 9px; letter-spacing: .24em; color: ${C.faint}; text-transform: uppercase; }
        .hero .delta { font-size: 9px; letter-spacing: .1em; margin-left: 8px; padding: 2px 6px; border-radius: 999px; border: 1px solid ${C.hair}; }
        .hero .delta.up { color: ${C.red}; border-color: ${C.red}; }
        .hero .delta.down { color: ${C.green}; border-color: ${C.green}; }
        .hero .delta.flat { color: ${C.dim}; }
        .hero .unit { margin-top: 4px; font-size: 9px; letter-spacing: .2em; color: ${C.faint}; }

        .blocks { display: flex; gap: 5px; margin-top: 10px; }
        .blk { width: 16px; height: 8px; background: ${C.off}; border-radius: 2px; transition: background .4s ease, box-shadow .4s ease; }
        .blk.on { box-shadow: 0 0 8px var(--blk-glow, transparent); }
        ${[0,1,2,3].map(i => `.blk:nth-child(${i+1}) { transition-delay: ${i * 90}ms; }`).join("")}

        .divider { height: 1px; background: ${C.hair}; margin: 0 -16px; }

        /* ---------- 指标列 ---------- */
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

        /* ---------- 时段分布 ---------- */
        .tariffs { padding-top: 12px; }
        .tariff { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
        .tariff .k { width: 34px; flex: none; font-size: 9px; letter-spacing: .18em; color: ${C.faint}; }
        .tbar { flex: 1; display: flex; gap: 2px; }
        .tseg { width: 5px; height: 10px; border-radius: 1.5px; background: ${C.off}; transition: background .3s ease; }
        .tseg:nth-child(n+1) { transition-delay: 0ms; }
        .tariff .v { width: 58px; flex: none; text-align: right; font-size: 9px; color: ${C.text}; }

        /* ---------- 7 天条形图 ---------- */
        .week { padding-top: 12px; }
        .week .hd { display: flex; justify-content: space-between; font-size: 8px; letter-spacing: .2em; color: ${C.faint}; margin-bottom: 8px; }
        .bars { display: flex; align-items: flex-end; gap: 6px; height: 46px; }
        .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 0; }
        .bar-stack { display: flex; flex-direction: column-reverse; gap: 2px; height: 34px; }
        .bar-seg { width: 10px; height: 6px; border-radius: 1px; background: ${C.off}; }
        .bar-seg.on { background: var(--bar-c, ${C.green}); }
        .bar-seg.on.today { background: var(--bar-today, ${C.brand}); }
        .bar-day { font-size: 8px; color: ${C.faint}; white-space: nowrap; }

        /* ---------- 明细 ---------- */
        .rows { padding-top: 12px; }
        .row { display: flex; align-items: center; gap: 10px; padding: 7px 2px; border-top: 1px solid rgba(255,255,255,.07); font-size: 9px; letter-spacing: .16em; }
        .row:first-child { border-top: none; padding-top: 0; }
        .row .k { flex: 1; color: ${C.faint}; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .row .v { color: ${C.text}; text-align: right; }
        .row .v.warn { color: ${C.red}; }

        /* ---------- 按钮 ---------- */
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
          .seg, .blk, .tseg { transition: none; }
        }
      </style>

      <div class="card">
        <div class="top reveal" style="--i:0">
          <span class="sq"></span>
          <span class="ttl">PWR // ${this._config.name}</span>
          <span class="right"><span class="led"></span><span class="st-txt">--</span></span>
        </div>

        <div class="hero reveal" style="--i:1">
          <canvas class="num"></canvas>
          <div class="meta">
            <div class="cn">--</div>
            <div class="sub">TODAY // 今日用电 <span class="delta" data-delta hidden></span></div>
            <div class="blocks"><span class="blk"></span><span class="blk"></span><span class="blk"></span><span class="blk"></span></div>
          </div>
        </div>

        <div class="divider reveal" style="--i:2"></div>

        <div class="metrics">
          <div class="m reveal" style="--i:3" data-m="month">
            <div class="num"><canvas></canvas></div>
            <div class="vu">${"<span class='seg'></span>".repeat(SEGS)}</div>
            <div class="lb">MONTH</div><div class="un">KWH</div>
          </div>
          <div class="m reveal" style="--i:4" data-m="year">
            <div class="num"><canvas></canvas></div>
            <div class="vu">${"<span class='seg'></span>".repeat(SEGS)}</div>
            <div class="lb">YEAR</div><div class="un">KWH</div>
          </div>
          <div class="m reveal" style="--i:5" data-m="power">
            <div class="num"><canvas></canvas></div>
            <div class="vu">${"<span class='seg'></span>".repeat(SEGS)}</div>
            <div class="lb">POWER</div><div class="un">W</div>
          </div>
        </div>

        <div class="tariffs reveal" style="--i:6" data-part="tariffs"></div>
        <div class="week reveal" style="--i:7" data-part="week"></div>
        <div class="rows reveal" style="--i:8" data-part="rows"></div>

        <div class="actions reveal" style="--i:9">
          <button class="btn" data-act="refresh">REFRESH</button>
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
      const act = ev.target.closest("[data-act]")?.dataset.act;
      if (act === "info") { this._moreInfo(); return; }
      if (act === "refresh") { this._loadHistory(true); }
    });

    if (!this._revealed) {
      this._revealed = true;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => this.setAttribute("data-revealed", ""))
      );
    }
    this._update();
    this._loadHistory();
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

  _fmt(v, d) { return v === null ? "--" : v.toFixed(d === undefined ? 1 : d); }

  _update() {
    if (!this._hass || !this._config) return;
    const cfg = this._config;

    /* 状态 */
    const st = this._status();
    if (this._statusKey !== st.word) {
      this._statusKey = st.word;
      const cn = this.shadowRoot.querySelector(".hero .cn");
      cn.textContent = st.cn;
      cn.style.color = st.color;
      const stTxt = this.shadowRoot.querySelector(".st-txt");
      stTxt.textContent = st.word;
      stTxt.style.color = st.color;
      const led = this.shadowRoot.querySelector(".led");
      led.classList.add("on");
      led.style.background = st.color;
      led.style.setProperty("--led-glow", st.color + "aa");
    }

    /* hero: 今日用电 */
    const today = this._num(cfg.today);
    if (today !== null) {
      drawPixels(this._heroCv, today.toFixed(1), 7, st.color);
      const blocks = Math.ceil((today / cfg.max_today) * 4);
      this.shadowRoot.querySelectorAll(".blk").forEach((b, i) => {
        const on = i < blocks;
        b.classList.toggle("on", !!on);
        b.style.background = on ? st.color : C.off;
        b.style.setProperty("--blk-glow", on ? st.color + "88" : "transparent");
      });
    } else {
      drawPixels(this._heroCv, "--", 7, C.faint);
    }

    /* KPI 变化率：今日 vs 昨日（来自 7 天历史） */
    const deltaEl = this.shadowRoot.querySelector("[data-delta]");
    if (deltaEl) {
      if (this._delta && this._delta.valid) {
        const up = this._delta.pct > 0.5;
        const down = this._delta.pct < -0.5;
        deltaEl.hidden = false;
        deltaEl.textContent = up ? `▲ ${this._delta.pct.toFixed(0)}%` : down ? `▼ ${Math.abs(this._delta.pct).toFixed(0)}%` : "—";
        deltaEl.className = "delta " + (up ? "up" : down ? "down" : "flat");
      } else {
        deltaEl.hidden = true;
      }
    }

    /* 指标列 */
    const setMetric = (key, eid, max, color, decimals) => {
      const els = this._metricEls[key];
      if (!els) return;
      const v = this._num(eid);
      if (v === null) {
        drawPixels(els.cv, "--", 4, C.faint);
        this._setVu(els.segs, 0, C.off);
        return;
      }
      const prev = this._values[key];
      if (prev === undefined || prev === null) {
        drawPixels(els.cv, v.toFixed(decimals || 0), 4, color);
      } else if (Math.abs(prev - v) > 1e-9) {
        this._tweenPixels(els.cv, prev, v, decimals || 0, color);
      }
      this._values[key] = v;
      this._setVu(els.segs, Math.min(v, max) / max, color);
    };
    setMetric("month", cfg.month, cfg.max_month, C.text, 0);
    setMetric("year", cfg.year, cfg.max_year, C.text, 0);
    setMetric("power", cfg.power, cfg.max_power, C.text, 0);

    /* 时段分布 */
    const tariffDefs = [
      ["TIP", cfg.tip], ["PEAK", cfg.peak], ["FLAT", cfg.flat], ["VALLEY", cfg.valley],
    ];
    const tvals = tariffDefs.map(([k, eid]) => ({ k, v: this._num(eid) }));
    const tmax = Math.max(...tvals.map(t => t.v || 0), 1);
    const tEl = this.shadowRoot.querySelector('[data-part="tariffs"]');
    tEl.innerHTML = tvals.filter(t => t.v !== null || t.k === "FLAT" || t.k === "VALLEY")
      .map(t => {
        const lit = t.v === null ? 0 : Math.round((t.v / tmax) * 10);
        const segs = Array.from({ length: 10 }, (_, i) =>
          `<span class="tseg" style="background:${i < lit ? C.green : C.off}"></span>`).join("");
        return `<div class="tariff"><span class="k">${t.k}</span><span class="tbar">${segs}</span><span class="v">${t.v === null ? "--" : t.v.toFixed(1)}</span></div>`;
      }).join("");

    /* 费用明细 */
    const rows = [];
    const row = (k, eid, suffix) => {
      const s = this._hass?.states?.[eid];
      if (!s) return null;
      const u = suffix || (s.attributes?.unit_of_measurement || "");
      return `<div class="row"><span class="k">${k}</span><span class="v">${s.state} ${u}</span></div>`;
    };
    if (cfg.month_fee) rows.push(row("本月电费", cfg.month_fee, "CNY"));
    if (cfg.year_fee) rows.push(row("今年电费", cfg.year_fee, "CNY"));
    if (cfg.balance) {
      const bs = this._hass?.states?.[cfg.balance];
      if (bs) {
        const low = this._num(cfg.balance) < cfg.low_balance;
        rows.push(`<div class="row"><span class="k">电费余额</span><span class="v ${low ? "warn" : ""}">${bs.state} CNY</span></div>`);
      }
    }
    this.shadowRoot.querySelector('[data-part="rows"]').innerHTML = rows.join("");
  }

  /* 近 7 天日用电量：走 HA history/stream（WebSocket，自带认证），每天取最大值 */
  _loadHistory(force) {
    const cfg = this._config;
    if (!cfg.today || !this._hass || this._histLoading) return;
    if (this._hist && !force) return;
    const days = Math.max(2, Math.min(14, cfg.history_days || 7));
    this._histLoading = true;
    const end = new Date();
    const start = new Date(end.getTime() - (days + 1) * 86400000);
    const req = {
      type: "history/stream",
      entity_ids: [cfg.today],
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      minimal_response: true,
      no_attributes: true,
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
        /* KPI 变化率：今日 vs 昨日 */
        const todayV = out[out.length - 1]?.v;
        const yestV = out[out.length - 2]?.v;
        if (todayV !== null && todayV !== undefined && yestV !== null && yestV !== undefined && yestV > 0) {
          this._delta = { valid: true, pct: ((todayV - yestV) / yestV) * 100 };
        } else {
          this._delta = { valid: false };
        }
        this._renderWeek();
        this._update();
    };
    if (this._hass.callWS) {
      this._hass.callWS(req).then(onData).catch(() => { this._histLoading = false; });
    } else {
      const url = `/api/history/period/${start.toISOString()}?filter_entity_id=${encodeURIComponent(cfg.today)}&end_time=${end.toISOString()}&minimal_response&no_attributes`;
      const token = this._hass.auth?.accessToken || this._hass.auth?.tokens?.access_token || this._hass.auth?.access_token;
      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => { if (!r.ok) throw new Error("history " + r.status); return r.json(); })
        .then(onData)
        .catch(() => { this._histLoading = false; });
    }
  }

  _renderWeek() {
    const el = this.shadowRoot.querySelector('[data-part="week"]');
    if (!el || !this._hist) return;
    const days = this._hist;
    const today = new Date();
    const max = Math.max(...days.map(d => d.v || 0), 1);
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    /* 5 级热力色阶：按当日用量相对最大值分档 */
    const bars = days.map(d => {
      const v = d.v || 0;
      const segs = 5;
      const lit = Math.max(0, Math.min(segs, Math.round((v / max) * segs)));
      const isToday = `${d.date.getFullYear()}-${d.date.getMonth()}-${d.date.getDate()}` === todayKey;
      /* 面积渐变：每根条自下而上 alpha 递减（Amicro 风格渐变） */
      const levelColor = LEVELS5[progressLevel5((v / max) * 100)];
      const stack = Array.from({ length: segs }, (_, i) => {
        if (i >= lit) return `<span class="bar-seg"></span>`;
        const alpha = 0.4 + 0.6 * ((i + 1) / segs); // 底亮顶淡
        return `<span class="bar-seg on" style="background:${hexToRgba(isToday ? C.brand : levelColor, alpha)}"></span>`;
      }).join("");
      const dayLabel = `${d.date.getMonth() + 1}/${d.date.getDate()}`;
      return `<div class="bar-col"><div class="bar-stack">${stack}</div><div class="bar-day">${dayLabel}</div></div>`;
    }).join("");
    el.innerHTML = `<div class="hd"><span>7-DAY USAGE // 近7天用电</span><span>KWH</span></div><div class="bars">${bars}</div>`;
  }

  _moreInfo() {
    const eid = this._config.today || this._config.month;
    if (!eid) return;
    window.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: eid } }));
  }
}

window.customCards = window.customCards || [];
if (!customElements.get("power-card")) {
  customElements.define("power-card", PowerCard);
}
if (!window.customCards.some((c) => c.type === "power-card")) {
  window.customCards.push({
    type: "power-card",
    name: "电力卡片 · 像素版",
    description: "Nothing 点阵像素风：今日/本月/今年用电、分时电价、实时功率、7天条形图",
    preview: true,
  });
}

console.info(`%c POWER-CARD %c v${CARD_VERSION} `, "color:#0d0d0d;background:#e04b34;font-weight:700", "color:#e04b34;background:#0d0d0d");
