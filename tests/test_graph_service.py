"""Unit tests for GraphService and VehicleService."""

from __future__ import annotations

import networkx as nx
import pytest

from services.graph_service import GraphService
from services.vehicle_service import VehicleService


def test_graph_service_demo() -> None:
    """Verify GraphService loads and caches the demo A-E graph."""
    service = GraphService()
    g1 = service.get_demo()
    g2 = service.get_demo()

    assert isinstance(g1, nx.DiGraph)
    assert len(g1.nodes()) == 5
    assert g1 is g2  # Cached identical instance


def test_graph_service_simulated_caching() -> None:
    """Verify GraphService caches simulated networks by (n_nodes, kind, seed)."""
    service = GraphService()
    g1 = service.get_simulated(n_nodes=10, kind="grid", seed=42)
    g2 = service.get_simulated(n_nodes=10, kind="grid", seed=42)
    g3 = service.get_simulated(n_nodes=10, kind="grid", seed=99)

    assert g1 is g2
    assert g1 is not g3

    # Clear cache
    service.clear_cache()
    g4 = service.get_simulated(n_nodes=10, kind="grid", seed=42)
    assert g4 is not g1


def test_graph_service_osm_delegation() -> None:
    """Verify GraphService delegates get_osm to road_agent.load_osm_graph."""
    service = GraphService()
    with pytest.raises(ValueError, match="exceeds maximum"):
        # Ranchi to Delhi exceeds MAX_BBOX_KM
        service.get_osm("23.3441, 85.3096", "28.6139, 77.2090")


def test_vehicle_service_get_defaults() -> None:
    """Verify VehicleService loads default vehicle configs from JSON."""
    service = VehicleService()
    defaults = service.get_defaults()

    assert len(defaults) >= 3
    ids = [v["id"] for v in defaults]
    assert "petrol_hatchback" in ids
    assert "diesel_suv" in ids
    assert "electric_sedan" in ids

    # Check petrol hatchback attrs
    petrol = service.get_by_id("petrol_hatchback")
    assert petrol["fuel_type"] == "petrol"
    assert petrol["fuel_efficiency_kmpl"] > 0
    assert petrol["load_factor"] == 1.0

    # Check EV attrs
    ev = service.get_by_id("electric_sedan")
    assert ev["type"] == "electric"
    assert ev["energy_rate_kwh_per_100km"] > 0
    assert ev["battery_capacity_kwh"] > 0


def test_vehicle_service_missing_id() -> None:
    """Verify KeyError when requesting non-existent vehicle ID."""
    service = VehicleService()
    with pytest.raises(KeyError, match="Vehicle 'unknown_truck' not found"):
        service.get_by_id("unknown_truck")
