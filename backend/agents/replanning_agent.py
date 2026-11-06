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

import time
from typing import Any

from agents.emission_agent import EmissionAgent
from agents.optimization_agent import OptimizationAgent
from agents.route_search_agent import RouteSearchAgent
from algorithms.candidates import _path_metrics
from algorithms.multi_objective import weighted_score
from algorithms.normalization import normalize_fixed
from config import settings


class ReplanStrategy:
    """Abstract interface for replanning strategies."""

    def replan(
        self,
        graph: Any,
        source: Any,
        destination: Any,
        vehicle: Any,
        weights: dict[str, float],
    ) -> list[dict[str, Any]]:
        """Return new ranked candidate routes. Subclasses implement search strategy."""
        raise NotImplementedError("Subclasses must implement")


class FullRerunAStar(ReplanStrategy):
    """Replanning by re-running the full A* candidate and optimization pipeline."""

    def __init__(self) -> None:
        self.search_agent = RouteSearchAgent()
        self.opt_agent = OptimizationAgent()

    def replan(
        self,
        graph: Any,
        source: Any,
        destination: Any,
        vehicle: Any,
        weights: dict[str, float],
    ) -> list[dict[str, Any]]:
        """Re-run candidate generation and multi-objective ranking from scratch."""
        candidates = self.search_agent.find_candidates(
            graph=graph,
            source=source,
            destination=destination,
            vehicle=vehicle,
            weights=weights,
            k=settings.K_ALTERNATIVES,
        )
        return self.opt_agent.rank_routes(
            candidates=candidates,
            weights=weights,
            vehicle=vehicle,
            mode="fixed",
        )


class ReplanningAgent:
    """Decides whether to switch routes after a traffic or network condition change."""

    def __init__(
        self,
        strategy: ReplanStrategy | None = None,
        emission_agent: EmissionAgent | None = None,
    ) -> None:
        self.strategy = strategy or FullRerunAStar()
        self.emission_agent = emission_agent or EmissionAgent()

    def _is_path_blocked(self, graph: Any, path: list[Any]) -> bool:
        """Check if any edge along the given path is currently blocked."""
        is_multi = hasattr(graph, "is_multigraph") and graph.is_multigraph()
        for i in range(len(path) - 1):
            u, v = path[i], path[i + 1]
            if not graph.has_edge(u, v):
                return True
            if is_multi:
                if all(e.get("is_blocked", False) for e in graph[u][v].values()):
                    return True
            else:
                if graph[u][v].get("is_blocked", False):
                    return True
        return False

    def replan(
        self,
        current_route: dict[str, Any],
        graph: Any,
        vehicle: Any,
        weights: dict[str, float],
        threshold: float | None = None,
    ) -> dict[str, Any]:
        """
        Evaluate current route against newly generated alternatives under current traffic.

        Returns {switch, reason, old_route, new_route, score_improvement_pct, replanning_time_ms}.
        """
        start_t = time.perf_counter()
        th = threshold if threshold is not None else settings.REPLAN_THRESHOLD

        path = list(current_route.get("path", []))
        if not path or len(path) < 2:
            raise ValueError("current_route must contain a path with at least 2 nodes")

        source = path[0]
        destination = path[-1]

        # 1. Check if current route is blocked
        path_blocked = self._is_path_blocked(graph, path)

        # 2. Recompute current route metrics under new traffic
        try:
            d_km, t_min, _, _dirs = _path_metrics(graph, path)
            em_dict = self.emission_agent.calculate(d_km, vehicle)
            updated_old = dict(current_route)
            updated_old.update(
                {
                    "distance_km": d_km,
                    "travel_time_min": t_min,
                    "fuel_liters": em_dict["fuel_liters"],
                    "energy_kwh": em_dict["energy_kwh"],
                    "co2_kg": em_dict["co2_kg"],
                }
            )
            updated_old["_norm"] = normalize_fixed(updated_old)
            old_score = weighted_score(updated_old["_norm"], weights)
            updated_old["optimization_score"] = round(old_score, 4)
        except Exception:
            path_blocked = True
            old_score = float("inf")
            updated_old = dict(current_route)
            updated_old["optimization_score"] = float("inf")

        # 3. Generate new candidate routes under current graph conditions
        new_routes = self.strategy.replan(graph, source, destination, vehicle, weights)
        best_new = new_routes[0]
        new_score = float(best_new["optimization_score"])

        # 4. Decision logic
        if path_blocked:
            switch = True
            reason = "Current route contains an active road closure or incident"
            improvement_pct = 100.0
        else:
            improvement = (old_score - new_score) / old_score if old_score > 1e-9 else 0.0
            improvement_pct = round(improvement * 100.0, 2)

            if improvement >= th:
                switch = True
                reason = (
                    f"New route achieves {improvement_pct:.1f}% score improvement "
                    f"(exceeds {th * 100:.1f}% threshold)"
                )
            else:
                switch = False
                reason = (
                    f"Current route remains viable; score improvement of {improvement_pct:.1f}% "
                    f"is below the {th * 100:.1f}% threshold required to divert"
                )

        elapsed_ms = round((time.perf_counter() - start_t) * 1000.0, 2)

        return {
            "switch": switch,
            "reason": reason,
            "old_route": updated_old,
            "new_route": best_new,
            "score_improvement_pct": improvement_pct,
            "replanning_time_ms": elapsed_ms,
            "alternatives_count": len(new_routes),
        }
