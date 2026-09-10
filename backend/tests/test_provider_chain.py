"""The tiered provider chain: ISRO first, honest fallback, nothing mislabelled.

BE-02 acceptance:
- a provider cannot emit a tier it is not registered for
- the chain falls through correctly when the primary source raises
- ORCA_MODE=DEMO works with the network fully disabled
- every value in every response has a non-null provider and tier
"""

import asyncio
from datetime import datetime

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.schemas import DataFreshness, OceanObservation, ProviderTier
from app.providers.base import ProviderCapability, ProviderUnavailable, TieredProvider
from app.providers.bhuvan import BHUVAN_LAYERS, BhuvanWMSProvider
from app.providers.chain import (
    OUTCOME_ERROR,
    OUTCOME_NOT_CONFIGURED,
    OUTCOME_OK,
    OUTCOME_PROVENANCE_VIOLATION,
    OUTCOME_UNAVAILABLE,
    TieredChain,
)
from app.providers.registry import registry

client = TestClient(app)

# Device position for queries that name no place ("my area", "my fishing location").
KAKINADA = {"latitude": 16.9891, "longitude": 82.2475}

CANONICAL_QUERIES = [
    "Where is the nearest Potential Fishing Zone today?",
    "Is it safe to venture into the sea tomorrow morning?",
    "What are the tide, weather and sea conditions near my fishing location?",
    "Are there any lightning or cyclone alerts in my area?",
    "Which regions show high chlorophyll concentration and favourable sea surface temperature?",
    "What is the safest route for a fishing vessel considering weather and sea state conditions?",
    "Why has fish productivity declined in a particular coastal region?",
    "Which fishing zones should be avoided due to hazardous marine conditions or geofencing restrictions?",
]


def _obs(source: str, status: DataFreshness = DataFreshness.LIVE) -> OceanObservation:
    return OceanObservation(
        significant_wave_height_m=1.2,
        swell_height_m=0.8,
        swell_period_sec=8.0,
        swell_direction_deg=180.0,
        source=source,
        status=status,
        timestamp=datetime(2026, 1, 1),
    )


class _Provider(TieredProvider):
    """Configurable stand-in for a data source."""

    capabilities = {ProviderCapability.OCEAN}

    def __init__(self, name, tier, *, returns=None, raises=None, configured=True):
        self.provider_name = name
        self.provider_tier = tier
        self._returns = returns
        self._raises = raises
        self._configured = configured
        self.calls = 0

    def is_configured(self):
        return self._configured

    def not_configured_reason(self):
        return "stub not configured"

    async def get_ocean_conditions(self, lat, lon, offset_hours=0):
        self.calls += 1
        if self._raises:
            raise self._raises
        return self._returns


def fetch(chain):
    return asyncio.run(chain.fetch(lambda p: p.get_ocean_conditions(17.0, 83.0)))


# ---------------------------------------------------------------------------
# Tier enforcement
# ---------------------------------------------------------------------------

def test_a_provider_cannot_emit_a_tier_it_is_not_registered_for():
    """Registered ISRO, returns Open-Meteo: refused, and the next provider wins."""
    liar = _Provider("Fake ISRO", ProviderTier.ISRO, returns=_obs("Open-Meteo Marine"))
    honest = _Provider("Demo", ProviderTier.FALLBACK, returns=_obs("ORCA Deterministic Demo Model", DataFreshness.DEMO))

    result = fetch(TieredChain("ocean", [honest, liar]))

    assert result.provider == "Demo"
    assert result.tier == ProviderTier.FALLBACK
    violation = next(a for a in result.attempts if a.provider == "Fake ISRO")
    assert violation.outcome == OUTCOME_PROVENANCE_VIOLATION
    assert "classifies as FALLBACK" in violation.detail


def test_a_synthetic_value_cannot_be_emitted_under_an_isro_registration():
    """DEMO status caps the tier no matter what the source string claims."""
    liar = _Provider("Fake ISRO", ProviderTier.ISRO, returns=_obs("ISRO MOSDAC INSAT-3D", DataFreshness.DEMO))
    result = fetch(TieredChain("ocean", [liar]))

    assert not result.succeeded
    assert result.attempts[0].outcome == OUTCOME_PROVENANCE_VIOLATION


def test_an_honest_isro_provider_is_accepted():
    isro = _Provider("Real ISRO", ProviderTier.ISRO, returns=_obs("ISRO NRSC Bhoonidhi SARAL-AltiKa"))
    result = fetch(TieredChain("ocean", [isro]))

    assert result.succeeded
    assert result.tier == ProviderTier.ISRO
    assert result.attempts[0].outcome == OUTCOME_OK


