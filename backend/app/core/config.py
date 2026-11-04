"""Application settings, loaded from environment variables / .env files.

Nothing secret is hard-coded here; defaults are safe for local development
only. ``APP_ENV=production`` enables stricter validation (see ``validate``).
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(PROJECT_DIR / ".env", BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "Locate U"
    APP_ENV: Literal["development", "test", "production"] = "development"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    BACKEND_HOST: str = "127.0.0.1"
    BACKEND_PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    DATABASE_URL: str = f"sqlite:///{BACKEND_DIR / 'locate_u_dev.sqlite3'}"

    SECRET_KEY: str = Field(default="dev-insecure-change-me", min_length=16)
    ACCESS_TOKEN_MINUTES: int = 60 * 24 * 7

    # Map / geocoding
    MAP_PROVIDER: str = "osm"
    OSM_TILE_URL: str = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    NOMINATIM_BASE_URL: str = "https://nominatim.openstreetmap.org"
    NOMINATIM_EMAIL: str = ""  # recommended by the Nominatim usage policy
    NOMINATIM_MIN_INTERVAL_SECONDS: float = 1.0  # policy: max 1 request / second
    GEOCODE_CACHE_DAYS: int = 30
    HTTP_USER_AGENT: str = "LocateU/1.0 (self-hosted travel companion)"
    HTTP_TIMEOUT_SECONDS: float = 12.0

    INDIA_DATA_DIR: str = str(PROJECT_DIR / "data" / "processed" / "india")

    # Free, key-less preview providers (each can be switched off)
    FEATURE_WEATHER: bool = True
    OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1"
    FEATURE_WIKIPEDIA: bool = True
    WIKIPEDIA_BASE_URL: str = "https://en.wikipedia.org"
    FEATURE_NEARBY: bool = True
    OVERPASS_URL: str = "https://overpass-api.de/api/interpreter"

    # Run migrations + import the India dataset on startup when the DB is empty.
    AUTO_SETUP: bool = True
    # Optional path to a built frontend to serve from the backend (defaults to ../frontend/dist).
    FRONTEND_DIST: str = ""

    # API rate limit for this backend (per client IP)
    RATE_LIMIT_PER_MINUTE: int = 120

    # Future paid integrations: intentionally unused until explicitly approved.
    GEMINI_API_KEY: str = ""
    WEATHER_API_KEY: str = ""
    GOOGLE_MAPS_API_KEY: str = ""

    @field_validator("DATABASE_URL")
    @classmethod
    def _normalise_db(cls, v: str) -> str:
        if v.startswith("postgres://"):
            v = "postgresql+psycopg://" + v[len("postgres://"):]
        elif v.startswith("postgresql://"):
            v = "postgresql+psycopg://" + v[len("postgresql://"):]
        return v

    @model_validator(mode="after")
    def _production_checks(self) -> "Settings":
        if self.APP_ENV == "production":
            if self.SECRET_KEY.startswith("dev-") or len(self.SECRET_KEY) < 32:
                raise ValueError("SECRET_KEY must be a strong random value (>=32 chars) in production")
            if self.DEBUG:
                raise ValueError("DEBUG must be false in production")
            if "*" in self.cors_origins:
                raise ValueError("CORS_ORIGINS must list explicit origins in production")
        return self

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_postgres(self) -> bool:
        return self.DATABASE_URL.startswith("postgresql")

    @property
    def india_data_path(self) -> Path:
        p = Path(self.INDIA_DATA_DIR)
        return p if p.is_absolute() else (BACKEND_DIR / p).resolve()

    @property
    def user_agent(self) -> str:
        ua = self.HTTP_USER_AGENT
        return f"{ua} contact:{self.NOMINATIM_EMAIL}" if self.NOMINATIM_EMAIL else ua


@lru_cache
def get_settings() -> Settings:
    return Settings()
