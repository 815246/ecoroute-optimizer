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


def normalize_fixed(metrics: dict[str, float], refs: dict[str, float]) -> dict[str, float]:
    """
    Divide each metric by its reference scale.
    metrics: {distance_km, travel_time_min, resource, emissions_kg}
    refs: {distance, time, resource, emissions}
    (Phase 4)
    """
    raise NotImplementedError("Implemented in Phase 4")


def normalize_minmax(candidates: list[Any]) -> list[Any]:
    """
    Min-max normalize metrics across the candidate set.
    Returns candidates with added ``_norm`` fields.
    (Phase 4)
    """
    raise NotImplementedError("Implemented in Phase 4")
