"""
Simulation API — POST /api/simulation/generate, /api/simulation/traffic.
Phase 5 implements generate. Phase 7 implements traffic.
"""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/simulation", tags=["Simulation"])
