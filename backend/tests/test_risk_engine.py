import pytest
from datetime import datetime
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
        timestamp=datetime.utcnow()
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
        timestamp=datetime.utcnow()
    )

    res = calculate_marine_risk(ocean, weather, is_inside_mpa=False)
    assert res.overall_score < 30
    assert res.category == RiskCategory.LOW
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
        timestamp=datetime.utcnow()
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
        timestamp=datetime.utcnow()
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
        timestamp=datetime.utcnow()
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
        timestamp=datetime.utcnow()
    )

    res_clean = calculate_marine_risk(ocean, weather, is_inside_mpa=False)
    res_mpa = calculate_marine_risk(ocean, weather, is_inside_mpa=True, mpa_name="Gahirmatha Sanctuary")

    assert res_mpa.overall_score > res_clean.overall_score
    assert any("Geofence" in f.name for f in res_mpa.contributing_factors)
