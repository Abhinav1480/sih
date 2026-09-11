"""
Auth endpoints (P3-1): register, login, refresh, logout, me.

Runs against a throwaway SQLite file so the developer database is untouched.
"""

from __future__ import annotations

import os
import uuid

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", f"sqlite+aiosqlite:///./test_auth_{uuid.uuid4().hex}.db")

from app.main import app  # noqa: E402  (after the env var)
from app.security import hash_password, verify_password  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def _register(client, identifier=None, password="correct horse battery", name="Lakshmi", lang="te"):
    identifier = identifier or f"+91{uuid.uuid4().int % 10**10:010d}"
    r = client.post("/api/auth/register", json={
        "identifier": identifier, "password": password, "name": name, "preferred_language": lang,
    })
    return identifier, r


def test_register_returns_tokens_and_user(client):
    identifier, r = _register(client)
    assert r.status_code == 201, r.text
    body = r.json()
    assert set(body) == {"user", "access_token", "refresh_token", "token_type", "expires_in"}
    assert body["token_type"] == "bearer" and body["expires_in"] > 0
    assert body["user"]["identifier"] == identifier
    assert body["user"]["preferred_language"] == "te"
    assert "password" not in body["user"] and "password_hash" not in body["user"]


def test_duplicate_identifier_is_409(client):
    identifier, r = _register(client)
    assert r.status_code == 201
    _, again = _register(client, identifier=identifier)
    assert again.status_code == 409
    assert again.json()["detail"] == "identifier_taken"


def test_identifier_must_be_phone_or_email(client):
    _, r = _register(client, identifier="not a phone")
    assert r.status_code == 422


def test_short_password_rejected(client):
    _, r = _register(client, password="short")
    assert r.status_code == 422


def test_login_then_me(client):
    identifier, r = _register(client, password="another good one")
    assert r.status_code == 201
    login = client.post("/api/auth/login", json={"identifier": identifier, "password": "another good one"})
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["identifier"] == identifier


def test_wrong_password_is_401_and_says_nothing_specific(client):
    identifier, _ = _register(client, password="the right password")
    r = client.post("/api/auth/login", json={"identifier": identifier, "password": "the wrong password"})
    assert r.status_code == 401
    assert r.json()["detail"] == "credentials_invalid"
    unknown = client.post("/api/auth/login", json={"identifier": "+919999999999", "password": "whatever"})
    assert unknown.status_code == 401
    assert unknown.json()["detail"] == "credentials_invalid"


def test_me_without_token_is_401(client):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer nonsense"}).status_code == 401


def test_refresh_rotates_and_old_token_dies(client):
    _, r = _register(client)
    first = r.json()["refresh_token"]
    rotated = client.post("/api/auth/refresh", json={"refresh_token": first})
    assert rotated.status_code == 200, rotated.text
    second = rotated.json()["refresh_token"]
    assert second != first
    # The used token is dead.
    assert client.post("/api/auth/refresh", json={"refresh_token": first}).status_code == 401
    # The new one works.
    assert client.post("/api/auth/refresh", json={"refresh_token": second}).status_code == 200


def test_logout_revokes_refresh_token(client):
    _, r = _register(client)
    refresh = r.json()["refresh_token"]
    assert client.post("/api/auth/logout", json={"refresh_token": refresh}).status_code == 204
    assert client.post("/api/auth/refresh", json={"refresh_token": refresh}).status_code == 401
    # Logging out twice, or with garbage, is still a quiet 204.
    assert client.post("/api/auth/logout", json={"refresh_token": refresh}).status_code == 204
    assert client.post("/api/auth/logout", json={"refresh_token": "garbage"}).status_code == 204


def test_profile_patch_merges(client):
    _, r = _register(client)
    token = r.json()["access_token"]
    h = {"Authorization": f"Bearer {token}"}
    a = client.patch("/api/auth/me", json={"profile": {"home_harbour": {"name": "Kakinada"}}}, headers=h)
    assert a.status_code == 200 and a.json()["profile"]["home_harbour"]["name"] == "Kakinada"
    b = client.patch("/api/auth/me", json={"preferred_language": "ta", "profile": {"vessel": {"length_m": 9.2}}}, headers=h)
    assert b.status_code == 200
    assert b.json()["preferred_language"] == "ta"
    assert b.json()["profile"] == {"home_harbour": {"name": "Kakinada"}, "vessel": {"length_m": 9.2}}
    assert client.patch("/api/auth/me", json={"preferred_language": "xx"}, headers=h).status_code == 422


def test_passwords_are_hashed_not_stored():
    h = hash_password("correct horse battery")
    assert h != "correct horse battery" and h.startswith("$2")
    assert verify_password("correct horse battery", h)
    assert not verify_password("correct horse batterx", h)
