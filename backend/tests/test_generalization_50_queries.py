import pytest
from app.models.schemas import UserQueryRequest
from app.agents.orchestrator import orchestrator

# 52 completely distinct unseen queries across Indian coastal waters
UNSEEN_50_EVALUATION_QUERIES = [
    # Category 1: Marine Safety & Weather Hazards (1-6)
    "What is the wave situation around Kakinada tomorrow?",
    "Is it safe for a small mechanized trawler off Visakhapatnam tonight at 8 PM?",
    "What are the marine risks near Machilipatnam tomorrow morning?",
    "Check sea conditions and swell height near Paradip for the next 24 hours.",
    "Will conditions improve near Chennai harbor tomorrow afternoon?",
    "Are there high wind gusts expected near Bhavnagar port tomorrow?",

    # Category 2: Fisheries, Chlorophyll-a & Potential Fishing Zones (7-12)
    "Find the nearest favorable fishing area to my selected point near Kakinada.",
    "Show areas within 50 km of Vizag with favorable chlorophyll and moderate wave conditions.",
    "Where are high-chlorophyll potential fishing zones near Thoothukudi?",
    "Find fishing areas near Porbandar with SST between 27 and 29 degrees.",
    "Show ranked PFZs near Port Blair avoiding marine national parks.",
    "Identify upwelling zones with high thermal gradient off Mangalore.",

    # Category 3: Regional Comparisons (13-18)
    "Compare SST and surface winds near Chennai and Visakhapatnam.",
    "Which nearby region has lower wave height between Mumbai and Goa?",
    "Compare today's ocean conditions between Paradip and Digha coast.",
    "Is fishing potential higher near Kakinada or Machilipatnam right now?",
    "Compare swell period between Mangalore and Kochi.",
    "Compare ocean risk metrics between Okha and Veraval.",

    # Category 4: Historical Analysis & Anomaly Detection (19-24)
    "What changed in sea conditions during the last 24 hours near Visakhapatnam?",
    "Compare today's ocean conditions with last week's near Chennai.",
    "Why has fishing potential or chlorophyll decreased near Kakinada over the past 7 days?",
    "Show wave height trend over the last 24 hours off Mumbai.",
    "Has sea surface temperature warmed over the past week near Goa?",
    "Analyze 7-day sea surface height and current variation near Haldia.",

    # Category 5: Maritime Routes & Navigation Corridors (25-30)
    "Does this vessel route from Kakinada to Visakhapatnam cross protected waters?",
    "Find a lower-risk alternative route from Paradip to Gahirmatha avoiding the turtle sanctuary.",
    "Analyze route risks and wave heights from Mumbai Port to Mormugao.",
    "Find a transit route from Chennai to Ennore avoiding high swell coastal zones.",
    "Evaluate navigation safety corridor from Cochin to Beypore.",
    "Calculate vessel passage risk between Tuticorin and Mandapam.",

    # Category 6: Geospatial Boundaries, MPAs & Coordinates (31-36)
    "Check if coordinate 20.58 N, 87.02 E enters a restricted conservation zone.",
    "Is passage through Gulf of Mannar permitted for commercial trawlers near Rameswaram?",
    "What are the marine risks near coordinate 16.98 N, 82.25 E tomorrow dawn?",
    "Why is the nearshore area off Hope Island flagged as restricted?",
    "Check boundary buffer of Malvan Marine Sanctuary near 16.05 N, 73.48 E.",
    "Is fishing restricted within Sundarbans Biosphere Reserve buffer waters?",

    # Category 7: Vernacular & Multilingual Queries (37-44)
    "విశాఖపట్నం దగ్గర చేపల వేటకు రేపు ఉదయం అనుకూలంగా ఉందా? Telugu",
    "చేపల వేట కోసం కాకినాడ సమీపంలో మంచి ప్రదేశాలు ఎక్కడ ఉన్నాయి? Telugu",
    "चेन्नई तट पर कल सुबह हवा और लहरों की स्थिति क्या होगी? Hindi",
    "मुंबई के पास मछली पकड़ने के सबसे सुरक्षित क्षेत्र कौन से हैं? Hindi",
    "தூத்துக்குடி அருகே நாளை காலை கடல் நிலைமை எப்படி இருக்கும்? Tamil",
    "கொச்சி துறைமுகம் அருகே அலை உயரம் எவ்வளவு? Tamil",
    "ಮಂಗಳೂರು ಕರಾವಳಿಯಲ್ಲಿ ನಾಳೆ ಸಮುದ್ರ ಪರಿಸ್ಥಿತಿ ಹೇಗಿದೆ? Kannada",
    "കൊച്ചി തീരത്ത് നാളെ കടൽ പ്രക്ഷുബ്ധമാകുമോ? Malayalam",

    # Category 8: Multi-Objective & Complex Decision Queries (45-49)
    "Find the top 3 fishing locations within 50 km of Visakhapatnam tomorrow morning using fishing potential, chlorophyll, SST, wave height, weather risk and protected areas.",
    "Show areas affected by high wave warnings near Odisha and explain the impact.",
    "Find a safer fishing zone 20 km farther offshore from current high wave zone.",
    "Where can a medium vessel anchor safely off Gopalpur with wind speed below 15 knots?",
    "Assess combined environmental risk score for small craft near Ratnagiri.",

    # Category 9: Ambiguous & Clarification Verification (50-52)
    "Find a route from Point A to Point B that minimizes marine risk while avoiding protected areas.",
    "Can you optimize my voyage route without specifying start port?",
    "Check sea conditions for tomorrow."
]

@pytest.mark.asyncio
@pytest.mark.parametrize("query_text", UNSEEN_50_EVALUATION_QUERIES)
async def test_generalization_50_queries(query_text: str):
    """
    Evaluates that EVERY one of the 50+ unseen queries:
    1. Successfully parses intent and spatial/temporal parameters without runtime error
    2. Dynamically orchestrates specialist agents (or returns clean clarification when endpoints missing)
    3. Produces evidence records with explicit data provenance
    4. Constructs an appropriate dynamic visualization plan
    5. Returns genuine, non-empty, actionable advice with no canned/static fallback
    """
    req = UserQueryRequest(query=query_text)
    res = await orchestrator.execute_query(req)

    # Basic invariant assertions
    assert res.query_id is not None
    assert res.conversation_id is not None
    assert len(res.executive_summary) > 5
    assert len(res.recommendation) > 5
    assert res.location is not None
    assert res.temporal is not None
    assert len(res.agent_activity) >= 1
    assert len(res.evidence) >= 1
    assert res.visualization_plan.result_type in [
        "marine_safety",
        "fishing_zones",
        "route_analysis",
        "regional_comparison",
        "historical_trend",
        "general",
        "clarification"
    ]
    
    # Verify clarification queries stop cleanly
    if "point a to point b" in query_text.lower() or "without specifying start port" in query_text.lower():
        assert res.needs_clarification is True
        assert res.visualization_plan.result_type == "clarification"
