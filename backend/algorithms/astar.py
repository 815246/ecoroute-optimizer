"""
Custom A* implementation with admissible heuristics.

Heuristic admissibility rules (documented):
  - distance:   h(n) = haversine distance to goal (Euclidean for synthetic coords).
                Always <= true remaining road distance (roads >= straight line).
  - time:       h(n) = straight-line distance / max_speed_in_graph.
                Always <= true time (actual path is longer, actual speed <= max).
  - resource/emission: h(n) = straight-line distance * min_per_km_cost.
                Always <= true cost (path is longer, rate is minimum).
  - composite:  weighted sum of the above individual admissible components.
                Weighted sum of admissible heuristics is admissible.

Phase 2 implements this module fully.
"""

from __future__ import annotations

import heapq
import time
from collections.abc import Callable
from typing import Any

from agents.road_network_agent import haversine_distance_km
from algorithms.dijkstra import NoRouteFound, SearchResult
from config import settings

__all__ = ["NoRouteFound", "SearchResult", "astar", "heuristic_factory"]


def _get_node_coords(graph: Any, node: Any) -> tuple[float, float] | None:
    """Extract (lat, lon) from node data if present."""
    if node not in graph:
        return None
    data = graph.nodes[node]
    lat = data.get("lat", data.get("y"))
    lon = data.get("lon", data.get("x"))
    if lat is None or lon is None:
        return None
    return float(lat), float(lon)


def heuristic_factory(
    objective: str,
    graph: Any,
    destination: Any,
    vehicle: Any | None = None,
    weights: dict[str, float] | None = None,
) -> Callable[[Any], float]:
    """
    Return an admissible heuristic function h(node) -> float for the given objective.

    Admissibility guarantees:
      - distance: haversine straight-line distance <= actual road distance.
      - time: straight-line distance / max_speed_in_graph <= actual road travel time.
      - resource: straight-line distance * min_resource_rate <= actual consumption.
      - emission: straight-line distance * min_emission_rate <= actual emissions.
      - composite: sum of normalized weighted admissible components.

    Parameters
    ----------
    objective : str
        One of 'distance', 'time', 'resource', 'fuel', 'energy',
        'emission', 'emissions', 'co2', 'composite', 'multi_objective', 'balanced'.
    graph : nx.DiGraph | nx.MultiDiGraph
        Road network graph.
    destination : Any
        Target node ID.
    vehicle : Any | None
        Vehicle configuration dictionary or model instance.
    weights : dict[str, float] | None
        Objective weights for composite heuristics.

    Returns
    -------
    Callable[[Any], float]
        Heuristic function mapping node -> estimated remaining cost.
    """
    dest_coords = _get_node_coords(graph, destination)
    if dest_coords is None:
        return lambda node: 0.0

    dest_lat, dest_lon = dest_coords

    def _h_distance(node: Any) -> float:
        coords = _get_node_coords(graph, node)
        if coords is None:
            return 0.0
        return haversine_distance_km(coords[0], coords[1], dest_lat, dest_lon)

    if objective == "distance":
        return _h_distance

    # Max speed in graph (km/h)
    max_speed = graph.graph.get("max_speed_kmh")
    if not max_speed or max_speed <= 0:
        max_speed = max(
            (data.get("speed_kmh", 50.0) for _, _, data in graph.edges(data=True)),
            default=60.0,
        )
    max_speed = max(float(max_speed), 10.0)

    def _h_time(node: Any) -> float:
        # Distance (km) / Speed (km/h) * 60 = minutes
        d = _h_distance(node)
        return (d / max_speed) * 60.0

    if objective == "time":
        return _h_time

    # Vehicle consumption rates
    v_dict: dict[str, Any] = {}
    if isinstance(vehicle, dict):
        v_dict = vehicle
    elif vehicle is not None:
        v_dict = getattr(vehicle, "__dict__", {})

    v_type = v_dict.get("type", v_dict.get("vehicle_type", "petrol"))

    # Compute minimum resource consumption per km
    if v_type == "electric":
        energy_rate = float(
            v_dict.get("energy_rate_kwh_per_100km", v_dict.get("energy_rate", 15.0))
        )
        min_res_per_km = energy_rate / 100.0  # kWh per km
    else:
        kmpl = float(v_dict.get("fuel_efficiency_kmpl", v_dict.get("fuel_efficiency", 20.0)))
        load = float(v_dict.get("load_factor", 1.0))
        min_res_per_km = (1.0 / kmpl) * load if kmpl > 0 else 0.05

    def _h_resource(node: Any) -> float:
        return _h_distance(node) * min_res_per_km

    if objective in ("resource", "fuel", "energy"):
        return _h_resource

    # Compute minimum emission per km
    if v_type == "electric":
        grid_factor = float(v_dict.get("grid_factor_override") or 0.716)
        min_em_per_km = min_res_per_km * grid_factor
    elif v_type == "diesel":
        min_em_per_km = min_res_per_km * 2.68
    else:  # petrol
        min_em_per_km = min_res_per_km * 2.31

    def _h_emission(node: Any) -> float:
        return _h_distance(node) * min_em_per_km

    if objective in ("emission", "emissions", "co2"):
        return _h_emission

    if objective in ("composite", "multi_objective", "balanced"):
        w = weights or {
            "distance": 0.25,
            "time": 0.25,
            "resource": 0.25,
            "emissions": 0.25,
        }
        w_d = w.get("distance", 0.25)
        w_t = w.get("time", 0.25)
        w_r = w.get("resource", 0.25)
        w_e = w.get("emissions", w.get("emission", 0.25))

        d_ref = max(settings.DISTANCE_REF_KM, 1.0)
        t_ref = max(settings.TIME_REF_MIN, 1.0)
        r_ref = max(settings.RESOURCE_REF, 0.1)
        e_ref = max(settings.EMISSIONS_REF_KG, 0.1)

        def _h_composite(node: Any) -> float:
            d = _h_distance(node)
            t = (d / max_speed) * 60.0
            r = d * min_res_per_km
            e = d * min_em_per_km
            return w_d * (d / d_ref) + w_t * (t / t_ref) + w_r * (r / r_ref) + w_e * (e / e_ref)

        return _h_composite

    # Default to 0.0 (Dijkstra equivalence) for unknown objectives
    return lambda node: 0.0


