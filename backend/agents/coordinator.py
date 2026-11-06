"""
Coordinator — orchestrates the full EcoRoute agent pipeline.

Pipeline:
    RoadNetworkAgent → TrafficAgent → RouteSearchAgent →
    EmissionAgent → OptimizationAgent → ExplainService → response

Each agent appends to ``agent_trace``:
    {agent, action, detail, duration_ms}

The coordinator is the single entry point for the API layer.
Phase 5 implements this fully.
"""

from __future__ import annotations

import logging
import time
from typing import Any

from agents.emission_agent import EmissionAgent
from agents.optimization_agent import OptimizationAgent
from agents.route_search_agent import RouteSearchAgent
from agents.traffic_agent import TrafficAgent
from algorithms.multi_objective import PRESETS, validate_weights
from config import settings
from services.explain_service import ExplainService
from services.graph_service import GraphService
from services.vehicle_service import VehicleService

logger = logging.getLogger("ecoroute")


class Coordinator:
    """Runs the full route optimisation pipeline and returns a structured response."""

    def __init__(
        self,
        graph_service: GraphService | None = None,
        traffic_agent: TrafficAgent | None = None,
        route_search_agent: RouteSearchAgent | None = None,
        emission_agent: EmissionAgent | None = None,
        optimization_agent: OptimizationAgent | None = None,
        explain_service: ExplainService | None = None,
        vehicle_service: VehicleService | None = None,
    ) -> None:
        self.graph_service = graph_service or GraphService()
        self.traffic_agent = traffic_agent or TrafficAgent()
        self.route_search_agent = route_search_agent or RouteSearchAgent()
        self.emission_agent = emission_agent or EmissionAgent()
        self.optimization_agent = optimization_agent or OptimizationAgent(self.emission_agent)
        self.explain_service = explain_service or ExplainService()
        self.vehicle_service = vehicle_service or VehicleService()

    def optimize(self, request: dict[str, Any]) -> dict[str, Any]:
        """
        Execute the full pipeline and return the complete route optimisation response.

        Expected request fields:
          - source: str or int
          - destination: str or int
          - vehicle: dict or vehicle_id string (e.g. 'petrol_hatchback')
          - weights: dict of {distance, time, resource, emissions} or preset name ('balanced')
          - data_mode: 'simulated' or 'real' (default 'simulated')
          - departure_hour: optional int (0-23)
          - k: optional int alternatives count
        """
        agent_trace: list[dict[str, Any]] = []

        source = request.get("source", "A")
        destination = request.get("destination", "E")
        data_mode = request.get("data_mode") or settings.DEFAULT_DATA_MODE
        k = int(request.get("k", settings.K_ALTERNATIVES))

        # 1. Resolve vehicle
        v_input = request.get("vehicle")
        if isinstance(v_input, str):
            try:
                vehicle = self.vehicle_service.get_by_id(v_input)
            except KeyError:
                vehicle = self.vehicle_service.get_defaults()[0]
        elif isinstance(v_input, dict):
            vehicle = v_input
        else:
            vehicle = self.vehicle_service.get_defaults()[0]

        # 2. Resolve weights
        w_input = request.get("weights")
        if isinstance(w_input, str) and w_input in PRESETS:
            weights = PRESETS[w_input]
        elif isinstance(w_input, dict):
            weights = validate_weights(w_input, normalize=True)
        else:
            weights = PRESETS["balanced"]

        # ── Step 1: Load graph ────────────────────────────────────────────────
        t0 = time.perf_counter()
        if data_mode == "real":
            try:
                graph = self.graph_service.get_osm(str(source), str(destination))
                import osmnx as ox

                lat1, lon1 = self.road_network_agent._geocode_point(str(source))
                lat2, lon2 = self.road_network_agent._geocode_point(str(destination))
                source = ox.distance.nearest_nodes(graph, X=lon1, Y=lat1)
                destination = ox.distance.nearest_nodes(graph, X=lon2, Y=lat2)
            except Exception as exc:
                logger.warning("OSM load failed (%s); falling back to demo graph", exc)
                graph = self.graph_service.get_demo()
                source = "A"
                destination = "E"
        else:
            # Check if source/destination are demo nodes (A, B, C, D, E)
            if str(source) in {"A", "B", "C", "D", "E"} and str(destination) in {
                "A",
                "B",
                "C",
                "D",
                "E",
            }:
                graph = self.graph_service.get_demo()
            else:
                try:
                    n_nodes = max(int(destination) + 1, int(source) + 1, 16)
                    source = int(source)
                    destination = int(destination)
                except (ValueError, TypeError):
                    n_nodes = 16
                    source = 0
                    destination = 15
                graph = self.graph_service.get_simulated(n_nodes=n_nodes, kind="grid")

        d_graph = round((time.perf_counter() - t0) * 1000.0, 2)
        agent_trace.append(
            {
                "agent": "RoadNetworkAgent",
                "action": "load_graph",
                "detail": f"Loaded {graph.graph.get('name', 'graph')} with {len(graph.nodes)} nodes",
                "duration_ms": d_graph,
            }
        )

        # ── Step 2: Traffic Simulation ───────────────────────────────────────
        t0 = time.perf_counter()
        dep_hour = request.get("departure_hour")
        if dep_hour is not None:
            self.traffic_agent.apply_time_of_day(graph, int(dep_hour))
            detail = f"Applied hour {dep_hour} traffic multiplier"
        else:
            detail = "Standard simulated baseline traffic"
        d_traffic = round((time.perf_counter() - t0) * 1000.0, 2)
        agent_trace.append(
            {
                "agent": "TrafficAgent",
                "action": "apply_traffic",
                "detail": detail,
                "duration_ms": d_traffic,
            }
        )

        # ── Step 3: Route Search ─────────────────────────────────────────────
        t0 = time.perf_counter()
        candidates = self.route_search_agent.find_candidates(
            graph=graph,
            source=source,
            destination=destination,
            vehicle=vehicle,
            weights=weights,
            k=k,
        )
        d_search = round((time.perf_counter() - t0) * 1000.0, 2)
        agent_trace.append(
            {
                "agent": "RouteSearchAgent",
                "action": "find_candidates",
                "detail": f"Found {len(candidates)} deduplicated candidate paths",
                "duration_ms": d_search,
            }
        )

        # ── Step 4 & 5: Emission Calculation & Multi-Objective Ranking ──────
        t0 = time.perf_counter()
        ranked_routes = self.optimization_agent.rank_routes(
            candidates=candidates,
            weights=weights,
            vehicle=vehicle,
            mode=request.get("normalization_mode", "fixed"),
        )
        d_opt = round((time.perf_counter() - t0) * 1000.0, 2)
        agent_trace.append(
            {
                "agent": "OptimizationAgent",
                "action": "rank_routes",
                "detail": f"Ranked {len(ranked_routes)} routes; identified Pareto frontier",
                "duration_ms": d_opt,
            }
        )

        # Attach geographic coordinates to route paths if graph has node coordinates
        for route in ranked_routes:
            coords: list[list[float]] = []
            for node_id in route.get("path", []):
                node_data = graph.nodes.get(node_id, {})
                lat = node_data.get("lat") or node_data.get("y")
                lon = node_data.get("lon") or node_data.get("x")
                if lat is not None and lon is not None:
                    coords.append([round(float(lat), 6), round(float(lon), 6)])
            if coords:
                route["coordinates"] = coords

        recommended = ranked_routes[0]
        fastest_route = min(ranked_routes, key=lambda r: float(r["travel_time_min"]))
        shortest_route = min(ranked_routes, key=lambda r: float(r["distance_km"]))

        # ── Step 6: Trade-off Explanation ────────────────────────────────────
        t0 = time.perf_counter()
        explanation = self.explain_service.explain(
            recommended=recommended,
            baseline=fastest_route,
            baseline_name="fastest route",
        )
        d_explain = round((time.perf_counter() - t0) * 1000.0, 2)
        agent_trace.append(
            {
                "agent": "ExplainService",
                "action": "generate_explanation",
                "detail": "Generated template-based baseline trade-off analysis",
                "duration_ms": d_explain,
            }
        )

        # ── Step 7: EV Feasibility Check ─────────────────────────────────────
        ev_feasibility = None
        if str(vehicle.get("type", "")).lower() == "electric":
            ev_feasibility = self.emission_agent.check_ev_feasibility(
                required_kwh=float(recommended.get("energy_kwh", 0.0)),
                vehicle=vehicle,
            )

        return {
            "status": "success",
            "data_mode": data_mode,
            "traffic_label": TrafficAgent.TRAFFIC_LABEL,
            "source": str(source),
            "destination": str(destination),
            "vehicle": vehicle,
            "weights": weights,
            "recommended_route": recommended,
            "baselines": {
                "fastest": fastest_route,
                "shortest": shortest_route,
            },
            "routes": ranked_routes,
            "explanation": explanation,
            "ev_feasibility": ev_feasibility,
            "agent_trace": agent_trace,
        }
