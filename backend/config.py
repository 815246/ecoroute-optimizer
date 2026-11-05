"""
Application configuration loaded from environment variables or .env file.

All secrets and environment-specific values must be provided via environment;
no defaults contain credentials.
"""

from __future__ import annotations

from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for EcoRoute Optimizer backend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./ecoroute.db"

    # ── Data modes ───────────────────────────────────────────────────────────
    DEFAULT_DATA_MODE: str = "simulated"  # "simulated" | "real"

    # ── Algorithm thresholds ─────────────────────────────────────────────────
    REPLAN_THRESHOLD: float = 0.05  # 5% score improvement triggers replan
    EV_RESERVE: float = 0.10  # 10% battery reserve
    K_ALTERNATIVES: int = 5  # shortest_simple_paths count

    # ── OSM / geocoding ──────────────────────────────────────────────────────
    MAX_BBOX_KM: float = 50.0  # maximum bounding-box side length
    CACHE_DIR: Path = Path("./cache")  # graphml cache directory
    OSM_USER_AGENT: str = "EcoRouteOptimizer/1.0"
    GEOCODING_TIMEOUT: int = 10  # seconds
    SNAP_THRESHOLD_M: float = 500.0  # max distance to snap to nearest node

    # ── Emission model ───────────────────────────────────────────────────────
    SPEED_AWARE: bool = False  # speed-dependent consumption curve
    EMISSION_FACTORS_PATH: Path = Path("../data/emission_factors.json")
    VEHICLE_CONFIGS_PATH: Path = Path("../data/vehicle_configs.json")
    SIMULATED_ROADS_PATH: Path = Path("../data/simulated_roads.json")

    # ── Normalization reference scales (city-trip defaults) ──────────────────
    # These are FIXED reference values, not computed from candidates.
    # Chosen to represent a moderate city-to-suburb trip (~30 km, ~45 min).
    # Adjust for intercity use-cases. See docs/METHODOLOGY.md for justification.
    DISTANCE_REF_KM: float = 30.0
    TIME_REF_MIN: float = 45.0
    RESOURCE_REF: float = 3.0  # litres petrol or kWh (EV scaled)
    EMISSIONS_REF_KG: float = 7.0  # kg CO2

    # ── API / server ─────────────────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    API_PREFIX: str = "/api"
    APP_TITLE: str = "EcoRoute Optimizer"
    APP_VERSION: str = "1.0.0"

    # ── Traffic simulation ───────────────────────────────────────────────────
    TRAFFIC_SEED: int = 42
    INCIDENT_PROBABILITY: float = 0.05  # probability an edge gets an incident

    @field_validator("DEFAULT_DATA_MODE")
    @classmethod
    def validate_data_mode(cls, v: str) -> str:
        """Ensure data mode is one of the allowed values."""
        allowed = {"simulated", "real"}
        if v not in allowed:
            raise ValueError(f"DEFAULT_DATA_MODE must be one of {allowed}, got {v!r}")
        return v

    @field_validator("REPLAN_THRESHOLD")
    @classmethod
    def validate_replan_threshold(cls, v: float) -> float:
        """Replan threshold must be positive."""
        if v <= 0:
            raise ValueError("REPLAN_THRESHOLD must be positive")
        return v

    @field_validator("EV_RESERVE")
    @classmethod
    def validate_ev_reserve(cls, v: float) -> float:
        """EV reserve must be between 0 and 1."""
        if not 0 < v < 1:
            raise ValueError("EV_RESERVE must be between 0 and 1 exclusive")
        return v

    def get_cache_dir(self) -> Path:
        """Return cache directory, creating it if necessary."""
        self.CACHE_DIR.mkdir(parents=True, exist_ok=True)
        return self.CACHE_DIR


# Singleton instance used throughout the application.
settings = Settings()
