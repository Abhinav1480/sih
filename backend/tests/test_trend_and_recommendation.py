"""P2-3: the trend samples what it claims, and advice comes from the findings.

Three defects, one shape: something described in the response that the code had
not actually done.

  * A 24-hour lookback labelled "Past 7 Days (Historical Baseline)". The
    temporal context said offset_hours = -168 and the orchestrator asked for
    -24, every time, whatever the query.
  * Recommendations written per intent and never derived from anything --
    "Monitor INCOIS satellite passes", "Prioritize operations in the calmer
    sector" -- identical whether the sea was flat or a gale was blowing.
  * Trace steps with hardcoded durations, and one that recorded work it never
    did.
"""

import inspect
import re

import pytest

from app.agents.orchestrator import MAX_TREND_POINTS, _trend_offsets


@pytest.fixture(scope="module")
def client():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        yield c


KAKINADA = {"latitude": 16.9891, "longitude": 82.2475}


def _ask(client, query):
    return client.post("/api/query", json={"query": query, "user_location": KAKINADA}).json()


# ---------------------------------------------------------------------------
# The window sampled is the window described
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("span,expected_first", [(24, -24), (168, -168), (720, -720)])
def test_offsets_span_the_whole_window(span, expected_first):
    offsets = _trend_offsets(span)
    assert offsets[0] == expected_first, f"the series does not reach back {span}h"
    assert offsets[-1] == 0, "the series does not reach the present"
    assert len(offsets) <= MAX_TREND_POINTS
    assert offsets == sorted(offsets), "offsets are not in chronological order"


def test_a_seven_day_query_samples_seven_days(client):
    """The regression. This asked for 168 hours and fetched 24."""
    body = _ask(client, "How have wave conditions changed over the past week near Kakinada?")
    cards = [c for c in body["cards"] if c["type"] == "timeseries_chart"]
    if not cards:
        pytest.skip("no trend card for this query")
    card = cards[0]

    assert "7 Days" in card.get("period_description", ""), card.get("period_description")
    offsets = [p["offset_hours"] for p in card["points"]]
    assert min(offsets) <= -120, (
        f"a series labelled 'Past 7 Days' reaches back only {abs(min(offsets))}h: {offsets}"
    )


def test_every_trend_point_is_a_distinct_observation(client):
    """No point may be drawn twice, and none may be interpolated.

    A cached granule answers for every hour inside its validity window, so
    sampling eight offsets against one SARAL pass returned that pass eight
    times -- eight dots drawn from one measurement.
    """
    for query in (
        "How have wave conditions changed over the past week near Kakinada?",
        "Why has fish productivity declined in a particular coastal region?",
    ):
        body = _ask(client, query)
        cards = [c for c in body["cards"] if c["type"] == "timeseries_chart"]
        if not cards:
            continue
        points = cards[0]["points"]
        identities = [(p["source"], p["timestamp"]) for p in points]
        assert len(identities) == len(set(identities)), (
            f"{query!r} emits the same observation more than once: {identities}"
        )
        offsets = [p["offset_hours"] for p in points]
        assert len(offsets) == len(set(offsets))


def test_a_single_observation_is_not_described_as_a_trend(client):
    body = _ask(client, "Why has fish productivity declined in a particular coastal region?")
    cards = [c for c in body["cards"] if c["type"] == "timeseries_chart"]
    if not cards:
        pytest.skip("no trend card")
    card = cards[0]
    if len(card["points"]) != 1:
        pytest.skip("more than one observation available")
    narrative = (body.get("answer") or {}).get("narrative", "") + " " + card.get("title", "")
    assert "not enough to describe a trend" in narrative, narrative


def test_each_point_carries_its_own_provenance(client):
    """A series can span providers. Which point came from where must be visible."""
    body = _ask(client, "How have wave conditions changed over the past week near Kakinada?")
    cards = [c for c in body["cards"] if c["type"] == "timeseries_chart"]
    if not cards:
        pytest.skip("no trend card")
    for p in cards[0]["points"]:
        assert p["source"], f"a trend point with no source: {p}"
        assert p["status"] in ("LIVE", "FORECAST", "CACHED", "HISTORICAL", "DEMO")


