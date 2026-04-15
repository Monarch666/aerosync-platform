# Copyright (c) 2026 Wingspann Global Pvt Ltd
# Licensed under the MIT License — see LICENSE file in root

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional

from core.database import get_db
from models.satellite import Satellite

router = APIRouter(prefix="/api/satellites", tags=["satellites"])


@router.get("")
async def list_satellites(
    db: AsyncSession = Depends(get_db),
    search: Optional[str] = Query(None, description="Search by name or NORAD ID"),
    group: Optional[str] = Query(None, description="Filter by group (stations, amateur, weather...)"),
    favourites: bool = Query(False),
    limit: int = Query(50, le=500),
    offset: int = Query(0, ge=0),
):
    """List satellites in the local catalog with optional search/filter."""
    query = select(Satellite)

    if search:
        try:
            norad = int(search)
            query = query.where(
                or_(Satellite.norad_id == norad, Satellite.name.ilike(f"%{search}%"))
            )
        except ValueError:
            query = query.where(Satellite.name.ilike(f"%{search}%"))

    if group:
        query = query.where(Satellite.group == group)

    if favourites:
        query = query.where(Satellite.is_favourite == True)

    total_q = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(total_q)
    total = total_result.scalar_one()

    query = query.order_by(Satellite.name).offset(offset).limit(limit)
    result = await db.execute(query)
    sats = result.scalars().all()

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "satellites": [
            {
                "norad_id": s.norad_id,
                "name": s.name,
                "group": s.group,
                "is_favourite": s.is_favourite,
                "tle_updated_at": s.tle_updated_at.isoformat() if s.tle_updated_at else None,
            }
            for s in sats
        ],
    }


@router.get("/{norad_id}")
async def get_satellite(norad_id: int, db: AsyncSession = Depends(get_db)):
    """Get full details for a single satellite by NORAD ID."""
    result = await db.execute(select(Satellite).where(Satellite.norad_id == norad_id))
    sat = result.scalar_one_or_none()
    if not sat:
        raise HTTPException(status_code=404, detail=f"Satellite NORAD {norad_id} not found.")
    return {
        "norad_id": sat.norad_id,
        "name": sat.name,
        "group": sat.group,
        "tle_line1": sat.tle_line1,
        "tle_line2": sat.tle_line2,
        "is_favourite": sat.is_favourite,
        "tle_updated_at": sat.tle_updated_at.isoformat() if sat.tle_updated_at else None,
        "created_at": sat.created_at.isoformat() if sat.created_at else None,
    }


@router.patch("/{norad_id}/favourite")
async def toggle_favourite(norad_id: int, db: AsyncSession = Depends(get_db)):
    """Toggle the favourite state of a satellite."""
    result = await db.execute(select(Satellite).where(Satellite.norad_id == norad_id))
    sat = result.scalar_one_or_none()
    if not sat:
        raise HTTPException(status_code=404, detail="Satellite not found.")
    sat.is_favourite = not sat.is_favourite
    await db.commit()
    return {"norad_id": norad_id, "is_favourite": sat.is_favourite}


@router.get("/groups/list")
async def list_groups(db: AsyncSession = Depends(get_db)):
    """Return all unique satellite groups."""
    result = await db.execute(select(Satellite.group).distinct())
    groups = [row[0] for row in result.fetchall() if row[0]]
    return {"groups": sorted(groups)}
