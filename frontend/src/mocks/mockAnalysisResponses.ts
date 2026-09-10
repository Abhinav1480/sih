import { OrcaAnalysisResponse } from "../lib/types";
import {
  MOCK_CORINGA_MPA,
  MOCK_ROUTE_LAYERS,
  MOCK_PFZ_LAYERS,
  MOCK_TIME_VARYING_WAVE_RISK,
  MOCK_BHUVAN_WMS_LAYER,
} from "./mockLayerData";

export function getMockAnalysisResponse(query: string, conversationId?: string): OrcaAnalysisResponse {
  const q = query.toLowerCase();
  const convId = conversationId || "conv-mock-session-01";
  const now = new Date().toISOString();

  // 1. Protected Area / Marine Sanctuary Scenario
  if (q.includes("protected") || q.includes("sanctuary") || q.includes("mpa") || q.includes("coringa")) {
    return {
      query_id: `qid-${Date.now()}`,
      conversation_id: convId,
      query_text: query,
      detected_language: "en",
      intent: "geofence_restriction",
      location: {
        name: "Coringa Marine Protected Area",
        latitude: 16.92,
        longitude: 82.25,
        radius_km: 100.0,
        nearest_port: "Kakinada Port",
        state: "Andhra Pradesh",
        maritime_zone: "Godavari Estuary",
      },
      temporal: {
        label: "Regulatory Baseline (Permanent Conservation Area)",
        start_time: "2026-09-10T00:00:00",
        end_time: "2026-09-11T23:59:59",
        is_forecast: false,
        is_historical: false,
        offset_hours: 0,
      },
      executive_summary:
        "Coringa Wildlife Sanctuary is an officially designated Marine Protected Area (MPA) under the Wildlife Protection Act 1972. Commercial mechanized fishing and unauthorized transit are strictly prohibited.",
      recommendation:
        "Maintain minimum 5.5 nautical mile offshore clearance around the sanctuary boundary coordinates. Comply with MoEFCC and Andhra Pradesh Forest Department regulations.",
      risk_assessment: {
        overall_score: 75,
        category: "HIGH",
        contributing_factors: [
          {
            name: "Sanctuary Geofence Breach Penalty",
            value: "Prohibited Transit",
            points_added: 50,
            description: "Strict legal prohibition under Wildlife Protection Act 1972",
          },
          {
            name: "Estuarine Shoaling Hazard",
            value: "< 3.0 m depth",
            points_added: 25,
            description: "Shallow mangrove mudflats and shifting sandbars",
          },
        ],
        triggered_rules: ["Strict MPA No-Take Zone Enforcement"],
        missing_inputs: [],
        confidence_percentage: 98,
        data_quality_label: "Official MoEFCC & Wildlife Institute of India GIS Catalog",
      },
      visualization_plan: {
        result_type: "geofence_restriction",
        components_to_render: ["geofence_card", "conditions_grid", "map", "agent_activity", "evidence_drawer"],
        center_lat: 16.92,
        center_lon: 82.25,
        default_zoom: 10,
        active_layers: ["layer_mpas", "layer_bhuvan_satellite"],
      },
      map_layers: [MOCK_CORINGA_MPA, MOCK_BHUVAN_WMS_LAYER],
      evidence: [],
      agent_activity: [],
      limitations: [],
      mode: "DEMO",
    };
  }

  // 2. Route Analysis Scenario (Kakinada to Visakhapatnam)
  if (q.includes("route") || q.includes("kakinada") || q.includes("corridor") || q.includes("transit")) {
    return {
      query_id: `qid-${Date.now()}`,
      conversation_id: convId,
      query_text: query,
      detected_language: "en",
      intent: "route_analysis",
      location: {
        name: "Kakinada → Visakhapatnam Corridor",
        latitude: 17.21,
        longitude: 82.25,
        radius_km: 150.0,
        nearest_port: "Kakinada Deep Water Port",
        state: "Andhra Pradesh",
        maritime_zone: "Central Bay of Bengal",
      },
      temporal: {
        label: "Tomorrow morning (05:00 - 11:00)",
        start_time: "2026-09-11T05:00:00",
        end_time: "2026-09-11T11:00:00",
        is_forecast: true,
        is_historical: false,
        offset_hours: 24,
      },
      executive_summary:
        "Transit from Kakinada to Visakhapatnam presents a MODERATE overall risk (Score: 30/100). The recommended offshore corridor diverts 5.5 NM seaward of Coringa Wildlife Sanctuary, reducing wave impact and ensuring regulatory compliance.",
      recommendation:
        "Adopt Recommended Offshore Corridor (142.6 km, 7.1h transit). Maintain continuous VHF watch on Channel 16 and avoid shallow inshore shoals near Godavari outflow.",
      risk_assessment: {
        overall_score: 30,
        category: "MODERATE",
        contributing_factors: [
          {
            name: "Significant Wave Height",
            value: "1.6 m",
            points_added: 10,
            description: "Moderate sea state along inshore shelf",
          },
          {
            name: "Surface Wind Velocity",
            value: "12.5 kt",
            points_added: 3,
            description: "Sustained southerly breeze with gusts to 16.9 kt",
          },
        ],
        triggered_rules: ["Inshore wave caution for craft < 15m LOA"],
        missing_inputs: [],
        confidence_percentage: 94,
        data_quality_label: "Authoritative INCOIS OSF & IMD Calibrated Telemetry",
      },
      ocean_conditions: {
        significant_wave_height_m: 1.6,
        swell_height_m: 1.1,
        swell_period_sec: 8.5,
        swell_direction_deg: 160.0,
        sea_surface_temp_c: 28.6,
        ocean_current_speed_m_s: 0.45,
        ocean_current_direction_deg: 75.0,
        sea_state: "Moderate",
        status: "FORECAST",
        source: "INCOIS OSF Multi-Grid",
        timestamp: now,
      },
      weather_conditions: {
        wind_speed_knots: 12.5,
        wind_direction_deg: 180.0,
        wind_gust_knots: 16.9,
        air_temp_c: 28.5,
        precipitation_mm: 0.0,
        visibility_km: 10.0,
        alert_level: "None",
        status: "FORECAST",
        source: "IMD Coastal Marine Bulletin",
        timestamp: now,
      },
      visualization_plan: {
        result_type: "route_recommendation",
        components_to_render: ["route_card", "conditions_grid", "map", "agent_activity", "evidence_drawer"],
        center_lat: 17.45,
        center_lon: 82.75,
        default_zoom: 9,
        active_layers: ["layer_locations", "layer_route", "layer_mpas", "layer_route_waypoints"],
      },
      map_layers: [
        ...MOCK_ROUTE_LAYERS,
        MOCK_CORINGA_MPA,
        MOCK_TIME_VARYING_WAVE_RISK,
      ],
      evidence: [],
      agent_activity: [],
      limitations: ["Coastal radar experienced temporary fallback to calibrated ECMWF/OSF marine model."],
      mode: "DEMO",
    };
  }

  // 3. Potential Fishing Zone (PFZ) Scenario
  if (q.includes("fishing") || q.includes("fish") || q.includes("pfz") || q.includes("catch")) {
    return {
      query_id: `qid-${Date.now()}`,
      conversation_id: convId,
      query_text: query,
      detected_language: "en",
      intent: "fishing_zones",
      location: {
        name: "Visakhapatnam Coastal Waters",
        latitude: 17.6868,
        longitude: 83.2185,
        radius_km: 50.0,
        nearest_port: "Visakhapatnam Fishing Harbor",
        state: "Andhra Pradesh",
        maritime_zone: "Central Bay of Bengal",
      },
      temporal: {
        label: "Tomorrow morning (05:00 - 11:00)",
        start_time: "2026-09-11T05:00:00",
        end_time: "2026-09-11T11:00:00",
        is_forecast: true,
        is_historical: false,
        offset_hours: 24,
      },
      executive_summary:
        "3 high-probability Potential Fishing Zones (PFZs) identified within 50 km of Visakhapatnam for tomorrow morning. Conditions exhibit LOW RISK (Score: 18/100) with wave heights under 1.3m.",
      recommendation:
        "Target PFZ Alpha (24 km ESE, Bearing 115°). Optimal thermal gradient boundary (28.4°C - 28.8°C) with elevated chlorophyll plume (0.85 mg/m³). Safe sea state for all vessel categories.",
      risk_assessment: {
        overall_score: 18,
        category: "LOW",
        contributing_factors: [
          {
            name: "Wave Height",
            value: "1.2 m",
            points_added: 4,
            description: "Slight to smooth sea state",
          },
          {
            name: "Wind Speed",
            value: "10.2 kt",
            points_added: 2,
            description: "Light to gentle breeze",
          },
        ],
        triggered_rules: [],
        missing_inputs: [],
        confidence_percentage: 96,
        data_quality_label: "Oceansat-3 & INCOIS PFZ Authoritative Advisory",
      },
      ocean_conditions: {
        significant_wave_height_m: 1.2,
        swell_height_m: 0.9,
        swell_period_sec: 7.8,
        swell_direction_deg: 155.0,
        sea_surface_temp_c: 28.6,
        ocean_current_speed_m_s: 0.38,
        ocean_current_direction_deg: 80.0,
        sea_state: "Slight",
        status: "FORECAST",
        source: "INCOIS OSF Multi-Grid",
        timestamp: now,
      },
      weather_conditions: {
        wind_speed_knots: 10.2,
        wind_direction_deg: 165.0,
        wind_gust_knots: 13.5,
        air_temp_c: 28.5,
        precipitation_mm: 0.0,
        visibility_km: 10.0,
        alert_level: "None",
        status: "FORECAST",
        source: "IMD Coastal Marine Bulletin",
        timestamp: now,
      },
      visualization_plan: {
        result_type: "fishing_intelligence",
        components_to_render: ["fishing_card", "conditions_grid", "map", "agent_activity", "evidence_drawer"],
        center_lat: 17.65,
        center_lon: 83.45,
        default_zoom: 10,
        active_layers: ["layer_locations", "layer_pfz"],
      },
      map_layers: [
        ...MOCK_PFZ_LAYERS,
        MOCK_CORINGA_MPA,
      ],
      evidence: [],
      agent_activity: [],
      limitations: [],
      mode: "DEMO",
    };
  }

  // 4. Spatial What-If Scenario
  if (q.includes("changes") || q.includes("offshore") || q.includes("what-if") || q.includes("30 km")) {
    return {
      query_id: `qid-${Date.now()}`,
      conversation_id: convId,
      query_text: query,
      detected_language: "en",
      intent: "spatial_what_if",
      location: {
        name: "Visakhapatnam → 30 km Offshore",
        latitude: 17.6868,
        longitude: 83.2185,
        radius_km: 40.0,
        nearest_port: "Visakhapatnam Port",
        state: "Andhra Pradesh",
        maritime_zone: "Central Bay of Bengal",
      },
      temporal: {
        label: "Tomorrow (24h Window)",
        start_time: "2026-09-11T00:00:00",
        end_time: "2026-09-11T23:59:59",
        is_forecast: true,
        is_historical: false,
        offset_hours: 24,
      },
      executive_summary:
        "Moving 30 km offshore from Visakhapatnam reveals a steep condition divergence: significant wave height increases by +61.5% (from 1.3m to 2.1m) and sustained winds rise to 16.5 kt as the continental shelf drops into deep waters.",
      recommendation:
        "Exercise MODERATE caution beyond 20 km offshore. Small craft (<10m) should avoid deep-water sectors during afternoon peak winds.",
      risk_assessment: {
        overall_score: 48,
        category: "MODERATE",
        contributing_factors: [
          {
            name: "Offshore SWH Differential",
            value: "2.1 m (+0.8m)",
            points_added: 20,
            description: "Deep water unattenuated swell amplification",
          },
          {
            name: "Wind Speed Differential",
            value: "16.5 kt (+4.8 kt)",
            points_added: 10,
            description: "Loss of land drag and coastal wind-shadowing",
          },
        ],
        triggered_rules: ["Deep-water wave caution for artisanal craft"],
        missing_inputs: [],
        confidence_percentage: 95,
        data_quality_label: "Multi-Source Hydrodynamic Bathymetric Model",
      },
      ocean_conditions: {
        significant_wave_height_m: 2.1,
        swell_height_m: 1.5,
        swell_period_sec: 9.2,
        swell_direction_deg: 165.0,
        sea_surface_temp_c: 28.7,
        ocean_current_speed_m_s: 0.52,
        ocean_current_direction_deg: 85.0,
        sea_state: "Moderate",
        status: "FORECAST",
        source: "INCOIS OSF Multi-Grid",
        timestamp: now,
      },
      weather_conditions: {
        wind_speed_knots: 16.5,
        wind_direction_deg: 175.0,
        wind_gust_knots: 21.0,
        air_temp_c: 28.3,
        precipitation_mm: 0.0,
        visibility_km: 10.0,
        alert_level: "Caution",
        status: "FORECAST",
        source: "IMD Coastal Marine Bulletin",
        timestamp: now,
      },
      visualization_plan: {
        result_type: "spatial_what_if_analysis",
        components_to_render: ["spatial_what_if_card", "conditions_grid", "map", "agent_activity", "evidence_drawer"],
        center_lat: 17.65,
        center_lon: 83.35,
        default_zoom: 10,
        active_layers: ["layer_locations", "layer_displacement", "layer_wave_risk"],
      },
      map_layers: [
        {
          layer_id: "layer_locations",
          id: "layer_locations",
          name: "Displacement Endpoints",
          label: "Displacement Endpoints",
          layer_type: "point",
          kind: "geojson",
          purpose_group: "intelligence",
          color: "#3b82f6",
          visible_by_default: true,
          legend_title: "Displacement Points",
          features: [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: [83.2185, 17.6868] },
              properties: { name: "Visakhapatnam (Inshore)", type: "displacement_origin" },
            },
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: [83.48, 17.55] },
              properties: {
                name: "30 km Offshore Node",
                type: "displacement_target",
                distance_km: 30,
                direction: "East-Southeast",
                bearing_deg: 118,
              },
            },
          ],
        },
        {
          layer_id: "layer_displacement",
          id: "layer_displacement",
          name: "Displacement Vector (30 km ESE)",
          label: "Displacement Vector (30 km ESE)",
          layer_type: "linestring",
          kind: "geojson",
          purpose_group: "intelligence",
          color: "#ec4899",
          visible_by_default: true,
          legend_title: "Displacement Vector",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: [
                  [83.2185, 17.6868],
                  [83.48, 17.55],
                ],
              },
              properties: {
                type: "displacement_vector",
                distance_km: 30,
                bearing_deg: 118,
                origin: "Visakhapatnam",
                is_recommended: true,
              },
            },
          ],
        },
        MOCK_TIME_VARYING_WAVE_RISK,
      ],
      evidence: [],
      agent_activity: [],
      limitations: [],
      mode: "DEMO",
    };
  }

  // 5. Time-Varying Marine Condition / Weather Scenario
  if (q.includes("weather") || q.includes("condition") || q.includes("forecast") || q.includes("tomorrow") || q.includes("morning")) {
    return {
      query_id: `qid-${Date.now()}`,
      conversation_id: convId,
      query_text: query,
      detected_language: "en",
      intent: "ocean_conditions",
      location: {
        name: "Visakhapatnam Coastal Waters",
        latitude: 17.6868,
        longitude: 83.2185,
        radius_km: 40.0,
        nearest_port: "Visakhapatnam Major Port",
        state: "Andhra Pradesh",
        maritime_zone: "Central Bay of Bengal",
      },
      temporal: {
        label: "Tomorrow Morning (05:00 - 11:00)",
        start_time: "2026-09-11T05:00:00",
        end_time: "2026-09-11T11:00:00",
        is_forecast: true,
        is_historical: false,
        offset_hours: 24,
      },
      executive_summary:
        "Marine conditions near Visakhapatnam for Tomorrow Morning exhibit increasing sea state: wave heights rise from 1.2m at 05:00 to 2.1m by 11:00 as south-southwesterly swells build.",
      recommendation:
        "Early morning operations (05:00 - 08:00) are favorable. Small craft should return before midday when wave energy peaks above 2.0m.",
      risk_assessment: {
        overall_score: 28,
        category: "LOW",
        contributing_factors: [
          {
            name: "Midday Wave Amplification",
            value: "1.2m → 2.1m",
            points_added: 18,
            description: "Diurnal wind-wave coupling in late morning",
          },
          {
            name: "Surface Wind Velocity",
            value: "11.5 kt → 16.0 kt",
            points_added: 10,
            description: "Fresh coastal breeze developing by 11:00",
          },
        ],
        triggered_rules: [],
        missing_inputs: [],
        confidence_percentage: 95,
        data_quality_label: "Authoritative INCOIS OSF Hydrodynamic Forecast",
      },
      ocean_conditions: {
        significant_wave_height_m: 1.5,
        swell_height_m: 1.1,
        swell_period_sec: 8.2,
        swell_direction_deg: 160.0,
        sea_surface_temp_c: 28.6,
        ocean_current_speed_m_s: 0.42,
        ocean_current_direction_deg: 75.0,
        sea_state: "Moderate",
        status: "FORECAST",
        source: "INCOIS OSF Multi-Grid (Demo Mode)",
        timestamp: now,
      },
      weather_conditions: {
        wind_speed_knots: 12.5,
        wind_direction_deg: 180.0,
        wind_gust_knots: 16.0,
        air_temp_c: 28.5,
        precipitation_mm: 0.0,
        visibility_km: 10.0,
        alert_level: "None",
        status: "FORECAST",
        source: "IMD Coastal Marine Bulletin (Demo Mode)",
        timestamp: now,
      },
      visualization_plan: {
        result_type: "ocean_conditions",
        components_to_render: ["conditions_grid", "risk_card", "map", "agent_activity", "evidence_drawer"],
        center_lat: 17.6868,
        center_lon: 83.2185,
        default_zoom: 9,
        active_layers: ["layer_wave_risk", "layer_bhuvan_satellite"],
      },
      map_layers: [
        MOCK_TIME_VARYING_WAVE_RISK,
        MOCK_BHUVAN_WMS_LAYER,
      ],
      evidence: [],
      agent_activity: [],
      limitations: [],
      mode: "DEMO",
    };
  }

  // 6. Default Static Query Scenario (Scrubber remains hidden)
  return {
    query_id: `qid-${Date.now()}`,
    conversation_id: convId,
    query_text: query,
    detected_language: "en",
    intent: "marine_safety",
    location: {
      name: "Visakhapatnam",
      latitude: 17.6868,
      longitude: 83.2185,
      radius_km: 40.0,
      nearest_port: "Visakhapatnam Major Port",
      state: "Andhra Pradesh",
      maritime_zone: "Central Bay of Bengal",
    },
    temporal: {
      label: "Current Static Baseline",
      start_time: "2026-09-10T12:00:00",
      end_time: "2026-09-10T12:00:00",
      is_forecast: false,
      is_historical: false,
      offset_hours: 0,
    },
    executive_summary:
      "Current marine conditions near Visakhapatnam present an overall LOW RISK (Score: 13/100). Significant wave height is 1.4m with steady surface winds of 11.5 knots.",
    recommendation:
      "Conditions are favorable for coastal navigation and small-craft operations. Keep continuous marine VHF watch on Channel 16.",
    risk_assessment: {
      overall_score: 13,
      category: "LOW",
      contributing_factors: [
        {
          name: "Significant Wave Height (SWH)",
          value: "1.4 m",
          points_added: 8,
          description: "Moderate/slight sea state",
        },
        {
          name: "Wind Speed",
          value: "11.5 kt",
          points_added: 3,
          description: "Gentle breeze",
        },
      ],
      triggered_rules: [],
      missing_inputs: [],
      confidence_percentage: 95,
      data_quality_label: "Authoritative Observations & Calibrated Forecasts",
    },
    ocean_conditions: {
      significant_wave_height_m: 1.4,
      swell_height_m: 1.0,
      swell_period_sec: 8.0,
      swell_direction_deg: 160.0,
      sea_surface_temp_c: 28.6,
      ocean_current_speed_m_s: 0.42,
      ocean_current_direction_deg: 75.0,
      sea_state: "Slight",
      status: "FORECAST",
      source: "INCOIS OSF Multi-Grid (Demo Mode)",
      timestamp: now,
    },
    weather_conditions: {
      wind_speed_knots: 11.5,
      wind_direction_deg: 180.0,
      wind_gust_knots: 15.0,
      air_temp_c: 28.5,
      precipitation_mm: 0.0,
      visibility_km: 10.0,
      alert_level: "None",
      status: "FORECAST",
      source: "IMD Coastal Marine Bulletin (Demo Mode)",
      timestamp: now,
    },
    visualization_plan: {
      result_type: "marine_safety",
      components_to_render: ["risk_card", "conditions_grid", "map", "agent_activity", "evidence_drawer"],
      center_lat: 17.6868,
      center_lon: 83.2185,
      default_zoom: 9,
      active_layers: ["layer_locations"],
    },
    map_layers: [
      {
        layer_id: "layer_locations",
        id: "layer_locations",
        name: "Inspected Coastal Target",
        label: "Inspected Coastal Target",
        layer_type: "point",
        kind: "geojson",
        purpose_group: "reference",
        time_varying: false,
        color: "#00f5d4",
        visible_by_default: true,
        legend_title: "Target Port",
        features: [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [83.2185, 17.6868] },
            properties: {
              title: "Visakhapatnam Major Port",
              type: "target_center",
              radius_km: 40,
            },
          },
        ],
      },
    ],
    evidence: [],
    agent_activity: [],
    limitations: [],
    mode: "DEMO",
  };
}
