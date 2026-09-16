"""Custom integration that registers the GreenMini card pack.

Bundles every Lovelace card from greenmini's HA card family and injects
them into the frontend automatically:

- air-quality-card   (空气质量卡片)
- dishwasher-card    (洗碗机卡片)
- power-card         (电力/用电卡片)
- light-pixel-card   (灯光卡片)
- climate-pixel-card (空调卡片)
- fan-pixel-card     (风扇卡片)
- cover-pixel-card   (窗帘卡片)
- weather-pixel-card (天气卡片)
- weather-card       (玻璃拟态天气卡片)

Install via HACS, then add the integration once from Settings -> Devices
& Services (it has a config flow so it can be loaded from the UI).
"""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components import frontend
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

# file name -> public URL served by Home Assistant
# every module listed here is BOTH served and injected into the frontend.
CARD_MODULES = {
    "air-quality-card.js": "/static/ha_cards/air-quality-card.js",
    "dishwasher-card.js": "/static/ha_cards/dishwasher-card.js",
    "weather-card.js": "/static/ha_cards/weather-card.js",
    "weather-pixel-card.js": "/static/ha_cards/weather-pixel-card.js",
    "light-pixel-card.js": "/static/ha_cards/light-pixel-card.js",
    "climate-pixel-card.js": "/static/ha_cards/climate-pixel-card.js",
    "fan-pixel-card.js": "/static/ha_cards/fan-pixel-card.js",
    "cover-pixel-card.js": "/static/ha_cards/cover-pixel-card.js",
    "power-card.js": "/static/ha_cards/power-card.js",
}

# served but NOT injected: the weather card editor imports `lit` from an
# external CDN (unpkg), which must not be pulled into the frontend globally.
# Users who want the visual editor add it manually as a Lovelace resource:
#   url: /static/ha_cards/weather-card-editor.js
#   type: module
EXTRA_STATIC = {
    "weather-card-editor.js": "/static/ha_cards/weather-card-editor.js",
}


async def _register_cards(hass: HomeAssistant) -> None:
    """Serve the card JS and inject the modules into the frontend."""
    pkg_dir = Path(__file__).parent
    static_configs = [
        (url, str(pkg_dir / name))
        for name, url in {**CARD_MODULES, **EXTRA_STATIC}.items()
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
            _LOGGER.debug("ha_cards: injected %s", ", ".join(CARD_MODULES.values()))
        else:
            _LOGGER.warning(
                "ha_cards: frontend extra-module store not available; "
                "cards will not be injected automatically"
            )
    except Exception as err:  # noqa: BLE001
        _LOGGER.warning("ha_cards: failed to inject card modules (%s)", err)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up via configuration.yaml (legacy path)."""
    await _register_cards(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up via config flow (UI)."""
    await _register_cards(hass)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload (nothing to tear down)."""
    return True
