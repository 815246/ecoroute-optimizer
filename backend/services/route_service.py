"""
RouteService — persists journey and route records to the database.

Phase 5 implements this service fully.
"""

from __future__ import annotations

from typing import Any


class RouteService:
    """Database persistence for journeys and routes."""

    def save_journey(self, request: dict[str, Any], user_id: int) -> int:
        """Create a journey record and return its ID. (Phase 5)"""
        raise NotImplementedError("Implemented in Phase 5")

    def save_routes(self, journey_id: int, routes: list[dict[str, Any]]) -> None:
        """Persist optimised routes for a journey. (Phase 5)"""
        raise NotImplementedError("Implemented in Phase 5")

    def get_history(self, user_id: int, limit: int = 20) -> list[dict[str, Any]]:
        """Return recent journeys for a user. (Phase 5)"""
        raise NotImplementedError("Implemented in Phase 5")
