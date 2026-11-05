"""
History API — GET /api/journeys/history.
Phase 5 implements this router.
"""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/journeys", tags=["History"])
