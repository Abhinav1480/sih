"""The response shape is frozen. Drifting from it must fail the build.

P2-5. A website is about to be built against this API, so the shape has to stop
moving underneath it. Two independent locks, because either alone can be
satisfied without the other being true:

  1. **The captured responses still validate.** docs/examples/ holds the real
     body ORCA returned for each of the eight canonical queries, the alerts
     endpoint and a three-turn conversation. Each is re-validated against the
     live Pydantic envelope, so removing a field or narrowing an enum fails
     here with the file that broke.

  2. **The live response still matches the capture, field for field.** A
     capture that validates proves the model accepts it; it does not prove the
     API still produces it. The shapes are compared key by key, so a field that
     silently disappears from a real response is caught even though the old
     capture would still validate.

Regenerate deliberately, never to make a red test green:

    python backend/scripts/capture_contract_examples.py

If that changes a file, you changed the contract. Bump CONTRACT_VERSION and say
so in docs/API_CONTRACT.md.
"""

import json
import os
from pathlib import Path

import pytest

from app.models.envelope import CONTRACT_VERSION, QueryEnvelope

EXAMPLES = Path(__file__).resolve().parents[2] / "docs" / "examples"
CANONICAL = sorted(EXAMPLES.glob("canonical-*.json"))

# Values that are real but differ every run. The capture script replaces these
# with placeholders; comparisons ignore them.
VOLATILE = {
    "request_id", "session_id", "conversation_id", "query_id", "generated_at",
    "retrieval_time", "duration_ms", "processing_time_ms", "timestamp", "id",
    "evidence_ids", "total_duration_ms", "issued_at",
}


@pytest.fixture(scope="module")
def client():
    """A client whose clock is pinned to the capture's, and only its own.

    The captures were taken against a pinned clock, because the committed
    granules cover 1-9 September 2026 and each product has its own validity:
    without it the same query returns real granule data one week and the
    labelled synthetic fallback the next, and the comparison below would be
    measuring the calendar rather than the contract.

    The pin is restored afterwards. Leaving it set leaked into every test that
    ran later in the same session and moved their idea of "now" by two days.
    """
    from app.config import settings
    from fastapi.testclient import TestClient

    from app.main import app

    previous_env = os.environ.get("ORCA_DEMO_NOW")
    previous_setting = getattr(settings, "ORCA_DEMO_NOW", "")
    os.environ["ORCA_DEMO_NOW"] = "2026-09-09T06:00:00Z"
    settings.ORCA_DEMO_NOW = "2026-09-09T06:00:00Z"
    try:
        with TestClient(app) as c:
            yield c
    finally:
        settings.ORCA_DEMO_NOW = previous_setting
        if previous_env is None:
            os.environ.pop("ORCA_DEMO_NOW", None)
        else:
            os.environ["ORCA_DEMO_NOW"] = previous_env


def _shape(node, path=""):
    """Every key path in a document, with the type at each leaf.

    Lists collapse to their first element: the contract is about what a row
    looks like, not how many rows there are.
    """
    out = {}
    if isinstance(node, dict):
        for key, value in node.items():
            if key in VOLATILE:
                out[f"{path}.{key}"] = "<volatile>"
                continue
            out.update(_shape(value, f"{path}.{key}"))
    elif isinstance(node, list):
        out[f"{path}[]"] = "list"
        if node:
            out.update(_shape(node[0], f"{path}[]"))
    else:
        out[path] = type(node).__name__
    return out


# ---------------------------------------------------------------------------
# The captures exist and are what they claim
# ---------------------------------------------------------------------------


def test_all_eight_canonical_queries_are_captured():
    assert len(CANONICAL) == 8, (
        f"expected 8 canonical reference responses, found {len(CANONICAL)}: "
        f"{[p.name for p in CANONICAL]}"
    )


def test_the_alerts_and_conversation_flows_are_captured():
    assert (EXAMPLES / "alerts.json").is_file()
    assert (EXAMPLES / "conversation.json").is_file()


@pytest.mark.parametrize("path", CANONICAL, ids=lambda p: p.stem)
def test_every_capture_is_at_the_current_contract_version(path):
    doc = json.loads(path.read_text(encoding="utf-8"))
    assert doc["_contract_version"] == CONTRACT_VERSION, (
        f"{path.name} was captured at contract {doc['_contract_version']} but the "
        f"code is at {CONTRACT_VERSION}. Re-run "
        f"backend/scripts/capture_contract_examples.py."
    )


