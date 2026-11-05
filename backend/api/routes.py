"""
Routes API — POST /api/routes/optimize, /compare, /replan.
Phase 5 implements optimize and compare. Phase 7 implements replan.
"""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/routes", tags=["Routes"])
