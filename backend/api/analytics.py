"""
Analytics API — aggregated performance and emission savings metrics.

Phase 5 implements journey aggregation and cumulative CO2 savings calculations.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import Journey, Route

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("", summary="Get aggregated routing and emissions analytics")
async def get_analytics(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Return aggregated platform metrics across planned journeys."""
    total_journeys = db.scalar(select(func.count(Journey.id))) or 0
    total_routes = db.scalar(select(func.count(Route.id))) or 0
    total_km = db.scalar(select(func.sum(Route.distance_km))) or 0.0
    total_co2 = db.scalar(select(func.sum(Route.co2_kg))) or 0.0

    return {
        "total_journeys_planned": total_journeys,
        "total_routes_evaluated": total_routes,
        "total_simulated_distance_km": round(float(total_km), 2),
        "total_estimated_emissions_kg": round(float(total_co2), 2),
        "traffic_label": "Simulated traffic, not live",
    }
