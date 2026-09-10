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


class SatelliteReading(BaseModel):
    """One variable sampled from a real, clipped ISRO granule on disk.

    Everything here is read out of the granule or measured against it. The
    representativeness fields are not decoration: a nadir altimeter's nearest
    pass can be hundreds of kilometres from the query point and days from the
    requested time, and a value like that must arrive carrying how far and how
    old it is, never as though it were measured on the spot.
    """

    variable: str
    value: float
    unit: str
    source: str
    status: DataFreshness = DataFreshness.CACHED
    timestamp: datetime

    # Which file this came out of, and what produced it.
    granule: str
    satellite: str
    sensor: str
    processing_level: str

    # Per-variable attribution from the granule's own metadata. A SARAL IGDR
    # carries ECMWF model wind and Meteo-France wave period beside the
    # altimeter's own swh; `variable_institution` is what stops one of those
    # being published as an ISRO measurement.
    variable_source: str = ""
    variable_institution: str = ""

    # How representative the value is of the point and time asked about.
    pixels_used: int = 0
    nearest_pixel_km: float = 0.0
    days_from_request: float = 0.0
    quality_filter: Optional[str] = None
    note: str = ""


class FieldProvenance(BaseModel):
    """Who produced ONE field of an observation, when a single source did not.

    An observation usually comes from one provider and `source` on the
    observation says so. A granule-backed one does not: wave height comes from a
    SARAL altimeter pass and sea surface temperature from an INSAT-3DR scene, in
    different files acquired at different times and different distances away.
    Stamping the observation's source on both would attribute the SST to SARAL,
    which never measured it -- the mislabelling the whole provenance path exists
    to stop. Where this is populated it wins over the observation's own source.
    """

    source: str
    status: DataFreshness
    observed_at: Optional[datetime] = None
    granule: Optional[str] = None
    distance_km: Optional[float] = None
    days_from_request: Optional[float] = None
    institution: str = ""
    note: str = ""


class OceanObservation(BaseModel):
    significant_wave_height_m: float
    # Optional for the same reason as SST below: a provider that does not carry
    # swell must return nothing rather than a plausible constant. A satellite
    # altimeter measures significant wave height and does not decompose it into
    # swell, so an ISRO-tier observation legitimately has no swell at all. The
    # risk engine renormalises over the factors it did observe and reports the
    # absence in `missing_inputs`.
    swell_height_m: Optional[float] = None
    swell_period_sec: Optional[float] = None
    swell_direction_deg: Optional[float] = None
    # Optional because a provider that does not carry these variables must
    # return nothing rather than a plausible-looking constant. A missing
    # value is renderable ("--"); an invented one is not detectable.
    sea_surface_temp_c: Optional[float] = None
    ocean_current_speed_m_s: Optional[float] = None
    ocean_current_direction_deg: Optional[float] = None
    sea_state: str = "Moderate"
    status: DataFreshness = DataFreshness.DEMO
    source: str = "Demo Provider"
    timestamp: datetime
    # Per-field attribution, keyed by field name. Empty for a single-source
    # provider; populated where different granules produced different fields.
    field_provenance: Dict[str, FieldProvenance] = Field(default_factory=dict)


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

class TideObservation(BaseModel):
    """Tidal state at a coastal position.

    Every field is optional because the honest answer is frequently "we do not
    have this". Tide is not derivable from the wave and wind feeds ORCA already
    carries; it needs harmonic constituents for the port, which is a separate
    source. When `status` is UNAVAILABLE, `unavailable_reason` says what is
    missing and the UI must render the gap rather than a blank that reads as calm.
    """
    height_m: Optional[float] = None
    state: Optional[str] = None            # Rising | Falling | High Water | Low Water
    next_high_water: Optional[datetime] = None
    next_low_water: Optional[datetime] = None
    range_m: Optional[float] = None
    status: DataFreshness = DataFreshness.UNAVAILABLE
    source: str = "No tide provider configured"
    unavailable_reason: Optional[str] = None
    timestamp: datetime


class HazardObservation(BaseModel):
    """Lightning strikes and cyclone tracks near a position.

    Same contract as TideObservation: an absent capability is reported, never
    approximated from the wind-derived alert level.
    """
    lightning_strike_count: Optional[int] = None
    lightning_nearest_km: Optional[float] = None
    cyclone_present: Optional[bool] = None
    cyclone_name: Optional[str] = None
    cyclone_distance_km: Optional[float] = None
    cyclone_category: Optional[str] = None
    status: DataFreshness = DataFreshness.UNAVAILABLE
    source: str = "No hazard provider configured"
    unavailable_reason: Optional[str] = None
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
    # None when the observation is missing; never a stand-in number.
    wave_height_m: Optional[float] = None
    wind_knots: Optional[float] = None
    inside_restricted_zone: bool = False
    restriction_detail: Optional[str] = None


class RouteCandidate(BaseModel):
    id: str  # e.g., "recommended" | "alternative" | "direct"
    name: str
    distance_km: float
    estimated_transit_hours: float
    # Set by the deterministic risk engine, with the factor breakdown that
    # produced the score. Nothing here is assigned by rule in an agent.
    marine_risk: RiskCategory = RiskCategory.LOW
    risk_score: int = 0
    risk_factors: List["RiskFactor"] = []
    wave_exposure_m: Optional[float] = None
    wind_exposure_knots: Optional[float] = None
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


RouteCandidate.model_rebuild()


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
    """One point that was actually observed and actually scored.

    `source` and `status` are per point because a series can legitimately span
    providers: an ISRO granule covers some of the window and the labelled
    synthetic model covers the rest. Rendering both as one line without saying
    which is which would hide the difference that matters most.
    """

    timestamp: str
    wave_height_m: float
    wind_knots: float
    sst_c: Optional[float] = None
    risk_score: int
    offset_hours: int = 0
    source: str = ""
    status: DataFreshness = DataFreshness.DEMO


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
