"""
Auth endpoints (P3-1): register, login, refresh, logout, me.

Identity is a phone number or an email plus a password. No biometrics: a face
embedding is reversible biometric data under the DPDP Act and has no place in a
project of this size.

Shape of every token response:
    {"user": {...}, "access_token": "...", "refresh_token": "...",
     "token_type": "bearer", "expires_in": 3600}

Errors use FastAPI's standard {"detail": "..."} body with a stable machine
code in `detail` so the client can localise it.
"""

from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import RefreshTokenDB, UserDB
from app.database.session import get_db
from app.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    hash_refresh_token,
    new_refresh_token,
    refresh_expiry,
    verify_password,
)

router = APIRouter(prefix="/auth")

PHONE_RE = re.compile(r"^\+?[0-9]{10,15}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
SUPPORTED_LANGUAGES = {"en", "te", "ta", "hi", "or", "ml", "kn", "bn", "mr", "gu"}


def normalise_identifier(raw: str) -> str:
    """Phone numbers lose spaces and dashes; emails are lower-cased. Anything else is rejected."""
    value = raw.strip()
    compact = re.sub(r"[\s\-()]", "", value)
    if PHONE_RE.match(compact):
        return compact
    if EMAIL_RE.match(value):
        return value.lower()
    raise HTTPException(status_code=422, detail="identifier_invalid")


# --- schemas -------------------------------------------------------------------

class UserOut(BaseModel):
    id: str
    identifier: str
    name: str
    preferred_language: str
    profile: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class RegisterIn(BaseModel):
    identifier: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=255)
    preferred_language: str = "en"

    @field_validator("preferred_language")
    @classmethod
    def _lang(cls, v: str) -> str:
        if v not in SUPPORTED_LANGUAGES:
            raise ValueError("language_unsupported")
        return v


class LoginIn(BaseModel):
    identifier: str
    password: str


class RefreshIn(BaseModel):
    refresh_token: str


class ProfilePatch(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    preferred_language: Optional[str] = None
    # Free-form onboarding answers (home harbour, vessel). Stored as given; never a measurement.
    profile: Optional[Dict[str, Any]] = None

    @field_validator("preferred_language")
    @classmethod
    def _lang(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in SUPPORTED_LANGUAGES:
            raise ValueError("language_unsupported")
        return v


class TokenOut(BaseModel):
    user: UserOut
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


# --- helpers -------------------------------------------------------------------

def to_user_out(u: UserDB) -> UserOut:
    profile: Dict[str, Any] = {}
    if u.profile_json:
        try:
            profile = json.loads(u.profile_json)
        except ValueError:
            profile = {}
    return UserOut(
        id=u.id, identifier=u.identifier, name=u.name,
        preferred_language=u.preferred_language, profile=profile, created_at=u.created_at,
    )


async def issue_tokens(db: AsyncSession, user: UserDB) -> TokenOut:
    access, expires_in = create_access_token(user.id)
    refresh = new_refresh_token()
    db.add(RefreshTokenDB(token_hash=hash_refresh_token(refresh), user_id=user.id, expires_at=refresh_expiry()))
    await db.commit()
    return TokenOut(user=to_user_out(user), access_token=access, refresh_token=refresh, expires_in=expires_in)


async def current_user(
    authorization: Optional[str] = Header(default=None), db: AsyncSession = Depends(get_db)
) -> UserDB:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token_missing")
    user_id = decode_access_token(authorization.split(" ", 1)[1].strip())
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token_invalid")
    user = await db.get(UserDB, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token_invalid")
    return user


# --- endpoints -----------------------------------------------------------------

@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterIn, db: AsyncSession = Depends(get_db)) -> TokenOut:
    identifier = normalise_identifier(body.identifier)
    existing = await db.scalar(select(UserDB).where(UserDB.identifier == identifier))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="identifier_taken")
    user = UserDB(
        id=str(uuid.uuid4()), identifier=identifier, password_hash=hash_password(body.password),
        name=body.name.strip(), preferred_language=body.preferred_language,
    )
    db.add(user)
    await db.flush()
    return await issue_tokens(db, user)


@router.post("/login", response_model=TokenOut)
async def login(body: LoginIn, db: AsyncSession = Depends(get_db)) -> TokenOut:
    try:
        identifier = normalise_identifier(body.identifier)
    except HTTPException:
        # Same answer as a wrong password: the form of the identifier is not a hint.
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="credentials_invalid")
    user = await db.scalar(select(UserDB).where(UserDB.identifier == identifier))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="credentials_invalid")
    return await issue_tokens(db, user)


@router.post("/refresh", response_model=TokenOut)
async def refresh(body: RefreshIn, db: AsyncSession = Depends(get_db)) -> TokenOut:
    row = await db.get(RefreshTokenDB, hash_refresh_token(body.refresh_token))
    now = datetime.now(timezone.utc)
    expires = row.expires_at.replace(tzinfo=timezone.utc) if row and row.expires_at.tzinfo is None else (row.expires_at if row else None)
    if not row or row.revoked_at is not None or (expires is not None and expires < now):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="refresh_invalid")
    user = await db.get(UserDB, row.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="refresh_invalid")
    # Rotate: the old refresh token dies the moment it is used.
    row.revoked_at = now
    return await issue_tokens(db, user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(body: RefreshIn, db: AsyncSession = Depends(get_db)) -> None:
    row = await db.get(RefreshTokenDB, hash_refresh_token(body.refresh_token))
    if row and row.revoked_at is None:
        row.revoked_at = datetime.now(timezone.utc)
        await db.commit()
    # An unknown token logs out just the same: nothing to reveal.
    return None


@router.get("/me", response_model=UserOut)
async def me(user: UserDB = Depends(current_user)) -> UserOut:
    return to_user_out(user)


@router.patch("/me", response_model=UserOut)
async def update_me(body: ProfilePatch, user: UserDB = Depends(current_user), db: AsyncSession = Depends(get_db)) -> UserOut:
    if body.name is not None:
        user.name = body.name.strip()
    if body.preferred_language is not None:
        user.preferred_language = body.preferred_language
    if body.profile is not None:
        current: Dict[str, Any] = {}
        if user.profile_json:
            try:
                current = json.loads(user.profile_json)
            except ValueError:
                current = {}
        current.update(body.profile)
        user.profile_json = json.dumps(current)
    await db.commit()
    await db.refresh(user)
    return to_user_out(user)
