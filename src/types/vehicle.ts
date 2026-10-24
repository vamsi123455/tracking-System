/**
 * Highway Vehicle Tracking & Safety System - Core Types
 */

export type VehicleCategory = 'car' | 'bike' | 'truck' | 'bus';

export type SpeedLimitStatus = 'NORMAL' | 'SPEEDING' | 'UNKNOWN';

export type DirectionStatus = 'SAME_DIRECTION' | 'OPPOSITE_DIRECTION' | 'CROSS_TRAFFIC' | 'UNKNOWN';

export type CommunicationStatus = 'ACTIVE' | 'STALE' | 'LOST';

export type DataSource = 'SIMULATED' | 'GPS';

export type CollisionRiskLevel = 'NONE' | 'LOW' | 'CAUTION' | 'CRITICAL';

export interface Vehicle {
  id: string;
  name: string;
  category: VehicleCategory;
  latitude: number;
  longitude: number;
  speedKmh: number | null;
  heading: number | null; // 0 - 359 degrees
  timestamp: number;
  dataSource: DataSource;
  accuracyMeters: number | null;
  speedLimitKmh: number | null;
  speedStatus: SpeedLimitStatus;
  directionStatus: DirectionStatus;
  communicationStatus: CommunicationStatus;
  distanceMeters: number;
  closingSpeedKmh?: number;
  timeToCollisionSeconds?: number | null;
  collisionRiskLevel?: CollisionRiskLevel;
  collisionRiskReason?: string;
  lane?: number; // 1 = Left / Fast, 2 = Center, 3 = Right / Slow, -1 = Oncoming
  notes?: string;
}

export interface HostVehicleState {
  id: string;
  name: string;
  category: VehicleCategory;
  latitude: number;
  longitude: number;
  speedKmh: number | null;
  heading: number | null;
  accuracyMeters: number | null;
  timestamp: number;
  dataSource: DataSource;
  isGpsActive: boolean;
  gpsError: string | null;
}

export interface ScenarioConfig {
  id: string;
  title: string;
  description: string;
  defaultSpeedLimit: number;
  durationSeconds: number;
  vehicleCount: number;
  tags: string[];
}

export interface SafetyAlert {
  id: string;
  targetVehicleId: string;
  type: 'COLLISION_RISK' | 'SPEED_VIOLATION' | 'OPPOSITE_APPROACH' | 'COMM_LOST';
  level: CollisionRiskLevel;
  message: string;
  details: string;
  timestamp: number;
  acknowledged?: boolean;
}

export interface SystemSettings {
  targetRadiusMeters: number; // e.g. 100m
  speedLimitKmh: number; // e.g. 80 km/h
  speedThresholdKmh: number; // e.g. 3 km/h tolerance
  staleThresholdSeconds: number; // e.g. 5 seconds
  soundEnabled: boolean;
  simulationMultiplier: number; // 0.5x, 1x, 2x, 5x
  isOfflineSimulated: boolean;
}
