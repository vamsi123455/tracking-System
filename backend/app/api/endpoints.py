"""
FastAPI REST and WebSocket Endpoints for Highway Vehicle Tracking & Safety System
"""

import time
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from backend.app.models.vehicle import VehicleBase, VehicleResponse, ScenarioInfo
from backend.app.database.sqlite import upsert_vehicle, get_all_vehicles, get_vehicle_by_id
from backend.app.simulator.scenario_engine import (
    calculate_haversine_distance,
    classify_direction,
    evaluate_speed_limit_status,
    evaluate_stale_status,
    evaluate_collision_risk,
)

router = APIRouter()

# In-memory scenario manager
ACTIVE_SCENARIO = {"id": "normal-traffic", "speed_limit": 80, "is_running": True}

SCENARIOS_CATALOG = [
    {"id": "normal-traffic", "title": "1. Normal Highway Flow", "description": "All vehicles cruise within the 80 km/h speed limit.", "defaultSpeedLimit": 80, "vehicleCount": 5},
    {"id": "speed-violation", "title": "2. Speed Limit Violation", "description": "High-speed coupe and motorcycle exceed 80 km/h threshold.", "defaultSpeedLimit": 80, "vehicleCount": 5},
    {"id": "opposite-direction", "title": "3. Opposite-Direction Traffic", "description": "Detects oncoming traffic on adjacent lane heading opposite.", "defaultSpeedLimit": 80, "vehicleCount": 4},
    {"id": "collision-risk", "title": "4. Potential Collision Risk", "description": "Leading vehicle brakes rapidly, TTC drops below 3.5s.", "defaultSpeedLimit": 80, "vehicleCount": 4},
    {"id": "stale-data", "title": "5. Stale / Lost Telemetry", "description": "Vehicle drops V2X beacon packets. After 5s status turns STALE.", "defaultSpeedLimit": 80, "vehicleCount": 4},
    {"id": "mixed-traffic", "title": "6. Mixed Multi-Category Traffic", "description": "Full ITS highway cohort: Cars, Bikes, Trucks, and Buses.", "defaultSpeedLimit": 80, "vehicleCount": 7},
    {"id": "offline-mode", "title": "7. Offline / Disconnected Mode", "description": "Cellular/V2N link severed. System switches to local storage.", "defaultSpeedLimit": 80, "vehicleCount": 4},
]

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Highway Vehicle Tracking & Safety Backend",
        "timestamp": int(time.time() * 1000),
        "active_scenario": ACTIVE_SCENARIO["id"],
        "is_running": ACTIVE_SCENARIO["is_running"]
    }

@router.get("/api/scenarios", response_model=List[ScenarioInfo])
def get_scenarios():
    return SCENARIOS_CATALOG

@router.post("/api/scenarios/{scenario_id}/start")
def start_scenario(scenario_id: str):
    found = next((s for s in SCENARIOS_CATALOG if s["id"] == scenario_id), None)
    if not found:
        raise HTTPException(status_code=404, detail="Scenario not found")
    ACTIVE_SCENARIO["id"] = scenario_id
    ACTIVE_SCENARIO["speed_limit"] = found["defaultSpeedLimit"]
    ACTIVE_SCENARIO["is_running"] = True
    return {"message": f"Scenario {scenario_id} started", "scenario": found}

@router.post("/api/scenarios/reset")
def reset_scenario():
    ACTIVE_SCENARIO["is_running"] = False
    return {"message": "Scenario reset successfully"}

@router.get("/api/vehicles")
def list_vehicles(target_radius_meters: Optional[float] = 100.0):
    raw_vehicles = get_all_vehicles()
    now_ms = int(time.time() * 1000)
    host_lat = 17.4485
    host_lon = 78.3742
    host_heading = 45.0
    host_speed = 75.0

    processed = []
    for v in raw_vehicles:
        dist = calculate_haversine_distance(host_lat, host_lon, v["latitude"], v["longitude"])
        is_stale = evaluate_stale_status(v["timestamp"], now_ms, 5.0) == "STALE"
        speed_status = evaluate_speed_limit_status(v["speed_kmh"], ACTIVE_SCENARIO["speed_limit"], 3.0, is_stale)
        direction_status = classify_direction(host_heading, v["heading"])
        collision = evaluate_collision_risk(dist, host_speed, host_heading, v["speed_kmh"], v["heading"], host_lat, host_lon, v["latitude"], v["longitude"])

        processed.append({
            "id": v["id"],
            "name": v["name"],
            "category": v["category"],
            "latitude": v["latitude"],
            "longitude": v["longitude"],
            "speedKmh": v["speed_kmh"],
            "heading": v["heading"],
            "accuracyMeters": v["accuracy_meters"],
            "timestamp": v["timestamp"],
            "dataSource": v["data_source"],
            "speedLimitKmh": ACTIVE_SCENARIO["speed_limit"],
            "speedStatus": speed_status,
            "directionStatus": direction_status,
            "communicationStatus": "STALE" if is_stale else v["communication_status"],
            "distanceMeters": dist,
            "closingSpeedKmh": collision["closing_speed_kmh"],
            "timeToCollisionSeconds": collision["ttc_seconds"],
            "collisionRiskLevel": collision["risk_level"],
            "collisionRiskReason": collision["reason"],
            "notes": v["notes"]
        })

    return processed

@router.post("/api/vehicles")
def ingest_vehicle(vehicle: VehicleBase):
    data = vehicle.model_dump()
    upsert_vehicle(data)
    return {"status": "success", "vehicle_id": vehicle.id}

@router.get("/api/vehicles/{vehicle_id}")
def get_vehicle(vehicle_id: str):
    v = get_vehicle_by_id(vehicle_id)
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return v
