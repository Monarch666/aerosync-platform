# Copyright (c) 2026 Wingspann Global Pvt Ltd
# Licensed under the MIT License — see LICENSE file in root

"""
Pass Predictor — original AOS/LOS/TCA calculation engine.
Predicts satellite passes above the observer's horizon using sgp4.
"""

import math
from datetime import datetime, timedelta, timezone
from typing import Optional

from sgp4.api import Satrec, jday

from core.config import settings


_EARTH_RADIUS_KM = 6371.0
_RAD = math.pi / 180


def _gmst(jd_total: float) -> float:
    """Compute Greenwich Mean Sidereal Time in radians."""
    return math.radians((280.46061837 + 360.98564736629 * (jd_total - 2451545.0)) % 360)


def _elevation_at(satellite: Satrec, jd: float, fr: float,
                   obs_lat_r: float, obs_lon_r: float, obs_alt_km: float) -> float:
    """Return satellite elevation above observer's horizon at a given time (degrees)."""
    error, pos, vel = satellite.sgp4(jd, fr)
    if error != 0:
        return -90.0

    # Observer ECEF
    a, f = 6378.137, 1 / 298.257223563
    e2 = 1 - (1 - f) ** 2
    sin_lat = math.sin(obs_lat_r)
    N = a / math.sqrt(1 - e2 * sin_lat ** 2)
    alt_km = obs_alt_km
    cos_lat = math.cos(obs_lat_r)
    obs_x = (N + alt_km) * cos_lat * math.cos(obs_lon_r)
    obs_y = (N + alt_km) * cos_lat * math.sin(obs_lon_r)
    obs_z = (N * (1 - e2) + alt_km) * sin_lat

    gmst = _gmst(jd + fr)
    cos_g, sin_g = math.cos(gmst), math.sin(gmst)

    obs_eci_x = obs_x * cos_g - obs_y * sin_g
    obs_eci_y = obs_x * sin_g + obs_y * cos_g
    obs_eci_z = obs_z

    rx = pos[0] - obs_eci_x
    ry = pos[1] - obs_eci_y
    rz = pos[2] - obs_eci_z

    # Z component in topocentric frame ≈ elevation
    cos_lat_c = cos_lat
    sin_lat_c = sin_lat

    z_comp = (cos_lat_c * math.cos(obs_lon_r) * rx +
               cos_lat_c * math.sin(obs_lon_r) * ry +
               sin_lat_c * rz)
    rng = math.sqrt(rx**2 + ry**2 + rz**2)

    elevation = math.degrees(math.asin(z_comp / rng)) if rng > 0 else -90.0
    return elevation


def predict_passes(
    tle_line1: str,
    tle_line2: str,
    satellite_name: str,
    norad_id: int,
    days_ahead: Optional[int] = None,
    min_elevation: Optional[float] = None,
) -> list[dict]:
    """
    Predict upcoming satellite passes over the observer location.

    Returns a list of pass dicts, each containing:
        norad_id, satellite_name,
        aos (Acquisition of Signal) as ISO string,
        los (Loss of Signal) as ISO string,
        tca (Time of Closest Approach) as ISO string,
        max_elevation (degrees),
        duration_seconds,
        aos_azimuth, los_azimuth
    """
    days = days_ahead or settings.pass_prediction_days
    min_el = min_elevation if min_elevation is not None else settings.min_elevation_degrees

    obs_lat_r = settings.observer_latitude * _RAD
    obs_lon_r = settings.observer_longitude * _RAD
    obs_alt_km = settings.observer_altitude_m / 1000.0

    satellite = Satrec.twoline2rv(tle_line1, tle_line2)

    start_time = datetime.now(timezone.utc)
    end_time = start_time + timedelta(days=days)

    passes = []
    step_seconds = 30           # coarse scan step
    fine_step_seconds = 1       # fine scan step near transitions

    current = start_time
    above = False
    pass_start: Optional[datetime] = None
    max_el = -90.0
    tca_time: Optional[datetime] = None

    while current <= end_time:
        yr, mo, dy = current.year, current.month, current.day
        hr, mn = current.hour, current.minute
        sc = current.second + current.microsecond / 1e6
        jd, fr = jday(yr, mo, dy, hr, mn, sc)

        el = _elevation_at(satellite, jd, fr, obs_lat_r, obs_lon_r, obs_alt_km)

        if el >= min_el and not above:
            # Rising — back-scan finely to find precise AOS
            aos_time = current
            for back_s in range(step_seconds, 0, -1):
                t_back = current - timedelta(seconds=back_s)
                jd2, fr2 = jday(t_back.year, t_back.month, t_back.day,
                                 t_back.hour, t_back.minute,
                                 t_back.second + t_back.microsecond / 1e6)
                if _elevation_at(satellite, jd2, fr2, obs_lat_r, obs_lon_r, obs_alt_km) < min_el:
                    aos_time = t_back + timedelta(seconds=fine_step_seconds)
                    break
            pass_start = aos_time
            above = True
            max_el = el
            tca_time = current

        elif el >= min_el and above:
            if el > max_el:
                max_el = el
                tca_time = current

        elif el < min_el and above:
            # Setting — fine-scan for precise LOS
            los_time = current
            for back_s in range(step_seconds, 0, -1):
                t_back = current - timedelta(seconds=back_s)
                jd2, fr2 = jday(t_back.year, t_back.month, t_back.day,
                                 t_back.hour, t_back.minute,
                                 t_back.second + t_back.microsecond / 1e6)
                if _elevation_at(satellite, jd2, fr2, obs_lat_r, obs_lon_r, obs_alt_km) >= min_el:
                    los_time = t_back
                    break

            if pass_start and max_el >= min_el:
                duration = int((los_time - pass_start).total_seconds())
                passes.append({
                    "norad_id": norad_id,
                    "satellite_name": satellite_name,
                    "aos": pass_start.isoformat(),
                    "los": los_time.isoformat(),
                    "tca": tca_time.isoformat() if tca_time else None,
                    "max_elevation": round(max_el, 1),
                    "duration_seconds": duration,
                })

            above = False
            pass_start = None
            max_el = -90.0
            tca_time = None

        current += timedelta(seconds=step_seconds)

    return passes
