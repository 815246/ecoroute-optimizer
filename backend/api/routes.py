"""
Routes API — route planning, optimization, comparison, and presets.

Phase 5 implements optimize, plan, and get endpoints.
Phase 7 integrates dynamic replan.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from agents.coordinator import Coordinator
from algorithms.multi_objective import PRESETS
from database.db import get_db
from services.route_service import RouteService

router = APIRouter(prefix="/routes", tags=["Routes"])
coordinator = Coordinator()
route_service = RouteService()


class RoutePlanRequest(BaseModel):
    source: str = Field(default="A", description="Starting node ID or address")
    destination: str = Field(default="E", description="Destination node ID or address")
    vehicle: Any = Field(default="petrol_hatchback", description="Vehicle ID string or config dict")
    weights: Any = Field(
        default=None,
        description="Weights dict {distance, time, resource, emissions} or preset name ('balanced')",
    )
    data_mode: str = Field(default="simulated", description="'simulated' or 'real'")
    departure_hour: int | None = Field(
        default=None, ge=0, le=23, description="Departure hour (0-23)"
    )
    k: int = Field(default=5, ge=1, le=15, description="Number of alternative routes to find")
    persist: bool = Field(default=True, description="Whether to persist journey to database")


@router.get("/presets", summary="Get objective weight presets")
async def get_presets() -> dict[str, dict[str, float]]:
    """Return available weight presets for multi-objective optimization."""
    return PRESETS


@router.post("/optimize", summary="Plan and optimize route")
@router.post("/plan", summary="Plan and optimize route (alias)")
async def optimize_route(
    req: RoutePlanRequest,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """
    Run multi-objective route planning pipeline.

    Calculates shortest-distance, fastest-time, and Pareto-optimal routes,
    surfacing honest trade-off baselines and carbon estimates.
    """
    try:
        result = coordinator.optimize(req.model_dump())
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if req.persist and result.get("routes"):
        try:
            journey_id = route_service.save_journey(
                db=db,
                source=req.source,
                destination=req.destination,
                data_mode=req.data_mode,
            )
            route_service.save_routes(
                db=db,
                journey_id=journey_id,
                routes=result["routes"],
                weights=result.get("weights"),
            )
            result["journey_id"] = journey_id
        except Exception:
            # Persistence failure should not break planning response
            pass

    return result


@router.get("/{journey_id}", summary="Get planned journey by ID")
async def get_journey(
    journey_id: int,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve saved journey details, route geometries, and scores."""
    journey = route_service.get_journey(db, journey_id)
    if not journey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Journey {journey_id} not found",
        )
    return journey
