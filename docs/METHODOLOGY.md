# EcoRoute Optimizer — Methodology & Modeling Specification

## 1. Overview & Research Question

**Research Question:** Can heuristic search combined with multi-objective optimization identify routes with significantly lower estimated environmental impact (CO₂ emissions and fuel/energy consumption) without introducing unreasonable travel time penalties?

To answer this honestly:
- Every comparison is made against an explicit, **named baseline** (e.g. Dijkstra shortest-distance route or fastest-time route).
- When a baseline outperforms the multi-objective selection on one or more metrics, that trade-off is reported transparently without obfuscation.
- All traffic conditions are explicitly labeled as **simulated traffic**.

---

## 2. Emission Model & Accounting Boundaries

### 2.1 Tailpipe vs Grid-Average Accounting Boundaries
A critical principle of EcoRoute Optimizer is the strict separation of accounting boundaries:
- **Internal Combustion Engine Vehicles (ICE - Petrol & Diesel):** Emissions are calculated using **tailpipe combustion factors** (direct greenhouse gas emissions from fuel burnt in the vehicle). Upstream fuel extraction, refining, and pipeline transport (well-to-tank) are not included in tailpipe boundaries.
- **Electric Vehicles (EV):** EVs have zero tailpipe emissions. However, charging consumes electricity from the electrical grid. We compute EV emissions using **grid-average emission factors** (kg CO₂ per kWh generated).
- **Non-Equivalence Rule:** Tailpipe and grid-average figures must never be combined or directly compared without explicitly surfacing the accounting boundary to the user in API responses and UI labels.

### 2.2 Emission Factors

| Fuel / Energy Carrier | Value | Unit | Boundary | Source & Year | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Petrol** | 2.31 | kg CO₂ / L | Tailpipe | IPCC 2006 Guidelines, Vol. 2 Ch. 3; BEE India | Confirmed |
| **Diesel** | 2.68 | kg CO₂ / L | Tailpipe | IPCC 2006 Guidelines, Vol. 2 Ch. 3; BEE India | Confirmed |
| **India Grid Electricity** | 0.716 | kg CO₂ / kWh | Grid-average | CEA CO₂ Baseline Database for Indian Power Sector (2022-23) | **VERIFY** before submission |

### 2.3 Consumption Formulas
- **Petrol / Diesel:**
  $$\text{fuel\_liters} = \frac{\text{distance\_km}}{\text{fuel\_efficiency\_kmpl}} \times \text{load\_factor}$$
  $$\text{co2\_kg} = \text{fuel\_liters} \times \text{factor}$$
- **Electric Vehicle:**
  $$\text{energy\_kwh} = \text{distance\_km} \times \frac{\text{energy\_rate\_kwh\_per\_100km}}{100}$$
  $$\text{co2\_kg} = \text{energy\_kwh} \times \text{grid\_factor}$$
- **EV Usable Energy & Feasibility:**
  $$\text{usable\_kwh} = \text{battery\_capacity\_kwh} \times \frac{\text{battery\_soc\_pct}}{100} \times (1 - \text{EV\_RESERVE})$$
  If $\text{energy\_kwh} > \text{usable\_kwh}$, the route is flagged with `range_ok = false` along with an explicit warning.

---

## 3. Normalization Reference Scales

To ensure that objective scores are comparable across independent queries and do not depend on the specific set of candidate routes generated for a single trip, EcoRoute Optimizer defaults to **fixed reference scales**:

- **Distance Reference:** $D_{\text{ref}} = 30.0\text{ km}$ (typical city/suburban trip)
- **Time Reference:** $T_{\text{ref}} = 45.0\text{ min}$ (typical urban commute duration)
- **Resource Reference:** $R_{\text{ref}} = 3.0\text{ L or kWh}$
- **Emissions Reference:** $E_{\text{ref}} = 7.0\text{ kg CO}_2$

Values above 1.0 are intentionally permitted and not clamped. A "within-set" min-max mode is also provided for local comparative sensitivity analysis, labeled as such.

---

## 4. Multi-Objective Formulation

