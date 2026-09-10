"""Map the internal analysis result onto the public `/api/query` envelope.

The orchestrator keeps producing `OrcaAnalysisResponse`, which is ORCA's
internal working shape. This module is the single place where that becomes the
contract the frontend consumes, so the two can move independently: agents can
gain fields without breaking the frontend, and the contract can be reshaped
without rewriting every agent.

Nothing here invents a value. Every number, label and source is copied from
what the agents produced; where a payload is absent the corresponding card is
simply not emitted.
"""

from datetime import datetime
from typing import Any, List, Optional

from app.models.envelope import (
    AdvisoryTextCard,
    AlertRecord,
    AlertSeverity,
    AlertType,
    Answer,
    Card,
    ComparisonTableCard,
    CONTRACT_VERSION,
    EnvelopeMeta,
    GeofenceWarningCard,
    LayerDescriptor,
    PfzRankingCard,
    QueryEnvelope,
    RiskBlock,
    RiskSummaryCard,
    RoutePlanCard,
    TimeseriesChartCard,
    TraceEvent,
    Verdict,
)
from app.models.schemas import (
    DataFreshness,
    OrcaAnalysisResponse,
    ProviderTier,
    QueryIntent,
    RiskCategory,
)
from app.providers.provenance import classify_tier, is_synthetic
from app.providers.registry import registry

# Risk band -> operational call. Deterministic: the language model never
# authors a verdict, it only phrases the narrative around one.
_BAND_VERDICT = {
    RiskCategory.LOW: Verdict.GO,
    RiskCategory.MODERATE: Verdict.CAUTION,
    RiskCategory.HIGH: Verdict.NO_GO,
    RiskCategory.SEVERE: Verdict.NO_GO,
}

_BAND_ALERT_SEVERITY = {
    RiskCategory.LOW: AlertSeverity.INFO,
    RiskCategory.MODERATE: AlertSeverity.CAUTION,
    RiskCategory.HIGH: AlertSeverity.WARNING,
    RiskCategory.SEVERE: AlertSeverity.SEVERE,
}

_MPA_FACTOR_NAME = "Marine Sanctuary Geofence Restriction"


def _is_restricted(analysis: OrcaAnalysisResponse) -> bool:
    risk = analysis.risk_assessment
    if not risk:
        return False
    return any(f.name == _MPA_FACTOR_NAME for f in risk.contributing_factors)


def _verdict(analysis: OrcaAnalysisResponse) -> Verdict:
    if _is_restricted(analysis):
        return Verdict.NO_GO
    risk = analysis.risk_assessment
    if not risk:
        return Verdict.NOT_APPLICABLE
    return _BAND_VERDICT[risk.category]


def _headline(analysis: OrcaAnalysisResponse) -> str:
    """A one-line answer that stands on its own in a notification or SMS."""
    loc = analysis.location.name
    when = analysis.temporal.label
    risk = analysis.risk_assessment
    intent = analysis.intent

    if intent == QueryIntent.FISHING_ZONES and analysis.fishing_zones:
        top = analysis.fishing_zones[0]
        return f"{len(analysis.fishing_zones)} fishing zones ranked near {loc}; best is {top.name} at {top.distance_km:.0f} km"
    if intent == QueryIntent.ROUTE_ANALYSIS and analysis.route_analysis:
        route = analysis.route_analysis
        return (
            f"{route.origin.name} to {route.destination.name}: {route.total_distance_km:.0f} km, "
            f"{route.estimated_transit_hours:.1f} h, {route.overall_route_risk.value} risk"
        )
    if intent == QueryIntent.REGIONAL_COMPARISON and analysis.comparison_data:
        cmp_data = analysis.comparison_data
        return f"{cmp_data.location_a.name} vs {cmp_data.location_b.name} for {when}"
    if intent == QueryIntent.HISTORICAL_TREND and analysis.historical_trend:
        return f"{loc}: {analysis.historical_trend.period_description}"
    if risk:
        return f"{risk.category.value} risk at {loc} for {when} (score {risk.overall_score}/100)"
    return f"Marine conditions at {loc} for {when}"


