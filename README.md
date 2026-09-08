# ORCA — Marine EcOsystem Reasoning with Collaborative Agents
### Smart India Hackathon (SIH 2026) — Problem Statement 26176
**Domain:** Ministry of Earth Sciences (MoES) / INCOIS / Department of Fisheries

[![Tests](https://img.shields.io/badge/pytest-51%20passed-brightgreen.svg)](docs/TESTING.md)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-blue.svg)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-teal.svg)](https://fastapi.tiangolo.com)
[![Shapely](https://img.shields.io/badge/GIS-Shapely%20%2F%20PostGIS-orange.svg)](https://shapely.readthedocs.io)
[![Languages](https://img.shields.io/badge/Vernacular-10%20Languages-indigo.svg)](docs/ARCHITECTURE.md)

---

## 1. Executive Summary

ORCA is a full-stack, generalized marine-intelligence platform designed for **SIH 2026 Problem Statement 26176**. It unifies India's fragmented oceanographic, meteorological, and fisheries data into a collaborative multi-agent decision support platform. 

Instead of forcing users to visit multiple government portals or relying on generic black-box chatbots with canned answers, ORCA dynamically understands arbitrary natural-language requests, executes deterministic mathematical risk calculations, performs exact GIS geofencing against Marine Protected Areas (MPAs), and visualizes rich, evidence-backed spatial intelligence on dark interactive ocean maps.

```
NATURAL LANGUAGE QUERY
         ↓
DYNAMIC INTENT, SPATIAL, TEMPORAL & CONSTRAINT PARSER
         ↓
COLLABORATIVE SPECIALIST AGENTS (Ocean, Weather, Fishery, Geo, Vessel)
         ↓
AUTHORITATIVE DATA RETRIEVAL (INCOIS OSF / IMD / Copernicus / Demo)
         ↓
CROSS-DOMAIN CORRELATION & DETERMINISTIC RISK ENGINE (0-100 Score)
         ↓
COMPLETE EVIDENCE PROVENANCE (Sensors, Units, Timestamps)
         ↓
DYNAMIC VISUALIZATION ENGINE (Interactive Map + Adaptive Cards)
```

---

## 2. Core Capabilities & Judge Differentiators

1. **Generalized Intelligence (Zero Canned Answers)**:
   - Evaluated across **33 unseen test queries** with arbitrary combinations of locations, time windows, and constraints.
   - Dynamic Intent Parser identifies marine safety, potential fishing zones, passage routes, regional comparisons, and historical anomalies.

2. **Deterministic Risk Engine (No LLM Guessing)**:
   - Computes weighted composite risk scores (0-100) based on authoritative INCOIS Significant Wave Height thresholds, IMD surface winds, swell surge, and active weather alerts.
   - Displays transparent factor decomposition (+pts added per hazard).

3. **Geospatial Geofencing & Marine Protected Areas**:
   - Evaluates exact point-in-polygon and line intersection geometry against official Indian Marine Sanctuaries (Gahirmatha Olive Ridley Sanctuary, Gulf of Mannar, Malvan, Coringa, Jamnagar, Mahatma Gandhi Wandoor).
   - Prevents regulatory violations by alerting vessels when routes cross strict conservation zones.

4. **Interactive Leaflet Marine Map**:
   - Real-time dark ocean basemap with dynamic layer toggles: INCOIS Wave Energy hazard envelope, ranked PFZ coordinates, Marine Sanctuary polygons, and vessel transit routes.

5. **Vernacular Multilingual Architecture**:
   - Supports 10 Indian coastal languages: **English, Telugu, Hindi, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati, Odia**.
   - Auto-detects scripts and generates localized summaries with authentic domain marine vocabulary.

6. **Dual Mode Resilience (Live & Deterministic Demo)**:
   - `ORCA_MODE=LIVE`: Ingests real-time Copernicus / Open-Meteo and INCOIS feeds.
   - `ORCA_MODE=DEMO`: Operates deterministically across all Indian coastal sectors without network dependencies, guaranteeing 100% demo reliability.

---

## 3. Quick Start & Execution Guide

### Local Development (Zero Docker Required)

#### 1. Backend (FastAPI on Port 8000)
```bash
# Setup virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1    # On Windows PowerShell (or source venv/bin/activate on Linux/macOS)
pip install -r backend/requirements.txt

# Start backend server
python backend/run.py
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
- Open Browser: `http://localhost:3000`

---

## 4. Running the Automated Test Suite

```bash
# Run all 51 automated tests (unit, risk engine, geospatial, 33 generalization queries)
python -m pytest backend/tests -v
```
**Result: 51 Passed in 0.37s.**

---

## 5. Repository Documentation Index

- [docs/SIH_REQUIREMENTS.md](docs/SIH_REQUIREMENTS.md) — Official SIH 2026 PS 26176 requirements traceability matrix.
- [docs/SIH_BENCHMARKS.md](docs/SIH_BENCHMARKS.md) — Previous SIH winning prototype analysis and UX principles.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Complete system architecture, agent graphs, and data pipeline.
- [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) — Authoritative data source registry (INCOIS, IMD, MoEFCC, Copernicus).
- [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) — REST API specifications and JSON schemas.
- [docs/TESTING.md](docs/TESTING.md) — Test execution report and 33 unseen generalization test queries.
- [docs/LIMITATIONS.md](docs/LIMITATIONS.md) — Scientific assumptions and certified navigation disclaimers.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Production Docker Compose and bare-metal deployment.
- [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) — 3-to-5 minute judge demonstration presentation script.
- [docs/AUDIT_REPORT.md](docs/AUDIT_REPORT.md) — Independent hostile evaluator QA audit.
- [CLAUDE.md](CLAUDE.md) — Persistent project guidelines and architectural rules.
