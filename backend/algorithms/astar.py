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

from collections.abc import Callable
from typing import Any

from algorithms.dijkstra import NoRouteFound, SearchResult

__all__ = ["NoRouteFound", "SearchResult", "astar", "heuristic_factory"]


def heuristic_factory(
    objective: str,
    graph: Any,
    destination: Any,
    vehicle: Any | None = None,
    weights: dict[str, float] | None = None,
) -> Callable[[Any], float]:
    """
    Return an admissible heuristic function h(node) for the given objective.
    (Phase 2)
    """
    raise NotImplementedError("Implemented in Phase 2")


def astar(
    graph: Any,
    source: Any,
    destination: Any,
    cost_fn: Callable[..., float] | None = None,
    weight: str = "length_km",
    heuristic: Callable[[Any], float] | None = None,
) -> SearchResult:
    """
    A* search. heuristic(node) -> estimated remaining cost.
    Falls back to zero heuristic (= Dijkstra) if heuristic is None.
    Skips edges where is_blocked=True.
    (Phase 2)
    """
    raise NotImplementedError("Implemented in Phase 2")
