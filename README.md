# greenmini · Home Assistant 卡片家族 🏠

[greenmini](https://github.com/greenmini) 出品的 Home Assistant Lovelace 自定义卡片合集。

**一个仓库、一个集成、全部卡片。** 统一设计语言（简洁深色风），统一安装方式（HACS 自定义存储库）。

---

## ⚡ 安装：装成一个集成（推荐）

本仓库同时是一个 **HA 集成「GreenMini Cards」**（`custom_components/ha_cards`），
把家族全部卡片打包成**一个包**：装一次，全部注册并自动注入前端，无需手动添加 Lovelace 资源。

1. HACS → 右上角 ⋮ → **自定义存储库**
2. 仓库地址填 `https://github.com/greenmini/ha-cards`，类别选 **集成 (Integration)**
3. HACS → 集成 → 搜索 **GreenMini Cards** → 下载 → **重启 Home Assistant**
4. 设置 → 设备与服务 → **添加集成** → 选择 **GreenMini Cards**（集成有 config flow；加载后卡片 JS 会被自动注入并托管在 `/static/ha_cards/`）

装完后即可在仪表盘里直接添加卡片：

```yaml
type: custom:air-quality-card
```

### 手动安装（不用 HACS）

1. 把 `custom_components/ha_cards/` 整个目录复制到你的 HA `config/custom_components/` 下
2. 重启 Home Assistant
3. 设置 → 设备与服务 → 添加集成 → **GreenMini Cards**

### 关于天气卡的可视化编辑器

`weather-card-editor.js` **不会自动注入** —— 它从外部 CDN（unpkg）引入 `lit`，全局注入会影响整个前端加载。
需要可视化编辑天气卡时，手动添加 Lovelace 资源：

```yaml
url: /static/ha_cards/weather-card-editor.js
type: module
```

（需要能访问 unpkg.com。）

---

## 🃏 卡片一览

| 卡片 | 元素名 | 说明 | 可视化编辑 |
|---|---|---|---|
| 空气质量 | `custom:air-quality-card` | 主指标大字 + CO₂ / PM2.5 / TVOC / 湿度 / 温度电平条 + 近 24h 趋势 | — |
| 洗碗机 | `custom:dishwasher-card` | 电源开关、洗涤进度、剩余时间、阶段、程序、功率、能耗、循环次数 | — |
| 电力 | `custom:power-card` | 今日/本月/今年用电量、实时功率、分时电价、近 7 天用电、电费明细 | — |
| 灯光 | `custom:light-pixel-card` | 亮度 + VU 电平 | ✅ |
| 空调 | `custom:climate-pixel-card` | 当前/设定温度 + 模式状态 | ✅ |
| 风扇 | `custom:fan-pixel-card` | 速度 + VU 电平 | ✅ |
| 窗帘 | `custom:cover-pixel-card` | 开合状态 + 开度，一键开/关/停 | ✅ |
| 天气（简洁） | `custom:weather-pixel-card` | 当前温度、状态图标、湿度/风速/气压、4 天预报 | ✅ |
| 天气（玻璃拟态） | `custom:weather-glass-card` | 玻璃拟态 + 天气动效 + 房屋图 + 房间温度徽标 | ✅（需手动加资源） |

> 元素名里的 `-pixel-` 是历史命名（v1.x 点阵像素版沿用），v2.0.0 起卡片已改为简洁风，元素名保持不变以免破坏既有仪表盘。

---

## 🔧 卡片配置

### 空气质量卡 `custom:air-quality-card`

```yaml
type: custom:air-quality-card
title: 地下室空气
overall: sensor.di_xia_shi_kong_qi_zhi_liang_zong_ping   # 总评实体（可选）
co2: sensor.your_co2
pm25: sensor.your_pm25
tvoc: sensor.your_tvoc
humidity: sensor.your_humidity
temperature: sensor.your_temperature
```

- `title` 默认「空气」；**所有实体都可选**，缺哪个对应位置显示 `--`
- 主指标按 `pm25` → `co2` → `tvoc` 的顺序取第一个有数值的实体
- 近 24h 趋势通过 WebSocket `history/stream` 拉取（需要 recorder 里有该实体的历史）

分级阈值（源码里的 `METRICS`，可直接改）：

| 指标 | bands | 判级 |
|---|---|---|
| CO₂ | 600 / 800 / 1500 / 2000 ppm | 五档 |
| PM2.5 | 15 / 35 / 75 / 150 µg/m³ | 五档 |
| TVOC | 200 / 300 / 1000 / 2000 µg/m³ | 五档 |
| 湿度 | 45 / 60 / 70 / 85 %（低于 30% 也算差） | 五档 |
| 温度 | 不判级 | 固定色 |

五档颜色：优 `#4cde8b` · 良 `#8bc34a` · 一般 `#ffd166` · 较差 `#ff9f43` · 差 `#ff5a5a`。

### 洗碗机卡 `custom:dishwasher-card`

```yaml
type: custom:dishwasher-card
entity: switch.cp7_cp7_relay            # 电源开关（必填，点击卡片切换）
name: 洗碗机
state: sensor.washing_machine_state
running: binary_sensor.washing_machine_running
progress: sensor.washing_machine_progress
time_remaining: sensor.washing_machine_time_remaining
current_power: sensor.washing_machine_current_power
phase: sensor.washing_machine_current_phase
program: sensor.washing_machine_program
energy: sensor.chu_fang_dishwasher_energy_total
cycle_count: sensor.washing_machine_cycle_count
```

| 键 | 必填 | 说明 |
|---|---|---|
| `entity` | ✅ | 洗碗机电源开关实体 |
| `name` | ❌ | 卡片标题，默认「洗碗机」 |
| `state` / `running` / `progress` / `time_remaining` | ❌ | 状态、运行中标志、进度（%）、剩余时间（分钟） |
| `current_power` / `phase` / `program` / `energy` / `cycle_count` | ❌ | 功率（W）、当前阶段、洗涤程序、总能耗（kWh）、循环次数 |

状态判定：`state` 为 `finish/finished/done/clean` → **完成**；`running` 为 `on`、或 `state` 不是 `off/idle/standby/unknown/…`、或功率 > 10W → **运行中**；否则 **空闲**。

特别适配 **ha_washdata** 集成生成的 `washing_machine_*` 系列实体，也支持任意电源开关（如 ESPHome 继电器）。

### 电力卡 `custom:power-card`

```yaml
type: custom:power-card
name: 用电
today: sensor.energy_today
month: sensor.energy_month
year: sensor.energy_year
month_fee: sensor.fee_month
year_fee: sensor.fee_year
balance: sensor.balance
power: sensor.power_now
flat: sensor.energy_flat      # 平段
valley: sensor.energy_valley  # 谷段
peak: sensor.energy_peak      # 峰段
tip: sensor.energy_tip        # 尖峰
low_balance: 50               # 余额告警阈值，默认 50
history_days: 7               # 历史天数，默认 7
```

### 灯光 / 空调 / 风扇 / 窗帘

```yaml
type: custom:light-pixel-card
entity: light.living_room
name: 客厅灯
```

```yaml
type: custom:climate-pixel-card
entity: climate.living_room
name: 客厅空调
```

```yaml
type: custom:fan-pixel-card
entity: fan.bedroom
name: 卧室风扇
```

```yaml
type: custom:cover-pixel-card
entity: cover.living_room
name: 客厅窗帘
```

四张卡都只有 `entity`（必填）与 `name` 两个配置项，且都支持**可视化编辑器**（在仪表盘 UI 里直接改）。

### 天气卡（简洁）`custom:weather-pixel-card`

```yaml
type: custom:weather-pixel-card
entity: weather.home
name: 天气
```

### 天气卡（玻璃拟态）`custom:weather-glass-card`

```yaml
type: custom:weather-glass-card
title: 气候监控
weather_entity: weather.home
temperature_entity: sensor.living_room_temperature
humidity_entity: sensor.living_room_humidity
air_quality_entity: sensor.air_quality_index
wind_entity: sensor.wind_speed
uv_entity: sensor.uv_index
pollen_entity: sensor.pollen_count
cloud_coverage_entity: sensor.cloud_coverage
house_image: /local/house.jpg
room_badges:
  - name: 客厅
    temperature_entity: sensor.living_room_temperature
    x: 30
    y: 40
  - name: 卧室
    temperature_entity: sensor.bedroom_temperature
    x: 70
    y: 35
```

`room_badges` 的 `x` / `y` 是相对房屋图片的百分比位置（0–100）。

---

## 📁 仓库结构

```text
custom_components/ha_cards/
├── __init__.py                # 集成入口：托管静态文件 + 向前端注入卡片 JS
├── config_flow.py             # 配置流（UI 添加集成）
├── const.py
├── manifest.json
├── translations/              # en / zh-Hans
├── air-quality-card.js
├── dishwasher-card.js
├── power-card.js
├── light-pixel-card.js
├── climate-pixel-card.js
├── fan-pixel-card.js
├── cover-pixel-card.js
├── weather-pixel-card.js
├── weather-card.js            # 玻璃拟态天气卡
└── weather-card-editor.js     # 天气卡编辑器（需手动加资源）
docs/
└── design.md                  # 设计语言（v1.x 点阵像素风，历史参考）
```

---

## 🎨 设计语言

卡片采用统一的简洁深色风：深色底、清晰大号数字、细描边、克制的状态色。

历史文档 **[docs/design.md](docs/design.md)** 记录的是 v1.x 的点阵像素风设计系统（调色板、5×7 点阵字形、微网格底、VU 电平、LED 呼吸、动效参数），自 v2.0.0 起卡片已改为简洁风，该文档保留供参考。

---

## 📄 文档

- [更新日志 CHANGELOG](CHANGELOG.md)
- [设计语言（历史）](docs/design.md)

## License

MIT
