"""A regulatory notice must never suppress a safety warning.

`_generate_summary_and_recommendation` used to contain two separate top-level
`if` chains. The second one, `if is_mpa:`, overwrote whatever the risk band had
produced, and because the NO-GO branch was its `elif`, NO-GO could not execute
inside a protected area at all.

A fisherman inside a sanctuary in 5.4 m seas and 48 kt winds was therefore told
about MoEFCC trawling rules and advised to "shift fishing operations outside
sanctuary boundaries" — that is, to keep fishing — with no mention of danger.

That is reachable in ordinary use: the shipped MPA polygons are oversized
enough that harbour nodes test as inside one.
"""

from datetime import datetime
from types import SimpleNamespace

import pytest

from app.agents.report_agent import ReportAgent
from app.models.schemas import (
    DataFreshness,
    OceanObservation,
    QueryIntent,
    WeatherObservation,
)
from app.risk.engine import calculate_marine_risk

MPA = {"name": "Gulf of Mannar Marine National Park"}
LOC = SimpleNamespace(name="Rameswaram", latitude=9.28, longitude=79.31)
TEMPORAL = SimpleNamespace(label="Tomorrow")


def _observations(wave: float, wind: float, alert: str):
    now = datetime.utcnow()
    ocean = OceanObservation(
        latitude=9.28, longitude=79.31,
        significant_wave_height_m=wave, swell_height_m=wave * 0.75,
        swell_period_sec=13.0, swell_direction_deg=200.0,
        sea_surface_temp_c=29.0,
        source="demo", status=DataFreshness.DEMO, timestamp=now,
    )
    weather = WeatherObservation(
        latitude=9.28, longitude=79.31,
        wind_speed_knots=wind, wind_gust_knots=wind * 1.3, wind_direction_deg=210.0,
        air_temp_c=29.0, precipitation_mm=0.0, visibility_km=6.0,
        alert_level=alert,
        source="demo", status=DataFreshness.DEMO, timestamp=now,
    )
    return ocean, weather


def _advise(wave: float, wind: float, alert: str, inside_mpa: bool):
    ocean, weather = _observations(wave, wind, alert)
    risk = calculate_marine_risk(
        ocean, weather,
        is_inside_mpa=inside_mpa,
        mpa_name=MPA["name"] if inside_mpa else None,
    )
    summary, rec = ReportAgent()._generate_summary_and_recommendation(
        QueryIntent.MARINE_SAFETY, LOC, TEMPORAL, risk, ocean, weather,
        None, None, None, None, inside_mpa, MPA if inside_mpa else None,
    )
    return risk, summary, rec


def test_severe_conditions_inside_an_mpa_still_warn_of_danger():
    """The regression. Severe sea state plus inside-MPA must say NO-GO."""
    risk, _summary, rec = _advise(wave=5.4, wind=48.0, alert="RED", inside_mpa=True)

    assert risk.category.value == "SEVERE", "fixture no longer produces SEVERE"
    assert "NO-GO" in rec, (
        "a regulatory notice suppressed the safety warning inside an MPA:\n" + rec
    )


def test_the_safety_warning_comes_before_the_regulatory_notice():
    """Ordering matters: a fisherman reads the first sentence."""
    _risk, _summary, rec = _advise(wave=5.4, wind=48.0, alert="RED", inside_mpa=True)

    assert "NO-GO" in rec and "MoEFCC" in rec, rec
    assert rec.index("NO-GO") < rec.index("MoEFCC"), (
        "the regulatory notice is printed ahead of the danger warning:\n" + rec
    )


def test_the_regulatory_notice_is_not_lost_either():
    """Both messages appear. Safety first does not mean regulation dropped."""
    _risk, _summary, rec = _advise(wave=5.4, wind=48.0, alert="RED", inside_mpa=True)
    assert MPA["name"] in rec
    assert "prohibited" in rec


def test_advice_inside_an_mpa_never_tells_a_fisherman_to_keep_fishing_in_severe_seas():
    """
    The old text said "shift fishing operations outside sanctuary boundaries",
    which in a cyclone is an instruction to keep fishing somewhere else.
    """
    _risk, _summary, rec = _advise(wave=5.4, wind=48.0, alert="RED", inside_mpa=True)
    assert "Shift fishing operations outside sanctuary boundaries" not in rec


@pytest.mark.parametrize(
    "wave,wind,alert",
    [
        (0.5, 5.0, "GREEN"),
        (1.8, 18.0, "YELLOW"),
        (3.5, 32.0, "ORANGE"),
        (5.4, 48.0, "RED"),
    ],
)
def test_band_advisory_survives_the_mpa_flag_at_every_band(wave, wind, alert):
    """
    Whatever the band, the advisory for that band must survive being inside an
    MPA — the notice is appended, never substituted.

    The risk object is held constant across both calls on purpose. Passing
    is_inside_mpa to the engine adds a +20 legal-violation penalty that can
    push the score into a higher band, and comparing two different bands would
    not test the substitution this guards against.
    """
    ocean, weather = _observations(wave, wind, alert)
    risk = calculate_marine_risk(ocean, weather, is_inside_mpa=False)
    agent = ReportAgent()

    _s_out, rec_outside = agent._generate_summary_and_recommendation(
        QueryIntent.MARINE_SAFETY, LOC, TEMPORAL, risk, ocean, weather,
        None, None, None, None, False, None,
    )
    _s_in, rec_inside = agent._generate_summary_and_recommendation(
        QueryIntent.MARINE_SAFETY, LOC, TEMPORAL, risk, ocean, weather,
        None, None, None, None, True, MPA,
    )

    assert rec_inside.startswith(rec_outside), (
        f"band {risk.category.value}: the MPA notice replaced the safety "
        f"advisory instead of being appended to it.\n"
        f"outside: {rec_outside}\ninside:  {rec_inside}"
    )


def test_summary_still_names_the_sanctuary():
    _risk, summary, _rec = _advise(wave=5.4, wind=48.0, alert="RED", inside_mpa=True)
    assert MPA["name"] in summary
