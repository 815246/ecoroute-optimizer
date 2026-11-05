"""
Coordinator — orchestrates the full EcoRoute agent pipeline.

Pipeline:
    RoadNetworkAgent → TrafficAgent → RouteSearchAgent →
    EmissionAgent → OptimizationAgent → ExplainService → response

Each agent appends to ``agent_trace``:
    {agent, action, detail, duration_ms}

The coordinator is the single entry point for the API layer.
Phase 5 implements this fully.
"""

from __future__ import annotations

from typing import Any


class Coordinator:
    """Runs the full route optimisation pipeline and returns a typed response."""

    def optimize(self, request: dict[str, Any]) -> dict[str, Any]:
        """
        Execute the full pipeline and return the optimisation response.
        (Phase 5)
        """
        raise NotImplementedError("Implemented in Phase 5")
