import re
from typing import Dict, Any, Optional, Tuple, List
from app.models.schemas import LocationContext, TemporalContext, QueryIntent
from app.geospatial.boundaries import INDIAN_COASTAL_NODES, resolve_location

class ConversationalReferenceResolver:
    """
    Generalized conversational reference resolution engine.
    Resolves pronouns, route candidates, relative temporal shifts, and entity references
    against structured conversational state without hardcoded query strings.
    """

    # Word numbers mapping for relative time shifts
    NUMBER_WORDS = {
        "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
        "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
        "an": 1, "a": 1
    }

    @classmethod
    def has_active_route_context(cls, context: Optional[Dict[str, Any]]) -> bool:
        """Check if prior conversation context contains valid route candidate information."""
        if not context:
            return False
        state = context.get("state", {}) if isinstance(context.get("state"), dict) else {}
        has_route = bool(
            context.get("route_analysis") or
            state.get("route_analysis") or
            context.get("candidate_routes") or
            state.get("candidate_routes") or
            (context.get("origin") and context.get("destination")) or
            (state.get("origin") and state.get("destination"))
        )
        return has_route

    @classmethod
    def get_route_endpoints_from_context(
        cls, context: Optional[Dict[str, Any]]
    ) -> Tuple[Optional[LocationContext], Optional[LocationContext]]:
        """Retrieve origin and destination from previous conversation state."""
        if not context:
            return None, None
        state = context.get("state", {}) if isinstance(context.get("state"), dict) else {}
        
        orig_raw = context.get("origin") or state.get("origin")
        dest_raw = context.get("destination") or state.get("destination")

        origin = LocationContext(**orig_raw) if orig_raw else None
        dest = LocationContext(**dest_raw) if dest_raw else None
        return origin, dest

    @classmethod
    def is_unrelated_new_query(cls, text: str, context: Optional[Dict[str, Any]]) -> bool:
        """
        Safety check: Detect if the user initiated an unrelated query with a completely
        new named port/location, which should NOT inherit previous route endpoints.
        """
        if not context:
            return False
        
        # If the query explicitly references prior context ("destination", "origin", "instead", "that", "there", "it"), it is not unrelated
        if any(w in text.lower() for w in ["destination", "departure", "origin", "instead", "alternative", "route 2", "that", "there", "the other", "original", "later", "earlier"]):
            return False

        # Check if an explicit coastal location is mentioned that is DIFFERENT from previous origin/destination
        lower = text.lower()
        orig, dest = cls.get_route_endpoints_from_context(context)
        prev_names = []
        if orig:
            prev_names.append(orig.name.lower())
        if dest:
            prev_names.append(dest.name.lower())
        
        for node_key, node in INDIAN_COASTAL_NODES.items():
            for alias in node["aliases"]:
                if re.search(rf"\b{re.escape(alias)}\b", lower):
                    # User mentioned a specific node
                    if not any(alias in p or p in alias for p in prev_names):
                        # Explicit new location mentioned
                        return True
        return False

    @classmethod
    def resolve_route_reference(
        cls, query_text: str, context: Optional[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """
        Resolves references to candidate routes (e.g. 'alternative route', 'the second option',
        'route 2', 'the other route', 'original route', 'recommended route', 'that route').
        Distinguishes explicit corridor selection from two-route comparison.
        """
        if not cls.has_active_route_context(context):
            return None

        text = query_text.lower().strip()

        # If user initiates a totally unrelated query, do not reuse
        if cls.is_unrelated_new_query(query_text, context):
            return None

        state = context.get("state", {}) if isinstance(context.get("state"), dict) else {}
        prev_selected = context.get("selected_route_id") or state.get("selected_route_id") or "recommended"

        # Check for alternative route references
        is_alternative_ref = bool(re.search(
            r"\b(alternative|alternate|second|2nd|other|route\s*2|option\s*2|the\s+other\s+one)\b",
            text
        ))

        # Check for original/recommended route references
        is_original_ref = bool(re.search(
            r"\b(original|recommended|first|1st|primary|route\s*1|option\s*1|baseline|safe|safer|safest)\b",
            text
        ))

        # Check for generic comparison indicators
        is_comparison_ref = bool(re.search(
            r"\b(compare|comparison|difference|versus|vs|trade[-\s]?offs?)\b",
            text
        ))

        # Check for route pronouns ("it", "that", "this")
        has_pronoun = bool(re.search(r"\b(it|that|this|the\s+two|both)\b", text))

        # Check for route mention
        is_route_mention = bool(re.search(
            r"\b(route|passage|corridor|transit|voyage|option|choice|take|choose|go\s+with|instead)\b",
            text
        ))

        if not (is_alternative_ref or is_original_ref or (is_comparison_ref and (is_route_mention or has_pronoun))):
            return None

        origin, dest = cls.get_route_endpoints_from_context(context)

        # CASE 1: Explicit comparison requested ("Compare it with the recommended route", "Compare that with the original route", "Compare the second route with the recommended one")
        if is_comparison_ref:
            # If query mentions "it" / "that" alongside "recommended" or "original":
            # "it" refers to currently selected route (e.g. "alternative")
            if (has_pronoun or is_alternative_ref) and is_original_ref:
                target_route = prev_selected  # Active corridor stays selected
                compare_against = "recommended" if prev_selected != "recommended" else "alternative"
            elif has_pronoun and is_alternative_ref:
                target_route = prev_selected
                compare_against = "alternative"
            elif is_alternative_ref and not is_original_ref:
                target_route = "alternative"
                compare_against = "recommended"
            elif is_original_ref and not is_alternative_ref:
                target_route = "recommended"
                compare_against = "alternative"
            else:
                target_route = prev_selected
                compare_against = "alternative" if prev_selected == "recommended" else "recommended"

            return {
                "is_route_follow_up": True,
                "target_route": target_route,
                "compare_against": compare_against,
                "wants_comparison": True,
                "origin": origin,
                "destination": dest,
            }

        # CASE 2: Single route selection / follow-up evaluation ("What happens if I choose the alternative route instead?", "Use route 2 instead")
        if is_alternative_ref:
            target_route = "alternative"
        elif is_original_ref:
            target_route = "recommended"
        else:
            target_route = "alternative" if prev_selected != "alternative" else "recommended"

        return {
            "is_route_follow_up": True,
            "target_route": target_route,
            "compare_against": None,
            "wants_comparison": False,
            "origin": origin,
            "destination": dest,
        }

    @classmethod
    def resolve_location_reference(
        cls, query_text: str, context: Optional[Dict[str, Any]]
    ) -> Optional[LocationContext]:
        """
        Resolves contextual location references:
        - 'the destination' -> previous destination
        - 'the origin' / 'departure port' -> previous origin
        - 'there' / 'same place' / 'that location' -> previous primary location
        """
        if not context:
            return None

        text = query_text.lower().strip()
        state = context.get("state", {}) if isinstance(context.get("state"), dict) else {}

        # 1. Reference to "destination"
        if re.search(r"\b(destination|arrival\s*port|arrival|target\s*port|arriving\s*at)\b", text):
            dest_raw = context.get("destination") or state.get("destination") or context.get("secondary_location") or state.get("secondary_location")
            if dest_raw:
                return LocationContext(**dest_raw) if isinstance(dest_raw, dict) else dest_raw

        # 2. Reference to "origin" / "departure"
        if re.search(r"\b(origin|departure|departure\s*port|starting\s*point|start\s*port)\b", text):
            orig_raw = context.get("origin") or state.get("origin") or context.get("primary_location") or state.get("primary_location")
            if orig_raw:
                return LocationContext(**orig_raw) if isinstance(orig_raw, dict) else orig_raw

        # 3. Pronoun / anaphoric reference: "there", "same location", "that place", "nearby"
        if re.search(r"\b(there|that\s*location|that\s*place|same\s*location|same\s*area|nearby|in\s*that\s*zone)\b", text):
            loc_raw = context.get("destination") or state.get("destination") or context.get("primary_location") or state.get("primary_location") or context.get("last_location")
            if loc_raw:
                return LocationContext(**loc_raw) if isinstance(loc_raw, dict) else loc_raw

        return None

    @classmethod
    def resolve_temporal_shift(
        cls, query_text: str, context: Optional[Dict[str, Any]]
    ) -> Optional[Tuple[int, str, int]]:
        """
        Detects relative and absolute time shifts from conversation context, e.g.:
        'What if I leave two hours later?' -> +2 hours
        'What if I depart 3 hours earlier?' -> -3 hours
        'What if I leave later?' -> +2 hours default
        'What if I leave tomorrow night?' -> shifted to tomorrow evening/night
        'What if I depart in the evening?' -> shifted to evening
        Returns: (new_offset_hours, label, hours_delta)
        """
        text = query_text.lower().strip()

        # Baseline offset from previous temporal context
        prev_offset = 24  # Default baseline (e.g. tomorrow morning)
        prev_label = "Tomorrow Morning"
        if context:
            state = context.get("state", {}) if isinstance(context.get("state"), dict) else {}
            tw = context.get("time_window") or state.get("time_window") or context.get("temporal")
            if tw and isinstance(tw, dict):
                prev_offset = tw.get("offset_hours", 24)
                prev_label = tw.get("label", "Tomorrow Morning")
            elif context.get("time_offset") is not None:
                prev_offset = context.get("time_offset")

        # 1. Check for explicit relative hours: "two hours later", "3 hours earlier", etc.
        shift_match = re.search(
            r"\b(?:leave|depart|start|sail|go|what\s+if|what\s+about)?\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s*(?:hours?|hrs?)\s*(later|after|ahead|delay|earlier|before)\b",
            text
        )
        if not shift_match:
            shift_match = re.search(
                r"\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s*(?:hours?|hrs?)\s*(later|after|ahead|delay|earlier|before)\b",
                text
            )

        if shift_match:
            val_str = shift_match.group(1).lower()
            direction_str = shift_match.group(2).lower()
            hours = int(val_str) if val_str.isdigit() else cls.NUMBER_WORDS.get(val_str, 1)
            if direction_str in ["earlier", "before"]:
                hours = -hours
            new_offset = prev_offset + hours
            sign = "+" if hours > 0 else ""
            label = f"{prev_label} ({sign}{hours}h Departure Shift)"
            return new_offset, label, hours

        # 2. Check for generic relative direction: "leave later" / "depart earlier"
        if re.search(r"\b(?:leave|depart|start|sail|go|what\s+if)\s+(later|delay|after)\b", text):
            hours = 2
            new_offset = prev_offset + hours
            label = f"{prev_label} (+2h Departure Shift)"
            return new_offset, label, hours

        if re.search(r"\b(?:leave|depart|start|sail|go|what\s+if)\s+(earlier|before|sooner)\b", text):
            hours = -2
            new_offset = max(0, prev_offset + hours)
            label = f"{prev_label} (-2h Departure Shift)"
            return new_offset, label, hours

        # 3. Check for specific time of day: "leave at 8 am", "depart at 6 pm"
        tod_match = re.search(r"\b(?:at|around)\s*(\d{1,2})\s*(am|pm)\b", text)
        if tod_match:
            target_h = int(tod_match.group(1))
            if tod_match.group(2) == "pm" and target_h < 12:
                target_h += 12
            elif tod_match.group(2) == "am" and target_h == 12:
                target_h = 0
            # Assume tomorrow at target_h (or day offset)
            new_offset = 24 + target_h
            hours = new_offset - prev_offset
            sign = "+" if hours > 0 else ""
            label = f"Departure at {target_h:02d}:00 ({sign}{hours}h Shift)"
            return new_offset, label, hours

        # 4. Check for evening/night expressions: "depart in the evening", "tomorrow night", "tomorrow evening"
        if re.search(r"\b(tomorrow\s+evening|tomorrow\s+night|in\s+the\s+evening|at\s+night)\b", text):
            new_offset = 32  # Evening (~18:00 tomorrow)
            hours = new_offset - prev_offset
            label = "Tomorrow Evening (18:00 - 00:00)"
            return new_offset, label, hours

        return None
