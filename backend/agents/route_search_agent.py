"""
RouteSearchAgent — coordinates candidate route generation.

Runs A* under multiple weight presets and collects alternatives via
shortest_simple_paths, then deduplicates by edge sequence.

See algorithms/candidates.py for the core logic.
Phase 2 implements Dijkstra and A*. Phase 4 implements candidate generation.
"""

from __future__ import annotations

from typing import Any


class RouteSearchAgent:
    """Generates a diverse set of candidate routes for downstream scoring."""

    def find_candidates(
        self,
        graph: Any,
        source: Any,
        destination: Any,
        vehicle: Any,
        weights: dict[str, float],
    ) -> list[Any]:
        """Return a list of CandidateRoute objects. (Phase 4)"""
        raise NotImplementedError("Implemented in Phase 4")
