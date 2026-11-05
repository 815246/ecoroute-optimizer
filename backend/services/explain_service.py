"""
ExplainService — template-based route explanation (no LLM).

Compares the recommended route to a named baseline (fastest by default) and
produces human-readable text. Templates cover three cases:
  1. Recommended is better on all objectives.
  2. Recommended is a trade-off (better on some, worse on others).
  3. The baseline is already the best (honest reporting).

Phase 4 implements this service fully.
"""

from __future__ import annotations

from typing import Any


class ExplainService:
    """Generates template-based explanations for route recommendations."""

    def explain(
        self,
        recommended: dict[str, Any],
        baseline: dict[str, Any],
        baseline_name: str = "fastest route",
    ) -> str:
        """
        Return a human-readable explanation string.
        Example: "Route B emits 0.4 kg (12%) less CO2 than the fastest route and adds 3 min."
        (Phase 4)
        """
        raise NotImplementedError("Implemented in Phase 4")
