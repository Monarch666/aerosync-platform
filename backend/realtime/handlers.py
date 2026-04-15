# Copyright (c) 2026 Wingspann Global Pvt Ltd
# Licensed under the MIT License — see LICENSE file in root

import asyncio
import logging
from datetime import datetime, timezone

from realtime.server import sio
from services.tracker import compute_position
from services.tle_service import get_satellite_tle

logger = logging.getLogger("aerosync.realtime")

# Maps: sid → set of tracked NORAD IDs
_tracked: dict[str, set[int]] = {}
# Maps: NORAD ID → TLE tuple cached for this session
_tle_cache: dict[int, tuple[str, str, str]] = {}


@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")
    _tracked[sid] = set()


@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")
    _tracked.pop(sid, None)


@sio.event
async def subscribe_satellite(sid, data: dict):
    """Client sends: { "norad_id": 25544 } — starts streaming position updates."""
    norad_id = int(data.get("norad_id", 0))
    if not norad_id:
        return

    if norad_id not in _tle_cache:
        tle = await get_satellite_tle(norad_id)
        if tle is None:
            await sio.emit("error", {"message": f"No TLE data for NORAD {norad_id}"}, to=sid)
            return
        _tle_cache[norad_id] = tle

    _tracked[sid].add(norad_id)
    logger.info(f"Client {sid} subscribed to NORAD {norad_id}")
    await sio.emit("subscribed", {"norad_id": norad_id}, to=sid)


@sio.event
async def unsubscribe_satellite(sid, data: dict):
    norad_id = int(data.get("norad_id", 0))
    if sid in _tracked:
        _tracked[sid].discard(norad_id)


async def broadcast_positions():
    """Background loop — every 2 seconds, compute and emit satellite positions."""
    while True:
        await asyncio.sleep(2)

        all_norad: set[int] = set()
        for norad_set in _tracked.values():
            all_norad.update(norad_set)

        if not all_norad:
            continue

        positions: dict[int, dict] = {}
        for norad_id in all_norad:
            tle = _tle_cache.get(norad_id)
            if not tle:
                tle = await get_satellite_tle(norad_id)
                if tle:
                    _tle_cache[norad_id] = tle
            if tle:
                pos = compute_position(tle[1], tle[2])
                if pos:
                    pos["norad_id"] = norad_id
                    pos["name"] = tle[0]
                    positions[norad_id] = pos

        for sid, norad_set in list(_tracked.items()):
            for norad_id in norad_set:
                if norad_id in positions:
                    await sio.emit("position_update", positions[norad_id], to=sid)
