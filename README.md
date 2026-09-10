# ORCA — Marine EcOsystem Reasoning with Collaborative Agents
### Smart India Hackathon (SIH 2026) — Problem Statement 26176
**Domain:** Ministry of Earth Sciences (MoES) / INCOIS / Department of Fisheries

[![Tests](https://img.shields.io/badge/pytest-109%20passed-brightgreen.svg)](docs/TESTING.md)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-blue.svg)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-teal.svg)](https://fastapi.tiangolo.com)
[![Leaflet](https://img.shields.io/badge/GIS-Leaflet%20%2B%20CARTO%20Dark%20Matter-199900.svg)](https://leafletjs.com)
[![Shapely](https://img.shields.io/badge/Spatial-Shapely%20%2F%20PostGIS-orange.svg)](https://shapely.readthedocs.io)
[![Languages](https://img.shields.io/badge/Vernacular-10%20Languages-indigo.svg)](docs/ARCHITECTURE.md)

---

## 1. Executive Summary

ORCA is a full-stack, generalized marine-intelligence platform designed for **SIH 2026 Problem Statement 26176**. It unifies India's fragmented oceanographic, meteorological, and fisheries data into a collaborative multi-agent decision support platform.

Instead of presenting six rigid predefined analysis applications or relying on generic black-box chatbots with canned answers, ORCA dynamically understands arbitrary natural-language requests, executes deterministic mathematical risk calculations, performs exact GIS geofencing against Marine Protected Areas (MPAs), and visualizes rich, evidence-backed spatial intelligence on an interactive, keyless ocean map.

```
NATURAL LANGUAGE QUERY
         ↓
DYNAMIC INTENT, SPATIAL, TEMPORAL & CONSTRAINT PLANNER
         ↓
VALIDATION CIRCUIT BREAKER (Stop & Clarify if Missing Parameters)
         ↓
COLLABORATIVE SPECIALIST AGENTS (Ocean, Weather, Fishery, Geo, Vessel, Risk)
         ↓
AUTHORITATIVE DATA RETRIEVAL (INCOIS OSF / IMD / Copernicus / Demo)
         ↓
CROSS-DOMAIN CORRELATION & DETERMINISTIC RISK ENGINE (0-100 Score)
         ↓
COMPLETE EVIDENCE PROVENANCE (Sensors, Units, Timestamps, Freshness)
         ↓
DYNAMIC VISUALIZATION ENGINE (Interactive Map + Adaptive Result Cards)
```

---

## 2. Core Capabilities & Judge Differentiators

1. **Generalized Intelligence (Zero Canned Answers & Zero Hardcoded Fallbacks)**:
   - Evaluated across **52 unseen test queries** with arbitrary combinations of locations, time windows, and constraints.
   - Dynamic Intent Parser identifies marine safety, potential fishing zones, passage routes, regional comparisons, and historical anomalies.
   - Strict Circuit Breaker: If critical parameters (such as route endpoints) are missing, ORCA asks for clarification immediately without falling back to Visakhapatnam or generic safety.

2. **Deterministic Risk Engine (No LLM Guessing)**:
   - Computes weighted composite risk scores (0-100) based on authoritative INCOIS Significant Wave Height thresholds, IMD surface winds, swell surge, and active weather alerts.
   - Displays transparent factor decomposition (+pts added per hazard).

3. **Geospatial Geofencing & Marine Protected Areas**:
   - Evaluates exact point-in-polygon and line intersection geometry against official Indian Marine Sanctuaries (Gahirmatha Olive Ridley Sanctuary, Gulf of Mannar, Malvan, Coringa, Jamnagar, Sundarbans).
   - Prevents regulatory violations by alerting vessels when routes cross strict conservation zones.

4. **Genuinely Keyless Interactive Marine Cartography**:
   - Built on Leaflet with multi-basemap support (CARTO Dark Matter ocean theme, Esri World Ocean Bathymetry, Esri Satellite Imagery, OpenStreetMap).
   - **Zero manual API key required from judges or users** — 100% legal, truthful attributions with zero broken tiles or watermark errors.
   - Dynamic layer overlays: INCOIS Wave Energy hazard envelope, ranked PFZ markers (#1, #2, #3 badges color-coded by suitability), Marine Sanctuary polygons, and vessel transit corridors.
   - Interactive click-to-inspect ocean coordinates.

5. **Conversational Workspace Sidebar**:
   - Focused on user sessions, conversation history, stakeholder persona selection, and live data telemetry (INCOIS, IMD, MoEFCC, Open-Meteo).
   - Analysis capabilities emerge dynamically from natural language queries, not rigid template buttons.

6. **Vernacular Multilingual Architecture**:
   - Supports 10 Indian coastal languages: **English, Telugu, Hindi, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati, Odia**.
   - Auto-detects scripts and generates localized summaries with authentic domain marine vocabulary.

7. **Dual Mode Resilience (Live & Deterministic Demo)**:
   - `ORCA_MODE=LIVE`: Ingests real-time Copernicus / Open-Meteo and INCOIS feeds.
   - `ORCA_MODE=DEMO`: Operates deterministically across all Indian coastal sectors without network dependencies, guaranteeing 100% demo reliability.

---

## 3. Quick Start & Execution Guide

### Local Development

#### 1. Backend (FastAPI on Port 8000)
```bash
cd backend
python run.py
```
- API Base: `http://127.0.0.1:8000`
- Interactive Swagger Docs: `http://127.0.0.1:8000/docs`
- Health Check: `http://127.0.0.1:8000/health`

#### 2. Frontend (Next.js on Port 3000)
```bash
cd frontend
npm install
npm run dev
```
- Web Application: `http://localhost:3000`
- Open the browser to immediately experience the interactive marine intelligence platform with zero API key configuration needed.

---

## 4. Running the Automated Test Suite

```bash
cd backend
python -m pytest -v
```
**Result: 109 Passed (including all critical regressions and 52 unseen generalization tests).**

---

## 5. Repository Documentation Index

| Document | Purpose |
| :--- | :--- |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Multi-agent state graph, risk engine, and GIS architecture |
| [DATA_SOURCES.md](docs/DATA_SOURCES.md) | Authoritative registry of INCOIS, IMD, Copernicus & MoEFCC feeds |
| [SIH_REQUIREMENTS.md](docs/SIH_REQUIREMENTS.md) | Detailed mapping to Problem Statement 26176 deliverables |
| [SIH_BENCHMARKS.md](docs/SIH_BENCHMARKS.md) | Latency, throughput, and accuracy benchmark report |
| [DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) | Step-by-step 3–5 minute competition demo walkthrough |
| [TESTING.md](docs/TESTING.md) | Test suite specifications and generalization matrix |
| [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | REST API endpoint schemas and examples |
| [LIMITATIONS.md](docs/LIMITATIONS.md) | Operational boundaries, assumptions, and disclaimers |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker & cloud deployment instructions |
| [AUDIT_REPORT.md](docs/AUDIT_REPORT.md) | Architecture audit and security compliance report |
| [ORCA_TEST_AUDIT.md](ORCA_TEST_AUDIT.md) | 65-query empirical audit across 12 test categories |
