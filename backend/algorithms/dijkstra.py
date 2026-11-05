"""
Custom heap-based Dijkstra implementation.

Returns a SearchResult with path, cost, nodes_explored, and time_ms so that
explored-node counts can be compared against A* in benchmarks.

Supports any edge cost via a callable or attribute name. Blocked edges
(is_blocked=True) are always skipped.

Phase 2 implements this module fully.
"""

from __future__ import annotations

import heapq
import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any


@dataclass
class SearchResult:
    """Result of a graph search algorithm."""

    path: list[Any]
    cost: float
    nodes_explored: int
    time_ms: float


class NoRouteFound(Exception):
    """Raised when no path exists between source and destination."""


def dijkstra(
    graph: Any,
    source: Any,
    destination: Any,
    cost_fn: Callable[..., float] | None = None,
    weight: str = "length_km",
) -> SearchResult:
    """
    Heap-based Dijkstra search.

    cost_fn(u, v, edge_data) overrides the weight attribute.
    Skips edges where edge_data['is_blocked'] is True.

    Parameters
    ----------
    graph : nx.DiGraph | nx.MultiDiGraph
        NetworkX graph representing the road network.
    source : Any
        Starting node ID.
    destination : Any
        Target node ID.
    cost_fn : Callable[[Any, Any, dict], float] | None
        Function to compute edge traversal cost. If None, uses edge_data[weight].
    weight : str
        Edge attribute name to use as cost if cost_fn is None (default 'length_km').

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

    # Priority queue holds tuples of: (distance, insertion_counter, node)
    counter = 0
    pq: list[tuple[float, int, Any]] = [(0.0, counter, source)]
    dist: dict[Any, float] = {source: 0.0}
    came_from: dict[Any, Any] = {}
    visited: set[Any] = set()
    nodes_explored = 0

    is_multi = hasattr(graph, "is_multigraph") and graph.is_multigraph()

    while pq:
        cur_dist, _, u = heapq.heappop(pq)

        if u in visited:
            continue
        visited.add(u)
        nodes_explored += 1

        if u == destination:
            break

        # Collect outgoing edges
        if is_multi:
            # graph[u] -> {v: {key: edge_data}}
            for v, keys_dict in graph[u].items():
                if v in visited:
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

                    new_dist = cur_dist + edge_cost
                    if v not in dist or new_dist < dist[v]:
                        dist[v] = new_dist
                        came_from[v] = u
                        counter += 1
                        heapq.heappush(pq, (new_dist, counter, v))
        else:
            # graph[u] -> {v: edge_data}
            for v, edge_data in graph[u].items():
                if v in visited:
                    continue
                if edge_data.get("is_blocked", False):
                    continue
                if cost_fn is not None:
                    edge_cost = float(cost_fn(u, v, edge_data))
                else:
                    edge_cost = float(edge_data.get(weight, 1.0))

                if edge_cost < 0:
                    raise ValueError(f"Negative edge cost {edge_cost} on edge ({u}, {v})")

                new_dist = cur_dist + edge_cost
                if v not in dist or new_dist < dist[v]:
                    dist[v] = new_dist
                    came_from[v] = u
                    counter += 1
                    heapq.heappush(pq, (new_dist, counter, v))

    if destination not in visited:
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
        cost=round(dist[destination], 6),
        nodes_explored=nodes_explored,
        time_ms=elapsed,
    )