# ---------------------------------------------------------------------------
# One recommendation derivation
# ---------------------------------------------------------------------------

GENERIC_LINES = (
    "Monitor INCOIS satellite passes",
    "Prioritize operations in the calmer sector",
    "Verify whether modern wave subsidence continues",
    "Exercise standard safety precautions",
)


@pytest.mark.parametrize(
    "query",
    [
        "Is it safe to venture into the sea tomorrow morning?",
        "Where is the nearest Potential Fishing Zone today?",
        "How have wave conditions changed over the past week near Kakinada?",
        "What is the safest route for a fishing vessel from Kakinada to Chennai?",
        "Which fishing zones should be avoided due to hazardous marine conditions?",
    ],
)
def test_the_recommendation_leads_with_the_engines_verdict(client, query):
    body = _ask(client, query)
    rec = body["answer"]["narrative"] if "answer" in body else ""
    advisory = next(
        (c for c in body["cards"] if c["type"] == "advisory_text"), None
    )
    text = (advisory or {}).get("body", "") or rec
    assert text, f"no advisory text for {query!r}"

    band = (body.get("risk") or {}).get("band")
    if band:
        # The advisory opens with the band's own word, from advisory_for_band.
        opener = text.split(":")[0].strip().upper()
        assert opener in ("LOW", "MODERATE", "CAUTION", "HIGH", "SEVERE", "NO-GO"), (
            f"the advisory does not lead with the engine's band: {text[:120]!r}"
        )


@pytest.mark.parametrize(
    "query",
    [
        "Where is the nearest Potential Fishing Zone today?",
        "How have wave conditions changed over the past week near Kakinada?",
        "Compare marine conditions between Chennai and Visakhapatnam",
    ],
)
def test_no_intent_falls_back_to_a_hand_written_line(client, query):
    body = _ask(client, query)
    advisory = next((c for c in body["cards"] if c["type"] == "advisory_text"), None)
    text = (advisory or {}).get("body", "")
    for line in GENERIC_LINES:
        assert line not in text, (
            f"{query!r} still ends in the hand-written advisory {line!r}"
        )


def test_the_recommendation_repeats_the_rules_the_engine_triggered(client):
    body = _ask(client, "Is it safe to venture into the sea tomorrow morning?")
    rules = (body.get("risk") or {}).get("triggered_rules") or []
    if not rules:
        pytest.skip("no rules triggered under these conditions")
    advisory = next((c for c in body["cards"] if c["type"] == "advisory_text"), None)
    text = (advisory or {}).get("body", "")
    assert any(rule[:40] in text for rule in rules), (
        f"none of the engine's triggered rules reach the advisory: {rules}"
    )


def test_there_is_one_recommendation_builder():
    import sys

    source = inspect.getsource(sys.modules["app.agents.report_agent"])
    # Every intent branch routes through advise(), which is operational_recommendation.
    assert "def advise(" in source
    assert source.count("operational_recommendation(") >= 1


# ---------------------------------------------------------------------------
# No fabricated trace steps
# ---------------------------------------------------------------------------


def test_no_agent_step_carries_a_hardcoded_duration():
    """A duration nobody measured is a claim about work nobody timed."""
    import sys

    for name in ("app.agents.orchestrator", "app.agents.report_agent"):
        module = sys.modules[name]
        source = inspect.getsource(module)
        literals = re.findall(r"duration_ms\s*=\s*(\d+)", source)
        assert not literals, (
            f"{module.__name__} records durations it never measured: {literals}"
        )


def test_the_step_that_computed_nothing_is_gone():
    """A "Geospatial Navigation Agent / destination_point" step recorded work
    the planner had already done before the branch ran."""
    import sys

    source = inspect.getsource(sys.modules["app.agents.orchestrator"])
    assert 'tool="destination_point"' not in source, (
        "the trace step that performed no work is back"
    )


def test_every_reported_step_has_a_plausible_measured_duration(client):
    body = _ask(client, "Is it safe to venture into the sea tomorrow morning?")
    steps = body.get("trace") or []
    assert steps, "no trace at all"
    for step in steps:
        assert step.get("duration_ms") is not None
        assert step["duration_ms"] >= 0
