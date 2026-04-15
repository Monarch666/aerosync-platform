# Copyright (c) 2026 Wingspann Global Pvt Ltd
# Licensed under the MIT License — see LICENSE file in root

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db
from models.satellite import Satellite
from services.tracker import compute_position

router = APIRouter(prefix="/api/track", tags=["tracking"])


@router.get("/{norad_id}")
async def get_live_position(norad_id: int, db: AsyncSession = Depends(get_db)):
    """
    Return the current real-time position of a satellite.
    Clients that need continuous updates should use Socket.IO instead.
    """
    result = await db.execute(select(Satellite).where(Satellite.norad_id == norad_id))
    sat = result.scalar_one_or_none()
    if not sat:
        raise HTTPException(status_code=404, detail=f"Satellite NORAD {norad_id} not found.")

    position = compute_position(sat.tle_line1, sat.tle_line2)
    if not position:
        raise HTTPException(status_code=500, detail="SGP4 propagation error — TLE may be too old.")

    position["norad_id"] = norad_id
    position["name"] = sat.name
    return position


@router.get("/groundtrack/{norad_id}")
async def get_ground_track(
    norad_id: int,
    db: AsyncSession = Depends(get_db),
    minutes: int = 100,
    step_seconds: int = 60,
):
    """
    Return a list of lat/lon points forming the satellite's ground track.
    Default: 100 minutes (one orbit) at 60-second intervals.
    """
    from datetime import datetime, timedelta, timezone

    result = await db.execute(select(Satellite).where(Satellite.norad_id == norad_id))
    sat = result.scalar_one_or_none()
    if not sat:
        raise HTTPException(status_code=404, detail="Satellite not found.")

    now = datetime.now(timezone.utc)
    track = []

    for i in range(0, minutes * 60, step_seconds):
        t = now + timedelta(seconds=i - (minutes * 30))  # centre track on now
        pos = compute_position(sat.tle_line1, sat.tle_line2, at_time=t)
        if pos:
            track.append({
                "lat": pos["lat"],
                "lon": pos["lon"],
                "alt_km": pos["altitude_km"],
                "t": t.isoformat(),
            })

    return {
        "norad_id": norad_id,
        "name": sat.name,
        "track": track,
        "step_seconds": step_seconds,
    }
