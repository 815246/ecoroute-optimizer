/**
 * AgentTrace – collapsible timeline of coordinator pipeline steps.
 */
import React, { useState } from "react";

export default function AgentTrace({ steps }) {
  const [open, setOpen] = useState(false);

  if (!steps || steps.length === 0) return null;

  return (
    <div className="card">
      <div
        className="card-title"
        style={{ cursor: "pointer", userSelect: "none" }}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "▾" : "▸"} Agent Pipeline Trace ({steps.length} steps)
      </div>

      {open && (
        <ol
          style={{
            paddingLeft: "1.1rem",
            fontSize: "0.75rem",
            color: "var(--slate-600)",
            lineHeight: 1.7,
          }}
        >
          {steps.map((step, i) => (
            <li key={i} style={{ marginBottom: "0.2rem" }}>
              <span
                style={{ fontWeight: 600, color: "var(--emerald-700)" }}
              >
                {step.agent ?? step.name ?? `Step ${i + 1}`}
              </span>
              {step.action && (
                <span style={{ color: "var(--slate-400)" }}>
                  {" "}
                  · {step.action}
                </span>
              )}
              {step.note && (
                <span style={{ color: "var(--slate-500)" }}>
                  {" "}
                  — {step.note}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
