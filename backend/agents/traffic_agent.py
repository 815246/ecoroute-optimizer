"""
TrafficAgent — applies simulated traffic conditions to graph edges.

IMPORTANT: All traffic data is SIMULATED. This agent never connects to live
traffic APIs. All outputs must be labeled "Simulated traffic, not live."

Supports:
  - Time-of-day multiplier profiles (morning/evening peaks).
  - Seeded random incident injection.
  - Edge blocking (is_blocked=True).
  - Reversible traffic snapshots for replanning and reproducibility.

Phase 5 implements the basic profile. Phase 7 implements full incident API.
"""

from __future__ import annotations

import random
from typing import Any

from config import settings


class TrafficAgent:
    """Applies and reverses simulated traffic conditions on a road network graph."""

    TRAFFIC_LABEL: str = "Simulated traffic, not live"

    def __init__(self, seed: int | None = None) -> None:
        self.seed = seed if seed is not None else settings.TRAFFIC_SEED
        self.rng = random.Random(self.seed)

    def apply_time_of_day(self, graph: Any, hour: int) -> dict[str, Any]:
        """
        Apply peak/off-peak multipliers based on hour of the day (0-23).

        Peak hours (8-10, 17-20) experience higher congestion on primary/secondary roads.
        Returns a summary dict.
        """
        if not (0 <= hour <= 23):
            raise ValueError(f"Hour must be between 0 and 23, got {hour}")

        if 8 <= hour <= 10:
            base_mult = 1.50
            period = "morning_peak"
        elif 17 <= hour <= 20:
            base_mult = 1.65
            period = "evening_peak"
        elif hour >= 22 or hour <= 5:
            base_mult = 0.95
            period = "night_off_peak"
        else:
            base_mult = 1.15
            period = "midday"

        is_multi = hasattr(graph, "is_multigraph") and graph.is_multigraph()

        modified_count = 0
        if is_multi:
            for _u, _v, _k, data in graph.edges(keys=True, data=True):
                rtype = data.get("road_type", "primary")
                # Higher roads absorb more peak traffic
                adj = 1.1 if rtype in ("primary", "motorway") else 0.95
                mult = round(base_mult * adj, 2)
                data["traffic_multiplier"] = max(1.0, mult)
                modified_count += 1
        else:
            for _u, _v, data in graph.edges(data=True):
                rtype = data.get("road_type", "primary")
                adj = 1.1 if rtype in ("primary", "motorway") else 0.95
                mult = round(base_mult * adj, 2)
                data["traffic_multiplier"] = max(1.0, mult)
                modified_count += 1

        return {
            "traffic_label": self.TRAFFIC_LABEL,
            "hour": hour,
            "period": period,
            "base_multiplier": base_mult,
            "edges_updated": modified_count,
        }

    def apply_incident(
        self,
        graph: Any,
        edge: tuple[Any, Any] | None = None,
        multiplier: float = 2.0,
        blocked: bool = False,
    ) -> dict[str, Any]:
        """Apply a simulated traffic incident to a specific edge or a randomly selected edge."""
        edges = list(graph.edges())
        if not edges:
            raise ValueError("Graph has no edges to apply incident to")

        target_edge = edge if edge is not None else self.rng.choice(edges)
        u, v = target_edge[0], target_edge[1]

        is_multi = hasattr(graph, "is_multigraph") and graph.is_multigraph()
        if is_multi:
            for edata in graph[u][v].values():
                edata["traffic_multiplier"] = multiplier
                edata["is_blocked"] = blocked
        else:
            graph[u][v]["traffic_multiplier"] = multiplier
            graph[u][v]["is_blocked"] = blocked

        return {
            "traffic_label": self.TRAFFIC_LABEL,
            "edge": (u, v),
            "multiplier": multiplier,
            "is_blocked": blocked,
        }

    def snapshot(self, graph: Any) -> dict[str, Any]:
        """Capture current traffic multipliers and blocked status for all edges."""
        state: dict[str, Any] = {}
        is_multi = hasattr(graph, "is_multigraph") and graph.is_multigraph()

        if is_multi:
            for u, v, k, data in graph.edges(keys=True, data=True):
                edge_id = f"{u}->{v}:{k}"
                state[edge_id] = {
                    "traffic_multiplier": data.get("traffic_multiplier", 1.0),
                    "is_blocked": data.get("is_blocked", False),
                }
        else:
            for u, v, data in graph.edges(data=True):
                edge_id = f"{u}->{v}"
                state[edge_id] = {
                    "traffic_multiplier": data.get("traffic_multiplier", 1.0),
                    "is_blocked": data.get("is_blocked", False),
                }

        return {
            "traffic_label": self.TRAFFIC_LABEL,
            "multipliers": state,
        }

    def restore(self, graph: Any, snapshot: dict[str, Any]) -> None:
        """Restore graph edge traffic state from snapshot."""
        state = snapshot.get("multipliers", {})
        is_multi = hasattr(graph, "is_multigraph") and graph.is_multigraph()

        for edge_id, attrs in state.items():
            if "->" not in edge_id:
                continue
            u_part, v_part = edge_id.split("->")
            if is_multi and ":" in v_part:
                v, k_str = v_part.split(":")
                k = int(k_str) if k_str.isdigit() else k_str
                if graph.has_edge(u_part, v, key=k):
                    graph[u_part][v][k]["traffic_multiplier"] = attrs["traffic_multiplier"]
                    graph[u_part][v][k]["is_blocked"] = attrs["is_blocked"]
            else:
                if graph.has_edge(u_part, v_part):
                    graph[u_part][v_part]["traffic_multiplier"] = attrs["traffic_multiplier"]
                    graph[u_part][v_part]["is_blocked"] = attrs["is_blocked"]
