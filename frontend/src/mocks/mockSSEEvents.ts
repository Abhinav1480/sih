import { SSETraceEvent } from "../lib/types";

export interface MockStreamConfig {
  delayMs?: number;
  onEvent?: (event: SSETraceEvent) => void;
}

/**
 * Generates realistic SSE event streams for SIH 2026 PS 26176 test scenarios.
 * Strictly respects prompt requirements:
 * - Fishing query: Ocean, Weather, Fishery, Geo, Risk agents
 * - Route query: Ocean, Weather (with Replan recovery demo), Geo, Vessel, Risk agents
 * - Spatial What-if query: Ocean, Weather, Geo, Risk agents with gradient analysis
 */
export function getMockSSEEventsForQuery(query: string): SSETraceEvent[] {
  const q = query.toLowerCase();

  // 1. Route Analysis Scenario (Featuring the Critical SIH Replan Demo!)
  if (q.includes("route") || q.includes("kakinada") || q.includes("corridor") || q.includes("transit")) {
    return [
      {
        seq: 1,
        stage: "planner",
        agent: "ORCA Task Planner",
        action: "Parsed query intent, transit corridor, constraints, and selected specialist agents",
        timestamp: new Date().toISOString(),
        payload: {
          intent: "Route Analysis & Maritime Navigation Safety",
          spatial_target: "Kakinada Port → Visakhapatnam Major Port",
          temporal_window: "Tomorrow morning (05:00 - 11:00)",
          constraints: ["Avoid Coringa Wildlife Sanctuary", "Minimise wave risk for craft < 15m", "Maintain safe water depth > 10m"],
          selected_agents: ["OceanAgent", "WeatherAgent", "GeoAgent", "VesselAgent", "RiskAgent"]
        },
        detail: "Corridor: Kakinada → Visakhapatnam | Horizon: +24h | 5 Agents Assigned"
      },
      {
        seq: 2,
        stage: "agent_start",
        agent: "OceanAgent",
        action: "Assessing wave conditions, swell spectrum, and surface currents along corridor",
        timestamp: new Date().toISOString(),
        payload: {
          agent: "OceanAgent",
          task: "Querying INCOIS OSF multi-grid wave model & coastal wave-rider buoys"
        }
      },
      {
        seq: 3,
        stage: "agent_start",
        agent: "WeatherAgent",
        action: "Retrieving IMD high-resolution coastal Doppler radar & surface wind fields",
        timestamp: new Date().toISOString(),
        payload: {
          agent: "WeatherAgent",
          task: "Contacting IMD Coastal Radar & Meteorological Bulletin API"
        }
      },
      {
        seq: 4,
        stage: "agent_result",
        agent: "OceanAgent",
        action: "Assessed significant wave height (1.6m) and swell period (8.5s)",
        status: "COMPLETED",
        duration_ms: 1840,
        timestamp: new Date().toISOString(),
        evidence_ids: ["ev_incois_osf_01", "ev_incois_osf_02", "ev_wave_buoy_vizag"],
        payload: {
          agent: "OceanAgent",
          summary: "Wave conditions assessed: SWH 1.6m (Moderate), swell 1.1m @ 8.5s from 160° SSE. Inshore shelf shows heightened sea state.",
          duration_ms: 1840,
          evidence_ids: ["ev_incois_osf_01", "ev_incois_osf_02", "ev_wave_buoy_vizag"],
          metadata: { wave_height_m: 1.6, swell_period_sec: 8.5, sea_state: "Moderate" }
        }
      },
      {
        seq: 5,
        stage: "agent_message",
        agent: "OceanAgent",
        action: "Dispatched sea-state alert to RiskAgent and VesselAgent",
        timestamp: new Date().toISOString(),
        payload: {
          from_agent: "OceanAgent",
          to_agent: "RiskAgent",
          message: "Wave exposure exceeds preferred 1.5m comfort threshold on shallow inshore shelf."
        }
      },
      {
        seq: 6,
        stage: "replan",
        agent: "ORCA Task Planner",
        action: "↻ REPLAN: Primary IMD radar feed timed out. Reassigning task to calibrated fallback forecast model.",
        status: "REPLANNED",
        timestamp: new Date().toISOString(),
        payload: {
          reason: "Primary IMD coastal radar feed timed out (504 Gateway Timeout).",
          failed_source: "IMD Coastal Doppler Radar API",
          failed_agent: "WeatherAgent",
          reassigned_to: "WeatherAgent → fallback OSF-calibrated atmospheric model",
          new_source: "INCOIS-OSF Calibrated Marine Forecast Blend",
          action_taken: "Seamlessly switched to secondary calibrated forecast provider with zero downtime."
        },
        detail: "Weather source unavailable. Reassigning task: WeatherAgent → fallback forecast source."
      },
      {
        seq: 7,
        stage: "agent_start",
        agent: "GeoAgent",
        action: "Evaluating marine protected areas, sanctuary boundaries, and navigational geofences",
        timestamp: new Date().toISOString(),
        payload: {
          agent: "GeoAgent",
          task: "Geofencing check against MoEFCC Coringa Wildlife Sanctuary polygon"
        }
      },
      {
        seq: 8,
        stage: "agent_result",
        agent: "WeatherAgent",
        action: "Retrieved atmospheric parameters via secondary calibrated model",
        status: "COMPLETED",
        duration_ms: 2150,
        timestamp: new Date().toISOString(),
        evidence_ids: ["ev_osf_meteo_fallback_01", "ev_marine_bulletin_02"],
        payload: {
          agent: "WeatherAgent",
          summary: "Weather conditions assessed via fallback OSF blend: Wind 12.5 kt sustained, gusts 16.9 kt from 180° S. Visibility 10.0 km (Clear).",
          duration_ms: 2150,
          evidence_ids: ["ev_osf_meteo_fallback_01", "ev_marine_bulletin_02"],
          metadata: { wind_speed_knots: 12.5, wind_gust_knots: 16.9, visibility_km: 10.0 }
        }
      },
      {
        seq: 9,
        stage: "agent_result",
        agent: "GeoAgent",
        action: "Verified Coringa sanctuary buffer; clearance 8.2 km seaward",
        status: "COMPLETED",
        duration_ms: 620,
        timestamp: new Date().toISOString(),
        evidence_ids: ["ev_moefcc_mpa_coringa", "ev_incois_geofence_01"],
        payload: {
          agent: "GeoAgent",
          summary: "Coringa Wildlife Sanctuary boundary checked. Recommended corridor maintains safe 8.2 km buffer zone.",
          duration_ms: 620,
          evidence_ids: ["ev_moefcc_mpa_coringa", "ev_incois_geofence_01"],
          metadata: { sanctuary_distance_km: 8.2, in_protected_area: false }
        }
      },
      {
        seq: 10,
        stage: "agent_start",
        agent: "VesselAgent",
        action: "Calculating waypoint corridors and optimizing lower-risk route candidate",
        timestamp: new Date().toISOString(),
        payload: {
          agent: "VesselAgent",
          task: "Computing recommended offshore transit corridor vs standard coastal track"
        }
      },
      {
        seq: 11,
        stage: "agent_message",
        agent: "GeoAgent",
        action: "Transmitted sanctuary avoidance boundary constraint",
        timestamp: new Date().toISOString(),
        payload: {
          from_agent: "GeoAgent",
          to_agent: "VesselAgent",
          message: "Coringa boundary active: northern coastal leg requires 5.5 NM seaward diversion."
        }
      },
      {
        seq: 12,
        stage: "agent_result",
        agent: "VesselAgent",
        action: "Generated dual route comparison: Recommended Offshore vs Direct Coastal corridor",
        status: "COMPLETED",
        duration_ms: 1420,
        timestamp: new Date().toISOString(),
        evidence_ids: ["ev_vessel_corridor_01", "ev_ais_density_02"],
        payload: {
          agent: "VesselAgent",
          summary: "Route corridors analyzed: Recommended offshore corridor is 142.6 km (7.1h transit), offering lower risk and avoiding Coringa buffer.",
          duration_ms: 1420,
          evidence_ids: ["ev_vessel_corridor_01", "ev_ais_density_02"],
          metadata: { total_distance_km: 142.6, estimated_hours: 7.1, candidates: 2 }
        }
      },
      {
        seq: 13,
        stage: "correlation",
        agent: "Cross-Agent Correlation Engine",
        action: "Identified wave and wind coupling across coastal bend",
        timestamp: new Date().toISOString(),
        payload: {
          agents: ["OceanAgent", "WeatherAgent"],
          title: "CROSS-AGENT FINDING",
          finding: "Higher wave exposure (1.6m) aligns directly with sustained southerly wind gusts (16.9 kt) along coastal shoals.",
          impact: "Recommended offshore corridor provides smoother heading angle and reduces wave slam."
        },
        detail: "Ocean + Weather: Higher wave exposure aligns with stronger wind conditions."
      },
      {
        seq: 14,
        stage: "risk",
        agent: "Deterministic Risk Engine",
        action: "Computed composite route risk score and contributing factors",
        timestamp: new Date().toISOString(),
        payload: {
          score: 30,
          band: "MODERATE",
          key_factors: [
            "Significant Wave Height (SWH): 1.6m (+10 pts)",
            "Wind Speed: 12.5 kt sustained (+3 pts)",
            "Coringa MPA Proximity: 8.2 km buffer maintained (0 pts)"
          ]
        },
        detail: "RISK ENGINE: MODERATE · 30 / 100"
      },
      {
        seq: 15,
        stage: "synthesis",
        agent: "Report Synthesis Agent",
        action: "Synthesizing full marine intelligence advisory and route comparison plan",
        timestamp: new Date().toISOString(),
        payload: {
          status: "generating",
          headline: "Generating final marine intelligence & navigational recommendation..."
        }
      },
      {
        seq: 16,
        stage: "synthesis",
        agent: "Report Synthesis Agent",
        action: "Final intelligence response generated",
        timestamp: new Date().toISOString(),
        payload: {
          status: "ready",
          headline: "FINAL RESPONSE READY"
        }
      },
      {
        seq: 17,
        stage: "done",
        agent: "ORCA Orchestrator",
        action: "Analysis complete across all specialist agents",
        status: "COMPLETED",
        duration_ms: 4820,
        timestamp: new Date().toISOString(),
        payload: {
          total_agents: 6,
          total_duration_ms: 4820,
          completed_at: new Date().toISOString()
        },
        detail: "✓ ANALYSIS COMPLETE: 6 agents · 4.8s"
      }
    ];
  }

  // 2. Potential Fishing Zone (PFZ) Discovery Scenario
  if (q.includes("fishing") || q.includes("fish") || q.includes("pfz") || q.includes("catch")) {
    return [
      {
        seq: 1,
        stage: "planner",
        agent: "ORCA Task Planner",
        action: "Parsed fishing zone intent, search radius, and scheduled specialist agents",
        timestamp: new Date().toISOString(),
        payload: {
          intent: "Potential Fishing Zone (PFZ) Discovery",
          spatial_target: "Visakhapatnam (50 km Coastal Radius)",
          temporal_window: "Tomorrow morning (05:00 - 11:00)",
          constraints: ["No fishing in MPAs", "Verify wave safety < 1.8m", "Chlorophyll suitability > 0.4 mg/m³"],
          selected_agents: ["OceanAgent", "WeatherAgent", "GeoAgent", "FisheryAgent", "RiskAgent"]
        },
        detail: "Visakhapatnam (50 km) | Horizon: Tomorrow morning | 5 Agents Assigned"
      },
      {
        seq: 2,
        stage: "agent_start",
        agent: "OceanAgent",
        action: "Scanning sea surface temperature (SST) fronts and thermal gradient boundaries",
        timestamp: new Date().toISOString(),
        payload: {
          agent: "OceanAgent",
          task: "Querying INCOIS OSF SST satellite observations & coastal ocean currents"
        }
      },
      {
        seq: 3,
        stage: "agent_start",
        agent: "FisheryAgent",
        action: "Querying Oceansat-3 chlorophyll-a and INCOIS PFZ advisory database",
        timestamp: new Date().toISOString(),
        payload: {
          agent: "FisheryAgent",
          task: "Retrieving chlorophyll-a concentrations and pelagic fish habitat index"
        }
      },
      {
        seq: 4,
        stage: "agent_result",
        agent: "OceanAgent",
        action: "Identified prominent SST thermal break 32 km ESE of Visakhapatnam",
        status: "COMPLETED",
        duration_ms: 1650,
        timestamp: new Date().toISOString(),
        evidence_ids: ["ev_incois_sst_vizag", "ev_modis_temp_01"],
        payload: {
          agent: "OceanAgent",
          summary: "Thermal break detected: SST ranges 28.4°C to 28.8°C with strong thermal gradient. Wave height 1.2m.",
          duration_ms: 1650,
          evidence_ids: ["ev_incois_sst_vizag", "ev_modis_temp_01"],
          metadata: { sst_c: 28.6, wave_height_m: 1.2, current_speed_ms: 0.45 }
        }
      },
      {
        seq: 5,
        stage: "agent_start",
        agent: "GeoAgent",
        action: "Cross-referencing candidate zones against marine conservation areas",
        timestamp: new Date().toISOString(),
        payload: {
          agent: "GeoAgent",
          task: "Checking marine protected area boundary polygons near Visakhapatnam"
        }
      },
      {
        seq: 6,
        stage: "agent_result",
        agent: "GeoAgent",
        action: "Verified all candidate fishing coordinates are outside restricted conservation zones",
        status: "COMPLETED",
        duration_ms: 580,
        timestamp: new Date().toISOString(),
        evidence_ids: ["ev_moefcc_mpa_vizag"],
        payload: {
          agent: "GeoAgent",
          summary: "All 3 top fishing zones verified clear of marine sanctuaries, port limits, and naval security channels.",
          duration_ms: 580,
          evidence_ids: ["ev_moefcc_mpa_vizag"],
          metadata: { restricted_zones_cleared: 3 }
        }
      },
      {
        seq: 7,
        stage: "agent_start",
        agent: "WeatherAgent",
        action: "Assessing localized sea-keeping conditions and squall potential",
        timestamp: new Date().toISOString(),
        payload: {
          agent: "WeatherAgent",
          task: "Evaluating wind gusts and coastal thunderstorm risk for small craft"
        }
      },
      {
        seq: 8,
        stage: "agent_result",
        agent: "FisheryAgent",
        action: "Ranked top 3 potential fishing zones with high suitability scores",
        status: "COMPLETED",
        duration_ms: 1980,
        timestamp: new Date().toISOString(),
        evidence_ids: ["ev_incois_pfz_vizag_01", "ev_incois_pfz_vizag_02"],
        payload: {
          agent: "FisheryAgent",
          summary: "Identified 3 high-yield zones: Zone Alpha (Score 88/100, 24 km ESE), Zone Beta (Score 79/100, 38 km E), Zone Gamma (Score 72/100, 44 km SE).",
          duration_ms: 1980,
          evidence_ids: ["ev_incois_pfz_vizag_01", "ev_incois_pfz_vizag_02"],
          metadata: { top_zone: "PFZ Alpha", zones_count: 3 }
        }
      },
      {
        seq: 9,
        stage: "agent_message",
        agent: "FisheryAgent",
        action: "Communicated target coordinates and depth profile to RiskAgent",
        timestamp: new Date().toISOString(),
        payload: {
          from_agent: "FisheryAgent",
          to_agent: "RiskAgent",
          message: "PFZ Alpha optimal depth is 42m with 0.85 mg/m³ chlorophyll-a concentration."
        }
      },
      {
        seq: 10,
        stage: "agent_result",
        agent: "WeatherAgent",
        action: "Forecasted calm winds (10.2 kt) and clear visibility (10 km)",
        status: "COMPLETED",
        duration_ms: 1320,
        timestamp: new Date().toISOString(),
        evidence_ids: ["ev_imd_bulletin_vizag"],
        payload: {
          agent: "WeatherAgent",
          summary: "Weather nominal: Wind 10.2 kt south-southeasterly, air temp 28.5°C, no squall warning issued.",
          duration_ms: 1320,
          evidence_ids: ["ev_imd_bulletin_vizag"],
          metadata: { wind_speed_knots: 10.2, squall_warning: false }
        }
      },
      {
        seq: 11,
        stage: "correlation",
        agent: "Cross-Agent Correlation Engine",
        action: "Discovered thermal front convergence with chlorophyll plume",
        timestamp: new Date().toISOString(),
        payload: {
          agents: ["OceanAgent", "FisheryAgent"],
          title: "CROSS-AGENT FINDING",
          finding: "SST thermal boundary (28.4°C) directly coincides with peak chlorophyll-a accumulation (0.85 mg/m³).",
          impact: "Indicates active upwelling zone with elevated pelagic baitfish concentration."
        },
        detail: "Ocean + Fishery: Thermal boundary aligns with elevated chlorophyll concentration."
      },
      {
        seq: 12,
        stage: "risk",
        agent: "Deterministic Risk Engine",
        action: "Calculated operational risk score for small-to-medium fishing craft",
        timestamp: new Date().toISOString(),
        payload: {
          score: 18,
          band: "LOW",
          key_factors: [
            "Wave Height: 1.2m (Slight sea state, nominal)",
            "Wind Speed: 10.2 kt (Favorable sailing breeze)",
            "Sanctuary Conflict: None (Clear of protected waters)"
          ]
        },
        detail: "RISK ENGINE: LOW · 18 / 100"
      },
      {
        seq: 13,
        stage: "synthesis",
        agent: "Report Synthesis Agent",
        action: "Compiling fishing intelligence briefing and zone coordinates",
        timestamp: new Date().toISOString(),
        payload: {
          status: "generating",
          headline: "Generating final fishing intelligence & advisory maps..."
        }
      },
      {
        seq: 14,
        stage: "synthesis",
        agent: "Report Synthesis Agent",
        action: "Intelligence advisory ready",
        timestamp: new Date().toISOString(),
        payload: {
          status: "ready",
          headline: "FINAL RESPONSE READY"
        }
      },
      {
        seq: 15,
        stage: "done",
        agent: "ORCA Orchestrator",
        action: "Analysis complete across all specialist agents",
        status: "COMPLETED",
        duration_ms: 3950,
        timestamp: new Date().toISOString(),
        payload: {
          total_agents: 5,
          total_duration_ms: 3950,
          completed_at: new Date().toISOString()
        },
        detail: "✓ ANALYSIS COMPLETE: 5 agents · 3.9s"
      }
    ];
  }

  // 3. Spatial What-If Scenario (Displacement & Gradient Analysis)
  if (q.includes("changes") || q.includes("offshore") || q.includes("what-if") || q.includes("30 km") || q.includes("gradient")) {
    return [
      {
        seq: 1,
        stage: "planner",
        agent: "ORCA Task Planner",
        action: "Parsed spatial displacement query and configured comparative telemetry pipeline",
        timestamp: new Date().toISOString(),
        payload: {
          intent: "Spatial What-If & Boundary Displacement Analysis",
          spatial_target: "Visakhapatnam → 30 km Offshore (Bearing 110° ESE)",
          temporal_window: "Tomorrow morning (05:00 - 11:00)",
          constraints: ["Compute physical differential", "Assess bathymetric drop-off", "Identify operational safety shifts"],
          selected_agents: ["OceanAgent", "WeatherAgent", "GeoAgent", "RiskAgent"]
        },
        detail: "Displacement: 30 km ESE | Bathymetric Slope Analysis | 4 Agents Assigned"
      },
      {
        seq: 2,
        stage: "agent_start",
        agent: "GeoAgent",
        action: "Calculating geodesic displacement vector and bathymetric profile",
        timestamp: new Date().toISOString(),
        payload: {
          agent: "GeoAgent",
          task: "Computing coordinate displacement from 17.68°N, 83.21°E to 17.61°N, 83.48°E"
        }
      },
      {
        seq: 3,
        stage: "agent_start",
        agent: "OceanAgent",
        action: "Fetching comparative wave spectrum at origin port vs 30 km offshore node",
        timestamp: new Date().toISOString(),
        payload: {
          agent: "OceanAgent",
          task: "Querying deep-water wave buoy telemetry & shoaling model"
        }
      },
      {
        seq: 4,
        stage: "agent_result",
        agent: "GeoAgent",
        action: "Resolved displaced node: Water depth increases from 18m coastal to 185m continental slope",
        status: "COMPLETED",
        duration_ms: 740,
        timestamp: new Date().toISOString(),
        evidence_ids: ["ev_gebco_bathymetry_01"],
        payload: {
          agent: "GeoAgent",
          summary: "Node resolved at 17.61°N, 83.48°E. Bathymetric depth increases tenfold from 18m to 185m across the shelf edge.",
          duration_ms: 740,
          evidence_ids: ["ev_gebco_bathymetry_01"],
          metadata: { depth_origin_m: 18, depth_displaced_m: 185, distance_km: 30.0 }
        }
      },
      {
        seq: 5,
        stage: "agent_start",
        agent: "WeatherAgent",
        action: "Sampling open-water wind fields and boundary layer atmospheric friction",
        timestamp: new Date().toISOString(),
        payload: {
          agent: "WeatherAgent",
          task: "Evaluating offshore marine surface winds without coastal land drag"
        }
      },
      {
        seq: 6,
        stage: "agent_result",
        agent: "OceanAgent",
        action: "Wave spectrum analyzed: Significant wave height increases by +61.5% offshore",
        status: "COMPLETED",
        duration_ms: 1820,
        timestamp: new Date().toISOString(),
        evidence_ids: ["ev_incois_osf_offshore_01", "ev_buoy_deepwater_02"],
        payload: {
          agent: "OceanAgent",
          summary: "Conditions compared: SWH increases from 1.3m nearshore to 2.1m offshore (+61.5%). Swell period increases from 7.5s to 9.2s.",
          duration_ms: 1820,
          evidence_ids: ["ev_incois_osf_offshore_01", "ev_buoy_deepwater_02"],
          metadata: { wave_height_origin: 1.3, wave_height_displaced: 2.1, difference_m: 0.8 }
        }
      },
      {
        seq: 7,
        stage: "agent_result",
        agent: "WeatherAgent",
        action: "Calculated wind differential: Sustained winds rise from 11.7 kt to 16.5 kt (+4.8 kt)",
        status: "COMPLETED",
        duration_ms: 1490,
        timestamp: new Date().toISOString(),
        evidence_ids: ["ev_openmeteo_offshore_01"],
        payload: {
          agent: "WeatherAgent",
          summary: "Wind differential analyzed: Open-ocean wind rises to 16.5 kt with gusts to 21.0 kt due to absence of landform friction.",
          duration_ms: 1490,
          evidence_ids: ["ev_openmeteo_offshore_01"],
          metadata: { wind_origin: 11.7, wind_displaced: 16.5, gust_knots: 21.0 }
        }
      },
      {
        seq: 8,
        stage: "agent_message",
        agent: "OceanAgent",
        action: "Notified RiskEngine regarding wave steepness transition",
        timestamp: new Date().toISOString(),
        payload: {
          from_agent: "OceanAgent",
          to_agent: "RiskAgent",
          message: "Wave height offshore (2.1m) crosses small-craft operational advisory threshold."
        }
      },
      {
        seq: 9,
        stage: "correlation",
        agent: "Cross-Agent Correlation Engine",
        action: "Correlated bathymetric continental slope with unattenuated swell propagation",
        timestamp: new Date().toISOString(),
        payload: {
          agents: ["OceanAgent", "GeoAgent"],
          title: "CROSS-AGENT FINDING",
          finding: "Bathymetric descent beyond the continental shelf edge removes seabed shoaling attenuation, causing steep wave amplification.",
          impact: "Sharp transition in operating conditions between nearshore and 30 km offshore stations."
        },
        detail: "Ocean + Geo: Shelf drop-off eliminates seabed wave attenuation."
      },
      {
        seq: 10,
        stage: "risk",
        agent: "Deterministic Risk Engine",
        action: "Evaluated offshore operational risk transition",
        timestamp: new Date().toISOString(),
        payload: {
          score: 48,
          band: "MODERATE",
          key_factors: [
            "Offshore SWH: 2.1m (+0.8m compared to coast, +20 pts)",
            "Offshore Wind: 16.5 kt sustained (+4.8 kt, +10 pts)",
            "Distance to Harbor Shelter: 30 km open-water exposure (+8 pts)"
          ]
        },
        detail: "RISK ENGINE: MODERATE · 48 / 100"
      },
      {
        seq: 11,
        stage: "synthesis",
        agent: "Report Synthesis Agent",
        action: "Synthesizing spatial condition divergence model and ranked physical changes",
        timestamp: new Date().toISOString(),
        payload: {
          status: "generating",
          headline: "Generating comparative spatial intelligence model..."
        }
      },
      {
        seq: 12,
        stage: "synthesis",
        agent: "Report Synthesis Agent",
        action: "Spatial comparison ready",
        timestamp: new Date().toISOString(),
        payload: {
          status: "ready",
          headline: "FINAL RESPONSE READY"
        }
      },
      {
        seq: 13,
        stage: "done",
        agent: "ORCA Orchestrator",
        action: "Analysis complete across all specialist agents",
        status: "COMPLETED",
        duration_ms: 3640,
        timestamp: new Date().toISOString(),
        payload: {
          total_agents: 4,
          total_duration_ms: 3640,
          completed_at: new Date().toISOString()
        },
        detail: "✓ ANALYSIS COMPLETE: 4 agents · 3.6s"
      }
    ];
  }

  // 4. Default / General Marine Safety Scenario
  return [
    {
      seq: 1,
      stage: "planner",
      agent: "ORCA Task Planner",
      action: "Parsed query intent, coastal jurisdiction, and selected specialist agents",
      timestamp: new Date().toISOString(),
      payload: {
        intent: "Marine Safety & Ocean State Assessment",
        spatial_target: "Coastal Zone Waters",
        temporal_window: "Tomorrow morning (05:00 - 11:00)",
        constraints: ["Standard coastal navigation rules", "Monitor swell and wind thresholds"],
        selected_agents: ["OceanAgent", "WeatherAgent", "GeoAgent", "RiskAgent"]
      },
      detail: "Coastal Safety Analysis | 4 Agents Assigned"
    },
    {
      seq: 2,
      stage: "agent_start",
      agent: "OceanAgent",
      action: "Assessing wave height, swell period, and sea surface temperature",
      timestamp: new Date().toISOString(),
      payload: { agent: "OceanAgent", task: "Retrieving INCOIS OSF wave telemetry" }
    },
    {
      seq: 3,
      stage: "agent_start",
      agent: "WeatherAgent",
      action: "Retrieving surface wind velocity, gusts, and precipitation radar",
      timestamp: new Date().toISOString(),
      payload: { agent: "WeatherAgent", task: "Retrieving IMD coastal weather bulletin" }
    },
    {
      seq: 4,
      stage: "agent_result",
      agent: "OceanAgent",
      action: "Assessed wave conditions: SWH 1.4m, swell 1.0m @ 8.0s",
      status: "COMPLETED",
      duration_ms: 1540,
      timestamp: new Date().toISOString(),
      evidence_ids: ["ev_incois_osf_gen"],
      payload: {
        agent: "OceanAgent",
        summary: "Wave conditions assessed: SWH 1.4m (Slight to moderate), swell 1.0m @ 8.0s.",
        duration_ms: 1540,
        evidence_ids: ["ev_incois_osf_gen"]
      }
    },
    {
      seq: 5,
      stage: "agent_start",
      agent: "GeoAgent",
      action: "Checking territorial limits and nearest port infrastructure",
      timestamp: new Date().toISOString(),
      payload: { agent: "GeoAgent", task: "Verifying port access and marine geofences" }
    },
    {
      seq: 6,
      stage: "agent_result",
      agent: "WeatherAgent",
      action: "Assessed atmospheric parameters: Wind 11.5 kt, visibility 10 km",
      status: "COMPLETED",
      duration_ms: 1420,
      timestamp: new Date().toISOString(),
      evidence_ids: ["ev_imd_bulletin_gen"],
      payload: {
        agent: "WeatherAgent",
        summary: "Weather nominal: Wind 11.5 kt from south, clear visibility, 0mm precipitation.",
        duration_ms: 1420,
        evidence_ids: ["ev_imd_bulletin_gen"]
      }
    },
    {
      seq: 7,
      stage: "agent_result",
      agent: "GeoAgent",
      action: "Port coordinates verified with clear channel access",
      status: "COMPLETED",
      duration_ms: 490,
      timestamp: new Date().toISOString(),
      evidence_ids: ["ev_port_registry_01"],
      payload: {
        agent: "GeoAgent",
        summary: "Coastal waters clear of restricted zones.",
        duration_ms: 490,
        evidence_ids: ["ev_port_registry_01"]
      }
    },
    {
      seq: 8,
      stage: "correlation",
      agent: "Cross-Agent Correlation Engine",
      action: "Evaluated joint wind and wave sea state",
      timestamp: new Date().toISOString(),
      payload: {
        agents: ["OceanAgent", "WeatherAgent"],
        title: "CROSS-AGENT FINDING",
        finding: "Moderate wave height (1.4m) matches local wind forcing; conditions steady.",
        impact: "Favorable conditions for routine coastal activities."
      },
      detail: "Ocean + Weather: Wave state matches local wind forcing."
    },
    {
      seq: 9,
      stage: "risk",
      agent: "Deterministic Risk Engine",
      action: "Calculated overall safety score",
      timestamp: new Date().toISOString(),
      payload: {
        score: 13,
        band: "LOW",
        key_factors: ["Wave Height: 1.4m (Nominal)", "Wind: 11.5 kt (Favorable)"]
      },
      detail: "RISK ENGINE: LOW · 13 / 100"
    },
    {
      seq: 10,
      stage: "synthesis",
      agent: "Report Synthesis Agent",
      action: "Synthesizing marine safety advisory",
      timestamp: new Date().toISOString(),
      payload: {
        status: "generating",
        headline: "Generating final marine intelligence advisory..."
      }
    },
    {
      seq: 11,
      stage: "synthesis",
      agent: "Report Synthesis Agent",
      action: "Final intelligence ready",
      timestamp: new Date().toISOString(),
      payload: {
        status: "ready",
        headline: "FINAL RESPONSE READY"
      }
    },
    {
      seq: 12,
      stage: "done",
      agent: "ORCA Orchestrator",
      action: "Analysis complete across all specialist agents",
      status: "COMPLETED",
      duration_ms: 3450,
      timestamp: new Date().toISOString(),
      payload: {
        total_agents: 4,
        total_duration_ms: 3450,
        completed_at: new Date().toISOString()
      },
      detail: "✓ ANALYSIS COMPLETE: 4 agents · 3.5s"
    }
  ];
}
