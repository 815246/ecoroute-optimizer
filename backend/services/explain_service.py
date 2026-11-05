"""
ExplainService — template-based route explanation (no LLM).

Compares the recommended route to a named baseline (fastest by default) and
produces human-readable text. Templates cover three cases:
  1. Recommended is better on all objectives.
  2. Recommended is a trade-off (better on some, worse on others).
  3. The baseline is already the best (honest reporting).

Phase 4/5 implements this service fully.
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
        Return a human-readable explanation string comparing recommended route to baseline.

        Example:
        "EcoRoute saves 0.8 kg (15.2%) CO2 compared to the fastest route, with a modest 2.5 min travel time addition."
        """
        co2_rec = float(recommended.get("co2_kg", 0.0))
        co2_base = float(baseline.get("co2_kg", 0.0))
        t_rec = float(recommended.get("travel_time_min", 0.0))
        t_base = float(baseline.get("travel_time_min", 0.0))
        d_rec = float(recommended.get("distance_km", 0.0))
        d_base = float(baseline.get("distance_km", 0.0))

        co2_delta = co2_base - co2_rec
        co2_saved_pct = (co2_delta / co2_base * 100.0) if co2_base > 0 else 0.0
        time_delta = t_rec - t_base
        dist_delta = d_rec - d_base

        # Case 3: Baseline is identical or strictly better
        if tuple(recommended.get("path", [])) == tuple(baseline.get("path", [])):
            return (
                f"The {baseline_name} is already optimal under current traffic conditions; "
                f"it achieves the lowest multi-objective cost ({co2_rec:.2f} kg CO2 in {t_rec:.1f} min)."
            )

        # Case 1: Recommended is better or equal on all objectives
        if co2_delta >= 0 and time_delta <= 0 and dist_delta <= 0:
            return (
                f"EcoRoute strictly outperforms the {baseline_name} on all metrics: "
                f"saving {co2_delta:.2f} kg CO2 ({co2_saved_pct:.1f}% reduction) and "
                f"{-dist_delta:.1f} km, while arriving {-time_delta:.1f} min earlier."
            )

        # Case 2: Trade-off (lower emissions vs extra travel time or distance)
        if co2_delta > 0:
            time_phrase = (
                f"an additional {time_delta:+.1f} min of travel time"
                if time_delta > 0
                else f"{-time_delta:.1f} min faster travel time"
            )
            return (
                f"EcoRoute saves {co2_delta:.2f} kg CO2 ({co2_saved_pct:.1f}% reduction) "
                f"compared to the {baseline_name}, in exchange for {time_phrase}."
            )

        # Honest reporting when baseline produces less emissions
        return (
            f"The {baseline_name} produces {-co2_delta:.2f} kg less CO2 than this option. "
            f"EcoRoute prioritised travel time / distance constraints based on active weights."
        )
