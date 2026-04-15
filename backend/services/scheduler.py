# Copyright (c) 2026 Wingspann Global Pvt Ltd
# Licensed under the MIT License — see LICENSE file in root

"""
Scheduler Service — APScheduler jobs for TLE refresh and pass pre-computation.
"""

import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from core.config import settings
from services.tle_service import sync_all_tle_sources

logger = logging.getLogger("aerosync.scheduler")

_scheduler = AsyncIOScheduler()


async def _tle_refresh_job():
    logger.info("Scheduled TLE refresh starting...")
    count = await sync_all_tle_sources()
    logger.info(f"Scheduled TLE refresh done — {count} satellites updated.")


def start_scheduler():
    """Start the background scheduler."""
    _scheduler.add_job(
        _tle_refresh_job,
        trigger=IntervalTrigger(minutes=settings.tle_refresh_interval_minutes),
        id="tle_refresh",
        replace_existing=True,
        max_instances=1,
    )
    _scheduler.start()
    logger.info(
        f"Scheduler started — TLE auto-refresh every "
        f"{settings.tle_refresh_interval_minutes} minutes."
    )


def stop_scheduler():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped.")
