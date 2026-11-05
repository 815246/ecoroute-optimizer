"""EcoRoute API routers package. Each module registers a FastAPI APIRouter."""

from __future__ import annotations

from api.analytics import router as analytics_router
from api.history import router as history_router
from api.routes import router as routes_router
from api.simulation import router as simulation_router
from api.vehicles import router as vehicles_router

__all__ = [
    "analytics_router",
    "history_router",
    "routes_router",
    "simulation_router",
    "vehicles_router",
]
