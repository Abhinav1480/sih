# CLAUDE.md: ORCA — Marine EcOsystem Reasoning with Collaborative Agents
## SIH 2026 Problem Statement 26176 Persistent Guide

### 1. Mission & Vision
ORCA is a full-stack, generalized marine-intelligence and decision-support platform designed for SIH 2026 PS 26176. It ingests multi-source oceanographic, meteorological, and geospatial data across Indian waters, orchestrates collaborative specialist agents, performs deterministic safety and suitability calculations, preserves provenance, and visualizes dynamic maps, time-series charts, and multilingual insights.

### 2. Core Architectural Principles
1. **Generalized Intelligence**: NEVER hardcode questions or answers. The query understanding engine parses arbitrary natural language intents, locations, coordinates, temporal horizons, and constraints.
2. **Deterministic Risk Engine**: Claude / LLM does NOT make up risk scores. Calculations for wave height, swell, wind, and storm alerts are computed mathematically by `orca/risk/engine.py` using explicit, configurable thresholds. Claude explains and contextualizes the deterministic findings.
3. **Real Geospatial Geometry**: Spatial filtering, radius searches, distance, and geofence intersections are executed with spatial GIS mathematics (`orca/geospatial/`), never LLM spatial hallucinations.
4. **Adaptive Visualization**: The output UI does not use a fixed five-card template. A Visualization Planner determines the optimal combination of components (Map, Risk Card, Conditions Grid, Time-Series Chart, Route Corridor, Comparison Table, Evidence Drawer) based on query semantics.
5. **Decoupled Data Architecture**: Clear separation of Live Providers vs. Deterministic Demo Providers. Every returned observation carries transparent provenance, data freshness tags (`LIVE`, `FORECAST`, `CACHED`, `HISTORICAL`, `DEMO`), and source citations.
6. **Vernacular Multilingual Pipeline**: Architecture supporting 10 Indian coastal languages (English, Telugu, Hindi, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati, Odia).

### 3. Repository Structure
```
sih/
├── backend/                  # FastAPI + Pydantic v2 + Agent Orchestrator
│   ├── app/
│   │   ├── api/              # REST Endpoints (/api/query, /api/map, /api/alerts, etc.)
│   │   ├── agents/           # Planner & Specialist Agents (Ocean, Weather, Fishery, Geo, Vessel, Risk)
│   │   ├── providers/        # Authoritative Data Providers & Deterministic Demo Fixtures
│   │   ├── geospatial/       # GIS math, Indian MPAs, EEZ, Coastal Harbors
│   │   ├── risk/             # Deterministic Marine Risk Matrix
│   │   ├── database/         # SQLite / PostGIS models, sessions & history storage
│   │   └── utils/            # Temporal normalizer, Multilingual engine, Security
│   ├── tests/                # Automated unit & 30+ generalization test suites
│   ├── requirements.txt
│   └── run.py                # Single-command server starter
├── frontend/                 # Next.js 14 / React / TypeScript / Tailwind CSS
│   ├── src/
│   │   ├── app/              # App Router (page.tsx, layout.tsx, globals.css)
│   │   ├── components/       # MapView, Results, Cards, Timeline, Evidence, Modals
│   │   └── lib/              # API client, types, spatial utilities
│   └── package.json
├── docs/                     # Full SIH specifications, benchmarks, data sources
├── Dockerfile.backend
├── Dockerfile.frontend
├── docker-compose.yml
├── .env.example
├── README.md
└── CLAUDE.md
```

### 4. Development & Execution Commands

#### Backend
```bash
# Setup Virtual Environment (Windows PowerShell)
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt

# Run Backend Server (FastAPI on http://127.0.0.1:8000)
python backend/run.py
# or: uvicorn app.main:app --reload --port 8000 --app-dir backend

# Run Automated Test Suite
pytest backend/tests -v
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
# Running on http://localhost:3000
```

#### Docker Full Stack
```bash
docker compose up --build
```

### 5. The Honesty Rule (enforced, not advisory)

> **No user-visible value may originate from a `||` default or an equivalent
> fallback, and no agency name may appear beside a value that agency did not
> produce.**

Read **`docs/HONESTY_RULE.md`** before changing anything that renders a value
or reports a source. It is enforced mechanically on every build and in CI:

```bash
cd frontend && npm run check:honesty     # also runs as prebuild
pytest -m honesty                        # backend half
```

In short: a value ORCA did not measure must say so (fall back to `unavailable`,
never to a plausible number); the browser never bands a value or decides safe
versus unsafe; `calculate_marine_risk` is the only risk formula; and an agency
name arrives from the response or not at all. Every check has a proof test that
has been watched to fail (18 frontend, 5 backend) — `npm run check:honesty:proof`,
`pytest -m honesty_proof`.

Genuine exceptions go in `frontend/scripts/honesty-allowlist.mjs` with a
one-line justification. There are four. Fixing the code or sharpening the rule
is nearly always better than adding a fifth.

### 6. Coding & Safety Conventions
- **No Secrets in Repo**: Never commit API keys or private credentials. Use `.env` and `.env.example`.
- **Type Safety**: Use Pydantic v2 schemas for all backend endpoints and TypeScript interfaces for frontend props.
- **Fail-Soft Architecture**: If an external provider is unreachable, fall back to cached data or inform the user cleanly with partial results. Never crash or silently hallucinate fake live data.
- **Explainability**: Provide transparent factors for every risk score and PFZ ranking.
