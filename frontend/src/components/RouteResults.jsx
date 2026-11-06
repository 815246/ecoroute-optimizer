/**
 * RouteResults – ranked route cards with badges, stats, CO₂ savings.
 * Field names match backend OptimizationAgent output:
 *   co2_kg, distance_km, travel_time_min, primary_label, is_pareto,
 *   tradeoff_vs_fastest.co2_savings_pct, optimization_score, path
 * Emissions are tailpipe / grid-average estimates (simulated, not measured).
 */
import React from "react";

function Badge({ label }) {
  if (!label) return null;
  const lower = label.toLowerCase();
  const cls = lower.includes("eco") || lower.includes("recommend")
    ? "badge-pareto"
    : lower.includes("fast")
      ? "badge-fastest"
      : "badge-eco";
  return <span className={`badge ${cls}`}>{label}</span>;
}

function RouteCard({ route, index, selected, onSelect }) {
  const co2 = route.co2_kg ?? route.total_co2_kg ?? 0;
  const time = route.travel_time_min ?? route.total_time_min ?? 0;
  const dist = route.distance_km ?? route.total_distance_km ?? 0;
  const score = route.optimization_score ?? route.weighted_score ?? 0;
  const isPareto = route.is_pareto ?? route.is_pareto_optimal ?? false;
  const label = route.primary_label ?? route.label ?? `Route ${index + 1}`;

  const savings = route.tradeoff_vs_fastest?.co2_savings_pct;
  const timeDelta = route.tradeoff_vs_fastest?.time_delta_min;

  const savingsLabel =
    savings != null && savings > 0.05
      ? `↓ ${savings.toFixed(1)}% CO₂ vs fastest`
      : savings != null && savings < -0.05
        ? `↑ ${Math.abs(savings).toFixed(1)}% CO₂ vs fastest`
        : null;

  return (
    <div
      className={`route-card ${selected ? "selected" : ""}`}
      onClick={() => onSelect(index)}
    >
      <div className="route-card-header">
        <span className="route-label">
          #{index + 1} {label}
        </span>
        {isPareto && <Badge label="Pareto" />}
        {(route.labels ?? []).slice(0, 2).map((l) => (
          <Badge key={l} label={l} />
        ))}
      </div>

      <div className="route-stats">
        <div className="stat-block">
          <div className="stat-value" style={{ color: "var(--emerald-700)" }}>
            {Number(co2).toFixed(3)}
          </div>
          <div className="stat-label">kg CO₂*</div>
        </div>
        <div className="stat-block">
          <div className="stat-value">{Number(time).toFixed(1)}</div>
          <div className="stat-label">min</div>
        </div>
        <div className="stat-block">
          <div className="stat-value">{Number(dist).toFixed(2)}</div>
          <div className="stat-label">km</div>
        </div>
      </div>

      {savingsLabel && <div className="co2-savings">{savingsLabel}</div>}
      {timeDelta != null && (
        <div
          style={{
            fontSize: "0.68rem",
            color: timeDelta > 0 ? "var(--amber-600)" : "var(--emerald-600)",
            marginTop: "0.1rem",
          }}
        >
          {timeDelta > 0
            ? `+${timeDelta.toFixed(1)} min vs fastest`
            : timeDelta < 0
              ? `${timeDelta.toFixed(1)} min vs fastest`
              : "Same time as fastest"}
        </div>
      )}

      <div
        style={{
          marginTop: "0.4rem",
          fontSize: "0.65rem",
          color: "var(--slate-400)",
        }}
      >
        Score: {Number(score).toFixed(4)} · Path:{" "}
        {(route.path ?? []).join(" → ")}
      </div>
    </div>
  );
}

export default function RouteResults({ routes, selectedIndex, onSelect }) {
  if (!routes || routes.length === 0) return null;

  return (
    <div className="results-panel">
      <h2>
        {routes.length} route{routes.length !== 1 ? "s" : ""} found
        <span
          style={{
            fontSize: "0.65rem",
            color: "var(--slate-400)",
            marginLeft: "0.5rem",
          }}
        >
          *Tailpipe / grid-avg estimate · simulated traffic, not live
        </span>
      </h2>
      <div className="route-cards">
        {routes.map((r, i) => (
          <RouteCard
            key={i}
            route={r}
            index={i}
            selected={i === selectedIndex}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
