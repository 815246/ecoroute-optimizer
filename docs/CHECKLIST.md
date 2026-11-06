# EcoRoute Optimizer — Project Checklist

> Legend: ✅ Complete · 🔄 Partial · ❌ Not started

---

## Phase 1: Scaffold & Environment
- [x] ✅ Directory structure created
- [x] ✅ FastAPI skeleton (`main.py`, `config.py`)
- [x] ✅ SQLAlchemy models (`database/models.py`)
- [x] ✅ Data files (`data/simulated_roads.json`, `data/vehicle_configs.json`, `data/emission_factors.json`)
- [x] ✅ Docker Compose (`docker-compose.yml`)
- [x] ✅ Makefile with `test`, `lint`, `fmt`, `run`, `bench` targets
- [x] ✅ Initial test: `tests/test_health.py`

## Phase 2: Graph Model, Dijkstra, A\*
- [x] ✅ `RoadNetworkAgent` with `create_demo_graph()`, `generate_graph()`, `haversine_distance_km()`
- [x] ✅ Dijkstra (heap-based) with `SearchResult`, `NoRouteFound`
- [x] ✅ A\* with `heuristic_factory()` (distance / time / resource / emission / composite)
- [x] ✅ Heuristic admissibility verified (haversine ≤ road distance)
- [x] ✅ `GraphService` with caching (`get_demo`, `get_simulated`, `get_osm` stub)
- [x] ✅ `VehicleService` with `get_defaults()`, `get_by_id()`
- [x] ✅ Tests: `test_road_network.py`, `test_dijkstra.py`, `test_astar.py`, `test_graph_service.py`

## Phase 3: Vehicle & Emission Agents
- [x] ✅ `EmissionService` with `get_factor()`, `get_accounting_method()`
- [x] ✅ `EmissionAgent` with petrol/diesel/EV calculation, `check_ev_feasibility()`, speed factor
- [x] ✅ Tests: `test_emission_agent.py` (10 tests)

## Phase 4: Multi-Objective Optimization
- [x] ✅ `normalization.py` — `normalize_fixed()`, `normalize_minmax()`
- [x] ✅ `multi_objective.py` — `validate_weights()`, `weighted_score()`, `pareto_filter()`, `PRESETS`
- [x] ✅ `candidates.py` — `generate_candidates()` (A\* multi-preset + k-shortest-paths + dedup)
- [x] ✅ `RouteSearchAgent` delegates to `generate_candidates()`
- [x] ✅ `OptimizationAgent.rank_routes()` — labels, Pareto flags, honest trade-off comparisons
- [x] ✅ Tests: `test_multi_objective.py` (7 tests)

## Phase 5: Coordinator, FastAPI, Database
- [x] ✅ `Coordinator` — 7-step pipeline with `agent_trace`
- [x] ✅ `ExplainService` — template-based honest comparisons (3 cases)
- [x] ✅ `RouteService` — `save_journey()`, `save_routes()`, `get_journey()`, `get_history()`
- [x] ✅ `TrafficAgent` — `apply_time_of_day()`, `apply_incident()`, `snapshot()`, `restore()`
- [x] ✅ Database `init_db()` called in FastAPI lifespan
- [x] ✅ API endpoints: `GET /presets`, `POST /optimize`, `POST /plan`, `GET /{id}`
- [x] ✅ API endpoints: `GET /vehicles`, `POST /vehicles`
- [x] ✅ API endpoints: `GET /history`
- [x] ✅ API endpoints: `GET /analytics`
- [x] ✅ API endpoints: `POST /simulation/traffic`
- [x] ✅ Tests: `test_api_and_coordinator.py` (7 tests)

## Phase 6: OpenStreetMap Integration
- [x] ✅ `RoadNetworkAgent.load_osm_graph()` with OSMnx 2.1 bbox format `(left, bottom, right, top)`
- [x] ✅ Disk caching via `.graphml`, bbox validation, edge enrichment
- [x] ✅ `RoadNetworkAgent._geocode_point()` — coordinate parsing + Nominatim geocoding
- [x] ✅ `GraphService.get_osm()` — in-memory caching
- [x] ✅ Tests: `test_osm.py` (4 tests with mocked OSMnx)

