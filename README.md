# greenmini · Home Assistant 卡片家族 🏠

[greenmini](https://github.com/greenmini) 出品的 Home Assistant Lovelace 自定义卡片合集。
统一设计语言、统一安装方式（HACS 自定义仓库）。

## ⚡ 一条龙安装：装成一个集成

本仓库同时是一个 **HA 集成「GreenMini Cards」**（`custom_components/ha_cards`），
把家族全部卡片打包成**一个包**，安装一次全部注册、自动注入前端，无需手动添加资源：

1. HACS → 右上角 ⋮ → **自定义存储库**
2. 仓库地址：`https://github.com/greenmini/ha-cards`，类别选 **集成 (Integration)**
3. HACS → 集成 → 搜索 **GreenMini Cards** → 下载 → **重启 Home Assistant**
4. 所有卡片立即可用：`custom:air-quality-card` / `custom:dishwasher-card` / `custom:weather-glass-card`

> 也可以只装其中某一张卡（各卡片也有独立仓库，见下表）；装集成版时若与其他独立安装方式
> 同时存在，卡片有防重复注册保护，不会冲突。
>
> 📎 说明：空气质量卡（air-quality-card）由独立 HACS 前端插件仓库提供，**不随集成重复注入**（避免重复注册）；天气卡 UI 编辑器（`weather-card-editor.js`）因依赖外部 CDN 的 lit，**不随集成自动注入**；
> 如需可视化编辑天气卡，请手动添加资源 `/local/ha_cards/weather-card-editor.js`（需能访问 unpkg）。

## 🃏 卡片一览

| 卡片 | 说明 | 风格 | 状态 |
|---|---|---|---|
| [**ha-air-quality-card**](https://github.com/greenmini/ha-air-quality-card) | 空气质量卡片：5×7 点阵数值、VU 电平条、LED 呼吸灯、总评电平块 | 简洁深色风 | ✅ 维护中 |
| [**dishwasher-card**](https://github.com/greenmini/dishwasher-card) | 一体化洗碗机状态卡：电源开关、进度、剩余时间、阶段、功率、能耗（Lovelace 卡片 + HA 集成） | 简洁深色风 | ✅ v2.0.0 |
| [**power-card**](https://github.com/greenmini/ha-cards/blob/main/custom_components/ha_cards/power-card.js) | 电力/用电卡片：今日/本月/今年用电量、实时功率、分时电价分布、近 7 天用电条形图、电费明细 | 简洁深色风 | ✅ v1.0.0（随集成） |
| [**weather-glass-card**](https://github.com/greenmini/weather-glass-card) | 玻璃拟态天气卡：粒子效果、环境光、天气动效 | 玻璃拟态 | 🧹 待整理（缺 README） |
| [**light-pixel-card**](https://github.com/greenmini/ha-cards/blob/main/custom_components/ha_cards/light-pixel-card.js) | 灯光卡片（简洁版）：亮度点阵 + VU，支持可视化编辑 | 简洁深色风 | ✅ v1.0.0（随集成） |
| [**climate-pixel-card**](https://github.com/greenmini/ha-cards/blob/main/custom_components/ha_cards/climate-pixel-card.js) | 空调卡片（简洁版）：当前/设定温度 + 模式状态，支持可视化编辑 | 简洁深色风 | ✅ v1.0.0（随集成） |
| [**fan-pixel-card**](https://github.com/greenmini/ha-cards/blob/main/custom_components/ha_cards/fan-pixel-card.js) | 风扇卡片（简洁版）：速度点阵 + VU，支持可视化编辑 | 简洁深色风 | ✅ v1.0.0（随集成） |
| [**cover-pixel-card**](https://github.com/greenmini/ha-cards/blob/main/custom_components/ha_cards/cover-pixel-card.js) | 窗帘卡片（简洁版）：开合状态 + 开度，一键开/关/停，支持可视化编辑 | 简洁深色风 | ✅ v1.0.0（随集成） |
| [**weather-pixel-card**](https://github.com/greenmini/ha-cards/blob/main/custom_components/ha_cards/weather-pixel-card.js) | 天气卡片（简洁版）：当前温度、状态图标、湿度/风速/气压 VU、4 天预报 | 简洁深色风 | ✅ v1.0.0（随集成） |
| [**fork_u-house_card**](https://github.com/greenmini/fork_u-house_card) | [U House Card](https://github.com/ulic75/u-house-card) 的分支 | — | 🔀 fork |

## 🎨 统一设计语言

所有简洁风卡片共享同一套设计系统（调色板、5×7 点阵字形、微网格底、VU 电平、LED 呼吸、动效参数），详见 **[docs/design.md](docs/design.md)**。

新卡片请遵循该文档，保证视觉一致性。

## 📦 安装（通用，HACS）

1. HACS → 右上角 ⋮ → **自定义存储库**
2. 填卡片对应的 GitHub 仓库地址，类别按卡片说明选择（**前端 Dashboard** 或 **集成 Integration**）
3. 下载 → 重启（或刷新）→ 在仪表盘添加卡片

## 📄 文档

- [设计语言 Design Language](docs/design.md)

## License

各仓库分别使用 MIT License。
