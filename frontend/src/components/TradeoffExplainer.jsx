/**
 * TradeoffExplainer – renders the backend explanation text + Δ trade-offs.
 * Honest framing: surfaces the disclaimer text from the API response.
 */
import React from "react";

export default function TradeoffExplainer({ explanation, tradeoffs }) {
  if (!explanation && !tradeoffs) return null;

  return (
    <div className="card">
      <div className="card-title">Route Trade-off Analysis</div>
      <div className="explainer">
        {explanation ? (
          <p style={{ whiteSpace: "pre-line" }}>
            {typeof explanation === "object"
              ? explanation.summary || explanation.text || JSON.stringify(explanation)
              : String(explanation)}
          </p>
        ) : (
          <p>Select a route to see trade-off details.</p>
        )}

        {tradeoffs && tradeoffs.length > 0 && (
          <ul style={{ marginTop: "0.5rem", paddingLeft: "1rem" }}>
            {tradeoffs.map((t, i) => (
              <li key={i} style={{ marginTop: "0.2rem" }}>
                {typeof t === "object"
                  ? t.note || (t.route ? `${t.route}: ${t.co2_kg} kg CO₂ in ${t.time_min} min` : JSON.stringify(t))
                  : String(t)}
              </li>
            ))}
          </ul>
        )}

        <p className="disclaimer">
          Emissions: tailpipe / grid-average accounting boundary. Traffic:
          simulated, not live. Savings reported relative to fastest-route
          baseline. Eco route is not always best—check time penalty before
          choosing.
        </p>
      </div>
    </div>
  );
}