## Phase 7: Dynamic Traffic & Replanning
- [x] ✅ `ReplanningAgent` with `FullRerunAStar` strategy
- [x] ✅ Blocked path detection, 5% threshold comparison, switch/no-switch decision
- [x] ✅ `POST /api/routes/replan` endpoint
- [x] ✅ Tests: `test_dynamic_traffic_replanning.py` (5 tests)

## Phase 8: Experiment Harness
- [x] ✅ `experiments/run_benchmarks.py` — parametrized trials, A\* vs Dijkstra comparison
- [x] ✅ CO₂ savings tracking, honest baseline reporting, CSV export
- [x] ✅ CLI flags: `--seed`, `--quick`, `--output`
- [x] ✅ Benchmark result (seed=42, 30 trials): 50.5% nodes pruned, avg 3.09% CO₂ savings
- [x] ✅ Tests: `test_benchmarks.py` (1 test)

## Phase 9: React Frontend
- [x] ✅ `vite.config.js` with `/api` proxy to FastAPI
- [x] ✅ `index.html` entry point
- [x] ✅ `src/main.jsx` ReactDOM entry
- [x] ✅ `src/index.css` global styles (CSS custom properties, no Tailwind dependency)
- [x] ✅ `src/App.jsx` — shell with Plan/History tabs, disclaimer bar
- [x] ✅ `src/services/api.js` — axios client, `planRoute()`, `getVehicles()`, `getPresets()`, `getHistory()`
- [x] ✅ `src/components/RouteForm.jsx` — inputs, vehicle/preset selectors, departure slider
- [x] ✅ `src/components/RouteResults.jsx` — ranked route cards with Pareto/eco/fastest badges
- [x] ✅ `src/components/MapView.jsx` — React-Leaflet map with coloured polylines
- [x] ✅ `src/components/EmissionsChart.jsx` — Recharts bar chart comparing routes
- [x] ✅ `src/components/TradeoffExplainer.jsx` — explanation text + disclaimer
- [x] ✅ `src/components/HistoryView.jsx` — journey history table
- [x] ✅ `src/components/AgentTrace.jsx` — collapsible pipeline step timeline
- [x] ✅ `package.json` with axios, react-leaflet, leaflet, recharts, lucide-react
- [x] ✅ `npm install` dependencies installed

## Phase 10: Documentation & Polish
- [x] ✅ `README.md` updated with all phases ✅, API reference, frontend setup
- [x] ✅ `docs/METHODOLOGY.md` with benchmark results section
- [x] ✅ `docs/PRESENTATION_OUTLINE.md` created (11 slides)
- [x] ✅ `docs/CHECKLIST.md` created (this file)
- [x] ✅ All 64+ tests passing
- [x] ✅ ruff check clean
- [x] ✅ ruff format clean
- [x] ✅ Benchmark quick run verified
- [x] ✅ Git commits per phase (Phases 1–10)

---

## Honesty & Constraint Checklist

- [x] No LLM calls anywhere — all agents are plain Python classes
- [x] Traffic always labeled "Simulated traffic, not live"
- [x] Emissions always surface accounting boundary (tailpipe vs grid-average)
- [x] All CO₂ savings claims relative to named baseline (fastest or shortest)
- [x] Never claim optimizer is always better
- [x] EV feasibility check surfaces range warnings
- [x] Frontend disclaimer bar on every page
- [x] Route cards show time penalty alongside CO₂ savings

---

## Test Coverage Summary

| Module | Tests | Coverage |
|:-------|:------|:---------|
| algorithms (dijkstra, astar, multi_objective) | 20+ | ≥90% |
| agents (emission, road_network, coordinator, replanning) | 20+ | ≥85% |
| services (graph, vehicle, route) | 10+ | ≥80% |
| API (routes, vehicles, history, analytics) | 10+ | ≥80% |
| experiments | 1 | — |
| **Total** | **64+** | **~86%** |
