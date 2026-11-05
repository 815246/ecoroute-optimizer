"""Unit tests for Phase 7 dynamic traffic simulation and replanning agent."""

from __future__ import annotations

from fastapi.testclient import TestClient

from agents.replanning_agent import ReplanningAgent
from agents.road_network_agent import RoadNetworkAgent
from agents.traffic_agent import TrafficAgent


def test_traffic_incident_and_restore() -> None:
    """Verify traffic incident application, snapshot capture, and restoration."""
    traffic_agent = TrafficAgent()
    g = RoadNetworkAgent().create_demo_graph()

    # Capture initial clean state
    snap = traffic_agent.snapshot(g)

    # Apply severe incident to A->D
    traffic_agent.apply_incident(g, edge=("A", "D"), multiplier=3.0, blocked=True)
    assert g["A"]["D"]["traffic_multiplier"] == 3.0
    assert g["A"]["D"]["is_blocked"] is True

    # Restore initial state
    traffic_agent.restore(g, snap)
    assert g["A"]["D"]["traffic_multiplier"] == 1.0
    assert g["A"]["D"]["is_blocked"] is False


def test_replan_when_path_blocked() -> None:
    """Verify ReplanningAgent immediately recommends a switch if an edge becomes blocked."""
    agent = ReplanningAgent()
    g = RoadNetworkAgent().create_demo_graph()
    vehicle = {"type": "petrol", "fuel_efficiency_kmpl": 20.0}
    weights = {"distance": 0.25, "time": 0.25, "resource": 0.25, "emissions": 0.25}

    current_route = {
        "path": ["A", "D", "E"],
        "distance_km": 8.2,
        "travel_time_min": 12.3,
    }

    # Block edge A->D
    g["A"]["D"]["is_blocked"] = True

    decision = agent.replan(
        current_route=current_route,
        graph=g,
        vehicle=vehicle,
        weights=weights,
        threshold=0.05,
    )

    assert decision["switch"] is True
    assert "road closure or incident" in decision["reason"]
    assert decision["new_route"]["path"] == ["A", "B", "C", "E"]


def test_replan_below_threshold_does_not_switch() -> None:
    """Verify ReplanningAgent retains current route when alternative improvement < 5%."""
    agent = ReplanningAgent()
    g = RoadNetworkAgent().create_demo_graph()
    vehicle = {"type": "petrol", "fuel_efficiency_kmpl": 20.0}
    weights = {"distance": 0.25, "time": 0.25, "resource": 0.25, "emissions": 0.25}

    current_route = {
        "path": ["A", "D", "E"],
        "distance_km": 8.2,
        "travel_time_min": 12.3,
    }

    # Under baseline conditions, A->D->E is already best
    decision = agent.replan(
        current_route=current_route,
        graph=g,
        vehicle=vehicle,
        weights=weights,
        threshold=0.05,
    )

    assert decision["switch"] is False
    assert decision["score_improvement_pct"] < 5.0
    assert "below the 5.0% threshold" in decision["reason"]


def test_replan_above_threshold_switches() -> None:
    """Verify ReplanningAgent switches when congestion makes alternative > 5% better."""
    agent = ReplanningAgent()
    g = RoadNetworkAgent().create_demo_graph()
    vehicle = {"type": "petrol", "fuel_efficiency_kmpl": 20.0}
    # Time-heavy weights so congestion penalty heavily affects score
    weights = {"distance": 0.1, "time": 0.7, "resource": 0.1, "emissions": 0.1}

    current_route = {
        "path": ["A", "D", "E"],
        "distance_km": 8.2,
        "travel_time_min": 12.3,
    }

    # Make A->D heavily congested (multiplier 3.5x)
    g["A"]["D"]["traffic_multiplier"] = 3.5

    decision = agent.replan(
        current_route=current_route,
        graph=g,
        vehicle=vehicle,
        weights=weights,
        threshold=0.05,
    )

    assert decision["switch"] is True
    assert decision["score_improvement_pct"] >= 5.0
    assert decision["new_route"]["path"] == ["A", "B", "C", "E"]


def test_api_replan_endpoint(client: TestClient) -> None:
    """Verify POST /api/routes/replan endpoint."""
    payload = {
        "current_route": {
            "path": ["A", "D", "E"],
            "distance_km": 8.2,
            "travel_time_min": 12.3,
        },
        "vehicle": "petrol_hatchback",
        "weights": "balanced",
        "threshold": 0.05,
    }
    resp = client.post("/api/routes/replan", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "switch" in data
    assert "reason" in data
    assert "score_improvement_pct" in data
    assert "new_route" in data
