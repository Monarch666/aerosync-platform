# Copyright (c) 2026 Wingspann Global Pvt Ltd
# Licensed under the MIT License — see LICENSE file in root

from fastapi import APIRouter, Body
from pydantic import BaseModel
from typing import Optional

from core.config import settings

router = APIRouter(prefix="/api/settings", tags=["settings"])


class ObserverSettings(BaseModel):
    latitude: float
    longitude: float
    altitude_m: float


class TleSettings(BaseModel):
    refresh_interval_minutes: int
    min_elevation_degrees: float


@router.get("")
async def get_settings():
    """Return current application settings."""
    return {
        "observer": {
            "latitude": settings.observer_latitude,
            "longitude": settings.observer_longitude,
            "altitude_m": settings.observer_altitude_m,
        },
        "tle": {
            "refresh_interval_minutes": settings.tle_refresh_interval_minutes,
            "min_elevation_degrees": settings.min_elevation_degrees,
            "sources": list(settings.tle_sources.keys()),
        },
        "app": {
            "name": settings.app_name,
            "version": settings.app_version,
        },
    }


@router.put("/observer")
async def update_observer(body: ObserverSettings):
    """Update observer location (takes effect immediately for new calculations)."""
    settings.observer_latitude = body.latitude
    settings.observer_longitude = body.longitude
    settings.observer_altitude_m = body.altitude_m
    return {
        "status": "updated",
        "observer": {
            "latitude": settings.observer_latitude,
            "longitude": settings.observer_longitude,
            "altitude_m": settings.observer_altitude_m,
        },
    }


@router.put("/tle")
async def update_tle_settings(body: TleSettings):
    """Update TLE sync interval and minimum elevation threshold."""
    settings.tle_refresh_interval_minutes = body.refresh_interval_minutes
    settings.min_elevation_degrees = body.min_elevation_degrees
    return {"status": "updated"}
