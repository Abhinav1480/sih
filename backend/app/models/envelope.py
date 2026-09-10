"""ORCA `/api/query` response envelope.

The authoritative human-readable specification is `docs/API_CONTRACT.md`.
This module is the machine-readable half of the same contract.

Every shape in this file is consumed by the frontend. Changing a field name,
removing a field, or narrowing an enum is a **breaking change**: bump
`CONTRACT_VERSION`, note it in `docs/API_CONTRACT.md`, and comment on the
frontend issue before implementing it. Adding an optional field is not.
"""

from datetime import datetime
from enum import Enum
from typing import Annotated, Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field

from app.models.schemas import (
    ComparisonMetric,
    DataFreshness,
    EvidenceRecord,
    LocationContext,
    MapLayerFeature,
    PotentialFishingZone,
    ProviderTier,
    QueryIntent,
    RiskCategory,
    RiskFactor,
    RouteWaypoint,
    TemporalContext,
    TimeSeriesPoint,
)

CONTRACT_VERSION = "1.1.0"

__all__ = [
    "CONTRACT_VERSION",
    "Verdict",
    "AlertSeverity",
    "AlertType",
    "ProviderTier",
    "Answer",
    "RiskBlock",
    "Card",
    "RiskSummaryCard",
    "PfzRankingCard",
    "RoutePlanCard",
    "ComparisonTableCard",
    "TimeseriesChartCard",
    "GeofenceWarningCard",
    "AdvisoryTextCard",
    "LayerDescriptor",
    "AlertRecord",
    "TraceEvent",
    "EnvelopeMeta",
    "QueryEnvelope",
]


# --------------------------------------------------------------------------
# Enumerations
# --------------------------------------------------------------------------

class Verdict(str, Enum):
    """Operational call. Derived deterministically from the risk band and
    regulatory state — never authored by a language model."""

    GO = "GO"
    CAUTION = "CAUTION"
    NO_GO = "NO_GO"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class AlertSeverity(str, Enum):
    INFO = "INFO"
    CAUTION = "CAUTION"
    WARNING = "WARNING"
    SEVERE = "SEVERE"


class AlertType(str, Enum):
    WEATHER = "weather"
    WAVE = "wave"
    LIGHTNING = "lightning"
    CYCLONE = "cyclone"
    GEOFENCE = "geofence"


# --------------------------------------------------------------------------
# Answer & risk
# --------------------------------------------------------------------------

class Answer(BaseModel):
    headline: str = Field(description="One line, safe to render on its own.")
    verdict: Verdict
    narrative: str = Field(description="Full prose answer in the query language.")
    confidence: int = Field(ge=0, le=100)


class RiskBlock(BaseModel):
    """Output of the deterministic risk engine.

    `factors[].points_added` sums exactly to `score`. This is asserted by
    `backend/tests/test_risk_engine.py` and the frontend may rely on it.
    """

    score: int = Field(ge=0, le=100)
    band: RiskCategory
    factors: List[RiskFactor] = []
    triggered_rules: List[str] = []
    missing_inputs: List[str] = []
    confidence: int = Field(ge=0, le=100)
    data_quality: str


# --------------------------------------------------------------------------
# Cards — discriminated union on `type`
# --------------------------------------------------------------------------

class _CardBase(BaseModel):
    id: str
    title: str
    evidence_ids: List[str] = Field(
        default=[],
        description="Ids of `evidence[]` records backing this card. Empty means "
                    "no provenance record exists yet — never fabricate one.",
    )


class RiskSummaryCard(_CardBase):
    type: Literal["risk_summary"] = "risk_summary"
    score: int = Field(ge=0, le=100)
    band: RiskCategory
    verdict: Verdict
    factors: List[RiskFactor] = []
    triggered_rules: List[str] = []


class PfzRankingCard(_CardBase):
    type: Literal["pfz_ranking"] = "pfz_ranking"
    zones: List[PotentialFishingZone] = []
    rejected_reasons: List[str] = []


class RoutePlanCard(_CardBase):
    type: Literal["route_plan"] = "route_plan"
    origin: LocationContext
    destination: LocationContext
    total_distance_km: float
    estimated_transit_hours: float
    waypoints: List[RouteWaypoint] = []
    crosses_protected_waters: bool = False
    protected_areas_intersected: List[str] = []
    overall_route_risk: RiskCategory = RiskCategory.LOW
    recommended_action: str


