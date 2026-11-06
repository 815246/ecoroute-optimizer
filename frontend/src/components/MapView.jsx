/**
 * MapView – Interactive React-Leaflet map with:
 *   - Real road geometry rendering from backend (route.geometry)
 *   - Click-to-place Start (Green) and Destination (Red) markers
 *   - Demo node circle markers with labels
 */
import React, { useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Tooltip,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's default icon path issue in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom colored pin icons
const createPinIcon = (color) =>
  L.divIcon({
    className: "custom-pin",
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });

const startIcon = createPinIcon("#059669"); // Emerald Green
const endIcon = createPinIcon("#dc2626"); // Red

// Known demo nodes in Ranchi
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

// Click listener hook inside MapContainer
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
}

export default function MapView({
  routes,
  selectedIndex,
  startPoint,
  endPoint,
  onMapClick,
  clickTarget = "start", // "start" or "end"
}) {
  const center = [23.34, 85.35];

  // Extract all route coordinates (prefers real road geometry if available)
  const routePolylines = useMemo(() => {
    return (routes ?? []).map((route) => {
      if (route.geometry && Array.isArray(route.geometry) && route.geometry.length > 1) {
        return route.geometry;
      }
      return (route.path ?? [])
        .map((n) => NODE_COORDS[n])
        .filter(Boolean);
    });
  }, [routes]);

  const allNodes = useMemo(() => {
    const nodes = new Set();
    (routes ?? []).forEach((r) => (r.path ?? []).forEach((n) => nodes.add(n)));
    return [...nodes];
  }, [routes]);

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      {/* Map Header Instructions */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 500,
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(4px)",
          padding: "6px 12px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          fontSize: "0.75rem",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "var(--slate-700)",
        }}
      >
        <span>💡 Click map to set:</span>
        <span
          style={{
            fontWeight: 700,
            color: clickTarget === "start" ? "#059669" : "#dc2626",
            background: clickTarget === "start" ? "#ecfdf5" : "#fee2e2",
            padding: "2px 8px",
            borderRadius: "4px",
          }}
        >
          {clickTarget === "start" ? "📍 Starting Point" : "🏁 Destination"}
        </span>
      </div>

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

        <MapClickHandler onMapClick={onMapClick} />

        {/* Selected Start Point Marker */}
        {startPoint && (
          <Marker position={startPoint} icon={startIcon}>
            <Popup>
              <strong>Start Point</strong>
              <br />
              {startPoint[0].toFixed(5)}, {startPoint[1].toFixed(5)}
            </Popup>
          </Marker>
        )}

        {/* Selected Destination Point Marker */}
        {endPoint && (
          <Marker position={endPoint} icon={endIcon}>
            <Popup>
              <strong>Destination</strong>
              <br />
              {endPoint[0].toFixed(5)}, {endPoint[1].toFixed(5)}
            </Popup>
          </Marker>
        )}

        {/* Draw all route polylines */}
        {routePolylines.map((latlngs, i) => {
          if (latlngs.length < 2) return null;
          const isSelected = i === selectedIndex;
          const route = routes[i] || {};
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
                {route.primary_label ?? route.label ?? `Route ${i + 1}`} |{" "}
                {Number(route.co2_kg ?? route.total_co2_kg ?? 0).toFixed(3)} kg CO₂ ·{" "}
                {Number(route.travel_time_min ?? route.total_time_min ?? 0).toFixed(1)} min
              </Tooltip>
            </Polyline>
          );
        })}

        {/* Node Labels (for simulated/demo graph) */}
        {allNodes.map((n) => {
          const pos = NODE_COORDS[n];
          if (!pos) return null;
          return (
            <CircleMarker
              key={n}
              center={pos}
              radius={8}
              pathOptions={{
                color: "#1e293b",
                fillColor: "#f8fafc",
                fillOpacity: 1,
                weight: 2,
              }}
            >
              <Tooltip permanent direction="top" offset={[0, -10]}>
                {n}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