# ---------------------------------------------------------------------------
# Ordering and fallthrough
# ---------------------------------------------------------------------------

def test_isro_is_attempted_before_national_before_fallback_regardless_of_list_order():
    fallback = _Provider("Fallback", ProviderTier.FALLBACK, returns=_obs("Open-Meteo Marine"))
    national = _Provider("National", ProviderTier.NATIONAL, returns=_obs("INCOIS OSF"))
    isro = _Provider("ISRO", ProviderTier.ISRO, returns=_obs("ISRO Bhoonidhi"))

    chain = TieredChain("ocean", [fallback, national, isro])   # deliberately reversed
    assert [p.provider_name for p in chain.providers] == ["ISRO", "National", "Fallback"]

    result = fetch(chain)
    assert result.provider == "ISRO"
    assert national.calls == 0 and fallback.calls == 0, "lower tiers must not be called once ISRO served"


def test_chain_falls_through_when_the_primary_source_raises():
    isro = _Provider("ISRO", ProviderTier.ISRO, raises=ProviderUnavailable("upstream 503"))
    national = _Provider("National", ProviderTier.NATIONAL, raises=RuntimeError("connection reset"))
    fallback = _Provider("Fallback", ProviderTier.FALLBACK, returns=_obs("Open-Meteo Marine"))

    result = fetch(TieredChain("ocean", [isro, national, fallback]))

    assert result.provider == "Fallback"
    outcomes = {a.provider: a.outcome for a in result.attempts}
    assert outcomes["ISRO"] == OUTCOME_UNAVAILABLE
    assert outcomes["National"] == OUTCOME_ERROR
    assert outcomes["Fallback"] == OUTCOME_OK
    assert result.used_fallback


def test_unconfigured_providers_are_skipped_without_being_called():
    isro = _Provider("ISRO", ProviderTier.ISRO, configured=False)
    fallback = _Provider("Fallback", ProviderTier.FALLBACK, returns=_obs("Open-Meteo Marine"))

    result = fetch(TieredChain("ocean", [isro, fallback]))

    assert isro.calls == 0
    assert result.attempts[0].outcome == OUTCOME_NOT_CONFIGURED
    assert result.attempts[0].detail == "stub not configured"


def test_a_chain_where_nothing_serves_reports_every_attempt_and_no_value():
    a = _Provider("A", ProviderTier.ISRO, configured=False)
    b = _Provider("B", ProviderTier.FALLBACK, raises=ProviderUnavailable("no coverage"))
    result = fetch(TieredChain("ocean", [a, b]))

    assert not result.succeeded
    assert result.value is None
    assert [x.provider for x in result.attempts] == ["A", "B"]


# ---------------------------------------------------------------------------
# The real registry
# ---------------------------------------------------------------------------

def test_registry_orders_isro_first_in_every_observation_chain():
    for chain in (registry.ocean_chain, registry.weather_chain, registry.fisheries_chain):
        tiers = [p.provider_tier for p in chain.providers]
        ranks = [{"ISRO": 0, "NATIONAL": 1, "FALLBACK": 2}[t.value] for t in tiers]
        assert ranks == sorted(ranks), f"{chain.name} is not tier-ordered: {tiers}"
        assert tiers[0] == ProviderTier.ISRO, f"{chain.name} does not try ISRO first"


def test_every_registered_provider_declares_a_name_tier_and_capabilities():
    for entry in registry.describe():
        assert entry["provider"] and entry["provider"] != "Unnamed Provider"
        assert entry["tier"] in {"ISRO", "NATIONAL", "FALLBACK"}
        assert entry["capabilities"]
        if not entry["configured"]:
            assert entry["reason"], f"{entry['provider']} is unconfigured with no stated reason"


def test_open_meteo_and_demo_are_registered_as_fallback_only():
    assert registry.open_meteo.provider_tier == ProviderTier.FALLBACK
    assert registry.demo.provider_tier == ProviderTier.FALLBACK


# ---------------------------------------------------------------------------
# Bhuvan
# ---------------------------------------------------------------------------

def test_bhuvan_layers_are_wms_descriptors_carrying_isro_tier_and_nrsc_attribution():
    descriptors = BhuvanWMSProvider().get_layer_descriptors()
    assert len(descriptors) == len(BHUVAN_LAYERS) >= 4
    for d in descriptors:
        assert d.kind == "wms"
        assert d.provider_tier == ProviderTier.ISRO
        assert d.url and "nrsc.gov.in" in d.url
        assert d.wms_params["layers"]
        assert d.attribution == "ISRO / NRSC Bhuvan"
        assert d.features == [], "a WMS layer carries no inline features"


