"""Custom integration that registers the GreenMini card pack.

Bundles every Lovelace card from greenmini's HA card family and injects
them into the frontend automatically:

- air-quality-card   (像素版空气质量卡片)
- dishwasher-card    (像素版洗碗机卡片)
- power-card         (像素版电力/用电卡片)
- weather-glass-card (玻璃拟态天气卡片)

Install once via HACS; no manual Lovelace resources needed.
"""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components import frontend
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

DOMAIN = "ha_cards"
_LOGGER = logging.getLogger(__name__)

# file name -> public URL served by Home Assistant
# (weather-card-editor.js is intentionally NOT injected: it imports lit from
#  an external CDN; keep it available for manual use only)
CARD_MODULES = {
    "air-quality-card.js": "/static/ha_cards/air-quality-card.js",
    "dishwasher-card.js": "/static/ha_cards/dishwasher-card.js",
    "weather-card.js": "/static/ha_cards/weather-card.js",
    "power-card.js": "/static/ha_cards/power-card.js",
}


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the GreenMini card pack integration."""
    pkg_dir = Path(__file__).parent

    # 1. serve every card JS through Home Assistant's own static handler
    static_configs = []
    for name, url in CARD_MODULES.items():
        static_configs.append((url, str(pkg_dir / name)))
    try:
        from homeassistant.http import StaticPathConfig

        await hass.http.async_register_static_paths(
            [StaticPathConfig(url, path, False) for url, path in static_configs]
        )
    except Exception:  # noqa: BLE001 - fall back for older HA versions
        for url, path in static_configs:
            hass.http.register_static_path(url, path, cache_headers=False)

    # 2. inject every module into the frontend
    extra = hass.data.get(frontend.DATA_EXTRA_MODULE_URL)
    if extra is not None:
        for url in CARD_MODULES.values():
            if hasattr(extra, "add"):
                extra.add(url)
            else:
                extra.append(url)
        _LOGGER.debug("GreenMini cards registered: %s", ", ".join(CARD_MODULES))
    else:
        _LOGGER.warning(
            "frontend extra-module store not available; GreenMini cards not injected"
        )

    return True
