"""
RouteService — persists journey and route records to the database.

Phase 5 implements this service fully.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from database.models import Journey, OptimizationResult, Route


class RouteService:
    """Database persistence and retrieval for journeys and routes."""

    def save_journey(
        self,
        db: Session,
        source: str,
        destination: str,
        data_mode: str = "simulated",
        user_id: int | None = None,
        vehicle_id: int | None = None,
    ) -> int:
        """Create a journey record and return its ID."""
        journey = Journey(
            user_id=user_id,
            vehicle_id=vehicle_id,
            source=source,
            destination=destination,
            data_mode=data_mode,
        )
        db.add(journey)
        db.commit()
        db.refresh(journey)
        return int(journey.id)

    def save_routes(
        self,
        db: Session,
        journey_id: int,
        routes: list[dict[str, Any]],
        weights: dict[str, float] | None = None,
    ) -> None:
        """Persist ranked routes and optimization metadata for a journey."""
        w = weights or {"distance": 0.25, "time": 0.25, "resource": 0.25, "emissions": 0.25}

        for r_data in routes:
            route = Route(
                journey_id=journey_id,
                route_name=r_data.get("primary_label") or r_data.get("route_name", "Route"),
                distance_km=float(r_data.get("distance_km", 0.0)),
                travel_time_min=float(r_data.get("travel_time_min", 0.0)),
                fuel_liters=float(r_data.get("fuel_liters", 0.0)),
                energy_kwh=float(r_data.get("energy_kwh", 0.0)),
                co2_kg=float(r_data.get("co2_kg", 0.0)),
                optimization_score=float(r_data.get("optimization_score", 0.0)),
                route_geometry=r_data.get("route_geometry"),
            )
            db.add(route)
            db.flush()

            opt_res = OptimizationResult(
                route_id=route.id,
                algorithm="A*-MultiObjective",
                distance_weight=w.get("distance", 0.25),
                time_weight=w.get("time", 0.25),
                resource_weight=w.get("resource", 0.25),
                emission_weight=w.get("emissions", w.get("emission", 0.25)),
                route_rank=int(r_data.get("route_rank", 1)),
                is_selected=bool(r_data.get("route_rank") == 1),
            )
            db.add(opt_res)

        db.commit()

    def get_journey(self, db: Session, journey_id: int) -> dict[str, Any] | None:
        """Retrieve journey details and associated routes."""
        stmt = select(Journey).where(Journey.id == journey_id)
        journey = db.execute(stmt).scalar_one_or_none()
        if not journey:
            return None

        route_stmt = select(Route).where(Route.journey_id == journey_id)
        routes = db.execute(route_stmt).scalars().all()

        return {
            "journey_id": journey.id,
            "source": journey.source,
            "destination": journey.destination,
            "data_mode": journey.data_mode,
            "created_at": journey.created_at.isoformat() if journey.created_at else None,
            "routes": [
                {
                    "route_id": r.id,
                    "name": r.route_name,
                    "distance_km": r.distance_km,
                    "travel_time_min": r.travel_time_min,
                    "fuel_liters": r.fuel_liters,
                    "energy_kwh": r.energy_kwh,
                    "co2_kg": r.co2_kg,
                    "optimization_score": r.optimization_score,
                    "route_geometry": r.route_geometry,
                }
                for r in routes
            ],
        }

    def get_history(
        self,
        db: Session,
        user_id: int | None = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """Return list of recent journeys."""
        stmt = select(Journey).order_by(desc(Journey.created_at)).limit(limit)
        if user_id is not None:
            stmt = stmt.where(Journey.user_id == user_id)

        journeys = db.execute(stmt).scalars().all()
        return [
            {
                "journey_id": j.id,
                "source": j.source,
                "destination": j.destination,
                "data_mode": j.data_mode,
                "created_at": j.created_at.isoformat() if j.created_at else None,
            }
            for j in journeys
        ]
