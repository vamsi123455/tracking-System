"""
SQLite Persistence Layer for Highway Vehicle Tracking & Safety System
Stores vehicle telemetry beacons, speed violations, and scenario states.
"""

import sqlite3
import json
import time
from typing import List, Optional, Dict, Any

DB_PATH = "highway_safety.db"

def init_db(db_path: str = DB_PATH):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS vehicles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        speed_kmh REAL,
        heading REAL,
        accuracy_meters REAL,
        timestamp INTEGER NOT NULL,
        data_source TEXT NOT NULL,
        speed_limit_kmh REAL,
        speed_status TEXT NOT NULL,
        direction_status TEXT NOT NULL,
        communication_status TEXT NOT NULL,
        lane_offset_meters REAL DEFAULT 0,
        notes TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS safety_events (
        id TEXT PRIMARY KEY,
        vehicle_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        speed_kmh REAL,
        speed_limit_kmh REAL,
        distance_meters REAL,
        details TEXT
    )
    """)
    conn.commit()
    conn.close()

def upsert_vehicle(vehicle: Dict[str, Any], db_path: str = DB_PATH):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO vehicles (
        id, name, category, latitude, longitude, speed_kmh, heading,
        accuracy_meters, timestamp, data_source, speed_limit_kmh,
        speed_status, direction_status, communication_status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
        latitude=excluded.latitude,
        longitude=excluded.longitude,
        speed_kmh=excluded.speed_kmh,
        heading=excluded.heading,
        accuracy_meters=excluded.accuracy_meters,
        timestamp=excluded.timestamp,
        data_source=excluded.data_source,
        speed_limit_kmh=excluded.speed_limit_kmh,
        speed_status=excluded.speed_status,
        direction_status=excluded.direction_status,
        communication_status=excluded.communication_status,
        notes=excluded.notes
    """, (
        vehicle["id"],
        vehicle.get("name", vehicle["id"]),
        vehicle["category"],
        vehicle["latitude"],
        vehicle["longitude"],
        vehicle.get("speedKmh"),
        vehicle.get("heading"),
        vehicle.get("accuracyMeters"),
        vehicle.get("timestamp", int(time.time() * 1000)),
        vehicle.get("dataSource", "SIMULATED"),
        vehicle.get("speedLimitKmh", 80),
        vehicle.get("speedStatus", "NORMAL"),
        vehicle.get("directionStatus", "SAME_DIRECTION"),
        vehicle.get("communicationStatus", "ACTIVE"),
        vehicle.get("notes", "")
    ))
    conn.commit()
    conn.close()

def get_all_vehicles(db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM vehicles")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_vehicle_by_id(vehicle_id: str, db_path: str = DB_PATH) -> Optional[Dict[str, Any]]:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM vehicles WHERE id = ?", (vehicle_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None
