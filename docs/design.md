# Design Language · 点阵像素风设计系统

greenmini HA 卡片的统一视觉语言（Nothing 风格）。所有像素风卡片（air-quality-card、dishwasher-card 及未来新卡）必须遵循本文档，保证视觉一致性。

## 1. 调色板

| Token | 值 | 用途 |
|---|---|---|
| `bg` | `#0d0d0d` | 卡片底色 |
| `grid` | `rgba(255,255,255,.05)` | 微网格线 |
| `text` | `#eeeeee` | 主文字 |
| `dim` | `#8a8a8a` | 次级文字 |
| `faint` | `#5a5a5a` | 弱文字/标签 |
| `off` | `rgba(255,255,255,.07)` | 灭点/未点亮元素 |
| `hair` | `rgba(255,255,255,.1)` | 分隔线/描边 |
| `brand` | `#e04b34` | 品牌红（左上角方块） |
| `green` | `#3fbf6f` | 健康/运行 |
| `amber` | `#d9c24a` | 警戒 |
| `orange` | `#e07834` | 一般/较差 |
| `red` | `#ff5a3c` | 危险 |

## 2. 字体

```css
font-family: ui-monospace, "SF Mono", Menlo, Consolas, "PingFang SC", "Microsoft YaHei", monospace;
```

所有标签使用等宽字体 + `letter-spacing`（标题 `.24em`、标签 `.18em`、单位 `.1em`）+ `text-transform: uppercase`。

## 3. 5×7 点阵字形

- 字形表：`0-9 . % - 空格 A B D E F G I L N O P R U`
- 渲染规则：亮点用主色，**灭点保留 7% 底纹**（`C.off`）——像素屏质感的关键
- 点尺寸：`dot = px - max(1, round(px * 0.28))`，字间距 1 列
- 数值变化用 tween 逐帧重绘（650ms，`cubic-bezier(0.22,1,0.36,1)` 缓动）

参考实现（可直接复制）：

```js
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
```

## 4. 微网格底

```css
background:
  linear-gradient(var(--grid) 1px, transparent 1px) 0 0 / 100% 22px,
  linear-gradient(90deg, var(--grid) 1px, transparent 1px) 0 0 / 22px 100%,
  var(--bg);
animation: grid-pan 38s linear infinite;
```

`@keyframes grid-pan { to { background-position: 0 22px, 22px 0, 0 0; } }`

## 5. VU 分段电平条

- 14 段，每段 `4px × 12px`、圆角 1.5px、间距 2px
- 逐段错峰点亮：`transition-delay` 从 0ms 起每段 +30ms
- 点亮数 = `round(fraction × 14)`，颜色随状态（绿/琥珀/红）

## 6. LED 呼吸灯

```css
.led { width: 7px; height: 7px; background: var(--off); transition: background .4s ease; }
.led.on { animation: led-breathe 3s ease-in-out infinite; }
@keyframes led-breathe {
  0%, 100% { box-shadow: 0 0 4px var(--led-glow, rgba(63,191,111,.4)); }
  50%      { box-shadow: 0 0 10px var(--led-glow, rgba(63,191,111,.7)); }
}
```

## 7. 布局骨架

```
┌─────────────────────────────┐
│ ■ LABEL // 标题   [●LED] STA │   顶栏：品牌方块 + 等宽标题 + LED + 状态
│ 大字点阵（状态词）            │   主区：点阵大字 + 中文 + 电平块
│ 数字1   数字2   数字3         │   指标列：点阵数字 + VU 条 + 标签 + 单位
│ KEY    VALUE                │   明细行：等宽小字
│ [BUTTON] [BUTTON]           │   按钮：像素风描边
└─────────────────────────────┘
```

## 8. 动效与无障碍

- 入场：`reveal` 级联（`--i` 每级 70ms，opacity + translateY）
- 数值滚动：650ms tween，逐帧重绘点阵
- **必须**支持 `@media (prefers-reduced-motion: reduce)`：关闭所有动画/过渡

## 9. 新卡片 Checklist

- [ ] 使用上方调色板与字体
- [ ] 数值用 5×7 点阵渲染（含 tween）
- [ ] 微网格底 + 38s 漂移
- [ ] 至少一组 VU 或电平块
- [ ] LED 状态灯
- [ ] reveal 级联入场 + reduced-motion
- [ ] README 里注明「像素版」并链接本设计文档
