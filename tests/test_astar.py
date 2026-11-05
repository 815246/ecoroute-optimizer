"""Unit tests for A* search and admissible heuristic factory."""

from __future__ import annotations

import networkx as nx
import pytest

from agents.road_network_agent import RoadNetworkAgent
from algorithms.astar import astar, heuristic_factory
from algorithms.dijkstra import NoRouteFound, dijkstra


@pytest.fixture
def demo_graph() -> nx.DiGraph:
    """Fixture providing a fresh demo A-E graph."""
    return RoadNetworkAgent().create_demo_graph()


def test_astar_demo_equivalence_with_dijkstra(demo_graph: nx.DiGraph) -> None:
    """Verify A* finds the exact same optimal path and cost as Dijkstra on demo graph."""
    h = heuristic_factory("distance", demo_graph, destination="E")

    d_res = dijkstra(demo_graph, source="A", destination="E", weight="length_km")
    a_res = astar(demo_graph, source="A", destination="E", weight="length_km", heuristic=h)

    assert d_res.path == a_res.path == ["A", "D", "E"]
    assert pytest.approx(d_res.cost, rel=1e-5) == a_res.cost
    # A* explores fewer or equal nodes
    assert a_res.nodes_explored <= d_res.nodes_explored


def test_astar_heuristic_prunes_search_space() -> None:
    """Verify that A* explores significantly fewer nodes than Dijkstra on a larger grid."""
    g = RoadNetworkAgent().generate_graph(n_nodes=64, kind="grid", seed=42)
    h = heuristic_factory("distance", g, destination=63)

    d_res = dijkstra(g, source=0, destination=63, weight="length_km")
    a_res = astar(g, source=0, destination=63, weight="length_km", heuristic=h)

    assert pytest.approx(d_res.cost, rel=1e-4) == a_res.cost
    assert a_res.nodes_explored < d_res.nodes_explored


def test_heuristic_factory_distance_admissibility(demo_graph: nx.DiGraph) -> None:
    """Verify that distance heuristic h(n) <= true remaining road distance for all nodes."""
    destination = "E"
    h = heuristic_factory("distance", demo_graph, destination)

    for node in demo_graph.nodes():
        h_val = h(node)
        true_dist = dijkstra(demo_graph, source=node, destination=destination).cost
        assert h_val <= true_dist + 1e-6, (
            f"Heuristic inadmissible for node {node}: {h_val} > {true_dist}"
        )


def test_heuristic_factory_time_admissibility(demo_graph: nx.DiGraph) -> None:
    """Verify that time heuristic h(n) <= true remaining travel time for all nodes."""
    destination = "E"
    h = heuristic_factory("time", demo_graph, destination)

    for node in demo_graph.nodes():
        h_val = h(node)
        true_time = dijkstra(
            demo_graph, source=node, destination=destination, weight="free_flow_time_min"
        ).cost
        assert h_val <= true_time + 1e-6, (
            f"Time heuristic inadmissible for node {node}: {h_val} > {true_time}"
        )


def test_heuristic_factory_vehicle_objectives(demo_graph: nx.DiGraph) -> None:
    """Verify heuristic generation for ICE and EV vehicle configs."""
    petrol_vehicle = {
        "type": "petrol",
        "fuel_efficiency_kmpl": 20.0,
        "load_factor": 1.0,
    }
    ev_vehicle = {
        "type": "electric",
        "energy_rate_kwh_per_100km": 15.0,
    }

    h_petrol_res = heuristic_factory("resource", demo_graph, "E", vehicle=petrol_vehicle)
    h_petrol_em = heuristic_factory("emission", demo_graph, "E", vehicle=petrol_vehicle)
    assert h_petrol_res("A") > 0.0
    assert h_petrol_em("A") > 0.0

    h_ev_res = heuristic_factory("resource", demo_graph, "E", vehicle=ev_vehicle)
    h_ev_em = heuristic_factory("emission", demo_graph, "E", vehicle=ev_vehicle)
    assert h_ev_res("A") > 0.0
    assert h_ev_em("A") > 0.0

    # Composite multi-objective heuristic
    h_comp = heuristic_factory(
        "composite",
        demo_graph,
        "E",
        vehicle=petrol_vehicle,
        weights={"distance": 0.25, "time": 0.25, "resource": 0.25, "emissions": 0.25},
    )
    assert h_comp("A") > 0.0


def test_astar_blocked_edges(demo_graph: nx.DiGraph) -> None:
    """Verify A* respects blocked edges."""
    demo_graph.edges["A", "D"]["is_blocked"] = True
    h = heuristic_factory("distance", demo_graph, "E")

    result = astar(demo_graph, "A", "E", heuristic=h)
    assert result.path == ["A", "B", "C", "E"]
    assert pytest.approx(result.cost, rel=1e-3) == 10.9


def test_astar_no_route_raises(demo_graph: nx.DiGraph) -> None:
    """Verify NoRouteFound is raised when destination cannot be reached."""
    demo_graph.edges["A", "B"]["is_blocked"] = True
    demo_graph.edges["A", "D"]["is_blocked"] = True
    h = heuristic_factory("distance", demo_graph, "E")

    with pytest.raises(NoRouteFound):
        astar(demo_graph, "A", "E", heuristic=h)


def test_astar_same_source_and_destination(demo_graph: nx.DiGraph) -> None:
    """Verify cost 0 and single-node path when source == destination."""
    result = astar(demo_graph, "B", "B")
    assert result.path == ["B"]
    assert result.cost == 0.0
    assert result.nodes_explored == 1


def test_astar_missing_node(demo_graph: nx.DiGraph) -> None:
    """Verify NoRouteFound when node not in graph."""
    with pytest.raises(NoRouteFound):
        astar(demo_graph, "NON_EXISTENT", "E")
