"""
EmissionAgent — estimates fuel/energy consumption and CO2 emissions per route.

Supports:
  - Petrol and diesel vehicles (tailpipe accounting boundary).
  - Electric vehicles (grid-average accounting boundary, India default).
  - Optional load factor (multiplies consumption).
  - Optional speed-aware consumption curve (SPEED_AWARE config flag, default off).
  - EV range feasibility check with configurable reserve (EV_RESERVE config).

Accounting boundaries are ALWAYS surfaced in the response. Tailpipe and
grid-average figures must never be silently mixed.

Phase 3 implements this agent fully.
"""

from __future__ import annotations

from typing import Any


class EmissionAgent:
    """Calculates consumption and CO2 for petrol, diesel, and EV vehicles."""

    def calculate(self, distance_km: float, vehicle: Any) -> dict[str, Any]:
        """
        Return {fuel_liters, energy_kwh, fuel_cost, co2_kg, accounting_method}.
        (Phase 3)
        """
        raise NotImplementedError("Implemented in Phase 3")

    def check_ev_feasibility(self, required_kwh: float, vehicle: Any) -> dict[str, Any]:
        """
        Return {range_ok, required_kwh, usable_kwh, warning}.
        (Phase 3)
        """
        raise NotImplementedError("Implemented in Phase 3")
