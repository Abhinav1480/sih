"""Real ISRO measurements reach the risk engine, and carry where they came from.

P2-1. The clipped granules were committed in Phase 1 and nothing read them.
This is the provider that does, registered in the ocean chain like any other.

What these tests defend, in order of how badly each would hurt:

  * The SARAL quality filter. Unfiltered `swh` in the committed granules
    reaches 29.66 m. A 29 m wave height reaching `calculate_marine_risk`
    produces a SEVERE verdict -- a "do not sail" -- out of instrument noise.
  * Per-variable attribution. A SARAL IGDR carries ECMWF model wind and
    Meteo-France wave period beside the altimeter's own swh, and the SST comes
    from a different satellite entirely. A value must never be credited to an
    instrument that did not measure it.
  * Representativeness. The nearest altimeter pass to Kakinada is 347 km away
    and two days old. That is usable only if it arrives saying so.
"""

import json
from datetime import datetime, timedelta, timezone

import numpy as np
import pytest

from app.models.schemas import DataFreshness, ProviderTier
from app.providers.base import ProviderUnavailable
from app.providers.isro_fixtures import (
    DEFAULT_FIXTURE_ROOT,
    MAX_TRACK_DISTANCE_KM,
    SARAL_MAX_RMS_M,
    SARAL_MIN_NUMVAL,
    SARAL_PRODUCT,
    SARAL_SURFACE_TYPE_OCEAN,
    ISROFixtureStore,
    ISROGranuleProvider,
    _load_track,
)
from app.providers.provenance import classify_tier
from app.utils import clock

KAKINADA = (16.9891, 82.2475)


@pytest.fixture(scope="module")
def provider():
    p = ISROGranuleProvider()
    if not p.is_configured():
        pytest.skip("no clipped ISRO granules present")
    return p


