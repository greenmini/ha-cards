# Changelog

GreenMini HA 卡片家族的版本记录。本仓库为唯一来源。

---

## v2.1.0 · 2026-09-16 · 仓库合并

原先分散的独立仓库全部并入本仓库，独立仓库已删除。本仓库现在是卡片家族的唯一来源。

| 原仓库 | 处理方式 |
| --- | --- |
| `ha-air-quality-card` | 并入。`air-quality-card.js` 与旧仓库内容完全一致，现在改为**随集成自动注入**（此前需单独装前端插件） |
| `dishwasher-card` | 并入。采用本仓库的**简洁版 v3.0.0**（`CARD_VERSION 3.0.0`）；旧的**点阵像素版 v2.0.0-pixel 不再维护** |
| `weather-glass-card` | 并入。`weather-card.js` / `weather-card-editor.js` 采用本仓库版本（比旧仓库多防重复注册保护，并修正 `documentationURL`） |
| `fork_u-house_card` | 不合并（第三方项目 `silasmariusz/fork_u-house_card` 的 fork） |

本次其他变更：

- **新增 `hacs.json`** —— 此前缺失，HACS 自定义存储库识别需要
- **新增 `LICENSE`**（MIT）
- **新增本 `CHANGELOG.md`**
- **README 重写** —— 汇总全部卡片的配置说明（原先散落在各独立仓库的 README 里）
- **集成注入策略调整**：`air-quality-card.js` 现在也由集成自动注入；`weather-card-editor.js` 仍只提供静态文件、**不自动注入**（它从外部 CDN 引入 `lit`，必须由用户手动添加资源）
- 版本号 `2.0.0` → `2.1.0`

---

## v2.0.0 · 2026-08-19 · 简洁风重做

- 卡片改为**简洁可读风**（clean readable redesign），放弃点阵像素字形
- 保留原有元素名与配置键，仪表盘无需改动

## 历史标签

`v1.1.0` · `v1.1.1` · `v1.2.0` · `v1.3.0` · `v1.4.0` · `v1.5.0` · `v1.6.0` · `v1.7.0` · `v2.0.0`

---

## 并入前的历史

### 原 `ha-air-quality-card`

#### v3.0.0（clean readable redesign · 2026-08）

- 跟随家族改为简洁风

#### v2.0.1-pixel · 2026-08-07

样式调整：

- 卡片外框改为 14px 圆角矩形（主流圆角风格）
- 总评电平块增加 2px 微圆角
- VU 电平条分段增加 1.5px 微圆角

#### v2.0.0-pixel · 2026-08-07

首个像素版：

- Nothing 点阵像素风整体重设计：`#0d0d0d` 微网格背景（38s 漂移）
- 5x7 点阵字形渲染全部数值，灭点保留 7% 底纹
- 数值变化滚动 tween 动画（逐帧重绘点阵）
- VU 分段电平条（14 段，逐段错峰点亮）
- 总评四档电平块 + LED 呼吸辉光
- 级联入场揭示动画，尊重 `prefers-reduced-motion`
- 移动端（<400px）自动换行布局

### 原 `dishwasher-card`

- `2.1.1` 修复 `customCards` 初始化
- `2.1.0` 配置流程增加简体中文翻译
- `2.0.0-pixel` 点阵像素版（含 5x7 点阵、VU 电平、进度电平块、`docs/preview.html` 演示页）

> 像素版内容已不再维护；本仓库使用的是简洁版 v3.0.0。

### 原 `weather-glass-card`

- 玻璃拟态天气卡：粒子效果、环境光、天气动效、房屋图与房间温度徽标

---

## 已知未纳入的内容

- 原 `dishwasher-card` 的点阵像素版源码与 `docs/preview.html` 演示页
- 原 `fork_u-house_card` 的第三方 fork 内容

以上内容**不随本次合并进入本仓库**。
