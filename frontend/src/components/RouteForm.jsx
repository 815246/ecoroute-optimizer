/**
 * RouteForm – collects source, destination, vehicle, preset, departure hour.
 * Always displays clean location names (never raw coordinates/float numbers).
 */
import React, { useState, useEffect } from "react";
import { getVehicles, getPresets } from "../services/api";
import LocationSearchInput from "./LocationSearchInput";
import { Zap, Search } from "lucide-react";

const DEFAULT_NODES = [
  { id: "A", name: "Node A (Doranda)" },
  { id: "B", name: "Node B (Hinoo)" },
  { id: "C", name: "Node C (Kadru)" },
  { id: "D", name: "Node D (Harmu)" },
  { id: "E", name: "Node E (Bariatu)" },
  { id: "F", name: "Node F (Morabadi)" },
];

export default function RouteForm({
  onSubmit,
  loading,
  sourceCoord,
  destCoord,
  activeMapTarget,
  setActiveMapTarget,
}) {
  const [inputMode, setInputMode] = useState("search"); // "search" | "nodes"
  const [sourceNode, setSourceNode] = useState("A");
  const [destNode, setDestNode] = useState("E");

  // Search mode names & coordinates
  const [sourceName, setSourceName] = useState("Birsa Munda Airport, Ranchi");
  const [sourceCoords, setSourceCoords] = useState("23.3144, 85.3216");

  const [destName, setDestName] = useState("Ranchi Railway Station");
  const [destCoords, setDestCoords] = useState("23.3486, 85.3341");

  const [vehicleId, setVehicleId] = useState("petrol_hatchback");
  const [preset, setPreset] = useState("eco");
  const [departureHour, setDepartureHour] = useState(8);
  const [useOsm, setUseOsm] = useState(true);

  const [vehicles, setVehicles] = useState([]);
  const [presets, setPresets] = useState([]);

  // Reverse geocode when clicked on the map so a real location name appears
  useEffect(() => {
    if (!sourceCoord) return;
    const [lat, lon] = sourceCoord;
    setSourceCoords(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
    setUseOsm(true);
    setInputMode("search");

    fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`)
      .then((res) => res.json())
      .then((data) => {
        const p = data.features?.[0]?.properties || {};
        const nameParts = [p.name || p.street, p.district || p.locality, p.city].filter(
          Boolean
        );
        const resolvedName = nameParts.slice(0, 2).join(", ");
        setSourceName(resolvedName || "Selected Map Location");
      })
      .catch(() => {
        setSourceName("Selected Map Location");
      });
  }, [sourceCoord]);

  useEffect(() => {
    if (!destCoord) return;
    const [lat, lon] = destCoord;
    setDestCoords(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
    setUseOsm(true);
    setInputMode("search");

    fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`)
      .then((res) => res.json())
      .then((data) => {
        const p = data.features?.[0]?.properties || {};
        const nameParts = [p.name || p.street, p.district || p.locality, p.city].filter(
          Boolean
        );
        const resolvedName = nameParts.slice(0, 2).join(", ");
        setDestName(resolvedName || "Selected Destination");
      })
      .catch(() => {
        setDestName("Selected Destination");
      });
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

    let finalSource = sourceNode;
    let finalDest = destNode;
    let finalSourceName = `Node ${sourceNode}`;
    let finalDestName = `Node ${destNode}`;

    if (inputMode === "search") {
      finalSource = sourceCoords || sourceName;
      finalDest = destCoords || destName;
      finalSourceName = sourceName || "Origin";
      finalDestName = destName || "Destination";

      if (!finalSource || !finalDest) {
        alert("Please enter both a starting location and destination.");
        return;
      }
    }

    if (finalSource === finalDest) {
      alert("Source and destination must be different locations.");
      return;
    }

    onSubmit({
      source: finalSource,
      destination: finalDest,
      sourceName: finalSourceName,
      destName: finalDestName,
      vehicle_id: vehicleId,
      preset,
      departure_hour: departureHour,
      use_osm: inputMode === "search" ? true : useOsm,
    });
  }

  const hourLabel = `${String(departureHour).padStart(2, "0")}:00`;

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="card-title">Route Planner</div>

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
                  displayValue={sourceName}
                  placeholder="e.g. Birsa Munda Airport, Ranchi"
                  onSelectLocation={(item) => {
                    setSourceName(item.name);
                    setSourceCoords(item.coordStr);
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
                  displayValue={destName}
                  placeholder="e.g. Ranchi Railway Station"
                  onSelectLocation={(item) => {
                    setDestName(item.name);
                    setDestCoords(item.coordStr);
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
            <select
              value={sourceNode}
              onChange={(e) => setSourceNode(e.target.value)}
            >
              {DEFAULT_NODES.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>To Node</label>
            <select
              value={destNode}
              onChange={(e) => setDestNode(e.target.value)}
            >
              {DEFAULT_NODES.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
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
