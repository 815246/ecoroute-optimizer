"""Unit tests for RoadNetworkAgent and synthetic graph generators."""

from __future__ import annotations

import networkx as nx
import pytest

from agents.road_network_agent import RoadNetworkAgent, haversine_distance_km


def test_haversine_distance_basic() -> None:
    """Verify haversine formula with known identical and nearby points."""
    # Distance to self is 0
    assert haversine_distance_km(23.3441, 85.3096, 23.3441, 85.3096) == 0.0

    # Distance between Ranchi (~23.344, 85.309) and Jamshedpur (~22.804, 86.202) is ~110-120 km
    d = haversine_distance_km(23.3441, 85.3096, 22.8046, 86.2029)
    assert 100.0 < d < 130.0


def test_create_demo_graph() -> None:
    """Verify demo A-E graph topology, node attrs, and edge attributes."""
    agent = RoadNetworkAgent()
    g = agent.create_demo_graph()

    assert isinstance(g, nx.DiGraph)
    assert g.graph.get("name") == "demo_ae_graph"
    assert g.graph.get("data_mode") == "simulated"
    assert set(g.nodes()) == {"A", "B", "C", "D", "E"}

    # Verify node attributes
    for _node, data in g.nodes(data=True):
        assert "lat" in data and isinstance(data["lat"], float)
        assert "lon" in data and isinstance(data["lon"], float)
        assert "name" in data

    # Verify edge attributes
    assert len(g.edges()) == 11
    for _u, _v, data in g.edges(data=True):
        assert "length_km" in data and data["length_km"] > 0
        assert "speed_kmh" in data and data["speed_kmh"] > 0
        assert "free_flow_time_min" in data and data["free_flow_time_min"] > 0
        assert "road_type" in data
        assert "traffic_multiplier" in data and data["traffic_multiplier"] == 1.0
        assert "is_blocked" in data and data["is_blocked"] is False
        assert "geometry" in data and len(data["geometry"]) >= 2

    assert nx.is_strongly_connected(g)
    assert g.graph["max_speed_kmh"] >= 60.0


def test_generate_graph_grid() -> None:
    """Verify procedural grid graph generation and strong connectivity."""
    agent = RoadNetworkAgent()
    g = agent.generate_graph(n_nodes=16, kind="grid", density=0.3, seed=123)

    assert len(g.nodes()) == 16
    assert nx.is_strongly_connected(g)
    assert g.graph.get("data_mode") == "simulated"
    assert g.graph["max_speed_kmh"] > 0

    for _node, data in g.nodes(data=True):
        assert "lat" in data and "lon" in data

    for _u, _v, data in g.edges(data=True):
        assert data["length_km"] > 0
        assert data["speed_kmh"] > 0
        assert data["free_flow_time_min"] > 0
        assert data["is_blocked"] is False


def test_generate_graph_geometric() -> None:
    """Verify procedural geometric graph generation and strong connectivity."""
    agent = RoadNetworkAgent()
    g = agent.generate_graph(n_nodes=20, kind="geometric", density=0.4, seed=42)

    assert len(g.nodes()) == 20
    assert nx.is_strongly_connected(g)
    assert g.graph.get("data_mode") == "simulated"

    for _u, _v, data in g.edges(data=True):
        assert data["length_km"] > 0
        assert data["is_blocked"] is False


def test_generate_graph_validation() -> None:
    """Verify input validation on node count and graph kind."""
    agent = RoadNetworkAgent()

    with pytest.raises(ValueError, match="n_nodes must be at least 2"):
        agent.generate_graph(n_nodes=1)

    with pytest.raises(ValueError, match="Unknown graph kind"):
        agent.generate_graph(n_nodes=10, kind="invalid_kind")
