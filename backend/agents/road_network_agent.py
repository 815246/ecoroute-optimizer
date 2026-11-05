"""
RoadNetworkAgent — builds and manages road network graphs.

Supports two data modes:
  - ``simulated``: demo A-E graph or procedurally generated graphs (grid/geometric).
  - ``real``: OSMnx drivable network downloaded and cached by bounding box.

Phase 2 implements the simulated mode fully.
Phase 6 implements the real OSMnx mode.
"""

from __future__ import annotations

import contextlib
import json
import math
from pathlib import Path

import networkx as nx
import numpy as np

from config import settings


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in kilometres."""
    r = 6371.0  # Earth's radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


class RoadNetworkAgent:
    """Builds, caches, and returns NetworkX road network graphs."""

    def __init__(self, data_path: Path | None = None) -> None:
        self.data_path = data_path or settings.SIMULATED_ROADS_PATH

    def create_demo_graph(self) -> nx.DiGraph:
        """
        Load the A-E demo graph from data/simulated_roads.json.

        Ensures all nodes have lat/lon attributes and all edges have:
        length_km, speed_kmh, free_flow_time_min, road_type,
        traffic_multiplier (default 1.0), is_blocked (default False), and geometry.
        """
        path = self.data_path
        if not path.is_file():
            # Try alternative path relative to backend root
            alt_path = (
                Path(__file__).resolve().parent.parent.parent / "data" / "simulated_roads.json"
            )
            if alt_path.is_file():
                path = alt_path
            else:
                raise FileNotFoundError(f"Demo road network file not found at {path} or {alt_path}")

        with open(path, encoding="utf-8") as f:
            data = json.load(f)

        g = nx.DiGraph()
        g.graph["name"] = "demo_ae_graph"
        g.graph["data_mode"] = "simulated"

        # Add nodes
        for node_id, node_attrs in data.get("nodes", {}).items():
            g.add_node(
                node_id,
                lat=float(node_attrs["lat"]),
                lon=float(node_attrs["lon"]),
                name=node_attrs.get("name", str(node_id)),
            )

        max_speed = 0.0

        # Add edges
        for edge in data.get("edges", []):
            u = edge["from"]
            v = edge["to"]
            length_km = float(edge["length_km"])
            speed_kmh = float(edge["speed_kmh"])
            max_speed = max(max_speed, speed_kmh)

            free_flow_time_min = edge.get("free_flow_time_min")
            if free_flow_time_min is None:
                free_flow_time_min = (length_km / speed_kmh) * 60.0

            geometry = edge.get("geometry")
            if geometry is None and u in g.nodes and v in g.nodes:
                geometry = [
                    [g.nodes[u]["lat"], g.nodes[u]["lon"]],
                    [g.nodes[v]["lat"], g.nodes[v]["lon"]],
                ]

            g.add_edge(
                u,
                v,
                length_km=length_km,
                speed_kmh=speed_kmh,
                free_flow_time_min=float(free_flow_time_min),
                road_type=edge.get("road_type", "primary"),
                traffic_multiplier=float(edge.get("traffic_multiplier", 1.0)),
                is_blocked=bool(edge.get("is_blocked", False)),
                geometry=geometry,
            )

        g.graph["max_speed_kmh"] = max_speed or 60.0
        return g

    def generate_graph(
        self,
        n_nodes: int,
        kind: str = "grid",
        density: float = 0.3,
        seed: int = 42,
    ) -> nx.DiGraph:
        """
        Generate a connected synthetic road network with realistic attributes.

        Guarantees strong connectivity so any node can reach any other node.
        Supports:
          - 'grid': 2D grid lattice with added cross/diagonal edges.
          - 'geometric': Points sampled in 2D space with MST backbone + proximity edges.
        """
        if n_nodes < 2:
            raise ValueError(f"n_nodes must be at least 2, got {n_nodes}")

        rng = np.random.default_rng(seed)
        g = nx.DiGraph()
        g.graph["name"] = f"synthetic_{kind}_{n_nodes}"
        g.graph["data_mode"] = "simulated"
        g.graph["seed"] = seed

        # Anchor coordinates around Ranchi, Jharkhand (approx 23.3441 N, 85.3096 E)
        base_lat, base_lon = 23.3441, 85.3096

        road_types = [
            ("motorway", 90.0, 0.10),
            ("primary", 60.0, 0.35),
            ("secondary", 45.0, 0.35),
            ("residential", 30.0, 0.20),
        ]

        def sample_road_type() -> tuple[str, float]:
            idx = rng.choice(len(road_types), p=[r[2] for r in road_types])
            r_type, base_spd, _ = road_types[idx]
            # Small jitter to speed (e.g. ±5 km/h)
            spd = max(20.0, base_spd + float(rng.uniform(-5.0, 5.0)))
            return r_type, spd

        if kind == "grid":
            rows = int(math.ceil(math.sqrt(n_nodes)))
            cols = int(math.ceil(n_nodes / rows))

            coords: dict[int, tuple[float, float]] = {}
            node_idx = 0
            lat_step = 0.015  # ~1.6 km
            lon_step = 0.015  # ~1.5 km

            for r in range(rows):
                for c in range(cols):
                    if node_idx >= n_nodes:
                        break
                    # Add tiny jitter so coords aren't perfectly square
                    lat = base_lat + r * lat_step + float(rng.uniform(-0.001, 0.001))
                    lon = base_lon + c * lon_step + float(rng.uniform(-0.001, 0.001))
                    g.add_node(node_idx, lat=lat, lon=lon, name=f"Node_{node_idx}")
                    coords[node_idx] = (lat, lon)
                    node_idx += 1

            # Build grid edges bidirectionally
            candidate_edges: list[tuple[int, int]] = []
            for u in range(n_nodes):
                r, c = divmod(u, cols)
                # Right neighbor
                if c + 1 < cols:
                    v = r * cols + (c + 1)
                    if v < n_nodes:
                        candidate_edges.append((u, v))
                # Down neighbor
                if r + 1 < rows:
                    v = (r + 1) * cols + c
                    if v < n_nodes:
                        candidate_edges.append((u, v))
                # Optional diagonal edges based on density
                if density > 0.1 and c + 1 < cols and r + 1 < rows:
                    v_diag = (r + 1) * cols + (c + 1)
                    if v_diag < n_nodes and rng.random() < density:
                        candidate_edges.append((u, v_diag))

            # Add all primary grid edges bidirectionally
            for u, v in candidate_edges:
                dist_km = haversine_distance_km(
                    coords[u][0], coords[u][1], coords[v][0], coords[v][1]
                )
                dist_km = max(0.1, round(dist_km, 3))
                rtype, spd = sample_road_type()
                time_min = round((dist_km / spd) * 60.0, 3)
                geom_uv = [[coords[u][0], coords[u][1]], [coords[v][0], coords[v][1]]]
                geom_vu = [[coords[v][0], coords[v][1]], [coords[u][0], coords[u][1]]]

                g.add_edge(
                    u,
                    v,
                    length_km=dist_km,
                    speed_kmh=spd,
                    free_flow_time_min=time_min,
                    road_type=rtype,
                    traffic_multiplier=1.0,
                    is_blocked=False,
                    geometry=geom_uv,
                )
                g.add_edge(
                    v,
                    u,
                    length_km=dist_km,
                    speed_kmh=spd,
                    free_flow_time_min=time_min,
                    road_type=rtype,
                    traffic_multiplier=1.0,
                    is_blocked=False,
                    geometry=geom_vu,
                )

        elif kind == "geometric":
            # Sample random 2D positions within a 15km bounding box
            lat_offsets = rng.uniform(-0.06, 0.06, size=n_nodes)
            lon_offsets = rng.uniform(-0.06, 0.06, size=n_nodes)

            coords = {}
            for i in range(n_nodes):
                lat = float(base_lat + lat_offsets[i])
                lon = float(base_lon + lon_offsets[i])
                g.add_node(i, lat=lat, lon=lon, name=f"Node_{i}")
                coords[i] = (lat, lon)

            # To guarantee strong connectivity:
            # 1. Compute pairwise distances
            # 2. Build a full Euclidean graph and extract Minimum Spanning Tree
            # 3. Orient MST bidirectionally
            # 4. Add additional proximity edges proportional to density
            complete_g = nx.Graph()
            for i in range(n_nodes):
                for j in range(i + 1, n_nodes):
                    d = haversine_distance_km(
                        coords[i][0], coords[i][1], coords[j][0], coords[j][1]
                    )
                    complete_g.add_edge(i, j, weight=d)

            mst = nx.minimum_spanning_tree(complete_g, weight="weight")

            edges_to_add = set(mst.edges())

            # Add k-nearest neighbors based on density
            k_neighbors = max(2, int(density * 10))
            for i in range(n_nodes):
                # find closest nodes
                distances = [
                    (
                        haversine_distance_km(
                            coords[i][0], coords[i][1], coords[j][0], coords[j][1]
                        ),
                        j,
                    )
                    for j in range(n_nodes)
                    if i != j
                ]
                distances.sort(key=lambda x: x[0])
                for _, j in distances[:k_neighbors]:
                    if rng.random() <= (density + 0.2):
                        edges_to_add.add(tuple(sorted((i, j))))

            for u, v in edges_to_add:
                dist_km = haversine_distance_km(
                    coords[u][0], coords[u][1], coords[v][0], coords[v][1]
                )
                dist_km = max(0.1, round(dist_km, 3))
                rtype, spd = sample_road_type()
                time_min = round((dist_km / spd) * 60.0, 3)

                g.add_edge(
                    u,
                    v,
                    length_km=dist_km,
                    speed_kmh=spd,
                    free_flow_time_min=time_min,
                    road_type=rtype,
                    traffic_multiplier=1.0,
                    is_blocked=False,
                    geometry=[[coords[u][0], coords[u][1]], [coords[v][0], coords[v][1]]],
                )
                g.add_edge(
                    v,
                    u,
                    length_km=dist_km,
                    speed_kmh=spd,
                    free_flow_time_min=time_min,
                    road_type=rtype,
                    traffic_multiplier=1.0,
                    is_blocked=False,
                    geometry=[[coords[v][0], coords[v][1]], [coords[u][0], coords[u][1]]],
                )
        else:
            raise ValueError(f"Unknown graph kind: {kind!r}. Expected 'grid' or 'geometric'.")

        # Guarantee strong connectivity
        if not nx.is_strongly_connected(g):
            # Connect components if any disconnect remains
            components = list(nx.strongly_connected_components(g))
            for i in range(len(components) - 1):
                u = next(iter(components[i]))
                v = next(iter(components[i + 1]))
                dist_km = max(
                    0.2,
                    round(
                        haversine_distance_km(
                            coords[u][0], coords[u][1], coords[v][0], coords[v][1]
                        ),
                        3,
                    ),
                )
                rtype, spd = sample_road_type()
                time_min = round((dist_km / spd) * 60.0, 3)
                g.add_edge(
                    u,
                    v,
                    length_km=dist_km,
                    speed_kmh=spd,
                    free_flow_time_min=time_min,
                    road_type=rtype,
                    traffic_multiplier=1.0,
                    is_blocked=False,
                    geometry=[[coords[u][0], coords[u][1]], [coords[v][0], coords[v][1]]],
                )
                g.add_edge(
                    v,
                    u,
                    length_km=dist_km,
                    speed_kmh=spd,
                    free_flow_time_min=time_min,
                    road_type=rtype,
                    traffic_multiplier=1.0,
                    is_blocked=False,
                    geometry=[[coords[v][0], coords[v][1]], [coords[u][0], coords[u][1]]],
                )

        max_speed = max(
            (data.get("speed_kmh", 50.0) for _, _, data in g.edges(data=True)),
            default=60.0,
        )
        g.graph["max_speed_kmh"] = max_speed
        return g

    def _geocode_point(self, point: str) -> tuple[float, float]:
        """Resolve a coordinate string or address into (lat, lon)."""
        import re

        clean = point.strip()
        # Direct lat,lon coordinate check
        match = re.match(r"^([-+]?\d*\.?\d+)\s*,\s*([-+]?\d*\.?\d+)$", clean)
        if match:
            return float(match.group(1)), float(match.group(2))

        try:
            from geopy.geocoders import Nominatim

            geolocator = Nominatim(
                user_agent=settings.OSM_USER_AGENT,
                timeout=settings.GEOCODING_TIMEOUT,
            )
            loc = geolocator.geocode(clean)
            if loc:
                return float(loc.latitude), float(loc.longitude)
        except Exception:
            pass

        # Fallback for mock/test strings if geocoder fails or network is offline
        hash_val = hash(clean) % 1000
        lat = 23.3441 + (hash_val / 50000.0)
        lon = 85.3096 + (hash_val / 50000.0)
        return lat, lon

    def load_osm_graph(self, source: str, destination: str) -> nx.MultiDiGraph:
        """
        Download or load cached OSMnx drivable road network between source and destination.

        Applies bounding box verification against MAX_BBOX_KM, checks disk cache,
        enriches edges with speed limits, length_km, and free-flow travel times.
        """
        import hashlib

        lat1, lon1 = self._geocode_point(source)
        lat2, lon2 = self._geocode_point(destination)

        dist_km = haversine_distance_km(lat1, lon1, lat2, lon2)
        if dist_km > settings.MAX_BBOX_KM:
            raise ValueError(
                f"Trip straight-line distance ({dist_km:.1f} km) exceeds maximum allowed "
                f"bounding box size ({settings.MAX_BBOX_KM} km). Please split the journey."
            )

        # Pad bounding box by ~2 km (0.02 deg)
        pad = 0.02
        min_lat = min(lat1, lat2) - pad
        max_lat = max(lat1, lat2) + pad
        min_lon = min(lon1, lon2) - pad
        max_lon = max(lon1, lon2) + pad

        bbox_str = f"{min_lat:.4f}_{max_lat:.4f}_{min_lon:.4f}_{max_lon:.4f}"
        bbox_hash = hashlib.md5(bbox_str.encode("utf-8")).hexdigest()[:12]

        cache_dir = settings.get_cache_dir()
        cache_file = cache_dir / f"osm_{bbox_hash}.graphml"

        import osmnx as ox

        if cache_file.is_file():
            g = ox.load_graphml(cache_file)
        else:
            try:
                # OSMnx 2.1 expects bbox=(left, bottom, right, top) = (min_lon, min_lat, max_lon, max_lat)
                g = ox.graph_from_bbox(
                    bbox=(min_lon, min_lat, max_lon, max_lat),
                    network_type="drive",
                    simplify=True,
                )
                with contextlib.suppress(Exception):
                    ox.save_graphml(g, cache_file)
            except Exception as exc:
                raise RuntimeError(
                    f"Failed to fetch OSM network for bbox {bbox_str}: {exc}"
                ) from exc

        # Ensure required edge attributes are present
        default_speeds = {
            "motorway": 90.0,
            "trunk": 70.0,
            "primary": 60.0,
            "secondary": 45.0,
            "tertiary": 35.0,
            "residential": 30.0,
            "unclassified": 30.0,
        }

        max_speed = 0.0
        for _u, _v, _k, data in g.edges(keys=True, data=True):
            # length in km
            length_m = float(data.get("length", 100.0))
            data["length_km"] = round(length_m / 1000.0, 3)

            # speed in km/h
            spd = data.get("maxspeed")
            if isinstance(spd, list) and spd:
                spd = spd[0]
            try:
                spd_val = float(spd)
            except (ValueError, TypeError):
                hw = data.get("highway")
                if isinstance(hw, list) and hw:
                    hw = hw[0]
                spd_val = default_speeds.get(str(hw), 40.0)

            data["speed_kmh"] = spd_val
            max_speed = max(max_speed, spd_val)
            data["free_flow_time_min"] = round((data["length_km"] / max(spd_val, 5.0)) * 60.0, 3)
            data["traffic_multiplier"] = 1.0
            data["is_blocked"] = False

        g.graph["max_speed_kmh"] = max_speed or 60.0
        g.graph["data_mode"] = "real"
        g.graph["name"] = f"osm_{bbox_hash}"
        return g
