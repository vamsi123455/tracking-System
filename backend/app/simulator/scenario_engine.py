"""
Python Highway Scenario and Kinematic Safety Evaluation Engine
Pure mathematical logic used by FastAPI backend and automated test suite.
"""

import math
import time
from typing import Dict, Any, Tuple, Optional

EARTH_RADIUS_METERS = 6371000

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two coordinates in meters."""
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(EARTH_RADIUS_METERS * c, 1)

def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates bearing from point 1 to point 2 in degrees (0-359)."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = (math.cos(phi1) * math.sin(phi2) -
         math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda))
    theta = math.atan2(y, x)
    bearing = (math.degrees(theta) + 360) % 360
    return round(bearing, 1)

def classify_direction(host_heading: Optional[float], target_heading: Optional[float]) -> str:
    """
    Classifies relative direction between host vehicle and remote vehicle.
    Returns: 'SAME_DIRECTION', 'OPPOSITE_DIRECTION', 'CROSS_TRAFFIC', or 'UNKNOWN'
    """
    if host_heading is None or target_heading is None:
        return 'UNKNOWN'

    diff = abs(host_heading - target_heading) % 360
    if diff > 180:
        diff = 360 - diff

    if diff <= 45:
        return 'SAME_DIRECTION'
    elif diff >= 135:
        return 'OPPOSITE_DIRECTION'
    return 'CROSS_TRAFFIC'

def evaluate_speed_limit_status(
    speed_kmh: Optional[float],
    speed_limit_kmh: Optional[float],
    threshold_kmh: float = 3.0,
    is_stale: bool = False
) -> str:
    """
    Determines speed limit violation status.
    Returns: 'SPEEDING', 'NORMAL', or 'UNKNOWN'
    """
    if is_stale or speed_kmh is None or speed_limit_kmh is None:
        return 'UNKNOWN'

    if speed_kmh > (speed_limit_kmh + threshold_kmh):
        return 'SPEEDING'
    return 'NORMAL'

def evaluate_stale_status(
    last_beacon_timestamp_ms: int,
    current_timestamp_ms: int,
    stale_threshold_seconds: float = 5.0
) -> str:
    """
    Returns 'STALE' if elapsed time exceeds threshold, else 'ACTIVE'.
    """
    elapsed_sec = (current_timestamp_ms - last_beacon_timestamp_ms) / 1000.0
    if elapsed_sec >= stale_threshold_seconds:
        return 'STALE'
    return 'ACTIVE'

def evaluate_collision_risk(
    distance_meters: float,
    host_speed_kmh: Optional[float],
    host_heading: Optional[float],
    target_speed_kmh: Optional[float],
    target_heading: Optional[float],
    host_lat: float,
    host_lon: float,
    target_lat: float,
    target_lon: float
) -> Dict[str, Any]:
    """
    Illustrative prototype collision risk evaluation.
    Calculates closing speed and Time-To-Collision (TTC).
    """
    if host_speed_kmh is None or target_speed_kmh is None:
        return {
            "closing_speed_kmh": 0.0,
            "ttc_seconds": None,
            "risk_level": "NONE",
            "reason": "Speed data unavailable"
        }

    v_host = host_speed_kmh / 3.6
    v_target = target_speed_kmh / 3.6

    bearing = calculate_bearing(host_lat, host_lon, target_lat, target_lon)
    host_rad = math.radians(host_heading if host_heading is not None else bearing)
    target_rad = math.radians(target_heading if target_heading is not None else (bearing + 180))
    los_rad = math.radians(bearing)

    host_los_v = v_host * math.cos(host_rad - los_rad)
    target_los_v = -v_target * math.cos(target_rad - los_rad)
    closing_speed_ms = host_los_v + target_los_v
    closing_speed_kmh = round(closing_speed_ms * 3.6, 1)

    if closing_speed_ms <= 0.5:
        return {
            "closing_speed_kmh": max(0.0, closing_speed_kmh),
            "ttc_seconds": None,
            "risk_level": "NONE",
            "reason": "Headway stable"
        }

    ttc = round(distance_meters / closing_speed_ms, 1)

    if distance_meters <= 25 and ttc <= 3.0:
        return {
            "closing_speed_kmh": closing_speed_kmh,
            "ttc_seconds": ttc,
            "risk_level": "CRITICAL",
            "reason": f"Imminent conflict: TTC {ttc}s at {closing_speed_kmh} km/h"
        }
    elif distance_meters <= 55 and ttc <= 6.0:
        return {
            "closing_speed_kmh": closing_speed_kmh,
            "ttc_seconds": ttc,
            "risk_level": "CAUTION",
            "reason": f"Rapid approach: TTC {ttc}s"
        }
    return {
        "closing_speed_kmh": closing_speed_kmh,
        "ttc_seconds": ttc,
        "risk_level": "NONE",
        "reason": "Normal headway"
    }
