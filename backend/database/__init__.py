"""EcoRoute database package — SQLAlchemy models, engine, and session management."""

from __future__ import annotations

from database.db import Base, SessionLocal, engine, get_db
from database.models import (
    Journey,
    OptimizationResult,
    Route,
    TrafficSnapshot,
    User,
    Vehicle,
)

__all__ = [
    "Base",
    "Journey",
    "OptimizationResult",
    "Route",
    "SessionLocal",
    "TrafficSnapshot",
    "User",
    "Vehicle",
    "engine",
    "get_db",
]
