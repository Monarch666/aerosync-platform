# Copyright (c) 2026 Wingspann Global Pvt Ltd
# Licensed under the MIT License — see LICENSE file in root

"""
TLE Service — fetches and caches Two-Line Element sets from Celestrak.
All TLE data is public domain as provided by NORAD / Celestrak.
Original fetching, parsing, and caching logic written for AeroSync.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import AsyncSessionLocal
from models.satellite import Satellite

logger = logging.getLogger("aerosync.tle")


def _parse_tle_text(raw_text: str, group: str) -> list[dict]:
    """
    Parse a raw 3-line TLE file into a list of satellite dicts.
    Each block is:  NAME \\n TLE_LINE1 \\n TLE_LINE2
    """
    lines = [ln.strip() for ln in raw_text.strip().splitlines() if ln.strip()]
    satellites = []

    for i in range(0, len(lines) - 2, 3):
        name = lines[i]
        line1 = lines[i + 1]
        line2 = lines[i + 2]

        if not (line1.startswith("1 ") and line2.startswith("2 ")):
            continue  # skip malformed blocks

        try:
            norad_id = int(line1[2:7].strip())
            # TLE epoch: YYDDD.FRACTION (field 3 of line 1)
            epoch_str = line1[18:32].strip()
            satellites.append({
                "norad_id": norad_id,
                "name": name,
                "tle_line1": line1,
                "tle_line2": line2,
                "group": group,
                "tle_epoch_str": epoch_str,
            })
        except (ValueError, IndexError) as exc:
            logger.warning(f"Skipping malformed TLE entry near line {i}: {exc}")

    return satellites


async def fetch_tle_group(group_name: str, url: str) -> list[dict]:
    """Download and parse TLEs for a single Celestrak group."""
    logger.info(f"Fetching TLE group '{group_name}' from {url}")
    headers = {
        "User-Agent": "AeroSync-GroundStation/1.0 (Wingspann Global Pvt Ltd; satellite tracking software)",
        "Accept": "text/plain",
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers, follow_redirects=True)
            response.raise_for_status()
        satellites = _parse_tle_text(response.text, group_name)
        logger.info(f"  -> Parsed {len(satellites)} satellites from '{group_name}'")
        return satellites
    except Exception as exc:
        logger.error(f"Failed to fetch TLE group '{group_name}': {exc}")
        return []


async def sync_all_tle_sources() -> int:
    """
    Fetch all configured TLE groups from Celestrak and upsert into the DB.
    Returns the total number of satellites updated.
    """
    all_sats: list[dict] = []
    for group_name, url in settings.tle_sources.items():
        group_sats = await fetch_tle_group(group_name, url)
        all_sats.extend(group_sats)

    if not all_sats:
        logger.warning("No TLE data fetched — check network connection to Celestrak.")
        return 0

    updated_count = 0
    async with AsyncSessionLocal() as session:
        for sat_data in all_sats:
            existing = await session.execute(
                select(Satellite).where(Satellite.norad_id == sat_data["norad_id"])
            )
            existing_sat = existing.scalar_one_or_none()

            if existing_sat:
                # Update TLE lines
                existing_sat.tle_line1 = sat_data["tle_line1"]
                existing_sat.tle_line2 = sat_data["tle_line2"]
                existing_sat.tle_updated_at = datetime.now(timezone.utc)
            else:
                # Insert new satellite
                new_sat = Satellite(
                    norad_id=sat_data["norad_id"],
                    name=sat_data["name"],
                    tle_line1=sat_data["tle_line1"],
                    tle_line2=sat_data["tle_line2"],
                    group=sat_data["group"],
                )
                session.add(new_sat)

            updated_count += 1

        await session.commit()

    logger.info(f"TLE sync complete — {updated_count} satellites updated in DB.")
    return updated_count


async def get_satellite_tle(norad_id: int) -> Optional[tuple[str, str, str]]:
    """
    Retrieve TLE for a single satellite by NORAD ID.
    Returns (name, tle_line1, tle_line2) or None.
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Satellite).where(Satellite.norad_id == norad_id)
        )
        sat = result.scalar_one_or_none()
        if sat:
            return (sat.name, sat.tle_line1, sat.tle_line2)
    return None
