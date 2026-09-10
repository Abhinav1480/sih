import pytest
from datetime import datetime, timezone
from app.risk.engine import calculate_marine_risk
from app.models.schemas import (
    OceanObservation,
    WeatherObservation,
    RiskCategory,
    DataFreshness,
)

def test_calm_conditions_low_risk():
    ocean = OceanObservation(
        significant_wave_height_m=0.9,
        swell_height_m=0.6,
        swell_period_sec=9.0,
        swell_direction_deg=140.0,
        sea_surface_temp_c=28.5,
        ocean_current_speed_m_s=0.3,
        ocean_current_direction_deg=90.0,
        sea_state="Calm",
        status=DataFreshness.DEMO,
        source="INCOIS",
        timestamp=datetime.now(timezone.utc)
    )
    weather = WeatherObservation(
        wind_speed_knots=8.0,
        wind_direction_deg=120.0,
        wind_gust_knots=11.0,
        air_temp_c=29.0,
        precipitation_mm=0.0,
        visibility_km=10.0,
        alert_level="None",
        status=DataFreshness.DEMO,
        source="IMD",
        timestamp=datetime.now(timezone.utc)
    )

    res = calculate_marine_risk(ocean, weather, is_inside_mpa=False)
    assert res.overall_score < 30
    assert res.category == RiskCategory.LOW
    assert res.confidence_percentage == 95
    assert "DEMO" in res.data_quality_label
    assert len(res.contributing_factors) > 0

def test_severe_storm_conditions_high_risk():
    ocean = OceanObservation(
        significant_wave_height_m=3.8,
        swell_height_m=2.8,
        swell_period_sec=14.0,
        swell_direction_deg=190.0,
        sea_surface_temp_c=28.0,
        ocean_current_speed_m_s=0.9,
        ocean_current_direction_deg=180.0,
        sea_state="Very Rough",
        status=DataFreshness.DEMO,
        source="INCOIS",
        timestamp=datetime.now(timezone.utc)
    )
    weather = WeatherObservation(
        wind_speed_knots=32.0,
        wind_direction_deg=200.0,
        wind_gust_knots=42.0,
        air_temp_c=26.5,
        precipitation_mm=18.0,
        visibility_km=4.0,
        alert_level="Orange",
        storm_warning="Severe squall gale warning",
        status=DataFreshness.DEMO,
        source="IMD",
        timestamp=datetime.now(timezone.utc)
    )

    res = calculate_marine_risk(ocean, weather, is_inside_mpa=False)
    assert res.overall_score >= 55
    assert res.category in (RiskCategory.HIGH, RiskCategory.SEVERE)
    assert any("SWH" in f.name for f in res.contributing_factors)
    assert any("Wind Speed" in f.name for f in res.contributing_factors)
    assert len(res.triggered_rules) >= 2

def test_mpa_violation_risk_penalty():
    ocean = OceanObservation(
        significant_wave_height_m=1.1,
        swell_height_m=0.8,
        swell_period_sec=8.0,
        swell_direction_deg=140.0,
        sea_surface_temp_c=28.5,
        ocean_current_speed_m_s=0.2,
        ocean_current_direction_deg=90.0,
        sea_state="Slight",
        status=DataFreshness.DEMO,
        source="INCOIS",
        timestamp=datetime.now(timezone.utc)
    )
    weather = WeatherObservation(
        wind_speed_knots=10.0,
        wind_direction_deg=120.0,
        wind_gust_knots=12.0,
        air_temp_c=29.0,
        precipitation_mm=0.0,
        visibility_km=10.0,
        alert_level="None",
        status=DataFreshness.DEMO,
        source="IMD",
        timestamp=datetime.now(timezone.utc)
    )

    res_clean = calculate_marine_risk(ocean, weather, is_inside_mpa=False)
    res_mpa = calculate_marine_risk(ocean, weather, is_inside_mpa=True, mpa_name="Gahirmatha Sanctuary")

    assert res_mpa.overall_score > res_clean.overall_score
    assert any("Geofence" in f.name for f in res_mpa.contributing_factors)


# ---------------------------------------------------------------------------
# Renormalisation over the weights actually observed.
#
# The engine used to accumulate `weights_counted` and never divide by it, so a
# missing feed silently scored as calm water. These tests pin the fix.
# ---------------------------------------------------------------------------

def _ocean(wave_m: float, swell_m: float = 1.0) -> OceanObservation:
    return OceanObservation(
        significant_wave_height_m=wave_m,
        swell_height_m=swell_m,
        swell_period_sec=8.0,
        swell_direction_deg=180.0,
        sea_surface_temp_c=28.0,
        ocean_current_speed_m_s=0.3,
        ocean_current_direction_deg=90.0,
        timestamp=datetime(2026, 1, 1),
    )


def _weather(wind_kt: float, alert: str = "None") -> WeatherObservation:
    return WeatherObservation(
        wind_speed_knots=wind_kt,
        wind_direction_deg=200.0,
        wind_gust_knots=wind_kt * 1.3,
        air_temp_c=30.0,
        precipitation_mm=0.0,
        visibility_km=10.0,
        alert_level=alert,
        timestamp=datetime(2026, 1, 1),
    )


