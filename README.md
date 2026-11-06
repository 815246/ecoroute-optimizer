# EcoRoute Optimizer

> **Research question:** Can heuristic search plus multi-objective optimization find routes with lower estimated environmental impact without unnecessarily increasing travel time? Compare against Dijkstra and fastest-route baselines. Report honestly, including cases where the baseline wins.

EcoRoute Optimizer is an agentic, multi-objective sustainable route planner that computes and compares shortest-distance (Dijkstra), fastest-time, and Pareto-optimal multi-objective routes across distance, travel time, fuel/energy consumption, and CO₂ emissions.

> ⚠️ **IMPORTANT HONESTY NOTICE:**
> - Traffic multipliers are **simulated**, not live.
> - Emissions are **estimates**; accounting boundaries (tailpipe vs grid-average) are explicitly surfaced in every response.
> - All savings claims are relative to a **named baseline** (e.g. fastest route or shortest route).
> - We never claim the optimizer is always better.

---

## Tech Stack

- **Backend:** Python 3.11+, FastAPI, Uvicorn, Pydantic v2, NetworkX, OSMnx, NumPy, Pandas, SQLAlchemy 2.x, Alembic, PostgreSQL (SQLite fallback for dev/tests), Geopy, matplotlib, pytest, pytest-cov, ruff.
- **Frontend:** React 18 + Vite, Axios, React-Leaflet, Recharts, lucide-react.
- **Infrastructure:** Docker + Docker Compose, Makefile.
- **Agent Architecture:** Plain Python classes + Central Coordinator (no LLM calls anywhere).

---

## Directory Structure

```text
ecoroute-optimizer/
  backend/
    agents/          # RoadNetworkAgent, TrafficAgent, RouteSearchAgent,
                     # EmissionAgent, OptimizationAgent, ReplanningAgent, Coordinator
    algorithms/      # dijkstra, astar, multi_objective, normalization, candidates
    services/        # graph_service, vehicle_service, emission_service, route_service, explain_service
    api/             # routes, vehicles, simulation, history, analytics
    database/        # models, db, migrations/
    main.py          # FastAPI application entry point
    config.py        # Central Pydantic settings
  frontend/          # React 18 + Vite frontend
    src/
      components/    # RouteForm, RouteResults, MapView, EmissionsChart,
                     # TradeoffExplainer, HistoryView, AgentTrace
      services/      # api.js (axios client)
    index.html
    vite.config.js
    package.json
  data/              # simulated_roads.json, vehicle_configs.json, emission_factors.json
  tests/             # Unit and integration test suite (64+ tests, ~86% coverage)
  experiments/       # Reproducible benchmarks and evaluation harness
  docs/              # METHODOLOGY.md, PRESENTATION_OUTLINE.md, CHECKLIST.md
```

---

## Quick Start

### 1. Local Development (SQLite)

```bash
# Set up Python 3.11+ virtual environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# Run test suite
make test

# Start FastAPI development server
make run
# API documentation: http://localhost:8000/docs
```

### 2. Frontend Development

```bash
cd frontend
npm install
npm run dev
# UI available at: http://localhost:5173
# (proxies /api/* to FastAPI on port 8000)
```

### 3. Docker Compose (PostgreSQL + API + Frontend)

```bash
cp .env.example .env
docker compose up --build
```

---

## Available Commands

- `make test` — Run pytest test suite with coverage
- `make lint` — Check code style with Ruff
- `make fmt` — Auto-format code with Ruff
- `make run` — Launch FastAPI development server
- `make bench` — Run reproducible experiment suite
- `make bench-quick` — Quick experiment run (seed 42, 30 trials)

---

## API Reference

| Method | Path | Description |
|:-------|:-----|:------------|
| GET | `/api/routes/presets` | List weight presets (eco, fastest, balanced) |
| POST | `/api/routes/plan` | Plan multi-objective routes |
| POST | `/api/routes/optimize` | Alias for plan |
| GET | `/api/routes/{id}` | Get saved journey by ID |
| POST | `/api/routes/replan` | Evaluate and replan active route |
| GET | `/api/vehicles` | List vehicle configurations |
| POST | `/api/vehicles` | Save custom vehicle |
| GET | `/api/history` | Get journey history |
| GET | `/api/analytics` | Get analytics summary |
| POST | `/api/simulation/traffic` | Apply simulated traffic scenario |
| GET | `/health` | Health check |

### Example: Plan Route

```bash
curl -X POST http://localhost:8000/api/routes/plan \
  -H "Content-Type: application/json" \
  -d '{
    "source": "A",
    "destination": "E",
    "vehicle": "petrol_hatchback",
    "weights": "eco",
    "departure_hour": 8
  }'
```

**Response includes:**
- `routes[]` — ranked list with `co2_kg`, `travel_time_min`, `distance_km`, `is_pareto`, `tradeoff_vs_fastest`
- `explanation` — template-based honest trade-off text
- `agent_trace[]` — pipeline step log
- `traffic_label` — always `"Simulated traffic, not live"`

---

## Benchmark Results (Phase 8)

Run with seed 42, 30 trials on a 20-node grid graph with Petrol Hatchback:

| Metric | Value |
|:-------|:------|
| A\* search space pruning vs. Dijkstra | **50.5%** |
| Avg CO₂ savings vs. fastest-route baseline | **3.09%** |
| Trials where eco route ≥ fastest in CO₂ | **100%** |

> **Honest caveat:** On the small demo/simulated graphs, eco and fastest routes often coincide. Savings are expected to be more pronounced on larger real-world OSM graphs but have not been validated at that scale.

```bash
# Reproduce:
PYTHONPATH=ecoroute-optimizer:ecoroute-optimizer/backend \
  .venv/bin/python3 -m experiments.run_benchmarks --seed 42 --quick
```

---

## Current Status

- **Phase 1: Scaffold & Environment** — Complete ✅
- **Phase 2: Graph Model, Dijkstra, A\*** — Complete ✅
- **Phase 3: Vehicle & Emission Agents** — Complete ✅
- **Phase 4: Multi-objective Optimization** — Complete ✅
- **Phase 5: Coordinator, FastAPI & Database** — Complete ✅
- **Phase 6: OpenStreetMap Integration** — Complete ✅
- **Phase 7: Dynamic Traffic & Replanning** — Complete ✅
- **Phase 8: Experiment Harness** — Complete ✅
- **Phase 9: React Frontend** — Complete ✅
- **Phase 10: Documentation & Polish** — Complete ✅

---

## Honesty Commitments

This project does not exaggerate its findings. Every response from the system:
1. Labels traffic data as "Simulated traffic, not live"
2. Labels emissions as "Tailpipe / grid-average estimate"
3. Names the baseline for every savings claim (fastest or shortest route)
4. Reports time penalties alongside CO₂ savings
5. Flags when the baseline outperforms the eco route

See [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md) for full model specification.
