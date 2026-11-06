/**
 * EcoRoute Optimizer – main App shell.
 * Tabs: Plan (map + form + results) | History
 * Features:
 *   - Search places with OpenStreetMap / Photon autocomplete
 *   - Click anywhere on map to drop Start & Destination pins
 *   - Real road geometry curves rendering on Leaflet
 *   - No LLM calls; all data from backend REST API.
 *   - Traffic always labeled "Simulated traffic, not live".
 */
import React, { useState, useCallback } from "react";
import RouteForm from "./components/RouteForm";
import RouteResults from "./components/RouteResults";
import MapView from "./components/MapView";
import EmissionsChart from "./components/EmissionsChart";
import TradeoffExplainer from "./components/TradeoffExplainer";
import HistoryView from "./components/HistoryView";
import AgentTrace from "./components/AgentTrace";
import { planRoute } from "./services/api";

export default function App() {
  const [tab, setTab] = useState("plan"); // "plan" | "history"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [routes, setRoutes] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [agentTrace, setAgentTrace] = useState([]);
  const [explanation, setExplanation] = useState(null);
  const [tradeoffs, setTradeoffs] = useState([]);

  // Map click & coordinates state
  const [startPoint, setStartPoint] = useState([23.3144, 85.3216]); // Ranchi Airport
  const [endPoint, setEndPoint] = useState([23.3486, 85.3341]); // Ranchi Railway Station
  const [activeMapTarget, setActiveMapTarget] = useState("start"); // "start" | "end"

  const handleMapClick = useCallback(
    (latlng) => {
      if (activeMapTarget === "start") {
        setStartPoint(latlng);
        setActiveMapTarget("end");
      } else {
        setEndPoint(latlng);
        setActiveMapTarget("start");
      }
    },
    [activeMapTarget]
  );

  const handlePlan = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    setRoutes([]);
    setAgentTrace([]);
    setExplanation(null);
    setTradeoffs([]);
    try {
      const data = await planRoute(params);
      setRoutes(data.routes ?? []);
      setSelectedIndex(0);
      setAgentTrace(data.agent_trace ?? []);
      setExplanation(data.explanation ?? null);
      setTradeoffs(data.tradeoffs ?? []);
    } catch (err) {
      const msg =
        err.response?.data?.message ??
        err.response?.data?.detail ??
        err.message ??
        "Unknown error – is the backend running?";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectedRoute = routes[selectedIndex] ?? null;

  return (
    <div className="app-shell">
      {/* ── Top Navigation ── */}
      <nav className="top-nav">
        <span style={{ fontSize: "1.4rem" }}>🌿</span>
        <h1>EcoRoute Optimizer</h1>
        <div className="nav-links">
          <button
            className={`nav-link ${tab === "plan" ? "active" : ""}`}
            onClick={() => setTab("plan")}
          >
            Plan Route
          </button>
          <button
            className={`nav-link ${tab === "history" ? "active" : ""}`}
            onClick={() => setTab("history")}
          >
            History
          </button>
        </div>
      </nav>

      {/* ── Disclaimer Bar ── */}
      <div className="disclaimer-bar">
        ⚠️ All traffic data is <strong>simulated, not live</strong>. CO₂
        figures are tailpipe / grid-average estimates. Eco route is not always
        best — check time penalty.
      </div>

      {tab === "plan" && (
        <>
          <div className="main-content">
            {/* ── Sidebar ── */}
            <aside className="sidebar">
              <RouteForm
                onSubmit={handlePlan}
                loading={loading}
                sourceCoord={startPoint}
                destCoord={endPoint}
                activeMapTarget={activeMapTarget}
                setActiveMapTarget={setActiveMapTarget}
              />

              {error && <div className="error-box">⚠ {error}</div>}

              {routes.length > 0 && (
                <>
                  <EmissionsChart routes={routes} />
                  <TradeoffExplainer
                    explanation={explanation}
                    tradeoffs={
                      selectedRoute?.tradeoff_notes ?? tradeoffs
                    }
                  />
                  <AgentTrace steps={agentTrace} />
                </>
              )}
            </aside>

            {/* ── Map Panel ── */}
            <div
              className="map-panel"
              style={{ display: "flex", flexDirection: "column" }}
            >
              <div style={{ flex: 1, minHeight: 0 }}>
                <MapView
                  routes={routes}
                  selectedIndex={selectedIndex}
                  startPoint={startPoint}
                  endPoint={endPoint}
                  onMapClick={handleMapClick}
                  clickTarget={activeMapTarget}
                />
              </div>
            </div>
          </div>

          {/* ── Route Results Strip ── */}
          {routes.length > 0 && (
            <RouteResults
              routes={routes}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
            />
          )}
        </>
      )}

      {tab === "history" && <HistoryView />}
    </div>
  );
}
