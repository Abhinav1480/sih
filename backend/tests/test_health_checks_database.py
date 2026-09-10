"""/health must actually check the database it reports on.

`status: "HEALTHY"` and `database: "CONNECTED"` were string literals returned
without touching the database. Pointing DATABASE_URL at a non-existent
directory and skipping startup still reported CONNECTED, so any uptime monitor
watching this endpoint reported green while the database was unreachable.
"""

import importlib

import pytest
from fastapi.testclient import TestClient

from app.main import app


def test_health_reports_connected_when_the_database_is_reachable():
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["database"] == "CONNECTED"
    assert body["status"] == "HEALTHY"
    assert "database_error" not in body


def test_health_reports_unavailable_when_the_database_is_not(monkeypatch):
    """The regression. A broken engine must not report CONNECTED."""

    class _BrokenEngine:
        def connect(self):
            raise OSError("unable to open database file")

    import app.main as main_module

    monkeypatch.setattr(main_module, "engine", _BrokenEngine())

    # Bypass lifespan: init_db would fail first and mask what we are testing.
    client = TestClient(app)
    response = client.get("/health")

    body = response.json()
    assert body["database"] == "UNAVAILABLE", (
        "a database that cannot be connected to is still reported CONNECTED"
    )
    assert body["status"] == "DEGRADED"
    assert "unable to open database file" in body["database_error"]


def test_a_degraded_service_does_not_answer_200(monkeypatch):
    """A probe that always returns 200 is decorative."""

    class _BrokenEngine:
        def connect(self):
            raise OSError("connection refused")

    import app.main as main_module

    monkeypatch.setattr(main_module, "engine", _BrokenEngine())

    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 503, (
        "an unreachable database still answers 200, so an uptime monitor "
        "reports green"
    )


def test_the_literals_are_gone_from_the_source():
    """
    A behavioural test passes if the probe happens to work. This asserts the
    endpoint cannot go back to asserting health without checking it.
    """
    import inspect

    import app.main as main_module

    source = inspect.getsource(main_module.health_check)
    assert "SELECT 1" in source, "/health does not execute a database probe"
    assert '"database": "CONNECTED"' not in source, (
        "/health still hardcodes a CONNECTED literal"
    )
