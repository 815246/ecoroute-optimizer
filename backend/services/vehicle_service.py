"""
VehicleService — vehicle CRUD and default configuration loading.

Loads default vehicle configs from data/vehicle_configs.json.
Phase 5 connects this to the database.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from config import settings


class VehicleService:
    """Manages vehicle definitions and database persistence."""

    def __init__(self, config_path: Path | None = None) -> None:
        self.config_path = config_path or settings.VEHICLE_CONFIGS_PATH

    def get_defaults(self) -> list[dict[str, Any]]:
        """Load default vehicle configs from JSON. (Phase 2/5)"""
        path = self.config_path
        if not path.is_file():
            alt_path = (
                Path(__file__).resolve().parent.parent.parent / "data" / "vehicle_configs.json"
            )
            if alt_path.is_file():
                path = alt_path
            else:
                raise FileNotFoundError(f"Vehicle configs file not found at {path} or {alt_path}")

        with open(path, encoding="utf-8") as f:
            data = json.load(f)

        defaults: list[dict[str, Any]] = []
        for key, item in data.items():
            if key.startswith("_"):
                continue
            entry = dict(item)
            entry["id"] = key
            defaults.append(entry)

        return defaults

    def get_by_id(self, vehicle_id: str) -> dict[str, Any]:
        """Return vehicle config by its default ID."""
        for v in self.get_defaults():
            if v["id"] == vehicle_id:
                return v
        raise KeyError(f"Vehicle {vehicle_id!r} not found in default configurations")

    def save(self, vehicle: dict[str, Any], user_id: int) -> dict[str, Any]:
        """Persist a vehicle to the database. (Phase 5)"""
        raise NotImplementedError("Implemented in Phase 5")
