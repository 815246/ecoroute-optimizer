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

from typing import Any


class EmissionService:
    """Loads emission factors and exposes the accounting-method string."""

    def get_factor(self, fuel_type: str) -> dict[str, Any]:
        """Return the emission factor dict for a fuel type. (Phase 3)"""
        raise NotImplementedError("Implemented in Phase 3")

    def get_accounting_method(self, boundary: str) -> str:
        """Return a human-readable accounting boundary description. (Phase 3)"""
        raise NotImplementedError("Implemented in Phase 3")
