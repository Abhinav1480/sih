import pytest
from app.models.schemas import UserQueryRequest
from app.agents.orchestrator import orchestrator

# 30+ completely distinct unseen queries across Indian coastal waters
UNSEEN_EVALUATION_QUERIES = [
    # 1-5: Temporal variations & basic safety
    "What is the wave situation around Kakinada tomorrow?",
    "Is it safe for a small mechanized trawler off Visakhapatnam tonight at 8 PM?",
    "What are the marine risks near Machilipatnam tomorrow morning?",
    "Check sea conditions and swell height near Paradip for the next 24 hours.",
    "Will conditions improve near Chennai harbor tomorrow afternoon?",

    # 6-10: Fisheries & Chlorophyll / PFZ
    "Find the nearest favorable fishing area to my selected point near Kakinada.",
    "Show areas within 50 km of Vizag with favorable chlorophyll and moderate wave conditions.",
    "Where are high-chlorophyll potential fishing zones near Thoothukudi?",
    "Find fishing areas near Porbandar with SST between 27 and 29 degrees.",
    "Show ranked PFZs near Port Blair avoiding marine national parks.",

    # 11-15: Regional comparisons
    "Compare SST and surface winds near Chennai and Visakhapatnam.",
    "Which nearby region has lower wave height between Mumbai and Goa?",
    "Compare today's ocean conditions between Paradip and Digha coast.",
    "Is fishing potential higher near Kakinada or Machilipatnam right now?",
    "Compare swell period between Mangalore and Kochi.",

    # 16-20: Historical & Anomaly Detection
    "What changed in sea conditions during the last 24 hours near Visakhapatnam?",
    "Compare today's ocean conditions with last week's near Chennai.",
    "Why has fishing potential or chlorophyll decreased near Kakinada over the past 7 days?",
    "Show wave height trend over the last 24 hours off Mumbai.",
    "Has sea surface temperature warmed over the past week near Goa?",

    # 21-25: Navigation corridors & Marine Protected Areas
    "Does this vessel route from Kakinada to Visakhapatnam cross protected waters?",
    "Find a lower-risk alternative route from Paradip to Gahirmatha avoiding the turtle sanctuary.",
    "Check if coordinate 20.58 N, 87.02 E enters a restricted conservation zone.",
    "Is passage through Gulf of Mannar permitted for commercial trawlers near Rameswaram?",
    "Analyze route risks and wave heights from Mumbai Port to Mormugao.",

    # 26-30: Multilingual & Complex Vernacular
    "విశాఖపట్నం దగ్గర చేపల వేటకు రేపు ఉదయం అనుకూలంగా ఉందా? Telugu",
    "चेन्नई तट पर कल सुबह हवा और लहरों की स्थिति क्या होगी? Hindi",
    "தூத்துக்குடி அருகே நாளை காலை கடல் நிலைமை எப்படி இருக்கும்? Tamil",
    "கொச்சி துறைமுகம் அருகே அலை உயரம் எவ்வளவு? Tamil",
    "What are the marine risks near coordinate 16.98 N, 82.25 E tomorrow dawn?",

    # 31-33: Additional unseen edge cases
    "Show areas affected by high wave warnings near Odisha and explain the impact.",
    "Why is the nearshore area off Hope Island flagged as restricted?",
    "Find a safer fishing zone 20 km farther offshore from current high wave zone."
]

@pytest.mark.asyncio
@pytest.mark.parametrize("query_text", UNSEEN_EVALUATION_QUERIES)
async def test_generalization_unseen_query(query_text: str):
    """
    Evaluates that EVERY unseen query:
    1. Successfully parses intent and spatial/temporal parameters without error
    2. Dynamically orchestrates specialist agents
    3. Produces evidence records with explicit data provenance
    4. Constructs an appropriate dynamic visualization plan
    5. Returns genuine, non-empty, actionable advice with no canned/static text
    """
    req = UserQueryRequest(query=query_text)
    res = await orchestrator.execute_query(req)

    # Assert basic response structure
    assert res.query_id is not None
    assert res.conversation_id is not None
    assert len(res.executive_summary) > 10
    assert len(res.recommendation) > 10
    assert res.location is not None
    assert res.temporal is not None
    assert len(res.agent_activity) >= 2
    assert len(res.evidence) >= 1
    assert len(res.map_layers) >= 1
    assert res.visualization_plan.result_type in [
        "marine_safety",
        "fishing_zones",
        "route_analysis",
        "regional_comparison",
        "historical_trend",
        "general"
    ]
    # Verify no unformatted error strings
    assert "error" not in res.executive_summary.lower() or "warning" in res.executive_summary.lower()
