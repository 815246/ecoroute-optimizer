"""Unit tests for Phase 6 OpenStreetMap (OSM) integration and graph caching."""

from __future__ import annotations

from unittest.mock import patch

import networkx as nx
import pytest

from agents.road_network_agent import RoadNetworkAgent
from services.graph_service import GraphService


def test_geocode_point_coordinates() -> None:
    """Verify parsing of raw coordinate strings."""
    agent = RoadNetworkAgent()
    lat, lon = agent._geocode_point("23.3441, 85.3096")
    assert pytest.approx(lat, rel=1e-4) == 23.3441
    assert pytest.approx(lon, rel=1e-4) == 85.3096


def test_load_osm_graph_exceeds_max_bbox() -> None:
    """Verify ValueError is raised when distance between endpoints exceeds MAX_BBOX_KM."""
    agent = RoadNetworkAgent()
    # Ranchi to Kolkata (~350 km), well over MAX_BBOX_KM (50 km)
    with pytest.raises(ValueError, match="exceeds maximum allowed bounding box size"):
        agent.load_osm_graph("23.3441, 85.3096", "22.5726, 88.3639")


def test_load_osm_graph_mocked() -> None:
    """Verify OSM graph loading and attribute enrichment with mocked OSMnx."""
    agent = RoadNetworkAgent()

    # Create mock MultiDiGraph
    mock_g = nx.MultiDiGraph()
    mock_g.add_node(1, y=23.3441, x=85.3096)
    mock_g.add_node(2, y=23.3500, x=85.3200)
    mock_g.add_edge(1, 2, key=0, length=1500.0, highway="primary", maxspeed="60")
    mock_g.graph["crs"] = "epsg:4326"

    with (
        patch("osmnx.graph_from_bbox", return_value=mock_g) as mock_ox,
        patch("osmnx.save_graphml"),
    ):
        g = agent.load_osm_graph("23.3441, 85.3096", "23.3500, 85.3200")

        assert mock_ox.called
        assert g.graph["data_mode"] == "real"
        edge_data = g[1][2][0]
        assert edge_data["length_km"] == 1.5
        assert edge_data["speed_kmh"] == 60.0
        assert edge_data["free_flow_time_min"] == 1.5  # (1.5 / 60) * 60
        assert edge_data["is_blocked"] is False


def test_graph_service_get_osm_caching() -> None:
    """Verify GraphService caches OSM graph in memory."""
    service = GraphService()
    mock_g = nx.MultiDiGraph()
    mock_g.graph["name"] = "mock_osm"

    with patch.object(service.road_agent, "load_osm_graph", return_value=mock_g) as mock_load:
        g1 = service.get_osm("Point A", "Point B")
        g2 = service.get_osm("Point A", "Point B")

        assert g1 is g2
        assert mock_load.call_count == 1
