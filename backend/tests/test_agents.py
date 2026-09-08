import pytest
from app.models.schemas import UserQueryRequest, QueryIntent
from app.agents.orchestrator import orchestrator

@pytest.mark.asyncio
async def test_marine_safety_query():
    req = UserQueryRequest(query="Is it safe to go fishing tomorrow morning near Visakhapatnam?")
    res = await orchestrator.execute_query(req)
    assert res.intent == QueryIntent.MARINE_SAFETY
    assert res.location.name == "Visakhapatnam"
    assert res.risk_assessment is not None
    assert res.ocean_conditions is not None
    assert res.weather_conditions is not None
    assert len(res.agent_activity) >= 4
    assert len(res.evidence) >= 3
    assert res.visualization_plan.result_type == "marine_safety"

@pytest.mark.asyncio
async def test_fishing_zones_query():
    req = UserQueryRequest(query="Show potential fishing zones within 40 km of Visakhapatnam with favorable chlorophyll")
    res = await orchestrator.execute_query(req)
    assert res.intent == QueryIntent.FISHING_ZONES
    assert res.fishing_zones is not None
    assert len(res.fishing_zones) > 0
    assert res.visualization_plan.result_type == "fishing_zones"
    assert any(layer.layer_id == "layer_pfz" for layer in res.map_layers)

@pytest.mark.asyncio
async def test_route_analysis_query():
    req = UserQueryRequest(query="Does the vessel route from Kakinada to Visakhapatnam cross protected waters?")
    res = await orchestrator.execute_query(req)
    assert res.intent == QueryIntent.ROUTE_ANALYSIS
    assert res.route_analysis is not None
    assert len(res.route_analysis.waypoints) >= 2
    assert res.visualization_plan.result_type == "route_analysis"

@pytest.mark.asyncio
async def test_regional_comparison_query():
    req = UserQueryRequest(query="Compare ocean conditions and wave height between Chennai and Visakhapatnam")
    res = await orchestrator.execute_query(req)
    assert res.intent == QueryIntent.REGIONAL_COMPARISON
    assert res.comparison_data is not None
    assert len(res.comparison_data.metrics) >= 2
    assert res.visualization_plan.result_type == "regional_comparison"

@pytest.mark.asyncio
async def test_multilingual_telugu_query():
    req = UserQueryRequest(query="విశాఖపట్నం దగ్గర రేపు ఉదయం సముద్ర పరిస్థితులు ఎలా ఉన్నాయి? Explain in Telugu")
    res = await orchestrator.execute_query(req)
    assert res.detected_language == "te"
    assert "సముద్ర" in res.executive_summary or "భద్రత" in res.executive_summary
