"""
Vehicles API — GET/POST /api/vehicles.
Phase 5 implements this router.
"""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])
