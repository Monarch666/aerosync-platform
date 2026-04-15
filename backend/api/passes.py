# Copyright (c) 2026 Wingspann Global Pvt Ltd
# Licensed under the MIT License — see LICENSE file in root

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from core.database import get_db
from core.config import settings
from models.satellite import Satellite
from models.observation import Observation
from services.pass_predictor import predict_passes
from services.tracker import compute_position

router = APIRouter(prefix="/api/passes", tags=["passes"])


@router.get("/predict/{norad_id}")
async def predict_satellite_passes(
    norad_id: int,
    db: AsyncSession = Depends(get_db),
    days: int = Query(7, ge=1, le=14),
    min_elevation: float = Query(10.0, ge=0.0, le=90.0),
):
    """Predict upcoming passes for a satellite over the observer location."""
    result = await db.execute(select(Satellite).where(Satellite.norad_id == norad_id))
    sat = result.scalar_one_or_none()
    if not sat:
        raise HTTPException(status_code=404, detail=f"Satellite NORAD {norad_id} not found.")

    passes = predict_passes(
        tle_line1=sat.tle_line1,
        tle_line2=sat.tle_line2,
        satellite_name=sat.name,
        norad_id=norad_id,
        days_ahead=days,
        min_elevation=min_elevation,
    )

    return {
        "norad_id": norad_id,
        "satellite_name": sat.name,
        "observer_lat": settings.observer_latitude,
        "observer_lon": settings.observer_longitude,
        "observer_alt_m": settings.observer_altitude_m,
        "passes": passes,
        "total": len(passes),
    }


@router.get("/upcoming")
async def upcoming_passes(
    db: AsyncSession = Depends(get_db),
    hours: int = Query(24, ge=1, le=72),
    min_elevation: float = Query(10.0),
    group: Optional[str] = Query(None),
    favourites_only: bool = Query(False),
    limit: int = Query(20, le=100),
):
    """
    Return the next N passes across all (or filtered) satellites.
    Computationally intensive — uses only favourites or filtered group by default.
    """
    sat_query = select(Satellite)
    if favourites_only:
        sat_query = sat_query.where(Satellite.is_favourite == True)
    elif group:
        sat_query = sat_query.where(Satellite.group == group)
    else:
        # Default: stations group (ISS etc.) for quick response
        sat_query = sat_query.where(Satellite.group == "stations")

    result = await db.execute(sat_query)
    sats = result.scalars().all()

    all_passes = []
    for sat in sats:
        passes = predict_passes(
            tle_line1=sat.tle_line1,
            tle_line2=sat.tle_line2,
            satellite_name=sat.name,
            norad_id=sat.norad_id,
            days_ahead=max(1, hours // 24 + 1),
            min_elevation=min_elevation,
        )
        all_passes.extend(passes)

    # Sort by AOS time and return top N
    all_passes.sort(key=lambda p: p["aos"])
    return {
        "passes": all_passes[:limit],
        "total": len(all_passes),
    }
