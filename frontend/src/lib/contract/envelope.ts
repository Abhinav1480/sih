/**
 * The frozen 1.4.0 response envelope, as TypeScript.
 *
 * Mirrors backend/app/models/envelope.py and docs/API_CONTRACT.md field for
 * field. The captures under docs/examples/ are the ground truth; the app is
 * built against them and never against a running backend, and the backend's
 * test_api_contract_frozen.py fails if the shape moves without a version bump.
 *
 * Everything the app renders comes through these types. Optional fields are
 * optional because the contract says a value can be absent; a screen renders
 * an absent value as unavailable and never fills it in.
 */

export const CONTRACT_VERSION = "1.5.0";

export type Verdict = "GO" | "CAUTION" | "NO_GO" | "NOT_APPLICABLE";
export type Band = "LOW" | "MODERATE" | "HIGH" | "SEVERE";
export type ProviderTier = "ISRO" | "NATIONAL" | "FALLBACK";
export type Freshness = "LIVE" | "FORECAST" | "CACHED" | "HISTORICAL" | "DEMO" | "UNAVAILABLE";
export type TraceStatus = "COMPLETED" | "SKIPPED" | "UNAVAILABLE" | "FAILED" | string;

export interface Answer {
  headline: string;
  verdict: Verdict | string;
  narrative: string;
  confidence: number;
}

export interface RiskFactor {
  name: string;
  value: string;
  points_added: number;
  description: string;
}

export interface RiskBlock {
  score: number;
  band: Band | string;
  factors: RiskFactor[];
  triggered_rules: string[];
  missing_inputs: string[];
  confidence: number;
  data_quality: string;
}

export interface Location {
  name: string;
  latitude: number;
  longitude: number;
  radius_km?: number;
  nearest_port?: string | null;
  state?: string | null;
  maritime_zone?: string | null;
}

export interface Temporal {
  label: string;
  start_time: string;
  end_time: string;
  is_forecast: boolean;
  is_historical: boolean;
  offset_hours: number;
}

// --- cards ------------------------------------------------------------------

interface CardBase {
  id: string;
  title: string;
  evidence_ids: string[];
}

export interface RiskSummaryCard extends CardBase {
  type: "risk_summary";
  verdict: Verdict | string;
  band: Band | string;
  score: number;
  factors: RiskFactor[];
  triggered_rules: string[];
}

export interface FishingZone {
  zone_id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  bearing_deg: number;
  sst_c?: number | null;
  chlorophyll_mg_m3?: number | null;
  depth_m?: number | null;
  suitability_score: number;
  rank: number;
  within_mpa: boolean;
  mpa_name?: string | null;
  wave_height_m?: number | null;
  wind_speed_knots?: number | null;
  advisory_status: string;
  valid_until: string;
}

export interface PfzRankingCard extends CardBase {
  type: "pfz_ranking";
  zones: FishingZone[];
  rejected_reasons: string[];
}

export interface RouteWaypoint {
  name: string;
  latitude: number;
  longitude: number;
  segment_risk: Band | string;
  wave_height_m?: number | null;
  wind_knots?: number | null;
  inside_restricted_zone: boolean;
  restriction_detail?: string | null;
}

export interface RoutePlanCard extends CardBase {
  type: "route_plan";
  origin: Location;
  destination: Location;
  total_distance_km: number;
  estimated_transit_hours: number;
  waypoints: RouteWaypoint[];
  crosses_protected_waters: boolean;
  protected_areas_intersected: string[];
  overall_route_risk: Band | string;
  recommended_action: string;
}

export interface ComparisonTableCard extends CardBase {
  type: "comparison_table";
  [key: string]: unknown;
}

export interface TimeSeriesPoint {
  timestamp: string;
  wave_height_m: number;
  wind_knots: number;
  sst_c?: number | null;
  risk_score: number;
  offset_hours?: number;
  source?: string;
  status?: Freshness | string;
}

