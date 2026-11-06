/**
 * MapView – React-Leaflet map rendering route paths as coloured polylines.
 * Supports both pre-defined demo nodes (A-F) and real geographic coordinates (lat, lon)
 * returned by Google Places or OSM routing.
 */
import React, { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet";
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
  "#059669", // emerald (recommended)
  "#0284c7", // sky (fastest)
  "#d97706", // amber (shortest)
  "#7c3aed", // violet
  "#db2777", // pink
];

function getRouteLatLngs(route) {
  if (route.coordinates && route.coordinates.length > 0) {
    return route.coordinates;
  }
  return (route.path ?? []).map((n) => NODE_COORDS[n]).filter(Boolean);
}

function AutoFitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [bounds, map]);
  return null;
}

export default function MapView({
  routes,
  selectedIndex,
  originCoords,
  destinationCoords,
}) {
  const defaultCenter = [23.34, 85.35];

  // Compute all visible coordinates to fit bounds
  const allCoordinates = useMemo(() => {
    const pts = [];
    if (originCoords) pts.push(originCoords);
    if (destinationCoords) pts.push(destinationCoords);
    (routes ?? []).forEach((r) => {
      const coords = getRouteLatLngs(r);
      coords.forEach((pt) => pts.push(pt));
    });
    return pts;
  }, [routes, originCoords, destinationCoords]);

  const allDemoNodes = useMemo(() => {
    const nodes = new Set();
    (routes ?? []).forEach((r) =>
      (r.path ?? []).forEach((n) => {
        if (NODE_COORDS[n]) nodes.add(n);
      })
    );
    return [...nodes];
  }, [routes]);

  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      style={{ height: "100%", minHeight: "420px", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
      />

      <AutoFitBounds bounds={allCoordinates} />

      {/* Origin Marker */}
      {originCoords && (
        <CircleMarker
          center={originCoords}
          radius={9}
          pathOptions={{
            color: "#059669",
            fillColor: "#10b981",
            fillOpacity: 1,
            weight: 3,
          }}
        >
          <Tooltip permanent direction="top" offset={[0, -10]}>
            Start
          </Tooltip>
        </CircleMarker>
      )}

      {/* Destination Marker */}
      {destinationCoords && (
        <CircleMarker
          center={destinationCoords}
          radius={9}
          pathOptions={{
            color: "#dc2626",
            fillColor: "#ef4444",
            fillOpacity: 1,
            weight: 3,
          }}
        >
          <Tooltip permanent direction="top" offset={[0, -10]}>
            Destination
          </Tooltip>
        </CircleMarker>
      )}

      {/* Draw all routes; highlight selected */}
      {(routes ?? []).map((route, i) => {
        const latlngs = getRouteLatLngs(route);
        if (latlngs.length < 2) return null;
        const isSelected = i === selectedIndex;
        const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
        return (
          <Polyline
            key={i}
            positions={latlngs}
            pathOptions={{
              color,
              weight: isSelected ? 6 : 3,
              opacity: isSelected ? 1 : 0.45,
              dashArray: isSelected ? undefined : "6 4",
            }}
          >
            <Tooltip sticky>
              {route.primary_label ?? route.label ?? `Route ${i + 1}`} |{" "}
              {Number(route.co2_kg ?? route.total_co2_kg ?? 0).toFixed(3)} kg
              CO₂ ·{" "}
              {Number(
                route.travel_time_min ?? route.total_time_min ?? 0
              ).toFixed(1)}{" "}
              min
            </Tooltip>
          </Polyline>
        );
      })}

      {/* Node labels for demo graph */}
      {allDemoNodes.map((n) => {
        const pos = NODE_COORDS[n];
        if (!pos) return null;
        return (
          <CircleMarker
            key={n}
            center={pos}
            radius={7}
            pathOptions={{
              color: "#334155",
              fillColor: "#f1f5f9",
              fillOpacity: 1,
              weight: 2,
            }}
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
