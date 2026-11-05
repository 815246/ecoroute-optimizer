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

from typing import Any


class TrafficAgent:
    """Applies and reverses simulated traffic conditions on a road network graph."""

    TRAFFIC_LABEL: str = "Simulated traffic, not live"

    def apply_time_of_day(self, graph: Any, hour: int) -> None:
        """Apply peak/off-peak multipliers based on the hour of day. (Phase 5/7)"""
        raise NotImplementedError("Implemented in Phase 5/7")

    def apply_incident(
        self,
        graph: Any,
        edge: Any | None = None,
        multiplier: float = 2.0,
        blocked: bool = False,
    ) -> None:
        """Apply a simulated traffic incident to an edge or random edges. (Phase 7)"""
        raise NotImplementedError("Implemented in Phase 7")

    def snapshot(self, graph: Any) -> dict[str, Any]:
        """Capture current traffic state for persistence and rollback. (Phase 7)"""
        raise NotImplementedError("Implemented in Phase 7")

    def restore(self, graph: Any, snapshot: dict[str, Any]) -> None:
        """Restore graph to a previously captured traffic state. (Phase 7)"""
        raise NotImplementedError("Implemented in Phase 7")
