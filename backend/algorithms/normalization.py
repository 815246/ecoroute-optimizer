"""
Route metric normalization.

Two modes:
  1. ``fixed`` (default): divide by FIXED reference scales from config.
     Values above 1.0 are possible (not clamped). Scores are comparable
     across different requests and graph sizes.
  2. ``within-set``: min-max normalization over the candidate set.
     Labeled as "within-set" everywhere it is used; not suitable for
     comparing scores across different requests.

Reference scales are documented in docs/METHODOLOGY.md.
Phase 4 implements this module fully.
"""

from __future__ import annotations

from typing import Any

from config import settings


def normalize_fixed(
    metrics: dict[str, float],
    refs: dict[str, float] | None = None,
) -> dict[str, float]:
    """
    Divide each metric by its fixed reference scale.

    metrics: {distance_km, travel_time_min, resource, emissions_kg/co2_kg}
    refs: {distance, time, resource, emissions} (optional override)
    """
    ref_d = (refs.get("distance") if refs else None) or settings.DISTANCE_REF_KM
    ref_t = (refs.get("time") if refs else None) or settings.TIME_REF_MIN
    ref_r = (refs.get("resource") if refs else None) or settings.RESOURCE_REF
    ref_e = (refs.get("emissions") if refs else None) or settings.EMISSIONS_REF_KG

    ref_d = max(0.001, float(ref_d))
    ref_t = max(0.001, float(ref_t))
    ref_r = max(0.001, float(ref_r))
    ref_e = max(0.001, float(ref_e))

    dist = float(metrics.get("distance_km", metrics.get("distance", 0.0)))
    time_val = float(metrics.get("travel_time_min", metrics.get("time", 0.0)))
    res = float(metrics.get("resource", metrics.get("fuel_liters", metrics.get("energy_kwh", 0.0))))
    em = float(metrics.get("emissions_kg", metrics.get("co2_kg", metrics.get("emissions", 0.0))))

    return {
        "distance": dist / ref_d,
        "time": time_val / ref_t,
        "resource": res / ref_r,
        "emissions": em / ref_e,
    }


def normalize_minmax(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Min-max normalize metrics across the candidate set.

    Attaches a ``_norm`` dict to each candidate with values in [0.0, 1.0].
    """
    if not candidates:
        return []

    keys = ["distance", "time", "resource", "emissions"]

    def extract(c: dict[str, Any], key: str) -> float:
        if key == "distance":
            return float(c.get("distance_km", c.get("distance", 0.0)))
        if key == "time":
            return float(c.get("travel_time_min", c.get("time", 0.0)))
        if key == "resource":
            return float(c.get("resource", c.get("fuel_liters", c.get("energy_kwh", 0.0))))
        if key == "emissions":
            return float(c.get("co2_kg", c.get("emissions_kg", c.get("emissions", 0.0))))
        return 0.0

    mins: dict[str, float] = {}
    maxs: dict[str, float] = {}

    for k in keys:
        vals = [extract(c, k) for c in candidates]
        mins[k] = min(vals)
        maxs[k] = max(vals)

    res: list[dict[str, Any]] = []
    for c in candidates:
        c_copy = dict(c)
        norm: dict[str, float] = {}
        for k in keys:
            val = extract(c, k)
            span = maxs[k] - mins[k]
            norm[k] = (val - mins[k]) / span if span > 1e-9 else 0.0
        c_copy["_norm"] = norm
        res.append(c_copy)

    return res
