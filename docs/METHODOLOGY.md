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
