/**
 * RouteForm – collects origin, destination, vehicle, preset, custom weights, departure hour.
 * Always displays clean, human-readable place names with search, map-pin, and swap support.
 */
import React, { useState, useEffect } from "react";
import { getVehicles, getPresets } from "../services/api";
import LocationSearchInput from "./LocationSearchInput";
import { ArrowUpDown, Sliders, Leaf, Clock, MapPin, Gauge } from "lucide-react";

export default function RouteForm({
  onSubmit,
  loading,
  sourceCoord,
  destCoord,
  onStartPointChange,
  onEndPointChange,
  onLocationNamesChange,
  activeMapTarget,
  setActiveMapTarget,
  onSwapCoords,
}) {
  // Origin & Destination names + coordinates
  const [sourceName, setSourceName] = useState("");
  const [sourceCoords, setSourceCoords] = useState("");

  const [destName, setDestName] = useState("");
  const [destCoords, setDestCoords] = useState("");

  const [vehicleId, setVehicleId] = useState("petrol_hatchback");
  const [preset, setPreset] = useState("eco");
  const [departureHour, setDepartureHour] = useState(8);

  // Custom multi-objective weights
  const [customWeights, setCustomWeights] = useState({
    time: 25,
    distance: 25,
    resource: 25,
    emissions: 25,
  });

  const [vehicles, setVehicles] = useState([]);
  const [presets, setPresets] = useState([]);

  // Reverse geocode when clicked on the map so a real location name appears
  useEffect(() => {
    if (!sourceCoord) return;
    let cancelled = false;
    const [lat, lon] = sourceCoord;
    setSourceCoords(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);

    fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const p = data.features?.[0]?.properties || {};
        const nameParts = [p.name || p.street, p.district || p.locality, p.city].filter(
          Boolean
        );
        const resolvedName = nameParts.slice(0, 2).join(", ");
        setSourceName(resolvedName || "Selected Map Location");
      })
      .catch(() => {
        if (!cancelled) setSourceName("Selected Map Location");
      });
    return () => {
      cancelled = true;
    };
  }, [sourceCoord]);

  useEffect(() => {
    if (!destCoord) return;
    let cancelled = false;
    const [lat, lon] = destCoord;
    setDestCoords(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);

    fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const p = data.features?.[0]?.properties || {};
        const nameParts = [p.name || p.street, p.district || p.locality, p.city].filter(
          Boolean
        );
        const resolvedName = nameParts.slice(0, 2).join(", ");
        setDestName(resolvedName || "Selected Destination");
      })
      .catch(() => {
        if (!cancelled) setDestName("Selected Destination");
      });
    return () => {
      cancelled = true;
    };
  }, [destCoord]);

  useEffect(() => {
    onLocationNamesChange?.({ sourceName, destName });
  }, [sourceName, destName, onLocationNamesChange]);

  useEffect(() => {
    getVehicles()
      .then((d) => {
        const vs = d.vehicles ?? [];
        setVehicles(vs);
        if (vs.length > 0) setVehicleId(vs[0].id);
      })
      .catch(() => { });
    getPresets()
      .then((d) => setPresets(d.presets ?? []))
      .catch(() => { });
  }, []);

  const handleSwap = () => {
    const tempName = sourceName;
    const tempCoords = sourceCoords;
    setSourceName(destName);
    setSourceCoords(destCoords);
    setDestName(tempName);
    setDestCoords(tempCoords);

    if (onSwapCoords) {
      onSwapCoords();
    }
  };

  const handleWeightChange = (key, val) => {
    setCustomWeights((prev) => ({
      ...prev,
      [key]: Math.max(0, parseInt(val, 10) || 0),
    }));
  };

  const totalRawWeight =
    customWeights.time +
    customWeights.distance +
    customWeights.resource +
    customWeights.emissions || 1;

  const normalizedWeights = {
    time: Number((customWeights.time / totalRawWeight).toFixed(3)),
    distance: Number((customWeights.distance / totalRawWeight).toFixed(3)),
    resource: Number((customWeights.resource / totalRawWeight).toFixed(3)),
    emissions: Number((customWeights.emissions / totalRawWeight).toFixed(3)),
  };

  function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;

    const finalSource = sourceCoords || sourceName;
    const finalDest = destCoords || destName;
    const finalSourceName = sourceName || "Origin";
    const finalDestName = destName || "Destination";

    if (!finalSource || !finalDest) {
      alert("Please enter both an origin location and destination.");
      return;
    }

    if (finalSource.trim().toLowerCase() === finalDest.trim().toLowerCase()) {
      alert("Origin and destination must be different locations.");
      return;
    }

    const payloadWeights = preset === "custom" ? normalizedWeights : preset;

    onSubmit({
      source: finalSource,
      destination: finalDest,
      sourceName: finalSourceName,
      destName: finalDestName,
      vehicle_id: vehicleId,
      preset,
      weights: payloadWeights,
      departure_hour: departureHour,
      use_osm: true,
    });
  }

  const hourLabel = `${String(departureHour).padStart(2, "0")}:00`;

  return (
    <form onSubmit={handleSubmit} className="card" style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
      <div className="card-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>Smart Route Planner</span>
        <span style={{ fontSize: "0.68rem", color: "var(--emerald-600)", fontWeight: 700, textTransform: "none" }}>
          🌱 Eco-Optimized
        </span>
      </div>

      {/* Origin Input */}
      <div style={{ marginBottom: "6px" }}>
        <div style={{ display: "flex", gap: "6px", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <LocationSearchInput
              label="From (Origin)"
              value={sourceCoords}
              displayLabel={sourceName}
              placeholder="Search airport, station, landmark, or street..."
              onChange={(query) => {
                setSourceName(query);
                setSourceCoords("");
                onStartPointChange?.(null);
              }}
              onSelectCoordinate={(item) => {
                setSourceName(item.name);
                setSourceCoords(item.coordStr);
                onStartPointChange?.([item.lat, item.lon]);
              }}
            />
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setActiveMapTarget("start")}
            title="Click anywhere on the map to set Start"
            style={{
              height: "36px",
              padding: "0 8px",
              fontSize: "0.72rem",
              borderColor: activeMapTarget === "start" ? "var(--emerald-600)" : "var(--slate-300)",
              background: activeMapTarget === "start" ? "var(--emerald-50)" : "white",
              color: activeMapTarget === "start" ? "var(--emerald-700)" : "var(--slate-600)",
              fontWeight: activeMapTarget === "start" ? 700 : 500,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <MapPin size={13} color="#059669" />
            Pin A
          </button>
        </div>
      </div>

      {/* Swap Button */}
      <div style={{ display: "flex", justifyContent: "center", margin: "2px 0 6px 0" }}>
        <button
          type="button"
          onClick={handleSwap}
          className="btn btn-ghost btn-sm"
          title="Swap Origin and Destination"
          style={{
            padding: "2px 12px",
            fontSize: "0.7rem",
            color: "var(--slate-600)",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            borderRadius: "999px",
            background: "var(--slate-100)",
            border: "1px solid var(--slate-200)",
          }}
        >
          <ArrowUpDown size={12} />
          <span>Swap Origin & Destination</span>
        </button>
      </div>

      {/* Destination Input */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", gap: "6px", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <LocationSearchInput
              label="To (Destination)"
              value={destCoords}
              displayLabel={destName}
              placeholder="Search destination landmark, street, or city..."
              onChange={(query) => {
                setDestName(query);
                setDestCoords("");
                onEndPointChange?.(null);
              }}
              onSelectCoordinate={(item) => {
                setDestName(item.name);
                setDestCoords(item.coordStr);
                onEndPointChange?.([item.lat, item.lon]);
              }}
            />
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setActiveMapTarget("end")}
            title="Click anywhere on the map to set Destination"
            style={{
              height: "36px",
              padding: "0 8px",
              fontSize: "0.72rem",
              borderColor: activeMapTarget === "end" ? "#dc2626" : "var(--slate-300)",
              background: activeMapTarget === "end" ? "#fee2e2" : "white",
              color: activeMapTarget === "end" ? "#dc2626" : "var(--slate-600)",
              fontWeight: activeMapTarget === "end" ? 700 : 500,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <MapPin size={13} color="#dc2626" />
            Pin B
          </button>
        </div>
      </div>

      {/* Vehicle Selection */}
      <div className="field">
        <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <Gauge size={13} />
          Vehicle Profile
        </label>
        <select
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
          style={{ fontWeight: 500 }}
        >
          {vehicles.length > 0 ? (
            vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.fuel_type === "electric" ? `${v.energy_rate_kwh_per_100km || 15} kWh/100km` : `${v.fuel_efficiency_kmpl || 18} km/L`})
              </option>
            ))
          ) : (
            <>
              <option value="petrol_hatchback">Petrol Hatchback (20 km/L)</option>
              <option value="diesel_suv">Diesel SUV (14.5 km/L)</option>
              <option value="electric_car">Electric Car (15 kWh/100km, 0 tailpipe)</option>
              <option value="diesel_delivery_van">Diesel Delivery Van (11.5 km/L)</option>
            </>
          )}
        </select>
      </div>

      {/* Optimization Preset */}
      <div className="field">
        <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <Sliders size={13} />
          Optimization Goal
        </label>
        <select
          value={preset}
          onChange={(e) => setPreset(e.target.value)}
          style={{ fontWeight: 500 }}
        >
          <option value="eco">🌱 Eco-Friendly Route — Minimise CO₂ emissions</option>
          <option value="fastest">⚡ Fastest Route — Minimise travel time</option>
          <option value="shortest">📏 Shortest Route — Minimise physical distance</option>
          <option value="balanced">⚖️ Balanced Route — Blend CO₂ emissions and travel time</option>
          <option value="custom">🎛️ Custom Multi-Objective Weights…</option>
        </select>
      </div>

      {/* Custom Sliders (Only if Custom is selected) */}
      {preset === "custom" && (
        <div
          style={{
            background: "var(--slate-50)",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid var(--slate-200)",
            marginBottom: "12px",
          }}
        >
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--slate-700)", marginBottom: "8px" }}>
            Fine-Tune Objective Weights:
          </div>

          <div style={{ marginBottom: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--slate-600)" }}>
              <span>Travel Time Weight</span>
              <strong>{Math.round(normalizedWeights.time * 100)}%</strong>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={customWeights.time}
              onChange={(e) => handleWeightChange("time", e.target.value)}
            />
          </div>

          <div style={{ marginBottom: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--slate-600)" }}>
              <span>Distance Weight</span>
              <strong>{Math.round(normalizedWeights.distance * 100)}%</strong>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={customWeights.distance}
              onChange={(e) => handleWeightChange("distance", e.target.value)}
            />
          </div>

          <div style={{ marginBottom: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--slate-600)" }}>
              <span>Fuel / Energy Weight</span>
              <strong>{Math.round(normalizedWeights.resource * 100)}%</strong>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={customWeights.resource}
              onChange={(e) => handleWeightChange("resource", e.target.value)}
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--slate-600)" }}>
              <span>CO₂ Emissions Weight</span>
              <strong style={{ color: "var(--emerald-600)" }}>{Math.round(normalizedWeights.emissions * 100)}%</strong>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={customWeights.emissions}
              onChange={(e) => handleWeightChange("emissions", e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Departure Hour Slider */}
      <div className="field">
        <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Clock size={13} />
            Departure Time
          </span>
          <span style={{ fontWeight: 700, color: "var(--emerald-700)" }}>{hourLabel}</span>
        </label>
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
          <span>00:00 (Night)</span>
          <span>08:00 (Rush)</span>
          <span>14:00 (Midday)</span>
          <span>23:00</span>
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={loading}
        style={{
          boxShadow: "0 2px 6px rgba(5, 150, 105, 0.3)",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
        }}
      >
        {loading ? (
          <>
            <span className="spinner" />
            <span>Finding Eco Routes…</span>
          </>
        ) : (
          <>
            <Leaf size={16} />
            <span>Find Eco Routes</span>
          </>
        )}
      </button>
    </form>
  );
}
