"""
RoadNetworkAgent — builds and manages road network graphs.

Supports two data modes:
  - ``simulated``: demo A-E graph or procedurally generated graphs (grid/geometric).
  - ``real``: OSMnx drivable network downloaded and cached by bounding box.

Phase 2 implements the simulated mode fully.
Phase 6 implements the real OSMnx mode.
"""

from __future__ import annotations

from typing import Any


class RoadNetworkAgent:
    """Builds, caches, and returns NetworkX road network graphs."""

    def create_demo_graph(self) -> Any:
        """Load the A-E demo graph from data/simulated_roads.json. (Phase 2)"""
        raise NotImplementedError("Implemented in Phase 2")

    def generate_graph(
        self,
        n_nodes: int,
        kind: str = "grid",
        density: float = 0.3,
        seed: int = 42,
    ) -> Any:
        """Generate a connected synthetic graph for testing. (Phase 2)"""
        raise NotImplementedError("Implemented in Phase 2")

    def load_osm_graph(self, source: str, destination: str) -> Any:
        """Download/load cached OSMnx drivable network. (Phase 6)"""
        raise NotImplementedError("Implemented in Phase 6")
