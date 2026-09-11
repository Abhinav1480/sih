"""
Password hashing and JWT issuance for the auth endpoints (P3-1).

Passwords are hashed with bcrypt (cost 12) and never stored or logged in the
clear. Tokens are HS256 JWTs signed with JWT_SECRET; access tokens are short-
lived, refresh tokens are long-lived, stored hashed, and revocable. Refresh
tokens are opaque random strings, not JWTs, so a leaked database cannot mint
sessions.
"""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import bcrypt
import jwt

from app.config import settings

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user_id: str) -> tuple[str, int]:
    """Returns (token, expires_in_seconds)."""
    ttl = timedelta(minutes=settings.ACCESS_TOKEN_MINUTES)
    now = datetime.now(timezone.utc)
    payload: Dict[str, Any] = {"sub": user_id, "iat": now, "exp": now + ttl, "typ": "access"}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM), int(ttl.total_seconds())


def decode_access_token(token: str) -> Optional[str]:
    """The user id inside a valid, unexpired access token, else None."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
    if payload.get("typ") != "access":
        return None
    sub = payload.get("sub")
    return sub if isinstance(sub, str) else None


def new_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def refresh_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_DAYS)
