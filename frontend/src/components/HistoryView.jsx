/**
 * HistoryView – lists past journeys fetched from GET /api/history.
 */
import React, { useEffect, useState } from "react";
import { getHistory } from "../services/api";

export default function HistoryView() {
  const [journeys, setJourneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getHistory(50)
      .then((d) => setJourneys(d.journeys ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "2rem", color: "var(--slate-500)" }}>
        Loading history…
      </div>
    );
  }

  if (error) {
    return <div className="error-box" style={{ margin: "1rem" }}>⚠ {error}</div>;
  }

  if (journeys.length === 0) {
    return (
      <div style={{ padding: "2rem", color: "var(--slate-500)" }}>
        No journeys planned yet. Use <strong>Plan Route</strong> to get started.
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem", overflowX: "auto" }}>
      <h2
        style={{
          fontSize: "1rem",
          fontWeight: 600,
          color: "var(--slate-700)",
          marginBottom: "1rem",
        }}
      >
        Journey History
      </h2>
      <table className="history-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Source</th>
            <th>Destination</th>
            <th>Vehicle</th>
            <th>Preset</th>
            <th>Routes found</th>
            <th>Best CO₂ (kg)*</th>
            <th>Best time (min)</th>
            <th>Planned at</th>
          </tr>
        </thead>
        <tbody>
          {journeys.map((j, i) => (
            <tr key={j.id ?? i}>
              <td>{i + 1}</td>
              <td>{j.source}</td>
              <td>{j.destination}</td>
              <td>{j.vehicle_id}</td>
              <td>{j.preset ?? "—"}</td>
              <td>{j.routes_count ?? (j.routes ?? []).length}</td>
              <td>
                {j.best_co2_kg != null
                  ? Number(j.best_co2_kg).toFixed(3)
                  : "—"}
              </td>
              <td>
                {j.best_time_min != null
                  ? Number(j.best_time_min).toFixed(1)
                  : "—"}
              </td>
              <td style={{ whiteSpace: "nowrap", color: "var(--slate-400)" }}>
                {j.created_at
                  ? new Date(j.created_at).toLocaleString()
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p
        style={{
          fontSize: "0.65rem",
          color: "var(--slate-400)",
          marginTop: "0.5rem",
        }}
      >
        * Tailpipe / grid-average CO₂ estimate. Traffic: simulated, not live.
        Savings relative to fastest-route baseline.
      </p>
    </div>
  );
}

