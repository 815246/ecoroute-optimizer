/**
 * RouteResults – ranked route cards with:
 *   - Badges, stats, CO₂ savings vs fastest baseline
 *   - Expandable Turn-by-Turn Path Directions ("routes that open and show the path direction")
 *   - Interactive step-by-step navigation timeline
 */
import React, { useState } from "react";
import {
  Compass,
  ChevronDown,
  ChevronUp,
  Navigation,
  ArrowRight,
  CornerDownRight,
  CornerDownLeft,
  ArrowUp,
  MapPin,
  Flag,
} from "lucide-react";

function Badge({ label }) {
  if (!label) return null;
  const lower = label.toLowerCase();
  const cls =
    lower.includes("eco") || lower.includes("recommend")
      ? "badge-pareto"
      : lower.includes("fast")
        ? "badge-fastest"
        : "badge-eco";
  return <span className={`badge ${cls}`}>{label}</span>;
}

function TurnIcon({ type }) {
  switch (type) {
    case "right":
    case "sharp_right":
    case "slight_right":
      return <CornerDownRight size={14} style={{ color: "#d97706" }} />;
    case "left":
    case "sharp_left":
    case "slight_left":
      return <CornerDownLeft size={14} style={{ color: "#d97706" }} />;
    case "arrive":
      return <Flag size={14} style={{ color: "#dc2626" }} />;
    case "depart":
      return <MapPin size={14} style={{ color: "#059669" }} />;
    default:
      return <ArrowUp size={14} style={{ color: "#0284c7" }} />;
  }
}

function RouteCard({
  route,
  index,
  selected,
  onSelect,
  sourceName,
  destName,
  onHoverStep,
}) {
  const [showDirections, setShowDirections] = useState(index === 0); // Open recommended by default

  const co2 = route.co2_kg ?? route.total_co2_kg ?? 0;
  const time = route.travel_time_min ?? route.total_time_min ?? 0;
  const dist = route.distance_km ?? route.total_distance_km ?? 0;
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

  const directions = route.directions || [];

  return (
    <div
      className={`route-card ${selected ? "selected" : ""}`}
      style={{
        transition: "all 0.2s ease",
        borderColor: selected ? "var(--emerald-600)" : undefined,
      }}
      onClick={() => onSelect(index)}
    >
      <div className="route-card-header">
        <span className="route-label" style={{ fontWeight: 700 }}>
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

      {/* Button to Open/Close Path Directions */}
      <div style={{ marginTop: "0.6rem" }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowDirections((prev) => !prev);
            onSelect(index);
          }}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: showDirections ? "var(--emerald-50)" : "var(--slate-50)",
            border: "1px solid",
            borderColor: showDirections ? "var(--emerald-200)" : "var(--slate-200)",
            borderRadius: "6px",
            padding: "5px 10px",
            fontSize: "0.72rem",
            fontWeight: 600,
            color: showDirections ? "var(--emerald-800)" : "var(--slate-700)",
            cursor: "pointer",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Compass size={14} style={{ color: "var(--emerald-600)" }} />
            {showDirections ? "Hide Path Directions" : "Open Path Directions"}
            {directions.length > 0 && (
              <span
                style={{
                  background: showDirections ? "var(--emerald-200)" : "var(--slate-200)",
                  padding: "1px 6px",
                  borderRadius: "999px",
                  fontSize: "0.65rem",
                }}
              >
                {directions.length} steps
              </span>
            )}
          </span>
          {showDirections ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Expanded Turn-by-Turn Directions List */}
      {showDirections && (
        <div
          style={{
            marginTop: "0.6rem",
            padding: "8px 10px",
            background: "white",
            border: "1px solid var(--emerald-100)",
            borderRadius: "6px",
            fontSize: "0.72rem",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: "var(--slate-700)",
              marginBottom: "6px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <Navigation size={13} style={{ color: "var(--emerald-600)" }} />
            <span>Turn-by-Turn Navigation Path:</span>
          </div>

          {directions.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {directions.map((step, sIdx) => (
                <div
                  key={sIdx}
                  onMouseEnter={() => onHoverStep && onHoverStep(step.location)}
                  onMouseLeave={() => onHoverStep && onHoverStep(null)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    padding: "4px 6px",
                    borderRadius: "4px",
                    background: "var(--slate-50)",
                    borderLeft: `3px solid ${
                      step.turn_type === "arrive"
                        ? "#dc2626"
                        : step.turn_type === "depart"
                          ? "#059669"
                          : "var(--emerald-500)"
                    }`,
                  }}
                >
                  <div style={{ marginTop: "2px", flexShrink: 0 }}>
                    <TurnIcon type={step.turn_type} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "var(--slate-800)" }}>
                      {step.instruction}
                    </div>
                    {(step.distance_km != null || step.dist_km != null || step.time_min != null || step.duration_min != null) && (
                      <div style={{ fontSize: "0.65rem", color: "var(--slate-500)", marginTop: "1px" }}>
                        Distance: {Number(step.distance_km ?? step.dist_km ?? 0).toFixed(2)} km · ~{Number(step.time_min ?? step.duration_min ?? 0).toFixed(1)} min
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Fallback if no directions array exists */
            <div style={{ color: "var(--slate-500)", padding: "4px 0" }}>
              <span>Follow path from </span>
              <strong>{sourceName || "Origin"}</strong>
              <span> to </span>
              <strong>{destName || "Destination"}</strong>
              <span> across {(route.path ?? []).length} road segments.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RouteResults({
  routes,
  selectedIndex,
  onSelect,
  sourceName,
  destName,
  onHoverStep,
}) {
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
            sourceName={sourceName}
            destName={destName}
            onHoverStep={onHoverStep}
          />
        ))}
      </div>
    </div>
  );
}
