from typing import List, Dict, Any, Optional
from enum import Enum
from pydantic import BaseModel, Field
from datetime import datetime, timezone


class RiskCategory(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    SEVERE = "SEVERE"


class DataFreshness(str, Enum):
    LIVE = "LIVE"
    FORECAST = "FORECAST"
    CACHED = "CACHED"
    HISTORICAL = "HISTORICAL"
    DEMO = "DEMO"
    UNAVAILABLE = "UNAVAILABLE"


class DataQuality(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LIMITED = "LIMITED"
    DEMO = "DEMO — Not from live sources"


class QueryIntent(str, Enum):
    MARINE_SAFETY = "marine_safety"
    FISHING_ZONES = "fishing_zones"
    OCEAN_CONDITIONS = "ocean_conditions"
    WEATHER_FORECAST = "weather_forecast"
    ROUTE_ANALYSIS = "route_analysis"
    ROUTE_FOLLOW_UP = "route_follow_up"
    ROUTE_COMPARISON = "route_comparison"
    REGIONAL_COMPARISON = "regional_comparison"
    SPATIAL_WHAT_IF = "spatial_what_if"
    HISTORICAL_TREND = "historical_trend"
    GEOFENCE_RESTRICTION = "geofence_restriction"
    EXPLAINABILITY = "explainability"
    MULTILINGUAL_TRANSLATION = "multilingual_translation"
    GENERAL_EXPLORATION = "general_exploration"
    NEEDS_CLARIFICATION = "needs_clarification"


class Coordinates(BaseModel):
    latitude: float
    longitude: float


class LocationContext(BaseModel):
    name: str = "Unknown Location"
    latitude: float = 0.0  # No hardcoded Visakhapatnam default
    longitude: float = 0.0
    radius_km: float = 40.0
    nearest_port: Optional[str] = None
    state: Optional[str] = None
    maritime_zone: Optional[str] = None


class TemporalContext(BaseModel):
    label: str = "Now"
    start_time: datetime
    end_time: datetime
    is_forecast: bool = True
    is_historical: bool = False
    offset_hours: int = 0


class ConstraintModel(BaseModel):
    max_wave_height_m: Optional[float] = None
    max_wind_speed_knots: Optional[float] = None
    avoid_protected_areas: bool = True
    min_chlorophyll_mg_m3: Optional[float] = None
    target_sst_min: Optional[float] = None
    target_sst_max: Optional[float] = None


class AgentStepRecord(BaseModel):
    agent: str
    action: str
    tool: Optional[str] = None
    status: str = "COMPLETED"
    duration_ms: int = 120
    details: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OceanObservation(BaseModel):
    significant_wave_height_m: float
    swell_height_m: float
    swell_period_sec: float
    swell_direction_deg: float
    sea_surface_temp_c: float
    ocean_current_speed_m_s: float
    ocean_current_direction_deg: float
    sea_state: str = "Moderate"
    status: DataFreshness = DataFreshness.DEMO
    source: str = "Demo Provider"
    timestamp: datetime


class WeatherObservation(BaseModel):
    wind_speed_knots: float
    wind_direction_deg: float
    wind_gust_knots: float
    air_temp_c: float
    precipitation_mm: float
    visibility_km: float
    storm_warning: Optional[str] = None
    alert_level: str = "None"  # None, Yellow, Orange, Red
    status: DataFreshness = DataFreshness.DEMO
    source: str = "Demo Provider"
    timestamp: datetime


class PotentialFishingZone(BaseModel):
    zone_id: str
    name: str
    latitude: float
    longitude: float
    distance_km: float
    bearing_deg: float
    sst_c: float
    chlorophyll_mg_m3: float
    depth_m: float
    suitability_score: float  # 0 to 100
    rank: int
    within_mpa: bool = False
    mpa_name: Optional[str] = None
    wave_height_m: float
    wind_speed_knots: float
    advisory_status: str = "Favorable"
    valid_until: datetime


class RouteWaypoint(BaseModel):
    name: str
    latitude: float
    longitude: float
    segment_risk: RiskCategory = RiskCategory.LOW
    wave_height_m: float
    wind_knots: float
    inside_restricted_zone: bool = False
    restriction_detail: Optional[str] = None


class RouteCandidate(BaseModel):
    id: str  # e.g., "recommended" | "alternative" | "direct"
    name: str
    distance_km: float
    estimated_transit_hours: float
    marine_risk: RiskCategory = RiskCategory.LOW
    risk_score: int = 15
    wave_exposure_m: float = 1.5
    wind_exposure_knots: float = 14.0
    protected_area_exposure: str = "None (Cleared)"
    crosses_protected_waters: bool = False
    protected_areas: List[str] = []
    trade_offs: str = ""
    is_recommended: bool = True
    is_selected: bool = False
    waypoints: List[RouteWaypoint] = []
    coordinates: List[List[float]] = []  # [[lon, lat], ...]


class RouteComparisonMetric(BaseModel):
    metric_name: str
    unit: str
    recommended_value: str
    alternative_value: str
    difference: str
    advantage: str  # e.g. "Recommended (Clears Sanctuary)", "Alternative (-13 km)"


class RouteComparisonData(BaseModel):
    recommended_route_name: str
    alternative_route_name: str
    selected_route_name: str
    trade_off_analysis: str
    what_changes_summary: str
    metrics: List[RouteComparisonMetric]


class VesselRouteAnalysis(BaseModel):
    route_id: str
    origin: LocationContext
    destination: LocationContext
    total_distance_km: float
    estimated_transit_hours: float
    waypoints: List[RouteWaypoint]
    crosses_protected_waters: bool = False
    protected_areas_intersected: List[str] = []
    overall_route_risk: RiskCategory = RiskCategory.LOW
    recommended_action: str
    alternative_suggested: bool = False
    alternative_route_notes: Optional[str] = None
    candidate_routes: List[RouteCandidate] = []
    selected_route_id: Optional[str] = None
    route_comparison: Optional[RouteComparisonData] = None


class RiskFactor(BaseModel):
    name: str
    value: str
    points_added: int
    description: str


class DeterministicRiskResult(BaseModel):
    overall_score: int  # 0 to 100
    category: RiskCategory
    contributing_factors: List[RiskFactor]
    triggered_rules: List[str]
    missing_inputs: List[str] = []
    data_quality: DataQuality = DataQuality.DEMO
    data_quality_notes: str = "Based on synthetic demo data. Not from live authoritative sources."
    confidence_percentage: Optional[int] = None
    data_quality_label: Optional[str] = None


class EvidenceRecord(BaseModel):
    id: str
    provider: str
    dataset: str
    variable: str
    value: str
    unit: str
    location: str
    coordinates: Optional[str] = None
    observation_or_forecast_time: str
    retrieval_time: str
    status: DataFreshness
    reliability_notes: Optional[str] = None


class MapLayerFeature(BaseModel):
    type: str = "Feature"
    geometry: Dict[str, Any]
    properties: Dict[str, Any]


class MapLayerData(BaseModel):
    layer_id: str
    name: str
    layer_type: str  # "heatmap", "point", "polygon", "linestring", "choropleth"
    features: List[MapLayerFeature]
    visible_by_default: bool = True
    color: str = "#00f5d4"
    legend_title: str = "Values"
    legend_unit: str = ""


class VisualizationPlan(BaseModel):
    result_type: str  # "marine_safety", "fishing_zones", "route_analysis", "regional_comparison", "historical_trend", "clarification", "general"
    components_to_render: List[str]
    center_lat: float
    center_lon: float
    default_zoom: int = 9
    active_layers: List[str]


class ComparisonMetric(BaseModel):
    metric_name: str
    unit: str
    location_a_value: float
    location_b_value: float
    difference: float
    favorability: str  # "Location A Favorable", "Location B Favorable", "Similar"


class RegionalComparisonData(BaseModel):
    location_a: LocationContext
    location_b: LocationContext
    metrics: List[ComparisonMetric]
    overall_verdict: str


class TimeSeriesPoint(BaseModel):
    timestamp: str
    wave_height_m: float
    wind_knots: float
    sst_c: float
    risk_score: int


class HistoricalTrendData(BaseModel):
    location_name: str
    period_description: str
    trend_summary: str
    points: List[TimeSeriesPoint]
    significant_change_detected: bool = False
    change_reasons: List[str] = []


class RankedConditionChange(BaseModel):
    rank: int
    metric_name: str
    unit: str
    location_a_value: float
    location_b_value: float
    absolute_difference: float
    percentage_difference: Optional[float] = None
    change_direction: str  # e.g. "Increased (+0.3m, Rougher)", "Subsided (-0.2m, Calmer)", "Strengthened"
    operational_impact: str  # "High Operational Impact", "Moderate Change", "Minimal/Negligible"
    explanation: str  # Evidence-aware explanation
    computed_fact: Optional[str] = None
    data_supported_interpretation: Optional[str] = None
    physical_hypothesis: Optional[str] = None


class SpatialWhatIfAnalysisData(BaseModel):
    origin: LocationContext
    displaced: LocationContext
    distance_km: float
    direction: str
    bearing_deg: float
    temporal_label: str
    ranked_changes: List[RankedConditionChange]
    top_changed_condition: str
    physical_reasoning: str
    operational_significance: str
    metrics_summary: List[ComparisonMetric]
    computed_fact: Optional[str] = None
    data_supported_interpretation: Optional[str] = None
    physical_hypothesis: Optional[str] = None


class UserQueryRequest(BaseModel):
    query: str
    conversation_id: Optional[str] = None
    preferred_language: Optional[str] = "en"  # "en", "te", "hi", "ta", "kn", "ml", "mr", "bn", "gu", "or"
    user_location: Optional[Coordinates] = None


class OrcaAnalysisResponse(BaseModel):
    query_id: str
    conversation_id: str
    query_text: str
    detected_language: str
    intent: QueryIntent
    location: LocationContext
    temporal: TemporalContext
    executive_summary: str
    recommendation: str
    needs_clarification: bool = False
    clarification_question: Optional[str] = None
    missing_information: List[str] = []
    risk_assessment: Optional[DeterministicRiskResult] = None
    ocean_conditions: Optional[OceanObservation] = None
    weather_conditions: Optional[WeatherObservation] = None
    fishing_zones: Optional[List[PotentialFishingZone]] = None
    route_analysis: Optional[VesselRouteAnalysis] = None
    route_comparison: Optional[RouteComparisonData] = None
    comparison_data: Optional[RegionalComparisonData] = None
    historical_trend: Optional[HistoricalTrendData] = None
    spatial_what_if: Optional[SpatialWhatIfAnalysisData] = None
    visualization_plan: VisualizationPlan
    map_layers: List[MapLayerData]
    evidence: List[EvidenceRecord]
    agent_activity: List[AgentStepRecord]
    limitations: List[str]
    mode: str = "DEMO"
