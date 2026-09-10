import pytest
from app.models.schemas import UserQueryRequest
from app.agents.orchestrator import orchestrator
from app.agents.planner import planner

@pytest.mark.asyncio
async def test_regression_1_route_clarification_no_fallthrough():
    """
    CRITICAL REGRESSION TEST 1:
    "Find a route from Point A to Point B that minimizes marine risk while avoiding protected areas."
    MUST:
    - Identify intent / sub-intent as route_optimization / needs_clarification
    - Identify missing origin & destination
    - Set can_execute = False
    - Return a clarification response asking for endpoints
    - STOP execution immediately with NO fallthrough to Visakhapatnam or generic marine safety
    """
    query = "Find a route from Point A to Point B that minimizes marine risk while avoiding protected areas."
    
    # 1. Planner unit check
    plan = planner.parse_plan(query)
    assert plan["can_execute"] is False
    assert len(plan["missing_information"]) > 0
    missing_str = " ".join(plan["missing_information"]).lower()
    assert "departure" in missing_str or "origin" in missing_str or "destination" in missing_str or "port" in missing_str
    
    # 2. Orchestrator full flow check
    req = UserQueryRequest(query=query)
    res = await orchestrator.execute_query(req)
    
    # Must be marked as needs_clarification
    assert res.needs_clarification is True
    assert res.visualization_plan.result_type == "clarification"
    # Must NOT have assumed Visakhapatnam
    assert res.location.name != "Visakhapatnam" or "point" in res.location.name.lower() or "unspecified" in res.location.name.lower()
    # Must ask for endpoints
    assert "specify" in res.recommendation.lower() or "port" in res.recommendation.lower() or "destination" in res.recommendation.lower()
    # Must NOT render generic marine safety
    assert "marine safety assessment" not in res.executive_summary.lower()

@pytest.mark.asyncio
async def test_regression_2_valid_route_optimization():
    """
    CRITICAL REGRESSION TEST 2:
    "Find a lower-risk route from Visakhapatnam to Kakinada while avoiding protected areas."
    MUST:
    - Execute route optimization workflow
    - Identify origin (Visakhapatnam) and destination (Kakinada)
    - Produce route_analysis result type
    - Check Marine Protected Areas (e.g. Coringa)
    - Generate route polylines and navigation layers
    """
    query = "Find a lower-risk route from Visakhapatnam to Kakinada while avoiding protected areas."
    req = UserQueryRequest(query=query)
    res = await orchestrator.execute_query(req)
    
    assert res.needs_clarification is False
    assert res.visualization_plan.result_type == "route_analysis"
    assert res.route_analysis is not None
    assert "visakhapatnam" in res.route_analysis.origin.name.lower()
    assert "kakinada" in res.route_analysis.destination.name.lower()
    assert len(res.route_analysis.waypoints) >= 2
    assert res.route_analysis.total_distance_km > 0
    # Must include map layers with LineString features
    assert len(res.map_layers) >= 1
    has_linestring = any(
        layer.layer_type == "linestring" or any(f.geometry.get("type") == "LineString" for f in layer.features)
        for layer in res.map_layers
    )
    assert has_linestring is True

@pytest.mark.asyncio
async def test_regression_3_fishing_recommendation_ranking():
    """
    CRITICAL REGRESSION TEST 3:
    "Find the top 3 fishing locations within 50 km of Visakhapatnam tomorrow morning using fishing potential, chlorophyll, SST, wave height, weather risk and protected areas."
    MUST:
    - Identify intent as fishing_recommendation / PFZ
    - Produce fishing_zones result type
    - Return ranked locations with chlorophyll, SST, depth, risk, MPA status
    - Include map layers with fishing zone points and MPA polygons
    """
    query = "Find the top 3 fishing locations within 50 km of Visakhapatnam tomorrow morning using fishing potential, chlorophyll, SST, wave height, weather risk and protected areas."
    req = UserQueryRequest(query=query)
    res = await orchestrator.execute_query(req)
    
    assert res.needs_clarification is False
    assert res.visualization_plan.result_type == "fishing_zones"
    assert res.fishing_zones is not None
    assert len(res.fishing_zones) >= 1
    # Check top ranked zone has environmental metrics
    top_zone = res.fishing_zones[0]
    assert top_zone.suitability_score > 0
    assert top_zone.chlorophyll_mg_m3 > 0
    assert top_zone.sst_c > 0
    assert top_zone.wave_height_m > 0

@pytest.mark.asyncio
async def test_regression_4_regional_comparison():
    """
    CRITICAL REGRESSION TEST 4:
    "Compare Chennai and Visakhapatnam tomorrow morning."
    MUST:
    - Identify intent as regional_comparison
    - Produce regional_comparison result type (NOT generic safety)
    - Contain comparison entities for both Chennai and Visakhapatnam
    - Provide structured metrics comparison (SST, wave height, risk)
    """
    query = "Compare Chennai and Visakhapatnam tomorrow morning."
    req = UserQueryRequest(query=query)
    res = await orchestrator.execute_query(req)
    
    assert res.needs_clarification is False
    assert res.visualization_plan.result_type == "regional_comparison"
    assert res.comparison_data is not None
    names = [res.comparison_data.location_a.name.lower(), res.comparison_data.location_b.name.lower()]
    assert any("chennai" in n for n in names)
    assert any("visakhapatnam" in n for n in names)
    assert len(res.comparison_data.metrics) >= 2

@pytest.mark.asyncio
async def test_regression_5_historical_trend():
    """
    CRITICAL REGRESSION TEST 5:
    "How have wave conditions near Kakinada changed over the last 7 days?"
    MUST:
    - Identify intent as historical_trend / temporal analysis
    - Produce historical_trend result type
    - Return time series data points covering the 7-day period
    - Highlight wave trend / anomaly
    """
    query = "How have wave conditions near Kakinada changed over the last 7 days?"
    req = UserQueryRequest(query=query)
    res = await orchestrator.execute_query(req)
    
    assert res.needs_clarification is False
    assert res.visualization_plan.result_type == "historical_trend"
    assert res.historical_trend is not None
    assert len(res.historical_trend.points) >= 3

@pytest.mark.asyncio
async def test_regression_6_multilingual_telugu():
    """
    CRITICAL REGRESSION TEST 6:
    "విశాఖపట్నం దగ్గర చేపల వేటకు రేపు ఉదయం అనుకూలంగా ఉందా? Telugu"
    MUST:
    - Detect Telugu language / query intent
    - Successfully resolve Visakhapatnam from Telugu text
    - Return structured response with non-empty recommendation
    """
    query = "విశాఖపట్నం దగ్గర చేపల వేటకు రేపు ఉదయం అనుకూలంగా ఉందా? Telugu"
    req = UserQueryRequest(query=query)
    res = await orchestrator.execute_query(req)
    
    assert res.query_id is not None
    assert len(res.recommendation) > 5
    assert len(res.evidence) >= 1
