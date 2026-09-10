"""Intent classification for the ORCA planner.

Scored keyword matching, not an ordered cascade.

The previous implementation returned on the first matching keyword, so
"safest route" matched `safe` and "which fishing zones should be avoided due
to hazardous conditions" matched `hazard`, both collapsing into the marine
safety branch. Five of the eight canonical problem-statement queries returned
the wrong card as a result.

Scoring lets a specific multi-word domain phrase ("fishing zone", "safest
route") outweigh an incidental single word. Weights are hand-tuned against the
eight canonical queries and the 33 generalisation queries; any change here
must keep `backend/tests/test_intent_classification.py` green.

Note `\\bsafe\\b` deliberately does not match "safest" or "safer" — that word
boundary is what routes canonical query 6 to ROUTE_ANALYSIS.
"""

import re
from typing import Dict, List, Tuple

from app.models.schemas import QueryIntent

# Ordered most-specific-intent first. Iteration order doubles as the
# deterministic tie-break when two intents score equally.
INTENT_SIGNALS: Dict[QueryIntent, List[Tuple[str, float]]] = {
    QueryIntent.ROUTE_ANALYSIS: [
        (r"\bsafest route\b", 4.0),
        (r"\broutes?\b", 3.0),
        (r"\bpassage\b", 3.0),
        (r"\btransit\b", 2.5),
        (r"\bcorridor\b", 2.5),
        (r"\bvoyage\b", 2.5),
        (r"\bnavigat\w*\b", 2.0),
        (r"\bfrom .{2,30} to \b", 2.0),
        (r"\bvessel\b", 1.0),
    ],
    QueryIntent.REGIONAL_COMPARISON: [
        (r"\bcompare\w*\b", 6.0),
        (r"\bcomparison\b", 4.0),
        (r"\bdifference between\b", 4.0),
        (r"\bversus\b", 3.5),
        (r"\bvs\b", 3.5),
        (r"\bbetter conditions\b", 2.5),
        (r"\bbetween .{2,30} and \b", 2.0),
        (r"\bwhich (?:region|area|sector|nearby)\w*\b", 2.0),
    ],
    QueryIntent.FISHING_ZONES: [
        (r"\bfishing zones?\b", 6.0),
        (r"\bpfzs?\b", 5.0),
        (r"\bpotential fishing\b", 4.0),
        (r"\bfishing (?:area|ground|spot)s?\b", 4.0),
        (r"\bchlorophyll\b", 4.0),
        (r"\bwhere to fish\b", 3.5),
        (r"\bfish catch\b", 3.0),
        (r"\bthermal front\w*\b", 2.5),
        (r"\btuna\b", 2.0),
        (r"\btrawling\b", 1.5),
        (r"\bhigh chlorophyll\b", 1.0),
    ],
    QueryIntent.HISTORICAL_TREND: [
        (r"\bdeclin\w*\b", 3.5),
        (r"\bdecreas\w*\b", 3.5),
        (r"\btrends?\b", 3.0),
        (r"\banomal\w*\b", 3.0),
        (r"\bhistorical\b", 3.0),
        (r"\bover the (?:last|past)\b", 3.0),
        (r"\b(?:last|past) (?:week|month|24 hours|7 days|30 days)\b", 3.0),
        (r"\bwarmed\b", 2.5),
        (r"\bchanged?\b", 2.0),
        (r"\byesterday\b", 1.5),
    ],
    QueryIntent.GEOFENCE_RESTRICTION: [
        (r"\bimbl\b", 4.0),
        (r"\bmarine national park\b", 3.5),
        (r"\bmaritime boundar\w*\b", 3.5),
        (r"\beez\b", 3.5),
        (r"\bgeofenc\w*\b", 3.0),
        (r"\bsanctuar\w*\b", 3.0),
        (r"\bno-?take\b", 3.0),
        (r"\bprotected\b", 2.5),
        (r"\brestrict\w*\b", 2.0),
        (r"\bwildlife\b", 2.0),
    ],
    QueryIntent.WEATHER_FORECAST: [
        (r"\blightning\b", 3.5),
        (r"\bcyclones?\b", 3.5),
        (r"\bstorms?\b", 3.0),
        (r"\bsquall\w*\b", 3.0),
        (r"\bthunder\w*\b", 3.0),
        (r"\bdepression\b", 2.5),
        (r"\bwarnings?\b", 2.0),
        (r"\bforecast\b", 2.0),
        (r"\balerts?\b", 2.0),
        (r"\bbulletins?\b", 2.0),
        (r"\bweather\b", 2.0),
        (r"\brain\w*\b", 2.0),
        (r"\bprecipitation\b", 2.0),
        (r"\bgusts?\b", 2.0),
        (r"\bwinds?\b", 1.5),
    ],
    QueryIntent.OCEAN_CONDITIONS: [
        (r"\btides?\b", 3.0),
        (r"\bsea (?:condition|state)s?\b", 3.0),
        (r"\bocean conditions?\b", 3.0),
        (r"\bswell\b", 2.5),
        (r"\bsst\b", 2.5),
        (r"\bsea surface temperature\b", 2.5),
        (r"\bwaves?\b", 2.0),
        (r"\bwave height\b", 2.0),
        (r"\bcurrents?\b", 2.0),
    ],
    QueryIntent.EXPLAINABILITY: [
        (r"\bhow did you\b", 3.5),
        (r"\bwhy\b", 3.0),
        (r"\bjustif\w*\b", 3.0),
        (r"\breason\w*\b", 2.5),
        (r"\bwhat made\b", 2.5),
        (r"\bexplain why\b", 2.0),
    ],
    QueryIntent.MARINE_SAFETY: [
        (r"\bis it safe\b", 4.0),
        (r"\bcan i (?:go|venture|sail)\b", 3.5),
        (r"\bsafe to\b", 3.0),
        (r"\bventure into the sea\b", 3.0),
        (r"\bdanger\w*\b", 2.5),
        (r"\bsafe\b", 2.0),
        (r"\bsafety\b", 2.0),
        (r"\brisk\w*\b", 2.0),
        (r"\badvisable\b", 2.0),
        (r"\bhazard\w*\b", 1.5),
        (r"\bwarning\b", 1.0),
    ],
}

INTENT_PRIORITY: List[QueryIntent] = list(INTENT_SIGNALS.keys())

# A query written entirely in a regional script scores zero against these
# English signals and lands here. BE-09 replaces this with real vernacular
# intent detection.
DEFAULT_INTENT = QueryIntent.MARINE_SAFETY

_COMPILED: Dict[QueryIntent, List[Tuple["re.Pattern[str]", float]]] = {
    intent: [(re.compile(pattern), weight) for pattern, weight in signals]
    for intent, signals in INTENT_SIGNALS.items()
}


def score_intents(text: str) -> Dict[QueryIntent, float]:
    """Signal score for every intent. Exposed so tests can show their working."""
    lowered = text.lower()
    return {
        intent: round(sum(w for rx, w in signals if rx.search(lowered)), 2)
        for intent, signals in _COMPILED.items()
    }


def classify_intent(text: str) -> Tuple[QueryIntent, Dict[QueryIntent, float]]:
    """Returns the winning intent and the full score table."""
    scores = score_intents(text)
    best = max(INTENT_PRIORITY, key=lambda i: (scores[i], -INTENT_PRIORITY.index(i)))
    if scores[best] <= 0.0:
        return DEFAULT_INTENT, scores
    return best, scores
