"""Intent routing for the eight canonical problem-statement queries.

The old classifier was an ordered substring cascade, so a generic token in an
early branch swallowed queries that belonged elsewhere: "safest route" matched
`safe`, "zones to avoid due to hazardous conditions" matched `hazard`, and both
returned a marine-safety card. These tests pin the routing so that regression
cannot come back silently.
"""

import pytest

from app.agents.planner import OrcaPlanner
from app.models.schemas import QueryIntent

planner = OrcaPlanner()


# The eight canonical queries from PS 26176, verbatim.
CANONICAL_QUERIES = [
    ("Where is the nearest Potential Fishing Zone today?", QueryIntent.FISHING_ZONES),
    ("Is it safe to venture into the sea tomorrow morning?", QueryIntent.MARINE_SAFETY),
    ("What are the tide, weather and sea conditions near my fishing location?", QueryIntent.OCEAN_CONDITIONS),
    ("Are there any lightning or cyclone alerts in my area?", QueryIntent.WEATHER_FORECAST),
    ("Which regions show high chlorophyll concentration and favourable sea surface temperature?", QueryIntent.FISHING_ZONES),
    ("What is the safest route for a fishing vessel considering weather and sea state conditions?", QueryIntent.ROUTE_ANALYSIS),
    ("Why has fish productivity declined in a particular coastal region?", QueryIntent.HISTORICAL_TREND),
    ("Which fishing zones should be avoided due to hazardous marine conditions or geofencing restrictions?", QueryIntent.FISHING_ZONES),
]


@pytest.mark.parametrize("query,expected", CANONICAL_QUERIES, ids=[q[:45] for q, _ in CANONICAL_QUERIES])
def test_canonical_query_routes_to_correct_intent(query, expected):
    assert planner._classify_intent(query.lower()) == expected


@pytest.mark.parametrize("query,expected", [
    # "safest" must not match the \bsafe\b safety signal.
    ("What is the safest route from Chennai to Kakinada?", QueryIntent.ROUTE_ANALYSIS),
    ("Plot a safer passage avoiding the storm", QueryIntent.ROUTE_ANALYSIS),
    # "hazardous" must not outweigh a named deliverable.
    ("List fishing zones to avoid due to hazardous seas", QueryIntent.FISHING_ZONES),
    # A safety question that mentions fishing is still a safety question.
    ("Is it safe to go fishing tomorrow morning near Visakhapatnam?", QueryIntent.MARINE_SAFETY),
    ("Can I go out to sea this evening?", QueryIntent.MARINE_SAFETY),
    # Comparison beats the domain words it contains.
    ("Compare ocean conditions and wave height between Chennai and Visakhapatnam", QueryIntent.REGIONAL_COMPARISON),
    # Route beats the protected-area words it contains.
    ("Does the vessel route from Kakinada to Visakhapatnam cross protected waters?", QueryIntent.ROUTE_ANALYSIS),
    # Geofencing without a named deliverable stays a geofence query.
    ("Am I approaching the international maritime boundary line?", QueryIntent.GEOFENCE_RESTRICTION),
    # Trend beats explainability when the question is about a change over time.
    ("Why has chlorophyll declined near Kakinada over the last month?", QueryIntent.HISTORICAL_TREND),
])
def test_ambiguous_queries_route_to_the_specific_handler(query, expected):
    assert planner._classify_intent(query.lower()) == expected


def test_language_instruction_is_not_an_explainability_request():
    """"Explain in Telugu" asks for a language, not for a justification.

    Bare "explain" is deliberately absent from the explainability signals; if
    it were present this query would route to EXPLAINABILITY and the user
    would get a rationale instead of the conditions they asked for.
    """
    query = "sea conditions near visakhapatnam tomorrow morning? explain in telugu"
    assert planner._classify_intent(query) != QueryIntent.EXPLAINABILITY


def test_unmatched_query_falls_back_to_safety_rather_than_guessing():
    """A query in a script we have no signals for must not pick a random intent."""
    assert planner._classify_intent("విశాఖపట్నం దగ్గర సముద్ర పరిస్థితులు") == QueryIntent.MARINE_SAFETY


def test_no_canonical_query_string_is_hardcoded_to_an_answer():
    """Routing must come from signals, not from memorised query strings.

    Paraphrasing every canonical query must preserve its intent. If any of
    these fail because someone keyed a fixture to the exact wording, the
    platform will collapse on the unseen queries it is actually judged on.
    """
    paraphrased = [
        ("find me the closest good fishing ground right now", QueryIntent.FISHING_ZONES),
        ("can i take the boat out at dawn tomorrow", QueryIntent.MARINE_SAFETY),
        ("give me the swell and tide state off my village", QueryIntent.OCEAN_CONDITIONS),
        ("any thunderstorm warnings nearby", QueryIntent.WEATHER_FORECAST),
        ("plot the calmest passage for a trawler", QueryIntent.ROUTE_ANALYSIS),
    ]
    for query, expected in paraphrased:
        assert planner._classify_intent(query) == expected, query
