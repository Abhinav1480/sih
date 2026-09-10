export type RiskCategory = "LOW" | "MODERATE" | "HIGH" | "SEVERE";
export type DataFreshness = "LIVE" | "FORECAST" | "CACHED" | "HISTORICAL" | "DEMO" | "UNAVAILABLE";
export type QueryIntent =
  | "marine_safety"
  | "fishing_zones"
  | "ocean_conditions"
  | "weather_forecast"
  | "route_analysis"
  | "regional_comparison"
  | "spatial_what_if"
  | "historical_trend"
  | "geofence_restriction"
  | "explainability"
  | "multilingual_translation"
  | "general_exploration"
  | "needs_clarification";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationContext {
  name: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  nearest_port?: string;
  state?: string;
  maritime_zone?: string;
}

export interface TemporalContext {
  label: string;
  start_time: string;
  end_time: string;
  is_forecast: boolean;
  is_historical: boolean;
  offset_hours: number;
}

export interface AgentStepRecord {
  agent: string;
  action: string;
  tool?: string;
  status: string;
  duration_ms: number;
  details?: string;
  timestamp: string;
}

export interface OceanObservation {
  significant_wave_height_m: number;
  swell_height_m: number;
  swell_period_sec: number;
  swell_direction_deg: number;
  sea_surface_temp_c: number;
  ocean_current_speed_m_s: number;
  ocean_current_direction_deg: number;
  sea_state: string;
  status: DataFreshness;
  source: string;
  timestamp: string;
}

export interface WeatherObservation {
  wind_speed_knots: number;
  wind_direction_deg: number;
  wind_gust_knots: number;
  air_temp_c: number;
  precipitation_mm: number;
  visibility_km: number;
  storm_warning?: string;
  alert_level: string;
  status: DataFreshness;
  source: string;
  timestamp: string;
}

export interface PotentialFishingZone {
  zone_id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  bearing_deg: number;
  sst_c: number;
  chlorophyll_mg_m3: number;
  depth_m: number;
  suitability_score: number;
  rank: number;
  within_mpa: boolean;
  mpa_name?: string;
  wave_height_m: number;
  wind_speed_knots: number;
  advisory_status: string;
  valid_until: string;
}

export interface RouteWaypoint {
  name: string;
  latitude: number;
  longitude: number;
  segment_risk: RiskCategory;
  wave_height_m: number;
  wind_knots: number;
  inside_restricted_zone: boolean;
  restriction_detail?: string;
}

export interface RouteCandidate {
  id: string;
  name: string;
  distance_km: number;
  estimated_transit_hours: number;
  marine_risk: RiskCategory;
  risk_score: number;
  wave_exposure_m: number;
  wind_exposure_knots: number;
  protected_area_exposure: string;
  crosses_protected_waters: boolean;
  protected_areas: string[];
  trade_offs: string;
  is_recommended: boolean;
  is_selected: boolean;
  waypoints: RouteWaypoint[];
  coordinates?: number[][];
}

export interface RouteComparisonMetric {
  metric_name: string;
  unit: string;
  recommended_value: string;
  alternative_value: string;
  difference: string;
  advantage: string;
}

export interface RouteComparisonData {
  recommended_route_name: string;
  alternative_route_name: string;
  selected_route_name: string;
  trade_off_analysis: string;
  what_changes_summary: string;
  metrics: RouteComparisonMetric[];
}

export interface VesselRouteAnalysis {
  route_id: string;
  origin: LocationContext;
  destination: LocationContext;
  total_distance_km: number;
  estimated_transit_hours: number;
  waypoints: RouteWaypoint[];
  crosses_protected_waters: boolean;
  protected_areas_intersected: string[];
  overall_route_risk: RiskCategory;
  recommended_action: string;
  alternative_suggested: boolean;
  alternative_route_notes?: string;
  candidate_routes?: RouteCandidate[];
  selected_route_id?: string;
  route_comparison?: RouteComparisonData;
}

export interface RiskFactor {
  name: string;
  value: string;
  points_added: number;
  description: string;
}

