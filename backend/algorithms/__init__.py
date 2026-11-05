"""
EcoRoute algorithms package.

Provides custom implementations of Dijkstra, A*, multi-objective scoring,
candidate generation, and normalization. All implementations expose a
``nodes_explored`` counter for benchmarking and an admissible heuristic factory.
"""

from __future__ import annotations

from algorithms.astar import astar, heuristic_factory
from algorithms.candidates import generate_candidates
from algorithms.dijkstra import NoRouteFound, SearchResult, dijkstra
from algorithms.multi_objective import PRESETS, pareto_filter, validate_weights, weighted_score
from algorithms.normalization import normalize_fixed, normalize_minmax

__all__ = [
    "PRESETS",
    "NoRouteFound",
    "SearchResult",
    "astar",
    "dijkstra",
    "generate_candidates",
    "heuristic_factory",
    "normalize_fixed",
    "normalize_minmax",
    "pareto_filter",
    "validate_weights",
    "weighted_score",
]
