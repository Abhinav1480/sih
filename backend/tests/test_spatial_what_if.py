import pytest
from app.models.schemas import UserQueryRequest, QueryIntent
from app.agents.orchestrator import orchestrator
from app.agents.planner import planner
from app.geospatial.calculations import destination_point


def test_destination_point_calculation():
    """Verify geodesic destination coordinates computation."""
    # Kakinada is approx (16.9891, 82.2475)
    # Moving 25 km North (bearing 0) should increase lat by ~0.225 degrees, lon unchanged
    t_lat, t_lon = destination_point(16.9891, 82.2475, 25.0, 0.0)
    assert round(t_lat, 2) == 17.21 or round(t_lat, 2) == 17.22
    assert round(t_lon, 2) == 82.25

    # Moving 20 km East (bearing 90) from Chennai (13.0827, 80.2707)
    c_lat, c_lon = destination_point(13.0827, 80.2707, 20.0, 90.0)
    assert round(c_lat, 2) == 13.08
    assert c_lon > 80.27


def test_planner_displacement_param_extraction():
    """Verify planner extracts distance, bearing, and target coords from diverse queries."""
    plan1 = planner.parse_plan(
        "If I move 25 km north of Kakinada tomorrow morning, which marine conditions are likely to change most and why?"
    )
    assert plan1["intent"] == QueryIntent.SPATIAL_WHAT_IF
    assert plan1["displacement_distance_km"] == 25.0
    assert plan1["displacement_direction"].lower() == "north"
    assert plan1["displacement_bearing_deg"] == 0.0
    assert plan1["displaced_location"] is not None

    plan2 = planner.parse_plan(
        "What changes if I move 10 km offshore from Kakinada tomorrow?"
    )
    assert plan2["intent"] == QueryIntent.SPATIAL_WHAT_IF
    assert plan2["displacement_distance_km"] == 10.0
    assert plan2["displacement_bearing_deg"] in [90.0, 110.0, 120.0]

    plan3 = planner.parse_plan(
        "Compare conditions at Chennai and 20 km east of Chennai tomorrow morning."
    )
    assert plan3["intent"] == QueryIntent.SPATIAL_WHAT_IF
    assert plan3["displacement_distance_km"] == 20.0
    assert plan3["displacement_direction"].lower() == "east"


@pytest.mark.asyncio
async def test_scenario_1_kakinada_25km_north():
    """Scenario 1: 25 km north of Kakinada tomorrow morning."""
    req = UserQueryRequest(
        query="If I move 25 km north of Kakinada tomorrow morning, which marine conditions are likely to change most and why?"
    )
    res = await orchestrator.execute_query(req)
    assert res.intent == QueryIntent.SPATIAL_WHAT_IF
    assert res.spatial_what_if is not None
    assert res.spatial_what_if.origin.name == "Kakinada"
    assert res.spatial_what_if.distance_km == 25.0
    assert res.spatial_what_if.direction.lower() == "north"
    assert res.spatial_what_if.bearing_deg == 0.0
    assert len(res.spatial_what_if.ranked_changes) >= 3

    # Ensure top condition is ranked with physical explanation
    top = res.spatial_what_if.ranked_changes[0]
    assert any(term in top.metric_name for term in ["Wave", "Wind", "Swell"])
    assert top.explanation != ""
    assert top.change_direction != ""

    # Ensure visualization plan and map layers
    assert res.visualization_plan.result_type == "spatial_what_if_analysis"
    layer_ids = [l.layer_id for l in res.map_layers]
    assert "layer_displacement" in layer_ids
    assert "layer_locations" in layer_ids

    # Ensure generic single-location fallback text was NOT generated
    assert not res.executive_summary.startswith("Marine conditions near Kakinada for Tomorrow Morning")
    assert res.spatial_what_if.computed_fact is not None
    assert res.spatial_what_if.data_supported_interpretation is not None
    assert res.spatial_what_if.physical_hypothesis is not None
    assert "The available data does not establish a definitive physical cause for this difference." in res.executive_summary
    assert "The available forecast data indicates" in res.executive_summary



@pytest.mark.asyncio
async def test_scenario_2_kakinada_10km_offshore():
    """Scenario 2: 10 km offshore from Kakinada tomorrow."""
    req = UserQueryRequest(
        query="What changes if I move 10 km offshore from Kakinada tomorrow?"
    )
    res = await orchestrator.execute_query(req)
    assert res.intent == QueryIntent.SPATIAL_WHAT_IF
    assert res.spatial_what_if is not None
    assert res.spatial_what_if.distance_km == 10.0
    assert res.spatial_what_if.bearing_deg in [90.0, 110.0, 120.0]
    assert len(res.spatial_what_if.ranked_changes) > 0


