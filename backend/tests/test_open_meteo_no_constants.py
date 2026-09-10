"""The live provider must not publish constants as Copernicus observations.

`open_meteo.py` read its six required fields with a literal fallback:

    wave_height  = hourly.get("wave_height",        [1.5])[idx] or 1.5
    swell_height = hourly.get("swell_wave_height",  [1.0])[idx] or 1.0
    swell_period = hourly.get("swell_wave_period",  [8.0])[idx] or 8.0
    swell_dir    = hourly.get("swell_wave_direction",[160.0])[idx] or 160.0
    wind_speed   = hourly.get("wind_speed_10m",     [12.0])[idx] or 12.0
    air_temp     = hourly.get("temperature_2m",     [28.5])[idx] or 28.5

An upstream feed that omitted or nulled a series therefore produced
1.5 m seas and 12 kt winds -- a benign LOW-risk verdict -- published with
status LIVE and source "Open-Meteo Marine / Copernicus Marine Service (Live
API)". This is the same defect class the file's own comment three lines above
says was removed for SST and currents; the fix had been applied to 3 of 9
fields and left off the 6 that drive the risk score.

A provider that does not carry a variable must say so.
"""

import inspect
import re

import pytest

from app.providers import open_meteo
from app.providers.base import ProviderUnavailable

# The exact constants that used to be substituted.
FORBIDDEN_FALLBACKS = {
    "wave_height": "1.5",
    "swell_wave_height": "1.0",
    "swell_wave_period": "8.0",
    "swell_wave_direction": "160.0",
    "wind_speed_10m": "12.0",
    "wind_gusts_10m": "16.0",
    "wind_direction_10m": "180.0",
    "temperature_2m": "28.5",
    "visibility": "10000.0",
}


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class _FakeClient:
    """Stands in for httpx.AsyncClient, serving one canned payload."""

    def __init__(self, payload):
        self._payload = payload

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def get(self, *args, **kwargs):
        return _FakeResponse(self._payload)


def _install(monkeypatch, payload):
    monkeypatch.setattr(
        open_meteo.httpx, "AsyncClient", lambda *a, **k: _FakeClient(payload)
    )


# A payload whose series exist but are entirely null -- the case the literal
# fallbacks silently rescued.
NULL_PAYLOAD = {
    "hourly": {
        "time": ["2026-09-10T00:00"],
        "wave_height": [None],
        "swell_wave_height": [None],
        "swell_wave_period": [None],
        "swell_wave_direction": [None],
        "wind_speed_10m": [None],
        "wind_gusts_10m": [None],
        "wind_direction_10m": [None],
        "temperature_2m": [None],
        "precipitation": [None],
        "visibility": [None],
    }
}

# A payload with no series at all -- the `hourly.get(..., [default])` case.
EMPTY_PAYLOAD = {"hourly": {"time": ["2026-09-10T00:00"]}}


@pytest.mark.asyncio
@pytest.mark.parametrize("payload", [NULL_PAYLOAD, EMPTY_PAYLOAD], ids=["null", "absent"])
async def test_ocean_refuses_rather_than_substituting(monkeypatch, payload):
    _install(monkeypatch, payload)
    provider = open_meteo.OpenMeteoProvider()

    with pytest.raises(ProviderUnavailable) as excinfo:
        await provider.get_ocean_conditions(16.9891, 82.2475, 0)

    message = str(excinfo.value)
    assert "Not substituting" in message
    assert "wave height" in message.lower(), (
        "the provider does not name which variable it is missing"
    )


@pytest.mark.asyncio
@pytest.mark.parametrize("payload", [NULL_PAYLOAD, EMPTY_PAYLOAD], ids=["null", "absent"])
async def test_weather_refuses_rather_than_substituting(monkeypatch, payload):
    _install(monkeypatch, payload)
    provider = open_meteo.OpenMeteoProvider()

    with pytest.raises(ProviderUnavailable) as excinfo:
        await provider.get_weather_conditions(16.9891, 82.2475, 0)

    assert "Not substituting" in str(excinfo.value)


@pytest.mark.asyncio
async def test_a_real_payload_is_still_served_normally(monkeypatch):
    """The refusal must not break the happy path."""
    payload = {
        "hourly": {
            "time": ["2026-09-10T00:00"],
            "wave_height": [2.31],
            "swell_wave_height": [1.84],
            "swell_wave_period": [9.4],
            "swell_wave_direction": [173.0],
            "sea_surface_temperature": [28.9],
        }
    }
    _install(monkeypatch, payload)
    observation = await open_meteo.OpenMeteoProvider().get_ocean_conditions(
        16.9891, 82.2475, 0
    )

    assert observation.significant_wave_height_m == 2.31
    assert observation.swell_height_m == 1.84
    assert observation.sea_surface_temp_c == 28.9
    # Absent optional series stay None rather than becoming a number.
    assert observation.ocean_current_speed_m_s is None


def test_no_literal_fallback_remains_in_the_source():
    """
    A behavioural test can miss a fallback on a path it does not exercise.
    This reads the source for the pattern itself.
    """
    source = inspect.getsource(open_meteo)

    for variable, constant in FORBIDDEN_FALLBACKS.items():
        pattern = rf'hourly\.get\(\s*["\']{re.escape(variable)}["\']\s*,\s*\[\s*{re.escape(constant)}'
        assert not re.search(pattern, source), (
            f"'{variable}' still carries the literal fallback {constant}"
        )

    # And the `or <constant>` form that backed it up.
    assert not re.search(r"\]\[idx\]\s+or\s+\d", source), (
        "an '[idx] or <constant>' fallback remains"
    )


@pytest.mark.asyncio
async def test_the_copernicus_attribution_is_only_reached_with_real_data(monkeypatch):
    """
    The source string 'Open-Meteo Marine / Copernicus Marine Service (Live API)'
    is only ever attached to an observation that carried real values, because
    the refusal happens before the OceanObservation is constructed.
    """
    _install(monkeypatch, NULL_PAYLOAD)
    with pytest.raises(ProviderUnavailable):
        await open_meteo.OpenMeteoProvider().get_ocean_conditions(16.9891, 82.2475, 0)
