"""
History API — retrieve and manage past journey plans.

Supports listing, retrieving details, deleting individual records, and clearing history.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database.db import get_db
from services.route_service import RouteService

router = APIRouter(prefix="/history", tags=["History"])
route_service = RouteService()


@router.get("", summary="Get route planning history")
async def get_history(
    limit: int = 50,
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    """Return list of recently planned journeys."""
    return route_service.get_history(db=db, limit=limit)


@router.get("/{journey_id}", summary="Get past journey details by ID")
async def get_history_journey(
    journey_id: int,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve detailed routes, stats, and metadata for a historical journey."""
    journey = route_service.get_journey(db=db, journey_id=journey_id)
    if not journey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Journey {journey_id} not found",
        )
    return journey


@router.delete("/{journey_id}", summary="Delete a journey from history")
async def delete_history_journey(
    journey_id: int,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Remove a single planned journey from database history."""
    deleted = route_service.delete_journey(db=db, journey_id=journey_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Journey {journey_id} not found",
        )
    return {"status": "success", "message": f"Journey {journey_id} deleted"}


@router.delete("", summary="Clear all journey history")
async def clear_history(
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Delete all past journeys from database history."""
    count = route_service.clear_history(db=db)
    return {
        "status": "success",
        "message": f"Cleared {count} journeys from history",
        "count": count,
    }


@router.get("/{journey_id}", summary="Get past journey details by ID")
async def get_history_journey(
    journey_id: int,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve detailed routes, stats, and metadata for a historical journey."""
    journey = route_service.get_journey(db=db, journey_id=journey_id)
    if not journey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Journey {journey_id} not found",
        )
    return journey


@router.delete("/{journey_id}", summary="Delete a journey from history")
async def delete_history_journey(
    journey_id: int,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Remove a single planned journey from database history."""
    deleted = route_service.delete_journey(db=db, journey_id=journey_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Journey {journey_id} not found",
        )
    return {"status": "success", "message": f"Journey {journey_id} deleted"}


@router.delete("", summary="Clear all journey history")
async def clear_history(
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Delete all past journeys from database history."""
    count = route_service.clear_history(db=db)
    return {"status": "success", "message": f"Cleared {count} journeys from history", "count": count}