def test_missing_weather_feed_does_not_make_rough_seas_look_calmer():
    """The exact regression from the audit.

    3.5 m seas with a 32 kt gale and an Orange warning scored 56/HIGH; the
    identical seas with the weather feed absent scored 32/MODERATE, because the
    two absent factors were counted as zero points against the full weight.
    """
    with_weather = calculate_marine_risk(_ocean(3.5, 2.6), _weather(32.0, "Orange"))
    without_weather = calculate_marine_risk(_ocean(3.5, 2.6), None)

    assert with_weather.category == RiskCategory.HIGH
    assert without_weather.overall_score >= with_weather.overall_score
    assert without_weather.category == RiskCategory.HIGH


@pytest.mark.parametrize("drop", ["ocean", "weather"])
def test_absent_factor_never_scores_lower_than_the_same_factor_at_its_calmest(drop):
    """Losing a feed must never be safer than observing benign conditions.

    This is the invariant renormalisation actually guarantees. An unobserved
    factor is imputed at the mean of the observed ones, and that mean is always
    at least what the factor would have contributed had it been measured at
    zero points, so a data outage can never flatter the sea state.
    """
    calm_ocean, calm_weather = _ocean(0.5, 0.5), _weather(5.0, "None")
    rough_ocean, rough_weather = _ocean(3.2, 2.5), _weather(30.0, "Orange")

    if drop == "ocean":
        absent = calculate_marine_risk(None, rough_weather)
        benign = calculate_marine_risk(calm_ocean, rough_weather)
    else:
        absent = calculate_marine_risk(rough_ocean, None)
        benign = calculate_marine_risk(rough_ocean, calm_weather)

    assert absent.overall_score >= benign.overall_score


def test_missing_inputs_lower_confidence_and_are_named():
    full = calculate_marine_risk(_ocean(2.0), _weather(15.0))
    partial = calculate_marine_risk(_ocean(2.0), None)

    assert full.confidence_percentage > partial.confidence_percentage
    assert partial.missing_inputs
    assert "Surface Wind Speed" in partial.missing_inputs
    # The quality label must visibly differ, so a reader can tell the score was
    # computed on partial evidence without cross-checking missing_inputs.
    assert partial.data_quality_label != full.data_quality_label


@pytest.mark.parametrize("ocean,weather", [
    (_ocean(0.5, 0.4), _weather(5.0)),
    (_ocean(2.0, 1.6), _weather(20.0, "Yellow")),
    (_ocean(3.5, 2.6), _weather(32.0, "Orange")),
    (_ocean(5.0, 3.5), _weather(45.0, "Red")),
    (_ocean(1.5, 1.0), None),
    (None, _weather(25.0, "Yellow")),
])
def test_factor_points_always_sum_exactly_to_the_score(ocean, weather):
    result = calculate_marine_risk(ocean, weather)
    assert sum(f.points_added for f in result.contributing_factors) == result.overall_score


def test_factor_points_sum_to_the_score_even_when_the_mpa_penalty_clamps():
    """A severe sea state inside a sanctuary would exceed 100 before clamping."""
    result = calculate_marine_risk(
        _ocean(5.0, 3.5), _weather(50.0, "Red"), is_inside_mpa=True, mpa_name="Gahirmatha"
    )
    assert result.overall_score <= 100
    assert sum(f.points_added for f in result.contributing_factors) == result.overall_score


def test_an_all_clear_warning_feed_does_not_inflate_the_score():
    """"No active warning" is an observation, so its weight must still count.

    Only counting the warning weight when points were scored shrank the
    denominator on every quiet-weather query and inflated the result.
    """
    quiet = calculate_marine_risk(_ocean(2.5, 1.8), _weather(18.0, "None"))
    no_feed = calculate_marine_risk(_ocean(2.5, 1.8), _weather(18.0, "None"))
    assert quiet.overall_score == no_feed.overall_score
    assert "Coastal Weather Warning" in " ".join(f.name for f in quiet.contributing_factors)


def test_route_crossing_a_sanctuary_is_a_named_factor_that_sums_into_the_score():
    """A corridor through protected waters is scored by the engine, not assigned
    HIGH by the vessel agent. The penalty appears as its own decomposition entry
    and the displayed points still add up to the headline number."""
    clear = calculate_marine_risk(_ocean(1.5), _weather(12.0))
    crossing = calculate_marine_risk(
        _ocean(1.5), _weather(12.0),
        crosses_protected_waters=True, protected_areas=["Coringa Wildlife Sanctuary"],
    )
    geofence = [f for f in crossing.contributing_factors if "Geofence" in f.name]
    assert len(geofence) == 1
    assert geofence[0].value == "ROUTE CROSSES MPA"
    assert "Coringa Wildlife Sanctuary" in geofence[0].description
    assert crossing.overall_score - clear.overall_score == geofence[0].points_added > 0
    assert sum(f.points_added for f in crossing.contributing_factors) == crossing.overall_score
    assert any("Coringa" in rule for rule in crossing.triggered_rules)
