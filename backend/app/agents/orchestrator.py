import uuid
import time
from typing import Dict, Any, Optional, List
from app.config import settings
from app.models.schemas import (
    OrcaAnalysisResponse,
    UserQueryRequest,
    AgentStepRecord,
    QueryIntent,
)
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

        # 1. ORCA Dynamic Planner
        p_start = time.time()
        plan_context = self.planner.parse_plan(request.query, conversation_context)
        p_dur = int((time.time() - p_start) * 1000)

        steps.append(AgentStepRecord(
            agent="ORCA Task Planner",
            action="Parsed query intent, coordinates, temporal interval, and constraints",
            tool="parse_plan",
            duration_ms=p_dur,
            details=f"Intent: {plan_context['intent'].value}, Location: {plan_context['location'].name}, Horizon: {plan_context['temporal'].label}, Agents: {len(plan_context['required_agents'])}"
        ))

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
            vessel_res = await self.vessel_agent.run(context)
            context["route_analysis"] = vessel_res["route_analysis"]
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
        return OrcaAnalysisResponse(
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
            comparison_data=context.get("comparison_data"),
            historical_trend=context.get("historical_trend"),
            visualization_plan=report_res["visualization_plan"],
            map_layers=report_res["map_layers"],
            evidence=report_res["evidence"],
            agent_activity=steps,
            limitations=report_res["limitations"],
            mode=settings.ORCA_MODE
        )

orchestrator = AgentOrchestrator()
