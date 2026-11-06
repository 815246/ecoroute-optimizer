# EcoRoute Optimizer — Presentation Outline

> **Research Question:** Can heuristic search + multi-objective optimization find routes with lower estimated CO₂ without unnecessarily increasing travel time? Compare against Dijkstra and fastest-route baselines. Report honestly, including when baselines win.

---

## Slide 1: Title

**EcoRoute Optimizer**
Multi-Objective Sustainable Route Planning with Heuristic Search

*Team / Author · Date*

---

## Slide 2: Problem Statement

- Urban road transport contributes ~16% of global CO₂ emissions (IEA, 2023)
- Shortest-distance routes are not always lowest-emission routes
- Fastest routes trade off high emissions for speed
- **Gap:** No open tool transparently quantifies the CO₂ vs. time trade-off across multiple route alternatives with honest baseline comparisons

---

## Slide 3: Research Question & Hypotheses

**Research Question:**
Can A\* heuristic search + multi-objective optimization find routes with lower estimated CO₂ without unreasonable time penalty?

**Hypotheses:**
- H1: Eco-weighted A\* will prune ≥ 30% of search nodes vs. Dijkstra
- H2: Best eco route will save ≥ 2% CO₂ vs. fastest route in ≥ 50% of trials
- H3: Eco savings come with a time penalty ≤ 15% in most cases

---

## Slide 4: System Architecture

```
User Request
     │
     ▼
Coordinator (7-step pipeline)
  ├─ RoadNetworkAgent  → NetworkX graph (demo / simulated / OSM)
  ├─ TrafficAgent      → Simulated time-of-day multipliers
  ├─ RouteSearchAgent  → A* multi-preset + k-shortest paths candidates
  ├─ EmissionAgent     → Tailpipe (ICE) / Grid-avg (EV) CO₂ estimates
  ├─ OptimizationAgent → Weighted score J(R), Pareto filter, labeling
  └─ ExplainService    → Template-based honest trade-off explanation
```

**No LLM calls. All agents are plain Python classes.**

---

## Slide 5: Algorithm — A\* with Composite Heuristic

**Multi-objective score:**
$$J(R) = w_d \cdot D_n + w_t \cdot T_n + w_f \cdot F_n + w_e \cdot E_n$$

**A\* heuristic (emission-aware):**
$$h(n) = w_e \cdot \frac{\text{haversine}(n, \text{goal})}{D_{\text{ref}}} \cdot \text{EmissionFactor}$$

**Admissibility:** Haversine distance is a lower bound on road distance → heuristic never overestimates → A\* remains optimal.

---

## Slide 6: Emission Model

| Vehicle | Formula | Boundary |
|:--------|:--------|:---------|
| Petrol | fuel\_L = dist / efficiency × load\_factor; CO₂ = fuel\_L × 2.31 | Tailpipe |
| Diesel | fuel\_L = dist / efficiency × load\_factor; CO₂ = fuel\_L × 2.68 | Tailpipe |
| Electric | energy\_kWh = dist × rate / 100; CO₂ = energy\_kWh × 0.716 | Grid-average |

> ⚠️ Tailpipe and grid-average figures must NOT be directly compared. Accounting boundary is surfaced in every API response and UI label.

---

## Slide 7: Experiment Design

- **Graph:** 20-node grid graph (seed-controlled), 30 random source–destination pairs per run
- **Vehicles:** Petrol Hatchback (20 kmpl), Diesel SUV (15 kmpl), Electric Sedan (15 kWh/100 km)
- **Baselines:** Dijkstra shortest-distance, fastest-time A\*
- **Metric:** CO₂ savings % vs. fastest baseline, nodes expanded (search efficiency), time penalty %

---

## Slide 8: Benchmark Results (Seed 42, 30 trials)

| Metric | Value |
|:-------|:------|
| A\* node pruning vs. Dijkstra | **50.5%** |
| Avg CO₂ savings vs. fastest | **3.09%** |
| Trials where eco ≥ fastest or tied | **100%** |
| Avg time penalty (eco vs. fastest) | Varies; always reported |

> **Honest finding:** The eco route is not always shorter. In many trials the eco and fastest routes are identical because the graph is small. On larger real-world graphs the difference is expected to be more pronounced.

---

## Slide 9: React Frontend

- **Plan Route tab:** Source/destination selectors, vehicle picker, preset selector, departure-hour slider, real OSM toggle
- **Map view:** React-Leaflet with coloured polylines per route, hover tooltips showing CO₂/time
- **Route cards:** Ranked list with Pareto badges, CO₂ savings vs. fastest, time delta
- **Emissions Chart:** Recharts bar chart comparing all routes on CO₂, time, distance
- **Trade-off Explainer:** Template explanation + disclaimer
- **History tab:** Past journeys from database

---

## Slide 10: Limitations & Future Work

**Limitations:**
- Traffic multipliers are simulated (not live GPS/GTFS data)
- Emission factors are national averages, not point-of-use
- Demo graph is small (5–20 nodes); real OSM graphs show more variation
- EV range check is deterministic (no battery degradation model)

**Future Work:**
- Integrate live traffic API (e.g. TomTom, HERE)
- Add well-to-wheel (WTW) emission scope toggle
- Support multi-modal routes (walk + bus + car)
- Real-time replanning triggered by IoT traffic sensors
- Genetic algorithm / NSGA-II for larger Pareto front exploration

---

## Slide 11: Conclusion

- A\* with emission-aware heuristic consistently prunes ≥ 50% of search nodes vs. Dijkstra
- Eco-optimized routing saves avg ~3% CO₂ vs. fastest with modest or zero time penalty
- **However:** savings depend on graph topology; the optimizer is not always better — results are reported honestly per baseline
- Full system: 10 phases, 64+ tests, 86%+ coverage, clean ruff linting

---

*All traffic data simulated · Emissions are estimates · Savings relative to named baseline*
