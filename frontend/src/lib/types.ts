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

// ── FE-03: ORCA AGENT TRACE TIMELINE TYPES ──────────────────────────────────

export type TraceEventType =
  | "planner"
  | "agent_start"
  | "agent_message"
  | "agent_result"
  | "replan"
  | "correlation"
  | "risk"
  | "synthesis"
  | "done"
  | "error";

export type TraceItemStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "REPLANNED"
  | "SKIPPED"
  | "FAILED";

export interface TraceItem {
  id: string;
  type: TraceEventType;
  timestamp: string;
  agent: string;
  title: string;
  summary: string;
  status: TraceItemStatus;
  duration?: number;
  duration_ms?: number;
  evidenceIds?: string[];
  metadata?: Record<string, any>;
  children?: TraceItem[];
}

export interface PlannerPayload {
  intent: string;
  spatial_target: string;
  temporal_window: string;
  constraints?: string[];
  selected_agents: string[];
}

export interface AgentStartPayload {
  agent: string;
  task?: string;
}

export interface AgentMessagePayload {
  from_agent: string;
  to_agent: string;
  message: string;
}

export interface AgentResultPayload {
  agent: string;
  summary: string;
  duration_ms: number;
  evidence_ids?: string[];
  metadata?: Record<string, any>;
}

export interface ReplanPayload {
  reason: string;
  failed_source?: string;
  failed_agent?: string;
  reassigned_to?: string;
  new_source?: string;
  action_taken: string;
}

export interface CorrelationPayload {
  agents: string[];
  title?: string;
  finding: string;
  impact?: string;
}

export interface RiskPayload {
  score: number;
  band: RiskCategory;
  key_factors: string[];
}

export interface SynthesisPayload {
  status: "generating" | "ready";
  headline?: string;
}

export interface DonePayload {
  total_agents: number;
  total_duration_ms: number;
  completed_at: string;
}

export interface ErrorPayload {
  message: string;
  recoverable: boolean;
}

