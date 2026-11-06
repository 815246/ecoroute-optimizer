/**
 * RouteForm – collects source, destination, vehicle, preset, departure hour.
 * No LLM calls; all data fetched from the backend REST API.
 */
import React, { useState, useEffect } from "react";
import { getVehicles, getPresets } from "../services/api";

const DEFAULT_NODES = ["A", "B", "C", "D", "E", "F"];

export default function RouteForm({ onSubmit, loading }) {
  const [source, setSource] = useState("A");
  const [destination, setDestination] = useState("E");
  const [vehicleId, setVehicleId] = useState("petrol_hatchback");
  const [preset, setPreset] = useState("eco");
  const [departureHour, setDepartureHour] = useState(8);
  const [useOsm, setUseOsm] = useState(false);

  const [vehicles, setVehicles] = useState([]);
  const [presets, setPresets] = useState([]);

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
    if (source === destination) {
      alert("Source and destination must differ.");
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

  const hourLabel = `${String(departureHour).padStart(2, "0")}:00`;

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="card-title">Route Planner</div>

      <div className="field-row">
        <div className="field">
          <label>From</label>
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            {DEFAULT_NODES.map((n) => (
              <option key={n} value={n}>
                {n}
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
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

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
          style={{ marginBottom: 0, cursor: "pointer" }}
        >
          Use real OSM graph (slower)
        </label>
      </div>

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading && <span className="spinner" />}
        {loading ? "Optimising…" : "Find Eco Routes"}
      </button>
    </form>
  );
}
