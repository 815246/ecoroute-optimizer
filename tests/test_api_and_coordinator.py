"""Integration tests for Coordinator and Phase 5 API endpoints."""

from __future__ import annotations

from fastapi.testclient import TestClient

from agents.coordinator import Coordinator


def test_coordinator_optimize_demo() -> None:
    """Verify Coordinator runs full pipeline and produces structured response."""
    coordinator = Coordinator()
    req = {
        "source": "A",
        "destination": "E",
        "vehicle": "petrol_hatchback",
        "weights": "balanced",
        "data_mode": "simulated",
        "departure_hour": 8,
    }
    res = coordinator.optimize(req)

    assert res["status"] == "success"
    assert res["source"] == "A"
    assert res["destination"] == "E"
    assert res["traffic_label"] == "Simulated traffic, not live"
    assert "recommended_route" in res
    assert "baselines" in res
    assert "fastest" in res["baselines"]
    assert "shortest" in res["baselines"]
    assert "explanation" in res
    assert len(res["routes"]) >= 1
    assert len(res["agent_trace"]) >= 4

    trace_agents = [t["agent"] for t in res["agent_trace"]]
    assert "RoadNetworkAgent" in trace_agents
    assert "TrafficAgent" in trace_agents
    assert "RouteSearchAgent" in trace_agents
    assert "OptimizationAgent" in trace_agents


def test_coordinator_optimize_ev() -> None:
    """Verify Coordinator evaluates EV range feasibility."""
    coordinator = Coordinator()
    req = {
        "source": "A",
        "destination": "E",
        "vehicle": "electric_sedan",
        "weights": "eco_first",
    }
    res = coordinator.optimize(req)

    assert res["ev_feasibility"] is not None
    assert res["ev_feasibility"]["range_ok"] is True
    assert res["recommended_route"]["accounting_boundary"] == "grid-average"


def test_api_get_presets(client: TestClient) -> None:
    """Verify GET /api/routes/presets returns standard presets."""
    response = client.get("/api/routes/presets")
    assert response.status_code == 200
    data = response.json()
    assert "balanced" in data
    assert "eco_first" in data
    assert "time_first" in data


def test_api_plan_and_retrieve_route(client: TestClient) -> None:
    """Verify POST /api/routes/plan and GET /api/routes/{id}."""
    payload = {
        "source": "A",
        "destination": "E",
        "vehicle": "petrol_hatchback",
        "weights": {"distance": 0.25, "time": 0.25, "resource": 0.25, "emissions": 0.25},
        "data_mode": "simulated",
        "persist": True,
    }
    plan_resp = client.post("/api/routes/plan", json=payload)
    assert plan_resp.status_code == 200
    plan_data = plan_resp.json()

    assert plan_data["status"] == "success"
    assert "recommended_route" in plan_data
    assert "journey_id" in plan_data

    journey_id = plan_data["journey_id"]

    # Retrieve journey
    get_resp = client.get(f"/api/routes/{journey_id}")
    assert get_resp.status_code == 200
    get_data = get_resp.json()
    assert get_data["journey_id"] == journey_id
    assert len(get_data["routes"]) >= 1


def test_api_vehicles(client: TestClient) -> None:
    """Verify GET /api/vehicles and POST /api/vehicles."""
    get_resp = client.get("/api/vehicles")
    assert get_resp.status_code == 200
    defaults = get_resp.json()
    assert len(defaults) >= 3

    # Create custom vehicle
    custom_payload = {
        "vehicle_type": "petrol",
        "fuel_type": "petrol",
        "fuel_efficiency": 22.5,
    }
    post_resp = client.post("/api/vehicles", json=custom_payload)
    assert post_resp.status_code == 201
    created = post_resp.json()
    assert created["status"] == "created"
    assert "id" in created


def test_api_history_and_analytics(client: TestClient) -> None:
    """Verify GET /api/history and GET /api/analytics."""
    hist_resp = client.get("/api/history")
    assert hist_resp.status_code == 200
    assert isinstance(hist_resp.json(), list)

    analytics_resp = client.get("/api/analytics")
    assert analytics_resp.status_code == 200
    adata = analytics_resp.json()
    assert "total_journeys_planned" in adata
    assert "traffic_label" in adata


def test_api_simulation_traffic(client: TestClient) -> None:
    """Verify POST /api/simulation/traffic applies time-of-day condition."""
    sim_payload = {
        "hour": 18,
    }
    sim_resp = client.post("/api/simulation/traffic", json=sim_payload)
    assert sim_resp.status_code == 200
    sim_data = sim_resp.json()
    assert sim_data["traffic_label"] == "Simulated traffic, not live"
    assert "time_of_day" in sim_data
