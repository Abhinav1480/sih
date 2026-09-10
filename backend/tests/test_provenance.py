"""Provenance may only be repeated, never authored.

Two failures motivated these tests, both found in the repository audit:

1. `report_agent._compile_evidence` wrote agency names by hand. An Open-Meteo
   wave height was published as "INCOIS / Open-Meteo" and a demo-mode SST as
   "INCOIS / MODIS-Aqua", with a note claiming calibration against moored buoys
   and Jason-3 altimetry, over a value produced by a sine wave.
2. `open_meteo.get_ocean_conditions` returned the literals 28.4 °C, 0.45 m/s
   and 75.0° for every coordinate in Indian waters, tagged LIVE and attributed
   to the Copernicus Marine Service.
"""

import asyncio
from datetime import datetime

import pytest

from app.agents.orchestrator import orchestrator
from app.models.schemas import DataFreshness, ProviderTier, UserQueryRequest
from app.providers.demo_provider import HighFidelityDemoProvider
from app.providers.open_meteo import OpenMeteoProvider
from app.providers.provenance import classify_tier, is_synthetic

QUERIES = [
    "Is it safe to venture into the sea tomorrow morning near Visakhapatnam?",
    "Where is the nearest Potential Fishing Zone today?",
    "Compare ocean conditions between Chennai and Kochi",
    "What is the safest route for a fishing vessel from Kakinada to Visakhapatnam?",
]


def analyse(query: str):
    return asyncio.run(orchestrator.execute_query(UserQueryRequest(query=query)))


@pytest.mark.parametrize("query", QUERIES, ids=[q[:40] for q in QUERIES])
def test_evidence_provider_is_always_one_the_observation_actually_set(query):
    """No evidence record may name a source the producing observation did not.

    This is the assertion that keeps agency names out of the report agent. If
    someone reintroduces a hand-written provider string, the set difference
    below is non-empty and names the offending value.
    """
    analysis = analyse(query)

    permitted = set()
    if analysis.ocean_conditions:
        permitted.add(analysis.ocean_conditions.source)
    if analysis.weather_conditions:
        permitted.add(analysis.weather_conditions.source)

    assert analysis.evidence, "expected at least one evidence record"
    published = {record.provider for record in analysis.evidence}
    invented = published - permitted

    assert not invented, (
        f"evidence cites provider(s) no observation set: {sorted(invented)}. "
        f"Observations offered: {sorted(permitted)}"
    )


@pytest.mark.parametrize("query", QUERIES, ids=[q[:40] for q in QUERIES])
def test_synthetic_values_are_never_published_above_fallback(query):
    analysis = analyse(query)
    for record in analysis.evidence:
        if is_synthetic(record.provider, record.status):
            assert record.provider_tier == ProviderTier.FALLBACK
            assert "not an observation" in (record.reliability_notes or "").lower() or \
                   "demo model" in (record.reliability_notes or "").lower(), (
                f"synthetic value from {record.provider!r} carries the note "
                f"{record.reliability_notes!r}, which does not disclose that it is synthetic"
            )


def test_demo_provider_does_not_borrow_an_agency_name():
    """Synthetic output must not read as an INCOIS or IMD product."""
    provider = HighFidelityDemoProvider()
    ocean = asyncio.run(provider.get_ocean_conditions(17.6868, 83.2185))
    weather = asyncio.run(provider.get_weather_conditions(17.6868, 83.2185))

    for observation in (ocean, weather):
        lowered = observation.source.lower()
        for agency in ("incois", "imd", "isro", "nrsc", "mosdac", "copernicus", "modis"):
            assert agency not in lowered, (
                f"demo source {observation.source!r} borrows the name {agency!r}"
            )
        assert classify_tier(observation.source, observation.status) == ProviderTier.FALLBACK


# ---------------------------------------------------------------------------
# The live provider must read its values, not invent them.
# ---------------------------------------------------------------------------

class _StubResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class _StubClient:
    """Returns a marine payload whose values are derived from the latitude."""

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def get(self, url, params=None):
        lat = float(params["latitude"])
        hour = datetime.utcnow().strftime("%Y-%m-%dT%H:00")
        return _StubResponse({
            "hourly": {
                "time": [hour],
                "wave_height": [1.0 + lat / 100],
                "swell_wave_height": [0.8],
                "swell_wave_period": [9.0],
                "swell_wave_direction": [170.0],
                "sea_surface_temperature": [20.0 + lat / 10],
                "ocean_current_velocity": [0.1 + lat / 200],
                "ocean_current_direction": [lat * 2],
            }
        })


def test_two_coordinates_never_return_identical_sst_from_a_live_provider(monkeypatch):
    """The regression test for the hardcoded 28.4 °C.

    The stub returns a latitude-dependent SST, so a provider that reads its
    response yields different values and a provider that returns a constant
    yields the same one twice.
    """
    import app.providers.open_meteo as module
    monkeypatch.setattr(module.httpx, "AsyncClient", _StubClient)

    provider = OpenMeteoProvider()
    north = asyncio.run(provider.get_ocean_conditions(21.6417, 69.6293))   # Porbandar
    south = asyncio.run(provider.get_ocean_conditions(9.9312, 76.2673))    # Kochi

    assert north.sea_surface_temp_c != south.sea_surface_temp_c, (
        "the live provider returned the same SST for two distinct coordinates, "
        "which means the value is not being read from the response"
    )
    assert north.ocean_current_speed_m_s != south.ocean_current_speed_m_s
    assert north.significant_wave_height_m != south.significant_wave_height_m


def test_absent_variable_is_reported_as_missing_rather_than_guessed():
    """A provider that does not carry SST must return None, not a plausible number."""

    class _NoSstClient(_StubClient):
        async def get(self, url, params=None):
            hour = datetime.utcnow().strftime("%Y-%m-%dT%H:00")
            return _StubResponse({"hourly": {
                "time": [hour],
                "wave_height": [1.4],
                "swell_wave_height": [0.9],
                "swell_wave_period": [8.5],
                "swell_wave_direction": [165.0],
                # sea_surface_temperature and currents deliberately absent
            }})

    import app.providers.open_meteo as module
    original = module.httpx.AsyncClient
    module.httpx.AsyncClient = _NoSstClient
    try:
        observation = asyncio.run(OpenMeteoProvider().get_ocean_conditions(17.6868, 83.2185))
    finally:
        module.httpx.AsyncClient = original

    assert observation.sea_surface_temp_c is None
    assert observation.ocean_current_speed_m_s is None
    # The variables it does carry still come through.
    assert observation.significant_wave_height_m == 1.4


def test_no_hardcoded_ocean_constants_remain_in_the_live_provider():
    """Guards the specific literals the audit named."""
    import inspect

    import app.providers.open_meteo as module

    source = inspect.getsource(module)
    body = source.split('def test', 1)[0]
    for literal in ("28.4", "0.45", "75.0"):
        assert f"sea_surface_temp_c={literal}" not in body
        assert f"ocean_current_speed_m_s={literal}" not in body
        assert f"ocean_current_direction_deg={literal}" not in body
