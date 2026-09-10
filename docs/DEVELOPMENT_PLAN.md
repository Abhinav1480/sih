# ORCA Marine Intelligence: Development & Rebuild Plan
## SIH 2026 PS 26176 Full Autonomous Rebuild

### 1. Rebuild Objectives & Root Cause Remediation
The original ORCA prototype suffered from three critical flaws:
1. **Fallback Bias:** Query ambiguity or missing parameters caused the planner to fall back to Visakhapatnam and generic marine safety assessments.
2. **Missing Google Maps Cartography:** The frontend lacked official Google Maps Platform integration, occasionally resulting in broken tile watermarks or "API KEY REQUIRED" errors.
3. **Over-generalized Output Schemas:** All queries returned the same universal summary and recommendation cards rather than dynamic schemas tailored to Route Analysis, Fishing Zones, Regional Comparisons, or Historical Trends.

### 2. Implemented Architecture Milestones

#### Milestone 1: Zero-Fallback Query Understanding & Circuit Breaker
- Implemented `OrcaPlanner` and `boundaries.py` with multi-entity extraction and strict missing-parameter detection.
- When critical parameters (such as route origin/destination or target comparison nodes) are missing, the query transitions to `NEEDS_CLARIFICATION` and halts with `can_execute = False`.
- Zero default assumptions: Visakhapatnam is never assumed unless explicitly requested or geolocated.

#### Milestone 2: Mandatory Google Maps Platform Cartography
- Rebuilt `MapView.tsx` using official `@googlemaps/js-api-loader` v1.16+ (`setOptions` and `importLibrary("maps")`).
- Integrated custom dark ocean cartographic styling (`#06101e` bathymetry with cyan accents).
- Added multi-overlay rendering:
  - Custom SVG markers for ranked PFZ hotspots (numbered, color-coded by suitability and MPA status).
  - Polygons for Marine Protected Areas (Coringa, Gulf of Mannar, Gahirmatha, Sundarbans).
  - Polylines for Recommended Transit Corridors vs High-Risk Alternatives.
  - Interactive click coordinate inspector.
  - Graceful configuration card when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is not set, keeping all other ORCA panels functional.

#### Milestone 3: Dynamic Result Types & Visualization Engine
- Rebuilt `ResultContainer.tsx` to conditionally render:
  - `ClarificationCard`: Guided prompt resolution for missing endpoints.
  - `MarineSafetyView`: Risk gauge, environmental cards, IMD squall warnings.
  - `FishingZonesView`: Ranked PFZ cards, SST/chlorophyll indicators, MPA conflict flags.
  - `RouteAnalysisView`: Waypoint breakdown, distance, transit hours, sanctuary crossing checks.
  - `RegionalComparisonView`: Side-by-side metric tables and radar/bar comparisons.
  - `HistoricalTrendView`: 7-day time series charts, anomalies, and trend summaries.

#### Milestone 4: Comprehensive Test Suite
- Automated 109 backend tests across 7 test suites:
  - `test_regression_critical.py`: Verifies all 6 SIH critical failure cases.
  - `test_generalization_50_queries.py`: Tests 52 unseen queries spanning 9 distinct marine categories.
  - `test_geospatial.py`, `test_risk_engine.py`, `test_temporal.py`, `test_agents.py`.

### 3. Startup & Verification Protocol
- Backend: `python run.py` (Port 8000)
- Frontend: `npm run dev` (Port 3000)
- Test Suite: `python -m pytest`
