/**
 * Highway Scenarios Definition for Deterministic Simulation
 * Coordinates placed along a realistic highway corridor with lanes.
 */

import { ScenarioConfig, VehicleCategory } from '../types/vehicle';

export const SCENARIOS: ScenarioConfig[] = [
  {
    id: 'normal-traffic',
    title: '1. Normal Highway Flow',
    description: 'All participating vehicles cruise within the 80 km/h speed limit. All markers remain green and safe headway is maintained.',
    defaultSpeedLimit: 80,
    durationSeconds: 60,
    vehicleCount: 5,
    tags: ['Safe Flow', 'Compliant Speed', 'Headway Safe'],
  },
  {
    id: 'speed-violation',
    title: '2. Speed Limit Violation',
    description: 'High-speed sedan and motorcycle exceed the 80 km/h threshold (108 km/h and 96 km/h). Immediate RED marker alerts and violation telemetry.',
    defaultSpeedLimit: 80,
    durationSeconds: 60,
    vehicleCount: 5,
    tags: ['Speeding', 'Red Markers', 'Threshold Alert'],
  },
  {
    id: 'opposite-direction',
    title: '3. Opposite-Direction Traffic',
    description: 'Detects oncoming traffic on adjacent lane (or wrong-way entry) heading 180° opposite to host vehicle. Demonstrates OPPOSITE DIRECTION classification.',
    defaultSpeedLimit: 80,
    durationSeconds: 45,
    vehicleCount: 4,
    tags: ['Opposite Heading', 'Vector Analysis', 'Oncoming Vehicle'],
  },
  {
    id: 'collision-risk',
    title: '4. Potential Collision Risk',
    description: 'Leading vehicle decelerates rapidly or oncoming vehicle crosses center corridor. Closing speed spikes, TTC drops below 3.5s, triggering critical visual & audio alarm.',
    defaultSpeedLimit: 80,
    durationSeconds: 30,
    vehicleCount: 4,
    tags: ['Critical Alarm', 'TTC < 3.5s', 'Audible Warning', 'Deceleration'],
  },
  {
    id: 'stale-data',
    title: '5. Stale / Lost Telemetry',
    description: 'Vehicle telematics drops V2X beacon packets. After 5 seconds of inactivity, marker turns GREY and status marks telemetry as STALE.',
    defaultSpeedLimit: 80,
    durationSeconds: 45,
    vehicleCount: 4,
    tags: ['Stale Packets', 'Grey Marker', 'Comm Drop'],
  },
  {
    id: 'mixed-traffic',
    title: '6. Mixed Multi-Category Traffic',
    description: 'Full ITS highway cohort: Cars, Motorcycles/Bikes, Heavy Freight Trucks, and Long-distance Interstate Buses operating together.',
    defaultSpeedLimit: 80,
    durationSeconds: 60,
    vehicleCount: 7,
    tags: ['Cars', 'Bikes', 'Trucks', 'Buses', 'Full Cohort'],
  },
  {
    id: 'offline-mode',
    title: '7. Offline / Disconnected Mode',
    description: 'Simulates cellular/V2N network link failure. System switches to local cached telemetry, disclaims live status, and highlights offline safety constraints.',
    defaultSpeedLimit: 80,
    durationSeconds: 45,
    vehicleCount: 4,
    tags: ['Network Loss', 'Local Storage', 'Offline Graceful'],
  },
];

export interface SimulatedVehicleInitialState {
  id: string;
  name: string;
  category: VehicleCategory;
  laneOffsetMeters: number; // lateral offset: -6m (oncoming), -2m (fast lane), +2m (center), +6m (slow/truck lane)
  initialDistanceMeters: number; // longitudinal offset ahead(+) or behind(-) host
  baseSpeedKmh: number;
  speedDeltaKmh?: number; // variation over time
  headingOffsetDegrees: number; // 0 = same heading, 180 = oncoming
  dropCommunicationAfterSeconds?: number;
  brakingAfterSeconds?: number;
  brakeDecelRate?: number;
}

