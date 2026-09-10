/**
 * CACHED bundled fallback response. This is a real DEMO-mode envelope captured
 * from the backend on 2026-09-10T09:54:36.637866 for the query below, shipped in the
 * JS bundle so the app has something to show with no backend and no prior sync.
 * It must NEVER be presented as live; api.ts stamps meta.cached / __cached on it.
 * Provider / provider_tier values are verbatim from the capture.
 */
import type { OrcaAnalysisResponse } from "../types";
import type { CachedResponse } from "../offline/store";

export const FALLBACK_SAVED_AT = "2026-09-10T09:54:36.637866";

export const FALLBACK_RESPONSE: OrcaAnalysisResponse = {
  "request_id": "a4307eb6-9be5-4727-8e81-9798844ad202",
  "session_id": "0231f1ec-e089-46b3-8267-36a4dfcf8ab2",
  "intent": "marine_safety",
  "language": "en",
  "answer": {
    "headline": "MODERATE risk at Kakinada for Tomorrow Morning (05:00 - 11:00) (score 30/100)",
    "verdict": "CAUTION",
    "narrative": "Marine conditions near Kakinada for Tomorrow Morning (05:00 - 11:00) present an overall MODERATE RISK (Score: 30/100). Significant wave height is 2.3m (Moderate) with sustained surface winds of 21.9 knots.",
    "confidence": 95
  },
  "risk": {
    "score": 30,
    "band": "MODERATE",
    "factors": [
      {
        "name": "Significant Wave Height (SWH)",
        "value": "2.3 m",
        "points_added": 18,
        "description": "Rough (2.2 - 3.0m) - Unfavorable for artisanal vessels"
      },
      {
        "name": "Wind Speed",
        "value": "21.9 kt (40.6 km/h)",
        "points_added": 8,
        "description": "Fresh Breeze (17 - 22 kt)"
      },
      {
        "name": "Swell Height",
        "value": "2.0 m (Period: 11.0s)",
        "points_added": 2,
        "description": "Swell wave energy (2.0m)"
      },
      {
        "name": "Coastal Weather Warning (YELLOW)",
        "value": "YELLOW",
        "points_added": 2,
        "description": "Moderate squalls likely in open coastal waters. Fishermen advised to exercise caution."
      }
    ],
    "triggered_rules": [
      "Small-craft wave limit: significant wave height 2.3m exceeds the 2.0m advisory limit.",
      "Active coastal warning: YELLOW alert in effect for this maritime division."
    ],
    "missing_inputs": [],
    "confidence": 95,
    "data_quality": "Full factor coverage"
  },
  "cards": [
    {
      "id": "card_risk",
      "title": "Marine Risk Assessment - Kakinada",
      "evidence_ids": [
        "8c988c38",
        "82f6d52d",
        "7c83e887",
        "c810bc5a",
        "da7288df",
        "bc117389"
      ],
      "type": "risk_summary",
      "score": 30,
      "band": "MODERATE",
      "verdict": "CAUTION",
      "factors": [
        {
          "name": "Significant Wave Height (SWH)",
          "value": "2.3 m",
          "points_added": 18,
          "description": "Rough (2.2 - 3.0m) - Unfavorable for artisanal vessels"
        },
        {
          "name": "Wind Speed",
          "value": "21.9 kt (40.6 km/h)",
          "points_added": 8,
          "description": "Fresh Breeze (17 - 22 kt)"
        },
        {
          "name": "Swell Height",
          "value": "2.0 m (Period: 11.0s)",
          "points_added": 2,
          "description": "Swell wave energy (2.0m)"
        },
        {
          "name": "Coastal Weather Warning (YELLOW)",
          "value": "YELLOW",
          "points_added": 2,
          "description": "Moderate squalls likely in open coastal waters. Fishermen advised to exercise caution."
        }
      ],
      "triggered_rules": [
        "Small-craft wave limit: significant wave height 2.3m exceeds the 2.0m advisory limit.",
        "Active coastal warning: YELLOW alert in effect for this maritime division."
      ]
    },
    {
      "id": "card_advisory",
      "title": "Advisory",
      "evidence_ids": [
        "8c988c38",
        "82f6d52d",
        "7c83e887",
        "c810bc5a",
        "da7288df",
        "bc117389"
      ],
      "type": "advisory_text",
      "body": "Conditions are favorable for fishing craft and coastal navigation during Tomorrow Morning (05:00 - 11:00). Maintain standard coastal safety protocols, monitor local marine broadcasts or NavIC advisories, and respect boundary geofences."
    }
  ],
  "layers": [
    {
      "id": "layer_locations",
      "name": "Selected Marine Coordinates",
      "kind": "geojson",
      "geometry_type": "point",
      "features": [
        {
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [
              82.2475,
              16.9891
            ]
          },
          "properties": {
            "name": "Kakinada",
            "title": "Target: Kakinada",
            "radius_km": 40,
            "type": "target_center"
          }
        }
      ],
      "url": null,
      "wms_params": {},
      "visible_by_default": true,
      "color": "#00f5d4",
      "legend_title": "Target Port / Zone",
      "legend_unit": "",
      "attribution": null,
      "provider_tier": "FALLBACK"
    },
    {
      "id": "layer_mpas",
      "name": "Marine Protected Areas & Sanctuaries (MoEFCC)",
      "kind": "geojson",
      "geometry_type": "polygon",
      "features": [
        {
          "type": "Feature",
          "geometry": {
            "type": "Polygon",
            "coordinates": [
              [
                [
                  86.75,
                  20.6
                ],
                [
                  87.15,
                  20.8
                ],
                [
                  87.25,
                  20.55
                ],
                [
                  86.95,
                  20.35
                ],
                [
                  86.75,
                  20.6
                ]
              ]
            ]
          },
          "properties": {
            "id": "mpa_gahirmatha",
            "name": "Gahirmatha Marine Sanctuary",
            "designation": "Marine Wildlife Sanctuary (Olive Ridley Turtle Mass Nesting)",
            "restriction": "STRICT_NO_TAKE",
            "authority": "MoEFCC / Odisha Forest Dept",
            "description": "World's largest rookery for Olive Ridley Sea Turtles. Mechanized fishing and trawling strictly prohibited within 20 km of shoreline from November to May."
          }
        },
        {
          "type": "Feature",
          "geometry": {
            "type": "Polygon",
            "coordinates": [
              [
                [
                  78.9,
                  9.1
                ],
                [
                  79.35,
                  9.35
                ],
                [
                  79.45,
                  9.15
                ],
                [
                  79.05,
                  8.85
                ],
                [
                  78.9,
                  9.1
                ]
              ]
            ]
          },
          "properties": {
            "id": "mpa_gulf_of_mannar",
            "name": "Gulf of Mannar Marine National Park",
            "designation": "Biosphere Reserve & Marine National Park",
            "restriction": "RESTRICTED_CONSERVATION",
            "authority": "MoEFCC / Tamil Nadu Forest Dept",
            "description": "Critical biodiversity hotspot with 21 islands, coral reefs, sea-cow (Dugong dugon), and seagrass beds. Commercial trawling and purse seining prohibited."
          }
        },
        {
          "type": "Feature",
          "geometry": {
            "type": "Polygon",
            "coordinates": [
              [
                [
                  73.4,
                  16.02
                ],
                [
                  73.5,
                  16.08
                ],
                [
                  73.52,
                  16.02
                ],
                [
                  73.42,
                  15.98
                ],
                [
                  73.4,
                  16.02
                ]
              ]
            ]
          },
          "properties": {
            "id": "mpa_malvan",
            "name": "Malvan Marine Sanctuary",
            "designation": "Marine Sanctuary (Sindhudurg Coastal Ecosystem)",
            "restriction": "CONTROLLED_ZONING",
            "authority": "MoEFCC / Maharashtra Mangrove Cell",
            "description": "Rich coral and pearl oyster banks surrounding Sindhudurg Fort. Trawling and anchoring in core reef zones banned."
          }
        },
        {
          "type": "Feature",
          "geometry": {
            "type": "Polygon",
            "coordinates": [
              [
                [
                  69.2,
                  22.4
                ],
                [
                  70.1,
                  22.8
                ],
                [
                  70.2,
                  22.5
                ],
                [
                  69.35,
                  22.25
                ],
                [
                  69.2,
                  22.4
                ]
              ]
            ]
          },
          "properties": {
            "id": "mpa_kutch_jamnagar",
            "name": "Marine National Park & Sanctuary, Gulf of Kutch",
            "designation": "First Marine National Park of India",
            "restriction": "STRICT_NO_TAKE",
            "authority": "MoEFCC / Gujarat Forest Dept",
            "description": "Encompasses 42 islands with mangroves, live coral formations, sponges, and endangered marine turtles. Industrial vessel entry and destructive fishing banned."
          }
        },
        {
          "type": "Feature",
          "geometry": {
            "type": "Polygon",
            "coordinates": [
              [
                [
                  92.5,
                  11.5
                ],
                [
                  92.65,
                  11.6
                ],
                [
                  92.68,
                  11.45
                ],
                [
                  92.52,
                  11.38
                ],
                [
                  92.5,
                  11.5
                ]
              ]
            ]
          },
          "properties": {
            "id": "mpa_mahatma_gandhi",
            "name": "Mahatma Gandhi Marine National Park (Wandoor)",
            "designation": "Marine National Park",
            "restriction": "STRICT_NO_TAKE",
            "authority": "A&N Forest Dept / MoEFCC",
            "description": "Protects pristine coral reefs and nesting grounds of leatherback, hawksbill, and green sea turtles. Commercial fishing prohibited."
          }
        },
        {
          "type": "Feature",
          "geometry": {
            "type": "Polygon",
            "coordinates": [
              [
                [
                  82.2,
                  16.8
                ],
                [
                  82.4,
                  16.95
                ],
                [
                  82.45,
                  16.8
                ],
                [
                  82.25,
                  16.65
                ],
                [
                  82.2,
                  16.8
                ]
              ]
            ]
          },
          "properties": {
            "id": "mpa_coringa_mangroves",
            "name": "Coringa Wildlife Sanctuary & Marine Zone",
            "designation": "Estuarine & Marine Wildlife Sanctuary",
            "restriction": "RESTRICTED_CONSERVATION",
            "authority": "AP Forest Dept (Godavari Estuary)",
            "description": "Second largest mangrove formation in India, critical nursery for commercial marine fish and fishing cats. Mechanized fishing restricted in mouth of Hope Island."
          }
        }
      ],
      "url": null,
      "wms_params": {},
      "visible_by_default": true,
      "color": "#f72585",
      "legend_title": "Sanctuary / Conservation Zone",
      "legend_unit": "",
      "attribution": null,
      "provider_tier": "FALLBACK"
    },
    {
      "id": "layer_wave_risk",
      "name": "INCOIS Wave Hazard Envelope",
      "kind": "geojson",
      "geometry_type": "point",
      "features": [
        {
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [
              82.2475,
              16.9891
            ]
          },
          "properties": {
            "title": "Wave Energy: Kakinada",
            "wave_height_m": 2.29,
            "sea_state": "Moderate",
            "risk_level": "Moderate",
            "radius": 40000
          }
        }
      ],
      "url": null,
      "wms_params": {},
      "visible_by_default": true,
      "color": "#ff9f1c",
      "legend_title": "Significant Wave Height",
      "legend_unit": "meters",
      "attribution": null,
      "provider_tier": "FALLBACK"
    },
    {
      "id": "layer_bhuvan_coralreefs",
      "name": "Coral Reefs (ISRO Bhuvan / MoEFCC)",
      "kind": "wms",
      "geometry_type": null,
      "features": [],
      "url": "https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms",
      "wms_params": {
        "service": "WMS",
        "version": "1.1.1",
        "request": "GetMap",
        "layers": "moef:coralreefs",
        "styles": "",
        "format": "image/png",
        "transparent": "true",
        "srs": "EPSG:4326"
      },
      "visible_by_default": true,
      "color": "#ff6b9d",
      "legend_title": "Ecologically Sensitive Zone",
      "legend_unit": "",
      "attribution": "ISRO / NRSC Bhuvan",
      "provider_tier": "ISRO"
    },
    {
      "id": "layer_bhuvan_mangroves",
      "name": "Mangroves (ISRO Bhuvan / MoEFCC)",
      "kind": "wms",
      "geometry_type": null,
      "features": [],
      "url": "https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms",
      "wms_params": {
        "service": "WMS",
        "version": "1.1.1",
        "request": "GetMap",
        "layers": "moef:mangroves",
        "styles": "",
        "format": "image/png",
        "transparent": "true",
        "srs": "EPSG:4326"
      },
      "visible_by_default": true,
      "color": "#2d6a4f",
      "legend_title": "Ecologically Sensitive Zone",
      "legend_unit": "",
      "attribution": "ISRO / NRSC Bhuvan",
      "provider_tier": "ISRO"
    },
    {
      "id": "layer_bhuvan_coastal_lulc",
      "name": "Coastal Land Use / Land Cover (ISRO Bhuvan)",
      "kind": "wms",
      "geometry_type": null,
      "features": [],
      "url": "https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms",
      "wms_params": {
        "service": "WMS",
        "version": "1.1.1",
        "request": "GetMap",
        "layers": "coastal:cps_lulc_mod",
        "styles": "",
        "format": "image/png",
        "transparent": "true",
        "srs": "EPSG:4326"
      },
      "visible_by_default": false,
      "color": "#8ecae6",
      "legend_title": "Coastal Zone Classification",
      "legend_unit": "",
      "attribution": "ISRO / NRSC Bhuvan",
      "provider_tier": "ISRO"
    },
    {
      "id": "layer_bhuvan_islands_ec",
      "name": "East Coast Islands (ISRO Bhuvan)",
      "kind": "wms",
      "geometry_type": null,
      "features": [],
      "url": "https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms",
      "wms_params": {
        "service": "WMS",
        "version": "1.1.1",
        "request": "GetMap",
        "layers": "iland:island_ec_190615",
        "styles": "",
        "format": "image/png",
        "transparent": "true",
        "srs": "EPSG:4326"
      },
      "visible_by_default": false,
      "color": "#ffb703",
      "legend_title": "Island Landform",
      "legend_unit": "",
      "attribution": "ISRO / NRSC Bhuvan",
      "provider_tier": "ISRO"
    }
  ],
  "evidence": [
    {
      "id": "8c988c38",
      "provider": "ORCA Deterministic Demo Model (synthetic ocean state, not an observation)",
      "provider_tier": "FALLBACK",
      "dataset": "Significant Wave Height",
      "variable": "Significant Wave Height (SWH)",
      "value": "2.29",
      "unit": "m",
      "location": "Kakinada",
      "coordinates": "16.989°N, 82.248°E",
      "observation_or_forecast_time": "2026-09-11 05:00 UTC",
      "retrieval_time": "2026-09-10 09:54 UTC",
      "status": "FORECAST",
      "reliability_notes": "Synthetic value from ORCA's deterministic demo model. Not an observation, not calibrated, and not attributable to any agency."
    },
    {
      "id": "82f6d52d",
      "provider": "ORCA Deterministic Demo Model (synthetic ocean state, not an observation)",
      "provider_tier": "FALLBACK",
      "dataset": "Ocean Surface Wave Spectrum",
      "variable": "Swell Wave Height & Period",
      "value": "1.96 m / 11.0 s",
      "unit": "m / s",
      "location": "Kakinada",
      "coordinates": "16.989°N, 82.248°E",
      "observation_or_forecast_time": "2026-09-11 05:00 UTC",
      "retrieval_time": "2026-09-10 09:54 UTC",
      "status": "FORECAST",
      "reliability_notes": "Synthetic value from ORCA's deterministic demo model. Not an observation, not calibrated, and not attributable to any agency."
    },
    {
      "id": "7c83e887",
      "provider": "ORCA Deterministic Demo Model (synthetic ocean state, not an observation)",
      "provider_tier": "FALLBACK",
      "dataset": "Sea Surface Temperature",
      "variable": "Sea Surface Temperature",
      "value": "29.3",
      "unit": "°C",
      "location": "Kakinada",
      "coordinates": "16.989°N, 82.248°E",
      "observation_or_forecast_time": "2026-09-11 05:00 UTC",
      "retrieval_time": "2026-09-10 09:54 UTC",
      "status": "FORECAST",
      "reliability_notes": "Synthetic value from ORCA's deterministic demo model. Not an observation, not calibrated, and not attributable to any agency."
    },
    {
      "id": "c810bc5a",
      "provider": "ORCA Deterministic Demo Model (synthetic ocean state, not an observation)",
      "provider_tier": "FALLBACK",
      "dataset": "Ocean Surface Currents",
      "variable": "Surface Current Speed & Direction",
      "value": "0.78 m/s @ 152.3°",
      "unit": "m/s",
      "location": "Kakinada",
      "coordinates": "16.989°N, 82.248°E",
      "observation_or_forecast_time": "2026-09-11 05:00 UTC",
      "retrieval_time": "2026-09-10 09:54 UTC",
      "status": "FORECAST",
      "reliability_notes": "Synthetic value from ORCA's deterministic demo model. Not an observation, not calibrated, and not attributable to any agency."
    },
    {
      "id": "da7288df",
      "provider": "ORCA Deterministic Demo Model (synthetic coastal weather, not an observation)",
      "provider_tier": "FALLBACK",
      "dataset": "Coastal Marine Weather",
      "variable": "Sustained Wind Speed & Gusts",
      "value": "21.9 kt (Gusts: 29.6 kt)",
      "unit": "knots",
      "location": "Kakinada",
      "coordinates": "16.989°N, 82.248°E",
      "observation_or_forecast_time": "2026-09-11 05:00 UTC",
      "retrieval_time": "2026-09-10 09:54 UTC",
      "status": "FORECAST",
      "reliability_notes": "Synthetic value from ORCA's deterministic demo model. Not an observation, not calibrated, and not attributable to any agency."
    },
    {
      "id": "bc117389",
      "provider": "ORCA Deterministic Demo Model (synthetic coastal weather, not an observation)",
      "provider_tier": "FALLBACK",
      "dataset": "Coastal Hazard Warning",
      "variable": "Storm Warning Level",
      "value": "YELLOW",
      "unit": "Advisory Code",
      "location": "Kakinada",
      "coordinates": "16.989°N, 82.248°E",
      "observation_or_forecast_time": "2026-09-11 05:00 UTC",
      "retrieval_time": "2026-09-10 09:54 UTC",
      "status": "FORECAST",
      "reliability_notes": "Synthetic value from ORCA's deterministic demo model. Not an observation, not calibrated, and not attributable to any agency."
    }
  ],
  "alerts": [
    {
      "id": "alert_weather_a4307eb6",
      "type": "weather",
      "severity": "CAUTION",
      "title": "YELLOW coastal weather warning",
      "description": "Moderate squalls likely in open coastal waters. Fishermen advised to exercise caution.",
      "issued_at": "2026-09-11T09:54:36.632986Z",
      "valid_until": "2026-09-11T11:00:00Z",
      "recommended_action": "Conditions are favorable for fishing craft and coastal navigation during Tomorrow Morning (05:00 - 11:00). Maintain standard coastal safety protocols, monitor local marine broadcasts or NavIC advisories, and respect boundary geofences.",
      "evidence_ids": [
        "bc117389"
      ],
      "source": "ORCA Deterministic Demo Model (synthetic coastal weather, not an observation)",
      "provider_tier": "FALLBACK"
    }
  ],
  "trace": [
    {
      "seq": 1,
      "stage": "planner",
      "agent": "ORCA Task Planner",
      "action": "Parsed query intent, coordinates, temporal interval, and constraints",
      "tool": "parse_plan",
      "duration_ms": 3,
      "detail": "Intent: marine_safety, Location: Kakinada, Horizon: Tomorrow Morning (05:00 - 11:00), Agents: 4",
      "status": "COMPLETED",
      "timestamp": "2026-09-10T09:54:36.630939Z"
    },
    {
      "seq": 2,
      "stage": "agent_result",
      "agent": "Oceanographic Agent",
      "action": "Retrieved ocean state at (16.989N, 82.248E)",
      "tool": "get_ocean_conditions",
      "duration_ms": 1,
      "detail": "SWH: 2.29m, Swell: 1.96m, SST: 29.3 C [FALLBACK] ORCA Deterministic Demo Model (synthetic ocean state, not an observation)",
      "status": "COMPLETED",
      "timestamp": "2026-09-10T09:54:36.631971Z"
    },
    {
      "seq": 3,
      "stage": "agent_result",
      "agent": "Oceanographic Agent",
      "action": "Skipped ISRO NRSC Bhoonidhi (Oceansat-3 / SCATSAT / SARAL)",
      "tool": "get_ocean_conditions",
      "duration_ms": 0,
      "detail": "[ISRO] not_configured: no BHOONIDHI token set and no cached granules in data\\granules\\bhoonidhi; register at https://bhoonidhi.nrsc.gov.in and set the token in .env",
      "status": "SKIPPED",
      "timestamp": "2026-09-10T09:54:36.631971Z"
    },
    {
      "seq": 4,
      "stage": "agent_result",
      "agent": "Oceanographic Agent",
      "action": "Skipped ISRO MOSDAC (INSAT-3D/3DR/3DS)",
      "tool": "get_ocean_conditions",
      "duration_ms": 0,
      "detail": "[ISRO] not_configured: no MOSDAC token set and no cached granules in data\\granules\\mosdac; register at https://mosdac.gov.in and set the token in .env",
      "status": "SKIPPED",
      "timestamp": "2026-09-10T09:54:36.631971Z"
    },
    {
      "seq": 5,
      "stage": "agent_result",
      "agent": "Oceanographic Agent",
      "action": "Skipped INCOIS Ocean State Forecast / PFZ (cached)",
      "tool": "get_ocean_conditions",
      "duration_ms": 0,
      "detail": "[NATIONAL] not_configured: no cached INCOIS advisories in data\\granules\\incois. The INCOIS portal is JSP with no public JSON API, so advisories are cached out of band rather than fetched live.",
      "status": "SKIPPED",
      "timestamp": "2026-09-10T09:54:36.631971Z"
    },
    {
      "seq": 6,
      "stage": "agent_result",
      "agent": "Oceanographic Agent",
      "action": "Skipped Survey of India / INCOIS tidal constituents",
      "tool": "get_tide",
      "duration_ms": 0,
      "detail": "[NATIONAL] not_configured: no tidal constituent table is bundled. Tide needs published per-port harmonic constituents (Survey of India / INCOIS tide tables); it cannot be derived from the wave or wind feeds.",
      "status": "SKIPPED",
      "timestamp": "2026-09-10T09:54:36.631971Z"
    },
    {
      "seq": 7,
      "stage": "agent_result",
      "agent": "Meteorological Agent",
      "action": "Retrieved coastal weather at (16.989N, 82.248E)",
      "tool": "get_weather_conditions",
      "duration_ms": 1,
      "detail": "Wind: 21.9 kt, Gusts: 29.6 kt, Alert: YELLOW [FALLBACK] ORCA Deterministic Demo Model (synthetic coastal weather, not an observation)",
      "status": "COMPLETED",
      "timestamp": "2026-09-10T09:54:36.632986Z"
    },
    {
      "seq": 8,
      "stage": "agent_result",
      "agent": "Meteorological Agent",
      "action": "Skipped ISRO MOSDAC (INSAT-3D/3DR/3DS)",
      "tool": "get_weather_conditions",
      "duration_ms": 0,
      "detail": "[ISRO] not_configured: no MOSDAC token set and no cached granules in data\\granules\\mosdac; register at https://mosdac.gov.in and set the token in .env",
      "status": "SKIPPED",
      "timestamp": "2026-09-10T09:54:36.632986Z"
    },
    {
      "seq": 9,
      "stage": "agent_result",
      "agent": "Meteorological Agent",
      "action": "Skipped ISRO MOSDAC INSAT-3D lightning / cyclone products",
      "tool": "get_hazards",
      "duration_ms": 0,
      "detail": "[ISRO] not_configured: INSAT-3D lightning and cyclone tracking requires a MOSDAC token. The wind-derived alert level in this response is not a lightning observation and is not reported as one.",
      "status": "SKIPPED",
      "timestamp": "2026-09-10T09:54:36.632986Z"
    },
    {
      "seq": 10,
      "stage": "agent_result",
      "agent": "Geospatial & Geofencing Agent",
      "action": "Executed spatial boundary audit for Kakinada",
      "tool": "check_restricted_zone",
      "duration_ms": 1,
      "detail": "Inside MPA: False (None). Nearest Harbor: Kakinada Deep Water Port (0.0 km). Nearest Sanctuary: Coringa Wildlife Sanctuary & Marine Zone (20.3 km)",
      "status": "COMPLETED",
      "timestamp": "2026-09-10T09:54:36.634870Z"
    },
    {
      "seq": 11,
      "stage": "agent_result",
      "agent": "Marine Safety & Risk Engine",
      "action": "Executed deterministic risk algorithm across oceanographic and meteorological inputs",
      "tool": "calculate_marine_risk",
      "duration_ms": 0,
      "detail": "Score: 30/100, Category: RiskCategory.MODERATE, Factors: 4, Triggered Rules: 2",
      "status": "COMPLETED",
      "timestamp": "2026-09-10T09:54:36.635948Z"
    },
    {
      "seq": 12,
      "stage": "agent_result",
      "agent": "Synthesis & Visualization Planner",
      "action": "Synthesized adaptive result layout, dynamic map layers, and multilingual evidence trail",
      "tool": "generate_visualization_plan",
      "duration_ms": 45,
      "detail": "Plan: marine_safety (4 components, 3 GIS layers, 6 evidence records)",
      "status": "COMPLETED",
      "timestamp": "2026-09-10T09:54:36.635948Z"
    },
    {
      "seq": 13,
      "stage": "done",
      "agent": "Orchestrator",
      "action": "Response envelope assembled",
      "tool": null,
      "duration_ms": 0,
      "detail": "6 evidence records, contract v1.3.0",
      "status": "COMPLETED",
      "timestamp": "2026-09-10T09:54:36.637866"
    }
  ],
  "meta": {
    "mode": "DEMO",
    "query_text": "Is it safe to venture into the sea tomorrow morning near Kakinada?",
    "contract_version": "1.3.0",
    "generated_at": "2026-09-10T09:54:36.637866",
    "location": {
      "name": "Kakinada",
      "latitude": 16.9891,
      "longitude": 82.2475,
      "radius_km": 40,
      "nearest_port": "Kakinada Deep Water Port",
      "state": "Andhra Pradesh",
      "maritime_zone": "Central Bay of Bengal (Godavari Coast)"
    },
    "temporal": {
      "label": "Tomorrow Morning (05:00 - 11:00)",
      "start_time": "2026-09-11T05:00:00Z",
      "end_time": "2026-09-11T11:00:00Z",
      "is_forecast": true,
      "is_historical": false,
      "offset_hours": 24
    },
    "limitations": [
      "Tide is not available for this position. no tidal constituent table is bundled. Tide needs published per-port harmonic constituents (Survey of India / INCOIS tide tables); it cannot be derived from the wave or wind feeds. Consult the Survey of India tide tables for the port before departure.",
      "Lightning and cyclone tracking is not available. INSAT-3D lightning and cyclone tracking requires a MOSDAC token. The wind-derived alert level in this response is not a lightning observation and is not reported as one. Cross-reference IMD cyclone bulletins and VHF coastal broadcasts.",
      "Advisories are provided as decision support; vessel masters retain final navigational command.",
      "Satellite SST & Chlorophyll products are cloud-masked and subject to diurnal SST warming.",
      "Severe weather updates must be cross-referenced against official coastal marine broadcasts and NavIC advisories."
    ],
    "degraded": true,
    "notes": [
      "One or more values came from a fallback or synthetic source. Check each evidence record's provider and tier before relying on it."
    ]
  },
  "executive_summary": "Marine conditions near Kakinada for Tomorrow Morning (05:00 - 11:00) present an overall MODERATE RISK (Score: 30/100). Significant wave height is 2.3m (Moderate) with sustained surface winds of 21.9 knots.",
  "visualization_plan": {
    "result_type": "marine_safety",
    "components_to_render": [
      "risk_card",
      "conditions_grid",
      "map",
      "evidence_drawer"
    ],
    "center_lat": 16.9891,
    "center_lon": 82.2475,
    "default_zoom": 9,
    "active_layers": [
      "layer_locations",
      "layer_mpas",
      "layer_wave_risk",
      "layer_bhuvan_coralreefs",
      "layer_bhuvan_mangroves",
      "layer_bhuvan_coastal_lulc",
      "layer_bhuvan_islands_ec"
    ]
  },
  "agent_activity": [
    {
      "agent": "ORCA Task Planner",
      "action": "Parsed query intent, coordinates, temporal interval, and constraints",
      "tool": "parse_plan",
      "status": "COMPLETED",
      "duration_ms": 3,
      "details": "Intent: marine_safety, Location: Kakinada, Horizon: Tomorrow Morning (05:00 - 11:00), Agents: 4",
      "timestamp": "2026-09-10T09:54:36.630939Z"
    },
    {
      "agent": "Oceanographic Agent",
      "action": "Retrieved ocean state at (16.989N, 82.248E)",
      "tool": "get_ocean_conditions",
      "status": "COMPLETED",
      "duration_ms": 1,
      "details": "SWH: 2.29m, Swell: 1.96m, SST: 29.3 C [FALLBACK] ORCA Deterministic Demo Model (synthetic ocean state, not an observation)",
      "timestamp": "2026-09-10T09:54:36.631971Z"
    },
    {
      "agent": "Oceanographic Agent",
      "action": "Skipped ISRO NRSC Bhoonidhi (Oceansat-3 / SCATSAT / SARAL)",
      "tool": "get_ocean_conditions",
      "status": "SKIPPED",
      "duration_ms": 0,
      "details": "[ISRO] not_configured: no BHOONIDHI token set and no cached granules in data\\granules\\bhoonidhi; register at https://bhoonidhi.nrsc.gov.in and set the token in .env",
      "timestamp": "2026-09-10T09:54:36.631971Z"
    },
    {
      "agent": "Oceanographic Agent",
      "action": "Skipped ISRO MOSDAC (INSAT-3D/3DR/3DS)",
      "tool": "get_ocean_conditions",
      "status": "SKIPPED",
      "duration_ms": 0,
      "details": "[ISRO] not_configured: no MOSDAC token set and no cached granules in data\\granules\\mosdac; register at https://mosdac.gov.in and set the token in .env",
      "timestamp": "2026-09-10T09:54:36.631971Z"
    },
    {
      "agent": "Oceanographic Agent",
      "action": "Skipped INCOIS Ocean State Forecast / PFZ (cached)",
      "tool": "get_ocean_conditions",
      "status": "SKIPPED",
      "duration_ms": 0,
      "details": "[NATIONAL] not_configured: no cached INCOIS advisories in data\\granules\\incois. The INCOIS portal is JSP with no public JSON API, so advisories are cached out of band rather than fetched live.",
      "timestamp": "2026-09-10T09:54:36.631971Z"
    },
    {
      "agent": "Oceanographic Agent",
      "action": "Skipped Survey of India / INCOIS tidal constituents",
      "tool": "get_tide",
      "status": "SKIPPED",
      "duration_ms": 0,
      "details": "[NATIONAL] not_configured: no tidal constituent table is bundled. Tide needs published per-port harmonic constituents (Survey of India / INCOIS tide tables); it cannot be derived from the wave or wind feeds.",
      "timestamp": "2026-09-10T09:54:36.631971Z"
    },
    {
      "agent": "Meteorological Agent",
      "action": "Retrieved coastal weather at (16.989N, 82.248E)",
      "tool": "get_weather_conditions",
      "status": "COMPLETED",
      "duration_ms": 1,
      "details": "Wind: 21.9 kt, Gusts: 29.6 kt, Alert: YELLOW [FALLBACK] ORCA Deterministic Demo Model (synthetic coastal weather, not an observation)",
      "timestamp": "2026-09-10T09:54:36.632986Z"
    },
    {
      "agent": "Meteorological Agent",
      "action": "Skipped ISRO MOSDAC (INSAT-3D/3DR/3DS)",
      "tool": "get_weather_conditions",
      "status": "SKIPPED",
      "duration_ms": 0,
      "details": "[ISRO] not_configured: no MOSDAC token set and no cached granules in data\\granules\\mosdac; register at https://mosdac.gov.in and set the token in .env",
      "timestamp": "2026-09-10T09:54:36.632986Z"
    },
    {
      "agent": "Meteorological Agent",
      "action": "Skipped ISRO MOSDAC INSAT-3D lightning / cyclone products",
      "tool": "get_hazards",
      "status": "SKIPPED",
      "duration_ms": 0,
      "details": "[ISRO] not_configured: INSAT-3D lightning and cyclone tracking requires a MOSDAC token. The wind-derived alert level in this response is not a lightning observation and is not reported as one.",
      "timestamp": "2026-09-10T09:54:36.632986Z"
    },
    {
      "agent": "Geospatial & Geofencing Agent",
      "action": "Executed spatial boundary audit for Kakinada",
      "tool": "check_restricted_zone",
      "status": "COMPLETED",
      "duration_ms": 1,
      "details": "Inside MPA: False (None). Nearest Harbor: Kakinada Deep Water Port (0.0 km). Nearest Sanctuary: Coringa Wildlife Sanctuary & Marine Zone (20.3 km)",
      "timestamp": "2026-09-10T09:54:36.634870Z"
    },
    {
      "agent": "Marine Safety & Risk Engine",
      "action": "Executed deterministic risk algorithm across oceanographic and meteorological inputs",
      "tool": "calculate_marine_risk",
      "status": "COMPLETED",
      "duration_ms": 0,
      "details": "Score: 30/100, Category: RiskCategory.MODERATE, Factors: 4, Triggered Rules: 2",
      "timestamp": "2026-09-10T09:54:36.635948Z"
    },
    {
      "agent": "Synthesis & Visualization Planner",
      "action": "Synthesized adaptive result layout, dynamic map layers, and multilingual evidence trail",
      "tool": "generate_visualization_plan",
      "status": "COMPLETED",
      "duration_ms": 45,
      "details": "Plan: marine_safety (4 components, 3 GIS layers, 6 evidence records)",
      "timestamp": "2026-09-10T09:54:36.635948Z"
    }
  ],
  "query_id": "a4307eb6-9be5-4727-8e81-9798844ad202",
  "conversation_id": "0231f1ec-e089-46b3-8267-36a4dfcf8ab2",
  "query_text": "Is it safe to venture into the sea tomorrow morning near Kakinada?",
  "detected_language": "en",
  "location": {
    "name": "Kakinada",
    "latitude": 16.9891,
    "longitude": 82.2475,
    "radius_km": 40,
    "nearest_port": "Kakinada Deep Water Port",
    "state": "Andhra Pradesh",
    "maritime_zone": "Central Bay of Bengal (Godavari Coast)"
  },
  "temporal": {
    "label": "Tomorrow Morning (05:00 - 11:00)",
    "start_time": "2026-09-11T05:00:00Z",
    "end_time": "2026-09-11T11:00:00Z",
    "is_forecast": true,
    "is_historical": false,
    "offset_hours": 24
  },
  "limitations": [
    "Tide is not available for this position. no tidal constituent table is bundled. Tide needs published per-port harmonic constituents (Survey of India / INCOIS tide tables); it cannot be derived from the wave or wind feeds. Consult the Survey of India tide tables for the port before departure.",
    "Lightning and cyclone tracking is not available. INSAT-3D lightning and cyclone tracking requires a MOSDAC token. The wind-derived alert level in this response is not a lightning observation and is not reported as one. Cross-reference IMD cyclone bulletins and VHF coastal broadcasts.",
    "Advisories are provided as decision support; vessel masters retain final navigational command.",
    "Satellite SST & Chlorophyll products are cloud-masked and subject to diurnal SST warming.",
    "Severe weather updates must be cross-referenced against official coastal marine broadcasts and NavIC advisories."
  ],
  "mode": "DEMO",
  "recommendation": "Conditions are favorable for fishing craft and coastal navigation during Tomorrow Morning (05:00 - 11:00). Maintain standard coastal safety protocols, monitor local marine broadcasts or NavIC advisories, and respect boundary geofences.",
  "needs_clarification": false,
  "clarification_question": null,
  "missing_information": [],
  "risk_assessment": {
    "overall_score": 30,
    "category": "MODERATE",
    "contributing_factors": [
      {
        "name": "Significant Wave Height (SWH)",
        "value": "2.3 m",
        "points_added": 18,
        "description": "Rough (2.2 - 3.0m) - Unfavorable for artisanal vessels"
      },
      {
        "name": "Wind Speed",
        "value": "21.9 kt (40.6 km/h)",
        "points_added": 8,
        "description": "Fresh Breeze (17 - 22 kt)"
      },
      {
        "name": "Swell Height",
        "value": "2.0 m (Period: 11.0s)",
        "points_added": 2,
        "description": "Swell wave energy (2.0m)"
      },
      {
        "name": "Coastal Weather Warning (YELLOW)",
        "value": "YELLOW",
        "points_added": 2,
        "description": "Moderate squalls likely in open coastal waters. Fishermen advised to exercise caution."
      }
    ],
    "triggered_rules": [
      "Small-craft wave limit: significant wave height 2.3m exceeds the 2.0m advisory limit.",
      "Active coastal warning: YELLOW alert in effect for this maritime division."
    ],
    "missing_inputs": [],
    "data_quality": "DEMO — Not from live sources",
    "data_quality_notes": "Full factor coverage",
    "confidence_percentage": 95,
    "data_quality_label": "Full factor coverage"
  },
  "map_layers": [
    {
      "layer_id": "layer_locations",
      "name": "Selected Marine Coordinates",
      "layer_type": "point",
      "features": [
        {
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [
              82.2475,
              16.9891
            ]
          },
          "properties": {
            "name": "Kakinada",
            "title": "Target: Kakinada",
            "radius_km": 40,
            "type": "target_center"
          }
        }
      ],
      "visible_by_default": true,
      "color": "#00f5d4",
      "legend_title": "Target Port / Zone",
      "legend_unit": ""
    },
    {
      "layer_id": "layer_mpas",
      "name": "Marine Protected Areas & Sanctuaries (MoEFCC)",
      "layer_type": "polygon",
      "features": [
        {
          "type": "Feature",
          "geometry": {
            "type": "Polygon",
            "coordinates": [
              [
                [
                  86.75,
                  20.6
                ],
                [
                  87.15,
                  20.8
                ],
                [
                  87.25,
                  20.55
                ],
                [
                  86.95,
                  20.35
                ],
                [
                  86.75,
                  20.6
                ]
              ]
            ]
          },
          "properties": {
            "id": "mpa_gahirmatha",
            "name": "Gahirmatha Marine Sanctuary",
            "designation": "Marine Wildlife Sanctuary (Olive Ridley Turtle Mass Nesting)",
            "restriction": "STRICT_NO_TAKE",
            "authority": "MoEFCC / Odisha Forest Dept",
            "description": "World's largest rookery for Olive Ridley Sea Turtles. Mechanized fishing and trawling strictly prohibited within 20 km of shoreline from November to May."
          }
        },
        {
          "type": "Feature",
          "geometry": {
            "type": "Polygon",
            "coordinates": [
              [
                [
                  78.9,
                  9.1
                ],
                [
                  79.35,
                  9.35
                ],
                [
                  79.45,
                  9.15
                ],
                [
                  79.05,
                  8.85
                ],
                [
                  78.9,
                  9.1
                ]
              ]
            ]
          },
          "properties": {
            "id": "mpa_gulf_of_mannar",
            "name": "Gulf of Mannar Marine National Park",
            "designation": "Biosphere Reserve & Marine National Park",
            "restriction": "RESTRICTED_CONSERVATION",
            "authority": "MoEFCC / Tamil Nadu Forest Dept",
            "description": "Critical biodiversity hotspot with 21 islands, coral reefs, sea-cow (Dugong dugon), and seagrass beds. Commercial trawling and purse seining prohibited."
          }
        },
        {
          "type": "Feature",
          "geometry": {
            "type": "Polygon",
            "coordinates": [
              [
                [
                  73.4,
                  16.02
                ],
                [
                  73.5,
                  16.08
                ],
                [
                  73.52,
                  16.02
                ],
                [
                  73.42,
                  15.98
                ],
                [
                  73.4,
                  16.02
                ]
              ]
            ]
          },
          "properties": {
            "id": "mpa_malvan",
            "name": "Malvan Marine Sanctuary",
            "designation": "Marine Sanctuary (Sindhudurg Coastal Ecosystem)",
            "restriction": "CONTROLLED_ZONING",
            "authority": "MoEFCC / Maharashtra Mangrove Cell",
            "description": "Rich coral and pearl oyster banks surrounding Sindhudurg Fort. Trawling and anchoring in core reef zones banned."
          }
        },
        {
          "type": "Feature",
          "geometry": {
            "type": "Polygon",
            "coordinates": [
              [
                [
                  69.2,
                  22.4
                ],
                [
                  70.1,
                  22.8
                ],
                [
                  70.2,
                  22.5
                ],
                [
                  69.35,
                  22.25
                ],
                [
                  69.2,
                  22.4
                ]
              ]
            ]
          },
          "properties": {
            "id": "mpa_kutch_jamnagar",
            "name": "Marine National Park & Sanctuary, Gulf of Kutch",
            "designation": "First Marine National Park of India",
            "restriction": "STRICT_NO_TAKE",
            "authority": "MoEFCC / Gujarat Forest Dept",
            "description": "Encompasses 42 islands with mangroves, live coral formations, sponges, and endangered marine turtles. Industrial vessel entry and destructive fishing banned."
          }
        },
        {
          "type": "Feature",
          "geometry": {
            "type": "Polygon",
            "coordinates": [
              [
                [
                  92.5,
                  11.5
                ],
                [
                  92.65,
                  11.6
                ],
                [
                  92.68,
                  11.45
                ],
                [
                  92.52,
                  11.38
                ],
                [
                  92.5,
                  11.5
                ]
              ]
            ]
          },
          "properties": {
            "id": "mpa_mahatma_gandhi",
            "name": "Mahatma Gandhi Marine National Park (Wandoor)",
            "designation": "Marine National Park",
            "restriction": "STRICT_NO_TAKE",
            "authority": "A&N Forest Dept / MoEFCC",
            "description": "Protects pristine coral reefs and nesting grounds of leatherback, hawksbill, and green sea turtles. Commercial fishing prohibited."
          }
        },
        {
          "type": "Feature",
          "geometry": {
            "type": "Polygon",
            "coordinates": [
              [
                [
                  82.2,
                  16.8
                ],
                [
                  82.4,
                  16.95
                ],
                [
                  82.45,
                  16.8
                ],
                [
                  82.25,
                  16.65
                ],
                [
                  82.2,
                  16.8
                ]
              ]
            ]
          },
          "properties": {
            "id": "mpa_coringa_mangroves",
            "name": "Coringa Wildlife Sanctuary & Marine Zone",
            "designation": "Estuarine & Marine Wildlife Sanctuary",
            "restriction": "RESTRICTED_CONSERVATION",
            "authority": "AP Forest Dept (Godavari Estuary)",
            "description": "Second largest mangrove formation in India, critical nursery for commercial marine fish and fishing cats. Mechanized fishing restricted in mouth of Hope Island."
          }
        }
      ],
      "visible_by_default": true,
      "color": "#f72585",
      "legend_title": "Sanctuary / Conservation Zone",
      "legend_unit": ""
    },
    {
      "layer_id": "layer_wave_risk",
      "name": "INCOIS Wave Hazard Envelope",
      "layer_type": "point",
      "features": [
        {
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [
              82.2475,
              16.9891
            ]
          },
          "properties": {
            "title": "Wave Energy: Kakinada",
            "wave_height_m": 2.29,
            "sea_state": "Moderate",
            "risk_level": "Moderate",
            "radius": 40000
          }
        }
      ],
      "visible_by_default": true,
      "color": "#ff9f1c",
      "legend_title": "Significant Wave Height",
      "legend_unit": "meters"
    }
  ],
  "fishing_zones": []
} as unknown as OrcaAnalysisResponse;

export const fallbackCached = (): CachedResponse => ({ response: FALLBACK_RESPONSE, savedAt: FALLBACK_SAVED_AT });
