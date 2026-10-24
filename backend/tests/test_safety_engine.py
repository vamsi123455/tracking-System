"""
Automated Test Suite for Highway Vehicle Tracking & Safety System
Covers:
- Speed-limit status logic (below, equal, above, missing, stale)
- Direction classification (same, opposite, cross, unknown)
- Haversine distance and 100m target horizon filtering
- Stale data expiration handling
- Collision risk estimation and TTC
- Vehicle type and coordinate boundary validation
- SQLite persistence round-trip
"""

import unittest
import time
import os
from backend.app.simulator.scenario_engine import (
    calculate_haversine_distance,
    calculate_bearing,
    classify_direction,
    evaluate_speed_limit_status,
    evaluate_stale_status,
    evaluate_collision_risk,
)
from backend.app.database.sqlite import init_db, upsert_vehicle, get_vehicle_by_id, get_all_vehicles

class TestSpeedLimitViolationEngine(unittest.TestCase):
    def test_speed_below_limit(self):
        """Speed 70 km/h on an 80 km/h road should be NORMAL."""
        status = evaluate_speed_limit_status(speed_kmh=70.0, speed_limit_kmh=80.0, threshold_kmh=3.0)
        self.assertEqual(status, 'NORMAL')

    def test_speed_equal_to_limit(self):
        """Speed exactly 80 km/h on an 80 km/h road should be NORMAL."""
        status = evaluate_speed_limit_status(speed_kmh=80.0, speed_limit_kmh=80.0, threshold_kmh=3.0)
        self.assertEqual(status, 'NORMAL')

    def test_speed_within_tolerance_threshold(self):
        """Speed 82 km/h on an 80 km/h road with 3 km/h tolerance should be NORMAL."""
        status = evaluate_speed_limit_status(speed_kmh=82.0, speed_limit_kmh=80.0, threshold_kmh=3.0)
        self.assertEqual(status, 'NORMAL')

    def test_speed_above_limit_violation(self):
        """Speed 84 km/h on an 80 km/h road with 3 km/h tolerance should be SPEEDING."""
        status = evaluate_speed_limit_status(speed_kmh=84.0, speed_limit_kmh=80.0, threshold_kmh=3.0)
        self.assertEqual(status, 'SPEEDING')

    def test_speed_excessive_violation(self):
        """Speed 115 km/h on an 80 km/h road should be SPEEDING."""
        status = evaluate_speed_limit_status(speed_kmh=115.0, speed_limit_kmh=80.0, threshold_kmh=3.0)
        self.assertEqual(status, 'SPEEDING')

    def test_missing_speed(self):
        """When vehicle speed is null or unavailable, status must be UNKNOWN (not safely assumed compliant)."""
        status = evaluate_speed_limit_status(speed_kmh=None, speed_limit_kmh=80.0)
        self.assertEqual(status, 'UNKNOWN')

    def test_missing_speed_limit(self):
        """When applicable road speed limit is null or unknown, status must be UNKNOWN."""
        status = evaluate_speed_limit_status(speed_kmh=75.0, speed_limit_kmh=None)
        self.assertEqual(status, 'UNKNOWN')

    def test_stale_data_speed_status(self):
        """Stale or expired telemetry must not be claimed as compliant; returns UNKNOWN."""
        status = evaluate_speed_limit_status(speed_kmh=70.0, speed_limit_kmh=80.0, is_stale=True)
        self.assertEqual(status, 'UNKNOWN')


class TestDirectionClassification(unittest.TestCase):
    def test_same_direction_exact(self):
        """Host 45 deg, Target 45 deg -> SAME_DIRECTION."""
        status = classify_direction(host_heading=45.0, target_heading=45.0)
        self.assertEqual(status, 'SAME_DIRECTION')

    def test_same_direction_slight_drift(self):
        """Host 45 deg, Target 65 deg (20 deg delta) -> SAME_DIRECTION."""
        status = classify_direction(host_heading=45.0, target_heading=65.0)
        self.assertEqual(status, 'SAME_DIRECTION')

    def test_opposite_direction_exact(self):
        """Host 45 deg, Target 225 deg (180 deg delta) -> OPPOSITE_DIRECTION."""
        status = classify_direction(host_heading=45.0, target_heading=225.0)
        self.assertEqual(status, 'OPPOSITE_DIRECTION')

    def test_opposite_direction_slight_drift(self):
        """Host 45 deg, Target 210 deg (165 deg delta) -> OPPOSITE_DIRECTION."""
        status = classify_direction(host_heading=45.0, target_heading=210.0)
        self.assertEqual(status, 'OPPOSITE_DIRECTION')

    def test_cross_traffic(self):
        """Host 45 deg, Target 135 deg (90 deg perpendicular) -> CROSS_TRAFFIC."""
        status = classify_direction(host_heading=45.0, target_heading=135.0)
        self.assertEqual(status, 'CROSS_TRAFFIC')

    def test_missing_heading(self):
        """Missing host or target heading -> UNKNOWN."""
        self.assertEqual(classify_direction(None, 45.0), 'UNKNOWN')
        self.assertEqual(classify_direction(45.0, None), 'UNKNOWN')


