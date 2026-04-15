# AeroSync — Satellite Ground Station

## Features

| Feature | Description |
|---|---|
| 🛰 **Live Tracking** | Real-time satellite lat/lon, altitude, Az/El, range, velocity |
| 📅 **Pass Prediction** | AOS, LOS, TCA and max elevation for any satellite |
| 🌍 **World Map** | Ground track polyline with coverage footprint on dark Leaflet map |
| 🧭 **Sky Polar Plot** | Pass arcs on an azimuth/elevation polar chart (Canvas) |
| 🔭 **Satellite Catalog** | Browse 300+ satellites — search, filter by group, mark favourites |
| 🔄 **Auto TLE Sync** | Orbital data refreshed hourly from Celestrak (public domain) |
| ⚙️ **Settings** | Configure observer lat/lon/altitude for your ground station |

---

## Quick Start

### Windows (one-click)
```
Double-click run.bat
```
This automatically sets up the virtual environment, installs dependencies, and opens your browser.

### Manual

**Backend (Python 3.10+)**
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
python main.py
```
Backend starts at **http://localhost:5001** · API docs at **http://localhost:5001/api/docs**

**Frontend (Node.js 18+)**
```bash
cd frontend
npm install
npm run dev
```
Frontend starts at **http://localhost:3000**

---

## Project Structure

```
aerosync-platform/
├── backend/
│   ├── main.py              # FastAPI entry point + Socket.IO ASGI mount
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Environment config template
│   ├── api/                 # REST API routers
│   │   ├── satellites.py    # GET /api/satellites
│   │   ├── passes.py        # GET /api/passes/upcoming
│   │   ├── tracking.py      # GET /api/track/{norad_id}
│   │   └── settings.py      # GET/PUT /api/settings
│   ├── core/
│   │   ├── config.py        # Pydantic settings (env vars)
│   │   └── database.py      # SQLAlchemy async engine
│   ├── models/              # SQLAlchemy ORM models
│   ├── services/
│   │   ├── tle_service.py   # Celestrak TLE download + DB sync
│   │   ├── tracker.py       # SGP4 position propagation
│   │   ├── pass_predictor.py# AOS/LOS/TCA prediction
│   │   └── scheduler.py     # APScheduler TLE refresh job
│   ├── realtime/
│   │   ├── server.py        # Socket.IO AsyncServer instance
│   │   └── handlers.py      # Socket.IO event handlers + position broadcast
│   └── socket/              # stdlib socket compatibility shim (do not delete)
│
└── frontend/
    ├── next.config.js        # Next.js config + /api proxy to backend
    ├── src/
    │   ├── app/             # Next.js App Router pages
    │   │   ├── page.tsx     # Dashboard (overview + countdown)
    │   │   ├── satellites/  # Satellite catalog
    │   │   ├── passes/      # Pass prediction table
    │   │   ├── map/         # World map (Leaflet)
    │   │   ├── skyplot/     # Polar sky plot (Canvas)
    │   │   ├── log/         # Observation log
    │   │   └── settings/    # Observer location settings
    │   ├── components/
    │   │   ├── layout/      # Header + Sidebar
    │   │   └── map/         # Imperative Leaflet map component
    │   └── styles/
    │       └── globals.css  # Complete dark space-themed design system
    └── package.json
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router) + TypeScript |
| **Styling** | Vanilla CSS — dark space theme with CSS custom properties |
| **Maps** | Leaflet (imperative API — React Strict Mode safe) |
| **Charts** | HTML Canvas (sky polar plot) |
| **Backend** | Python FastAPI + Uvicorn |
| **Orbit Math** | sgp4 2.25 (Simplified General Perturbations) |
| **TLE Source** | [Celestrak](https://celestrak.org) — public domain orbital data |
| **Database** | SQLite via SQLAlchemy async + aiosqlite |
| **Real-time** | Socket.IO (python-socketio + ASGI) |
| **Scheduler** | APScheduler (hourly TLE refresh) |

---

## Configuration

Copy `.env.example` to `.env` in the `backend/` folder:

```bash
cp backend/.env.example backend/.env
```

Key settings:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5001` | Backend server port |
| `OBSERVER_LATITUDE` | `28.6139` | Your ground station latitude (New Delhi default) |
| `OBSERVER_LONGITUDE` | `77.2090` | Your ground station longitude |
| `OBSERVER_ALTITUDE_M` | `216` | Altitude above sea level (metres) |
| `MIN_ELEVATION_DEGREES` | `10` | Minimum elevation for pass predictions |
| `TLE_REFRESH_INTERVAL_MINUTES` | `60` | How often to refresh TLE data from Celestrak |

Observer location can also be changed at any time from the **Settings** page in the UI.

---

## API Reference

Full interactive documentation: **http://localhost:5001/api/docs**

| Endpoint | Description |
|---|---|
| `GET /api/health` | Health check |
| `GET /api/satellites` | List satellites (search, group, favourites, pagination) |
| `GET /api/satellites/{norad_id}` | Get single satellite |
| `PATCH /api/satellites/{norad_id}/favourite` | Toggle favourite |
| `GET /api/passes/upcoming` | Predict upcoming passes |
| `GET /api/track/{norad_id}` | Real-time position (lat/lon/alt/az/el/range) |
| `GET /api/track/groundtrack/{norad_id}` | Ground track polyline points |
| `GET /api/settings` | Get current settings |
| `PUT /api/settings/observer` | Update observer location |

---

## TLE Data

Satellite orbital data (TLE — Two-Line Elements) is fetched from [Celestrak](https://celestrak.org/), 
operated by Dr. T.S. Kelso. TLE data is sourced from NORAD and is in the public domain.

Default groups loaded:
- **Stations** — ISS, Tiangong, CSS
- **Visual** — Brightest objects visible to naked eye  
- **Weather** — NOAA, Meteosat, GOES
- **Amateur** — Ham radio satellites (AMSAT, CubeSats)

---