export interface SSETraceEvent {
  id?: string;
  seq?: number;
  stage: TraceEventType;
  agent?: string;
  action?: string;
  timestamp?: string;
  payload?: any;
  data?: any;
  duration_ms?: number;
  status?: string;
  detail?: string;
  evidence_ids?: string[];
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
  key?: string;
  label?: string;
  raw_value?: string | number;
  unit?: string;
  weight?: number;
  points?: number;
  rule_fired?: string;
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
  score?: number;
  band?: RiskCategory;
  factors?: RiskFactor[];
  total_check?: boolean;
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

export type LayerKind = "geojson" | "wms" | "heatmap" | "unsupported";
export type LayerPurposeGroup = "intelligence" | "reference" | "remote_gis";
export type LayerStatus = "ready" | "loading" | "unavailable" | "unsupported";

export interface MapLayerData {
  layer_id: string; // Contract fallback: id || layer_id
  id?: string;
  name: string; // Contract fallback: label || name
  label?: string;
  layer_type: string; // Contract: kind || layer_type
  kind?: LayerKind;
  features: MapLayerFeature[];
  geojson?: any;
  visible_by_default: boolean;
  color: string;
  legend_title: string;
  legend_unit?: string;
  purpose_group?: LayerPurposeGroup;
  time_varying?: boolean;
  timestamps?: string[];
  temporal_features?: Record<string, MapLayerFeature[]>;
  attribution?: string;
  url?: string;
  layer_name?: string;
  wms_params?: Record<string, any>;
  status?: LayerStatus;
  error_message?: string;
}

export interface TemporalState {
  selectedTime: string | null;
  availableTimes: string[];
  startTime: string | null;
  endTime: string | null;
  isTimeVarying: boolean;
  isPlaying: boolean;
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

// ── CONTRACT 1.3.0 ENVELOPE ─────────────────────────────────────────────────
// Build new UI against these fields. The legacy aliases on OrcaAnalysisResponse
// (executive_summary, visualization_plan, agent_activity, risk_assessment,
// map_layers, fishing_zones, location, temporal, recommendation) survive for
// one release only.

export type Verdict = "GO" | "CAUTION" | "NO_GO" | "NOT_APPLICABLE";
export type RiskBand = RiskCategory;
export type ProviderTier = "ISRO" | "NATIONAL" | "FALLBACK";

export interface EnvelopeAnswer {
  headline: string;
  verdict: Verdict;
  narrative: string;
  confidence: number;
}

export interface EnvelopeRisk {
  score: number;
  band: RiskBand;
  factors: RiskFactor[];
  triggered_rules: string[];
  missing_inputs: string[];
  confidence: number;
  data_quality: string;
}

export type CardType =
  | "risk_summary"
  | "advisory_text"
  | "pfz_ranking"
  | "route_plan"
  | "comparison_table"
  | "timeseries_chart"
  | "geofence_warning";

export interface EnvelopeCardBase {
  id: string;
  type: CardType;
  title: string;
  evidence_ids?: string[];
  [key: string]: any;
}

export interface RiskSummaryCard extends EnvelopeCardBase {
  type: "risk_summary";
  score: number;
  band: RiskBand;
  verdict: Verdict;
  factors: RiskFactor[];
  triggered_rules: string[];
}

export interface AdvisoryTextCard extends EnvelopeCardBase {
  type: "advisory_text";
  body?: string;
  text?: string;
}

export interface PfzRankingCard extends EnvelopeCardBase {
  type: "pfz_ranking";
  zones: PotentialFishingZone[];
}

export interface RoutePlanCard extends EnvelopeCardBase {
  type: "route_plan";
  route?: VesselRouteAnalysis;
  candidate_routes?: RouteCandidate[];
}

export interface ComparisonTableCard extends EnvelopeCardBase {
  type: "comparison_table";
  columns?: string[];
  rows?: Record<string, any>[];
  metrics?: ComparisonMetric[];
}

export interface TimeseriesChartCard extends EnvelopeCardBase {
  type: "timeseries_chart";
  points: TimeSeriesPoint[];
  summary?: string;
}

export interface GeofenceWarningCard extends EnvelopeCardBase {
  type: "geofence_warning";
  zones?: string[];
  detail?: string;
}

export type EnvelopeCard =
  | RiskSummaryCard
  | AdvisoryTextCard
  | PfzRankingCard
  | RoutePlanCard
  | ComparisonTableCard
  | TimeseriesChartCard
  | GeofenceWarningCard;

export interface EnvelopeLayer {
  id: string;
  name: string;
  kind: "geojson" | "wms";
  geometry_type?: string;
  features: MapLayerFeature[];
  url?: string | null;
  wms_params?: Record<string, any> | null;
  visible_by_default: boolean;
  color: string;
  legend_title: string;
  legend_unit?: string;
  attribution?: string | null;
  provider_tier?: ProviderTier;
}

export interface EnvelopeEvidenceRecord extends EvidenceRecord {
  provider_tier?: ProviderTier;
}

export interface EnvelopeAlert {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  issued_at: string;
  valid_until: string;
  recommended_action?: string;
  evidence_ids?: string[];
  source?: string;
  provider_tier?: ProviderTier;
}

export interface EnvelopeTraceStep {
  seq: number;
  stage: string;
  agent: string;
  action: string;
  tool?: string;
  duration_ms: number;
  detail?: string;
  status: "COMPLETED" | "SKIPPED";
  timestamp: string;
}

export interface EnvelopeMeta {
  mode: string;
  query_text: string;
  contract_version: string;
  generated_at: string;
  location: LocationContext;
  temporal: TemporalContext;
  limitations: string[];
  degraded: boolean;
  notes: string[];
}

export interface OrcaEnvelope {
  request_id: string;
  session_id: string;
  intent: QueryIntent;
  language: string;
  answer: EnvelopeAnswer;
  risk: EnvelopeRisk | null;
  cards: EnvelopeCard[];
  layers: EnvelopeLayer[];
  evidence: EnvelopeEvidenceRecord[];
  alerts: EnvelopeAlert[];
  trace: EnvelopeTraceStep[];
  meta: EnvelopeMeta;
}

export interface OrcaAnalysisResponse extends Partial<OrcaEnvelope> {
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
