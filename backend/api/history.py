"""
History API — retrieve past journey plans.

Phase 5 implements journey query history.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.db import get_db
from services.route_service import RouteService

router = APIRouter(prefix="/history", tags=["History"])
route_service = RouteService()


@router.get("", summary="Get route planning history")
async def get_history(
    limit: int = 20,
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    """Return list of recently planned journeys."""
    return route_service.get_history(db=db, limit=limit)
