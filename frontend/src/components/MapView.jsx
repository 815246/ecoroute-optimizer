/**
 * MapView – Interactive React-Leaflet map with:
 *   - Auto-bounds fitting to selected route path
 *   - Directional path rendering with Start (Green) & End (Red) pins
 *   - Turn direction maneuver icons along the route
 *   - Step highlight on hover from directions list
 *   - Click-to-place Start & Destination pins
 */
import React, { useMemo, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Tooltip,
  Marker,
  Popup,
  useMap,
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
const createPinIcon = (color, labelText) =>
  L.divIcon({
    className: "custom-pin",
    html: `<div style="
      background-color: ${color};
      width: 28px;
      height: 28px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <span style="transform: rotate(45deg); font-size: 11px; font-weight: 800; color: white;">
        ${labelText || ""}
      </span>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });

const startIcon = createPinIcon("#059669", "A"); // Green Departure
const endIcon = createPinIcon("#dc2626", "B"); // Red Arrival

// Turn direction arrow icon
const createTurnIcon = (symbol) =>
  L.divIcon({
    className: "turn-pin",
    html: `<div style="
      background: white;
      color: #047857;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 1.5px solid #059669;
      box-shadow: 0 1px 4px rgba(0,0,0,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: bold;
    ">${symbol}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

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
  "#059669", // emerald (recommended)
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

// Automatically fit map view to the selected route path
function RouteBoundsFitter({ activePolyline }) {
  const map = useMap();
  useEffect(() => {
    if (activePolyline && activePolyline.length > 1) {
      try {
        const bounds = L.latLngBounds(activePolyline);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } catch (e) {
        // Ignore boundary calculation errors
      }
    }
  }, [activePolyline, map]);
  return null;
}

export default function MapView({
  routes,
  selectedIndex,
  startPoint,
  endPoint,
  startName,
  endName,
  onMapClick,
  clickTarget = "start",
  hoveredStepLocation,
}) {
  const center = [23.34, 85.35];

  // Extract all route coordinates (prefers real road geometry if available)
  const routePolylines = useMemo(() => {
    return (routes ?? []).map((route) => {
      if (
        route.route_geometry &&
        Array.isArray(route.route_geometry) &&
        route.route_geometry.length > 1
      ) {
        return route.route_geometry;
      }
      if (
        route.geometry &&
        Array.isArray(route.geometry) &&
        route.geometry.length > 1
      ) {
        return route.geometry;
      }
      return (route.path ?? []).map((n) => NODE_COORDS[n]).filter(Boolean);
    });
  }, [routes]);

  const selectedPolyline = routePolylines[selectedIndex] || [];
  const selectedRoute = routes[selectedIndex] || {};
  const directions = selectedRoute.directions || [];

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
          {clickTarget === "start" ? "📍 Start Pin (A)" : "🏁 Destination (B)"}
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
        <RouteBoundsFitter activePolyline={selectedPolyline} />

        {/* Selected Start Point Marker */}
        {startPoint && (
          <Marker position={startPoint} icon={startIcon}>
            <Popup>
              <strong>Start Point:</strong>
              <br />
              {startName || "Origin Location"}
            </Popup>
            <Tooltip permanent direction="top" offset={[0, -26]}>
              {startName ? startName.split(",")[0] : "Start (A)"}
            </Tooltip>
          </Marker>
        )}

        {/* Selected Destination Point Marker */}
        {endPoint && (
          <Marker position={endPoint} icon={endIcon}>
            <Popup>
              <strong>Destination:</strong>
              <br />
              {endName || "Destination Location"}
            </Popup>
            <Tooltip permanent direction="top" offset={[0, -26]}>
              {endName ? endName.split(",")[0] : "Destination (B)"}
            </Tooltip>
          </Marker>
        )}

        {/* Hovered Step Highlight on Map */}
        {hoveredStepLocation && (
          <CircleMarker
            center={hoveredStepLocation}
            radius={10}
            pathOptions={{
              color: "#f59e0b",
              fillColor: "#fbbf24",
              fillOpacity: 0.9,
              weight: 3,
            }}
          >
            <Tooltip permanent direction="top">
              Step Location
            </Tooltip>
          </CircleMarker>
        )}

        {/* Draw Unselected Routes in background */}
        {routePolylines.map((latlngs, i) => {
          if (latlngs.length < 2 || i === selectedIndex) return null;
          const route = routes[i] || {};
          return (
            <Polyline
              key={i}
              positions={latlngs}
              pathOptions={{
                color: ROUTE_COLORS[i % ROUTE_COLORS.length],
                weight: 3,
                opacity: 0.35,
                dashArray: "6 6",
              }}
            >
              <Tooltip sticky>
                {route.primary_label ?? route.label ?? `Route ${i + 1}`} |{" "}
                {Number(route.co2_kg ?? 0).toFixed(3)} kg CO₂ ·{" "}
                {Number(route.travel_time_min ?? 0).toFixed(1)} min
              </Tooltip>
            </Polyline>
          );
        })}

        {/* Draw Selected/Recommended Route with High Contrast & Glow */}
        {selectedPolyline.length > 1 && (
          <>
            {/* Outer casing for contrast */}
            <Polyline
              positions={selectedPolyline}
              pathOptions={{
                color: "#064e3b",
                weight: 7,
                opacity: 0.8,
              }}
            />
            {/* Inner vibrant line */}
            <Polyline
              positions={selectedPolyline}
              pathOptions={{
                color: "#10b981",
                weight: 4.5,
                opacity: 1,
              }}
            >
              <Tooltip sticky>
                <strong>
                  {selectedRoute.primary_label || "Recommended Route"}
                </strong>
                <br />
                {Number(selectedRoute.co2_kg ?? 0).toFixed(3)} kg CO₂ ·{" "}
                {Number(selectedRoute.travel_time_min ?? 0).toFixed(1)} min
              </Tooltip>
            </Polyline>

            {/* Turn maneuver step icons along the route */}
            {directions.slice(0, -1).map((step, sIdx) => {
              if (!step.location || step.location.length < 2) return null;
              // Choose symbol based on turn
              const symbol =
                step.turn_type === "right"
                  ? "➔"
                  : step.turn_type === "left"
                    ? "⬅"
                    : "⬆";
              return (
                <Marker
                  key={`step-${sIdx}`}
                  position={step.location}
                  icon={createTurnIcon(symbol)}
                >
                  <Tooltip direction="right" offset={[10, 0]}>
                    Step {step.step}: {step.instruction}
                  </Tooltip>
                </Marker>
              );
            })}
          </>
        )}
      </MapContainer>
    </div>
  );
}
