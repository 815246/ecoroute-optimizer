"""
RouteSearchAgent — coordinates candidate route generation.

Runs A* under multiple weight presets and collects alternatives via
shortest_simple_paths, then deduplicates by edge sequence.

See algorithms/candidates.py for the core logic.
Phase 2 implements Dijkstra and A*. Phase 4 implements candidate generation.
"""

from __future__ import annotations

from typing import Any

from algorithms.candidates import generate_candidates


class RouteSearchAgent:
    """Generates a diverse set of candidate routes for downstream scoring."""

    def find_candidates(
        self,
        graph: Any,
        source: Any,
        destination: Any,
        vehicle: Any,
        weights: dict[str, float] | None = None,
        k: int = 5,
    ) -> list[dict[str, Any]]:
        """Return a list of diverse, deduplicated candidate routes."""
        return generate_candidates(
            graph=graph,
            source=source,
            destination=destination,
            vehicle=vehicle,
            weights=weights,
            k=k,
        )
