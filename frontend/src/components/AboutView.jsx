/**
 * AboutView – Scientific Methodology, Architecture, and Algorithmic Performance.
 * Documents Dijkstra vs A*, Multi-Agent Pipeline, and Honest Scientific Disclosures.
 */
import React from "react";
import {
  Network,
  Cpu,
  ShieldCheck,
  Zap,
  Leaf,
  Layers,
  ArrowRight,
  Database,
  Search,
} from "lucide-react";

export default function AboutView() {
  return (
    <div style={{ padding: "32px 24px", maxWidth: "1000px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Title Hero */}
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--emerald-50)",
            color: "var(--emerald-700)",
            padding: "4px 14px",
            borderRadius: "999px",
            fontSize: "0.8rem",
            fontWeight: 700,
            marginBottom: "12px",
          }}
        >
          <Leaf size={14} />
          Multi-Objective Sustainable Transportation System
        </div>
        <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--slate-800)" }}>
          EcoRoute Optimizer Architecture
        </h2>
        <p style={{ color: "var(--slate-500)", fontSize: "0.95rem", maxWidth: "650px", margin: "0 auto" }}>
          An Agentic AI-driven routing platform engineered for transparent, multi-objective trade-offs between travel time, energy consumption, and carbon emissions.
        </p>
      </div>

      {/* ── Section 1: Multi-Agent Pipeline ── */}
      <div className="card">
        <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Layers size={16} color="#059669" />
          <span>Multi-Agent System Pipeline</span>
        </div>
        <p style={{ fontSize: "0.85rem", color: "var(--slate-600)", marginBottom: "16px", lineHeight: 1.5 }}>
          The backend operates as a coordinated sequence of deterministic, domain-specific Python agents without unreliable LLM hallucinations in the critical routing loop:
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
          <div style={{ background: "var(--slate-50)", padding: "12px", borderRadius: "8px", borderLeft: "3px solid #059669" }}>
            <strong style={{ fontSize: "0.85rem", color: "#065f46" }}>1. RoadNetworkAgent</strong>
            <p style={{ fontSize: "0.75rem", color: "var(--slate-600)", marginTop: "4px" }}>
              Constructs and indexes graph topology from OpenStreetMap (OSMnx) or reproducible simulated grids. Computes spatial bounds, segment distances, and junction connectivity.
            </p>
          </div>

          <div style={{ background: "var(--slate-50)", padding: "12px", borderRadius: "8px", borderLeft: "3px solid #0284c7" }}>
            <strong style={{ fontSize: "0.85rem", color: "#0369a1" }}>2. TrafficAgent</strong>
            <p style={{ fontSize: "0.75rem", color: "var(--slate-600)", marginTop: "4px" }}>
              Applies time-of-day rush hour congestion multipliers and stochastic simulated incidents (road closures, construction speed cuts).
            </p>
          </div>

          <div style={{ background: "var(--slate-50)", padding: "12px", borderRadius: "8px", borderLeft: "3px solid #7c3aed" }}>
            <strong style={{ fontSize: "0.85rem", color: "#6d28d9" }}>3. RouteSearchAgent</strong>
            <p style={{ fontSize: "0.75rem", color: "var(--slate-600)", marginTop: "4px" }}>
              Executes Dijkstra and A* across multiple cost objectives (distance, free-flow time, congested time, emissions) and generates diverse candidate paths.
            </p>
          </div>

          <div style={{ background: "var(--slate-50)", padding: "12px", borderRadius: "8px", borderLeft: "3px solid #d97706" }}>
            <strong style={{ fontSize: "0.85rem", color: "#b45309" }}>4. EmissionAgent</strong>
            <p style={{ fontSize: "0.75rem", color: "var(--slate-600)", marginTop: "4px" }}>
              Calculates vehicle-specific fuel consumption and carbon footprint using non-linear speed-consumption curves and grid emission factors.
            </p>
          </div>

          <div style={{ background: "var(--slate-50)", padding: "12px", borderRadius: "8px", borderLeft: "3px solid #059669" }}>
            <strong style={{ fontSize: "0.85rem", color: "#065f46" }}>5. OptimizationAgent</strong>
            <p style={{ fontSize: "0.75rem", color: "var(--slate-600)", marginTop: "4px" }}>
              Normalizes costs, computes weighted multi-objective scores, and isolates the true Pareto-optimal non-dominated frontier.
            </p>
          </div>

          <div style={{ background: "var(--slate-50)", padding: "12px", borderRadius: "8px", borderLeft: "3px solid #dc2626" }}>
            <strong style={{ fontSize: "0.85rem", color: "#b91c1c" }}>6. ReplanningAgent</strong>
            <p style={{ fontSize: "0.75rem", color: "var(--slate-600)", marginTop: "4px" }}>
              Monitors active transit paths against incident triggers. Reroutes only if the current path is blocked or an alternative exceeds the improvement threshold.
            </p>
          </div>
        </div>
      </div>

      {/* ── Section 2: Dijkstra vs A* Algorithmic Evaluation ── */}
      <div className="card">
        <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Cpu size={16} color="#0284c7" />
          <span>Algorithmic Comparison: Dijkstra vs A* Search</span>
        </div>
        <p style={{ fontSize: "0.85rem", color: "var(--slate-600)", marginBottom: "14px", lineHeight: 1.5 }}>
          We do not claim that A* is universally superior to Dijkstra. We empirically evaluate both algorithms across explored nodes, execution time, and path optimality:
        </p>

        <table className="history-table" style={{ width: "100%", marginBottom: "16px" }}>
          <thead>
            <tr>
              <th>Metric / Dimension</th>
              <th>Dijkstra's Algorithm</th>
              <th>A* Heuristic Search</th>
              <th>Engineering Trade-Off</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Heuristic Guidance</strong></td>
              <td>Uniform cost search (h(n) = 0)</td>
              <td>Goal-directed admissible heuristic (h(n) ≤ h*(n))</td>
              <td>A* prunes nodes away from target direction</td>
            </tr>
            <tr>
              <td><strong>Nodes Explored</strong></td>
              <td>Explores concentric circles (higher node count)</td>
              <td>Focused search cone (typically 40–70% fewer nodes)</td>
              <td>A* reduces heap operations significantly on large graphs</td>
            </tr>
            <tr>
              <td><strong>Execution Time</strong></td>
              <td>O((|V| + |E|) log |V|)</td>
              <td>O((|V| + |E|) log |V|) with lower constant factor</td>
              <td>A* has slight per-node heuristic calculation overhead</td>
            </tr>
            <tr>
              <td><strong>Multi-Objective Support</strong></td>
              <td>Finds single-source all-destinations optimal tree</td>
              <td>Requires component-admissible composite heuristics</td>
              <td>Weighted sum of admissible heuristics remains admissible</td>
            </tr>
            <tr>
              <td><strong>Path Optimality</strong></td>
              <td>Guaranteed optimal for non-negative edge costs</td>
              <td>Guaranteed optimal when heuristic is admissible</td>
              <td>Both find identical optimal route costs</td>
            </tr>
          </tbody>
        </table>

        <div style={{ background: "var(--slate-50)", padding: "12px", borderRadius: "8px", fontSize: "0.78rem", color: "var(--slate-700)" }}>
          <strong>Heuristic Admissibility Proof:</strong> Our distance heuristic computes straight-line Haversine distance \(h(n)\). Because the shortest physical distance between two geographical points is a straight line, real road distances \(d(n, goal)\) are strictly \(\ge h(n)\). For time heuristics, \(h_{time}(n) = h(n) / \text{speed}_{max}\). Since actual vehicular speed is bounded by \(\text{speed}_{max}\), the heuristic never overestimates remaining time, guaranteeing optimal A* termination.
        </div>
      </div>

      {/* ── Section 3: Transparent Scientific Standards ── */}
      <div className="card" style={{ borderLeft: "4px solid #059669" }}>
        <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ShieldCheck size={16} color="#059669" />
          <span>Honesty Disclosures & Scientific Boundaries</span>
        </div>
        <div style={{ fontSize: "0.82rem", color: "var(--slate-700)", lineHeight: 1.6 }}>
          <p style={{ marginBottom: "8px" }}>
            To uphold academic and engineering honesty, EcoRoute Optimizer enforces explicit boundaries:
          </p>
          <ul style={{ paddingLeft: "20px" }}>
            <li>
              <strong>Simulated Traffic:</strong> Congestion multipliers and delays are generated by statistical time-of-day and incident models. They are clearly labeled as <em>simulated</em>, not live telematics.
            </li>
            <li>
              <strong>Relative Baselines:</strong> EcoRoute carbon savings are never cited in an absolute vacuum. All savings percentages are calculated relative to named benchmarks (e.g. <em>Fastest Route Baseline</em>).
            </li>
            <li>
              <strong>Time Penalty Transparency:</strong> Minimizing carbon often requires traveling slightly slower or taking bypasses. EcoRoute always highlights the exact time trade-off (e.g. <em>+2.1 min</em>) so drivers make informed choices.
            </li>
            <li>
              <strong>Powertrain Accounting:</strong> Direct tailpipe exhaust (petrol/diesel) is clearly distinguished from EV electrical grid factors (0.82 kg CO₂/kWh national grid average).
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

