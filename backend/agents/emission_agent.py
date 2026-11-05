"""
EmissionAgent — estimates fuel/energy consumption and CO2 emissions per route.

Supports:
  - Petrol and diesel vehicles (tailpipe accounting boundary).
  - Electric vehicles (grid-average accounting boundary, India default).
  - Optional load factor (multiplies consumption).
  - Optional speed-aware consumption curve (SPEED_AWARE config flag).
  - EV range feasibility check with configurable reserve (EV_RESERVE config).

Accounting boundaries are ALWAYS surfaced in the response. Tailpipe and
grid-average figures must never be silently mixed.

Phase 3 implements this agent fully.
"""

from __future__ import annotations

from typing import Any

from config import settings
from services.emission_service import EmissionService


class EmissionAgent:
    """Calculates consumption and CO2 for petrol, diesel, and EV vehicles."""

    def __init__(self, emission_service: EmissionService | None = None) -> None:
        self.emission_service = emission_service or EmissionService()

    def _speed_factor(self, speed_kmh: float | None) -> float:
        """
        Calculate speed-dependent consumption multiplier.

        Optimal efficiency around 60 km/h; consumption rises at lower speeds
        due to stop-and-go / idling losses, and at higher speeds due to aerodynamic drag.
        """
        if not settings.SPEED_AWARE or speed_kmh is None or speed_kmh <= 0:
            return 1.0

        factor = 1.0 + 0.0003 * ((speed_kmh - 60.0) ** 2)
        return float(max(0.85, min(1.60, factor)))

    def calculate(
        self,
        distance_km: float,
        vehicle: Any,
        avg_speed_kmh: float | None = None,
    ) -> dict[str, Any]:
        """
        Calculate fuel/energy consumption, fuel cost, and CO2 emissions.

        Returns {fuel_liters, energy_kwh, fuel_cost, co2_kg, accounting_method, accounting_boundary}.
        """
        if distance_km < 0:
            raise ValueError(f"distance_km cannot be negative: {distance_km}")

        # Extract vehicle attributes whether dict or model
        v: dict[str, Any] = {}
        if isinstance(vehicle, dict):
            v = vehicle
        elif vehicle is not None:
            v = getattr(vehicle, "__dict__", {})

        v_type = str(v.get("type") or v.get("vehicle_type") or "petrol").lower()
        speed_factor = self._speed_factor(avg_speed_kmh)

        if v_type == "electric":
            energy_rate_100 = float(
                v.get("energy_rate_kwh_per_100km") or v.get("energy_rate") or 15.0
            )
            energy_kwh = distance_km * (energy_rate_100 / 100.0) * speed_factor
            fuel_liters = 0.0
            price_per_kwh = float(v.get("electricity_price_per_kwh", 8.0))
            fuel_cost = energy_kwh * price_per_kwh

            grid_override = v.get("grid_factor_override")
            if grid_override is not None:
                factor_val = float(grid_override)
            else:
                factor_dict = self.emission_service.get_factor("electric")
                factor_val = float(factor_dict["value"])

            co2_kg = energy_kwh * factor_val
            boundary = "grid-average"
            resource_val = energy_kwh
        else:
            # Petrol or Diesel
            kmpl = float(v.get("fuel_efficiency_kmpl") or v.get("fuel_efficiency") or 20.0)
            load_factor = float(v.get("load_factor", 1.0))
            fuel_liters = (distance_km / kmpl) * load_factor * speed_factor if kmpl > 0 else 0.0
            energy_kwh = 0.0
            default_price = 102.0 if v_type == "petrol" else 90.0
            price_per_liter = float(v.get("fuel_price_per_litre", default_price))
            fuel_cost = fuel_liters * price_per_liter

            factor_dict = self.emission_service.get_factor(v_type)
            co2_kg = fuel_liters * float(factor_dict["value"])
            boundary = "tailpipe"
            resource_val = fuel_liters

        accounting_method = self.emission_service.get_accounting_method(boundary)

        return {
            "distance_km": round(distance_km, 3),
            "fuel_liters": round(fuel_liters, 3),
            "energy_kwh": round(energy_kwh, 3),
            "resource": round(resource_val, 3),
            "fuel_cost": round(fuel_cost, 2),
            "co2_kg": round(co2_kg, 4),
            "accounting_boundary": boundary,
            "accounting_method": accounting_method,
        }

    def check_ev_feasibility(self, required_kwh: float, vehicle: Any) -> dict[str, Any]:
        """
        Assess EV range feasibility considering battery capacity, SoC, and reserve margin.

        Returns {range_ok, required_kwh, usable_kwh, total_available_kwh, reserve_pct, warning}.
        """
        v: dict[str, Any] = {}
        if isinstance(vehicle, dict):
            v = vehicle
        elif vehicle is not None:
            v = getattr(vehicle, "__dict__", {})

        battery_capacity = float(v.get("battery_capacity_kwh") or v.get("battery_capacity") or 40.5)
        battery_soc = float(v.get("battery_soc", 80.0))  # percentage
        ev_reserve = settings.EV_RESERVE  # e.g. 0.10 (10%)

        total_available = battery_capacity * (battery_soc / 100.0)
        usable_kwh = max(0.0, total_available * (1.0 - ev_reserve))
        range_ok = required_kwh <= usable_kwh

        warning = None
        if not range_ok:
            reserve_pct_int = int(round(ev_reserve * 100))
            warning = (
                f"Trip requires {required_kwh:.2f} kWh, exceeding usable battery energy "
                f"({usable_kwh:.2f} kWh with {reserve_pct_int}% reserve). Charging stop required."
            )

        return {
            "range_ok": range_ok,
            "required_kwh": round(required_kwh, 2),
            "usable_kwh": round(usable_kwh, 2),
            "total_available_kwh": round(total_available, 2),
            "reserve_pct": int(round(ev_reserve * 100)),
            "warning": warning,
        }
