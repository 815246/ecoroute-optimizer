"""
VehicleService — vehicle CRUD and default configuration loading.

Loads default vehicle configs from data/vehicle_configs.json.
Phase 5 connects this to the database.
"""

from __future__ import annotations

from typing import Any


class VehicleService:
    """Manages vehicle definitions and database persistence."""

    def get_defaults(self) -> list[dict[str, Any]]:
        """Load default vehicle configs from JSON. (Phase 2/5)"""
        raise NotImplementedError("Implemented in Phase 2/5")

    def save(self, vehicle: dict[str, Any], user_id: int) -> dict[str, Any]:
        """Persist a vehicle to the database. (Phase 5)"""
        raise NotImplementedError("Implemented in Phase 5")