def test_bhuvan_exposes_the_ecologically_sensitive_zone_layers():
    """Requirement 8: coral reefs and mangroves, published by ISRO."""
    wms_layers = {spec.wms_layer for spec in BHUVAN_LAYERS}
    assert "moef:coralreefs" in wms_layers
    assert "moef:mangroves" in wms_layers


# ---------------------------------------------------------------------------
# End to end through the API
# ---------------------------------------------------------------------------

@pytest.fixture
def no_network(monkeypatch):
    """Any outbound async HTTP call fails loudly."""
    async def _blocked(*args, **kwargs):
        raise OSError("NETWORK CALL ATTEMPTED WITH NETWORK DISABLED")
    monkeypatch.setattr(httpx.AsyncClient, "request", _blocked)
    monkeypatch.setattr(httpx.AsyncClient, "get", _blocked)
    monkeypatch.setattr(httpx.AsyncClient, "send", _blocked)


@pytest.mark.parametrize("query", CANONICAL_QUERIES, ids=[q[:40] for q in CANONICAL_QUERIES])
def test_demo_mode_answers_every_canonical_query_with_the_network_disabled(no_network, query):
    response = client.post("/api/query", json={"user_location": KAKINADA, "query": query})
    assert response.status_code == 200, response.text
    envelope = response.json()
    assert envelope["meta"]["mode"] == "DEMO"
    assert envelope["answer"]["headline"]


@pytest.mark.parametrize("query", CANONICAL_QUERIES, ids=[q[:40] for q in CANONICAL_QUERIES])
def test_every_value_in_every_response_has_a_provider_and_tier(query):
    envelope = client.post("/api/query", json={"user_location": KAKINADA, "query": query}).json()

    assert envelope["evidence"], "no evidence"
    for record in envelope["evidence"]:
        assert record["provider"], record
        assert record["provider_tier"] in {"ISRO", "NATIONAL", "FALLBACK"}, record

    for layer in envelope["layers"]:
        assert layer["provider_tier"] in {"ISRO", "NATIONAL", "FALLBACK"}, layer

    for alert in envelope["alerts"]:
        assert alert["source"] and alert["provider_tier"] in {"ISRO", "NATIONAL", "FALLBACK"}, alert


def test_response_includes_real_isro_layers_alongside_derived_ones():
    envelope = client.post("/api/query", json={"user_location": KAKINADA, "query": "Is it safe to venture into the sea tomorrow morning?"}).json()
    isro = [l for l in envelope["layers"] if l["provider_tier"] == "ISRO"]
    assert isro, "no ISRO layers in the response"
    assert all(l["kind"] == "wms" for l in isro)
    assert any("coralreefs" in l["wms_params"]["layers"] for l in isro)


def test_trace_names_every_skipped_isro_provider_and_why():
    """A judge asking "why is this not ISRO?" must find the answer on screen."""
    envelope = client.post("/api/query", json={"user_location": KAKINADA, "query": "Is it safe to venture into the sea tomorrow morning?"}).json()
    skipped = [t for t in envelope["trace"] if t["status"] == "SKIPPED"]
    assert skipped, "no skipped-provider events in the trace"

    detail = " ".join((t["detail"] or "") for t in skipped)
    assert "[ISRO]" in detail
    assert "not_configured" in detail
    assert "MOSDAC" in " ".join(t["action"] for t in skipped)
    assert "Bhoonidhi" in " ".join(t["action"] for t in skipped)


def test_tide_and_hazard_gaps_are_stated_in_the_response():
    """Canonical queries 3 and 4 name capabilities with no provider; say so."""
    tide = client.post("/api/query", json={"user_location": KAKINADA, "query": "What are the tide, weather and sea conditions near my fishing location?"}).json()
    assert any("Tide is not available" in l for l in tide["meta"]["limitations"]), tide["meta"]["limitations"]

    hazard = client.post("/api/query", json={"user_location": KAKINADA, "query": "Are there any lightning or cyclone alerts in my area?"}).json()
    assert any("Lightning and cyclone tracking is not available" in l for l in hazard["meta"]["limitations"])


def test_no_gap_is_papered_over_with_an_adjacent_value():
    """The wind-derived alert level must not be presented as a lightning feed."""
    envelope = client.post("/api/query", json={"user_location": KAKINADA, "query": "Are there any lightning or cyclone alerts in my area?"}).json()
    for alert in envelope["alerts"]:
        assert alert["type"] not in ("lightning", "cyclone"), (
            f"a {alert['type']} alert was emitted with no lightning/cyclone provider configured: {alert}"
        )
