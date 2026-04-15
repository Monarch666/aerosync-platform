# Copyright (c) 2026 Wingspann Global Pvt Ltd
# Licensed under the MIT License — see LICENSE file in root

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application configuration loaded from environment or defaults."""

    # Server
    app_name: str = "AeroSync Satellite Ground Station"
    app_version: str = "1.0.0"
    host: str = "0.0.0.0"
    port: int = 5001
    debug: bool = False

    # Database
    database_url: str = "sqlite+aiosqlite:///./aerosync.db"

    # Observer location defaults (can be changed in Settings UI)
    observer_latitude: float = 28.6139   # Default: New Delhi
    observer_longitude: float = 77.2090
    observer_altitude_m: float = 216.0   # metres above sea level

    # TLE sync
    tle_refresh_interval_minutes: int = 60
    celestrak_base_url: str = "https://celestrak.org/SOCRATES/"

    # Celestrak TLE group URLs — new GP API format
    # Note: 'active' (~15k sats) is excluded by default to avoid Celestrak rate-limiting
    tle_sources: dict = {
        "stations": "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle",
        "visual":   "https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle",
        "weather":  "https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle",
        "amateur":  "https://celestrak.org/NORAD/elements/gp.php?GROUP=amateur&FORMAT=tle",
    }

    # Pass prediction
    pass_prediction_days: int = 7
    min_elevation_degrees: float = 10.0  # Only predict passes above this elevation

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
