# System Architecture & Technical Specifications: ORCA
## SIH 2026 PS 26176: Marine EcOsystem Reasoning with Collaborative Agents

### 1. Architectural Blueprint

```
+---------------------------------------------------------------------------------+
|                                USER INTERFACE                                   |
|   Next.js 14 + Tailwind CSS + CartoDB Dark Leaflet Maps + Vernacular Synthesis   |
+----------------------------------------+----------------------------------------+
                                         | REST / SSE
+----------------------------------------v----------------------------------------+
|                          FASTAPI API GATEWAY & ROUTER                           |
|       /api/query   /api/conversations   /api/layers   /api/alerts   /api/export |
+----------------------------------------+----------------------------------------+
                                         |
+----------------------------------------v----------------------------------------+
|                       ORCA COLLABORATIVE ORCHESTRATOR                           |
|                                                                                 |
|   +-------------------------------------------------------------------------+   |
|   |                      ORCA DYNAMIC TASK PLANNER                          |   |
|   |    - Intent Classifier (Safety / PFZ / Routes / Comparisons / Trends)   |   |
|   |    - Geocoder & Coastal Node Resolver (Lat, Lon, Radius, Harbors)       |   |
|   |    - Temporal Normalizer (Forecast vs Observed vs Historical Baselines) |   |
|   |    - Multi-Constraint Extractor (MPA Avoidance, Max SWH, Min Chl-a)     |   |
|   +------------------------------------+------------------------------------+   |
|                                        |                                        |
|         +------------------------------+------------------------------+         |
|         |                              |                              |         |
|   +-----v--------+             +-------v--------+             +-------v-----+   |
|   | OCEAN AGENT  |             | WEATHER AGENT  |             |  GEO AGENT  |   |
|   | Waves, Swell |             | Winds, Gusts,  |             | Boundaries, |   |
|   | SST, Current |             | IMD Warnings   |             | MPAs, EEZ   |   |
|   +-----+--------+             +-------+--------+             +-------+-----+   |
|         |                              |                              |         |
|         |                      +-------v--------+                     |         |
|         |                      | FISHERY AGENT  |                     |         |
|         |                      | PFZs, Chl-a,   |                     |         |
|         |                      | Thermal Fronts |                     |         |
|         |                      +-------+--------+                     |         |
|         |                              |                              |         |
|         |                      +-------v--------+                     |         |
|         |                      |  VESSEL AGENT  |                     |         |
|         |                      | Corridor Risk, |                     |         |
|         |                      | Segment Danger |                     |         |
|         |                      +-------+--------+                     |         |
|         |                              |                              |         |
|         +------------------------------+------------------------------+         |
|                                        |                                        |
|   +------------------------------------v------------------------------------+   |
|   |                     CROSS-DOMAIN CORRELATION ENGINE                     |   |
|   |    - Multi-sensor temporal anomaly analysis                             |   |
|   |    - Regional cross-sector comparative metrics                          |   |
|   +------------------------------------+------------------------------------+   |
|                                        |                                        |
|   +------------------------------------v------------------------------------+   |
|   |                   DETERMINISTIC MARINE RISK ENGINE                      |   |
|   |    - SWH (40%) + Wind (30%) + Swell (15%) + Warnings (15%) + MPA        |   |
|   |    - Transparent Factor Decomposition (+pts per hazard)                 |   |
|   |    - Triggered Authoritative Rule Engine                                |   |
|   +------------------------------------+------------------------------------+   |
|                                        |                                        |
|   +------------------------------------v------------------------------------+   |
|   |                 REPORT & VISUALIZATION PLANNER AGENT                    |   |
|   |    - Adaptive Component Selection (Safety / PFZ / Route / Comparison)   |   |
|   |    - Dynamic GeoJSON Layer Synthesis (Points, Heatmaps, Polygons)       |   |
|   |    - Complete Provenance & Data Freshness Tracking                      |   |
|   |    - Vernacular Multi-language Synthesis (10 Coastal Languages)        |   |
|   +-------------------------------------------------------------------------+   |
+---------------------------------------------------------------------------------+
```

---

### 2. Multi-Agent Collaborative Workflow

1. **ORCA Dynamic Task Planner (`orca/agents/planner.py`)**:
   - Parses arbitrary user inputs without predefined hardcoded question templates.
   - Extracts:
     - **Intent**: `marine_safety`, `fishing_zones`, `route_analysis`, `regional_comparison`, `historical_trend`, `geofence_restriction`.
     - **Spatial Target**: Resolves coastal hubs (Visakhapatnam, Kakinada, Chennai, Paradip, etc.) or raw coordinate pairs into explicit latitude/longitude and operational radius.
     - **Temporal Horizon**: Resolves expressions ("tomorrow morning", "last 24 hours", "next 3 days", "tonight") into discrete UTC intervals and sets `is_forecast`, `is_historical`, and `offset_hours`.
     - **Constraints**: Detects instructions like "avoid protected areas", "wave under 1.5m", "high chlorophyll".
     - **Agent Selection**: Computes the optimal sub-graph of specialist agents to invoke.

2. **Specialist Domain Agents**:
   - `OceanAgent`: Dispatches to `BaseOceanProvider` to extract Significant Wave Height (m), Swell (height, period, direction), SST (°C), and ocean currents.
   - `WeatherAgent`: Dispatches to `BaseWeatherProvider` for 10m surface winds (knots), gusts, visibility, precipitation, and official IMD warnings.
   - `FisheryAgent`: Ingests potential fishing zones, ranks candidates by thermal boundaries and chlorophyll enrichment, and prunes zones that breach user constraints.
   - `GeoAgent`: Performs spatial audits against the official Indian Marine Protected Area registry (Gahirmatha, Gulf of Mannar, Malvan, Coringa, Jamnagar, Andaman) and finds nearest coastal harbors.
   - `VesselAgent`: Generates route waypoints, samples segment-by-segment wave risk, detects boundary crossings with MPAs, and computes transit ETA.

3. **Deterministic Marine Risk Engine (`orca/risk/engine.py`)**:
   - Replaces unpredictable LLM guessing with a mathematically rigorous, weighted maritime risk matrix.
   - Outputs an exact composite score (0-100), categorization (`LOW`, `MODERATE`, `HIGH`, `SEVERE`), and a transparent factor breakdown.

4. **Adaptive Visualization Engine (`orca/agents/report_agent.py`)**:
   - Rather than returning a static five-card template, inspects the question's semantics and constructs a dynamic UI plan.

---

### 3. Data Flow & Provenance Architecture
Every returned metric is encapsulated in an `EvidenceRecord`:
- **Provider**: Official authority (INCOIS, IMD, MoEFCC, Copernicus)
- **Dataset**: Specific observational/forecast model feed
- **Value & Unit**: Measured physical quantity
- **Timestamp**: Temporal validity window
- **Status Tag**: `LIVE`, `FORECAST`, `CACHED`, `HISTORICAL`, `DEMO`
- **Reliability Notes**: Sensor calibration citation
