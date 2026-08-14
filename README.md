# greenmini · Home Assistant 卡片家族 🏠

[greenmini](https://github.com/greenmini) 出品的 Home Assistant Lovelace 自定义卡片合集。
统一设计语言、统一安装方式（HACS 自定义仓库）。

## 🃏 卡片一览

| 卡片 | 说明 | 风格 | 状态 |
|---|---|---|---|
| [**ha-air-quality-card**](https://github.com/greenmini/ha-air-quality-card) | 空气质量卡片：5×7 点阵数值、VU 电平条、LED 呼吸灯、总评电平块 | Nothing 点阵像素风 | ✅ 维护中 |
| [**dishwasher-card**](https://github.com/greenmini/dishwasher-card) | 一体化洗碗机状态卡：电源开关、进度、剩余时间、阶段、功率、能耗（Lovelace 卡片 + HA 集成） | Nothing 点阵像素风 | ✅ v2.0.0 |
| [**weather-glass-card**](https://github.com/greenmini/weather-glass-card) | 玻璃拟态天气卡：粒子效果、环境光、天气动效 | 玻璃拟态 | 🧹 待整理（缺 README） |
| [**fork_u-house_card**](https://github.com/greenmini/fork_u-house_card) | [U House Card](https://github.com/ulic75/u-house-card) 的分支 | — | 🔀 fork |

## 🎨 统一设计语言

所有像素风卡片共享同一套设计系统（调色板、5×7 点阵字形、微网格底、VU 电平、LED 呼吸、动效参数），详见 **[docs/design.md](docs/design.md)**。

新卡片请遵循该文档，保证视觉一致性。

## 📦 安装（通用，HACS）

1. HACS → 右上角 ⋮ → **自定义存储库**
2. 填卡片对应的 GitHub 仓库地址，类别按卡片说明选择（**前端 Dashboard** 或 **集成 Integration**）
3. 下载 → 重启（或刷新）→ 在仪表盘添加卡片

## 📄 文档

- [设计语言 Design Language](docs/design.md)

## License

各仓库分别使用 MIT License。
