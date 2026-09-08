# ORCA Marine Intelligence API Documentation
## SIH 2026 PS 26176 REST Specifications

Base URL: `http://127.0.0.1:8000` (Local) / `/api`

Interactive OpenAPI / Swagger Documentation: `http://127.0.0.1:8000/docs`

---

### 1. Primary Query Endpoint

#### `POST /api/query`
Executes natural language marine query through the collaborative agent orchestrator.

**Request Body (`application/json`)**:
```json
{
  "query": "Is it safe to go fishing tomorrow morning near Visakhapatnam?",
  "conversation_id": "optional-uuid",
  "preferred_language": "en"
}
```

**Response Body (`application/json`)**:
```json
{
  "query_id": "b18204aa-9c12-4c28-9842-fc295fa94e1d",
  "conversation_id": "6724a9e3-827f-45a2-990a-11539ba473d0",
  "query_text": "Is it safe to go fishing tomorrow morning near Visakhapatnam?",
  "detected_language": "en",
  "intent": "marine_safety",
  "location": {
    "name": "Visakhapatnam",
    "latitude": 17.6868,
    "longitude": 83.2185,
    "radius_km": 40.0,
    "nearest_port": "Visakhapatnam Major Port",
    "state": "Andhra Pradesh",
    "maritime_zone": "Central Bay of Bengal"
  },
  "temporal": {
    "label": "Tomorrow Morning (05:00 - 11:00)",
    "start_time": "2026-09-09T05:00:00",
    "end_time": "2026-09-09T11:00:00",
    "is_forecast": true,
    "is_historical": false,
    "offset_hours": 24
  },
  "executive_summary": "Marine conditions near Visakhapatnam for Tomorrow Morning present an overall LOW RISK (Score: 13/100). Significant wave height is 1.6m (Moderate) with sustained surface winds of 12.5 knots.",
  "recommendation": "Conditions are favorable for fishing craft and coastal navigation during Tomorrow Morning (05:00 - 11:00). Keep continuous marine VHF watch on Channel 16 and respect boundary geofences.",
  "risk_assessment": {
    "overall_score": 13,
    "category": "LOW",
    "contributing_factors": [
      {
        "name": "Significant Wave Height (SWH)",
        "value": "1.6 m",
        "points_added": 10,
        "description": "Moderate (1.5 - 2.2m) - Caution for small craft"
      },
      {
        "name": "Wind Speed",
        "value": "12.5 kt (23.2 km/h)",
        "points_added": 3,
        "description": "Moderate Breeze (10 - 16 kt)"
      }
    ],
    "triggered_rules": [],
    "missing_inputs": [],
    "confidence_percentage": 95,
    "data_quality_label": "Authoritative Observations & Calibrated Forecasts"
  },
  "ocean_conditions": {
    "significant_wave_height_m": 1.6,
    "swell_height_m": 1.1,
    "swell_period_sec": 8.5,
    "swell_direction_deg": 160.0,
    "sea_surface_temp_c": 28.6,
    "ocean_current_speed_m_s": 0.45,
    "ocean_current_direction_deg": 75.0,
    "sea_state": "Moderate",
    "status": "FORECAST",
    "source": "INCOIS OSF Multi-Grid (Demo Mode)",
    "timestamp": "2026-09-09T05:00:00"
  },
  "weather_conditions": {
    "wind_speed_knots": 12.5,
    "wind_direction_deg": 180.0,
    "wind_gust_knots": 16.9,
    "air_temp_c": 28.5,
    "precipitation_mm": 0.0,
    "visibility_km": 10.0,
    "storm_warning": null,
    "alert_level": "None",
    "status": "FORECAST",
    "source": "IMD Coastal Marine Bulletin (Demo Mode)",
    "timestamp": "2026-09-09T05:00:00"
  },
  "visualization_plan": {
    "result_type": "marine_safety",
    "components_to_render": ["risk_card", "conditions_grid", "map", "evidence_drawer"],
    "center_lat": 17.6868,
    "center_lon": 83.2185,
    "default_zoom": 9,
    "active_layers": ["layer_wave_risk", "layer_locations", "layer_mpas"]
  },
  "map_layers": [...],
  "evidence": [...],
  "agent_activity": [...]
}
```

---

### 2. Conversational Endpoints

#### `GET /api/conversations`
Returns list of active and recent conversation threads.

#### `GET /api/conversations/{id}/analyses`
Returns all analyses executed within a specific conversation thread.

---

### 3. Geospatial & Alert Endpoints

#### `GET /api/layers/mpas`
Returns official Indian Marine Protected Areas (Gahirmatha, Gulf of Mannar, Malvan, Coringa, Jamnagar, Andaman) as GeoJSON polygons with conservation rules.

#### `GET /api/alerts`
Returns active INCOIS High Wave & IMD coastal hazard bulletins.

#### `POST /api/export/report`
Accepts an `OrcaAnalysisResponse` payload and returns formal printable Markdown text.