@pytest.fixture(scope="module")
def index():
    return json.loads((DEFAULT_FIXTURE_ROOT / "index.json").read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def when():
    """A time the committed granules actually cover.

    Pinned to the granules rather than the wall clock: these are cached files
    from early September 2026 and they legitimately go stale. A test that
    silently stopped exercising the provider once they aged out would be worse
    than one that fails.
    """
    return datetime(2026, 9, 9, 12, 0, tzinfo=timezone.utc)


# ---------------------------------------------------------------------------
# It is a normal chain member
# ---------------------------------------------------------------------------


def test_the_provider_is_registered_in_the_ocean_chain():
    from app.providers.registry import registry

    names = [p.provider_name for p in registry.ocean_chain.providers]
    assert any("cached granules" in n for n in names), (
        f"the granule provider is not in the ocean chain: {names}"
    )


def test_it_is_attempted_before_the_fallback_tier():
    """Ordering is by tier, so ISRO must come first however the list is written."""
    from app.providers.registry import registry

    tiers = [p.provider_tier for p in registry.ocean_chain.providers]
    assert tiers[0] == ProviderTier.ISRO
    assert tiers == sorted(tiers, key=lambda t: {"ISRO": 0, "NATIONAL": 1, "FALLBACK": 2}[t.value])


@pytest.mark.asyncio
async def test_the_chain_serves_real_granule_data_at_kakinada(provider, when):
    obs = await provider.get_ocean_conditions(*KAKINADA, offset_hours=_offset(when))

    assert obs.status == DataFreshness.CACHED, (
        "a granule on disk is CACHED. Calling it LIVE is the fabrication two "
        "phases were spent removing"
    )
    assert classify_tier(obs.source, obs.status) == ProviderTier.ISRO
    assert obs.significant_wave_height_m > 0


def _offset(target: datetime) -> int:
    """Hours from the real clock to `target`, so the provider sees `target`."""
    return int(round((target - clock.now()).total_seconds() / 3600.0))


# ---------------------------------------------------------------------------
# The SARAL quality filter
# ---------------------------------------------------------------------------


def test_the_committed_granules_really_do_contain_the_outlier():
    """If this stops being true the filter test below proves nothing."""
    worst = 0.0
    for entry in json.loads(
        (DEFAULT_FIXTURE_ROOT / "index.json").read_text(encoding="utf-8")
    )["products"][SARAL_PRODUCT]:
        track = _load_track(str(DEFAULT_FIXTURE_ROOT / entry["file"]))
        finite = track.swh[np.isfinite(track.swh)]
        if finite.size:
            worst = max(worst, float(finite.max()))
    assert worst > 20.0, (
        f"expected an unphysical swh outlier in the fixtures, largest was {worst:.2f} m"
    )


def test_no_value_that_fails_the_quality_filter_can_be_returned(provider, when):
    """The regression: a 29 m artefact reaching the risk engine as a sea state."""
    reading = provider.store.read_saral_swh(*KAKINADA, when)

    assert reading.quality_filter, "the reading does not record that it was filtered"
    assert reading.value < 12.0, (
        f"swh {reading.value} m passed the filter; unfiltered SARAL in these "
        "granules reaches 29.66 m and would score SEVERE out of instrument noise"
    )

    # And the value must be one the filter actually admits.
    track = _load_track(str(DEFAULT_FIXTURE_ROOT / _entry_for(reading.granule)["file"]))
    keep = (
        (track.surface_type == SARAL_SURFACE_TYPE_OCEAN)
        & (track.swh_numval >= SARAL_MIN_NUMVAL)
        & (track.swh_rms < SARAL_MAX_RMS_M)
        & np.isfinite(track.swh)
    )
    assert np.isclose(track.swh[keep], reading.value, atol=1e-3).any(), (
        "the returned value is not among the points that pass the filter"
    )


def _entry_for(granule: str) -> dict:
    index = json.loads((DEFAULT_FIXTURE_ROOT / "index.json").read_text(encoding="utf-8"))
    for entry in index["products"][SARAL_PRODUCT]:
        if entry["source_file"] == granule:
            return entry
    raise AssertionError(f"{granule} not in the index")


def test_removing_the_filter_would_admit_the_outlier():
    """Proves the filter is load-bearing rather than decorative."""
    admitted_unfiltered = 0.0
    admitted_filtered = 0.0
    index = json.loads((DEFAULT_FIXTURE_ROOT / "index.json").read_text(encoding="utf-8"))
    for entry in index["products"][SARAL_PRODUCT]:
        track = _load_track(str(DEFAULT_FIXTURE_ROOT / entry["file"]))
        finite = np.isfinite(track.swh)
        keep = (
            finite
            & (track.surface_type == SARAL_SURFACE_TYPE_OCEAN)
            & (track.swh_numval >= SARAL_MIN_NUMVAL)
            & (track.swh_rms < SARAL_MAX_RMS_M)
        )
        if finite.any():
            admitted_unfiltered = max(admitted_unfiltered, float(track.swh[finite].max()))
        if keep.any():
            admitted_filtered = max(admitted_filtered, float(track.swh[keep].max()))

    assert admitted_unfiltered > 20.0
    assert admitted_filtered < 10.0
    assert admitted_filtered < admitted_unfiltered / 2


# ---------------------------------------------------------------------------
# Provenance
# ---------------------------------------------------------------------------


def test_every_reading_names_a_granule_that_exists(provider, when, index):
    readings = provider.readings_for(*KAKINADA, when)
    assert readings, "no granule-backed reading at all at Kakinada"

    known = {
        e["source_file"]
        for items in index["products"].values()
        for e in items
    }
    for r in readings:
        assert r.granule in known, f"{r.variable} cites {r.granule!r}, which is not in index.json"
        assert r.status == DataFreshness.CACHED
        assert r.timestamp.year == 2026, "the timestamp is not the granule's own"


def test_every_reading_carries_its_real_distance_and_age(provider, when):
    for r in provider.readings_for(*KAKINADA, when):
        assert r.nearest_pixel_km >= 0.0
        assert r.days_from_request >= 0.0
        assert str(round(r.nearest_pixel_km)) in r.note or f"{r.nearest_pixel_km:.1f}" in r.note, (
            f"{r.variable}: the note does not state how far the nearest data was"
        )


@pytest.mark.asyncio
async def test_sst_is_not_credited_to_the_altimeter_that_did_not_measure_it(provider, when):
    """The regression this guards.

    Wave height comes from a SARAL pass and sea surface temperature from an
    INSAT-3DR scene. Stamping the observation's single source on both credited
    the SST to SARAL.
    """
    obs = await provider.get_ocean_conditions(*KAKINADA, offset_hours=_offset(when))
    if obs.sea_surface_temp_c is None:
        pytest.skip("no SST available at this point and time")

    swh_p = obs.field_provenance["significant_wave_height_m"]
    sst_p = obs.field_provenance["sea_surface_temp_c"]

    assert "SARAL" in swh_p.source.upper()
    assert "INSAT" in sst_p.source.upper(), (
        f"sea surface temperature is attributed to {sst_p.source!r}; it came from "
        "an INSAT-3DR scene, not the altimeter"
    )
    assert swh_p.granule != sst_p.granule, "both fields cite the same file"
    assert swh_p.source != sst_p.source


def test_a_reading_never_carries_a_source_its_index_entry_does_not_name(provider, when, index):
    """`index.json` records each variable's own source and institution.

    A SARAL IGDR carries ECMWF model wind and Meteo-France MFWAM wave period
    beside the altimeter's swh. Anything this provider publishes must be the
    altimeter's, never a European model field wearing an ISRO badge.
    """
    for r in provider.readings_for(*KAKINADA, when):
        if not r.variable_institution:
            continue
        assert r.variable_institution.upper() not in ("ECMWF", "METEO FRANCE"), (
            f"{r.variable} is attributed to {r.variable_institution}, a model "
            "provider, but is being published from an ISRO-tier reader"
        )


def test_the_response_evidence_separates_the_two_satellites():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as client:
        body = client.post(
            "/api/query",
            json={
                "query": "What are the sea conditions right now?",
                "user_location": {"latitude": KAKINADA[0], "longitude": KAKINADA[1]},
            },
        ).json()

    isro = [e for e in body.get("evidence", []) if e["provider_tier"] == "ISRO"]
    if not isro:
        pytest.skip("granules have aged out of the query window")

    for record in isro:
        assert record["status"] == "CACHED"
    providers = {r["provider"] for r in isro}
    assert len(providers) == len(isro) or len(providers) > 1, (
        f"every ISRO record carries the same provider string: {providers}"
    )


# ---------------------------------------------------------------------------
# Refusing rather than fabricating
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_a_point_with_no_altimeter_coverage_is_refused_not_invented(provider, when):
    """Far out in the Arabian Sea there is no pass in these granules."""
    with pytest.raises(ProviderUnavailable) as excinfo:
        await provider.get_ocean_conditions(12.0, 68.0, offset_hours=_offset(when))
    message = str(excinfo.value)
    assert "km" in message or "granule" in message, (
        f"the refusal does not say why: {message}"
    )


def test_a_distant_pass_is_refused_beyond_the_stated_limit(provider):
    store = provider.store
    with pytest.raises(ProviderUnavailable) as excinfo:
        store.read_saral_swh(5.0, 95.0, datetime(2026, 9, 9, 12, 0, tzinfo=timezone.utc))
    assert str(MAX_TRACK_DISTANCE_KM).split(".")[0] in str(excinfo.value) or "days" in str(excinfo.value)


def test_a_time_outside_every_granule_window_is_refused(provider):
    with pytest.raises(ProviderUnavailable) as excinfo:
        provider.store.read_saral_swh(*KAKINADA, datetime(2027, 6, 1, tzinfo=timezone.utc))
    assert "days" in str(excinfo.value)


def test_the_provider_declines_weather_rather_than_inventing_wind(provider):
    """OSCAT-3 held zero valid Indian Ocean retrievals, so there is no ISRO wind."""
    import asyncio

    with pytest.raises(ProviderUnavailable) as excinfo:
        asyncio.run(provider.get_weather_conditions(*KAKINADA))
    assert "OSCAT" in str(excinfo.value)


def test_an_unpopulated_store_reports_itself_unconfigured(tmp_path):
    empty = ISROGranuleProvider(root=tmp_path)
    assert not empty.is_configured()
    assert "subset_granules" in empty.not_configured_reason()
