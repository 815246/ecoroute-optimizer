"""Unit tests for Phase 4 multi-objective optimization algorithms and agent."""

from __future__ import annotations

import pytest

from agents.optimization_agent import OptimizationAgent
from agents.road_network_agent import RoadNetworkAgent
from agents.route_search_agent import RouteSearchAgent
from algorithms.multi_objective import PRESETS, pareto_filter, validate_weights, weighted_score
from algorithms.normalization import normalize_fixed, normalize_minmax


def test_presets_exist() -> None:
    """Verify standard weight presets are defined and sum to 1.0."""
    assert "balanced" in PRESETS
    assert "eco_first" in PRESETS
    assert "time_first" in PRESETS

    for name, w in PRESETS.items():
        assert pytest.approx(sum(w.values()), rel=1e-6) == 1.0, f"Preset {name} does not sum to 1.0"


def test_validate_weights() -> None:
    """Verify weight validation and automatic normalization."""
    # Valid
    valid_w = {"distance": 0.4, "time": 0.3, "resource": 0.2, "emissions": 0.1}
    assert validate_weights(valid_w) == valid_w

    # Invalid sum without normalize raises
    with pytest.raises(ValueError, match="must sum to 1.0"):
        validate_weights({"distance": 0.5, "time": 0.2, "resource": 0.1, "emissions": 0.1})

    # Invalid sum with normalize=True rescales
    rescaled = validate_weights(
        {"distance": 2.0, "time": 2.0, "resource": 0.0, "emissions": 0.0},
        normalize=True,
    )
    assert pytest.approx(rescaled["distance"], rel=1e-6) == 0.5
    assert pytest.approx(rescaled["time"], rel=1e-6) == 0.5

    # Negative weight raises
    with pytest.raises(ValueError, match="cannot be negative"):
        validate_weights({"distance": -0.1, "time": 0.5, "resource": 0.3, "emissions": 0.3})


def test_weighted_score() -> None:
    """Verify J(R) formula calculation."""
    norm = {"distance": 0.5, "time": 1.0, "resource": 0.5, "emissions": 0.2}
    w = {"distance": 0.25, "time": 0.25, "resource": 0.25, "emissions": 0.25}
    score = weighted_score(norm, w)
    expected = 0.25 * (0.5 + 1.0 + 0.5 + 0.2)
    assert pytest.approx(score, rel=1e-6) == expected


def test_pareto_filter() -> None:
    """Verify Pareto dominance filtering."""
    # Candidate A dominates C across all objectives
    cand_a = {"name": "A", "distance": 10.0, "time": 15.0, "resource": 1.0, "emissions": 2.0}
    # Candidate B has shorter distance but longer time (trade-off, non-dominated)
    cand_b = {"name": "B", "distance": 8.0, "time": 20.0, "resource": 0.9, "emissions": 1.8}
    # Candidate C is worse than A on distance and time, equal on others -> strictly dominated
    cand_c = {"name": "C", "distance": 12.0, "time": 18.0, "resource": 1.0, "emissions": 2.0}

    filtered = pareto_filter([cand_a, cand_b, cand_c])
    names = [c["name"] for c in filtered]

    assert "A" in names
    assert "B" in names
    assert "C" not in names


def test_normalize_fixed() -> None:
    """Verify fixed reference scale normalization."""
    metrics = {
        "distance_km": 15.0,
        "travel_time_min": 45.0,
        "resource": 3.0,
        "co2_kg": 7.0,
    }
    norm = normalize_fixed(metrics)
    assert pytest.approx(norm["distance"], rel=1e-3) == 0.5  # 15 / 30
    assert pytest.approx(norm["time"], rel=1e-3) == 1.0  # 45 / 45
    assert pytest.approx(norm["resource"], rel=1e-3) == 1.0  # 3 / 3
    assert pytest.approx(norm["emissions"], rel=1e-3) == 1.0  # 7 / 7


def test_normalize_minmax() -> None:
    """Verify within-set min-max normalization."""
    candidates = [
        {"distance_km": 10.0, "travel_time_min": 10.0, "resource": 1.0, "co2_kg": 2.0},
        {"distance_km": 20.0, "travel_time_min": 30.0, "resource": 2.0, "co2_kg": 4.0},
    ]
    norm_cands = normalize_minmax(candidates)
    c1_norm = norm_cands[0]["_norm"]
    c2_norm = norm_cands[1]["_norm"]

    assert c1_norm["distance"] == 0.0
    assert c2_norm["distance"] == 1.0
    assert c1_norm["time"] == 0.0
    assert c2_norm["time"] == 1.0


def test_candidate_generation_and_optimization() -> None:
    """End-to-end test of route search and multi-objective ranking."""
    g = RoadNetworkAgent().create_demo_graph()
    vehicle = {"type": "petrol", "fuel_efficiency_kmpl": 20.0, "load_factor": 1.0}
    weights = PRESETS["balanced"]

    search_agent = RouteSearchAgent()
    candidates = search_agent.find_candidates(
        graph=g,
        source="A",
        destination="E",
        vehicle=vehicle,
        weights=weights,
        k=3,
    )

    assert len(candidates) >= 2
    for c in candidates:
        assert "path" in c
        assert "distance_km" in c
        assert "travel_time_min" in c
        assert len(c["route_geometry"]) >= 2

    # Optimize and rank
    opt_agent = OptimizationAgent()
    ranked = opt_agent.rank_routes(
        candidates=candidates,
        weights=weights,
        vehicle=vehicle,
        mode="fixed",
    )

    assert len(ranked) == len(candidates)
    # Ranked in ascending score order
    assert ranked[0]["route_rank"] == 1
    assert ranked[0]["optimization_score"] <= ranked[-1]["optimization_score"]

    # Check baseline comparisons
    winner = ranked[0]
    assert "tradeoff_vs_fastest" in winner
    assert "tradeoff_vs_shortest" in winner
    assert "is_pareto" in winner
    assert len(winner["labels"]) >= 1
