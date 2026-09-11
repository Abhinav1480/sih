import os
from typing import List, Union
from pydantic import field_validator, ConfigDict
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "ORCA — Marine Ecosystem Reasoning with Collaborative Agents"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Operational Mode: "DEMO" or "LIVE"
    ORCA_MODE: str = os.getenv("ORCA_MODE", "DEMO").upper()

    # DEMO only: freeze "now" to an ISO timestamp so that "tomorrow morning"
    # resolves to the same morning on every run and the same cached granules
    # are selected. Empty means use the wall clock. Read by app/utils/clock.py,
    # which arrived referencing this setting before it existed -- any call to
    # clock.now() raised AttributeError until it was added.
    ORCA_DEMO_NOW: str = os.getenv("ORCA_DEMO_NOW", "")

    
    # Server settings
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "t")
    
    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        # The Capacitor app: Android serves the bundle from https://localhost,
        # iOS from capacitor://localhost. Neither is a public web origin.
        "https://localhost",
        "capacitor://localhost",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v
        return ["*"]
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./orca.db")
    
    # AI / LLM Configuration
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    ANTHROPIC_MODEL: str = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")
    
    # External APIs
    OPEN_METEO_BASE_URL: str = os.getenv("OPEN_METEO_BASE_URL", "https://marine-api.open-meteo.com/v1/marine")
    OPEN_METEO_WEATHER_URL: str = "https://api.open-meteo.com/v1/forecast"
    # --- ISRO / NRSC sources (tier ISRO) ---
    # Bhuvan WMS needs no credentials. bhuvan-vec1 is the host that answers;
    # bhuvan-vec2 times out and bhuvan-ras1 returns 403. Configurable because a
    # venue network may reach a different mirror.
    BHUVAN_WMS_URL: str = os.getenv("BHUVAN_WMS_URL", "https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms")
    # MOSDAC and Bhoonidhi are authentication-gated product-download services.
    # Without a token they are skipped and the chain falls back honestly.
    MOSDAC_API_TOKEN: str = os.getenv("MOSDAC_API_TOKEN", "")
    BHOONIDHI_API_TOKEN: str = os.getenv("BHOONIDHI_API_TOKEN", "")
    # Granules are fetched out of band and served from here, which is what lets
    # ISRO products work at a venue with no connectivity.
    ISRO_GRANULE_CACHE_DIR: str = os.getenv("ISRO_GRANULE_CACHE_DIR", "./data/granules")

    INCOIS_API_BASE: str = os.getenv("INCOIS_API_BASE", "https://incois.gov.in/portal")
    INCOIS_API_TOKEN: str = os.getenv("INCOIS_API_TOKEN", "")
    IMD_API_BASE: str = os.getenv("IMD_API_BASE", "https://mausam.imd.gov.in/api")

settings = Settings()
