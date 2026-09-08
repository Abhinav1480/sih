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
    INCOIS_API_BASE: str = os.getenv("INCOIS_API_BASE", "https://incois.gov.in/portal")
    INCOIS_API_TOKEN: str = os.getenv("INCOIS_API_TOKEN", "")
    IMD_API_BASE: str = os.getenv("IMD_API_BASE", "https://mausam.imd.gov.in/api")

settings = Settings()