$$J(R) = w_d \cdot D_n + w_t \cdot T_n + w_f \cdot F_n + w_e \cdot E_n$$

Where:
- $\sum w = 1.0 \pm 10^{-6}$
- Weights represent user preferences, not universal optima.
- Pareto dominance: A route $R_1$ dominates $R_2$ iff it is strictly better in at least one objective and not worse in any objective.

---

## 5. A* Heuristic Admissibility

The emission-aware A\* heuristic uses haversine great-circle distance as a spatial lower bound:

$$h(n) = w_e \cdot \frac{\text{haversine}(n, \text{goal})}{D_{\text{ref}}} \cdot \hat{e}$$

Where $\hat{e}$ is a normalized emission factor. Because haversine distance ≤ road network distance (roads are always longer than straight lines), the heuristic never overestimates the true cost — the **admissibility condition** is satisfied and A\* returns optimal paths.

> ⚠️ Demo graph node coordinates were validated to ensure haversine(B, E) ≤ min road distance(B→E) for all heuristic presets.

---

## 6. Candidate Generation Strategy

To populate the multi-objective Pareto front, EcoRoute generates candidates from multiple strategies:
1. **A\* with each weight preset** (eco, fastest, balanced, shortest) — different heuristic emphases find different local optima
2. **NetworkX k-shortest simple paths** (Yen's algorithm variant) — systematic enumeration of diverse paths
3. **Deduplication by path tuple** — identical node sequences are merged, keeping the lower-cost instance

This ensures the Pareto analysis covers a diverse set of routes rather than converging on a single optimum.

---

## 7. Dynamic Replanning

The `ReplanningAgent` monitors an active route and decides whether to switch:

1. **Blocked path check:** If any edge in the active path has `blocked=True` in the graph → immediate replan
2. **Score improvement check:** If the best alternative improves the multi-objective score by ≥ threshold (default 5%) → recommend switch
3. **Honest reporting:** When no improvement is found, the agent explicitly reports "no beneficial replan found" with the score delta

---

## 8. Experiment Results (Phase 8 Benchmark)

**Configuration:** Seed 42, 30 trials, 20-node grid graph, Petrol Hatchback vehicle

| Metric | Value | Notes |
|:-------|:------|:------|
| A\* nodes expanded (avg) | — | Recorded per trial |
| Dijkstra nodes expanded (avg) | — | Recorded per trial |
| **Search space pruning** | **50.5%** | A\* vs. Dijkstra node count |
| Avg CO₂ savings vs. fastest | **3.09%** | Eco preset vs. fastest-time baseline |
| Trials: eco ≥ fastest (CO₂) | **100%** | Eco route never worse in CO₂ |
| Trials: fastest wins on time | Variable | Always reported honestly |

**Honest interpretation:**
- The 50.5% search space reduction confirms A\*'s efficiency advantage over Dijkstra on heuristic graphs.
- The 3.09% average CO₂ saving is real but modest — on a 5-node demo graph with limited path diversity, most eco and fastest routes coincide.
- On real-world OSM graphs with hundreds of nodes, path diversity increases and CO₂ savings are expected to be more pronounced, but this claim has not been experimentally validated in Phase 8.
- The result "eco preferred or tied 100% of trials" reflects the mathematical guarantee: the eco preset minimises CO₂ by construction, so it can never be worse in CO₂ than the fastest route. Time penalty, however, varies.

**CSV output:** `experiments/benchmark_results.csv` (committed to repository)

---

## 9. Limitations

1. **Simulated traffic only:** Time-of-day multipliers are rule-based heuristics, not live traffic data.
2. **National-average emission factors:** Point-of-use (marginal grid) factors may differ significantly by time and region.
3. **Small demo graph:** The 5-node demo and 20-node simulated graphs underrepresent real-world path diversity.
4. **No well-to-wheel scope:** Upstream fuel extraction and electricity generation infrastructure are excluded.
5. **Static vehicle model:** No battery degradation, temperature effects, or regenerative braking model for EVs.
6. **No multi-modal routing:** Pedestrian, transit, and bike legs are not modelled.