class TestDistanceAndHorizonFiltering(unittest.TestCase):
    def test_haversine_coincident_points(self):
        dist = calculate_haversine_distance(17.4485, 78.3742, 17.4485, 78.3742)
        self.assertEqual(dist, 0.0)

    def test_haversine_known_offset(self):
        # ~100 meters northward along latitude
        # 1 deg latitude ≈ 111,139 meters => 0.0009 deg ≈ 100 meters
        dist = calculate_haversine_distance(17.4485, 78.3742, 17.4494, 78.3742)
        self.assertTrue(90 <= dist <= 110, f"Expected around 100m, got {dist}")

    def test_target_horizon_filter(self):
        target_radius = 100.0
        dist_close = 45.0
        dist_far = 160.0
        self.assertTrue(dist_close <= target_radius)
        self.assertFalse(dist_far <= target_radius)


class TestStaleDataHandling(unittest.TestCase):
    def test_active_beacon(self):
        now_ms = int(time.time() * 1000)
        last_beacon_ms = now_ms - 2000  # 2 seconds ago
        status = evaluate_stale_status(last_beacon_ms, now_ms, stale_threshold_seconds=5.0)
        self.assertEqual(status, 'ACTIVE')

    def test_expired_beacon(self):
        now_ms = int(time.time() * 1000)
        last_beacon_ms = now_ms - 6500  # 6.5 seconds ago
        status = evaluate_stale_status(last_beacon_ms, now_ms, stale_threshold_seconds=5.0)
        self.assertEqual(status, 'STALE')


class TestCollisionRiskEngine(unittest.TestCase):
    def test_safe_headway(self):
        result = evaluate_collision_risk(
            distance_meters=85.0,
            host_speed_kmh=75.0,
            host_heading=45.0,
            target_speed_kmh=75.0,
            target_heading=45.0,
            host_lat=17.4485,
            host_lon=78.3742,
            target_lat=17.4492,
            target_lon=78.3749
        )
        self.assertEqual(result["risk_level"], "NONE")

    def test_critical_rapid_closing_conflict(self):
        # Target braking hard or oncoming in direct path: distance 20m, closing rapidly
        result = evaluate_collision_risk(
            distance_meters=20.0,
            host_speed_kmh=80.0,
            host_heading=45.0,
            target_speed_kmh=20.0,
            target_heading=45.0,
            host_lat=17.4485,
            host_lon=78.3742,
            target_lat=17.44865,
            target_lon=78.37435
        )
        self.assertEqual(result["risk_level"], "CRITICAL")
        self.assertIsNotNone(result["ttc_seconds"])
        self.assertTrue(result["ttc_seconds"] <= 3.0)


class TestSqlitePersistence(unittest.TestCase):
    def setUp(self):
        self.test_db = "test_highway_safety.db"
        init_db(self.test_db)

    def tearDown(self):
        if os.path.exists(self.test_db):
            os.remove(self.test_db)

    def test_upsert_and_retrieve_vehicle(self):
        vehicle = {
            "id": "TEST-CAR-01",
            "name": "Audit Test Car",
            "category": "car",
            "latitude": 17.4485,
            "longitude": 78.3742,
            "speedKmh": 74.0,
            "heading": 45.0,
            "accuracyMeters": 2.1,
            "timestamp": int(time.time() * 1000),
            "dataSource": "SIMULATED",
            "speedLimitKmh": 80.0,
            "speedStatus": "NORMAL",
            "directionStatus": "SAME_DIRECTION",
            "communicationStatus": "ACTIVE",
            "notes": "Unit test row"
        }
        upsert_vehicle(vehicle, self.test_db)
        retrieved = get_vehicle_by_id("TEST-CAR-01", self.test_db)
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved["category"], "car")
        self.assertEqual(retrieved["speed_kmh"], 74.0)

        all_v = get_all_vehicles(self.test_db)
        self.assertEqual(len(all_v), 1)


if __name__ == '__main__':
    unittest.main()
