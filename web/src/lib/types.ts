/**
 * The frozen ORCA response envelope, contract 1.5.0, as TypeScript.
 *
 * Copied from backend/app/models/envelope.py and docs/API_CONTRACT.md field
 * for field. The captures in src/captures/ are the ground truth; nothing in
 * the web app is built against a running backend. An optional field is
 * optional because the contract says the value can be absent, and an absent
 * value is rendered as unavailable, never filled in.
 */

export const CONTRACT_VERSION = "1.5.0";

export type Verdict = "GO" | "CAUTION" | "NO_GO" | "NOT_APPLICABLE";
export type Band = "LOW" | "MODERATE" | "HIGH" | "SEVERE";
export type ProviderTier = "ISRO" | "NATIONAL" | "FALLBACK";
export type Freshness = "LIVE" | "FORECAST" | "CACHED" | "HISTORICAL" | "DEMO" | "UNAVAILABLE";
export type AlertSeverity = "INFO" | "CAUTION" | "WARNING" | "SEVERE";
export type TraceStage =
  | "planner" | "agent_start" | "agent_message" | "agent_result" | "replan"
  | "correlation" | "risk" | "synthesis" | "done" | "error";

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

// --- cards -------------------------------------------------------------------

export interface CardBase {
  id: string;
  title: string;
  evidence_ids: string[];
}

export interface RiskSummaryCard extends CardBase {
  type: "risk_summary";
  score: number;
  band: Band | string;
  verdict: Verdict | string;
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
  sst_c: number | null;
  chlorophyll_mg_m3: number | null;
  depth_m: number | null;
  suitability_score: number;
  rank: number;
  within_mpa: boolean;
  mpa_name: string | null;
  wave_height_m: number | null;
  wind_speed_knots: number | null;
  advisory_status: string;
  valid_until: string;
  source: string;
  status: Freshness | string;
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
  wave_height_m: number | null;
  wind_knots: number | null;
  inside_restricted_zone: boolean;
  restriction_detail: string | null;
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

export interface ComparisonMetric {
  metric_name: string;
  unit: string;
  location_a_value: number | null;
  location_b_value: number | null;
  difference: number | null;
  favorability: string;
}

export interface ComparisonTableCard extends CardBase {
  type: "comparison_table";
  location_a: Location;
  location_b: Location;
  metrics: ComparisonMetric[];
  verdict_text: string;
}

export interface TimeSeriesPoint {
  timestamp: string;
  wave_height_m: number | null;
  wind_knots: number | null;
  sst_c: number | null;
  risk_score: number | null;
  offset_hours: number;
  source: string;
  status: Freshness | string;
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
  severity: AlertSeverity | string;
  zone_name: string;
  authority: string | null;
  restriction_level: string | null;
  distance_km: number | null;
  bearing_deg: number | null;
  detail: string;
}

export interface AdvisoryTextCard extends CardBase {
  type: "advisory_text";
  body: string;
}

/** A card type this build does not know. Rendered as an explicit unsupported state. */
export interface UnknownCard extends CardBase {
  type: string;
}

export type KnownCard =
  | RiskSummaryCard | PfzRankingCard | RoutePlanCard | ComparisonTableCard
  | TimeseriesChartCard | GeofenceWarningCard | AdvisoryTextCard;

export type Card = KnownCard | UnknownCard;

export const KNOWN_CARD_TYPES: ReadonlySet<string> = new Set([
  "risk_summary", "pfz_ranking", "route_plan", "comparison_table",
  "timeseries_chart", "geofence_warning", "advisory_text",
]);

// --- layers, evidence, alerts, trace, meta -------------------------------------

export interface GeoFeature {
  type: string;
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, unknown>;
}

export interface Layer {
  id: string;
  name: string;
  kind: "geojson" | "wms" | string;
  geometry_type: "point" | "polygon" | "linestring" | string | null;
  features: GeoFeature[];
  url: string | null;
  wms_params: Record<string, string>;
  visible_by_default: boolean;
  color: string;
  legend_title: string;
  legend_unit: string;
  attribution: string | null;
  provider_tier: ProviderTier | string;
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
  coordinates: string | null;
  observation_or_forecast_time: string;
  retrieval_time: string;
  status: Freshness | string;
  reliability_notes: string | null;
}

export interface AlertRecord {
  id: string;
  type: string;
  severity: AlertSeverity | string;
  title: string;
  description: string;
  issued_at: string;
  valid_until: string | null;
  recommended_action: string | null;
  evidence_ids: string[];
  source: string;
  provider_tier: ProviderTier | string;
}

export interface TraceEvent {
  seq: number;
  stage: TraceStage | string;
  agent: string;
  action: string;
  tool: string | null;
  duration_ms: number;
  detail: string | null;
  status: string;
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
}

export interface Envelope {
  request_id: string;
  session_id: string;
  intent: string;
  language: string;
  answer: Answer;
  risk: RiskBlock | null;
  cards: Card[];
  layers: Layer[];
  evidence: EvidenceRecord[];
  alerts: AlertRecord[];
  trace: TraceEvent[];
  meta: Meta;
}

/** POST /api/query. It is `conversation_id`, not `session_id`. */
export interface QueryRequest {
  query: string;
  conversation_id?: string;
  preferred_language?: string;
  /** Sent whenever the device or profile has one; omitted only when nothing is known. */
  user_location?: { latitude: number; longitude: number };
}

/** GET /api/alerts returns bulletins, a different shape from `Envelope.alerts`. */
export interface AlertBulletin {
  alert_id: string;
  source: string;
  sector: string;
  severity: AlertSeverity | string;
  title: string;
  description: string;
  issued_at: string;
  valid_until: string | null;
  recommended_action: string | null;
  status: Freshness | string;
  provider_tier: ProviderTier | string;
  is_agency_bulletin: boolean;
}

/** The capture file shape under docs/examples/. */
export interface Capture<T> {
  _contract_version: string;
  _request: Record<string, unknown>;
  _status: number;
  response: T;
}

// --- auth (contract 1.5.0 section 12) ------------------------------------------

export interface AuthUser {
  id: string;
  identifier: string;
  name: string;
  preferred_language: string;
  profile: Record<string, unknown>;
  created_at: string;
}

export interface TokenResponse {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

// --- helpers -----------------------------------------------------------------

export function cardOfType<T extends KnownCard["type"]>(
  envelope: Envelope | null | undefined,
  type: T,
): Extract<KnownCard, { type: T }> | null {
  const hit = envelope?.cards.find((c) => c.type === type);
  return hit ? (hit as Extract<KnownCard, { type: T }>) : null;
}

/** Evidence records a card cites, in the order the card lists them. Never invents one. */
export function evidenceFor(envelope: Envelope, card: CardBase): EvidenceRecord[] {
  const byId = new Map(envelope.evidence.map((e) => [e.id, e]));
  return card.evidence_ids.map((id) => byId.get(id)).filter((e): e is EvidenceRecord => !!e);
}

/** First evidence record whose variable or dataset matches, or null. */
export function evidenceMatching(envelope: Envelope | null | undefined, re: RegExp): EvidenceRecord | null {
  return envelope?.evidence.find((e) => re.test(e.variable) || re.test(e.dataset)) ?? null;
}
