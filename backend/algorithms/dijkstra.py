"""
Custom heap-based Dijkstra implementation.

Returns a SearchResult with path, cost, nodes_explored, and time_ms so that
explored-node counts can be compared against A* in benchmarks.

Supports any edge cost via a callable or attribute name. Blocked edges
(is_blocked=True) are always skipped.

Phase 2 implements this module fully.
"""

from __future__ import annotations

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
    Heap-based Dijkstra. cost_fn(u, v, edge_data) overrides weight attribute.
    Skips edges where edge_data['is_blocked'] is True.
    (Phase 2)
    """
    raise NotImplementedError("Implemented in Phase 2")
