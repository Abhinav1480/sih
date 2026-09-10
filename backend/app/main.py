from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.router import api_router
from app.database.session import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
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

@app.get("/health")
async def health_check():
    return {
        "status": "HEALTHY",
        "service": "ORCA Marine Intelligence Engine",
        "version": settings.VERSION,
        "mode": settings.ORCA_MODE,
        "database": "CONNECTED"
    }

@app.get("/")
async def root():
    return {
        "message": "Welcome to ORCA — Marine EcOsystem Reasoning with Collaborative Agents (SIH 2026 PS 26176)",
        "api_docs": "/docs",
        "health": "/health"
    }
