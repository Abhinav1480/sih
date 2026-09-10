"""/api/alerts must not invent government bulletins.

The endpoint used to return three hand-written dictionaries carrying real
agency identities and authentic-looking bulletin numbers -- INCOIS-HWA-2026-089
from "INCOIS High Wave Alert Service", IMD-SQ-2026-042 from "IMD Coastal
Weather Division", MOEFCC-MPA-CONSV-01 from "Department of Forests & MoEFCC" --
with invented wave heights and wind speeds, stamped with the current time so
they always looked freshly issued, and carrying no DEMO marker at all.

No agency issued any of them, and they were served in production. ORCA has no
IMD adapter and its INCOIS provider is cache-only and empty.
"""

import re

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

# The exact identifiers that were fabricated, plus the general shape of an
# agency bulletin number, so a new one cannot be introduced either.
FABRICATED_IDS = [
    "INCOIS-HWA-2026-089",
    "IMD-SQ-2026-042",
    "MOEFCC-MPA-CONSV-01",
]

AGENCY_BULLETIN_ID = re.compile(
    r"\b(INCOIS|IMD|MOEFCC|MOSDAC|NRSC|ISRO|NCMRWF)[-_/][A-Z0-9][-_/A-Z0-9]{2,}\b",
    re.IGNORECASE,
)

# An agency named as the *author* of an alert. Naming one as somewhere to go
# and check is fine and desirable; claiming one wrote this record is not.
AGENCY_AUTHOR = re.compile(
    r"^\s*(INCOIS|IMD|MOEFCC|Ministry of Earth|India Meteorological|"
    r"Department of Forests|National Centre)",
    re.IGNORECASE,
)


@pytest.fixture(scope="module")
def alerts():
    response = client.get("/api/alerts")
    assert response.status_code == 200
    return response.json()


def test_none_of_the_fabricated_bulletin_ids_survive(alerts):
    """The regression, named exactly."""
    ids = [a.get("alert_id", "") for a in alerts]
    for fabricated in FABRICATED_IDS:
        assert fabricated not in ids, f"fabricated bulletin id still served: {fabricated}"


def test_no_alert_carries_an_agency_style_bulletin_number(alerts):
    """Catches a newly invented identifier, not just the three known ones."""
    for alert in alerts:
        blob = f"{alert.get('alert_id', '')} {alert.get('title', '')}"
        match = AGENCY_BULLETIN_ID.search(blob)
        assert not match, (
            f"alert carries an agency-style bulletin number: {match.group(0)!r}"
        )


def test_no_alert_claims_an_agency_as_its_author(alerts):
    """`source` is who wrote this record. It must be ORCA, or nobody."""
    for alert in alerts:
        source = alert.get("source", "")
        assert not AGENCY_AUTHOR.match(source), (
            f"alert attributes itself to an agency that did not write it: {source!r}"
        )


def test_every_alert_declares_it_is_not_an_agency_bulletin(alerts):
    for alert in alerts:
        assert alert.get("is_agency_bulletin") is False, (
            f"alert does not declare its provenance: {alert.get('alert_id')}"
        )


def test_every_alert_carries_a_freshness_status_and_tier(alerts):
    """The query path tags every value. This endpoint used to tag nothing."""
    for alert in alerts:
        assert alert.get("status") in {"DEMO", "UNAVAILABLE", "LIVE", "CACHED"}, (
            f"alert has no freshness status: {alert.get('alert_id')}"
        )
        assert alert.get("provider_tier"), (
            f"alert has no provider tier: {alert.get('alert_id')}"
        )


def test_the_absence_of_alerts_is_stated_rather_than_implied(alerts):
    """
    An empty array renders as a blank panel, which on a safety product reads as
    "no alert is in force" -- the opposite of the truth, which is "no feed is
    connected". The reason must be visible to the reader.
    """
    assert alerts, "endpoint returned nothing at all, so the reason is invisible"

    text = " ".join(
        f"{a.get('title', '')} {a.get('description', '')}" for a in alerts
    ).lower()
    assert "not connected" in text or "no live" in text or "not mean" in text, (
        "the response does not tell the reader why there are no bulletins"
    )


def test_the_notice_points_at_the_real_authorities(alerts):
    """Naming an agency as somewhere to check is the honest use of its name."""
    text = " ".join(a.get("recommended_action", "") for a in alerts)
    assert "IMD" in text or "INCOIS" in text, (
        "the notice does not tell the user where to get real bulletins"
    )


def test_the_endpoint_does_not_invent_wave_or_wind_figures(alerts):
    """The old bulletins carried specific invented metres and km/h."""
    text = " ".join(
        f"{a.get('title', '')} {a.get('description', '')}" for a in alerts
    )
    assert not re.search(r"\d+(\.\d+)?\s*(m|metre|meter)s?\b", text), (
        "the alert notice states a wave height it did not measure"
    )
    assert not re.search(r"\d+\s*-\s*\d+\s*km/h", text), (
        "the alert notice states a wind speed it did not measure"
    )
