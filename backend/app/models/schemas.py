from typing import List, Dict, Any, Optional
from enum import Enum
from pydantic import BaseModel, Field
from datetime import datetime

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

class ProviderTier(str, Enum):
    """Provenance tier of the source that produced a value.

    ISRO      — an Indian Space Research Organisation / NRSC feed
                (Bhuvan, MOSDAC, Bhoonidhi, Oceansat, SCATSAT, SARAL, INSAT).
    NATIONAL  — another Indian national authority (INCOIS, IMD, MoEFCC).
    FALLBACK  — anything else, including foreign models (Open-Meteo,
                Copernicus) and ORCA's own deterministic demo model.

    A synthetic value is never promoted above FALLBACK; its syntheticity is
    carried separately by DataFreshness.DEMO.
    """
    ISRO = "ISRO"
    NATIONAL = "NATIONAL"
    FALLBACK = "FALLBACK"

class QueryIntent(str, Enum):
    MARINE_SAFETY = "marine_safety"
    FISHING_ZONES = "fishing_zones"
    OCEAN_CONDITIONS = "ocean_conditions"
    WEATHER_FORECAST = "weather_forecast"
    ROUTE_ANALYSIS = "route_analysis"
    REGIONAL_COMPARISON = "regional_comparison"
    HISTORICAL_TREND = "historical_trend"
    GEOFENCE_RESTRICTION = "geofence_restriction"
    EXPLAINABILITY = "explainability"
    MULTILINGUAL_TRANSLATION = "multilingual_translation"
    GENERAL_EXPLORATION = "general_exploration"

class Coordinates(BaseModel):
    latitude: float
    longitude: float

class LocationContext(BaseModel):
    name: str = "Unknown Coast"
    latitude: float = 17.6868  # Default Visakhapatnam
    longitude: float = 83.2185
    radius_km: float = 40.0
    nearest_port: Optional[str] = "Visakhapatnam Port"
    state: Optional[str] = "Andhra Pradesh"
    maritime_zone: Optional[str] = "Bay of Bengal"

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
    timestamp: datetime = Field(default_factory=datetime.utcnow)

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
    source: str = "INCOIS OSF / Open-Meteo Marine"
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
    source: str = "IMD Coastal / Open-Meteo"
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
    source: str = "ORCA Deterministic Demo Model"
    status: DataFreshness = DataFreshness.DEMO

class RouteWaypoint(BaseModel):
    name: str
    latitude: float
    longitude: float
    segment_risk: RiskCategory = RiskCategory.LOW
    wave_height_m: float
    wind_knots: float
    inside_restricted_zone: bool = False
    restriction_detail: Optional[str] = None

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
    confidence_percentage: int = 92
    data_quality_label: str = "Validated Observations & Forecasts"

class EvidenceRecord(BaseModel):
    id: str
    provider: str
    provider_tier: ProviderTier = ProviderTier.FALLBACK
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
    result_type: str  # "marine_safety", "fishing_zones", "route_analysis", "regional_comparison", "historical_trend", "general"
    components_to_render: List[str]  # e.g., ["risk_card", "map", "conditions_grid", "evidence_drawer"]
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
    risk_assessment: Optional[DeterministicRiskResult] = None
    ocean_conditions: Optional[OceanObservation] = None
    weather_conditions: Optional[WeatherObservation] = None
    fishing_zones: Optional[List[PotentialFishingZone]] = None
    route_analysis: Optional[VesselRouteAnalysis] = None
    comparison_data: Optional[RegionalComparisonData] = None
    historical_trend: Optional[HistoricalTrendData] = None
    visualization_plan: VisualizationPlan
    map_layers: List[MapLayerData]
    evidence: List[EvidenceRecord]
    agent_activity: List[AgentStepRecord]
    limitations: List[str]
    mode: str = "DEMO"