export interface TimeseriesChartCard extends CardBase {
  type: "timeseries_chart";
  period_description: string;
  points: TimeSeriesPoint[];
  significant_change_detected: boolean;
  change_reasons: string[];
}

export interface GeofenceWarningCard extends CardBase {
  type: "geofence_warning";
  [key: string]: unknown;
}

export interface AdvisoryTextCard extends CardBase {
  type: "advisory_text";
  body: string;
}

/** A card type this build does not know. Rendered as an explicit unsupported state. */
export interface UnknownCard extends CardBase {
  type: string;
  [key: string]: unknown;
}

export type Card =
  | RiskSummaryCard
  | PfzRankingCard
  | RoutePlanCard
  | ComparisonTableCard
  | TimeseriesChartCard
  | GeofenceWarningCard
  | AdvisoryTextCard;

export const KNOWN_CARD_TYPES = new Set<string>([
  "risk_summary", "pfz_ranking", "route_plan", "comparison_table",
  "timeseries_chart", "geofence_warning", "advisory_text",
]);

// --- layers, evidence, alerts, trace, meta ------------------------------------

export interface Layer {
  id: string;
  kind: "geojson" | "wms" | string;
  name: string;
  provider?: string;
  provider_tier?: ProviderTier | string;
  status?: string;
  legend_title?: string;
  legend_unit?: string;
  color?: string;
  visible_by_default?: boolean;
  features?: unknown[];
  url?: string;
  layer?: string;
  attribution?: string;
  [key: string]: unknown;
}

export interface EvidenceRecord {
  id: string;
  provider: string;
  provider_tier: ProviderTier | string;
  dataset: string;
  variable: string;
  value: string;
  unit: string;
  location: string;
  coordinates?: string | null;
  observation_or_forecast_time: string;
  retrieval_time: string;
  status: Freshness | string;
  reliability_notes?: string | null;
}

export interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  issued_at: string;
  valid_until?: string | null;
  recommended_action?: string | null;
  evidence_ids: string[];
  source: string;
  provider_tier: ProviderTier | string;
}

export interface TraceEvent {
  seq: number;
  stage: string;
  agent: string;
  action: string;
  tool?: string | null;
  duration_ms: number;
  detail?: string | null;
  status: TraceStatus;
  timestamp: string;
}

export interface Meta {
  mode: string;
  query_text: string;
  contract_version: string;
  generated_at: string;
  location: Location;
  temporal: Temporal;
  limitations: string[];
  degraded: boolean;
  notes: string[];
  /** Set by the app, never by the server, when the response came from cache. */
  cached?: boolean;
  cached_at?: string;
}

export interface Envelope {
  request_id: string;
  session_id: string;
  intent: string;
  language: string;
  answer: Answer;
  risk: RiskBlock | null;
  cards: (Card | UnknownCard)[];
  layers: Layer[];
  evidence: EvidenceRecord[];
  alerts: Alert[];
  trace: TraceEvent[];
  meta: Meta;
  needs_clarification?: boolean;
  clarification_question?: string | null;
  missing_information?: string[];
}

/** The request body for POST /api/query. It is `conversation_id`, not `session_id`. */
export interface QueryRequest {
  query: string;
  conversation_id?: string;
  user_location: { latitude: number; longitude: number };
  preferred_language?: string;
}

export function cardOfType<T extends Card["type"]>(
  envelope: Envelope | null | undefined,
  type: T
): Extract<Card, { type: T }> | null {
  const hit = envelope?.cards?.find((c) => c.type === type);
  return (hit as Extract<Card, { type: T }>) ?? null;
}

/** Evidence records a card cites, in the order the card lists them. */
export function evidenceFor(envelope: Envelope, card: CardBase): EvidenceRecord[] {
  const byId = new Map(envelope.evidence.map((e) => [e.id, e]));
  return card.evidence_ids.map((id) => byId.get(id)).filter((e): e is EvidenceRecord => !!e);
}
