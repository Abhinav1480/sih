import pytest
import uuid
from app.models.schemas import UserQueryRequest, QueryIntent
from app.agents.orchestrator import orchestrator
from app.database.repository import (
    get_cached_conversation_context,
    set_cached_conversation_context,
)

@pytest.mark.asyncio
async def test_five_turn_conversation_sequence():
    """
    CRITICAL ACCEPTANCE TEST: 5-Turn Conversational Follow-Up Sequence
    Verifies that follow-up route queries preserve context, resolve candidate routes,
    support comparisons, handle time-shifts, and resolve references like 'destination',
    while preventing context contamination for unrelated queries.
    """
    conv_id = str(uuid.uuid4())

    # =========================================================================
    # TURN 1: Initial Route Analysis Request
    # "Find a lower-risk route from Kakinada to Visakhapatnam that avoids protected waters tomorrow morning."
    # =========================================================================
    t1_text = "Find a lower-risk route from Kakinada to Visakhapatnam that avoids protected waters tomorrow morning."
    t1_req = UserQueryRequest(query=t1_text, conversation_id=conv_id)
    t1_res = await orchestrator.execute_query(t1_req)

    assert t1_res.needs_clarification is False
    assert t1_res.intent == QueryIntent.ROUTE_ANALYSIS
    assert t1_res.route_analysis is not None
    ra1 = t1_res.route_analysis
    assert "Kakinada" in ra1.origin.name
    assert "Visakhapatnam" in ra1.destination.name
    assert len(ra1.candidate_routes) >= 2
    assert ra1.selected_route_id == "recommended"
    assert t1_res.route_comparison is not None

    # Verify structured memory persistence in cache
    ctx = get_cached_conversation_context(conv_id)
    state = ctx.get("state", {})
    assert state.get("origin") is not None
    assert "Kakinada" in state["origin"]["name"]
    assert state.get("destination") is not None
    assert "Visakhapatnam" in state["destination"]["name"]
    assert len(state.get("candidate_routes", [])) >= 2
    assert state.get("selected_route_id") == "recommended"

    # =========================================================================
    # TURN 2: Alternative Route Follow-Up
    # "What happens if I choose the alternative route instead?"
    # =========================================================================
    t2_text = "What happens if I choose the alternative route instead?"
    t2_req = UserQueryRequest(query=t2_text, conversation_id=conv_id)
    t2_res = await orchestrator.execute_query(t2_req)

    # MUST NOT enter clarification
    assert t2_res.needs_clarification is False
    assert t2_res.intent in [QueryIntent.ROUTE_FOLLOW_UP, QueryIntent.ROUTE_COMPARISON]
    assert t2_res.route_analysis is not None
    ra2 = t2_res.route_analysis
    assert "Kakinada" in ra2.origin.name
    assert "Visakhapatnam" in ra2.destination.name
    # Alternative route is now selected
    assert ra2.selected_route_id == "alternative"
    assert ra2.total_distance_km == 129.0
    # The band is the risk engine's call, not the agent's. What is deterministic
    # here: the sanctuary crossing is a named factor in the breakdown, it is the
    # only thing separating the two corridors, and the breakdown sums to the score.
    alt = next(c for c in ra2.candidate_routes if c.id == "alternative")
    rec = next(c for c in ra2.candidate_routes if c.id == "recommended")
    geofence = [f for f in alt.risk_factors if "Geofence" in f.name]
    assert len(geofence) == 1 and geofence[0].points_added > 0
    assert alt.risk_score - rec.risk_score == geofence[0].points_added
    assert sum(f.points_added for f in alt.risk_factors) == alt.risk_score
    assert ra2.overall_route_risk == alt.marine_risk
    assert ra2.overall_route_risk.value in ("MODERATE", "HIGH", "SEVERE")
    assert ra2.crosses_protected_waters is True
    # Has trade-off comparison data
    assert t2_res.route_comparison is not None
    assert len(t2_res.route_comparison.metrics) >= 4

    # Verify cache updated selected_route_id to alternative
    ctx2 = get_cached_conversation_context(conv_id)
    assert ctx2.get("state", {}).get("selected_route_id") == "alternative"
    assert ctx2.get("selected_route_id") == "alternative"

    # =========================================================================
    # TURN 3: Compare It with Recommended Route
    # "Compare it with the recommended route."
    # =========================================================================
    t3_text = "Compare it with the recommended route."
    t3_req = UserQueryRequest(query=t3_text, conversation_id=conv_id)
    t3_res = await orchestrator.execute_query(t3_req)

    assert t3_res.needs_clarification is False
    assert t3_res.intent == QueryIntent.ROUTE_COMPARISON
    assert t3_res.route_analysis is not None
    assert "Kakinada" in t3_res.route_analysis.origin.name
    assert "Visakhapatnam" in t3_res.route_analysis.destination.name
    assert t3_res.route_analysis.selected_route_id == "alternative"
    assert t3_res.route_comparison is not None
    # Must produce true comparison narrative, not single evaluation
    assert "Route Corridor Comparison" in t3_res.executive_summary
    assert "Trade-Off" in t3_res.recommendation
    metric_names = [m.metric_name for m in t3_res.route_comparison.metrics]
    assert "Distance" in metric_names
    assert "Marine Risk" in metric_names
    assert "Protected Area" in metric_names

    # =========================================================================
    # TURN 4: Relative Temporal Shift on Selected Alternative Route
    # "What if I leave two hours later?"
    # MUST evaluate selected alternative route (129 km, NOT revert to 140.6 km)
    # =========================================================================
    t4_text = "What if I leave two hours later?"
    t4_req = UserQueryRequest(query=t4_text, conversation_id=conv_id)
    t4_res = await orchestrator.execute_query(t4_req)

    assert t4_res.needs_clarification is False
    assert t4_res.route_analysis is not None
    ra4 = t4_res.route_analysis
    assert "Kakinada" in ra4.origin.name
    assert "Visakhapatnam" in ra4.destination.name
    # CRITICAL: selected_route_id remains alternative and distance remains 129.0 km
    assert ra4.selected_route_id == "alternative"
    assert ra4.total_distance_km == 129.0
    assert ra4.crosses_protected_waters is True
    # Temporal horizon shifted
    assert t4_res.temporal.offset_hours == 26  # 24h tomorrow morning baseline + 2h
    assert "Selected Alternative Corridor" in t4_res.executive_summary

    # =========================================================================
    # TURN 5: Compare Shifted Route with Original Recommended Route
    # "Now compare that with the original recommended route."
    # =========================================================================
    t5_text = "Now compare that with the original recommended route."
    t5_req = UserQueryRequest(query=t5_text, conversation_id=conv_id)
    t5_res = await orchestrator.execute_query(t5_req)

    assert t5_res.needs_clarification is False
    assert t5_res.intent == QueryIntent.ROUTE_COMPARISON
    assert t5_res.route_analysis is not None
    assert t5_res.route_comparison is not None
    assert "Route Corridor Comparison" in t5_res.executive_summary
    assert t5_res.route_analysis.selected_route_id == "alternative"
    assert t5_res.temporal.offset_hours == 26

    # =========================================================================
    # TURN 6: Cross-Intent Reference to Destination
    # "Now find the best fishing zones near the destination."
    # =========================================================================
    t6_text = "Now find the best fishing zones near the destination."
    t6_req = UserQueryRequest(query=t6_text, conversation_id=conv_id)
    t6_res = await orchestrator.execute_query(t6_req)

    assert t6_res.needs_clarification is False
    assert t6_res.intent == QueryIntent.FISHING_ZONES
    # Location resolved to Visakhapatnam (the destination of the route!)
    assert "Visakhapatnam" in t6_res.location.name
    assert t6_res.fishing_zones is not None
    assert len(t6_res.fishing_zones) > 0

    # =========================================================================
    # UNRELATED QUERY SAFETY: "Find fishing zones near Chennai."
    # Must NOT inherit Kakinada or Visakhapatnam
    # =========================================================================
    unrelated_text = "Find fishing zones near Chennai."
    unrelated_req = UserQueryRequest(query=unrelated_text, conversation_id=conv_id)
    unrelated_res = await orchestrator.execute_query(unrelated_req)

    assert unrelated_res.needs_clarification is False
    assert unrelated_res.intent == QueryIntent.FISHING_ZONES
    assert "Chennai" in unrelated_res.location.name
    assert "Visakhapatnam" not in unrelated_res.location.name
    assert "Kakinada" not in unrelated_res.location.name
