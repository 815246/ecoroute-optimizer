"""
OptimizationAgent — scores, ranks, and selects routes via multi-objective optimization.

Scoring: J(R) = w_d*Dn + w_t*Tn + w_f*Fn + w_e*En  (lower is better).
Normalization uses fixed reference scales from config (not min-max over candidates)
so scores are comparable across requests. A "within-set" min-max mode is also available.

Returns the full Pareto front with labels (Shortest, Fastest, Lowest-emissions,
Recommended) plus explicit baseline trade-off comparisons against fastest and shortest routes.

Phase 4 implements this agent fully.
"""

from __future__ import annotations

from typing import Any

from agents.emission_agent import EmissionAgent
from algorithms.multi_objective import pareto_filter, validate_weights, weighted_score
from algorithms.normalization import normalize_fixed, normalize_minmax


class OptimizationAgent:
    """Ranks candidate routes and identifies the Pareto front."""

    def __init__(self, emission_agent: EmissionAgent | None = None) -> None:
        self.emission_agent = emission_agent or EmissionAgent()

    def rank_routes(
        self,
        candidates: list[dict[str, Any]],
        weights: dict[str, float],
        vehicle: Any,
        mode: str = "fixed",
    ) -> list[dict[str, Any]]:
        """
        Score, rank, and label candidate routes.

        Attaches optimization_score, route_rank, is_pareto, label,
        and honest trade-off comparisons against fastest and shortest baselines.
        """
        if not candidates:
            return []

        clean_weights = validate_weights(weights, normalize=True)

        enriched: list[dict[str, Any]] = []
        for c in candidates:
            route = dict(c)
            dist_km = float(route.get("distance_km", 0.0))
            time_min = float(route.get("travel_time_min", 0.0))
            avg_speed = (dist_km / (time_min / 60.0)) if time_min > 0 else None

            # Calculate emissions if not already present
            if "co2_kg" not in route:
                em_res = self.emission_agent.calculate(
                    distance_km=dist_km,
                    vehicle=vehicle,
                    avg_speed_kmh=avg_speed,
                )
                route.update(em_res)

            enriched.append(route)

        # Normalize metrics
        if mode == "within-set":
            enriched = normalize_minmax(enriched)
        else:
            for route in enriched:
                route["_norm"] = normalize_fixed(route)

        # Calculate multi-objective score J(R)
        for route in enriched:
            score = weighted_score(route["_norm"], clean_weights)
            route["optimization_score"] = round(score, 4)

        # Identify Pareto-optimal subset
        pareto_candidates = pareto_filter(enriched)
        pareto_keys = {tuple(p["path"]) for p in pareto_candidates}
        for route in enriched:
            route["is_pareto"] = tuple(route["path"]) in pareto_keys

        # Sort by score ascending (lower score is better)
        enriched.sort(key=lambda r: float(r["optimization_score"]))

        # Assign ranks
        for rank_idx, route in enumerate(enriched, start=1):
            route["route_rank"] = rank_idx

        # Baselines
        shortest_baseline = min(enriched, key=lambda r: float(r["distance_km"]))
        fastest_baseline = min(enriched, key=lambda r: float(r["travel_time_min"]))
        lowest_em_baseline = min(enriched, key=lambda r: float(r["co2_kg"]))

        # Assign labels and baseline trade-offs
        for route in enriched:
            labels: list[str] = []
            is_best_score = route["route_rank"] == 1
            if is_best_score:
                labels.append("Recommended (EcoRoute)")
            if route is fastest_baseline:
                labels.append("Fastest Route")
            if route is shortest_baseline:
                labels.append("Shortest Distance")
            if route is lowest_em_baseline and "Recommended (EcoRoute)" not in labels:
                labels.append("Lowest Emissions")

            route["labels"] = labels
            route["primary_label"] = labels[0] if labels else "Alternative"

            # Honest trade-offs vs fastest route
            t_fastest = float(fastest_baseline["travel_time_min"])
            e_fastest = float(fastest_baseline["co2_kg"])
            time_diff = float(route["travel_time_min"]) - t_fastest
            co2_saved_pct = (
                round(((e_fastest - float(route["co2_kg"])) / e_fastest) * 100.0, 1)
                if e_fastest > 0
                else 0.0
            )

            route["tradeoff_vs_fastest"] = {
                "time_delta_min": round(time_diff, 2),
                "co2_savings_pct": co2_saved_pct,
                "summary": (
                    f"Saves {co2_saved_pct}% CO2 with {time_diff:+.1f} min travel time"
                    if co2_saved_pct > 0
                    else f"Increases CO2 by {-co2_saved_pct}% with {time_diff:+.1f} min travel time"
                ),
            }

            # Honest trade-offs vs shortest route
            d_shortest = float(shortest_baseline["distance_km"])
            e_shortest = float(shortest_baseline["co2_kg"])
            dist_diff = float(route["distance_km"]) - d_shortest
            co2_vs_shortest_pct = (
                round(((e_shortest - float(route["co2_kg"])) / e_shortest) * 100.0, 1)
                if e_shortest > 0
                else 0.0
            )

            route["tradeoff_vs_shortest"] = {
                "distance_delta_km": round(dist_diff, 2),
                "co2_savings_pct": co2_vs_shortest_pct,
            }

        return enriched
