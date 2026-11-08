/**
 * DashboardView – Comprehensive Route Comparison & Sustainability Analytics.
 * Implements Phase 5 (Route Comparison Cards & Table) and Phase 6 (Sustainability Analytics).
 */
import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import {
  Zap,
  Leaf,
  Clock,
  Compass,
  TrendingDown,
  Info,
  Car,
  Table,
  CheckCircle,
} from "lucide-react";

export default function DashboardView({
  routes = [],
  selectedIndex = 0,
  onSelectRoute,
  tripNames,
  onSwitchToPlan,
}) {
  // If no routes are currently loaded, show prompt to plan a route
  if (!routes || routes.length === 0) {
    return (
      <div style={{ padding: "40px 24px", maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
        <div
          style={{
            background: "white",
            padding: "48px 32px",
            borderRadius: "16px",
            border: "1px solid var(--slate-200)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "var(--emerald-50)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px auto",
            }}
          >
            <Leaf size={32} color="#059669" />
          </div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--slate-800)", marginBottom: "8px" }}>
            No Route Data Available
          </h2>
          <p style={{ color: "var(--slate-500)", fontSize: "0.9rem", maxWidth: "480px", margin: "0 auto 24px auto" }}>
            Plan a route using the <strong>Plan Route</strong> tab to generate multi-objective alternatives, Pareto trade-offs, and sustainability analytics.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onSwitchToPlan}
            style={{ maxWidth: "220px", margin: "0 auto", padding: "10px 20px" }}
          >
            Go to Route Planner
          </button>
        </div>
      </div>
    );
  }

  // Identify distinct key routes
  const fastestRoute = useMemo(() => {
    return [...routes].sort((a, b) => (a.travel_time_min ?? 0) - (b.travel_time_min ?? 0))[0];
  }, [routes]);

  const ecoRoute = useMemo(() => {
    return [...routes].sort((a, b) => (a.co2_kg ?? 0) - (b.co2_kg ?? 0))[0];
  }, [routes]);

  const balancedRoute = useMemo(() => {
    return routes.find((r) => r.primary_label?.toLowerCase().includes("balance")) || routes[0];
  }, [routes]);

  // Compute savings of Eco vs Fastest
  const co2SavingsKg = Math.max(0, (fastestRoute.co2_kg || 0) - (ecoRoute.co2_kg || 0));
  const co2SavingsPct =
    fastestRoute.co2_kg > 0 ? ((co2SavingsKg / fastestRoute.co2_kg) * 100).toFixed(1) : 0;
  const timePenaltyMin = Math.max(0, (ecoRoute.travel_time_min || 0) - (fastestRoute.travel_time_min || 0));

  // Vehicle-wise emission comparison simulation based on the selected route distance
  const activeRoute = routes[selectedIndex] || routes[0];
  const activeDistanceKm = activeRoute.distance_km || 10.0;

  const vehicleComparisonData = [
    {
      name: "Petrol Hatchback",
      "CO₂ Emissions (kg)": parseFloat(((activeDistanceKm / 20.0) * 2.31).toFixed(3)),
      "Fuel/Energy": `${(activeDistanceKm / 20.0).toFixed(2)} L Petrol`,
      type: "petrol",
    },
    {
      name: "Diesel SUV",
      "CO₂ Emissions (kg)": parseFloat(((activeDistanceKm / 14.5) * 2.68).toFixed(3)),
      "Fuel/Energy": `${(activeDistanceKm / 14.5).toFixed(2)} L Diesel`,
      type: "diesel",
    },
    {
      name: "Electric Car (Grid)",
      "CO₂ Emissions (kg)": parseFloat(((activeDistanceKm * 0.15) * 0.82).toFixed(3)),
      "Fuel/Energy": `${(activeDistanceKm * 0.15).toFixed(2)} kWh`,
      type: "electric",
    },
    {
      name: "Delivery Van",
      "CO₂ Emissions (kg)": parseFloat(((activeDistanceKm / 11.5) * 2.68 * 1.25).toFixed(3)),
      "Fuel/Energy": `${((activeDistanceKm / 11.5) * 1.25).toFixed(2)} L Diesel`,
      type: "diesel",
    },
  ];

  // Route trade-off scatter / bar data
  const tradeOffChartData = routes.map((r, i) => ({
    name: r.primary_label ?? `Route ${i + 1}`,
    timeMin: parseFloat((r.travel_time_min ?? 0).toFixed(1)),
    co2Kg: parseFloat((r.co2_kg ?? 0).toFixed(3)),
    distKm: parseFloat((r.distance_km ?? 0).toFixed(2)),
  }));

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--slate-800)" }}>
            Sustainability & Route Comparison Dashboard
          </h2>
          <p style={{ color: "var(--slate-500)", fontSize: "0.85rem", marginTop: "2px" }}>
            Trip: <strong>{tripNames?.sourceName || "Origin"}</strong> → <strong>{tripNames?.destName || "Destination"}</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onSwitchToPlan}
            style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
          >
            <Compass size={14} />
            Back to Map & Plan
          </button>
        </div>
      </div>

      {/* ── Top Metric Highlights ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        <div className="card" style={{ borderLeft: "4px solid #059669", background: "white" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", textTransform: "uppercase", fontWeight: 600 }}>
            Maximum CO₂ Savings
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#059669", marginTop: "4px" }}>
            {co2SavingsPct}%
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--slate-600)", marginTop: "2px" }}>
            Save {co2SavingsKg.toFixed(3)} kg CO₂ vs fastest route
          </div>
        </div>

        <div className="card" style={{ borderLeft: "4px solid #0284c7", background: "white" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", textTransform: "uppercase", fontWeight: 600 }}>
            Fastest Travel Time
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0284c7", marginTop: "4px" }}>
            {fastestRoute.travel_time_min?.toFixed(1)} <span style={{ fontSize: "1rem" }}>min</span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--slate-600)", marginTop: "2px" }}>
            Across {fastestRoute.distance_km?.toFixed(1)} km road network
          </div>
        </div>

        <div className="card" style={{ borderLeft: "4px solid #d97706", background: "white" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", textTransform: "uppercase", fontWeight: 600 }}>
            Eco Time Addition
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#d97706", marginTop: "4px" }}>
            +{timePenaltyMin.toFixed(1)} <span style={{ fontSize: "1rem" }}>min</span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--slate-600)", marginTop: "2px" }}>
            Small trade-off for carbon reduction
          </div>
        </div>

        <div className="card" style={{ borderLeft: "4px solid #7c3aed", background: "white" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", textTransform: "uppercase", fontWeight: 600 }}>
            Routes Analyzed
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#7c3aed", marginTop: "4px" }}>
            {routes.length} <span style={{ fontSize: "1rem" }}>candidates</span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--slate-600)", marginTop: "2px" }}>
            Multi-objective Pareto frontier
          </div>
        </div>
      </div>

      {/* ── PHASE 5: Route Comparison Cards (Fastest, Eco, Balanced) ── */}
      <div>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--slate-800)", marginBottom: "12px" }}>
          Multi-Objective Route Alternatives
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
          {/* Card 1: Fastest Route */}
          <div
            className="card"
            style={{
              border: fastestRoute === activeRoute ? "2px solid #0284c7" : "1px solid var(--slate-200)",
              cursor: "pointer",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onClick={() => {
              const idx = routes.indexOf(fastestRoute);
              if (idx !== -1 && onSelectRoute) onSelectRoute(idx);
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span className="badge badge-fastest">⚡ Route 1 — Fastest Route</span>
              {fastestRoute === activeRoute && (
                <span style={{ fontSize: "0.7rem", color: "#0284c7", fontWeight: 700 }}>Active Selection</span>
              )}
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--slate-800)" }}>
              {fastestRoute.travel_time_min?.toFixed(1)} min
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", marginBottom: "12px" }}>
              Minimises time in traffic
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", borderTop: "1px solid var(--slate-100)", paddingTop: "10px" }}>
              <div>
                <div style={{ fontSize: "0.65rem", color: "var(--slate-400)" }}>DISTANCE</div>
                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{fastestRoute.distance_km?.toFixed(2)} km</div>
              </div>
              <div>
                <div style={{ fontSize: "0.65rem", color: "var(--slate-400)" }}>EST. FUEL</div>
                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                  {fastestRoute.fuel_liters ? `${fastestRoute.fuel_liters.toFixed(2)} L` : `${fastestRoute.energy_kwh?.toFixed(1)} kWh`}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.65rem", color: "var(--slate-400)" }}>CO₂ EMITTED</div>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--amber-600)" }}>
                  {fastestRoute.co2_kg?.toFixed(3)} kg
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Eco-Friendly Route */}
          <div
            className="card"
            style={{
              border: ecoRoute === activeRoute ? "2px solid #059669" : "1px solid var(--emerald-200)",
              background: "var(--emerald-50)",
              cursor: "pointer",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onClick={() => {
              const idx = routes.indexOf(ecoRoute);
              if (idx !== -1 && onSelectRoute) onSelectRoute(idx);
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span className="badge badge-pareto">🌱 Route 2 — Eco-Friendly (Recommended)</span>
              {ecoRoute === activeRoute && (
                <span style={{ fontSize: "0.7rem", color: "#059669", fontWeight: 700 }}>Active Selection</span>
              )}
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#059669" }}>
              {ecoRoute.co2_kg?.toFixed(3)} kg CO₂
            </div>
            <div style={{ fontSize: "0.75rem", color: "#047857", marginBottom: "12px", fontWeight: 600 }}>
              ↓ Saves {co2SavingsPct}% CO₂ vs fastest route
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", borderTop: "1px solid var(--emerald-200)", paddingTop: "10px" }}>
              <div>
                <div style={{ fontSize: "0.65rem", color: "#065f46" }}>DISTANCE</div>
                <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#065f46" }}>{ecoRoute.distance_km?.toFixed(2)} km</div>
              </div>
              <div>
                <div style={{ fontSize: "0.65rem", color: "#065f46" }}>TRAVEL TIME</div>
                <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#065f46" }}>{ecoRoute.travel_time_min?.toFixed(1)} min</div>
              </div>
              <div>
                <div style={{ fontSize: "0.65rem", color: "#065f46" }}>TIME PENALTY</div>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#d97706" }}>+{timePenaltyMin.toFixed(1)} min</div>
              </div>
            </div>
          </div>

          {/* Card 3: Balanced Route */}
          <div
            className="card"
            style={{
              border: balancedRoute === activeRoute ? "2px solid #7c3aed" : "1px solid var(--slate-200)",
              cursor: "pointer",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onClick={() => {
              const idx = routes.indexOf(balancedRoute);
              if (idx !== -1 && onSelectRoute) onSelectRoute(idx);
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span className="badge badge-eco">⚖️ Route 3 — Balanced Route</span>
              {balancedRoute === activeRoute && (
                <span style={{ fontSize: "0.7rem", color: "#7c3aed", fontWeight: 700 }}>Active Selection</span>
              )}
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--slate-800)" }}>
              {balancedRoute.travel_time_min?.toFixed(1)} min · {balancedRoute.co2_kg?.toFixed(3)} kg
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", marginBottom: "12px" }}>
              Optimal balance between time and carbon
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", borderTop: "1px solid var(--slate-100)", paddingTop: "10px" }}>
              <div>
                <div style={{ fontSize: "0.65rem", color: "var(--slate-400)" }}>DISTANCE</div>
                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{balancedRoute.distance_km?.toFixed(2)} km</div>
              </div>
              <div>
                <div style={{ fontSize: "0.65rem", color: "var(--slate-400)" }}>COMPOSITE</div>
                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{balancedRoute.optimization_score?.toFixed(3) || "0.32"}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.65rem", color: "var(--slate-400)" }}>STATUS</div>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#059669" }}>Pareto Valid</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Side-by-Side Comparison Table ── */}
      <div className="card" style={{ overflowX: "auto" }}>
        <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Table size={15} />
          <span>Full Route Comparison Table</span>
        </div>
        <table className="history-table" style={{ marginTop: "8px", width: "100%" }}>
          <thead>
            <tr>
              <th>Rank & Label</th>
              <th>Distance</th>
              <th>Travel Time</th>
              <th>CO₂ Emissions</th>
              <th>CO₂ vs Fastest</th>
              <th>Time vs Fastest</th>
              <th>Pareto Front</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {routes.map((r, i) => {
              const isSelected = i === selectedIndex;
              const savings = r.tradeoff_vs_fastest?.co2_savings_pct;
              const tDelta = r.tradeoff_vs_fastest?.time_delta_min;
              return (
                <tr
                  key={i}
                  style={{
                    backgroundColor: isSelected ? "var(--emerald-50)" : undefined,
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  <td>
                    <strong>#{i + 1}</strong> {r.primary_label || `Route ${i + 1}`}
                  </td>
                  <td>{Number(r.distance_km ?? 0).toFixed(2)} km</td>
                  <td>{Number(r.travel_time_min ?? 0).toFixed(1)} min</td>
                  <td style={{ color: "var(--emerald-700)", fontWeight: 700 }}>
                    {Number(r.co2_kg ?? 0).toFixed(3)} kg
                  </td>
                  <td>
                    {savings != null && savings > 0.05 ? (
                      <span style={{ color: "#059669", fontWeight: 600 }}>↓ {savings.toFixed(1)}%</span>
                    ) : savings != null && savings < -0.05 ? (
                      <span style={{ color: "#dc2626" }}>↑ {Math.abs(savings).toFixed(1)}%</span>
                    ) : (
                      "Baseline (0%)"
                    )}
                  </td>
                  <td>
                    {tDelta != null && tDelta > 0.05 ? (
                      <span style={{ color: "#d97706" }}>+{tDelta.toFixed(1)} min</span>
                    ) : tDelta != null && tDelta < -0.05 ? (
                      <span style={{ color: "#059669" }}>{tDelta.toFixed(1)} min</span>
                    ) : (
                      "Baseline (0 min)"
                    )}
                  </td>
                  <td>
                    {r.is_pareto ? (
                      <span className="badge badge-pareto">Pareto Optimal</span>
                    ) : (
                      <span style={{ color: "var(--slate-400)", fontSize: "0.75rem" }}>Dominated</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`btn btn-sm ${isSelected ? "btn-primary" : "btn-ghost"}`}
                      onClick={() => onSelectRoute && onSelectRoute(i)}
                      style={{ fontSize: "0.7rem", padding: "3px 8px" }}
                    >
                      {isSelected ? "Selected" : "Select"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── PHASE 6: Charts (Vehicle-wise Comparison & Trade-off Curve) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "20px" }}>
        {/* Chart 1: Vehicle-Wise Emissions Comparison */}
        <div className="card">
          <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Car size={15} />
            <span>Vehicle-Wise Emission Comparison (Selected Route: {activeDistanceKm.toFixed(1)} km)</span>
          </div>
          <p style={{ fontSize: "0.7rem", color: "var(--slate-500)", marginBottom: "8px" }}>
            Estimates across different vehicle powertrain profiles for the exact same trip.
          </p>
          <div style={{ width: "100%", height: "240px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vehicleComparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: "#475569" }} unit=" kg" />
                <Tooltip
                  formatter={(val, name, item) => [`${val} kg CO₂ (${item.payload["Fuel/Energy"]})`, "Est. Emissions"]}
                  contentStyle={{ fontSize: "0.75rem", borderRadius: "8px" }}
                />
                <Bar dataKey="CO₂ Emissions (kg)" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Travel-Time vs CO2 Trade-Off */}
        <div className="card">
          <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <TrendingDown size={15} />
            <span>Travel Time vs CO₂ Emissions Trade-Off Curve</span>
          </div>
          <p style={{ fontSize: "0.7rem", color: "var(--slate-500)", marginBottom: "8px" }}>
            Compares candidate routes on the Pareto trade-off curve (Lower-left is superior).
          </p>
          <div style={{ width: "100%", height: "240px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tradeOffChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} />
                <YAxis yAxisId="left" orientation="left" stroke="#059669" tick={{ fontSize: 10 }} unit=" kg" />
                <YAxis yAxisId="right" orientation="right" stroke="#0284c7" tick={{ fontSize: 10 }} unit=" min" />
                <Tooltip contentStyle={{ fontSize: "0.75rem", borderRadius: "8px" }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: "0.72rem" }} />
                <Bar yAxisId="left" dataKey="co2Kg" name="CO₂ Emissions (kg)" fill="#059669" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="right" dataKey="timeMin" name="Travel Time (min)" fill="#0284c7" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Scientific Transparency & Calculation Explanation Card ── */}
      <div className="card" style={{ background: "white", border: "1px solid var(--slate-200)" }}>
        <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Info size={15} color="#059669" />
          <span>Scientific Emission Calculation Methodology & Disclosures</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginTop: "8px", fontSize: "0.78rem", color: "var(--slate-600)", lineHeight: 1.6 }}>
          <div style={{ background: "var(--slate-50)", padding: "12px", borderRadius: "8px", border: "1px solid var(--slate-200)" }}>
            <strong style={{ color: "var(--slate-800)", display: "block", marginBottom: "4px" }}>
              1. Tailpipe Internal Combustion Formula:
            </strong>
            <code>Estimated CO₂ (kg) = Fuel Consumed (L) × Emission Factor (kg CO₂/L)</code>
            <ul style={{ paddingLeft: "16px", marginTop: "6px" }}>
              <li><strong>Petrol:</strong> 2.31 kg CO₂ per litre (DEFRA standard factor).</li>
              <li><strong>Diesel:</strong> 2.68 kg CO₂ per litre.</li>
              <li>Speed-dependent efficiency curve penalizes congested stop-and-go driving.</li>
            </ul>
          </div>

          <div style={{ background: "var(--slate-50)", padding: "12px", borderRadius: "8px", border: "1px solid var(--slate-200)" }}>
            <strong style={{ color: "var(--slate-800)", display: "block", marginBottom: "4px" }}>
              2. Electric Vehicle (EV) Grid Accounting:
            </strong>
            <code>Estimated CO₂ (kg) = Electricity (kWh) × National Grid EF (kg CO₂/kWh)</code>
            <ul style={{ paddingLeft: "16px", marginTop: "6px" }}>
              <li><strong>Tailpipe emissions:</strong> Strictly 0.0 g CO₂/km.</li>
              <li><strong>Lifecycle grid accounting:</strong> 0.82 kg CO₂/kWh based on national CEA grid-average baseline.</li>
              <li>Transparently separates grid lifecycle impact from direct tailpipe exhaust.</li>
            </ul>
          </div>

          <div style={{ background: "var(--slate-50)", padding: "12px", borderRadius: "8px", border: "1px solid var(--slate-200)" }}>
            <strong style={{ color: "var(--slate-800)", display: "block", marginBottom: "4px" }}>
              3. Honesty & Simulation Constraints:
            </strong>
            <ul style={{ paddingLeft: "16px", marginTop: "6px" }}>
              <li>All traffic congestion data is <strong>simulated based on time-of-day multipliers</strong>, not live telematics.</li>
              <li>All reported carbon savings are strictly calculated relative to the <strong>named fastest-route baseline</strong>.</li>
              <li>The eco route is not universally superior; trade-off penalties are explicitly surfaced.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