def _risk_block(analysis: OrcaAnalysisResponse) -> Optional[RiskBlock]:
    risk = analysis.risk_assessment
    if not risk:
        return None
    return RiskBlock(
        score=risk.overall_score,
        band=risk.category,
        factors=risk.contributing_factors,
        triggered_rules=risk.triggered_rules,
        missing_inputs=risk.missing_inputs,
        confidence=risk.confidence_percentage,
        data_quality=risk.data_quality_label,
    )


def _evidence_ids(analysis: OrcaAnalysisResponse, *variable_fragments: str) -> List[str]:
    """Ids of evidence records whose variable name matches any fragment.

    Returns an empty list when nothing matches rather than pointing a card at
    unrelated evidence: an empty `evidence_ids` honestly says "no provenance
    record exists for this yet".
    """
    if not variable_fragments:
        return [e.id for e in analysis.evidence]
    lowered = [f.lower() for f in variable_fragments]
    return [
        e.id for e in analysis.evidence
        if any(f in e.variable.lower() for f in lowered)
    ]


def _build_cards(analysis: OrcaAnalysisResponse) -> List[Card]:
    cards: List[Card] = []
    risk = analysis.risk_assessment
    verdict = _verdict(analysis)

    if risk:
        cards.append(RiskSummaryCard(
            id="card_risk",
            title=f"Marine Risk Assessment - {analysis.location.name}",
            evidence_ids=_evidence_ids(analysis),
            score=risk.overall_score,
            band=risk.category,
            verdict=verdict,
            factors=risk.contributing_factors,
            triggered_rules=risk.triggered_rules,
        ))

    if analysis.fishing_zones:
        cards.append(PfzRankingCard(
            id="card_pfz",
            title=f"Potential Fishing Zones within {analysis.location.radius_km:.0f} km",
            evidence_ids=_evidence_ids(analysis, "temperature", "wave"),
            zones=analysis.fishing_zones,
            rejected_reasons=[
                f"{z.name}: inside {z.mpa_name or 'protected area'}"
                for z in analysis.fishing_zones if z.within_mpa
            ],
        ))

    if analysis.route_analysis:
        route = analysis.route_analysis
        cards.append(RoutePlanCard(
            id="card_route",
            title=f"Passage: {route.origin.name} to {route.destination.name}",
            evidence_ids=_evidence_ids(analysis, "wave", "wind"),
            origin=route.origin,
            destination=route.destination,
            total_distance_km=route.total_distance_km,
            estimated_transit_hours=route.estimated_transit_hours,
            waypoints=route.waypoints,
            crosses_protected_waters=route.crosses_protected_waters,
            protected_areas_intersected=route.protected_areas_intersected,
            overall_route_risk=route.overall_route_risk,
            recommended_action=route.recommended_action,
        ))

    if analysis.comparison_data:
        cmp_data = analysis.comparison_data
        cards.append(ComparisonTableCard(
            id="card_comparison",
            title=f"{cmp_data.location_a.name} vs {cmp_data.location_b.name}",
            evidence_ids=_evidence_ids(analysis),
            location_a=cmp_data.location_a,
            location_b=cmp_data.location_b,
            metrics=cmp_data.metrics,
            verdict_text=cmp_data.overall_verdict,
        ))

    if analysis.historical_trend:
        trend = analysis.historical_trend
        cards.append(TimeseriesChartCard(
            id="card_trend",
            title=f"{trend.location_name}: {trend.period_description}",
            evidence_ids=_evidence_ids(analysis),
            period_description=trend.period_description,
            points=trend.points,
            significant_change_detected=trend.significant_change_detected,
            change_reasons=trend.change_reasons,
        ))

    cards.extend(_geofence_cards(analysis))

    cards.append(AdvisoryTextCard(
        id="card_advisory",
        title="Advisory",
        evidence_ids=_evidence_ids(analysis),
        body=analysis.recommendation,
    ))

    return cards


