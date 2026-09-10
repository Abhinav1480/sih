import re
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from app.models.schemas import (
    QueryIntent,
    LocationContext,
    TemporalContext,
    ConstraintModel,
)
from app.geospatial.boundaries import resolve_location, INDIAN_COASTAL_NODES
from app.geospatial.calculations import destination_point
from app.utils.temporal import parse_temporal_context
from app.utils.multilingual import detect_language, LANGUAGE_CODES
from app.agents.reference_resolver import ConversationalReferenceResolver

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
        conversation_context: Optional[Dict[str, Any]] = None,
        preferred_language: Optional[str] = None
    ) -> Dict[str, Any]:
        text = query_text.lower().strip()
        detected = detect_language(query_text)
        if detected != "en":
            lang = detected
        elif preferred_language and preferred_language in LANGUAGE_CODES:
            lang = preferred_language
        elif conversation_context and conversation_context.get("preferred_language"):
            lang = conversation_context["preferred_language"]
        else:
            lang = "en"

        # 1. Resolve Conversational References (Routes, Relative Time Shifts, Locations)
        route_ref = ConversationalReferenceResolver.resolve_route_reference(query_text, conversation_context)
        time_shift = ConversationalReferenceResolver.resolve_temporal_shift(query_text, conversation_context)
        loc_from_ref = ConversationalReferenceResolver.resolve_location_reference(query_text, conversation_context)

        needs_clarification = False
        clarification_question: Optional[str] = None
        missing_information: List[str] = []
        origin_location: Optional[LocationContext] = None
        destination_location: Optional[LocationContext] = None
        secondary_location: Optional[LocationContext] = None
        displaced_location: Optional[LocationContext] = None
        dist_km: Optional[float] = None
        direction: Optional[str] = None
        bearing: Optional[float] = None
        location: Optional[LocationContext] = None
        selected_route_id: Optional[str] = None
        is_route_follow_up: bool = False

        # Prior location fallback
        prev_loc = None
        if conversation_context and "last_location" in conversation_context:
            try:
                prev_loc = LocationContext(**conversation_context["last_location"])
            except Exception:
                pass

        if route_ref is not None:
            # CASE A: User is explicitly following up or comparing route candidates
            intent = QueryIntent.ROUTE_COMPARISON if route_ref.get("wants_comparison") else QueryIntent.ROUTE_FOLLOW_UP
            origin_location = route_ref["origin"]
            destination_location = route_ref["destination"]
            location = origin_location
            secondary_location = destination_location
            selected_route_id = route_ref["target_route"]
            is_route_follow_up = True
            needs_clarification = False

        elif (
            time_shift is not None
            and ConversationalReferenceResolver.has_active_route_context(conversation_context)
            and not ConversationalReferenceResolver.is_unrelated_new_query(query_text, conversation_context)
        ):
            # CASE B: Relative or absolute time shift on existing route (e.g. "What if I leave two hours later?")
            orig_ctx, dest_ctx = ConversationalReferenceResolver.get_route_endpoints_from_context(conversation_context)
            origin_location = orig_ctx
            destination_location = dest_ctx
            location = origin_location
            secondary_location = destination_location
            intent = QueryIntent.ROUTE_ANALYSIS
            is_route_follow_up = True
            needs_clarification = False
            state = conversation_context.get("state", {}) if isinstance(conversation_context.get("state"), dict) else {}
            selected_route_id = conversation_context.get("selected_route_id") or state.get("selected_route_id") or "recommended"

        else:
            # CASE C: Standard Intent Classification
            intent = self._classify_intent(text)

            if intent == QueryIntent.ROUTE_ANALYSIS:
                origin_location, destination_location = self._extract_route_endpoints(query_text)

                # If missing endpoints, check if conversation context has active route endpoints and query is not unrelated
                if (
                    (origin_location is None or destination_location is None)
                    and ConversationalReferenceResolver.has_active_route_context(conversation_context)
                    and not ConversationalReferenceResolver.is_unrelated_new_query(query_text, conversation_context)
                ):
                    orig_ctx, dest_ctx = ConversationalReferenceResolver.get_route_endpoints_from_context(conversation_context)
                    origin_location = origin_location or orig_ctx
                    destination_location = destination_location or dest_ctx
                    is_route_follow_up = True

                missing = []
                if origin_location is None:
                    missing.append("departure port or coordinates")
                if destination_location is None:
                    missing.append("destination port or coordinates")

                if missing:
                    needs_clarification = True
                    missing_information = missing
                    intent = QueryIntent.NEEDS_CLARIFICATION
                    clarification_question = (
                        f"To evaluate your vessel route corridor, please specify {' and '.join(missing)} "
                        "(for example: 'vessel route from Visakhapatnam to Kakinada')."
                    )
                    location = origin_location or destination_location or LocationContext(name="Unspecified Route Corridor")
                else:
                    location = origin_location
                    secondary_location = destination_location

            elif intent == QueryIntent.SPATIAL_WHAT_IF:
                origin_location, displaced_location, dist_km, direction, bearing = self._extract_displacement_params(
                    query_text, text, prev_loc
                )
                if origin_location is None:
                    needs_clarification = True
                    missing_information = ["origin coastal location or harbor"]
                    intent = QueryIntent.NEEDS_CLARIFICATION
                    clarification_question = (
                        "Which coastal port or harbor would you like to evaluate your movement from "
                        "(e.g., Kakinada, Chennai, or Visakhapatnam)?"
                    )
                    location = LocationContext(name="Unspecified Origin Location")
                else:
                    location = origin_location
                    secondary_location = displaced_location

            else:
                # Other intents (FISHING_ZONES, MARINE_SAFETY, OCEAN_CONDITIONS, etc.)
                if loc_from_ref is not None:
                    location = loc_from_ref
                else:
                    location = resolve_location(query_text, default_fallback=prev_loc)

                if location is None:
                    needs_clarification = True
                    missing_information = ["coastal location, harbor, or coordinates"]
                    intent = QueryIntent.NEEDS_CLARIFICATION
                    clarification_question = (
                        "Which coastal port, harbor, or coordinates would you like ORCA to analyze "
                        "(e.g., Visakhapatnam, Chennai, Mumbai, or Kakinada)?"
                    )
                    location = LocationContext(name="Unspecified Coastal Location")
                else:
                    dist_match = re.search(r"(\d+)\s*(?:km|nautical miles|nm)", text)
                    if dist_match:
                        location.radius_km = float(dist_match.group(1))

                    if intent == QueryIntent.REGIONAL_COMPARISON:
                        secondary_location = self._extract_secondary_location(query_text, location)
                        if secondary_location is None:
                            needs_clarification = True
                            missing_information = ["second location for comparison"]
                            intent = QueryIntent.NEEDS_CLARIFICATION
                            clarification_question = (
                                f"Which coastal port or region would you like to compare with {location.name} "
                                "(e.g., Chennai and Visakhapatnam)?"
                            )

        # 3. Extract Temporal Horizon & Apply Shifts
        temporal = parse_temporal_context(query_text)
        temporal_shifted = False
        shift_delta_hours: Optional[int] = None
        if time_shift is not None:
            new_offset, new_label, shift_delta_hours = time_shift
            temporal.offset_hours = new_offset
            temporal.label = new_label
            now = datetime.now(timezone.utc)
            temporal.start_time = now + timedelta(hours=new_offset)
            temporal.end_time = temporal.start_time + timedelta(hours=6)
            temporal_shifted = True
        elif is_route_follow_up and temporal.offset_hours == 0:
            # Query did not specify a new time; inherit previous temporal context from session!
            prior_tw = None
            if conversation_context:
                prior_tw = conversation_context.get("time_window") or (
                    conversation_context.get("state", {}).get("time_window")
                    if isinstance(conversation_context.get("state"), dict) else None
                )
            if prior_tw and isinstance(prior_tw, dict) and prior_tw.get("offset_hours", 0) != 0:
                temporal = TemporalContext(**prior_tw)

        # 4. Extract Constraints
        constraints = self._extract_constraints(text)

        # 5. Dynamically select required specialist agents
        if needs_clarification:
            required_agents = []
        else:
            required_agents = self._select_specialist_agents(intent, constraints)

        return {
            "query_text": query_text,
            "detected_language": lang,
            "intent": intent,
            "location": location,
            "origin_location": origin_location,
            "destination_location": destination_location,
            "secondary_location": secondary_location,
            "displaced_location": displaced_location,
            "displacement_distance_km": dist_km,
            "displacement_direction": direction,
            "displacement_bearing_deg": bearing,
            "temporal": temporal,
            "temporal_shifted": temporal_shifted,
            "shift_delta_hours": shift_delta_hours,
            "constraints": constraints,
            "required_agents": required_agents,
            "needs_clarification": needs_clarification,
            "can_execute": not needs_clarification,
            "sub_intents": [intent.value],
            "clarification_question": clarification_question,
            "missing_information": missing_information,
            "selected_route_id": selected_route_id,
            "is_route_follow_up": is_route_follow_up,
            "target_route": route_ref["target_route"] if route_ref else None,
            "compare_against": route_ref.get("compare_against") if route_ref else None,
            "wants_comparison": route_ref.get("wants_comparison", False) if route_ref else False,
            "planning_timestamp": datetime.now(timezone.utc).isoformat()
        }

    def _classify_intent(self, text: str) -> QueryIntent:
        # 1. Spatial What-If / Displacement (High specificity)
        if self._is_spatial_what_if_query(text):
            return QueryIntent.SPATIAL_WHAT_IF
        # 1. Route Optimization & Vessel Transit Passage
        if any(w in text for w in ["route", "passage", "transit", "navigation corridor", "sail from", "voyage"]):
            return QueryIntent.ROUTE_ANALYSIS
        if "from" in text and "to" in text and any(w in text for w in ["avoiding", "risk", "lower-risk", "safe", "cross", "travel", "navigate", "reach"]):
            return QueryIntent.ROUTE_ANALYSIS

        # 2. Potential Fishing Zones & Fishing Search (High specificity)
        if any(w in text for w in [
            "fishing location", "fishing area", "fishing zone", "best fishing",
            "top fishing", "top 3 fishing", "find fishing", "where to fish", "pfz",
            "potential fishing zone", "chlorophyll", "trawling hotspot"
        ]):
            return QueryIntent.FISHING_ZONES

        # 3. Regional Comparison (explicit comparison between two places)
        comp_keywords = ["compare", "difference between", "versus", "vs", "better conditions"]
        if any(w in text for w in comp_keywords) or (re.search(r"\bbetween\b.+\band\b", text) and any(w in text for w in ["lower wave", "higher", "better", "wind", "sst", "swell"])):
            return QueryIntent.REGIONAL_COMPARISON

        # 4. Historical Trend or Change Detection
        if any(w in text for w in ["changed", "over the last", "historical", "past week", "yesterday vs", "trend", "anomaly", "warmed over the past", "decreased near", "past 7 days", "past 24 hours"]):
            return QueryIntent.HISTORICAL_TREND

        # 5. Geofence / Restriction / Marine Sanctuary
        if any(w in text for w in ["protected area", "restricted area", "sanctuary", "marine national park", "wildlife sanctuary", "no-take zone", "enters a restricted", "flagged as restricted", "permitted for commercial"]):
            return QueryIntent.GEOFENCE_RESTRICTION

        # 6. Marine Safety (explicit safety/risk/advisory questions)
        if any(w in text for w in ["is it safe", "safe", "safety", "danger", "risk", "can i go", "warning", "hazard", "advisable"]):
            return QueryIntent.MARINE_SAFETY

        # 7. General Fishing queries
        if any(w in text for w in ["fishing", "fish catch", "tuna", "catch"]):
            return QueryIntent.FISHING_ZONES

        # 8. Ocean Conditions
        if any(w in text for w in ["wave", "swell", "sea state", "currents", "tide", "sst"]):
            return QueryIntent.OCEAN_CONDITIONS

        # 9. Weather Forecast
        if any(w in text for w in ["weather", "rain", "precipitation", "cyclone", "storm", "wind", "lightning"]):
            return QueryIntent.WEATHER_FORECAST

        # 10. Explainability
        if any(w in text for w in ["why", "reason", "explain why", "how did you", "reject"]):
            return QueryIntent.EXPLAINABILITY

        return QueryIntent.MARINE_SAFETY

    def _extract_route_endpoints(self, query_text: str) -> tuple[Optional[LocationContext], Optional[LocationContext]]:
        """Extracts origin and destination locations for vessel passage routes."""
        origin: Optional[LocationContext] = None
        dest: Optional[LocationContext] = None

        # Pattern: from <origin> to <dest>
        route_match = re.search(r"\bfrom\s+([a-zA-Z0-9\.\s]+?)\s+to\s+([a-zA-Z0-9\.\s]+)", query_text, re.IGNORECASE)
        if route_match:
            cand_orig = route_match.group(1).strip()
            cand_dest = route_match.group(2).strip()
            cand_dest = re.split(r"\b(avoiding|cross|with|for|during|and|in)\b|[,\.\?]", cand_dest, flags=re.IGNORECASE)[0].strip()
            origin = resolve_location(cand_orig)
            dest = resolve_location(cand_dest)

        # Fallback: scan all coastal nodes in order of appearance
        if origin is None or dest is None:
            matched_nodes = []
            lower_text = query_text.lower()
            for key, node in INDIAN_COASTAL_NODES.items():
                for alias in node["aliases"]:
                    m = re.search(rf"\b{re.escape(alias)}\b", lower_text)
                    if m:
                        matched_nodes.append((m.start(), node))
                        break
            matched_nodes.sort(key=lambda x: x[0])

            if origin is None and len(matched_nodes) >= 1:
                origin = LocationContext(
                    name=matched_nodes[0][1]["name"],
                    latitude=matched_nodes[0][1]["latitude"],
                    longitude=matched_nodes[0][1]["longitude"],
                    radius_km=40.0,
                    nearest_port=matched_nodes[0][1]["nearest_port"],
                    state=matched_nodes[0][1]["state"],
                    maritime_zone=matched_nodes[0][1]["maritime_zone"]
                )
            if dest is None and len(matched_nodes) >= 2:
                dest = LocationContext(
                    name=matched_nodes[1][1]["name"],
                    latitude=matched_nodes[1][1]["latitude"],
                    longitude=matched_nodes[1][1]["longitude"],
                    radius_km=40.0,
                    nearest_port=matched_nodes[1][1]["nearest_port"],
                    state=matched_nodes[1][1]["state"],
                    maritime_zone=matched_nodes[1][1]["maritime_zone"]
                )

        return origin, dest

    def _extract_secondary_location(self, text: str, primary_loc: LocationContext) -> Optional[LocationContext]:
        """Extracts a distinct secondary location without hardcoded geographic fallbacks."""
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
        return None

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

    def _is_spatial_what_if_query(self, text: str) -> bool:
        """Identifies spatial what-if, displacement, and directional movement comparison queries."""
        # 1. Explicit displacement distance + direction
        has_dist_dir = bool(re.search(
            r"(\d+(?:\.\d+)?)\s*(?:km|nautical\s*miles|nm|kilo\s*meters?)\s*(?:farther\s+|due\s+)?(north|south|east|west|northeast|north-east|northwest|north-west|southeast|south-east|southwest|south-west|offshore|inshore|closer\s+to\s+shore|toward\s+(?:the\s+)?coast|towards\s+shore)",
            text
        ))
        if has_dist_dir:
            return True

        # 2. Distance followed by direction and location (e.g. "25 km north of Kakinada")
        if re.search(r"(\d+(?:\.\d+)?)\s*(?:km|nm)\s+(?:north|south|east|west|offshore)", text):
            return True

        # 3. Concepts of movement with distance or direction
        movement_verbs = ["move", "moving", "travel", "traveling", "travelling", "shift", "shifting", "relocate", "head", "heading", "sail", "sailing"]
        has_movement = any(re.search(rf"\b{v}\b", text) for v in movement_verbs)
        
        has_dist = bool(re.search(r"(\d+(?:\.\d+)?)\s*(?:km|nautical\s*miles|nm|kilo\s*meters?)", text))
        has_dir = any(d in text for d in ["north", "south", "east", "west", "offshore", "inshore", "closer to shore", "toward the coast", "farther out"])

        if has_movement and (has_dist or has_dir):
            return True

        # 4. What-if phrases
        what_if_phrases = [
            "what changes if", "what happens if i", "which marine conditions are likely to change",
            "which conditions change", "what happens to wave and wind conditions",
            "compare current position with a displaced", "what happens 25 km",
            "which conditions improve"
        ]
        if any(p in text for p in what_if_phrases) and (has_dist or has_dir or has_movement):
            return True

        # 5. "Compare <place> and 20 km east of <place>"
        if "compare" in text and has_dist and has_dir:
            return True

        return False

    def _calculate_seaward_bearing(self, origin_loc: LocationContext) -> float:
        """Determines seaward bearing based on Indian coastline orientation."""
        if origin_loc.longitude > 91.0:
            return 90.0
        if origin_loc.latitude < 8.8 and 77.0 <= origin_loc.longitude <= 78.5:
            return 180.0
        if origin_loc.longitude > 78.5:
            return 90.0
        return 270.0

    def _extract_displacement_params(
        self, query_text: str, text: str, prev_loc: Optional[LocationContext]
    ) -> tuple[Optional[LocationContext], Optional[LocationContext], float, str, float]:
        """
        Parses origin, distance, direction, and bearing for spatial displacement what-if queries.
        Computes destination coordinates using geodesic forward calculations.
        """
        origin = resolve_location(query_text, default_fallback=prev_loc)

        dist_km = 25.0
        dist_match = re.search(r"(\d+(?:\.\d+)?)\s*(km|nautical\s*miles|nm|kilo\s*meters?)?", text)
        if dist_match:
            val = float(dist_match.group(1))
            unit = (dist_match.group(2) or "km").lower()
            if "nm" in unit or "nautical" in unit:
                dist_km = round(val * 1.852, 2)
            else:
                dist_km = val

        direction = "north"
        bearing = 0.0

        if re.search(r"\b(north[\s-]east|northeast|ne)\b", text):
            direction, bearing = "northeast", 45.0
        elif re.search(r"\b(north[\s-]west|northwest|nw)\b", text):
            direction, bearing = "northwest", 315.0
        elif re.search(r"\b(south[\s-]east|southeast|se)\b", text):
            direction, bearing = "southeast", 135.0
        elif re.search(r"\b(south[\s-]west|southwest|sw)\b", text):
            direction, bearing = "southwest", 225.0
        elif re.search(r"\b(north|northerly|northward|farther\s+north)\b", text):
            direction, bearing = "north", 0.0
        elif re.search(r"\b(south|southerly|southward|farther\s+south)\b", text):
            direction, bearing = "south", 180.0
        elif re.search(r"\b(east|easterly|eastward|farther\s+east)\b", text):
            direction, bearing = "east", 90.0
        elif re.search(r"\b(west|westerly|westward|farther\s+west)\b", text):
            direction, bearing = "west", 270.0
        elif re.search(r"\b(offshore|into\s+(?:the\s+)?sea|open\s+sea|seaward|farther\s+out)\b", text):
            seaward = self._calculate_seaward_bearing(origin) if origin else 90.0
            direction, bearing = "offshore", seaward
        elif re.search(r"\b(closer\s+to\s+shore|inshore|toward\s+(?:the\s+)?coast|towards\s+shore)\b", text):
            seaward = self._calculate_seaward_bearing(origin) if origin else 90.0
            direction, bearing = "inshore", (seaward + 180.0) % 360.0

        displaced: Optional[LocationContext] = None
        if origin is not None:
            target_lat, target_lon = destination_point(origin.latitude, origin.longitude, dist_km, bearing)
            dir_label = direction.replace("-", " ").title()
            dist_label = f"{int(dist_km)}" if dist_km.is_integer() else f"{dist_km:.1f}"
            displaced = LocationContext(
                name=f"{dist_label} km {dir_label} of {origin.name}",
                latitude=target_lat,
                longitude=target_lon,
                radius_km=origin.radius_km,
                nearest_port=f"{origin.nearest_port or origin.name} ({dist_label} km {direction})",
                state=origin.state,
                maritime_zone=origin.maritime_zone
            )

        return origin, displaced, dist_km, direction, bearing

    def _select_specialist_agents(self, intent: QueryIntent, constraints: ConstraintModel) -> List[str]:
        agents = ["ocean_agent", "weather_agent"]

        if intent == QueryIntent.FISHING_ZONES:
            agents.extend(["fishery_agent", "geo_agent", "risk_agent"])
        elif intent in [QueryIntent.ROUTE_ANALYSIS, QueryIntent.ROUTE_FOLLOW_UP, QueryIntent.ROUTE_COMPARISON]:
            agents.extend(["vessel_agent", "geo_agent", "risk_agent"])
        elif intent == QueryIntent.REGIONAL_COMPARISON:
            agents.extend(["geo_agent", "risk_agent"])
        elif intent == QueryIntent.SPATIAL_WHAT_IF:
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

planner = OrcaPlanner()

