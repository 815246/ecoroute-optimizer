/**
 * EmissionsChart – Recharts bar chart comparing CO₂, time, distance across routes.
 * Field names match backend: co2_kg, travel_time_min, distance_km, primary_label.
 * Always labeled "Simulated traffic" and surfaces accounting boundary.
 */
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = {
  co2: "#059669",
  time: "#0284c7",
  distance: "#d97706",
};

export default function EmissionsChart({ routes }) {
  if (!routes || routes.length === 0) return null;

  const data = routes.map((r, i) => {
    const label = r.primary_label ?? r.label ?? `R${i + 1}`;
    // Truncate long labels
    const shortLabel = label.length > 10 ? label.slice(0, 9) + "…" : label;
    return {
      name: shortLabel,
      "CO₂ (kg)": parseFloat(
        Number(r.co2_kg ?? r.total_co2_kg ?? 0).toFixed(3)
      ),
      "Time (min)": parseFloat(
        Number(r.travel_time_min ?? r.total_time_min ?? 0).toFixed(1)
      ),
      "Dist (km)": parseFloat(
        Number(r.distance_km ?? r.total_distance_km ?? 0).toFixed(2)
      ),
    };
  });

  return (
    <div className="card">
      <div className="card-title">Emissions Comparison</div>
      <p
        style={{
          fontSize: "0.68rem",
          color: "var(--slate-400)",
          marginBottom: "0.5rem",
        }}
      >
        Tailpipe / grid-avg CO₂ · simulated traffic, not live
      </p>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={data}
            margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} />
            <YAxis tick={{ fontSize: 10, fill: "#64748b" }} width={36} />
            <Tooltip
              contentStyle={{ fontSize: "0.75rem", borderRadius: "6px" }}
            />
            <Legend iconSize={10} wrapperStyle={{ fontSize: "0.72rem" }} />
            <Bar dataKey="CO₂ (kg)" fill={COLORS.co2} radius={[3, 3, 0, 0]} />
            <Bar
              dataKey="Time (min)"
              fill={COLORS.time}
              radius={[3, 3, 0, 0]}
            />
            <Bar
              dataKey="Dist (km)"
              fill={COLORS.distance}
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