def astar(
    graph: Any,
    source: Any,
    destination: Any,
    cost_fn: Callable[..., float] | None = None,
    weight: str = "length_km",
    heuristic: Callable[[Any], float] | None = None,
) -> SearchResult:
    """
    A* search with an admissible heuristic.

    heuristic(node) -> estimated remaining cost to destination.
    Falls back to zero heuristic (= Dijkstra) if heuristic is None.
    Skips edges where is_blocked is True.

    Parameters
    ----------
    graph : nx.DiGraph | nx.MultiDiGraph
        Road network graph.
    source : Any
        Starting node ID.
    destination : Any
        Target node ID.
    cost_fn : Callable[[Any, Any, dict], float] | None
        Function to compute edge traversal cost. If None, uses edge_data[weight].
    weight : str
        Edge attribute name to use as cost if cost_fn is None.
    heuristic : Callable[[Any], float] | None
        Admissible estimate of cost from node to destination.

    Returns
    -------
    SearchResult
        Contains path, total cost, nodes_explored, and execution time_ms.

    Raises
    ------
    NoRouteFound
        If source or destination not in graph, or no unblocked path connects them.
    ValueError
        If any traversed edge has a negative cost.
    """
    start_time = time.perf_counter()

    if source not in graph:
        raise NoRouteFound(f"Source node {source!r} not found in graph")
    if destination not in graph:
        raise NoRouteFound(f"Destination node {destination!r} not found in graph")

    if source == destination:
        elapsed = round((time.perf_counter() - start_time) * 1000.0, 3)
        return SearchResult(
            path=[source],
            cost=0.0,
            nodes_explored=1,
            time_ms=elapsed,
        )

    h = heuristic if heuristic is not None else (lambda n: 0.0)

    # Priority queue stores tuples of: (f_score, h_score, counter, node)
    counter = 0
    h_source = float(h(source))
    pq: list[tuple[float, float, int, Any]] = [(h_source, h_source, counter, source)]

    g_score: dict[Any, float] = {source: 0.0}
    came_from: dict[Any, Any] = {}
    closed_set: set[Any] = set()
    nodes_explored = 0

    is_multi = hasattr(graph, "is_multigraph") and graph.is_multigraph()

    while pq:
        f_val, _, _, u = heapq.heappop(pq)

        if u in closed_set:
            continue
        closed_set.add(u)
        nodes_explored += 1

        if u == destination:
            break

        cur_g = g_score[u]

        # Collect outgoing edges
        if is_multi:
            for v, keys_dict in graph[u].items():
                if v in closed_set:
                    continue
                for edge_data in keys_dict.values():
                    if edge_data.get("is_blocked", False):
                        continue
                    if cost_fn is not None:
                        edge_cost = float(cost_fn(u, v, edge_data))
                    else:
                        edge_cost = float(edge_data.get(weight, 1.0))

                    if edge_cost < 0:
                        raise ValueError(f"Negative edge cost {edge_cost} on edge ({u}, {v})")

                    tentative_g = cur_g + edge_cost
                    if tentative_g < g_score.get(v, float("inf")):
                        came_from[v] = u
                        g_score[v] = tentative_g
                        h_v = float(h(v))
                        f_v = tentative_g + h_v
                        counter += 1
                        heapq.heappush(pq, (f_v, h_v, counter, v))
        else:
            for v, edge_data in graph[u].items():
                if v in closed_set:
                    continue
                if edge_data.get("is_blocked", False):
                    continue
                if cost_fn is not None:
                    edge_cost = float(cost_fn(u, v, edge_data))
                else:
                    edge_cost = float(edge_data.get(weight, 1.0))

                if edge_cost < 0:
                    raise ValueError(f"Negative edge cost {edge_cost} on edge ({u}, {v})")

                tentative_g = cur_g + edge_cost
                if tentative_g < g_score.get(v, float("inf")):
                    came_from[v] = u
                    g_score[v] = tentative_g
                    h_v = float(h(v))
                    f_v = tentative_g + h_v
                    counter += 1
                    heapq.heappush(pq, (f_v, h_v, counter, v))

    if destination not in closed_set:
        raise NoRouteFound(f"No unblocked path exists from {source!r} to {destination!r}")

    # Reconstruct shortest path
    path: list[Any] = []
    curr = destination
    while curr in came_from:
        path.append(curr)
        curr = came_from[curr]
    path.append(source)
    path.reverse()

    elapsed = round((time.perf_counter() - start_time) * 1000.0, 3)
    return SearchResult(
        path=path,
        cost=round(g_score[destination], 6),
        nodes_explored=nodes_explored,
        time_ms=elapsed,
    )
