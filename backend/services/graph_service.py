"""
GraphService — provides graph instances to agents.

Caches simulated graphs by (n_nodes, kind, seed) and OSM graphs by bbox hash.
Phase 2 (simulated) and Phase 6 (OSM) implement the respective methods.
"""

from __future__ import annotations

from typing import Any

from agents.road_network_agent import RoadNetworkAgent


class GraphService:
    """Graph cache and factory."""

    def __init__(self, road_agent: RoadNetworkAgent | None = None) -> None:
        self.road_agent = road_agent or RoadNetworkAgent()
        self._simulated_cache: dict[tuple[int, str, int], Any] = {}
        self._demo_cache: Any | None = None

    def get_demo(self) -> Any:
        """Return (or load and cache) the 5-node A-E demo graph."""
        if self._demo_cache is None:
            self._demo_cache = self.road_agent.create_demo_graph()
        return self._demo_cache

    def get_simulated(self, n_nodes: int = 5, kind: str = "grid", seed: int = 42) -> Any:
        """
        Return (or build and cache) a simulated graph. (Phase 2)

        Supports kind='demo', kind='grid', or kind='geometric'.
        """
        if kind == "demo":
            return self.get_demo()

        key = (n_nodes, kind, seed)
        if key not in self._simulated_cache:
            self._simulated_cache[key] = self.road_agent.generate_graph(
                n_nodes=n_nodes, kind=kind, seed=seed
            )
        return self._simulated_cache[key]

    def clear_cache(self) -> None:
        """Clear cached graph instances."""
        self._simulated_cache.clear()
        self._demo_cache = None

    def get_osm(self, source: str, destination: str) -> Any:
        """Return (or load from disk cache) an OSMnx graph. (Phase 6)"""
        raise NotImplementedError("Implemented in Phase 6")
