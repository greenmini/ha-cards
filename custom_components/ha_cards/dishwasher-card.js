/**
 * Dishwasher Card · PIXEL EDITION v2.0.0
 * Nothing 点阵像素风洗碗机状态卡片 —— 与 ha-air-quality-card 统一设计语言：
 * #0d0d0d 微网格底（22px 细格 38s 漂移）、5x7 点阵字形渲染全部数值、
 * LED 方灯呼吸 + 红色品牌标、VU 分段电平条（逐段错峰点亮）、
 * 等宽字体小标签、级联入场揭示。尊重 prefers-reduced-motion。
 *
 * 用法：
 *   type: custom:dishwasher-card
 *   entity: switch.cp7_cp7_relay            # 电源开关（必填）
 *   name: 洗碗机
 *   state: sensor.washing_machine_state
 *   running: binary_sensor.washing_machine_running
 *   progress: sensor.washing_machine_progress
 *   time_remaining: sensor.washing_machine_time_remaining
 *   current_power: sensor.washing_machine_current_power
 *   phase: sensor.washing_machine_current_phase
 *   program: sensor.washing_machine_program
 *   energy: sensor.chu_fang_dishwasher_energy_total
 *   cycle_count: sensor.washing_machine_cycle_count
 */

const CARD_VERSION = "2.0.0-pixel";

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
  "E":["11111","10000","10000","11110","10000","10000","11111"],
  "F":["11111","10000","10000","11110","10000","10000","10000"],
  "G":["01110","10000","10000","10111","10001","10001","01110"],
  "I":["01110","00100","00100","00100","00100","00100","01110"],
  "L":["10000","10000","10000","10000","10000","10000","11111"],
  "N":["10001","11001","10101","10011","10001","10001","10001"],
  "O":["01110","10001","10001","10001","10001","10001","01110"],
  "P":["11110","10001","10001","11110","10000","10000","10000"],
  "R":["11110","10001","10001","11110","10100","10010","10001"],
  "U":["10001","10001","10001","10001","10001","10001","01110"],
};

function cellsOf(t) {
  let n = 0;
  for (const ch of t) { const g = G[ch]; if (g) n += g[0].length + 1; }
  return Math.max(n - 1, 0);
}

/* 点阵文字渲染：亮点用主色，灭点留 7% 底纹 */
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

/* ---------- 状态定义 ---------- */
const STATUS = {
  run:  { word: "RUN",  cn: "运行中", color: C.green },
  idle: { word: "IDLE", cn: "空闲",   color: C.dim },
  done: { word: "DONE", cn: "完成",   color: C.green },
};

/* 进度颜色阈值 */
function progressColor(v) {
  if (v < 50) return C.green;
  if (v < 90) return C.amber;
  return C.red;
}

const SEGS = 14; // VU 分段数

class DishwasherCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._values = {};
    this._revealed = false;
  }

  setConfig(config) {
    this._config = {
      entity: "", name: "洗碗机",
      state: "", running: "", progress: "", time_remaining: "",
      current_power: "", phase: "", program: "", energy: "", cycle_count: "",
      ...config,
    };
    if (!this._config.entity) {
      throw new Error("dishwasher-card: 需要配置 entity（电源开关实体）");
    }
    this._render();
  }

  set hass(hass) { this._hass = hass; this._update(); }

  getCardSize() { return 5; }

  _st(key) {
    const eid = this._config[key];
    return eid ? this._hass?.states?.[eid] : undefined;
  }

  _num(id) {
    const s = this._hass?.states?.[id];
    const v = parseFloat(s?.state);
    return isNaN(v) ? null : v;
  }

  _status() {
    const state = this._st("state");
    const s = state ? String(state.state).toLowerCase() : "";
    if (["finish", "finished", "done", "clean"].includes(s)) return STATUS.done;
    const running = this._st("running");
    if (running && ["on", "true", "running", "washing"].includes(String(running.state).toLowerCase())) return STATUS.run;
    if (s && !["off", "idle", "standby", "unknown", "unavailable", "empty", "none"].includes(s)) return STATUS.run;
    const p = this._num(this._config.current_power);
    if (p !== null && p > 10) return STATUS.run;
    return STATUS.idle;
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
          cursor: pointer;
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

        /* ---------- 状态主区 ---------- */
        .hero { display: flex; align-items: center; gap: 18px; padding: 14px 0 12px; }
        .hero .word { flex: none; }
        .hero .meta { flex: 1 1 auto; min-width: 0; }
        .hero .cn { font-size: 20px; font-weight: 600; letter-spacing: .3em; }
        .hero .sub { margin-top: 6px; font-size: 9px; letter-spacing: .24em; color: ${C.faint}; text-transform: uppercase; }

        /* 进度电平块（4 格 = 100%） */
        .blocks { display: flex; gap: 5px; margin-top: 10px; }
        .blk {
          width: 16px; height: 8px; background: ${C.off}; border-radius: 2px;
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
          width: 4px; height: 12px; background: ${C.off}; border-radius: 1.5px;
          transition: background .35s ease;
        }
        .seg:nth-child(1)  { transition-delay: 0ms; }   .seg:nth-child(2)  { transition-delay: 30ms; }
        .seg:nth-child(3)  { transition-delay: 60ms; }  .seg:nth-child(4)  { transition-delay: 90ms; }
        .seg:nth-child(5)  { transition-delay: 120ms; } .seg:nth-child(6)  { transition-delay: 150ms; }
        .seg:nth-child(7)  { transition-delay: 180ms; } .seg:nth-child(8)  { transition-delay: 210ms; }
        .seg:nth-child(9)  { transition-delay: 240ms; } .seg:nth-child(10) { transition-delay: 270ms; }
        .seg:nth-child(11) { transition-delay: 300ms; } .seg:nth-child(12) { transition-delay: 330ms; }
        .seg:nth-child(13) { transition-delay: 360ms; } .seg:nth-child(14) { transition-delay: 390ms; }

        /* ---------- 明细行 ---------- */
        .rows { padding-top: 12px; }
        .row { display: flex; align-items: center; gap: 10px; padding: 7px 2px; border-top: 1px solid rgba(255,255,255,.07); font-size: 9px; letter-spacing: .16em; }
        .row:first-child { border-top: none; padding-top: 0; }
        .row .k { flex: 1; color: ${C.faint}; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .row .v { color: ${C.text}; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* ---------- 按钮 ---------- */
        .actions { display: flex; gap: 8px; padding-top: 12px; }
        .btn {
          flex: 1; text-align: center; padding: 10px 0;
          font-family: ${MONO}; font-size: 9px; letter-spacing: .24em;
          border: 1px solid ${C.hair}; border-radius: 2px;
          background: transparent; color: ${C.dim};
          cursor: pointer; text-transform: uppercase;
          transition: background .3s ease, color .3s ease, border-color .3s ease;
        }
        .btn.power.on { border-color: var(--pw-c, ${C.green}); color: var(--pw-c, ${C.green}); }
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
          <span class="ttl">DISH // ${this._config.name}</span>
          <span class="right">
            <span class="led"></span>
            <span class="st-txt">--</span>
          </span>
        </div>

        <div class="hero reveal" style="--i:1">
          <canvas class="word"></canvas>
          <div class="meta">
            <div class="cn">--</div>
            <div class="sub">WASH CYCLE // 洗涤状态</div>
            <div class="blocks">
              <span class="blk"></span><span class="blk"></span>
              <span class="blk"></span><span class="blk"></span>
            </div>
          </div>
        </div>

        <div class="divider reveal" style="--i:2"></div>

        <div class="metrics">
          <div class="m reveal" style="--i:3" data-m="progress">
            <div class="num"><canvas></canvas></div>
            <div class="vu">${"<span class='seg'></span>".repeat(SEGS)}</div>
            <div class="lb">PROGRESS</div>
            <div class="un">%</div>
          </div>
          <div class="m reveal" style="--i:4" data-m="minleft">
            <div class="num"><canvas></canvas></div>
            <div class="vu">${"<span class='seg'></span>".repeat(SEGS)}</div>
            <div class="lb">MIN LEFT</div>
            <div class="un">MIN</div>
          </div>
          <div class="m reveal" style="--i:5" data-m="power">
            <div class="num"><canvas></canvas></div>
            <div class="vu">${"<span class='seg'></span>".repeat(SEGS)}</div>
            <div class="lb">POWER</div>
            <div class="un">W</div>
          </div>
        </div>

        <div class="rows">
          <div class="row reveal" style="--i:6"><span class="k">PHASE</span><span class="v" data-k="phase">--</span></div>
          <div class="row reveal" style="--i:7"><span class="k">PROGRAM</span><span class="v" data-k="program">--</span></div>
          <div class="row reveal" style="--i:8"><span class="k">ENERGY</span><span class="v" data-k="energy">--</span></div>
          <div class="row reveal" style="--i:9"><span class="k">CYCLES</span><span class="v" data-k="cycles">--</span></div>
        </div>

        <div class="actions reveal" style="--i:10">
          <button class="btn power" data-act="power">POWER</button>
          <button class="btn" data-act="info">INFO</button>
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

    const card = this.shadowRoot.querySelector(".card");
    card.addEventListener("click", (ev) => {
      const act = ev.target.closest("[data-act]")?.dataset.act;
      if (act === "info") { this._moreInfo(); return; }
      if (act === "power") { this._toggle(); return; }
      this._toggle();
    });

    if (!this._revealed) {
      this._revealed = true;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => this.setAttribute("data-revealed", ""))
      );
    }
    this._update();
  }

  /* 数值滚动：逐帧重绘点阵 */
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
    segs.forEach((s, i) => {
      s.style.background = i < lit ? color : C.off;
    });
  }

  _update() {
    if (!this._hass || !this._config) return;
    const cfg = this._config;

    /* ---- 状态 ---- */
    const st = this._status();
    if (this._statusKey !== st.word) {
      this._statusKey = st.word;
      drawPixels(this._wordCv, st.word, 7, st.color);
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

    /* ---- 进度 ---- */
    const prog = this._num(cfg.progress);
    const progColor = prog === null ? C.faint : progressColor(prog);
    const powerOn = (this._st("entity")?.state) === "on";

    if (prog !== null) {
      const prev = this._values.progress;
      const frac = Math.min(100, Math.max(0, prog)) / 100;
      if (prev === undefined || prev === null) {
        drawPixels(this._metricEls.progress.cv, Math.round(prog).toString(), 4, progColor);
      } else if (Math.abs(prev - prog) > 0.5) {
        this._tweenPixels(this._metricEls.progress.cv, prev, prog, 0, progColor);
      }
      this._values.progress = prog;
      this._setVu(this._metricEls.progress.segs, frac, progColor);
      /* 4 格电平块 = 进度四等分 */
      const blocks = Math.ceil((prog / 100) * 4);
      this.shadowRoot.querySelectorAll(".blk").forEach((b, i) => {
        const on = powerOn && i < blocks;
        b.classList.toggle("on", !!on);
        b.style.background = on ? progColor : C.off;
        b.style.setProperty("--blk-glow", on ? progColor + "88" : "transparent");
      });
    } else {
      drawPixels(this._metricEls.progress.cv, "--", 4, C.faint);
      this._setVu(this._metricEls.progress.segs, 0, C.off);
      this.shadowRoot.querySelectorAll(".blk").forEach((b, i) => {
        const on = powerOn && i === 0;
        b.classList.toggle("on", !!on);
        b.style.background = on ? progColor : C.off;
        b.style.setProperty("--blk-glow", on ? progColor + "88" : "transparent");
      });
    }

    /* ---- 剩余时间 ---- */
    const mins = this._num(cfg.time_remaining);
    const minsEls = this._metricEls.minleft;
    if (mins === null) {
      drawPixels(minsEls.cv, "--", 4, C.faint);
      this._setVu(minsEls.segs, 0, C.off);
    } else {
      drawPixels(minsEls.cv, Math.round(mins).toString(), 4, progColor);
      this._setVu(minsEls.segs, Math.min(mins, 240) / 240, progColor);
    }

    /* ---- 功率 ---- */
    const pwr = this._num(cfg.current_power);
    const pwrEls = this._metricEls.power;
    if (pwr === null) {
      drawPixels(pwrEls.cv, "--", 4, C.faint);
      this._setVu(pwrEls.segs, 0, C.off);
    } else {
      drawPixels(pwrEls.cv, Math.round(pwr).toString(), 4, C.text);
      this._setVu(pwrEls.segs, Math.min(pwr, 2000) / 2000, C.text);
    }

    /* ---- 明细 ---- */
    const setRow = (k, eid, suffix) => {
      const el = this.shadowRoot.querySelector(`[data-k="${k}"]`);
      const s = this._st(eid) || this._hass?.states?.[eid];
      el.textContent = s ? (s.state + (suffix || "")) : "--";
    };
    setRow("phase", cfg.phase);
    setRow("program", cfg.program);
    setRow("energy", cfg.energy, this._st(cfg.energy)?.attributes?.unit_of_measurement ? " " + this._st(cfg.energy).attributes.unit_of_measurement : "");
    setRow("cycles", cfg.cycle_count);

    /* ---- 电源按钮 ---- */
    const pBtn = this.shadowRoot.querySelector(".btn.power");
    pBtn.textContent = powerOn ? "PWR OFF" : "PWR ON";
    pBtn.classList.toggle("on", powerOn);
    pBtn.style.setProperty("--pw-c", st.color);
  }

  _toggle() {
    const eid = this._config.entity;
    if (!eid) return;
    const domain = eid.split(".")[0];
    this._hass.callService(domain, "toggle", { entity_id: eid });
  }

  _moreInfo() {
    const eid = this._config.state || this._config.entity;
    if (!eid) return;
    window.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: eid } }));
  }
}

window.customCards = window.customCards || [];
if (!customElements.get("dishwasher-card")) {
  customElements.define("dishwasher-card", DishwasherCard);
}
if (!window.customCards.some((c) => c.type === "dishwasher-card")) {
  window.customCards.push({
    type: "dishwasher-card",
    name: "洗碗机卡片 · 像素版",
    description: "Nothing 点阵像素风：5x7 点阵数值、VU 电平条、LED 呼吸灯、网格漂移背景",
    preview: true,
  });
}

console.info(`%c DISHWASHER-CARD %c v${CARD_VERSION} `, "color:#0d0d0d;background:#e04b34;font-weight:700", "color:#e04b34;background:#0d0d0d");
