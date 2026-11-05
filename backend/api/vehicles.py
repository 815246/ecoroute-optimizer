"""
Vehicles API — vehicle configuration management.

Phase 5 implements default vehicle retrieval and custom vehicle persistence.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import Vehicle
from services.vehicle_service import VehicleService

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])
vehicle_service = VehicleService()


class VehicleCreate(BaseModel):
    vehicle_type: str = Field(description="'petrol', 'diesel', or 'electric'")
    fuel_type: str | None = Field(default=None)
    fuel_efficiency: float | None = Field(default=None, description="km/L for ICE")
    energy_rate: float | None = Field(default=None, description="kWh/100km for EV")
    battery_capacity: float | None = Field(default=None, description="kWh")
    battery_soc: float | None = Field(
        default=80.0, description="Battery state of charge (percentage)"
    )


@router.get("", summary="List vehicle configurations")
async def list_vehicles(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    """Return default vehicle configurations plus user-saved custom vehicles."""
    defaults = vehicle_service.get_defaults()

    try:
        saved = db.query(Vehicle).all()
        custom = [
            {
                "id": f"custom_{v.id}",
                "type": v.vehicle_type,
                "name": f"Custom {v.vehicle_type.capitalize()} (ID {v.id})",
                "fuel_type": v.fuel_type or v.vehicle_type,
                "fuel_efficiency_kmpl": v.fuel_efficiency,
                "energy_rate_kwh_per_100km": v.energy_rate,
                "battery_capacity_kwh": v.battery_capacity,
                "battery_soc": v.battery_soc,
            }
            for v in saved
        ]
        return defaults + custom
    except Exception:
        return defaults


@router.post("", summary="Save custom vehicle", status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    payload: VehicleCreate,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Persist a new user vehicle profile."""
    v_type = payload.vehicle_type.lower()
    if v_type not in ("petrol", "diesel", "electric"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"vehicle_type must be petrol, diesel, or electric; got {payload.vehicle_type}",
        )

    db_vehicle = Vehicle(
        vehicle_type=v_type,
        fuel_type=payload.fuel_type or v_type,
        fuel_efficiency=payload.fuel_efficiency,
        energy_rate=payload.energy_rate,
        battery_capacity=payload.battery_capacity,
        battery_soc=payload.battery_soc,
    )
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)

    return {
        "status": "created",
        "id": f"custom_{db_vehicle.id}",
        "vehicle_type": db_vehicle.vehicle_type,
    }
