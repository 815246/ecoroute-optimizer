"""
ReplanningAgent — monitors route viability and recommends replanning.

A switch is recommended ONLY IF:
  (a) the current route contains a blocked edge, OR
  (b) the new best route's score is >= REPLAN_THRESHOLD better (default 5 %).

Implements the ReplanStrategy interface with FullRerunAStar as the v1 strategy.
D* Lite is documented as a future extension point.

Phase 7 implements this agent fully.
"""

from __future__ import annotations

from typing import Any


class ReplanStrategy:
    """Abstract interface for replanning strategies."""

    def replan(
        self,
        graph: Any,
        source: Any,
        destination: Any,
        vehicle: Any,
        weights: dict[str, float],
    ) -> list[Any]:
        """Return new candidate routes. Subclasses implement search strategy."""
        raise NotImplementedError("Subclasses must implement")


class FullRerunAStar(ReplanStrategy):
    """Replanning by re-running the full A* candidate pipeline. (v1 strategy)"""

    def replan(
        self,
        graph: Any,
        source: Any,
        destination: Any,
        vehicle: Any,
        weights: dict[str, float],
    ) -> list[Any]:
        """Re-run candidate generation from scratch. (Phase 7)"""
        raise NotImplementedError("Implemented in Phase 7")


class ReplanningAgent:
    """Decides whether to switch routes after a traffic change."""

    def __init__(self, strategy: ReplanStrategy | None = None) -> None:
        """Default strategy is FullRerunAStar."""
        self.strategy = strategy or FullRerunAStar()

    def replan(
        self,
        current_route: Any,
        graph: Any,
        vehicle: Any,
        weights: dict[str, float],
        threshold: float = 0.05,
    ) -> dict[str, Any]:
        """
        Return {switch, reason, old_metrics, new_metrics, replanning_time_ms}.
        (Phase 7)
        """
        raise NotImplementedError("Implemented in Phase 7")
