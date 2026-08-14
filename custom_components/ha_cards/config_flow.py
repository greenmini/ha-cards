"""Config flow for the GreenMini Cards integration.

The integration itself needs no configuration; this flow exists so the
integration can be added via the Home Assistant UI (integrations without a
config flow are not loaded automatically).
"""

from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigFlow

from .const import DOMAIN


class GreenMiniCardsConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle the GreenMini Cards config flow."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Handle a flow initiated by the user."""
        if user_input is not None:
            return self.async_create_entry(title="GreenMini Cards", data={})

        return self.async_show_form(step_id="user")
