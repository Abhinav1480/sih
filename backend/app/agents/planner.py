import re
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.models.schemas import (
    QueryIntent,
    LocationContext,
    TemporalContext,
    ConstraintModel,
)
from app.agents.intent import classify_intent
from app.geospatial.boundaries import resolve_location, INDIAN_COASTAL_NODES
from app.utils.temporal import parse_temporal_context
from app.utils.multilingual import detect_language

class OrcaPlanner:
    """
    Dynamic query understanding and task planning engine.
    Extracts intents, spatial entities, temporal horizon, constraints,
    and constructs a dynamic execution plan.
    NEVER uses fixed question-to-answer mappings.
    """

    def parse_plan(
        self,
        query_text: str,
        conversation_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        text = query_text.lower().strip()
        lang = detect_language(query_text)

        # 1. Determine Intent
        intent, intent_scores = classify_intent(text)

        # 2. Extract Location (Primary)
        prev_loc = None
        if conversation_context and "last_location" in conversation_context:
            try:
                prev_loc = LocationContext(**conversation_context["last_location"])
            except Exception:
                pass

        location = resolve_location(query_text, default_fallback=prev_loc)

        # Check for relative offset e.g. "20 km farther north" or "50 km of vizag"
        dist_match = re.search(r"(\d+)\s*(?:km|nautical miles|nm)", text)
        if dist_match:
            location.radius_km = float(dist_match.group(1))

        # 3. Extract Secondary Location for comparisons or routes
        secondary_location: Optional[LocationContext] = None
        if intent in (QueryIntent.REGIONAL_COMPARISON, QueryIntent.ROUTE_ANALYSIS):
            secondary_location = self._extract_secondary_location(query_text, location)

        # 4. Extract Temporal Horizon
        temporal = parse_temporal_context(query_text)

        # 5. Extract Constraints
        constraints = self._extract_constraints(text)

        # 6. Dynamically select required specialist agents
        required_agents = self._select_specialist_agents(intent, constraints)

        return {
            "query_text": query_text,
            "detected_language": lang,
            "intent": intent,
            "location": location,
            "secondary_location": secondary_location,
            "temporal": temporal,
            "constraints": constraints,
            "required_agents": required_agents,
            "intent_scores": {i.value: v for i, v in intent_scores.items() if v > 0},
            "planning_timestamp": datetime.utcnow().isoformat()
        }

    def _classify_intent(self, text: str) -> QueryIntent:
        return classify_intent(text)[0]

    def _extract_secondary_location(self, text: str, primary_loc: LocationContext) -> Optional[LocationContext]:
        lower = text.lower()
        for key, node in INDIAN_COASTAL_NODES.items():
            if node["name"].lower() != primary_loc.name.lower():
                for alias in node["aliases"]:
                    if re.search(rf"\b{re.escape(alias)}\b", lower):
                        return LocationContext(
                            name=node["name"],
                            latitude=node["latitude"],
                            longitude=node["longitude"],
                            radius_km=40.0,
                            nearest_port=node["nearest_port"],
                            state=node["state"],
                            maritime_zone=node["maritime_zone"]
                        )
        fallback_key = "kakinada" if primary_loc.name != "Kakinada" else "visakhapatnam"
        node = INDIAN_COASTAL_NODES[fallback_key]
        return LocationContext(
            name=node["name"],
            latitude=node["latitude"],
            longitude=node["longitude"],
            radius_km=40.0,
            nearest_port=node["nearest_port"],
            state=node["state"],
            maritime_zone=node["maritime_zone"]
        )

    def _extract_constraints(self, text: str) -> ConstraintModel:
        avoid_protected = "avoid protected" in text or "no protected" in text or "restricted" in text
        
        max_wave = None
        wave_match = re.search(r"(?:max|under|below|less than)\s*(\d+(?:\.\d+)?)\s*(?:m|meter|metres)", text)
        if wave_match:
            max_wave = float(wave_match.group(1))

        min_chloro = 1.0 if ("high chlorophyll" in text or "favorable chlorophyll" in text) else None

        return ConstraintModel(
            avoid_protected_areas=avoid_protected,
            max_wave_height_m=max_wave,
            min_chlorophyll_mg_m3=min_chloro
        )

    def _select_specialist_agents(self, intent: QueryIntent, constraints: ConstraintModel) -> List[str]:
        agents = ["ocean_agent", "weather_agent"]

        if intent == QueryIntent.FISHING_ZONES:
            agents.extend(["fishery_agent", "geo_agent", "risk_agent"])
        elif intent == QueryIntent.ROUTE_ANALYSIS:
            agents.extend(["vessel_agent", "geo_agent", "risk_agent"])
        elif intent == QueryIntent.REGIONAL_COMPARISON:
            agents.extend(["geo_agent", "risk_agent"])
        elif intent == QueryIntent.HISTORICAL_TREND:
            agents.extend(["risk_agent"])
        elif intent == QueryIntent.GEOFENCE_RESTRICTION:
            agents.extend(["geo_agent", "risk_agent"])
        else:
            agents.extend(["geo_agent", "risk_agent"])

        if constraints.avoid_protected_areas and "geo_agent" not in agents:
            agents.append("geo_agent")

        return list(dict.fromkeys(agents))
