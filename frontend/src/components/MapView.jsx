/**
 * MapView – React-Leaflet map rendering route paths as coloured polylines.
 * Node coordinates are taken from the demo graph defined in simulated_roads.json.
 * When no geometry is available, renders node positions as circle markers.
 */
import React, { useMemo } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Coordinates from backend/data/simulated_roads.json
const NODE_COORDS = {
  A: [23.3, 85.32],
  B: [23.32, 85.35],
  C: [23.31, 85.38],
  D: [23.34, 85.33],
  E: [23.34, 85.37],
  F: [23.36, 85.36],
};

const ROUTE_COLORS = [
  "#059669", // emerald
  "#0284c7", // sky
  "#d97706", // amber
  "#7c3aed", // violet
  "#db2777", // pink
];

function pathToLatLngs(path) {
  return (path ?? [])
    .map((n) => NODE_COORDS[n])
    .filter(Boolean);
}

export default function MapView({ routes, selectedIndex }) {
  const center = [23.33, 85.35];

  const allNodes = useMemo(() => {
    const nodes = new Set();
    (routes ?? []).forEach((r) => (r.path ?? []).forEach((n) => nodes.add(n)));
    return [...nodes];
  }, [routes]);

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: "100%", minHeight: "420px", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
      />

      {/* Draw all routes; highlight selected */}
      {(routes ?? []).map((route, i) => {
        const latlngs = pathToLatLngs(route.path);
        if (latlngs.length < 2) return null;
        const isSelected = i === selectedIndex;
        return (
          <Polyline
            key={i}
            positions={latlngs}
            pathOptions={{
              color: ROUTE_COLORS[i % ROUTE_COLORS.length],
              weight: isSelected ? 5 : 2.5,
              opacity: isSelected ? 1 : 0.45,
              dashArray: isSelected ? undefined : "6 4",
            }}
          >
            <Tooltip sticky>
              {route.label ?? `Route ${i + 1}`} |{" "}
              {(route.total_co2_kg ?? 0).toFixed(3)} kg CO₂ ·{" "}
              {(route.total_time_min ?? 0).toFixed(1)} min
            </Tooltip>
          </Polyline>
        );
      })}

      {/* Node labels */}
      {allNodes.map((n) => {
        const pos = NODE_COORDS[n];
        if (!pos) return null;
        return (
          <CircleMarker
            key={n}
            center={pos}
            radius={7}
            pathOptions={{ color: "#334155", fillColor: "#f1f5f9", fillOpacity: 1, weight: 2 }}
          >
            <Tooltip permanent direction="top" offset={[0, -8]}>
              {n}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