class ComparisonTableCard(_CardBase):
    type: Literal["comparison_table"] = "comparison_table"
    location_a: LocationContext
    location_b: LocationContext
    metrics: List[ComparisonMetric] = []
    verdict_text: str


class TimeseriesChartCard(_CardBase):
    type: Literal["timeseries_chart"] = "timeseries_chart"
    period_description: str
    points: List[TimeSeriesPoint] = []
    significant_change_detected: bool = False
    change_reasons: List[str] = []


class GeofenceWarningCard(_CardBase):
    type: Literal["geofence_warning"] = "geofence_warning"
    severity: AlertSeverity
    zone_name: str
    authority: Optional[str] = None
    restriction_level: Optional[str] = None
    distance_km: Optional[float] = None
    bearing_deg: Optional[float] = None
    detail: str


class AdvisoryTextCard(_CardBase):
    type: Literal["advisory_text"] = "advisory_text"
    body: str


Card = Annotated[
    Union[
        RiskSummaryCard,
        PfzRankingCard,
        RoutePlanCard,
        ComparisonTableCard,
        TimeseriesChartCard,
        GeofenceWarningCard,
        AdvisoryTextCard,
    ],
    Field(discriminator="type"),
]


# --------------------------------------------------------------------------
# Layers, alerts, trace, meta
# --------------------------------------------------------------------------

class LayerDescriptor(BaseModel):
    """A map layer the frontend can render directly.

    `kind="geojson"` carries inline `features`. `kind="wms"` carries a `url`
    plus `wms_params` and no features — this is how ISRO Bhuvan layers reach
    the map in BE-02.
    """

    id: str
    name: str
    kind: Literal["geojson", "wms"] = "geojson"
    geometry_type: Optional[Literal["point", "polygon", "linestring"]] = None
    features: List[MapLayerFeature] = []
    url: Optional[str] = None
    wms_params: Dict[str, str] = {}
    visible_by_default: bool = True
    color: str = "#00f5d4"
    legend_title: str = ""
    legend_unit: str = ""
    attribution: Optional[str] = None
    provider_tier: ProviderTier = ProviderTier.FALLBACK


class AlertRecord(BaseModel):
    id: str
    type: AlertType
    severity: AlertSeverity
    title: str
    description: str
    issued_at: datetime
    valid_until: Optional[datetime] = None
    recommended_action: Optional[str] = None
    evidence_ids: List[str] = []
    source: str
    provider_tier: ProviderTier = ProviderTier.FALLBACK


TraceStage = Literal[
    "planner",
    "agent_start",
    "agent_message",
    "agent_result",
    "replan",
    "correlation",
    "risk",
    "synthesis",
    "done",
    "error",
]


class TraceEvent(BaseModel):
    """One step of agent reasoning.

    The same event shapes are emitted verbatim by the SSE stream in BE-04, so
    a client can render the live trace and the final envelope with one code path.
    """

    seq: int
    stage: TraceStage
    agent: str
    action: str
    tool: Optional[str] = None
    duration_ms: int = 0
    detail: Optional[str] = None
    status: str = "COMPLETED"
    timestamp: datetime


class EnvelopeMeta(BaseModel):
    mode: str = Field(description="ORCA_MODE at the time of the request: DEMO or LIVE.")
    query_text: str = Field(default="", description="The query this envelope answers, echoed verbatim.")
    contract_version: str = CONTRACT_VERSION
    generated_at: datetime
    location: LocationContext
    temporal: TemporalContext
    limitations: List[str] = []
    degraded: bool = Field(
        default=False,
        description="True when any value in this response came from a fallback "
                    "source or synthetic model rather than its intended provider.",
    )
    notes: List[str] = []


class QueryEnvelope(BaseModel):
    request_id: str
    session_id: str
    intent: QueryIntent
    language: str = Field(description="ISO 639-1 code detected from the query.")
    answer: Answer
    risk: Optional[RiskBlock] = None
    cards: List[Card] = []
    layers: List[LayerDescriptor] = []
    evidence: List[EvidenceRecord] = []
    alerts: List[AlertRecord] = []
    trace: List[TraceEvent] = []
    meta: EnvelopeMeta
