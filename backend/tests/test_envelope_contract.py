"""Every `/api/query` response must satisfy `docs/API_CONTRACT.md`.

These tests drive the real HTTP endpoint rather than the orchestrator, because
the contract is what leaves the process, not what the agents produce inside it.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.envelope import CONTRACT_VERSION, QueryEnvelope, Verdict
from app.models.schemas import ProviderTier

client = TestClient(app)

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

VALID_CARD_TYPES = {
    "risk_summary", "pfz_ranking", "route_plan", "comparison_table",
    "timeseries_chart", "geofence_warning", "advisory_text",
}


# Kakinada. The canonical queries say "my area" and "near my fishing location";
# the device position is what gives those words a place.
USER_LOCATION = {"latitude": 16.9891, "longitude": 82.2475}


def post(query: str, **body) -> QueryEnvelope:
    payload = {"query": query, "user_location": USER_LOCATION, **body}
    response = client.post("/api/query", json=payload)
    assert response.status_code == 200, response.text
    # Round-trips through the model, so any contract violation raises here.
    return QueryEnvelope.model_validate(response.json())


@pytest.mark.parametrize("query", CANONICAL_QUERIES, ids=[q[:45] for q in CANONICAL_QUERIES])
def test_canonical_query_validates_against_the_contract(query):
    envelope = post(query)

    assert envelope.request_id and envelope.session_id
    assert envelope.language
    assert envelope.answer.headline.strip()
    assert envelope.answer.narrative.strip()
    assert isinstance(envelope.answer.verdict, Verdict)
    assert 0 <= envelope.answer.confidence <= 100
    assert envelope.meta.contract_version == CONTRACT_VERSION
    assert envelope.meta.query_text == query
    assert envelope.cards, "every response must carry at least one card"
    assert envelope.trace, "every response must carry a reasoning trace"


@pytest.mark.parametrize("query", CANONICAL_QUERIES, ids=[q[:45] for q in CANONICAL_QUERIES])
def test_risk_factor_points_sum_exactly_to_the_score(query):
    """The breakdown the UI renders must add up to the headline number."""
    envelope = post(query)
    if envelope.risk is None:
        pytest.skip("no risk block for this intent")
    assert sum(f.points_added for f in envelope.risk.factors) == envelope.risk.score


@pytest.mark.parametrize("query", CANONICAL_QUERIES, ids=[q[:45] for q in CANONICAL_QUERIES])
def test_every_evidence_record_carries_a_provider_and_tier(query):
    envelope = post(query)
    for record in envelope.evidence:
        assert record.provider and record.provider.strip(), "evidence with no provider"
        assert isinstance(record.provider_tier, ProviderTier)
        assert record.status is not None


def test_no_synthetic_value_is_labelled_isro_or_national():
    """The golden rule. A demo value must never borrow agency authority.

    A judge who catches one mislabelled source discounts the whole platform,
    so this is asserted for every evidence record of every canonical query.
    """
    from app.providers.provenance import is_synthetic

    for query in CANONICAL_QUERIES:
        envelope = post(query)
        for record in envelope.evidence:
            if is_synthetic(record.provider, record.status):
                assert record.provider_tier == ProviderTier.FALLBACK, (
                    f"synthetic value from {record.provider!r} was published as "
                    f"tier {record.provider_tier.value}"
                )


def test_cards_use_the_discriminated_union_and_declare_evidence_ids():
    for query in CANONICAL_QUERIES:
        envelope = post(query)
        known_evidence = {e.id for e in envelope.evidence}
        for card in envelope.cards:
            assert card.type in VALID_CARD_TYPES, card.type
            assert card.id and card.title
            assert isinstance(card.evidence_ids, list)
            # A card may cite no evidence, but never a record that isn't there.
            for evidence_id in card.evidence_ids:
                assert evidence_id in known_evidence, (
                    f"card {card.id} cites evidence {evidence_id} that is not in the response"
                )


def test_verdict_is_no_go_whenever_the_position_is_inside_a_protected_area():
    """A regulatory restriction overrides a calm sea state."""
    envelope = post("Is it safe to fish inside the Gahirmatha marine sanctuary today?")
    restricted = [c for c in envelope.cards if c.type == "geofence_warning"]
    if restricted:
        assert envelope.answer.verdict == Verdict.NO_GO


def test_degraded_flag_is_set_when_any_value_is_a_fallback():
    """In DEMO mode nothing is authoritative, and the envelope must say so."""
    envelope = post("Is it safe to venture into the sea tomorrow morning?")
    if any(e.provider_tier == ProviderTier.FALLBACK for e in envelope.evidence):
        assert envelope.meta.degraded is True
        assert envelope.meta.notes, "a degraded response must explain why"


def test_empty_query_is_rejected():
    assert client.post("/api/query", json={"query": "   "}).status_code == 400


def test_export_accepts_the_envelope_it_was_given():
    """The report renders from the same envelope the user was shown."""
    envelope = post("Is it safe to venture into the sea tomorrow morning?")
    response = client.post("/api/export/report", json=envelope.model_dump(mode="json"))
    assert response.status_code == 200, response.text
    markdown = response.json()["markdown_content"]
    assert "ORCA MARINE INTELLIGENCE ADVISORY REPORT" in markdown
    # Every figure in the report must carry its tier.
    for record in envelope.evidence:
        assert record.provider_tier.value in markdown


def test_user_location_is_honoured_not_a_default_port():
    """Coordinates in Tamil Nadu once returned a Visakhapatnam advisory.

    The answer must be about where the user is. 200 km is generous; the
    Visakhapatnam default was 700 km away.
    """
    from app.geospatial.calculations import haversine_distance

    lat, lon = 10.7672, 79.8428  # off Nagapattinam
    envelope = post("Is it safe to venture into the sea tomorrow morning?",
                    user_location={"latitude": lat, "longitude": lon})
    loc = envelope.meta.location
    assert haversine_distance(lat, lon, loc.latitude, loc.longitude) < 200
    assert envelope.risk is not None


def test_no_place_and_no_position_asks_instead_of_assuming():
    response = client.post("/api/query", json={"query": "Is it safe to venture into the sea tomorrow morning?"})
    assert response.status_code == 200
    envelope = QueryEnvelope.model_validate(response.json())
    assert envelope.intent.value == "needs_clarification"
    assert envelope.risk is None