export interface DeterministicRiskResult {
  overall_score: number;
  category: RiskCategory;
  contributing_factors: RiskFactor[];
  triggered_rules: string[];
  missing_inputs: string[];
  data_quality?: string;
  data_quality_notes?: string;
  data_quality_label?: string;
  confidence_percentage?: number;
}

export interface EvidenceRecord {
  id: string;
  provider: string;
  dataset: string;
  variable: string;
  value: string;
  unit: string;
  location: string;
  coordinates?: string;
  observation_or_forecast_time: string;
  retrieval_time: string;
  status: DataFreshness;
  reliability_notes?: string;
}

export interface MapLayerFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: any;
  };
  properties: Record<string, any>;
}

export interface MapLayerData {
  layer_id: string;
  name: string;
  layer_type: string;
  features: MapLayerFeature[];
  visible_by_default: boolean;
  color: string;
  legend_title: string;
  legend_unit?: string;
}

export interface VisualizationPlan {
  result_type: string;
  components_to_render: string[];
  center_lat: number;
  center_lon: number;
  default_zoom: number;
  active_layers: string[];
}

export interface ComparisonMetric {
  metric_name: string;
  unit: string;
  location_a_value: number;
  location_b_value: number;
  difference: number;
  favorability: string;
}

export interface RegionalComparisonData {
  location_a: LocationContext;
  location_b: LocationContext;
  metrics: ComparisonMetric[];
  overall_verdict: string;
}

export interface TimeSeriesPoint {
  timestamp: string;
  wave_height_m: number;
  wind_knots: number;
  sst_c: number;
  risk_score: number;
}

export interface HistoricalTrendData {
  location_name: string;
  period_description: string;
  trend_summary: string;
  points: TimeSeriesPoint[];
  significant_change_detected: boolean;
  change_reasons: string[];
}

export interface RankedConditionChange {
  rank: number;
  metric_name: string;
  unit: string;
  location_a_value: number;
  location_b_value: number;
  absolute_difference: number;
  percentage_difference?: number;
  change_direction: string;
  operational_impact: string;
  explanation: string;
  computed_fact?: string;
  data_supported_interpretation?: string;
  physical_hypothesis?: string;
}

export interface SpatialWhatIfAnalysisData {
  origin: LocationContext;
  displaced: LocationContext;
  distance_km: number;
  direction: string;
  bearing_deg: number;
  temporal_label: string;
  ranked_changes: RankedConditionChange[];
  top_changed_condition: string;
  physical_reasoning: string;
  operational_significance: string;
  metrics_summary: ComparisonMetric[];
  computed_fact?: string;
  data_supported_interpretation?: string;
  physical_hypothesis?: string;
}

export interface OrcaAnalysisResponse {
  query_id: string;
  conversation_id: string;
  query_text: string;
  detected_language: string;
  intent: QueryIntent;
  location: LocationContext;
  temporal: TemporalContext;
  executive_summary: string;
  recommendation: string;
  needs_clarification?: boolean;
  clarification_question?: string;
  missing_information?: string[];
  risk_assessment?: DeterministicRiskResult;
  ocean_conditions?: OceanObservation;
  weather_conditions?: WeatherObservation;
  fishing_zones?: PotentialFishingZone[];
  route_analysis?: VesselRouteAnalysis;
  route_comparison?: RouteComparisonData;
  comparison_data?: RegionalComparisonData;
  historical_trend?: HistoricalTrendData;
  spatial_what_if?: SpatialWhatIfAnalysisData;
  visualization_plan: VisualizationPlan;
  map_layers: MapLayerData[];
  evidence: EvidenceRecord[];
  agent_activity: AgentStepRecord[];
  limitations: string[];
  mode: string;
}

export interface MarineAlert {
  alert_id: string;
  source: string;
  sector: string;
  severity: string;
  title: string;
  description: string;
  issued_at: string;
  valid_until: string;
  recommended_action: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  updated_at?: string;
  created_at?: string;
}
