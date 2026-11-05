"""
GraphService — provides graph instances to agents.

Caches simulated graphs by (n_nodes, kind, seed) and OSM graphs by bbox hash.
Phase 2 (simulated) and Phase 6 (OSM) implement the respective methods.
"""

from __future__ import annotations

from typing import Any


class GraphService:
    """Graph cache and factory."""

    def get_simulated(self, n_nodes: int, kind: str = "grid", seed: int = 42) -> Any:
        """Return (or build and cache) a simulated graph. (Phase 2)"""
        raise NotImplementedError("Implemented in Phase 2")

    def get_osm(self, source: str, destination: str) -> Any:
        """Return (or load from disk cache) an OSMnx graph. (Phase 6)"""
        raise NotImplementedError("Implemented in Phase 6")
