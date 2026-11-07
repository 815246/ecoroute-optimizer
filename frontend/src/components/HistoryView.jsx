/**
 * HistoryView – Journey history table with detailed inspection, comparison, and deletion.
 * Implements Phase 8 (History, persistence, deletion, and cross-journey comparison).
 */
import React, { useEffect, useState } from "react";
import { getHistory, deleteJourney, clearHistory, getJourney } from "../services/api";
import {
  History,
  Trash2,
  Eye,
  ArrowRight,
  GitCompare,
  RotateCcw,
  CheckCircle,
  X,
  MapPin,
  Clock,
  Leaf,
} from "lucide-react";

export default function HistoryView({ onLoadJourney }) {
  const [journeys, setJourneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [detailModalJourney, setDetailModalJourney] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [compareData, setCompareData] = useState(null);

  const loadHistory = () => {
    setLoading(true);
    getHistory(50)
      .then((d) => setJourneys(d.journeys ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDeleteOne = async (journeyId, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete journey #${journeyId}?`)) return;
    try {
      await deleteJourney(journeyId);
      setJourneys((prev) => prev.filter((j) => (j.journey_id ?? j.id) !== journeyId));
      setSelectedIds((prev) => prev.filter((id) => id !== journeyId));
    } catch (err) {
      alert("Failed to delete journey: " + (err.message || "Unknown error"));
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear all journey history?")) return;
    try {
      await clearHistory();
      setJourneys([]);
      setSelectedIds([]);
    } catch (err) {
      alert("Failed to clear history: " + (err.message || "Unknown error"));
    }
  };

  const handleViewDetails = async (journeyId) => {
    setDetailLoading(true);
    try {
      const data = await getJourney(journeyId);
      setDetailModalJourney(data);
    } catch (err) {
      alert("Could not load journey details: " + err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleSelectJourney = (journeyId) => {
    setSelectedIds((prev) => {
      if (prev.includes(journeyId)) {
        return prev.filter((id) => id !== journeyId);
      }
      if (prev.length >= 2) {
        return [prev[1], journeyId];
      }
      return [...prev, journeyId];
    });
  };

  const handleCompareSelected = () => {
    if (selectedIds.length !== 2) {
      alert("Please select exactly 2 journeys to compare.");
      return;
    }
    const j1 = journeys.find((j) => (j.journey_id ?? j.id) === selectedIds[0]);
    const j2 = journeys.find((j) => (j.journey_id ?? j.id) === selectedIds[1]);
    setCompareData({ j1, j2 });
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1100px", margin: "0 auto" }}>
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--slate-800)", display: "flex", alignItems: "center", gap: "8px" }}>
            <History size={20} color="#059669" />
            <span>Journey Planning History</span>
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--slate-500)", marginTop: "2px" }}>
            Review past optimized routes, inspect details, compare previous journeys, or manage database records.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {selectedIds.length === 2 && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleCompareSelected}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
            >
              <GitCompare size={14} />
              Compare Selected (2)
            </button>
          )}

          {journeys.length > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleClearAll}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#dc2626", borderColor: "#fecaca" }}
            >
              <Trash2 size={14} />
              Clear All History
            </button>
          )}

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={loadHistory}
            title="Refresh history"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--slate-500)" }}>
          <span className="spinner" style={{ borderColor: "#059669", borderTopColor: "transparent" }} />
          Loading historical journeys…
        </div>
      )}

      {error && (
        <div className="error-box" style={{ marginBottom: "16px" }}>
          ⚠ {error}
        </div>
      )}

      {!loading && journeys.length === 0 && (
        <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
          <Leaf size={32} color="#059669" style={{ margin: "0 auto 12px auto" }} />
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--slate-700)" }}>
            No Saved Journeys Yet
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--slate-500)", marginTop: "4px" }}>
            When you search and plan routes in the <strong>Plan Route</strong> tab, your optimization sessions will be archived here.
          </p>
        </div>
      )}

      {!loading && journeys.length > 0 && (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="history-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: "40px", textAlign: "center" }}>Select</th>
                <th>#</th>
                <th>Origin (From)</th>
                <th>Destination (To)</th>
                <th>Mode</th>
                <th>Routes</th>
                <th>Best Distance</th>
                <th>Best Time</th>
                <th>Best CO₂</th>
                <th>Date & Time</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {journeys.map((j, i) => {
                const jId = j.journey_id ?? j.id;
                const isSelected = selectedIds.includes(jId);
                return (
                  <tr
                    key={jId ?? i}
                    style={{
                      background: isSelected ? "var(--emerald-50)" : undefined,
                    }}
                  >
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectJourney(jId)}
                        style={{ cursor: "pointer" }}
                      />
                    </td>
                    <td><strong>#{jId}</strong></td>
                    <td style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={j.source}>
                      {j.source}
                    </td>
                    <td style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={j.destination}>
                      {j.destination}
                    </td>
                    <td>
                      <span className="badge" style={{ background: "var(--slate-100)", color: "var(--slate-600)" }}>
                        {j.data_mode || "simulated"}
                      </span>
                    </td>
                    <td>{j.routes_count ?? "1"}</td>
                    <td>{j.distance_km != null ? `${Number(j.distance_km).toFixed(1)} km` : "—"}</td>
                    <td>{j.travel_time_min != null ? `${Number(j.travel_time_min).toFixed(1)} min` : "—"}</td>
                    <td style={{ color: "var(--emerald-700)", fontWeight: 700 }}>
                      {j.co2_kg != null ? `${Number(j.co2_kg).toFixed(3)} kg` : "—"}
                    </td>
                    <td style={{ whiteSpace: "nowrap", color: "var(--slate-500)", fontSize: "0.72rem" }}>
                      {j.created_at ? new Date(j.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "—"}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleViewDetails(jId)}
                        title="View route breakdown details"
                        style={{ padding: "3px 7px", marginRight: "4px" }}
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => handleDeleteOne(jId, e)}
                        title="Delete this journey"
                        style={{ padding: "3px 7px", color: "#dc2626" }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Journey Details Modal ── */}
      {detailModalJourney && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              maxWidth: "680px",
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--slate-200)", paddingBottom: "12px" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--slate-800)" }}>
                  Journey #{detailModalJourney.journey_id} Details
                </h3>
                <span style={{ fontSize: "0.75rem", color: "var(--slate-500)" }}>
                  Created: {detailModalJourney.created_at ? new Date(detailModalJourney.created_at).toLocaleString() : "—"}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setDetailModalJourney(null)}
                style={{ padding: "4px 8px" }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ background: "var(--slate-50)", padding: "12px", borderRadius: "8px", marginBottom: "16px", fontSize: "0.82rem" }}>
              <div><strong>From:</strong> {detailModalJourney.source}</div>
              <div style={{ marginTop: "4px" }}><strong>To:</strong> {detailModalJourney.destination}</div>
              <div style={{ marginTop: "4px" }}><strong>Data Mode:</strong> {detailModalJourney.data_mode}</div>
            </div>

            <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "8px" }}>
              Saved Routes ({detailModalJourney.routes?.length || 0}):
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(detailModalJourney.routes || []).map((r, rIdx) => (
                <div
                  key={rIdx}
                  style={{
                    border: "1px solid var(--slate-200)",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    background: "white",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "0.85rem", color: "var(--slate-800)" }}>
                    <span>{r.name || `Route ${rIdx + 1}`}</span>
                    <span style={{ color: "var(--emerald-700)" }}>{r.co2_kg?.toFixed(3)} kg CO₂</span>
                  </div>
                  <div style={{ display: "flex", gap: "16px", marginTop: "6px", fontSize: "0.75rem", color: "var(--slate-500)" }}>
                    <span>Distance: <strong>{r.distance_km?.toFixed(2)} km</strong></span>
                    <span>Time: <strong>{r.travel_time_min?.toFixed(1)} min</strong></span>
                    {r.fuel_liters > 0 && <span>Fuel: <strong>{r.fuel_liters.toFixed(2)} L</strong></span>}
                    {r.energy_kwh > 0 && <span>Energy: <strong>{r.energy_kwh.toFixed(1)} kWh</strong></span>}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setDetailModalJourney(null)}
                style={{ width: "auto", padding: "8px 20px" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Journey Comparison Modal ── */}
      {compareData && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              maxWidth: "760px",
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--slate-200)", paddingBottom: "12px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--slate-800)", display: "flex", alignItems: "center", gap: "8px" }}>
                <GitCompare size={18} color="#059669" />
                Cross-Journey Comparison
              </h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setCompareData(null)}
                style={{ padding: "4px 8px" }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ border: "1.5px solid var(--emerald-500)", borderRadius: "8px", padding: "16px", background: "var(--emerald-50)" }}>
                <div style={{ fontWeight: 800, fontSize: "1rem", color: "#065f46" }}>
                  Journey A (#{compareData.j1.journey_id ?? compareData.j1.id})
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--slate-600)", marginTop: "6px" }}>
                  <strong>From:</strong> {compareData.j1.source}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--slate-600)", marginTop: "2px" }}>
                  <strong>To:</strong> {compareData.j1.destination}
                </div>
                <div style={{ borderTop: "1px solid var(--emerald-200)", marginTop: "12px", paddingTop: "8px", fontSize: "0.85rem" }}>
                  <div>Distance: <strong>{compareData.j1.distance_km?.toFixed(2) || "—"} km</strong></div>
                  <div>Time: <strong>{compareData.j1.travel_time_min?.toFixed(1) || "—"} min</strong></div>
                  <div style={{ color: "#059669", fontWeight: 700 }}>
                    CO₂: {compareData.j1.co2_kg?.toFixed(3) || "—"} kg
                  </div>
                </div>
              </div>

              <div style={{ border: "1.5px solid var(--sky-500)", borderRadius: "8px", padding: "16px", background: "var(--sky-50)" }}>
                <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0369a1" }}>
                  Journey B (#{compareData.j2.journey_id ?? compareData.j2.id})
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--slate-600)", marginTop: "6px" }}>
                  <strong>From:</strong> {compareData.j2.source}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--slate-600)", marginTop: "2px" }}>
                  <strong>To:</strong> {compareData.j2.destination}
                </div>
                <div style={{ borderTop: "1px solid var(--sky-200)", marginTop: "12px", paddingTop: "8px", fontSize: "0.85rem" }}>
                  <div>Distance: <strong>{compareData.j2.distance_km?.toFixed(2) || "—"} km</strong></div>
                  <div>Time: <strong>{compareData.j2.travel_time_min?.toFixed(1) || "—"} min</strong></div>
                  <div style={{ color: "#0284c7", fontWeight: 700 }}>
                    CO₂: {compareData.j2.co2_kg?.toFixed(3) || "—"} kg
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCompareData(null)}
                style={{ width: "auto", padding: "8px 20px" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