export const SCENARIO_VEHICLE_BLUEPRINTS: Record<string, SimulatedVehicleInitialState[]> = {
  'normal-traffic': [
    {
      id: 'SIM-CAR-101',
      name: 'Sedan (Front Left)',
      category: 'car',
      laneOffsetMeters: -2.5,
      initialDistanceMeters: 45,
      baseSpeedKmh: 75,
      headingOffsetDegrees: 0,
    },
    {
      id: 'SIM-TRK-202',
      name: 'Cargo Truck (Front Right)',
      category: 'truck',
      laneOffsetMeters: 3.5,
      initialDistanceMeters: 75,
      baseSpeedKmh: 68,
      headingOffsetDegrees: 0,
    },
    {
      id: 'SIM-BIK-303',
      name: 'Commuter Bike (Right Shoulder)',
      category: 'bike',
      laneOffsetMeters: 5.5,
      initialDistanceMeters: 30,
      baseSpeedKmh: 62,
      headingOffsetDegrees: 0,
    },
    {
      id: 'SIM-BUS-404',
      name: 'Express Coach (Rear)',
      category: 'bus',
      laneOffsetMeters: 0,
      initialDistanceMeters: -55,
      baseSpeedKmh: 72,
      headingOffsetDegrees: 0,
    },
    {
      id: 'SIM-CAR-105',
      name: 'Hatchback (Far Ahead)',
      category: 'car',
      laneOffsetMeters: 2.0,
      initialDistanceMeters: 90,
      baseSpeedKmh: 74,
      headingOffsetDegrees: 0,
    },
  ],

  'speed-violation': [
    {
      id: 'SIM-SPD-991',
      name: 'Sports Coupe (Speeding!)',
      category: 'car',
      laneOffsetMeters: -3.0,
      initialDistanceMeters: -40,
      baseSpeedKmh: 112, // Exceeds 80 limit
      headingOffsetDegrees: 0,
    },
    {
      id: 'SIM-BIK-992',
      name: 'Superbike (Speeding!)',
      category: 'bike',
      laneOffsetMeters: 0,
      initialDistanceMeters: -25,
      baseSpeedKmh: 98, // Exceeds 80 limit
      headingOffsetDegrees: 0,
    },
    {
      id: 'SIM-TRK-201',
      name: 'Heavy Hauler (Compliant)',
      category: 'truck',
      laneOffsetMeters: 4.0,
      initialDistanceMeters: 60,
      baseSpeedKmh: 64,
      headingOffsetDegrees: 0,
    },
    {
      id: 'SIM-BUS-301',
      name: 'Transit Bus (Compliant)',
      category: 'bus',
      laneOffsetMeters: 1.0,
      initialDistanceMeters: 85,
      baseSpeedKmh: 72,
      headingOffsetDegrees: 0,
    },
  ],

  'opposite-direction': [
    {
      id: 'SIM-OPP-501',
      name: 'Oncoming Highway Cruiser',
      category: 'car',
      laneOffsetMeters: -8.0, // Oncoming opposite lane
      initialDistanceMeters: 120,
      baseSpeedKmh: 78,
      headingOffsetDegrees: 180, // Facing opposite
    },
    {
      id: 'SIM-OPP-502',
      name: 'Oncoming Intercity Bus',
      category: 'bus',
      laneOffsetMeters: -10.0,
      initialDistanceMeters: 180,
      baseSpeedKmh: 70,
      headingOffsetDegrees: 180,
    },
    {
      id: 'SIM-CAR-503',
      name: 'Trailing Sedan (Same Dir)',
      category: 'car',
      laneOffsetMeters: 1.5,
      initialDistanceMeters: -50,
      baseSpeedKmh: 75,
      headingOffsetDegrees: 0,
    },
  ],

  'collision-risk': [
    {
      id: 'SIM-RSK-701',
      name: 'Rapid Decelerating Car (Lead)',
      category: 'car',
      laneOffsetMeters: 0, // Direct path ahead
      initialDistanceMeters: 65,
      baseSpeedKmh: 75,
      headingOffsetDegrees: 0,
      brakingAfterSeconds: 2,
      brakeDecelRate: 14, // Hard braking
    },
    {
      id: 'SIM-RSK-702',
      name: 'Swerving Motorcycle',
      category: 'bike',
      laneOffsetMeters: -2.0,
      initialDistanceMeters: 40,
      baseSpeedKmh: 82,
      headingOffsetDegrees: 0,
      brakingAfterSeconds: 4,
      brakeDecelRate: 10,
    },
    {
      id: 'SIM-TRK-703',
      name: 'Heavy Truck (Right Lane)',
      category: 'truck',
      laneOffsetMeters: 5.0,
      initialDistanceMeters: 50,
      baseSpeedKmh: 65,
      headingOffsetDegrees: 0,
    },
  ],

  'stale-data': [
    {
      id: 'SIM-STL-801',
      name: 'Beacon Drop Vehicle',
      category: 'car',
      laneOffsetMeters: -2.0,
      initialDistanceMeters: 50,
      baseSpeedKmh: 76,
      headingOffsetDegrees: 0,
      dropCommunicationAfterSeconds: 3, // Will freeze updates after 3s
    },
    {
      id: 'SIM-STL-802',
      name: 'Active Freightliner',
      category: 'truck',
      laneOffsetMeters: 3.5,
      initialDistanceMeters: 80,
      baseSpeedKmh: 68,
      headingOffsetDegrees: 0,
    },
    {
      id: 'SIM-STL-803',
      name: 'Active Delivery Van',
      category: 'car',
      laneOffsetMeters: 1.0,
      initialDistanceMeters: -40,
      baseSpeedKmh: 74,
      headingOffsetDegrees: 0,
    },
  ],

  'mixed-traffic': [
    {
      id: 'SIM-MIX-101',
      name: 'Compact Hatchback',
      category: 'car',
      laneOffsetMeters: -2.5,
      initialDistanceMeters: 35,
      baseSpeedKmh: 76,
      headingOffsetDegrees: 0,
    },
    {
      id: 'SIM-MIX-201',
      name: 'Cruiser Motorcycle',
      category: 'bike',
      laneOffsetMeters: 5.0,
      initialDistanceMeters: 25,
      baseSpeedKmh: 70,
      headingOffsetDegrees: 0,
    },
    {
      id: 'SIM-MIX-301',
      name: 'Multiaxle Heavy Rig',
      category: 'truck',
      laneOffsetMeters: 3.5,
      initialDistanceMeters: 70,
      baseSpeedKmh: 62,
      headingOffsetDegrees: 0,
    },
    {
      id: 'SIM-MIX-401',
      name: 'Sleeper Interstate Bus',
      category: 'bus',
      laneOffsetMeters: 0,
      initialDistanceMeters: -60,
      baseSpeedKmh: 74,
      headingOffsetDegrees: 0,
    },
    {
      id: 'SIM-MIX-102',
      name: 'Sedan in Oncoming Lane',
      category: 'car',
      laneOffsetMeters: -8.0,
      initialDistanceMeters: 90,
      baseSpeedKmh: 78,
      headingOffsetDegrees: 180,
    },
    {
      id: 'SIM-MIX-202',
      name: 'Sport Bike (Speeding)',
      category: 'bike',
      laneOffsetMeters: -1.0,
      initialDistanceMeters: -30,
      baseSpeedKmh: 95,
      headingOffsetDegrees: 0,
    },
  ],

  'offline-mode': [
    {
      id: 'SIM-OFF-001',
      name: 'Cached Lead Vehicle',
      category: 'car',
      laneOffsetMeters: 0,
      initialDistanceMeters: 55,
      baseSpeedKmh: 72,
      headingOffsetDegrees: 0,
    },
    {
      id: 'SIM-OFF-002',
      name: 'Cached Interstate Bus',
      category: 'bus',
      laneOffsetMeters: 4.0,
      initialDistanceMeters: 80,
      baseSpeedKmh: 68,
      headingOffsetDegrees: 0,
    },
    {
      id: 'SIM-OFF-003',
      name: 'Cached Delivery Scooter',
      category: 'bike',
      laneOffsetMeters: -3.0,
      initialDistanceMeters: -35,
      baseSpeedKmh: 60,
      headingOffsetDegrees: 0,
    },
  ],
};
