"""
Simulation API — dynamic simulated traffic and incident controls.

Phase 5/7 implements incident simulation and time-of-day traffic controls.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from agents.traffic_agent import TrafficAgent
from services.graph_service import GraphService

router = APIRouter(prefix="/simulation", tags=["Simulation"])
traffic_agent = TrafficAgent()
graph_service = GraphService()


class TrafficUpdateRequest(BaseModel):
    hour: int | None = Field(default=None, ge=0, le=23, description="Departure hour (0-23)")
    blocked_edge: tuple[str, str] | None = Field(
        default=None, description="Edge to block, e.g. ['A', 'D']"
    )
    incident_multiplier: float = Field(
        default=2.0, ge=1.0, le=10.0, description="Congestion multiplier"
    )


@router.post("/traffic", summary="Apply simulated traffic conditions")
async def apply_traffic(req: TrafficUpdateRequest) -> dict[str, Any]:
    """
    Apply simulated congestion or road closures to the demo network.

    Outputs are explicitly labeled as simulated traffic.
    """
    demo_g = graph_service.get_demo()

    results: dict[str, Any] = {"traffic_label": TrafficAgent.TRAFFIC_LABEL}

    if req.hour is not None:
        tod_res = traffic_agent.apply_time_of_day(demo_g, req.hour)
        results["time_of_day"] = tod_res

    if req.blocked_edge:
        inc_res = traffic_agent.apply_incident(
            graph=demo_g,
            edge=req.blocked_edge,
            multiplier=req.incident_multiplier,
            blocked=True,
        )
        results["incident"] = inc_res

    return results
