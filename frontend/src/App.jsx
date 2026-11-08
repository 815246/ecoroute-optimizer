/**
 * EcoRoute Optimizer – Main Application Shell.
 * Integrates:
 *   - Plan Route: Map-based routing, turn-by-turn directions, smart incident replanning
 *   - Dashboard: Multi-route comparison cards, side-by-side table, sustainability charts
 *   - History: Archived journeys with details, deletion, and comparison
 *   - About Project: Scientific methodology, agentic pipeline, Dijkstra vs A* benchmarks
 */
import React, { useState, useCallback } from "react";
import RouteForm from "./components/RouteForm";
import RouteResults from "./components/RouteResults";
import MapView from "./components/MapView";
import EmissionsChart from "./components/EmissionsChart";
import TradeoffExplainer from "./components/TradeoffExplainer";
import HistoryView from "./components/HistoryView";
import DashboardView from "./components/DashboardView";
import AboutView from "./components/AboutView";
import SmartReplanning from "./components/SmartReplanning";
import AgentTrace from "./components/AgentTrace";
import { planRoute } from "./services/api";
import {
  Map,
  BarChart3,
  History,
  Info,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export default function App() {
  const [tab, setTab] = useState("plan"); // "plan" | "dashboard" | "history" | "about"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastParams, setLastParams] = useState(null);

  const [routes, setRoutes] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [agentTrace, setAgentTrace] = useState([]);
  const [explanation, setExplanation] = useState(null);
  const [tradeoffs, setTradeoffs] = useState([]);

  // Human-readable trip location names
  const [tripNames, setTripNames] = useState({
    sourceName: "",
    destName: "",
  });

  // Hovered direction step location on map
  const [hoveredStepLocation, setHoveredStepLocation] = useState(null);

  // Map click & coordinates state
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [activeMapTarget, setActiveMapTarget] = useState("start"); // "start" | "end"

  // Active vehicle & preset state for replanning
  const [activeVehicle, setActiveVehicle] = useState("petrol_hatchback");
  const [activePreset, setActivePreset] = useState("eco");

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

  const handleSwapCoords = useCallback(() => {
    setStartPoint((prevStart) => {
      const prevEnd = endPoint;
      setEndPoint(prevStart);
      return prevEnd;
    });
  }, [endPoint]);

  const handlePlan = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    setLastParams(params);
    setRoutes([]);
    setAgentTrace([]);
    setExplanation(null);
    setTradeoffs([]);

    if (params.vehicle_id) setActiveVehicle(params.vehicle_id);
    if (params.preset) setActivePreset(params.preset);

    if (params.sourceName && params.destName) {
      setTripNames({
        sourceName: params.sourceName,
        destName: params.destName,
      });
    }

    try {
      const data = await planRoute(params);
      setRoutes(data.routes ?? []);
      setSelectedIndex(0);
      setAgentTrace(data.agent_trace ?? []);
      setExplanation(data.explanation ?? null);
      setTradeoffs(data.tradeoffs ?? []);
    } catch (err) {
      console.error("Plan route error:", err);
      const msg =
        err.response?.data?.message ??
        err.response?.data?.detail ??
        err.message ??
        "Unable to calculate routes. Please check your backend connection.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRetry = () => {
    if (lastParams) {
      handlePlan(lastParams);
    }
  };

  const handleReplanSuccess = (newRoute, reason) => {
    // Insert new route at top and select it
    setRoutes((prev) => [newRoute, ...prev]);
    setSelectedIndex(0);
    setExplanation(reason);
  };

  const selectedRoute = routes[selectedIndex] ?? null;

  return (
    <div className="app-shell">
      {/* ── Top Navigation Bar ── */}
      <nav className="top-nav">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.5rem" }}>🌿</span>
          <div>
            <h1 style={{ lineHeight: 1.2 }}>EcoRoute Optimizer</h1>
            <span style={{ fontSize: "0.68rem", opacity: 0.85, fontWeight: 500 }}>
              Agentic Multi-Objective Route Planner
            </span>
          </div>
        </div>

        <div className="nav-links">
          <button
            className={`nav-link ${tab === "plan" ? "active" : ""}`}
            onClick={() => setTab("plan")}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Map size={15} />
            <span>Plan Route</span>
          </button>
          <button
            className={`nav-link ${tab === "dashboard" ? "active" : ""}`}
            onClick={() => setTab("dashboard")}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <BarChart3 size={15} />
            <span>Dashboard</span>
            {routes.length > 0 && (
              <span style={{ background: "white", color: "#065f46", fontSize: "0.65rem", padding: "1px 6px", borderRadius: "999px", fontWeight: 700 }}>
                {routes.length}
              </span>
            )}
          </button>
          <button
            className={`nav-link ${tab === "history" ? "active" : ""}`}
            onClick={() => setTab("history")}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <History size={15} />
            <span>History</span>
          </button>
          <button
            className={`nav-link ${tab === "about" ? "active" : ""}`}
            onClick={() => setTab("about")}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Info size={15} />
            <span>About Project</span>
          </button>
        </div>
      </nav>

      {/* ── Honest Scientific Disclaimer Bar ── */}
      <div className="disclaimer-bar">
        ⚠️ All traffic congestion data is <strong>simulated, not live</strong>. CO₂
        figures are tailpipe & grid-average estimates. Eco route is not always
        best — check the travel-time penalty.
      </div>

      {/* ── TAB 1: PLAN ROUTE ── */}
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
                onStartPointChange={setStartPoint}
                onEndPointChange={setEndPoint}
                onLocationNamesChange={setTripNames}
                activeMapTarget={activeMapTarget}
                setActiveMapTarget={setActiveMapTarget}
                onSwapCoords={handleSwapCoords}
              />

              {/* Error Box with Retry Button */}
              {error && (
                <div className="error-box" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>⚠</span>
                    <strong>Route Calculation Error</strong>
                  </div>
                  <div style={{ fontSize: "0.75rem", lineHeight: 1.4 }}>{error}</div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleRetry}
                    style={{
                      alignSelf: "flex-start",
                      marginTop: "4px",
                      background: "white",
                      borderColor: "#fca5a5",
                      color: "#b91c1c",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <RotateCcw size={13} />
                    Retry Calculation
                  </button>
                </div>
              )}

              {/* Quick Jump to Dashboard Banner */}
              {routes.length > 0 && (
                <div
                  style={{
                    background: "var(--emerald-50)",
                    border: "1px solid var(--emerald-200)",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Sparkles size={16} color="#059669" />
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--emerald-800)" }}>
                      {routes.length} Alternatives Calculated
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => setTab("dashboard")}
                    style={{ fontSize: "0.7rem", padding: "4px 8px", width: "auto" }}
                  >
                    Compare in Dashboard →
                  </button>
                </div>
              )}

              {/* Interactive Smart Replanning Module (Phase 7) */}
              {selectedRoute && (
                <SmartReplanning
                  activeRoute={selectedRoute}
                  vehicleId={activeVehicle}
                  weights={activePreset}
                  onReplanSuccess={handleReplanSuccess}
                />
              )}

              {/* Emissions Bar Chart */}
              {routes.length > 0 && (
                <>
                  <EmissionsChart routes={routes} />
                  <TradeoffExplainer
                    explanation={explanation}
                    tradeoffs={selectedRoute?.tradeoff_notes ?? tradeoffs}
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
                  startName={tripNames.sourceName}
                  endName={tripNames.destName}
                  onMapClick={handleMapClick}
                  clickTarget={activeMapTarget}
                  hoveredStepLocation={hoveredStepLocation}
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
              sourceName={tripNames.sourceName}
              destName={tripNames.destName}
              onHoverStep={setHoveredStepLocation}
            />
          )}
        </>
      )}

      {/* ── TAB 2: DASHBOARD (Phase 5 & 6) ── */}
      {tab === "dashboard" && (
        <DashboardView
          routes={routes}
          selectedIndex={selectedIndex}
          onSelectRoute={(idx) => {
            setSelectedIndex(idx);
            setTab("plan");
          }}
          tripNames={tripNames}
          onSwitchToPlan={() => setTab("plan")}
        />
      )}

      {/* ── TAB 3: HISTORY (Phase 8) ── */}
      {tab === "history" && (
        <HistoryView
          onLoadJourney={(journey) => {
            if (journey.source && journey.destination) {
              setTripNames({ sourceName: journey.source, destName: journey.destination });
              setTab("plan");
            }
          }}
        />
      )}

      {/* ── TAB 4: ABOUT PROJECT ── */}
      {tab === "about" && <AboutView />}
    </div>
  );
}
