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
- **Frontend:** React 18 + Vite, Tailwind CSS v4, Axios, React-Leaflet, Recharts, lucide-react, React Router, Vitest.
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
  data/              # simulated_roads.json, vehicle_configs.json, emission_factors.json
  tests/             # Unit and integration test suite
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
# API documentation available at: http://localhost:8000/docs
```

### 2. Docker Compose (PostgreSQL + API + Frontend)

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
- `make bench-quick` — Quick experiment run for CI
- `make docker-up` — Spin up Docker Compose services
- `make docker-down` — Shut down Docker Compose services

---

## Current Status

- **Phase 1: Scaffold & Environment** — Complete ✅
- **Phase 2: Graph Model, Dijkstra, A\*** — Pending
- **Phase 3: Vehicle & Emission Agents** — Pending
- **Phase 4: Multi-objective Optimization** — Pending
- **Phase 5: Coordinator, FastAPI & Database** — Pending
- **Phase 6: OpenStreetMap Integration** — Pending
- **Phase 7: Dynamic Traffic & Replanning** — Pending
- **Phase 8: Experiment Harness** — Pending
- **Phase 9: React Frontend** — Pending
- **Phase 10: Documentation & Polish** — Pending