@pytest.mark.asyncio
async def test_scenario_3_chennai_20km_east():
    """Scenario 3: Compare conditions at Chennai and 20 km east of Chennai tomorrow morning."""
    req = UserQueryRequest(
        query="Compare conditions at Chennai and 20 km east of Chennai tomorrow morning."
    )
    res = await orchestrator.execute_query(req)
    assert res.intent == QueryIntent.SPATIAL_WHAT_IF
    assert res.spatial_what_if is not None
    assert res.spatial_what_if.origin.name == "Chennai"
    assert res.spatial_what_if.distance_km == 20.0
    assert res.spatial_what_if.direction.lower() == "east"
    assert res.spatial_what_if.bearing_deg == 90.0
    assert len(res.spatial_what_if.ranked_changes) > 0


@pytest.mark.asyncio
async def test_scenario_4_visakhapatnam_30km_south():
    """Scenario 4: If I move 30 km south of Visakhapatnam, which conditions change most?"""
    req = UserQueryRequest(
        query="If I move 30 km south of Visakhapatnam, which conditions change most?"
    )
    res = await orchestrator.execute_query(req)
    assert res.intent == QueryIntent.SPATIAL_WHAT_IF
    assert res.spatial_what_if is not None
    assert res.spatial_what_if.origin.name == "Visakhapatnam"
    assert res.spatial_what_if.distance_km == 30.0
    assert res.spatial_what_if.direction.lower() == "south"
    assert res.spatial_what_if.bearing_deg == 180.0
    assert len(res.spatial_what_if.ranked_changes) > 0


@pytest.mark.asyncio
async def test_scenario_5_wave_wind_25km_north():
    """Scenario 5: What happens to wave and wind conditions 25 km north of Kakinada?"""
    req = UserQueryRequest(
        query="What happens to wave and wind conditions 25 km north of Kakinada?"
    )
    res = await orchestrator.execute_query(req)
    assert res.intent == QueryIntent.SPATIAL_WHAT_IF
    assert res.spatial_what_if is not None
    assert res.spatial_what_if.distance_km == 25.0
    assert res.spatial_what_if.direction.lower() == "north"
    params = [c.metric_name.lower() for c in res.spatial_what_if.ranked_changes]
    assert any("wave" in p for p in params)
    assert any("wind" in p for p in params)


@pytest.mark.asyncio
async def test_scientific_causality_3_tier_kakinada_30km_north():
    """Verify exact 3-tier scientific causality pipeline for user case: 30 km north of Kakinada tomorrow evening."""
    req = UserQueryRequest(
        query="If I move 30 km north of Kakinada tomorrow evening, which marine conditions are likely to change most and why?"
    )
    res = await orchestrator.execute_query(req)
    assert res.intent == QueryIntent.SPATIAL_WHAT_IF
    assert res.spatial_what_if is not None

    sw = res.spatial_what_if
    assert sw.computed_fact is not None
    assert sw.data_supported_interpretation is not None
    assert sw.physical_hypothesis is not None

    # Verify Tier 1: Computed Fact
    assert "shows the largest change" in sw.computed_fact
    assert "at the point 30 km north of Kakinada" in sw.computed_fact
    assert "during tomorrow evening" in sw.computed_fact

    # Verify Tier 2: Data-Supported Interpretation
    assert "The available forecast data indicates" in sw.data_supported_interpretation

    # Verify Tier 3: Physical Hypothesis
    assert sw.physical_hypothesis == "The available data does not establish a definitive physical cause for this difference."

    # Verify executive summary synthesizes all 3 tiers
    assert sw.computed_fact in res.executive_summary
    assert sw.data_supported_interpretation in res.executive_summary
    assert "The available data does not establish a definitive physical cause for this difference." in res.executive_summary

    # CRITICAL: Verify NO unsupported physical claims exist in output
    for forbidden in [
        "shoaling",
        "bathymetry",
        "coastal sheltering",
        "expanded wave fetch",
        "atmospheric boundary layer gradient",
        "terrestrial surface friction",
        "upwelling",
        "shear convergence zone",
    ]:
        assert forbidden not in res.executive_summary.lower(), f"Found unsupported physical claim: {forbidden}"
        assert forbidden not in sw.physical_reasoning.lower(), f"Found unsupported physical claim in reasoning: {forbidden}"
        for c in sw.ranked_changes:
            assert forbidden not in c.explanation.lower(), f"Found unsupported physical claim in change explanation: {forbidden}"

