"""Unit tests for Phase 8 experiment and benchmark harness."""

from __future__ import annotations

from pathlib import Path

from experiments.run_benchmarks import run_benchmarks


def test_run_benchmarks_quick(tmp_path: Path) -> None:
    """Verify reproducible benchmark suite runs and exports valid metrics."""
    out_csv = tmp_path / "test_results.csv"
    summary = run_benchmarks(seed=123, quick=True, output_csv=out_csv)

    assert summary["total_trials"] >= 10
    assert summary["search_space_pruned_pct"] >= 20.0
    assert summary["avg_nodes_explored_astar"] < summary["avg_nodes_explored_dijkstra"]
    assert out_csv.is_file()
