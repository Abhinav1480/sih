import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from app.config import settings
from app.api.router import api_router
from app.database.session import engine, init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.JWT_SECRET.startswith("orca-dev-secret-change-me") and not settings.DEBUG:
        # No secret configured on a non-debug server: sign with a per-process random secret
        # rather than the published default. Access tokens die on restart; refresh tokens are
        # opaque and DB-backed, so the app re-authenticates silently. Set JWT_SECRET to stop this.
        import secrets
        settings.JWT_SECRET = secrets.token_urlsafe(48)
        logging.getLogger("orca.auth").warning("JWT_SECRET is not set; using a per-process secret (set JWT_SECRET in the environment)")
    # Initialize SQLite / PostgreSQL tables on startup
    await init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Generalized Marine Intelligence and Collaborative Multi-Agent Decision Support Platform for SIH 2026 PS 26176.",
    lifespan=lifespan
)

# CORS middleware for Next.js frontend communication
# Explicit origins come from CORS_ORIGINS (comma list in .env); any Vercel
# deployment of the frontend is allowed by pattern.
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.CORS_ORIGINS) if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API
app.include_router(api_router, prefix=settings.API_V1_STR)

async def _probe_database() -> tuple[str, str | None]:
    """Run SELECT 1 against the engine. Returns (state, error-or-None)."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return "CONNECTED", None
    except Exception as exc:
        return "UNAVAILABLE", f"{type(exc).__name__}: {exc}"[:200]


async def _health_payload() -> tuple[dict, str]:
    database, database_error = await _probe_database()
    payload = {
        "status": "HEALTHY" if database == "CONNECTED" else "DEGRADED",
        "service": "ORCA Marine Intelligence Engine",
        "version": settings.VERSION,
        "mode": settings.ORCA_MODE,
        "database": database,
    }
    if database_error:
        payload["database_error"] = database_error
    return payload, database


@app.get("/health")
async def health_check():
    """Liveness. This is the endpoint the hosting platform polls.

    It answers 200 whenever the process is up, and reports the database state
    in the body. It deliberately does NOT answer 503 on a database failure:
    Render and most platforms read a non-2xx health check as a failed
    instance, so a transient database blip would take the whole service down
    and could block a deploy from ever going live. The probe is real -- read
    `database` and `database_error` in the body, or poll /health/deep.
    """
    payload, _ = await _health_payload()
    return JSONResponse(status_code=200, content=payload)


@app.get("/health/deep")
async def health_check_deep():
    """Dependency health, for humans and monitoring -- never for the platform.

    Answers 503 when a dependency is genuinely unavailable, so an alerting
    rule can page on it without the platform recycling the instance.
    """
    payload, database = await _health_payload()
    return JSONResponse(
        status_code=200 if database == "CONNECTED" else 503,
        content=payload,
    )


@app.get("/")
async def root():
    return {
        "message": "Welcome to ORCA — Marine EcOsystem Reasoning with Collaborative Agents (SIH 2026 PS 26176)",
        "api_docs": "/docs",
        "health": "/health"
    }
