/**
 * RouteForm – collects source, destination, vehicle, preset, departure hour.
 * Supports:
 *   1. Quick demo nodes (A through F in Ranchi)
 *   2. Free location search (Photon / OpenStreetMap autocomplete)
 *   3. Interactive map-click coordinate selection
 */
import React, { useState, useEffect } from "react";
import { getVehicles, getPresets } from "../services/api";
import LocationSearchInput from "./LocationSearchInput";
import { Zap, Search, MapPin } from "lucide-react";

const DEFAULT_NODES = ["A", "B", "C", "D", "E", "F"];

export default function RouteForm({
  onSubmit,
  loading,
  sourceCoord,
  destCoord,
  activeMapTarget,
  setActiveMapTarget,
}) {
  const [inputMode, setInputMode] = useState("search"); // "search" | "nodes"
  const [source, setSource] = useState("A");
  const [destination, setDestination] = useState("E");

  // Search mode state
  const [sourceLabel, setSourceLabel] = useState("Birsa Munda Airport, Ranchi");
  const [sourceValue, setSourceValue] = useState("23.3144, 85.3216");
  const [destLabel, setDestLabel] = useState("Ranchi Railway Station");
  const [destValue, setDestValue] = useState("23.3486, 85.3341");

  const [vehicleId, setVehicleId] = useState("petrol_hatchback");
  const [preset, setPreset] = useState("eco");
  const [departureHour, setDepartureHour] = useState(8);
  const [useOsm, setUseOsm] = useState(true);

  const [vehicles, setVehicles] = useState([]);
  const [presets, setPresets] = useState([]);

  // Sync coordinates when user clicks the map
  useEffect(() => {
    if (sourceCoord) {
      const coordStr = `${sourceCoord[0].toFixed(5)}, ${sourceCoord[1].toFixed(5)}`;
      setSourceValue(coordStr);
      setSourceLabel(`Map Point (${coordStr})`);
      setUseOsm(true);
      setInputMode("search");
    }
  }, [sourceCoord]);

  useEffect(() => {
    if (destCoord) {
      const coordStr = `${destCoord[0].toFixed(5)}, ${destCoord[1].toFixed(5)}`;
      setDestValue(coordStr);
      setDestLabel(`Map Point (${coordStr})`);
      setUseOsm(true);
      setInputMode("search");
    }
  }, [destCoord]);

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

  function handleSubmit(e) {
    e.preventDefault();

    let finalSource = source;
    let finalDest = destination;

    if (inputMode === "search") {
      finalSource = sourceValue || sourceLabel;
      finalDest = destValue || destLabel;
      if (!finalSource || !finalDest) {
        alert("Please specify both a starting point and destination.");
        return;
      }
    }

    if (finalSource === finalDest) {
      alert("Source and destination must differ.");
      return;
    }

    onSubmit({
      source: finalSource,
      destination: finalDest,
      vehicle_id: vehicleId,
      preset,
      departure_hour: departureHour,
      use_osm: inputMode === "search" ? true : useOsm,
    });
  }

  const hourLabel = `${String(departureHour).padStart(2, "0")}:00`;

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Route Planner</span>
        <span style={{ fontSize: "0.68rem", textTransform: "none", color: "var(--slate-400)" }}>
          Free OSM Search Enabled
        </span>
      </div>

      {/* Mode Switcher Tabs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          background: "var(--slate-100)",
          padding: "3px",
          borderRadius: "7px",
          marginBottom: "12px",
          gap: "4px",
        }}
      >
        <button
          type="button"
          onClick={() => setInputMode("search")}
          style={{
            padding: "5px 8px",
            fontSize: "0.75rem",
            fontWeight: 600,
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            background: inputMode === "search" ? "white" : "transparent",
            color: inputMode === "search" ? "var(--emerald-700)" : "var(--slate-600)",
            boxShadow: inputMode === "search" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
          }}
        >
          <Search size={13} />
          Search Places
        </button>
        <button
          type="button"
          onClick={() => {
            setInputMode("nodes");
            setUseOsm(false);
          }}
          style={{
            padding: "5px 8px",
            fontSize: "0.75rem",
            fontWeight: 600,
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            background: inputMode === "nodes" ? "white" : "transparent",
            color: inputMode === "nodes" ? "var(--emerald-700)" : "var(--slate-600)",
            boxShadow: inputMode === "nodes" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
          }}
        >
          <Zap size={13} />
          Quick Nodes (A–F)
        </button>
      </div>

      {/* Inputs: Search Mode */}
      {inputMode === "search" ? (
        <>
          <div style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", gap: "6px", alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <LocationSearchInput
                  label="From (Origin)"
                  displayLabel={sourceLabel}
                  value={sourceValue}
                  placeholder="e.g. Birsa Munda Airport, Ranchi"
                  onChange={(val) => {
                    setSourceLabel(val);
                    setSourceValue(val);
                  }}
                  onSelectCoordinate={(item) => {
                    setSourceLabel(item.name);
                    setSourceValue(item.coordStr);
                  }}
                />
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setActiveMapTarget("start")}
                title="Click on the map to set Start"
                style={{
                  height: "36px",
                  padding: "0 8px",
                  fontSize: "0.7rem",
                  borderColor: activeMapTarget === "start" ? "var(--emerald-600)" : "var(--slate-300)",
                  background: activeMapTarget === "start" ? "var(--emerald-50)" : "white",
                  color: activeMapTarget === "start" ? "var(--emerald-700)" : "var(--slate-600)",
                  fontWeight: activeMapTarget === "start" ? 700 : 500,
                }}
              >
                📍 Pin
              </button>
            </div>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <div style={{ display: "flex", gap: "6px", alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <LocationSearchInput
                  label="To (Destination)"
                  displayLabel={destLabel}
                  value={destValue}
                  placeholder="e.g. Ranchi Railway Station"
                  onChange={(val) => {
                    setDestLabel(val);
                    setDestValue(val);
                  }}
                  onSelectCoordinate={(item) => {
                    setDestLabel(item.name);
                    setDestValue(item.coordStr);
                  }}
                />
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setActiveMapTarget("end")}
                title="Click on the map to set Destination"
                style={{
                  height: "36px",
                  padding: "0 8px",
                  fontSize: "0.7rem",
                  borderColor: activeMapTarget === "end" ? "#dc2626" : "var(--slate-300)",
                  background: activeMapTarget === "end" ? "#fee2e2" : "white",
                  color: activeMapTarget === "end" ? "#dc2626" : "var(--slate-600)",
                  fontWeight: activeMapTarget === "end" ? 700 : 500,
                }}
              >
                🏁 Pin
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Inputs: Quick Nodes Mode */
        <div className="field-row">
          <div className="field">
            <label>From Node</label>
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              {DEFAULT_NODES.map((n) => (
                <option key={n} value={n}>
                  Node {n}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>To Node</label>
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
      )}

      {/* Vehicle Selection */}
      <div className="field">
        <label>Vehicle Profile</label>
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
              <option value="petrol_hatchback">Petrol Hatchback (Swift)</option>
              <option value="diesel_suv">Diesel SUV (Scorpio)</option>
              <option value="electric_sedan">Electric Sedan (Nexon EV)</option>
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
                {p.name.toUpperCase()} — {p.description}
              </option>
            ))
          ) : (
            <>
              <option value="eco">ECO — minimise CO₂ emissions</option>
              <option value="fastest">FASTEST — minimise travel time</option>
              <option value="balanced">BALANCED — blend CO₂ and time</option>
            </>
          )}
        </select>
      </div>

      {/* Departure Hour Slider */}
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

      {/* Real OSM Checkbox (only in nodes mode) */}
      {inputMode === "nodes" && (
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
            Use real OpenStreetMap network
          </label>
        </div>
      )}

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading && <span className="spinner" />}
        {loading ? "Optimising Routes…" : "Find Eco Routes"}
      </button>
    </form>
  );
}
