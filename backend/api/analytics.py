"""
Analytics API — GET /api/analytics.
Phase 5 implements this router.
"""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/analytics", tags=["Analytics"])