def _geofence_cards(analysis: OrcaAnalysisResponse) -> List[GeofenceWarningCard]:
    """Emit a geofence warning whenever a restriction is actually present.

    Independent of intent: a fishing-zone query that happens to rank a zone
    inside a sanctuary must still surface the restriction, because the
    consequence of missing it is a detained boat.
    """
    cards: List[GeofenceWarningCard] = []

    if _is_restricted(analysis):
        detail = next(
            (f.description for f in analysis.risk_assessment.contributing_factors
             if f.name == _MPA_FACTOR_NAME),
            "Target position lies inside a marine protected area.",
        )
        cards.append(GeofenceWarningCard(
            id="card_geofence_target",
            title="Restricted waters at target position",
            evidence_ids=[],
            severity=AlertSeverity.SEVERE,
            zone_name=detail.split(": ")[-1],
            restriction_level="Protected Area",
            detail=detail,
        ))

    for zone in (analysis.fishing_zones or []):
        if zone.within_mpa:
            cards.append(GeofenceWarningCard(
                id=f"card_geofence_{zone.zone_id}",
                title=f"{zone.name} lies inside a protected area",
                evidence_ids=[],
                severity=AlertSeverity.WARNING,
                zone_name=zone.mpa_name or "Protected Area",
                restriction_level="Protected Area",
                distance_km=zone.distance_km,
                bearing_deg=zone.bearing_deg,
                detail=f"{zone.name} is ranked {zone.rank} but falls within {zone.mpa_name or 'a protected area'}; fishing there is restricted.",
            ))

    route = analysis.route_analysis
    if route and route.crosses_protected_waters:
        cards.append(GeofenceWarningCard(
            id="card_geofence_route",
            title="Route crosses protected waters",
            evidence_ids=[],
            severity=AlertSeverity.SEVERE,
            zone_name=", ".join(route.protected_areas_intersected) or "Protected Area",
            restriction_level="Protected Area",
            detail=f"The plotted passage intersects {', '.join(route.protected_areas_intersected) or 'a protected area'}.",
        ))

    return cards


def _build_layers(analysis: OrcaAnalysisResponse) -> List[LayerDescriptor]:
    """The agents' derived geometries, plus the real ISRO WMS layers.

    ORCA's own geometries are `kind="geojson"` and tier FALLBACK: they are
    computed here, not published by an agency. The Bhuvan layers appended
    afterwards are `kind="wms"` and tier ISRO, rendered by the client directly
    against NRSC, so the tiles the user sees come from ISRO rather than from us.
    """
    layers = [
        LayerDescriptor(
            id=layer.layer_id,
            name=layer.name,
            kind="geojson",
            geometry_type=_geometry_type(layer.layer_type),
            features=layer.features,
            visible_by_default=layer.visible_by_default,
            color=layer.color,
            legend_title=layer.legend_title,
            legend_unit=layer.legend_unit,
            provider_tier=ProviderTier.FALLBACK,
        )
        for layer in analysis.map_layers
    ]
    layers.extend(registry.get_isro_layer_descriptors())
    return layers


def _geometry_type(layer_type: str) -> Optional[str]:
    return {
        "point": "point",
        "heatmap": "point",
        "polygon": "polygon",
        "choropleth": "polygon",
        "linestring": "linestring",
    }.get(layer_type)


def _build_alerts(analysis: OrcaAnalysisResponse) -> List[AlertRecord]:
    """Alerts derived from this response's own observations.

    Request-scoped only. BE-07 adds the background monitor that produces
    alerts without a request behind them.
    """
    alerts: List[AlertRecord] = []
    weather = analysis.weather_conditions
    now = datetime.utcnow()

    if weather and weather.alert_level and weather.alert_level.lower() not in ("none", ""):
        alerts.append(AlertRecord(
            id=f"alert_weather_{analysis.query_id[:8]}",
            type=AlertType.WEATHER,
            severity={
                "yellow": AlertSeverity.CAUTION,
                "orange": AlertSeverity.WARNING,
                "red": AlertSeverity.SEVERE,
            }.get(weather.alert_level.lower(), AlertSeverity.INFO),
            title=f"{weather.alert_level.upper()} coastal weather warning",
            description=weather.storm_warning or f"{weather.alert_level.upper()} alert in effect for {analysis.location.name}.",
            issued_at=weather.timestamp,
            valid_until=analysis.temporal.end_time,
            recommended_action=analysis.recommendation,
            evidence_ids=_evidence_ids(analysis, "storm warning"),
            source=weather.source,
            provider_tier=classify_tier(weather.source, weather.status),
        ))

    risk = analysis.risk_assessment
    if risk and risk.category in (RiskCategory.HIGH, RiskCategory.SEVERE):
        alerts.append(AlertRecord(
            id=f"alert_wave_{analysis.query_id[:8]}",
            type=AlertType.WAVE,
            severity=_BAND_ALERT_SEVERITY[risk.category],
            title=f"{risk.category.value} sea state at {analysis.location.name}",
            description="; ".join(risk.triggered_rules) or f"Computed marine risk {risk.overall_score}/100.",
            issued_at=now,
            valid_until=analysis.temporal.end_time,
            recommended_action=analysis.recommendation,
            evidence_ids=_evidence_ids(analysis, "wave"),
            source="ORCA Deterministic Risk Engine",
            provider_tier=ProviderTier.FALLBACK,
        ))

    for card in _geofence_cards(analysis):
        alerts.append(AlertRecord(
            id=f"alert_{card.id}",
            type=AlertType.GEOFENCE,
            severity=card.severity,
            title=card.title,
            description=card.detail,
            issued_at=now,
            valid_until=analysis.temporal.end_time,
            recommended_action="Verify vessel position against the sanctuary boundary before proceeding.",
            evidence_ids=[],
            source="ORCA Geofence Engine / MoEFCC protected area geometry",
            provider_tier=ProviderTier.FALLBACK,
        ))

    return alerts


