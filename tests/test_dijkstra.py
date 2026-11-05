"""Unit tests for custom heap-based Dijkstra algorithm."""

from __future__ import annotations

import networkx as nx
import pytest

from agents.road_network_agent import RoadNetworkAgent
from algorithms.dijkstra import NoRouteFound, SearchResult, dijkstra


@pytest.fixture
def demo_graph() -> nx.DiGraph:
    """Fixture providing a fresh demo A-E graph."""
    return RoadNetworkAgent().create_demo_graph()


def test_dijkstra_shortest_distance(demo_graph: nx.DiGraph) -> None:
    """Verify Dijkstra finds the shortest-distance route A -> D -> E (8.2 km)."""
    result = dijkstra(demo_graph, source="A", destination="E", weight="length_km")

    assert isinstance(result, SearchResult)
    assert result.path == ["A", "D", "E"]
    assert pytest.approx(result.cost, rel=1e-3) == 8.2
    assert result.nodes_explored >= 2
    assert result.time_ms >= 0.0


def test_dijkstra_free_flow_time(demo_graph: nx.DiGraph) -> None:
    """Verify Dijkstra finds the fastest-time route on demo graph."""
    result = dijkstra(demo_graph, source="A", destination="E", weight="free_flow_time_min")

    assert isinstance(result, SearchResult)
    # A->D->E is 5.25 + 7.05 = 12.30 min; A->B->C->E is 5.04 + 3.80 + 3.48 = 12.32 min
    assert result.path == ["A", "D", "E"]
    assert pytest.approx(result.cost, rel=1e-3) == 12.30


def test_dijkstra_custom_cost_fn(demo_graph: nx.DiGraph) -> None:
    """Verify Dijkstra with a custom edge cost callable."""

    # Penalize secondary roads heavily
    def custom_cost(u: str, v: str, d: dict) -> float:
        base = d["length_km"]
        return base * (10.0 if d.get("road_type") == "secondary" else 1.0)

    result = dijkstra(demo_graph, source="A", destination="E", cost_fn=custom_cost)
    # Since A->D is secondary, path should divert via A->B->C->E (all primary)
    assert result.path == ["A", "B", "C", "E"]


def test_dijkstra_blocked_edges(demo_graph: nx.DiGraph) -> None:
    """Verify Dijkstra skips blocked edges and finds alternative paths."""
    demo_graph.edges["A", "D"]["is_blocked"] = True

    result = dijkstra(demo_graph, source="A", destination="E")
    assert result.path == ["A", "B", "C", "E"]
    assert pytest.approx(result.cost, rel=1e-3) == 10.9


def test_dijkstra_no_route_when_all_blocked(demo_graph: nx.DiGraph) -> None:
    """Verify NoRouteFound is raised when destination cannot be reached."""
    # Block both outgoing edges from A
    demo_graph.edges["A", "B"]["is_blocked"] = True
    demo_graph.edges["A", "D"]["is_blocked"] = True

    with pytest.raises(NoRouteFound, match="No unblocked path exists"):
        dijkstra(demo_graph, source="A", destination="E")


def test_dijkstra_same_source_and_destination(demo_graph: nx.DiGraph) -> None:
    """Verify searching from node to itself returns cost 0 and single-node path."""
    result = dijkstra(demo_graph, source="C", destination="C")

    assert result.path == ["C"]
    assert result.cost == 0.0
    assert result.nodes_explored == 1


def test_dijkstra_missing_node(demo_graph: nx.DiGraph) -> None:
    """Verify NoRouteFound is raised when source or destination is not in graph."""
    with pytest.raises(NoRouteFound, match="Source node 'Z' not found"):
        dijkstra(demo_graph, source="Z", destination="E")

    with pytest.raises(NoRouteFound, match="Destination node 'Z' not found"):
        dijkstra(demo_graph, source="A", destination="Z")


def test_dijkstra_negative_cost_raises() -> None:
    """Verify ValueError is raised if an edge has negative cost."""
    g = nx.DiGraph()
    g.add_edge("1", "2", length_km=-5.0)

    with pytest.raises(ValueError, match="Negative edge cost"):
        dijkstra(g, "1", "2")


def test_dijkstra_multidigraph() -> None:
    """Verify Dijkstra correctly evaluates edges in a MultiDiGraph."""
    mg = nx.MultiDiGraph()
    mg.add_edge("X", "Y", key=0, length_km=10.0, is_blocked=False)
    mg.add_edge("X", "Y", key=1, length_km=4.0, is_blocked=False)  # shorter route
    mg.add_edge("Y", "Z", key=0, length_km=3.0, is_blocked=False)

    result = dijkstra(mg, "X", "Z")
    assert result.path == ["X", "Y", "Z"]
    assert pytest.approx(result.cost, rel=1e-3) == 7.0
