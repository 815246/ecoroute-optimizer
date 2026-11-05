"""
EcoRoute agents package.

Each agent is an independent, testable Python class with a typed interface.
Agents communicate through typed data structures and append decisions to an
``agent_trace`` list for transparency.

Agent pipeline (Coordinator orchestrates):
    RoadNetworkAgent → TrafficAgent → RouteSearchAgent →
    EmissionAgent → OptimizationAgent → ExplainService → response
"""

from __future__ import annotations

from agents.coordinator import Coordinator
from agents.emission_agent import EmissionAgent
from agents.optimization_agent import OptimizationAgent
from agents.replanning_agent import FullRerunAStar, ReplanningAgent, ReplanStrategy
from agents.road_network_agent import RoadNetworkAgent
from agents.route_search_agent import RouteSearchAgent
from agents.traffic_agent import TrafficAgent

__all__ = [
    "Coordinator",
    "EmissionAgent",
    "FullRerunAStar",
    "OptimizationAgent",
    "ReplanStrategy",
    "ReplanningAgent",
    "RoadNetworkAgent",
    "RouteSearchAgent",
    "TrafficAgent",
]
