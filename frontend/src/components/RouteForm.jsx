/**
 * RouteForm – supports both Google Places address search and Demo Graph node selection.
 */
import React, { useState, useEffect } from "react";
import { getVehicles, getPresets } from "../services/api";
import { loadGoogleMaps } from "../services/googleMapsLoader";
import GooglePlacesInput from "./GooglePlacesInput";

const DEFAULT_NODES = ["A", "B", "C", "D", "E", "F"];

export default function RouteForm({ onSubmit, loading, onLocationsChange }) {
  // Mode: "places" (Google Places search) or "nodes" (Demo simulated graph)
  const [inputMode, setInputMode] = useState("places");

  // Google Maps API Key state
  const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("google_maps_api_key") || envKey
  );
  const [keyInput, setKeyInput] = useState("");
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [mapsError, setMapsError] = useState(null);

  // Places search selections
  const [originPlace, setOriginPlace] = useState(null);
  const [destPlace, setDestPlace] = useState(null);

  // Demo nodes selections
  const [source, setSource] = useState("A");
  const [destination, setDestination] = useState("E");

  // Vehicle, preset, departure
  const [vehicleId, setVehicleId] = useState("petrol_hatchback");
  const [preset, setPreset] = useState("eco");
  const [departureHour, setDepartureHour] = useState(8);
  const [useOsm, setUseOsm] = useState(false);

  const [vehicles, setVehicles] = useState([]);
  const [presets, setPresets] = useState([]);

  // Load vehicles and presets from backend
  useEffect(() => {
    getVehicles()
      .then((d) => {
        const vs = d.vehicles ?? [];
        setVehicles(vs);
        if (vs.length > 0) setVehicleId(vs[0].id);
      })
      .catch(() => {});
    getPresets()
      .then((d) => setPresets(d.presets ?? []))
      .catch(() => {});
  }, []);

  // Try loading Google Maps whenever apiKey is present
  useEffect(() => {
    if (apiKey) {
      setMapsError(null);
      loadGoogleMaps(apiKey)
        .then(() => setMapsLoaded(true))
        .catch((err) => {
          setMapsLoaded(false);
          setMapsError(err.message || "Failed to load Google Maps");
        });
    }
  }, [apiKey]);

  function handleSaveKey(e) {
    e.preventDefault();
    if (!keyInput.trim()) return;
    const cleanKey = keyInput.trim();
    localStorage.setItem("google_maps_api_key", cleanKey);
    setApiKey(cleanKey);
  }

  function handleClearKey() {
    localStorage.removeItem("google_maps_api_key");
    setApiKey("");
    setMapsLoaded(false);
  }

  function handleOriginSelect(place) {
    setOriginPlace(place);
    if (onLocationsChange) {
      onLocationsChange({
        origin: [place.lat, place.lng],
        destination: destPlace ? [destPlace.lat, destPlace.lng] : null,
      });
    }
  }

  function handleDestSelect(place) {
    setDestPlace(place);
    if (onLocationsChange) {
      onLocationsChange({
        origin: originPlace ? [originPlace.lat, originPlace.lng] : null,
        destination: [place.lat, place.lng],
      });
    }
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (inputMode === "places") {
      if (!originPlace || !destPlace) {
        alert("Please select both a start location and destination from Google search.");
        return;
      }
      onSubmit({
        source: originPlace.coordsStr,
        destination: destPlace.coordsStr,
        vehicle_id: vehicleId,
        preset,
        departure_hour: departureHour,
        use_osm: true, // Real places use real OSM road network
      });
    } else {
      if (source === destination) {
        alert("Source and destination nodes must differ.");
        return;
      }
      onSubmit({
        source,
        destination,
        vehicle_id: vehicleId,
        preset,
        departure_hour: departureHour,
        use_osm: useOsm,
      });
    }
  }

  const hourLabel = `${String(departureHour).padStart(2, "0")}:00`;

  return (
    <form onSubmit={handleSubmit} className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.75rem",
        }}
      >
        <span className="card-title" style={{ margin: 0 }}>
          Route Planner
        </span>
      </div>

      {/* Mode toggle tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.25rem",
          background: "var(--slate-100)",
          padding: "3px",
          borderRadius: "6px",
          marginBottom: "0.75rem",
        }}
      >
        <button
          type="button"
          style={{
            flex: 1,
            padding: "0.35rem 0.5rem",
            fontSize: "0.75rem",
            fontWeight: 600,
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            background: inputMode === "places" ? "white" : "transparent",
            color: inputMode === "places" ? "var(--emerald-700)" : "var(--slate-600)",
            boxShadow:
              inputMode === "places" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
          }}
          onClick={() => setInputMode("places")}
        >
          📍 Google Search
        </button>
        <button
          type="button"
          style={{
            flex: 1,
            padding: "0.35rem 0.5rem",
            fontSize: "0.75rem",
            fontWeight: 600,
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            background: inputMode === "nodes" ? "white" : "transparent",
            color: inputMode === "nodes" ? "var(--emerald-700)" : "var(--slate-600)",
            boxShadow:
              inputMode === "nodes" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
          }}
          onClick={() => setInputMode("nodes")}
        >
          🔤 Demo Nodes (A–F)
        </button>
      </div>

      {/* ── Mode 1: Google Places Search ── */}
      {inputMode === "places" && (
        <div style={{ marginBottom: "0.75rem" }}>
          {!apiKey ? (
            <div
              style={{
                background: "#f8fafc",
                border: "1px dashed #cbd5e1",
                borderRadius: "8px",
                padding: "0.75rem",
                marginBottom: "0.75rem",
                fontSize: "0.75rem",
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--slate-700)", marginBottom: "0.3rem" }}>
                🔑 Enter Google Maps API Key
              </div>
              <p style={{ color: "var(--slate-500)", marginBottom: "0.5rem", fontSize: "0.7rem" }}>
                To enable live address and landmark autocomplete, enter your Google Maps API key (requires Places API enabled). It is stored securely in your browser's localStorage.
              </p>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  style={{
                    flex: 1,
                    fontSize: "0.75rem",
                    padding: "0.35rem 0.5rem",
                    border: "1px solid var(--slate-300)",
                    borderRadius: "4px",
                  }}
                />
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    background: "var(--emerald-600)",
                    color: "white",
                  }}
                  onClick={handleSaveKey}
                >
                  Activate
                </button>
              </div>
            </div>
          ) : (
            <>
              {mapsError ? (
                <div className="error-box" style={{ marginBottom: "0.5rem" }}>
                  ⚠ {mapsError}
                  <button
                    type="button"
                    onClick={handleClearKey}
                    style={{
                      display: "block",
                      marginTop: "0.3rem",
                      fontSize: "0.68rem",
                      background: "none",
                      border: "underline",
                      cursor: "pointer",
                      color: "inherit",
                    }}
                  >
                    Change API Key
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.68rem",
                    color: "var(--emerald-700)",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span>✓ Google Places API Active</span>
                  <button
                    type="button"
                    onClick={handleClearKey}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--slate-400)",
                      cursor: "pointer",
                      fontSize: "0.65rem",
                    }}
                  >
                    Change Key
                  </button>
                </div>
              )}

              <GooglePlacesInput
                label="Start Location (Origin)"
                placeholder="Search starting place, e.g. Airport, Station..."
                value={originPlace?.name}
                onSelectPlace={handleOriginSelect}
                disabled={!mapsLoaded}
              />
              <GooglePlacesInput
                label="Destination"
                placeholder="Search destination landmark, street..."
                value={destPlace?.name}
                onSelectPlace={handleDestSelect}
                disabled={!mapsLoaded}
              />
            </>
          )}
        </div>
      )}

      {/* ── Mode 2: Demo Nodes ── */}
      {inputMode === "nodes" && (
        <>
          <div className="field-row">
            <div className="field">
              <label>From</label>
              <select value={source} onChange={(e) => setSource(e.target.value)}>
                {DEFAULT_NODES.map((n) => (
                  <option key={n} value={n}>
                    Node {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>To</label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              >
                {DEFAULT_NODES.map((n) => (
                  <option key={n} value={n}>
                    Node {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            className="field"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <input
              id="use-osm"
              type="checkbox"
              style={{ width: "auto" }}
              checked={useOsm}
              onChange={(e) => setUseOsm(e.target.checked)}
            />
            <label
              htmlFor="use-osm"
              style={{ marginBottom: 0, cursor: "pointer", fontSize: "0.75rem" }}
            >
              Use real OSM road network
            </label>
          </div>
        </>
      )}

      {/* Vehicle Selection */}
      <div className="field">
        <label>Vehicle</label>
        <select
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
        >
          {vehicles.length > 0 ? (
            vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.fuel_type ?? v.type})
              </option>
            ))
          ) : (
            <>
              <option value="petrol_hatchback">Petrol Hatchback</option>
              <option value="diesel_suv">Diesel SUV</option>
              <option value="electric_sedan">Electric Sedan</option>
            </>
          )}
        </select>
      </div>

      {/* Optimization Preset */}
      <div className="field">
        <label>Optimisation Preset</label>
        <select value={preset} onChange={(e) => setPreset(e.target.value)}>
          {presets.length > 0 ? (
            presets.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name} — {p.description}
              </option>
            ))
          ) : (
            <>
              <option value="eco">eco — minimise CO₂</option>
              <option value="fastest">fastest — minimise time</option>
              <option value="balanced">balanced — blend both</option>
            </>
          )}
        </select>
      </div>

      {/* Departure Hour */}
      <div className="field">
        <label>Departure time: {hourLabel}</label>
        <input
          type="range"
          min={0}
          max={23}
          value={departureHour}
          onChange={(e) => setDepartureHour(Number(e.target.value))}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.65rem",
            color: "var(--slate-400)",
            marginTop: "2px",
          }}
        >
          <span>00:00</span>
          <span>12:00</span>
          <span>23:00</span>
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading && <span className="spinner" />}
        {loading ? "Optimising…" : "Find Eco Routes"}
      </button>
    </form>
  );
}
