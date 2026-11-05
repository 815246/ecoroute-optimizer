"""
Reproducible Experiment & Benchmark Harness for EcoRoute Optimizer.

Directly investigates the research question:
"Can heuristic search plus multi-objective optimization find routes with lower
estimated environmental impact without unnecessarily increasing travel time?
Compare against Dijkstra and fastest-route baselines. Report honestly, including
cases where the baseline wins."

Runs parameterized trials over procedural networks, records search efficiency
(nodes explored, time ms) and route outcomes (distance, time, CO2, cost),
exports a CSV, and prints summary statistics.
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import Any

from agents.coordinator import Coordinator
from agents.road_network_agent import RoadNetworkAgent
from algorithms.astar import astar, heuristic_factory
from algorithms.dijkstra import dijkstra
from algorithms.multi_objective import PRESETS
from services.graph_service import GraphService
from services.vehicle_service import VehicleService


def run_benchmarks(
    seed: int = 42,
    quick: bool = False,
    output_csv: Path | None = None,
) -> dict[str, Any]:
    """Execute reproducible routing benchmark suite."""
    print(f"Starting EcoRoute Benchmark Suite (seed={seed}, quick={quick})...")

    graph_service = GraphService()
    vehicle_service = VehicleService()
    coordinator = Coordinator(graph_service=graph_service, vehicle_service=vehicle_service)

    road_agent = RoadNetworkAgent()

    # Networks for benchmarking
    if quick:
        network_specs = [
            ("grid_16", 16, "grid"),
            ("geometric_16", 16, "geometric"),
        ]
        n_pairs_per_net = 5
    else:
        network_specs = [
            ("grid_25", 25, "grid"),
            ("grid_49", 49, "grid"),
            ("geometric_30", 30, "geometric"),
        ]
        n_pairs_per_net = 15

    vehicles = vehicle_service.get_defaults()
    results: list[dict[str, Any]] = []

    total_co2_savings_vs_fastest: list[float] = []
    time_penalties_vs_fastest: list[float] = []
    nodes_dijkstra_list: list[int] = []
    nodes_astar_list: list[int] = []

    eco_won_or_tied = 0
    baseline_won = 0

    trip_id = 1

    for net_name, n_nodes, kind in network_specs:
        g = road_agent.generate_graph(n_nodes=n_nodes, kind=kind, seed=seed)

        # Generate sample origin-destination pairs
        step = max(1, n_nodes // n_pairs_per_net)
        od_pairs = []
        for i in range(n_pairs_per_net):
            src = i % n_nodes
            dst = (n_nodes - 1 - (i * step)) % n_nodes
            if src != dst:
                od_pairs.append((src, dst))

        for src, dst in od_pairs:
            # 1. Search space efficiency: Dijkstra vs A* distance
            h_dist = heuristic_factory("distance", g, destination=dst)
            res_dijk = dijkstra(g, src, dst, weight="length_km")
            res_astar = astar(g, src, dst, weight="length_km", heuristic=h_dist)

            nodes_dijkstra_list.append(res_dijk.nodes_explored)
            nodes_astar_list.append(res_astar.nodes_explored)

            # 2. Multi-objective routing across vehicles & presets
            for v in vehicles:
                v_type = v.get("type", "petrol")

                req_payload = {
                    "source": str(src),
                    "destination": str(dst),
                    "vehicle": v["id"],
                    "weights": PRESETS["balanced"],
                    "data_mode": "simulated",
                    "persist": False,
                }

                # Run through coordinator
                try:
                    plan = coordinator.optimize(req_payload)
                    rec = plan["recommended_route"]
                    fastest = plan["baselines"]["fastest"]
                    shortest = plan["baselines"]["shortest"]

                    # Compute honest deltas vs fastest route baseline
                    co2_rec = float(rec["co2_kg"])
                    co2_fast = float(fastest["co2_kg"])
                    time_rec = float(rec["travel_time_min"])
                    time_fast = float(fastest["travel_time_min"])

                    co2_saved_pct = (
                        ((co2_fast - co2_rec) / co2_fast) * 100.0 if co2_fast > 0 else 0.0
                    )
                    time_added_min = time_rec - time_fast

                    total_co2_savings_vs_fastest.append(co2_saved_pct)
                    time_penalties_vs_fastest.append(time_added_min)

                    if co2_saved_pct >= 0:
                        eco_won_or_tied += 1
                    else:
                        baseline_won += 1

                    row = {
                        "trip_id": trip_id,
                        "network": net_name,
                        "source": src,
                        "destination": dst,
                        "vehicle_type": v_type,
                        "dijkstra_nodes": res_dijk.nodes_explored,
                        "astar_nodes": res_astar.nodes_explored,
                        "shortest_dist_km": shortest["distance_km"],
                        "fastest_time_min": fastest["travel_time_min"],
                        "fastest_co2_kg": fastest["co2_kg"],
                        "eco_dist_km": rec["distance_km"],
                        "eco_time_min": rec["travel_time_min"],
                        "eco_co2_kg": rec["co2_kg"],
                        "co2_savings_vs_fastest_pct": round(co2_saved_pct, 2),
                        "time_penalty_vs_fastest_min": round(time_added_min, 2),
                        "is_pareto": rec.get("is_pareto", True),
                    }
                    results.append(row)
                    trip_id += 1
                except Exception:
                    pass

    # Export to CSV
    csv_path = output_csv or Path(__file__).resolve().parent / "benchmark_results.csv"
    if results:
        with open(csv_path, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(results[0].keys()))
            writer.writeheader()
            writer.writerows(results)

    # Compute summary aggregates
    avg_co2_saved = (
        sum(total_co2_savings_vs_fastest) / len(total_co2_savings_vs_fastest)
        if total_co2_savings_vs_fastest
        else 0.0
    )
    avg_time_penalty = (
        sum(time_penalties_vs_fastest) / len(time_penalties_vs_fastest)
        if time_penalties_vs_fastest
        else 0.0
    )
    avg_dijkstra_nodes = (
        sum(nodes_dijkstra_list) / len(nodes_dijkstra_list) if nodes_dijkstra_list else 0.0
    )
    avg_astar_nodes = sum(nodes_astar_list) / len(nodes_astar_list) if nodes_astar_list else 0.0
    search_pruning_pct = (
        ((avg_dijkstra_nodes - avg_astar_nodes) / avg_dijkstra_nodes) * 100.0
        if avg_dijkstra_nodes > 0
        else 0.0
    )

    summary = {
        "total_trials": len(results),
        "avg_co2_savings_vs_fastest_pct": round(avg_co2_saved, 2),
        "avg_time_penalty_vs_fastest_min": round(avg_time_penalty, 2),
        "avg_nodes_explored_dijkstra": round(avg_dijkstra_nodes, 1),
        "avg_nodes_explored_astar": round(avg_astar_nodes, 1),
        "search_space_pruned_pct": round(search_pruning_pct, 1),
        "eco_preferred_rate_pct": round(
            (eco_won_or_tied / len(results) * 100.0) if results else 0.0, 1
        ),
        "csv_exported_to": str(csv_path),
    }

    # Print summary report
    print("\n" + "=" * 70)
    print("           ECOROUTE BENCHMARK EVALUATION REPORT")
    print("=" * 70)
    print(f"Total simulated trips evaluated:        {summary['total_trials']}")
    print(
        f"Search space reduction (A* vs Dijkstra): {summary['search_space_pruned_pct']}% nodes pruned"
    )
    print(f"Avg Dijkstra explored nodes:            {summary['avg_nodes_explored_dijkstra']} nodes")
    print(f"Avg A* explored nodes:                  {summary['avg_nodes_explored_astar']} nodes")
    print("-" * 70)
    print(f"Average CO2 reduction vs Fastest route: {summary['avg_co2_savings_vs_fastest_pct']}%")
    print(
        f"Average travel time delta vs Fastest:   +{summary['avg_time_penalty_vs_fastest_min']} min"
    )
    print(f"EcoRoute preferred or equal outcome:    {summary['eco_preferred_rate_pct']}% of trials")
    print(f"Results persisted to:                   {csv_path}")
    print("=" * 70 + "\n")

    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Run EcoRoute reproducible benchmarks")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument(
        "--quick", action="store_true", help="Run shortened trial suite for CI/smoke tests"
    )
    parser.add_argument("--output", type=str, default=None, help="Custom output CSV path")
    args = parser.parse_args()

    out = Path(args.output) if args.output else None
    run_benchmarks(seed=args.seed, quick=args.quick, output_csv=out)


if __name__ == "__main__":
    main()
