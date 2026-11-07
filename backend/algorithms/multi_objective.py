"""
Multi-objective scoring and Pareto filtering.

Weighted score: J(R) = w_d*Dn + w_t*Tn + w_f*Fn + w_e*En  (lower is better).

Weight validation: sum must equal 1.0 within 1e-6 tolerance.
Normalization: fixed reference scales by default (see normalization.py).
Pareto: dominance over (distance, time, resource, emissions) — a route is
Pareto-optimal if no other route is strictly better on all four objectives.

Preserve PRESETS as single source of truth for /api/presets.
Phase 4 implements this module fully.
"""

from __future__ import annotations

from typing import Any

PRESETS: dict[str, dict[str, float]] = {
    "fastest": {"distance": 0.05, "time": 0.80, "resource": 0.05, "emissions": 0.10},
    "shortest": {"distance": 0.80, "time": 0.10, "resource": 0.05, "emissions": 0.05},
    "eco": {"distance": 0.10, "time": 0.15, "resource": 0.25, "emissions": 0.50},
    "balanced": {"distance": 0.25, "time": 0.25, "resource": 0.25, "emissions": 0.25},
    # Backwards compatibility aliases
    "eco_first": {"distance": 0.10, "time": 0.15, "resource": 0.25, "emissions": 0.50},
    "time_first": {"distance": 0.15, "time": 0.55, "resource": 0.15, "emissions": 0.15},
}


def validate_weights(
    weights: dict[str, float],
    normalize: bool = False,
) -> dict[str, float]:
    """
    Validate that weights are non-negative and sum to 1.0 +- 1e-6.

    If normalize=True, rescales weights that sum to > 0.
    Raises ValueError if invalid and normalize=False.
    """
    keys = ["distance", "time", "resource", "emissions"]
    clean_w: dict[str, float] = {}

    for k in keys:
        val = weights.get(k)
        if val is None and k == "emissions":
            val = weights.get("emission", 0.0)
        elif val is None:
            val = 0.0
        val = float(val)
        if val < 0.0:
            raise ValueError(f"Weight {k!r} cannot be negative: {val}")
        clean_w[k] = val

    total = sum(clean_w.values())

    if abs(total - 1.0) > 1e-6:
        if normalize and total > 0.0:
            clean_w = {k: v / total for k, v in clean_w.items()}
        else:
            raise ValueError(
                f"Weights must sum to 1.0 ± 1e-6, got sum={total:.6f} for weights {clean_w}"
            )

    return clean_w


def weighted_score(
    normalized_metrics: dict[str, float],
    weights: dict[str, float],
) -> float:
    """
    Compute multi-objective cost J(R) = sum(w_i * N_i).

    Lower is better.
    """
    w_d = float(weights.get("distance", 0.25))
    w_t = float(weights.get("time", 0.25))
    w_r = float(weights.get("resource", 0.25))
    w_e = float(weights.get("emissions", weights.get("emission", 0.25)))

    d_n = float(normalized_metrics.get("distance", 0.0))
    t_n = float(normalized_metrics.get("time", 0.0))
    r_n = float(normalized_metrics.get("resource", 0.0))
    e_n = float(normalized_metrics.get("emissions", 0.0))

    return w_d * d_n + w_t * t_n + w_r * r_n + w_e * e_n


def pareto_filter(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Return the Pareto-optimal subset of candidates.

    Candidate A dominates candidate B iff A is <= B across all 4 objectives
    (distance, time, resource, emissions) and < B in at least one objective.
    A candidate is Pareto-optimal if no other candidate dominates it.
    """
    if not candidates:
        return []

    def get_objectives(c: dict[str, Any]) -> tuple[float, float, float, float]:
        d = float(c.get("distance_km", c.get("distance", 0.0)))
        t = float(c.get("travel_time_min", c.get("time", 0.0)))
        r = float(c.get("resource", c.get("fuel_liters", c.get("energy_kwh", 0.0))))
        e = float(c.get("co2_kg", c.get("emissions_kg", c.get("emissions", 0.0))))
        return (d, t, r, e)

    pareto_set: list[dict[str, Any]] = []

    for i, c1 in enumerate(candidates):
        obj1 = get_objectives(c1)
        dominated = False
        for j, c2 in enumerate(candidates):
            if i == j:
                continue
            obj2 = get_objectives(c2)
            # Check if c2 dominates c1: c2 <= c1 on all, c2 < c1 on at least one
            le = all(o2 <= o1 + 1e-9 for o2, o1 in zip(obj2, obj1, strict=True))
            strictly_less = any(o2 < o1 - 1e-9 for o2, o1 in zip(obj2, obj1, strict=True))
            if le and strictly_less:
                dominated = True
                break
        if not dominated:
            pareto_set.append(c1)

    return pareto_set
