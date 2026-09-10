"""/health must probe the database it reports on -- and must not take the
service down when that probe fails.

Two defects, fixed in that order.

P0-9: `status: "HEALTHY"` and `database: "CONNECTED"` were string literals
returned without touching the database, so an uptime monitor reported green
while the database was unreachable. The probe is now real.

P1-1: the P0-9 fix then answered 503 from /health. Render and most platforms
read a non-2xx health check as a failed instance, so a transient database blip
would recycle the whole service and could block a deploy from going live. The
liveness endpoint the platform polls now answers 200 whenever the process is
up and names the failure in the body; /health/deep is the one that answers 503,
and it is for humans and monitoring only.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


class _BrokenEngine:
    def __init__(self, message="unable to open database file"):
        self.message = message

    def connect(self):
        raise OSError(self.message)


@pytest.fixture
def broken_db(monkeypatch):
    import app.main as main_module

    monkeypatch.setattr(main_module, "engine", _BrokenEngine())
    # Bypass lifespan: init_db would fail first and mask what we are testing.
    return TestClient(app)


def test_health_reports_connected_when_the_database_is_reachable():
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["database"] == "CONNECTED"
    assert body["status"] == "HEALTHY"
    assert "database_error" not in body


def test_deep_health_reports_connected_when_the_database_is_reachable():
    with TestClient(app) as client:
        response = client.get("/health/deep")

    assert response.status_code == 200
    assert response.json()["database"] == "CONNECTED"


def test_health_reports_unavailable_when_the_database_is_not(broken_db):
    """The P0-9 regression. A broken engine must not report CONNECTED."""
    body = broken_db.get("/health").json()

    assert body["database"] == "UNAVAILABLE", (
        "a database that cannot be connected to is still reported CONNECTED"
    )
    assert body["status"] == "DEGRADED"
    assert "unable to open database file" in body["database_error"]


def test_liveness_stays_200_while_the_process_is_up(broken_db):
    """The P1-1 regression.

    The platform polls /health. If a database blip makes it 503, the platform
    kills a process that is running perfectly well and can refuse to roll out
    the deploy at all.
    """
    response = broken_db.get("/health")

    assert response.status_code == 200, (
        "a database failure answers non-2xx from the endpoint the platform "
        "polls, so a transient blip takes the whole service down"
    )
    body = response.json()
    assert body["status"] == "DEGRADED"
    assert body["database"] == "UNAVAILABLE"
    assert "unable to open database file" in body["database_error"], (
        "liveness returned 200 without naming the failure anywhere"
    )


def test_deep_health_answers_503_when_a_dependency_is_down(broken_db):
    """A probe that can never fail is decorative. /health/deep is the one
    monitoring pages on."""
    response = broken_db.get("/health/deep")

    assert response.status_code == 503, (
        "an unreachable database still answers 200 from /health/deep, so "
        "nothing can alert on it"
    )
    body = response.json()
    assert body["database"] == "UNAVAILABLE"
    assert "unable to open database file" in body["database_error"]


def test_the_literals_are_gone_from_the_source():
    """
    A behavioural test passes if the probe happens to work. This asserts the
    endpoints cannot go back to asserting health without checking it.
    """
    import inspect

    import app.main as main_module

    probe = inspect.getsource(main_module._probe_database)
    assert "SELECT 1" in probe, "the health probe does not query the database"

    for fn in (main_module.health_check, main_module.health_check_deep):
        source = inspect.getsource(fn)
        assert '"database": "CONNECTED"' not in source, (
            f"{fn.__name__} still hardcodes a CONNECTED literal"
        )
