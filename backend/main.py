# Copyright (c) 2026 Wingspann Global Pvt Ltd
# Licensed under the MIT License — see LICENSE file in root

"""
AeroSync Satellite Ground Station — Backend Entry Point
Wingspann Global Pvt Ltd
"""

import asyncio
import logging
import sys
import os
from contextlib import asynccontextmanager

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import uvicorn
import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.database import init_db
from realtime.server import sio
from realtime.handlers import broadcast_positions
from services.tle_service import sync_all_tle_sources
from services.scheduler import start_scheduler, stop_scheduler
from api.satellites import router as satellites_router
from api.passes import router as passes_router
from api.tracking import router as tracking_router
from api.settings import router as settings_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("aerosync.main")


def _print_banner():
    """Print startup banner — ASCII only for maximum terminal compatibility."""
    print("")
    print("  ============================================================")
    print("  AeroSync Satellite Ground Station")
    print("  Wingspann Global Pvt Ltd  |  MIT License")
    print(f"  Version: {settings.app_version}")
    print("  ============================================================")
    print("")


# ── Lifespan (replaces deprecated on_event) ──────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    _print_banner()

    logger.info("Initialising database...")
    await init_db()

    logger.info("Starting background scheduler...")
    start_scheduler()

    # TLE sync + position broadcast run in background — server is ready immediately
    async def _background_init():
        logger.info("Background TLE sync starting (server already accepting requests)...")
        try:
            count = await sync_all_tle_sources()
            logger.info(f"Background TLE sync done — {count} satellites loaded.")
        except Exception as exc:
            logger.warning(f"TLE sync failed: {exc}")

    broadcast_task = asyncio.create_task(broadcast_positions())
    asyncio.create_task(_background_init())

    logger.info(
        f"AeroSync is ready at http://localhost:{settings.port}  |  "
        f"API docs: http://localhost:{settings.port}/api/docs"
    )

    yield  # ── server runs here ──────────────────────────────────────────────

    broadcast_task.cancel()
    stop_scheduler()
    logger.info("AeroSync backend shut down cleanly.")


# ── FastAPI app ──────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Satellite Ground Station Platform — Wingspann Global Pvt Ltd",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register REST routers
app.include_router(satellites_router)
app.include_router(passes_router)
app.include_router(tracking_router)
app.include_router(settings_router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": settings.app_version, "app": settings.app_name}


# ── Socket.IO ASGI mount ─────────────────────────────────────────────────────
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)


if __name__ == "__main__":
    uvicorn.run(
        "main:socket_app",
        host=settings.host,
        port=settings.port,
        log_level="info",
    )
