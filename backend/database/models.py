"""
SQLAlchemy ORM models matching the Phase 1 schema specification.

Tables: users, vehicles, journeys, routes, optimization_results, traffic_snapshots.
Phase 5 adds Alembic migrations.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.db import Base


class User(Base):
    """Application user. Guest default user used for v1 (auth is a future extension)."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str | None] = mapped_column(String(100))
    email: Mapped[str | None] = mapped_column(String(150), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    vehicles: Mapped[list[Vehicle]] = relationship("Vehicle", back_populates="user")
    journeys: Mapped[list[Journey]] = relationship("Journey", back_populates="user")


class Vehicle(Base):
    """Vehicle configuration persisted per user."""

    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"))
    vehicle_type: Mapped[str] = mapped_column(String(20), nullable=False)
    fuel_type: Mapped[str | None] = mapped_column(String(20))
    fuel_efficiency: Mapped[float | None] = mapped_column(Float)
    energy_rate: Mapped[float | None] = mapped_column(Float)
    battery_capacity: Mapped[float | None] = mapped_column(Float)
    battery_soc: Mapped[float | None] = mapped_column(Float)

    user: Mapped[User | None] = relationship("User", back_populates="vehicles")
    journeys: Mapped[list[Journey]] = relationship("Journey", back_populates="vehicle")


class Journey(Base):
    """A route-planning session (source, destination, vehicle, data mode)."""

    __tablename__ = "journeys"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"))
    vehicle_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("vehicles.id"))
    source: Mapped[str | None] = mapped_column(String(200))
    destination: Mapped[str | None] = mapped_column(String(200))
    data_mode: Mapped[str | None] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[User | None] = relationship("User", back_populates="journeys")
    vehicle: Mapped[Vehicle | None] = relationship("Vehicle", back_populates="journeys")
    routes: Mapped[list[Route]] = relationship("Route", back_populates="journey")
    traffic_snapshots: Mapped[list[TrafficSnapshot]] = relationship(
        "TrafficSnapshot", back_populates="journey"
    )


class Route(Base):
    """One candidate route within a journey."""

    __tablename__ = "routes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    journey_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("journeys.id"))
    route_name: Mapped[str | None] = mapped_column(String(100))
    distance_km: Mapped[float | None] = mapped_column(Float)
    travel_time_min: Mapped[float | None] = mapped_column(Float)
    fuel_liters: Mapped[float | None] = mapped_column(Float)
    energy_kwh: Mapped[float | None] = mapped_column(Float)
    co2_kg: Mapped[float | None] = mapped_column(Float)
    optimization_score: Mapped[float | None] = mapped_column(Float)
    route_geometry: Mapped[Any | None] = mapped_column(JSON)

    journey: Mapped[Journey | None] = relationship("Journey", back_populates="routes")
    optimization_results: Mapped[list[OptimizationResult]] = relationship(
        "OptimizationResult", back_populates="route"
    )


class OptimizationResult(Base):
    """Optimization metadata for a route (weights, rank, algorithm used)."""

    __tablename__ = "optimization_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    route_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("routes.id"))
    algorithm: Mapped[str | None] = mapped_column(String(50))
    distance_weight: Mapped[float | None] = mapped_column(Float)
    time_weight: Mapped[float | None] = mapped_column(Float)
    resource_weight: Mapped[float | None] = mapped_column(Float)
    emission_weight: Mapped[float | None] = mapped_column(Float)
    route_rank: Mapped[int | None] = mapped_column(Integer)
    is_selected: Mapped[bool] = mapped_column(Boolean, default=False)

    route: Mapped[Route | None] = relationship("Route", back_populates="optimization_results")


class TrafficSnapshot(Base):
    """Serialized traffic state for a journey (for reproducibility)."""

    __tablename__ = "traffic_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    journey_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("journeys.id"))
    multipliers: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    journey: Mapped[Journey | None] = relationship("Journey", back_populates="traffic_snapshots")
