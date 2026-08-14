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
    static_configs = [
        (url, str(pkg_dir / name)) for name, url in CARD_MODULES.items()
    ]

    # 1. serve the card JS through Home Assistant's own static handler.
    #    Try each API generation independently; never let setup fail.
    try:
        from homeassistant.components.http import StaticPathConfig

        await hass.http.async_register_static_paths(
            [StaticPathConfig(url, path, False) for url, path in static_configs]
        )
        _LOGGER.debug("ha_cards: static paths registered (new API)")
    except Exception as err:  # noqa: BLE001 - fall back for older HA versions
        _LOGGER.warning("ha_cards: new static API failed (%s), trying legacy", err)
        try:
            for url, path in static_configs:
                hass.http.register_static_path(url, path, cache_headers=False)
            _LOGGER.debug("ha_cards: static paths registered (legacy API)")
        except Exception as err2:  # noqa: BLE001
            _LOGGER.warning("ha_cards: legacy static API also failed (%s)", err2)

    # 2. inject every module into the frontend
    try:
        extra = hass.data.get(frontend.DATA_EXTRA_MODULE_URL)
        if extra is not None:
            for url in CARD_MODULES.values():
                if hasattr(extra, "add"):
                    extra.add(url)
                else:
                    extra.append(url)
            _LOGGER.debug(
                "ha_cards: injected %s", ", ".join(CARD_MODULES.values())
            )
        else:
            _LOGGER.warning(
                "ha_cards: frontend extra-module store not available; "
                "cards will not be injected automatically"
            )
    except Exception as err:  # noqa: BLE001
        _LOGGER.warning("ha_cards: failed to inject card modules (%s)", err)

    return True
