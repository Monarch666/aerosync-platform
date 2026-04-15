# Copyright (c) 2026 Wingspann Global Pvt Ltd
# Licensed under the MIT License — see LICENSE file in root

"""
Tracker Service — computes real-time satellite position using sgp4.
Original logic for AeroSync; uses the sgp4 library (BSD licensed).
"""

import math
from datetime import datetime, timezone
from typing import Optional

from sgp4.api import Satrec, jday

from core.config import settings


def _ecef_to_latlon(x_km: float, y_km: float, z_km: float) -> tuple[float, float, float]:
    """Convert ECEF coordinates (km) to geodetic lat/lon/alt."""
    a = 6378.137         # Earth equatorial radius (km)
    f = 1 / 298.257223563
    b = a * (1 - f)
    e2 = 1 - (b / a) ** 2

    lon = math.degrees(math.atan2(y_km, x_km))
    p = math.sqrt(x_km**2 + y_km**2)
    lat = math.degrees(math.atan2(z_km, p * (1 - e2)))

    # Iterative refinement for latitude
    for _ in range(5):
        sin_lat = math.sin(math.radians(lat))
        N = a / math.sqrt(1 - e2 * sin_lat**2)
        lat = math.degrees(math.atan2(z_km + e2 * N * sin_lat, p))

    sin_lat = math.sin(math.radians(lat))
    N = a / math.sqrt(1 - e2 * sin_lat**2)
    alt = (p / math.cos(math.radians(lat))) - N

    return round(lat, 6), round(lon, 6), round(alt, 3)


def _eci_to_azel(
    sat_pos_km: tuple,
    sat_vel_km: tuple,
    obs_lat: float,
    obs_lon: float,
    obs_alt_m: float,
    gmst: float,
) -> tuple[float, float, float, float]:
    """
    Convert ECI satellite position to observer-relative Az/El/Range/Doppler.
    Returns (azimuth_deg, elevation_deg, range_km, range_rate_km_s).
    """
    lat_r = math.radians(obs_lat)
    lon_r = math.radians(obs_lon)
    alt_km = obs_alt_m / 1000.0

    # Observer ECEF position
    a = 6378.137
    f = 1 / 298.257223563
    e2 = 1 - (1 - f) ** 2
    sin_lat = math.sin(lat_r)
    N = a / math.sqrt(1 - e2 * sin_lat**2)
    obs_x = (N + alt_km) * math.cos(lat_r) * math.cos(lon_r)
    obs_y = (N + alt_km) * math.cos(lat_r) * math.sin(lon_r)
    obs_z = (N * (1 - e2) + alt_km) * sin_lat

    # Earth rotation: ECEF = rotate ECI by GMST angle
    cos_g = math.cos(gmst)
    sin_g = math.sin(gmst)

    obs_eci_x = obs_x * cos_g - obs_y * sin_g
    obs_eci_y = obs_x * sin_g + obs_y * cos_g
    obs_eci_z = obs_z

    # Range vector in ECI
    rx = sat_pos_km[0] - obs_eci_x
    ry = sat_pos_km[1] - obs_eci_y
    rz = sat_pos_km[2] - obs_eci_z
    range_km = math.sqrt(rx**2 + ry**2 + rz**2)

    # Topocentric SEZ frame
    sin_lat_c = math.cos(math.pi / 2 - lat_r)
    cos_lat_c = math.sin(math.pi / 2 - lat_r)
    sin_lon = math.sin(lon_r)
    cos_lon = math.cos(lon_r)

    s = sin_lat_c * cos_lon * rx + sin_lat_c * sin_lon * ry - cos_lat_c * rz
    e_comp = -sin_lon * rx + cos_lon * ry
    z_comp = cos_lat_c * cos_lon * rx + cos_lat_c * sin_lon * ry + sin_lat_c * rz

    elevation = math.degrees(math.atan2(z_comp, math.sqrt(s**2 + e_comp**2)))
    azimuth = math.degrees(math.atan2(-e_comp, s)) % 360

    # Range rate (Doppler indicator)
    drx = sat_vel_km[0]
    dry = sat_vel_km[1]
    drz = sat_vel_km[2]
    range_rate = (rx * drx + ry * dry + rz * drz) / range_km

    return round(azimuth, 2), round(elevation, 2), round(range_km, 2), round(range_rate, 4)


def compute_position(
    tle_line1: str,
    tle_line2: str,
    at_time: Optional[datetime] = None,
) -> Optional[dict]:
    """
    Compute the satellite's position at a given time (defaults to now).

    Returns a dict with:
        lat, lon, altitude_km, azimuth, elevation, range_km,
        range_rate_km_s, velocity_km_s, is_sunlit (approx), timestamp
    """
    if at_time is None:
        at_time = datetime.now(timezone.utc)

    satellite = Satrec.twoline2rv(tle_line1, tle_line2)

    yr = at_time.year
    mo = at_time.month
    dy = at_time.day
    hr = at_time.hour
    mn = at_time.minute
    sc = at_time.second + at_time.microsecond / 1e6

    jd, fr = jday(yr, mo, dy, hr, mn, sc)
    error, pos, vel = satellite.sgp4(jd, fr)

    if error != 0:
        return None

    lat, lon, alt = _ecef_to_latlon(pos[0], pos[1], pos[2])

    # GMST for Az/El calculation
    gmst = math.radians((280.46061837 + 360.98564736629 * (jd + fr - 2451545.0)) % 360)

    az, el, rng, rng_rate = _eci_to_azel(
        pos, vel,
        settings.observer_latitude,
        settings.observer_longitude,
        settings.observer_altitude_m,
        gmst,
    )

    velocity_km_s = round(math.sqrt(vel[0]**2 + vel[1]**2 + vel[2]**2), 4)

    return {
        "lat": lat,
        "lon": lon,
        "altitude_km": round(alt, 2),
        "azimuth": az,
        "elevation": el,
        "range_km": rng,
        "range_rate_km_s": rng_rate,
        "velocity_km_s": velocity_km_s,
        "above_horizon": el > 0,
        "timestamp": at_time.isoformat(),
    }
