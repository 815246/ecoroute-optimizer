"""
Candidate route generation.

Generates a diverse candidate set by:
  (a) Running A* under several weight presets (distance-only, time-only,
      fuel-only, emissions-only, balanced).
  (b) Adding k extra alternatives via NetworkX shortest_simple_paths.
  (c) Deduplicating by edge-sequence hash.

One A* run does not reveal all Pareto-optimal routes; multiple presets
are required to explore the trade-off space adequately.

Phase 4 implements this module fully.
"""

from __future__ import annotations

import itertools
from typing import Any

import networkx as nx

from algorithms.astar import astar, heuristic_factory
from algorithms.dijkstra import NoRouteFound


def _path_metrics(
    graph: Any,
    path: list[Any],
) -> tuple[float, float, list[list[float]]]:
    """Calculate distance, travel time, and geometry for a node sequence."""
    total_dist = 0.0
    total_time = 0.0
    geometry: list[list[float]] = []

    is_multi = hasattr(graph, "is_multigraph") and graph.is_multigraph()

    for i in range(len(path) - 1):
        u = path[i]
        v = path[i + 1]

        if is_multi:
            # Pick cheapest non-blocked edge
            edges = [e for e in graph[u][v].values() if not e.get("is_blocked", False)]
            if not edges:
                raise NoRouteFound(f"Edge ({u}, {v}) is blocked")
            edge_data = min(edges, key=lambda e: float(e.get("length_km", 1.0)))
        else:
            edge_data = graph[u][v]
            if edge_data.get("is_blocked", False):
                raise NoRouteFound(f"Edge ({u}, {v}) is blocked")

        dist = float(edge_data.get("length_km", 0.0))
        speed = float(edge_data.get("speed_kmh", 50.0))
        traffic_mult = float(edge_data.get("traffic_multiplier", 1.0))
        free_flow = edge_data.get("free_flow_time_min")
        if free_flow is None:
            time_min = (dist / max(speed, 5.0)) * 60.0 * traffic_mult
        else:
            time_min = float(free_flow) * traffic_mult

        total_dist += dist
        total_time += time_min

        edge_geom = edge_data.get("geometry")
        if edge_geom is not None and hasattr(edge_geom, "coords"):
            # Shapely LineString from OSMnx (coords are (lon, lat) = (x, y))
            coords_latlon = [[float(c[1]), float(c[0])] for c in edge_geom.coords]
            if not geometry:
                geometry.extend(coords_latlon)
            else:
                geometry.extend(coords_latlon[1:])
        elif isinstance(edge_geom, list) and edge_geom:
            if not geometry:
                geometry.extend(edge_geom)
            else:
                geometry.extend(edge_geom[1:])
        else:
            u_node = graph.nodes[u]
            v_node = graph.nodes[v]
            lat_u = u_node.get("lat", u_node.get("y", 0.0))
            lon_u = u_node.get("lon", u_node.get("x", 0.0))
            lat_v = v_node.get("lat", v_node.get("y", 0.0))
            lon_v = v_node.get("lon", v_node.get("x", 0.0))
            pt_u = [float(lat_u), float(lon_u)]
            pt_v = [float(lat_v), float(lon_v)]
            if not geometry:
                geometry.append(pt_u)
            geometry.append(pt_v)

    return round(total_dist, 3), round(total_time, 3), geometry


def generate_candidates(
    graph: Any,
    source: Any,
    destination: Any,
    vehicle: Any,
    weights: dict[str, float] | None = None,
    k: int = 5,
) -> list[dict[str, Any]]:
    """
    Generate a diverse, deduplicated list of candidate routes between source and destination.

    Combines:
      - Shortest distance route (A* distance-only)
      - Fastest time route (A* time-only)
      - Multi-objective route (A* with provided weights)
      - Up to k alternative simple paths
    """
    if source not in graph or destination not in graph:
        raise NoRouteFound(f"Source {source!r} or destination {destination!r} not in graph")

    unique_paths: dict[tuple[Any, ...], str] = {}

    # 1. Distance-optimal route
    try:
        h_dist = heuristic_factory("distance", graph, destination)
        res_dist = astar(graph, source, destination, weight="length_km", heuristic=h_dist)
        unique_paths[tuple(res_dist.path)] = "Shortest Distance"
    except NoRouteFound:
        pass

    # 2. Time-optimal route
    def time_cost(u: Any, v: Any, d: dict) -> float:
        ff = d.get("free_flow_time_min")
        mult = float(d.get("traffic_multiplier", 1.0))
        if ff is not None:
            return float(ff) * mult
        dist = float(d.get("length_km", 1.0))
        speed = float(d.get("speed_kmh", 50.0))
        return (dist / max(speed, 5.0)) * 60.0 * mult

    try:
        h_time = heuristic_factory("time", graph, destination)
        res_time = astar(graph, source, destination, cost_fn=time_cost, heuristic=h_time)
        if tuple(res_time.path) not in unique_paths:
            unique_paths[tuple(res_time.path)] = "Fastest Route"
    except NoRouteFound:
        pass

    # 3. User weights route
    if weights:
        try:
            h_comp = heuristic_factory(
                "composite", graph, destination, vehicle=vehicle, weights=weights
            )

            # Edge composite cost
            def comp_cost(u: Any, v: Any, d: dict) -> float:
                d_km = float(d.get("length_km", 1.0))
                t_m = time_cost(u, v, d)
                return weights.get("distance", 0.25) * (d_km / 30.0) + weights.get("time", 0.25) * (
                    t_m / 45.0
                )

            res_comp = astar(graph, source, destination, cost_fn=comp_cost, heuristic=h_comp)
            if tuple(res_comp.path) not in unique_paths:
                unique_paths[tuple(res_comp.path)] = "Optimized"
        except NoRouteFound:
            pass

    # 4. Alternative paths via shortest_simple_paths
    # Build a view excluding blocked edges
    def edge_filter(u: Any, v: Any) -> bool:
        if hasattr(graph, "is_multigraph") and graph.is_multigraph():
            return any(not e.get("is_blocked", False) for e in graph[u][v].values())
        return not graph[u][v].get("is_blocked", False)

    try:
        # Create subgraph excluding blocked edges
        valid_edges = [(u, v) for u, v in graph.edges() if edge_filter(u, v)]
        subgraph = graph.edge_subgraph(valid_edges)

        simple_gen = nx.shortest_simple_paths(subgraph, source, destination, weight="length_km")
        alt_idx = 1
        for p in itertools.islice(simple_gen, k * 2):
            p_tuple = tuple(p)
            if p_tuple not in unique_paths:
                unique_paths[p_tuple] = f"Alternative {alt_idx}"
                alt_idx += 1
            if len(unique_paths) >= k + 3:
                break
    except (nx.NetworkXNoPath, nx.NodeNotFound, ValueError):
        pass

    if not unique_paths:
        raise NoRouteFound(f"No valid paths found between {source!r} and {destination!r}")

    candidates: list[dict[str, Any]] = []
    for path_tuple, default_label in unique_paths.items():
        path_list = list(path_tuple)
        dist_km, time_min, geom = _path_metrics(graph, path_list)
        candidates.append(
            {
                "path": path_list,
                "route_name": default_label,
                "distance_km": dist_km,
                "travel_time_min": time_min,
                "route_geometry": geom,
            }
        )

    return candidates
