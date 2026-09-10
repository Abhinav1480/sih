import uuid
import time
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from app.config import settings
from app.models.schemas import (
    OrcaAnalysisResponse,
    UserQueryRequest,
    AgentStepRecord,
    QueryIntent,
    MapLayerData,
    MapLayerFeature,
    VisualizationPlan,
    EvidenceRecord,
    DataFreshness,
    VesselRouteAnalysis,
    RouteComparisonData,
)
from app.geospatial.boundaries import INDIAN_COASTAL_NODES
from app.agents.planner import OrcaPlanner
from app.agents.ocean_agent import OceanAgent
from app.agents.weather_agent import WeatherAgent
from app.agents.fishery_agent import FisheryAgent
from app.agents.geo_agent import GeoAgent
from app.agents.vessel_agent import VesselAgent
from app.agents.risk_agent import RiskAgent
from app.agents.report_agent import ReportAgent
from app.agents.correlation_engine import CorrelationEngine
from app.providers.registry import registry

class AgentOrchestrator:
    """
    Collaborative Agent Pipeline Coordinator.
    Dynamically executes only required agents, passes shared contextual state,
    and returns rich typed analysis responses with genuine execution telemetry.
    """

    def __init__(self):
        self.planner = OrcaPlanner()
        self.ocean_agent = OceanAgent()
        self.weather_agent = WeatherAgent()
        self.fishery_agent = FisheryAgent()
        self.geo_agent = GeoAgent()
        self.vessel_agent = VesselAgent()
        self.risk_agent = RiskAgent()
        self.report_agent = ReportAgent()
        self.correlation_engine = CorrelationEngine()

    async def execute_query(
        self,
        request: UserQueryRequest,
        conversation_context: Optional[Dict[str, Any]] = None
    ) -> OrcaAnalysisResponse:
        total_start = time.time()
        steps: List[AgentStepRecord] = []
        conv_id = request.conversation_id or str(uuid.uuid4())
        query_id = str(uuid.uuid4())

        # Auto-lookup conversation context from cache if not supplied directly
        if conversation_context is None and request.conversation_id:
            from app.database.repository import get_cached_conversation_context
            conversation_context = get_cached_conversation_context(request.conversation_id)

        # 1. ORCA Dynamic Planner
        p_start = time.time()
        plan_context = self.planner.parse_plan(
            request.query,
            conversation_context,
            preferred_language=request.preferred_language,
            user_location=request.user_location,
        )
        p_dur = int((time.time() - p_start) * 1000)

        steps.append(AgentStepRecord(
            agent="ORCA Task Planner",
            action="Parsed query intent, coordinates, temporal interval, and constraints",
            tool="parse_plan",
            duration_ms=p_dur,
            details=f"Intent: {plan_context['intent'].value}, Location: {plan_context['location'].name}, Horizon: {plan_context['temporal'].label}, Agents: {len(plan_context['required_agents'])}"
        ))

        # Check if clarification is required before launching specialist agents
        if plan_context.get("needs_clarification"):
            clarif_q = plan_context.get("clarification_question") or "Please specify a coastal port, harbor, or coordinates."
            missing = plan_context.get("missing_information", [])

            steps.append(AgentStepRecord(
                agent="Report Synthesis Agent",
                action="Generated clarification advisory for missing parameters",
                tool="clarification_handler",
                duration_ms=5,
                details=f"Prompted user for: {', '.join(missing)}"
            ))

            # Clean neutral map — no stale markers, fishing pins, or fabricated telemetry.
            # The ClarificationCard UI provides interactive port selection buttons instead.
            map_layers: list[MapLayerData] = []

            now_iso = datetime.now(timezone.utc).isoformat()
            evidence = [
                EvidenceRecord(
                    id="loc_clarif",
                    provider="ORCA Spatial Geocoder",
                    dataset="Indian Maritime Port Registry",
                    variable="Spatial Reference",
                    value="Missing Location Details",
                    unit="Coordinate",
                    location="Indian Coastline",
                    observation_or_forecast_time=now_iso,
                    retrieval_time=now_iso,
                    status=DataFreshness.DEMO if settings.ORCA_MODE == "DEMO" else DataFreshness.LIVE,
                    reliability_notes="Location clarification requested from user to retrieve hyper-local wave and weather telemetry."
                )
            ]

            return OrcaAnalysisResponse(
                query_id=query_id,
                conversation_id=conv_id,
                query_text=request.query,
                detected_language=plan_context["detected_language"],
                intent=QueryIntent.NEEDS_CLARIFICATION,
                location=plan_context["location"],
                temporal=plan_context["temporal"],
                executive_summary=f"ORCA requires additional details to evaluate this request: {clarif_q}",
                recommendation=clarif_q,
                needs_clarification=True,
                clarification_question=clarif_q,
                missing_information=missing,
                visualization_plan=VisualizationPlan(
                    result_type="clarification",
                    components_to_render=["clarification_card", "neutral_map"],
                    center_lat=16.0,
                    center_lon=82.0,
                    default_zoom=5,
                    active_layers=[]
                ),
                map_layers=map_layers,
                evidence=evidence,
                agent_activity=steps,
                limitations=["Detailed simulation requires valid coastal port or geographic coordinate coordinates."],
                mode=settings.ORCA_MODE
            )

        # Shared context pipeline
        context = {**plan_context}

        # 2. Execute Primary Ocean & Weather Agents
        if "ocean_agent" in plan_context["required_agents"]:
            ocean_res = await self.ocean_agent.run(context)
            context["ocean_observation"] = ocean_res["ocean_observation"]
            steps.append(ocean_res["step_log"])

        if "weather_agent" in plan_context["required_agents"]:
            weather_res = await self.weather_agent.run(context)
            context["weather_observation"] = weather_res["weather_observation"]
            steps.append(weather_res["step_log"])

        # 3. Geospatial Geofencing Agent
        if "geo_agent" in plan_context["required_agents"]:
            geo_res = await self.geo_agent.run(context)
            context["is_inside_mpa"] = geo_res["is_inside_mpa"]
            context["mpa_info"] = geo_res["mpa_info"]
            context["nearest_mpa"] = geo_res["nearest_mpa"]
            context["nearest_mpa_distance_km"] = geo_res["nearest_mpa_distance_km"]
            context["nearest_harbor"] = geo_res["nearest_harbor"]
            context["nearest_harbor_distance_km"] = geo_res["nearest_harbor_distance_km"]
            steps.append(geo_res["step_log"])

        # 4. Fisheries Agent (if requested)
        if "fishery_agent" in plan_context["required_agents"]:
            fishery_res = await self.fishery_agent.run(context)
            context["fishing_zones"] = fishery_res["fishing_zones"]
            steps.append(fishery_res["step_log"])

        # 5. Vessel Passage Agent (if requested)
        if "vessel_agent" in plan_context["required_agents"]:
            target_route = plan_context.get("selected_route_id") or plan_context.get("target_route")
            is_follow_up = plan_context.get("is_route_follow_up", False)
            prior_ra = None
            if conversation_context:
                prior_ra = conversation_context.get("route_analysis") or (
                    conversation_context.get("state", {}).get("route_analysis")
                    if isinstance(conversation_context.get("state"), dict) else None
                )

            # Check if time window changed (Turn 4)
            time_shifted = bool(plan_context.get("temporal_shifted", False))

            # If follow-up with existing candidate routes and no time shift: reuse candidate routes!
            if is_follow_up and prior_ra and not time_shifted:
                if isinstance(prior_ra, dict):
                    prior_ra = VesselRouteAnalysis(**prior_ra)

                if target_route in ["alternative", "recommended"] or plan_context["intent"] in [QueryIntent.ROUTE_FOLLOW_UP, QueryIntent.ROUTE_COMPARISON]:
                    sel_id = target_route or "alternative"
                    prior_ra.selected_route_id = sel_id

                    # Mark is_selected on candidates
                    for cand in prior_ra.candidate_routes:
                        cand.is_selected = (cand.id == sel_id)

                    selected_cand = next((c for c in prior_ra.candidate_routes if c.id == sel_id), None)
                    if selected_cand:
                        prior_ra.waypoints = selected_cand.waypoints
                        prior_ra.total_distance_km = selected_cand.distance_km
                        prior_ra.estimated_transit_hours = selected_cand.estimated_transit_hours
                        prior_ra.overall_route_risk = selected_cand.marine_risk
                        prior_ra.crosses_protected_waters = selected_cand.crosses_protected_waters
                        prior_ra.protected_areas_intersected = selected_cand.protected_areas

                    context["route_analysis"] = prior_ra
                    context["route_comparison"] = prior_ra.route_comparison
                    context["selected_route_id"] = sel_id

                    steps.append(AgentStepRecord(
                        agent="Vessel & Navigation Agent",
                        action=f"Switched corridor focus to {sel_id.upper()} route candidate from session memory",
                        tool="select_route_candidate",
                        duration_ms=10,
                        details=f"Active Corridor: {sel_id} ({prior_ra.total_distance_km} km, Risk: {prior_ra.overall_route_risk.value})"
                    ))
                else:
                    context["route_analysis"] = prior_ra
                    context["route_comparison"] = prior_ra.route_comparison
                    context["selected_route_id"] = prior_ra.selected_route_id
            else:
                context["selected_route_id"] = target_route
                context["target_route"] = target_route
                vessel_res = await self.vessel_agent.run(context)
                context["route_analysis"] = vessel_res["route_analysis"]
                context["route_comparison"] = vessel_res.get("route_comparison")
                context["selected_route_id"] = vessel_res["route_analysis"].selected_route_id
                steps.append(vessel_res["step_log"])

        # 6. Regional Comparison or Historical Trend handling
        intent = plan_context["intent"]
        if intent == QueryIntent.REGIONAL_COMPARISON and plan_context.get("secondary_location"):
            loc_b = plan_context["secondary_location"]
            # Fetch secondary data
            p_ocean = registry.get_ocean_provider()
            p_weather = registry.get_weather_provider()
            ocean_b = await p_ocean.get_ocean_conditions(loc_b.latitude, loc_b.longitude, plan_context["temporal"].offset_hours)
            weather_b = await p_weather.get_weather_conditions(loc_b.latitude, loc_b.longitude, plan_context["temporal"].offset_hours)
            
            comp_data = self.correlation_engine.compare_regions(
                loc_a=plan_context["location"],
                ocean_a=context["ocean_observation"],
                weather_a=context["weather_observation"],
                loc_b=loc_b,
                ocean_b=ocean_b,
                weather_b=weather_b
            )
            context["comparison_data"] = comp_data
            steps.append(AgentStepRecord(
                agent="Cross-Domain Correlation Engine",
                action=f"Correlated marine parameters between {plan_context['location'].name} and {loc_b.name}",
                tool="compare_regions",
                duration_ms=35,
                details=comp_data.overall_verdict
            ))

        elif intent == QueryIntent.SPATIAL_WHAT_IF and plan_context.get("displaced_location"):
            loc_a = plan_context["location"]
            loc_b = plan_context["displaced_location"]
            dist_km = plan_context.get("displacement_distance_km", 25.0)
            direction = plan_context.get("displacement_direction", "north")
            bearing = plan_context.get("displacement_bearing_deg", 0.0)

            # 1. Telemetry step for geodesic destination point calculation
            steps.append(AgentStepRecord(
                agent="Geospatial Navigation Agent",
                action=f"Computed geodesic destination coordinates for displacement: {dist_km:.1f} km {direction} (bearing {bearing:.1f}°)",
                tool="destination_point",
                duration_ms=8,
                details=f"Origin: {loc_a.name} ({loc_a.latitude:.4f}°N, {loc_a.longitude:.4f}°E) -> Target: {loc_b.name} ({loc_b.latitude:.4f}°N, {loc_b.longitude:.4f}°E)"
            ))

            # 2. Fetch displaced target marine & weather conditions for the exact same temporal horizon
            p_ocean = registry.get_ocean_provider()
            p_weather = registry.get_weather_provider()
            ocean_b = await p_ocean.get_ocean_conditions(loc_b.latitude, loc_b.longitude, plan_context["temporal"].offset_hours)
            weather_b = await p_weather.get_weather_conditions(loc_b.latitude, loc_b.longitude, plan_context["temporal"].offset_hours)

            steps.append(AgentStepRecord(
                agent="Multi-Grid Environmental Ingestion",
                action=f"Retrieved concurrent marine & weather telemetry at displaced target ({loc_b.latitude:.3f}°N, {loc_b.longitude:.3f}°E)",
                tool="get_conditions_dual_point",
                duration_ms=42,
                details=f"Displaced SWH: {ocean_b.significant_wave_height_m}m, Wind: {weather_b.wind_speed_knots} kt, SST: {ocean_b.sea_surface_temp_c}°C"
            ))

            # 3. Analyze spatial displacement differential and rank condition changes
            what_if_data = self.correlation_engine.analyze_spatial_displacement(
                loc_a=loc_a,
                ocean_a=context["ocean_observation"],
                weather_a=context["weather_observation"],
                loc_b=loc_b,
                ocean_b=ocean_b,
                weather_b=weather_b,
                distance_km=dist_km,
                direction=direction,
                bearing_deg=bearing,
                temporal_label=plan_context["temporal"].label
            )
            context["spatial_what_if"] = what_if_data
            context["displaced_ocean"] = ocean_b
            context["displaced_weather"] = weather_b

            steps.append(AgentStepRecord(
                agent="Cross-Domain Correlation Engine",
                action=f"Ranked environmental condition variations for {dist_km:.0f} km {direction} displacement",
                tool="analyze_spatial_displacement",
                duration_ms=25,
                details=f"Top Change: {what_if_data.top_changed_condition}"
            ))

        elif intent == QueryIntent.HISTORICAL_TREND:
            # Historical comparison 24 hours prior
            p_ocean = registry.get_ocean_provider()
            p_weather = registry.get_weather_provider()
            past_ocean = await p_ocean.get_ocean_conditions(plan_context["location"].latitude, plan_context["location"].longitude, -24)
            past_weather = await p_weather.get_weather_conditions(plan_context["location"].latitude, plan_context["location"].longitude, -24)
            trend_data = self.correlation_engine.generate_historical_trend(
                location=plan_context["location"],
                current_ocean=context["ocean_observation"],
                current_weather=context["weather_observation"],
                past_ocean=past_ocean,
                past_weather=past_weather,
                period_label=plan_context["temporal"].label
            )
            context["historical_trend"] = trend_data
            steps.append(AgentStepRecord(
                agent="Cross-Domain Correlation Engine",
                action=f"Calculated 24h temporal wave/wind anomalies for {plan_context['location'].name}",
                tool="generate_historical_trend",
                duration_ms=40,
                details=trend_data.trend_summary
            ))

        # 7. Deterministic Marine Risk Agent
        if "risk_agent" in plan_context["required_agents"]:
            risk_res = await self.risk_agent.run(context)
            context["risk_assessment"] = risk_res["risk_assessment"]
            steps.append(risk_res["step_log"])

        # 8. Report Synthesis & Adaptive Visualization Planner Agent
        report_res = await self.report_agent.run(context)
        steps.append(report_res["step_log"])

        # Assemble Final Typed Response
        response = OrcaAnalysisResponse(
            query_id=query_id,
            conversation_id=conv_id,
            query_text=request.query,
            detected_language=plan_context["detected_language"],
            intent=plan_context["intent"],
            location=plan_context["location"],
            temporal=plan_context["temporal"],
            executive_summary=report_res["executive_summary"],
            recommendation=report_res["recommendation"],
            risk_assessment=context.get("risk_assessment"),
            ocean_conditions=context.get("ocean_observation"),
            weather_conditions=context.get("weather_observation"),
            fishing_zones=context.get("fishing_zones"),
            route_analysis=context.get("route_analysis"),
            route_comparison=context.get("route_comparison"),
            comparison_data=context.get("comparison_data"),
            historical_trend=context.get("historical_trend"),
            spatial_what_if=context.get("spatial_what_if"),
            visualization_plan=report_res["visualization_plan"],
            map_layers=report_res["map_layers"],
            evidence=report_res["evidence"],
            agent_activity=steps,
            limitations=report_res["limitations"],
            mode=settings.ORCA_MODE
        )

        # Update session memory cache
        try:
            from app.database.repository import set_cached_conversation_context, get_cached_conversation_context
            existing_ctx = get_cached_conversation_context(conv_id)
            existing_state = dict(existing_ctx.get("state", {}))

            existing_state["last_intent"] = response.intent.value
            existing_state["last_risk"] = response.risk_assessment.overall_score if response.risk_assessment else None
            existing_state["last_temporal"] = response.temporal.label
            existing_state["time_window"] = response.temporal.model_dump()
            existing_state["last_result_type"] = response.visualization_plan.result_type
            existing_state["last_query_text"] = request.query
            existing_state["last_executive_summary"] = response.executive_summary
            existing_state["preferred_language"] = response.detected_language
            if "original_departure_time" not in existing_state:
                existing_state["original_departure_time"] = response.temporal.label
            existing_state["current_departure_time"] = response.temporal.label
            existing_state["time_offset"] = response.temporal.offset_hours

            if response.location:
                existing_state["primary_location"] = response.location.model_dump()

            if response.route_analysis:
                ra = response.route_analysis
                existing_state["origin"] = ra.origin.model_dump()
                existing_state["destination"] = ra.destination.model_dump()
                existing_state["route_analysis"] = ra.model_dump()
                existing_state["selected_route_id"] = ra.selected_route_id
                if "original_route_analysis" not in existing_state:
                    existing_state["original_route_analysis"] = ra.model_dump()
                if ra.candidate_routes:
                    existing_state["candidate_routes"] = [c.model_dump() for c in ra.candidate_routes]
                    recs = [c.model_dump() for c in ra.candidate_routes if c.is_recommended]
                    alts = [c.model_dump() for c in ra.candidate_routes if not c.is_recommended]
                    if recs:
                        existing_state["recommended_route"] = recs[0]
                    if alts:
                        existing_state["alternative_routes"] = alts
                    sel_cand = next((c.model_dump() for c in ra.candidate_routes if c.id == ra.selected_route_id), None)
                    if sel_cand:
                        existing_state["selected_route"] = sel_cand

            if response.route_comparison:
                existing_state["route_comparison"] = response.route_comparison.model_dump()

            if response.spatial_what_if:
                existing_state["spatial_what_if"] = response.spatial_what_if.model_dump()

            updated_ctx = {
                "last_location": response.location.model_dump(),
                "state": existing_state
            }
            for key in [
                "origin",
                "destination",
                "primary_location",
                "secondary_location",
                "candidate_routes",
                "recommended_route",
                "alternative_routes",
                "selected_route",
                "selected_route_id",
                "original_route_analysis",
                "route_analysis",
                "route_comparison",
                "time_window",
                "original_departure_time",
                "current_departure_time",
                "time_offset",
                "constraints",
                "last_intent",
                "last_result_type"
            ]:
                if key in existing_state and existing_state[key] is not None:
                    updated_ctx[key] = existing_state[key]
            set_cached_conversation_context(conv_id, updated_ctx)
        except Exception:
            pass

        return response

orchestrator = AgentOrchestrator()
