"""The historical trend must not invent points or scores.

`generate_historical_trend` emitted five time-series points from two
observations. Three of them -- T-18h, T-12h, T-6h -- were straight-line
interpolation between the two real ones, labelled with timestamps at which no
provider was ever queried, and rendered by the frontend as a time series.

Each point also carried a score from a second risk formula:

    score = int(min(100, max(10, interp_wave * 20 + interp_wind * 1.5)))

which disagreed with `app/risk/engine.py` -- the file CLAUDE.md designates as
the single source of risk -- by up to 55 points for the same location and the
same instant, inside the same HTTP response.
"""

import inspect
from datetime import datetime

import pytest

from app.agents import correlation_engine as ce_module
from app.agents.correlation_engine import CorrelationEngine
from app.models.schemas import (
    DataFreshness,
    LocationContext,
    OceanObservation,
    WeatherObservation,
)
from app.risk.engine import calculate_marine_risk

LOCATION = LocationContext(
    name="Kakinada", latitude=16.9891, longitude=82.2475, radius_km=40.0
)


def _ocean(wave: float, sst: float = 29.0) -> OceanObservation:
    return OceanObservation(
        latitude=16.9891, longitude=82.2475,
        significant_wave_height_m=wave, swell_height_m=wave * 0.8,
        swell_period_sec=11.0, swell_direction_deg=170.0, sea_surface_temp_c=sst,
        source="demo", status=DataFreshness.DEMO, timestamp=datetime.utcnow(),
    )


def _weather(wind: float) -> WeatherObservation:
    return WeatherObservation(
        latitude=16.9891, longitude=82.2475,
        wind_speed_knots=wind, wind_gust_knots=wind * 1.3, wind_direction_deg=200.0,
        air_temp_c=29.0, precipitation_mm=0.0, visibility_km=10.0, alert_level="YELLOW",
        source="demo", status=DataFreshness.DEMO, timestamp=datetime.utcnow(),
    )


def _trend(past_wave=2.9, now_wave=2.8, past_wind=26.0, now_wind=25.0):
    return CorrelationEngine().generate_historical_trend(
        LOCATION,
        _ocean(now_wave), _weather(now_wind),
        _ocean(past_wave), _weather(past_wind),
        period_label="Last 24 Hours",
    )


def test_only_observed_points_are_emitted():
    """The regression: three of five points were interpolation."""
    trend = _trend()
    labels = [p.timestamp for p in trend.points]

    assert labels == ["T - 24h", "Current"], (
        f"trend emits points that were never observed: {labels}"
    )
    for invented in ("T - 18h", "T - 12h", "T - 6h"):
        assert invented not in labels, f"{invented} was never queried from any provider"


def test_every_point_carries_the_value_that_was_actually_observed():
    trend = _trend(past_wave=2.9, now_wave=2.8, past_wind=26.0, now_wind=25.0)
    by_label = {p.timestamp: p for p in trend.points}

    assert by_label["T - 24h"].wave_height_m == 2.9
    assert by_label["T - 24h"].wind_knots == 26.0
    assert by_label["Current"].wave_height_m == 2.8
    assert by_label["Current"].wind_knots == 25.0


def test_point_scores_come_from_the_deterministic_engine():
    """
    The old formula produced 93 where the engine produced 38 for the same
    inputs. Every point's score must now equal the engine's, exactly.
    """
    past_o, past_w = _ocean(2.9), _weather(26.0)
    now_o, now_w = _ocean(2.8), _weather(25.0)

    trend = CorrelationEngine().generate_historical_trend(
        LOCATION, now_o, now_w, past_o, past_w, period_label="Last 24 Hours"
    )
    by_label = {p.timestamp: p for p in trend.points}

    assert by_label["T - 24h"].risk_score == calculate_marine_risk(past_o, past_w).overall_score
    assert by_label["Current"].risk_score == calculate_marine_risk(now_o, now_w).overall_score


def test_the_second_formula_is_gone_from_the_source():
    source = inspect.getsource(ce_module)
    assert "interp_wave * 20" not in source, "the second risk formula remains"
    assert "max(10," not in source.replace("max(10, wave*20 + wind*1.5)", ""), (
        "a clamped second score formula remains"
    )


def test_no_direction_is_asserted_when_nothing_changed():
    """1.62m -> 1.62m used to report 'experienced increased wave roughness'."""
    trend = _trend(past_wave=1.62, now_wave=1.62, past_wind=15.0, now_wind=15.0)
    assert "increased" not in trend.trend_summary.lower()
    assert "no measurable change" in trend.trend_summary.lower()


@pytest.mark.parametrize(
    "past_wave,now_wave,expected",
    [(2.0, 2.8, "increased"), (2.8, 2.0, "moderated"), (2.0, 2.0, "no measurable change")],
)
def test_summary_direction_matches_the_measured_delta(past_wave, now_wave, expected):
    trend = _trend(past_wave=past_wave, now_wave=now_wave)
    assert expected in trend.trend_summary.lower(), trend.trend_summary
