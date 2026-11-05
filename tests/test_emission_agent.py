"""Unit tests for EmissionAgent and EmissionService."""

from __future__ import annotations

import pytest

from agents.emission_agent import EmissionAgent
from config import settings
from services.emission_service import EmissionService


@pytest.fixture
def emission_service() -> EmissionService:
    return EmissionService()


@pytest.fixture
def emission_agent(emission_service: EmissionService) -> EmissionAgent:
    return EmissionAgent(emission_service=emission_service)


def test_emission_service_factors(emission_service: EmissionService) -> None:
    """Verify loading and properties of official emission factors."""
    petrol = emission_service.get_factor("petrol")
    assert petrol["value"] == 2.31
    assert petrol["boundary"] == "tailpipe"

    diesel = emission_service.get_factor("diesel")
    assert diesel["value"] == 2.68
    assert diesel["boundary"] == "tailpipe"

    ev = emission_service.get_factor("electric")
    assert ev["value"] == 0.716
    assert ev["boundary"] == "grid-average"


def test_emission_service_unknown_fuel_raises(emission_service: EmissionService) -> None:
    """Verify KeyError when querying unmapped fuel type."""
    with pytest.raises(KeyError, match="Unknown fuel type"):
        emission_service.get_factor("hydrogen_fusion")


def test_calculate_petrol(emission_agent: EmissionAgent) -> None:
    """Verify calculation for petrol vehicle (tailpipe boundary)."""
    vehicle = {
        "type": "petrol",
        "fuel_efficiency_kmpl": 20.0,
        "fuel_price_per_litre": 100.0,
        "load_factor": 1.0,
    }
    # 100 km at 20 km/L = 5.0 L; 5.0 * 2.31 = 11.55 kg CO2
    res = emission_agent.calculate(distance_km=100.0, vehicle=vehicle)

    assert pytest.approx(res["fuel_liters"], rel=1e-3) == 5.0
    assert res["energy_kwh"] == 0.0
    assert pytest.approx(res["fuel_cost"], rel=1e-3) == 500.0
    assert pytest.approx(res["co2_kg"], rel=1e-3) == 11.55
    assert res["accounting_boundary"] == "tailpipe"
    assert "Tailpipe" in res["accounting_method"]


def test_calculate_diesel(emission_agent: EmissionAgent) -> None:
    """Verify calculation for diesel vehicle (tailpipe boundary)."""
    vehicle = {
        "type": "diesel",
        "fuel_efficiency_kmpl": 15.0,
        "fuel_price_per_litre": 90.0,
        "load_factor": 1.0,
    }
    # 60 km at 15 km/L = 4.0 L; 4.0 * 2.68 = 10.72 kg CO2
    res = emission_agent.calculate(distance_km=60.0, vehicle=vehicle)

    assert pytest.approx(res["fuel_liters"], rel=1e-3) == 4.0
    assert pytest.approx(res["co2_kg"], rel=1e-3) == 10.72
    assert res["accounting_boundary"] == "tailpipe"


def test_calculate_electric(emission_agent: EmissionAgent) -> None:
    """Verify calculation for electric vehicle (grid-average boundary)."""
    vehicle = {
        "type": "electric",
        "energy_rate_kwh_per_100km": 15.0,
        "electricity_price_per_kwh": 8.0,
    }
    # 100 km at 15 kWh/100km = 15.0 kWh; 15.0 * 0.716 = 10.74 kg CO2
    res = emission_agent.calculate(distance_km=100.0, vehicle=vehicle)

    assert res["fuel_liters"] == 0.0
    assert pytest.approx(res["energy_kwh"], rel=1e-3) == 15.0
    assert pytest.approx(res["fuel_cost"], rel=1e-3) == 120.0
    assert pytest.approx(res["co2_kg"], rel=1e-3) == 10.74
    assert res["accounting_boundary"] == "grid-average"
    assert "Grid-average" in res["accounting_method"]


def test_calculate_load_factor(emission_agent: EmissionAgent) -> None:
    """Verify load factor increases fuel consumption proportionally."""
    vehicle_base = {"type": "petrol", "fuel_efficiency_kmpl": 20.0, "load_factor": 1.0}
    vehicle_heavy = {"type": "petrol", "fuel_efficiency_kmpl": 20.0, "load_factor": 1.25}

    res_base = emission_agent.calculate(distance_km=50.0, vehicle=vehicle_base)
    res_heavy = emission_agent.calculate(distance_km=50.0, vehicle=vehicle_heavy)

    assert pytest.approx(res_heavy["fuel_liters"], rel=1e-3) == res_base["fuel_liters"] * 1.25
    assert pytest.approx(res_heavy["co2_kg"], rel=1e-3) == res_base["co2_kg"] * 1.25


def test_calculate_speed_aware(
    emission_agent: EmissionAgent, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Verify speed-aware consumption adjustment when enabled."""
    monkeypatch.setattr(settings, "SPEED_AWARE", True)
    vehicle = {"type": "petrol", "fuel_efficiency_kmpl": 20.0}

    # At optimal 60 km/h: multiplier = 1.0
    res_opt = emission_agent.calculate(distance_km=60.0, vehicle=vehicle, avg_speed_kmh=60.0)
    # At congested 20 km/h: consumption rises
    res_congested = emission_agent.calculate(distance_km=60.0, vehicle=vehicle, avg_speed_kmh=20.0)

    assert res_congested["fuel_liters"] > res_opt["fuel_liters"]


def test_check_ev_feasibility_ok(emission_agent: EmissionAgent) -> None:
    """Verify feasible EV trip within usable battery margin."""
    vehicle = {
        "battery_capacity_kwh": 40.5,
        "battery_soc": 80.0,  # 32.4 kWh total; 10% reserve -> ~29.16 kWh usable
    }
    feasibility = emission_agent.check_ev_feasibility(required_kwh=20.0, vehicle=vehicle)

    assert feasibility["range_ok"] is True
    assert feasibility["usable_kwh"] >= 29.0
    assert feasibility["warning"] is None


def test_check_ev_feasibility_exceeded(emission_agent: EmissionAgent) -> None:
    """Verify infeasible EV trip triggers range_ok=False and explicit warning."""
    vehicle = {
        "battery_capacity_kwh": 40.5,
        "battery_soc": 50.0,  # 20.25 kWh total; 10% reserve -> 18.225 kWh usable
    }
    feasibility = emission_agent.check_ev_feasibility(required_kwh=25.0, vehicle=vehicle)

    assert feasibility["range_ok"] is False
    assert "Charging stop required" in str(feasibility["warning"])


def test_negative_distance_raises(emission_agent: EmissionAgent) -> None:
    """Verify ValueError when distance is negative."""
    with pytest.raises(ValueError, match="distance_km cannot be negative"):
        emission_agent.calculate(distance_km=-10.0, vehicle={"type": "petrol"})