def _build_trace(analysis: OrcaAnalysisResponse) -> List[TraceEvent]:
    """Flatten agent activity into the same event shapes BE-04 will stream."""
    events: List[TraceEvent] = []
    for seq, step in enumerate(analysis.agent_activity, start=1):
        events.append(TraceEvent(
            seq=seq,
            stage="planner" if seq == 1 else "agent_result",
            agent=step.agent,
            action=step.action,
            tool=step.tool,
            duration_ms=step.duration_ms,
            detail=step.details,
            status=step.status,
            timestamp=step.timestamp,
        ))
    events.append(TraceEvent(
        seq=len(events) + 1,
        stage="done",
        agent="Orchestrator",
        action="Response envelope assembled",
        duration_ms=0,
        detail=f"{len(analysis.evidence)} evidence records, contract v{CONTRACT_VERSION}",
        timestamp=datetime.utcnow(),
    ))
    return events


def _degraded(analysis: OrcaAnalysisResponse) -> bool:
    """True when any value came from a fallback or synthetic source.

    Drives the honest "not an ISRO value" banner in the UI. Absent evidence
    counts as degraded: a response with nothing to cite is not authoritative.
    """
    if not analysis.evidence:
        return True
    return any(
        e.provider_tier == ProviderTier.FALLBACK
        or e.status in (DataFreshness.DEMO, DataFreshness.UNAVAILABLE)
        or is_synthetic(e.provider, e.status)
        for e in analysis.evidence
    )


def build_envelope(analysis: OrcaAnalysisResponse) -> QueryEnvelope:
    """Convert an internal analysis result into the public API envelope."""
    risk = analysis.risk_assessment
    notes: List[str] = []
    if _degraded(analysis):
        notes.append(
            "One or more values came from a fallback or synthetic source. "
            "Check each evidence record's provider and tier before relying on it."
        )
    if risk and risk.missing_inputs:
        notes.append(
            f"Risk score renormalised over available inputs; missing: {', '.join(risk.missing_inputs)}."
        )

    return QueryEnvelope(
        request_id=analysis.query_id,
        session_id=analysis.conversation_id,
        intent=analysis.intent,
        language=analysis.detected_language,
        answer=Answer(
            headline=_headline(analysis),
            verdict=_verdict(analysis),
            narrative=analysis.executive_summary,
            confidence=risk.confidence_percentage if risk else 50,
        ),
        risk=_risk_block(analysis),
        cards=_build_cards(analysis),
        layers=_build_layers(analysis),
        evidence=analysis.evidence,
        alerts=_build_alerts(analysis),
        trace=_build_trace(analysis),
        meta=EnvelopeMeta(
            mode=analysis.mode,
            query_text=analysis.query_text,
            contract_version=CONTRACT_VERSION,
            generated_at=datetime.utcnow(),
            location=analysis.location,
            temporal=analysis.temporal,
            limitations=analysis.limitations,
            degraded=_degraded(analysis),
            notes=notes,
        ),
    )
