"""
EmissionService — loads and validates emission factors from JSON.

Each factor carries: value, unit, source, year, boundary.
The ``boundary`` field is either "tailpipe" or "grid-average".
Tailpipe and grid-average figures must never be silently mixed.

Factors marked with "VERIFY" in their source field should be confirmed
against the cited primary source before publication.

Phase 3 implements this service fully.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from config import settings


class EmissionService:
    """Loads emission factors and exposes the accounting-method string."""

    def __init__(self, factors_path: Path | None = None) -> None:
        self.factors_path = factors_path or settings.EMISSION_FACTORS_PATH
        self._factors: dict[str, dict[str, Any]] | None = None

    def _load_factors(self) -> dict[str, dict[str, Any]]:
        if self._factors is not None:
            return self._factors

        path = self.factors_path
        if not path.is_file():
            alt_path = (
                Path(__file__).resolve().parent.parent.parent / "data" / "emission_factors.json"
            )
            if alt_path.is_file():
                path = alt_path
            else:
                raise FileNotFoundError(f"Emission factors file not found at {path} or {alt_path}")

        with open(path, encoding="utf-8") as f:
            raw_data = json.load(f)

        factors: dict[str, dict[str, Any]] = {}
        for k, v in raw_data.items():
            if not k.startswith("_"):
                factors[k] = dict(v)

        self._factors = factors
        return self._factors

    def get_factor(self, fuel_type: str) -> dict[str, Any]:
        """
        Return the emission factor dict for a fuel type.

        Maps petrol, diesel, and electric aliases.
        """
        factors = self._load_factors()
        ft = fuel_type.lower()
        if ft in ("petrol", "gasoline"):
            key = "petrol"
        elif ft in ("diesel", "gasoil"):
            key = "diesel"
        elif ft in ("electric", "electricity", "ev", "india_grid_electricity"):
            key = "india_grid_electricity"
        else:
            key = ft

        if key not in factors:
            raise KeyError(
                f"Unknown fuel type {fuel_type!r}. Available factors: {list(factors.keys())}"
            )

        return factors[key]

    def get_accounting_method(self, boundary: str) -> str:
        """Return a human-readable accounting boundary description."""
        b = boundary.lower()
        if b == "tailpipe":
            return (
                "Tailpipe direct combustion emissions (IPCC 2006 guidelines / BEE India). "
                "Upstream well-to-tank refining and transport excluded."
            )
        if b == "grid-average":
            return (
                "Grid-average generation emissions (CEA India 2022-23 baseline). "
                "Reflects regional generation mix; direct tailpipe emissions are zero."
            )
        return f"Estimated emissions ({boundary})"