# ---------------------------------------------------------------------------
# Lock 1: the captures still validate against the live model
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("path", CANONICAL, ids=lambda p: p.stem)
def test_every_captured_response_still_validates(path):
    doc = json.loads(path.read_text(encoding="utf-8"))
    assert doc["_status"] == 200, f"{path.name} captured a non-200 response"
    QueryEnvelope.model_validate(doc["response"])


def test_the_captured_conversation_still_validates():
    doc = json.loads((EXAMPLES / "conversation.json").read_text(encoding="utf-8"))
    assert doc["turns"], "no turns captured"
    for i, turn in enumerate(doc["turns"]):
        assert turn["_status"] == 200
        QueryEnvelope.model_validate(turn["response"])


# ---------------------------------------------------------------------------
# Lock 2: the live response still matches the capture
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("path", CANONICAL, ids=lambda p: p.stem)
def test_the_live_response_shape_matches_the_capture(client, path):
    """The regression this exists for: a field quietly leaving the response.

    An old capture keeps validating after a field is removed, because the model
    makes most things optional. This compares the key paths the API actually
    produces now against the ones it produced when the contract was frozen.
    """
    doc = json.loads(path.read_text(encoding="utf-8"))
    live = client.post("/api/query", json=doc["_request"]).json()

    expected = _shape(doc["response"])
    actual = _shape(live)

    missing = sorted(set(expected) - set(actual))
    added = sorted(set(actual) - set(expected))

    assert not missing, (
        f"{path.name}: the response no longer carries {len(missing)} documented "
        f"field(s): {missing[:12]}"
    )
    assert not added, (
        f"{path.name}: the response carries {len(added)} field(s) the frozen "
        f"contract does not document: {added[:12]}. Adding a field is allowed, "
        f"but it must be captured and documented: re-run "
        f"backend/scripts/capture_contract_examples.py and update "
        f"docs/API_CONTRACT.md."
    )


def test_the_alerts_shape_matches_the_capture(client):
    doc = json.loads((EXAMPLES / "alerts.json").read_text(encoding="utf-8"))
    live = client.get(doc["_request"]["path"], params=doc["_request"]["params"]).json()
    missing = sorted(set(_shape(doc["response"])) - set(_shape(live)))
    assert not missing, f"/api/alerts no longer carries: {missing[:12]}"


# ---------------------------------------------------------------------------
# The documentation describes the shape that exists
# ---------------------------------------------------------------------------


def test_the_contract_document_names_the_current_version():
    doc = (EXAMPLES.parent / "API_CONTRACT.md").read_text(encoding="utf-8")
    assert CONTRACT_VERSION in doc, (
        f"docs/API_CONTRACT.md does not mention contract {CONTRACT_VERSION}"
    )


def test_every_card_type_the_api_can_emit_is_documented():
    """A card type the frontend could receive and the document never mentions."""
    from app.models.envelope import Card

    import typing

    doc = (EXAMPLES.parent / "API_CONTRACT.md").read_text(encoding="utf-8")
    # Card is Annotated[Union[...], Field(discriminator="type")]; unwrap both.
    union = typing.get_args(Card)[0]
    types = set()
    for member in typing.get_args(union):
        field = member.model_fields.get("type")
        if field is not None and getattr(field, "default", None):
            types.add(field.default)

    assert types, "could not enumerate the card union"
    undocumented = sorted(t for t in types if t not in doc)
    assert not undocumented, (
        f"card type(s) the API can emit but docs/API_CONTRACT.md never names: "
        f"{undocumented}"
    )


def test_every_enum_value_the_api_can_emit_is_documented():
    from app.models.schemas import DataFreshness, ProviderTier, RiskCategory
    from app.models.envelope import Verdict

    doc = (EXAMPLES.parent / "API_CONTRACT.md").read_text(encoding="utf-8")
    missing = []
    for enum in (DataFreshness, ProviderTier, RiskCategory, Verdict):
        for member in enum:
            if member.value not in doc:
                missing.append(f"{enum.__name__}.{member.value}")
    assert not missing, f"enum value(s) not documented: {missing}"
