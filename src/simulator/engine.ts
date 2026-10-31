/**
 * Real-time Highway Vehicle Simulator and Safety Evaluation Engine
 * Continuous Non-stop High-Frequency Kinematics Tracking (No 1-second pause/delay)
 * Strictly keeps all vehicles on authentic highway road geometries, curves, and lanes.
 */

import {
  Vehicle,
  HostVehicleState,
  SystemSettings,
  SafetyAlert,
  BreadcrumbPoint,
} from '../types/vehicle';
import {
  calculateHaversineDistance,
  classifyRelativeDirection,
  evaluateCollisionRisk,
  projectCoordinates,
} from '../utils/geo';
import {
  SCENARIOS,
  SCENARIO_VEHICLE_BLUEPRINTS,
  SimulatedVehicleInitialState,
} from './scenarios';
import { soundManager } from '../utils/audio';
import { appendTelemetryLog, saveCachedVehicles } from '../utils/storage';
import {
  RoadCorridor,
  RoadWaypoint,
  getRoadCorridorForPreset,
  createDynamicRoadCorridor,
  HIGHWAY_ROAD_WAYPOINTS,
} from '../utils/roadGeometry';
import { REAL_WORLD_PRESETS } from '../utils/realLocations';

// Anchor coordinate for realistic highway track (Hyderabad Outer Ring Road)
export const DEFAULT_HIGHWAY_ORIGIN = {
  latitude: 17.4485,
  longitude: 78.3742,
  heading: 45, // Northeast highway alignment (45 degrees)
};

interface DynamicVehicleState extends SimulatedVehicleInitialState {
  currentSpeedKmh: number;
  currentLongitudinalOffsetMeters: number;
  currentLaneOffsetMeters: number;
  isFrozen: boolean;
  lastBeaconTimestamp: number;
  trail: BreadcrumbPoint[];
  lastTrailRecordMs: number;
}

export interface SimulatorPayload {
  vehicles: Vehicle[];
  host: HostVehicleState;
  alerts: SafetyAlert[];
  roadPolyline: RoadWaypoint[];
  roadName: string;
  totalRoadLengthMeters: number;
}

export class HighwaySafetySimulator {
  private activeScenarioId = 'normal-traffic';
  private isRunning = false;
  private animFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private lastStorageSaveTime: number = 0;
  private elapsedSeconds = 0;
  private settings: SystemSettings;

  // Road Alignment & Snapping Engine
  private roadCorridor: RoadCorridor;
  private hostAlongRoadDistance: number = 0;

  private hostVehicle: HostVehicleState;
  private hostTrail: BreadcrumbPoint[] = [];
  private lastHostTrailRecordMs: number = 0;
  private vehicles: Map<string, Vehicle> = new Map();
  private vehicleStates: Map<string, DynamicVehicleState> = new Map();
  private alerts: SafetyAlert[] = [];
  private listeners: Set<(state: SimulatorPayload) => void> = new Set();

  constructor(initialSettings: SystemSettings) {
    this.settings = { ...initialSettings };

    // Initialize with authentic Hyderabad ORR Highway Corridor
    this.roadCorridor = getRoadCorridorForPreset('hyderabad-orr');
    const snapped = this.roadCorridor.findNearestRoadDistance(
      DEFAULT_HIGHWAY_ORIGIN.latitude,
      DEFAULT_HIGHWAY_ORIGIN.longitude
    );
    this.hostAlongRoadDistance = snapped.distanceMeters;
    const initialPos = this.roadCorridor.getPositionAtDistance(this.hostAlongRoadDistance, 0);

    this.hostVehicle = {
      id: 'HOST-VEHICLE-01',
      name: 'Host Vehicle (My Vehicle)',
      category: 'car',
      latitude: initialPos.latitude,
      longitude: initialPos.longitude,
      speedKmh: 75,
      heading: initialPos.heading,
      accuracyMeters: 2.5,
      timestamp: Date.now(),
      dataSource: 'SIMULATED',
      isGpsActive: false,
      gpsError: null,
      locationName: 'Hyderabad Outer Ring Road (ORR)',
    };

    this.initScenario(this.activeScenarioId);
  }

  public subscribe(callback: (state: SimulatorPayload) => void): () => void {
    this.listeners.add(callback);
    this.notify();
    return () => this.listeners.delete(callback);
  }

  private notify() {
    const vehicleArray = Array.from(this.vehicles.values());
    const payload: SimulatorPayload = {
      vehicles: vehicleArray,
      host: { ...this.hostVehicle },
      alerts: [...this.alerts],
      roadPolyline: this.roadCorridor.getPolyline(),
      roadName: this.roadCorridor.name,
      totalRoadLengthMeters: this.roadCorridor.totalLengthMeters,
    };
    this.listeners.forEach((cb) => cb(payload));
  }

  public getSettings(): SystemSettings {
    return { ...this.settings };
  }

  public getRoadCorridor(): RoadCorridor {
    return this.roadCorridor;
  }

  public updateSettings(newSettings: Partial<SystemSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    soundManager.setMuted(!this.settings.soundEnabled);
    this.recalculateAllVehicles();
    this.recomputePositions();
    this.notify();
  }

  public setHostFromGps(coords: {
    latitude: number;
    longitude: number;
    speedKmh: number | null;
    heading: number | null;
    accuracyMeters: number | null;
    locationName?: string;
  }) {
    // If real GPS is outside current corridor (> 800m cross track error), build dynamic road corridor
    const snap = this.roadCorridor.findNearestRoadDistance(coords.latitude, coords.longitude);
    if (snap.crossTrackErrorMeters > 800) {
      this.roadCorridor = createDynamicRoadCorridor(
        coords.latitude,
        coords.longitude,
        coords.heading ?? 45,
        coords.locationName || 'Live GPS Highway Corridor'
      );
      this.hostAlongRoadDistance = 5000; // middle of 10 km corridor
    } else {
      this.hostAlongRoadDistance = snap.distanceMeters;
    }

    const hostLat = this.settings.roadLockEnabled ? snap.snappedLat : coords.latitude;
    const hostLng = this.settings.roadLockEnabled ? snap.snappedLng : coords.longitude;
    const hostHeading = coords.heading ?? snap.heading;

    this.hostVehicle = {
      ...this.hostVehicle,
      latitude: hostLat,
      longitude: hostLng,
      speedKmh: coords.speedKmh,
      heading: hostHeading,
      accuracyMeters: coords.accuracyMeters,
      locationName: coords.locationName ?? this.hostVehicle.locationName,
      timestamp: Date.now(),
      dataSource: 'GPS',
      isGpsActive: true,
      gpsError: null,
    };
    this.recomputePositions();
    this.recalculateAllVehicles();
    this.notify();
  }

  public setHostLocation(
    latitude: number,
    longitude: number,
    heading = 45,
    locationName?: string,
    isGps = false
  ) {
    // Check if this location matches any preset corridor
    const matchingPreset = REAL_WORLD_PRESETS.find(
      (p) =>
        (locationName && p.name.toLowerCase().includes(locationName.toLowerCase())) ||
        (Math.abs(p.latitude - latitude) < 0.08 && Math.abs(p.longitude - longitude) < 0.08)
    );

    if (matchingPreset && HIGHWAY_ROAD_WAYPOINTS[matchingPreset.id]) {
      this.roadCorridor = getRoadCorridorForPreset(matchingPreset.id);
    } else {
      this.roadCorridor = createDynamicRoadCorridor(
        latitude,
        longitude,
        heading,
        locationName || 'Highway Road Corridor'
      );
    }

    const snap = this.roadCorridor.findNearestRoadDistance(latitude, longitude);
    this.hostAlongRoadDistance = snap.distanceMeters;

    const initialPos = this.settings.roadLockEnabled
      ? this.roadCorridor.getPositionAtDistance(this.hostAlongRoadDistance, 0)
      : { latitude, longitude, heading };

    this.hostVehicle = {
      ...this.hostVehicle,
      latitude: initialPos.latitude,
      longitude: initialPos.longitude,
      heading: initialPos.heading,
      locationName: locationName || matchingPreset?.name || this.roadCorridor.name,
      timestamp: Date.now(),
      dataSource: isGps ? 'GPS' : 'SIMULATED',
      isGpsActive: isGps,
      gpsError: null,
    };

    this.hostTrail = [
      {
        latitude: initialPos.latitude,
        longitude: initialPos.longitude,
        speedKmh: this.hostVehicle.speedKmh,
        timestamp: Date.now(),
      },
    ];
    this.hostVehicle.trail = [...this.hostTrail];
    this.recomputePositions();
    this.recalculateAllVehicles();
    this.notify();
  }

  public setGpsError(err: string | null) {
    this.hostVehicle.gpsError = err;
    if (err) {
      this.hostVehicle.isGpsActive = false;
      this.hostVehicle.dataSource = 'SIMULATED';
    }
    this.notify();
  }

  public toggleGpsMode(enableGps: boolean) {
    if (!enableGps) {
      this.hostVehicle.isGpsActive = false;
      this.hostVehicle.dataSource = 'SIMULATED';
      this.hostVehicle.speedKmh = 75;
      this.hostVehicle.heading = DEFAULT_HIGHWAY_ORIGIN.heading;
      this.recalculateAllVehicles();
      this.notify();
    }
  }

  public initScenario(scenarioId: string) {
    this.activeScenarioId = scenarioId;
    this.elapsedSeconds = 0;
    this.alerts = [];
    this.vehicles.clear();
    this.vehicleStates.clear();

    const scenario = SCENARIOS.find((s) => s.id === scenarioId) || SCENARIOS[0];
    this.settings.speedLimitKmh = scenario.defaultSpeedLimit;

    const blueprints = SCENARIO_VEHICLE_BLUEPRINTS[scenarioId] || SCENARIO_VEHICLE_BLUEPRINTS['normal-traffic'];

    const now = Date.now();
    this.hostTrail = [
      {
        latitude: this.hostVehicle.latitude,
        longitude: this.hostVehicle.longitude,
        speedKmh: this.hostVehicle.speedKmh,
        timestamp: now,
      },
    ];
    this.lastHostTrailRecordMs = now;
    this.hostVehicle.trail = [...this.hostTrail];

    blueprints.forEach((bp) => {
      this.vehicleStates.set(bp.id, {
        ...bp,
        currentSpeedKmh: bp.baseSpeedKmh,
        currentLongitudinalOffsetMeters: bp.initialDistanceMeters,
        currentLaneOffsetMeters: bp.laneOffsetMeters,
        isFrozen: false,
        lastBeaconTimestamp: now,
        trail: [],
        lastTrailRecordMs: 0,
      });
    });

    this.recomputePositions();
    this.notify();
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.loop();
  }

  public pause() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public reset() {
    this.pause();
    this.initScenario(this.activeScenarioId);
  }

  public isSimulatorRunning(): boolean {
    return this.isRunning;
  }

  public getActiveScenarioId(): string {
    return this.activeScenarioId;
  }

  /**
   * Continuous 60 FPS animation loop with delta-timing.
   * Ensures uninterrupted, fluid highway vehicle movement without 1-second delays.
   */
  private loop = () => {
    if (!this.isRunning) return;

    const now = performance.now();
    const rawDt = (now - this.lastFrameTime) / 1000;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.1) * (this.settings.simulationMultiplier || 1);
    this.lastFrameTime = now;

    this.stepContinuous(dt);

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private stepContinuous(dtSeconds: number) {
    this.elapsedSeconds += dtSeconds;
    const nowMs = Date.now();

    // 1. Advance Host Vehicle smoothly forward along the authentic highway road
    if (!this.hostVehicle.isGpsActive && this.hostVehicle.speedKmh) {
      const hostSpeed = this.hostVehicle.speedKmh;
      const hostDist = (hostSpeed / 3.6) * dtSeconds;

      if (this.settings.roadLockEnabled) {
        // Strictly follow road centerline & authentic highway curvature
        this.hostAlongRoadDistance += hostDist;
        const roadPos = this.roadCorridor.getPositionAtDistance(this.hostAlongRoadDistance, 0);
        this.hostVehicle.latitude = roadPos.latitude;
        this.hostVehicle.longitude = roadPos.longitude;
        this.hostVehicle.heading = roadPos.heading;
      } else {
        // Fallback straight vector
        const newHostPos = projectCoordinates(
          this.hostVehicle.latitude,
          this.hostVehicle.longitude,
          hostDist,
          this.hostVehicle.heading ?? DEFAULT_HIGHWAY_ORIGIN.heading
        );
        this.hostVehicle.latitude = newHostPos.latitude;
        this.hostVehicle.longitude = newHostPos.longitude;
      }
      this.hostVehicle.timestamp = nowMs;
    }

    // Record host vehicle breadcrumb trail every 400ms
    if (nowMs - this.lastHostTrailRecordMs > 400) {
      this.lastHostTrailRecordMs = nowMs;
      this.hostTrail.push({
        latitude: this.hostVehicle.latitude,
        longitude: this.hostVehicle.longitude,
        speedKmh: this.hostVehicle.speedKmh,
        timestamp: nowMs,
      });
      if (this.hostTrail.length > 30) {
        this.hostTrail.shift();
      }
      this.hostVehicle.trail = [...this.hostTrail];
    }

    const hostSpeed = this.hostVehicle.speedKmh ?? 75;

    // 2. Advance Each Simulated Vehicle Continuously Across 1 km Corridor
    this.vehicleStates.forEach((state) => {
      // Check for packet drop / frozen communication in stale data scenario
      if (
        state.dropCommunicationAfterSeconds &&
        this.elapsedSeconds >= state.dropCommunicationAfterSeconds
      ) {
        state.isFrozen = true;
      }

      // Check for braking / deceleration in collision scenario
      if (
        state.brakingAfterSeconds &&
        this.elapsedSeconds >= state.brakingAfterSeconds &&
        !state.isFrozen
      ) {
        const decel = (state.brakeDecelRate || 10) * dtSeconds;
        state.currentSpeedKmh = Math.max(18, state.currentSpeedKmh - decel);
      }

      // If not frozen, move forward
      if (!state.isFrozen) {
        state.lastBeaconTimestamp = nowMs;

        const isOpposite = state.headingOffsetDegrees === 180;
        const relativeSpeedKmh = isOpposite
          ? -(state.currentSpeedKmh + hostSpeed) // Rapidly closing
          : (state.currentSpeedKmh - hostSpeed); // Overtaking or falling behind

        state.currentLongitudinalOffsetMeters += (relativeSpeedKmh / 3.6) * dtSeconds;

        // Infinite Continuous Highway Corridor Wrapping:
        if (isOpposite) {
          if (state.currentLongitudinalOffsetMeters < -120) {
            state.currentLongitudinalOffsetMeters = 1150; // Re-enter from oncoming 1.15 km horizon
            state.trail = [];
          }
        } else {
          if (state.currentLongitudinalOffsetMeters > 1300) {
            state.currentLongitudinalOffsetMeters = -1050;
            state.trail = [];
          }
          if (state.currentLongitudinalOffsetMeters < -1250) {
            state.currentLongitudinalOffsetMeters = 1180;
            state.trail = [];
          }
        }
      }
    });

    // 3. Recompute geographic coordinates strictly aligned with road pavement
    this.recomputePositions();

    // 4. Periodically cache to localStorage (throttled to every 2 seconds)
    if (nowMs - this.lastStorageSaveTime > 2000) {
      this.lastStorageSaveTime = nowMs;
      saveCachedVehicles(Array.from(this.vehicles.values()));
    }

    // 5. Broadcast to React UI
    this.notify();
  };

  private recomputePositions() {
    const hostLat = this.hostVehicle.latitude;
    const hostLon = this.hostVehicle.longitude;
    const hostHeading = this.hostVehicle.heading ?? DEFAULT_HIGHWAY_ORIGIN.heading;
    const hostSpeed = this.hostVehicle.speedKmh ?? 75;

    const now = Date.now();

    this.vehicleStates.forEach((state, id) => {
      const existing = this.vehicles.get(id);

      // If vehicle is frozen (stale data scenario or comm lost)
      if (state.isFrozen && existing) {
        const ageSec = Math.round((now - state.lastBeaconTimestamp) / 1000);
        const isStale = ageSec >= this.settings.staleThresholdSeconds;

        const updated: Vehicle = {
          ...existing,
          communicationStatus: isStale ? 'STALE' : 'ACTIVE',
          speedStatus: isStale ? 'UNKNOWN' : existing.speedStatus,
          notes: isStale
            ? `Telemetry beacon expired (${ageSec}s ago). Data is stale.`
            : existing.notes,
        };
        this.vehicles.set(id, updated);
        return;
      }

      let finalLat: number;
      let finalLon: number;
      let absoluteHeading: number;

      const isOpposite = state.headingOffsetDegrees === 180;

      if (this.settings.roadLockEnabled) {
        // STRICT ROAD-LOCKED KINEMATICS:
        // Vehicles follow the authentic highway centerline and curved pavement
        const targetRoadDist = this.hostAlongRoadDistance + state.currentLongitudinalOffsetMeters;

        // Oncoming traffic travels on the opposite carriageway separated by the median barrier (-10m lateral shift)
        const effectiveLaneOffset = isOpposite
          ? -(Math.abs(state.currentLaneOffsetMeters) + 7.5)
          : state.currentLaneOffsetMeters;

        const roadPos = this.roadCorridor.getPositionAtDistance(targetRoadDist, effectiveLaneOffset);
        finalLat = roadPos.latitude;
        finalLon = roadPos.longitude;
        absoluteHeading = isOpposite ? (roadPos.heading + 180) % 360 : roadPos.heading;
      } else {
        // Fallback linear projection
        const relativeDistanceMeters = state.currentLongitudinalOffsetMeters;
        absoluteHeading = (hostHeading + state.headingOffsetDegrees) % 360;

        const longitudinalPoint = projectCoordinates(
          hostLat,
          hostLon,
          Math.abs(relativeDistanceMeters),
          relativeDistanceMeters >= 0 ? hostHeading : (hostHeading + 180) % 360
        );

        const perpendicularHeading = (hostHeading + 90) % 360;
        const finalPos = projectCoordinates(
          longitudinalPoint.latitude,
          longitudinalPoint.longitude,
          Math.abs(state.currentLaneOffsetMeters),
          state.currentLaneOffsetMeters >= 0 ? perpendicularHeading : (perpendicularHeading + 180) % 360
        );
        finalLat = finalPos.latitude;
        finalLon = finalPos.longitude;
      }

      const distanceToHost = calculateHaversineDistance(
        hostLat,
        hostLon,
        finalLat,
        finalLon
      );

      // Speed limit status logic (Red / Green / Grey)
      let speedStatus: 'NORMAL' | 'SPEEDING' | 'UNKNOWN' = 'NORMAL';
      if (state.currentSpeedKmh === null || isNaN(state.currentSpeedKmh)) {
        speedStatus = 'UNKNOWN';
      } else if (state.currentSpeedKmh > (this.settings.speedLimitKmh + this.settings.speedThresholdKmh)) {
        speedStatus = 'SPEEDING';
      } else {
        speedStatus = 'NORMAL';
      }

      // Direction status logic
      const directionStatus = classifyRelativeDirection(hostHeading, absoluteHeading);

      // Collision risk evaluation
      const collisionEval = evaluateCollisionRisk({
        distanceMeters: distanceToHost,
        hostSpeedKmh: hostSpeed,
        hostHeading,
        targetSpeedKmh: state.currentSpeedKmh,
        targetHeading: absoluteHeading,
        hostLat,
        hostLon,
        targetLat: finalLat,
        targetLon: finalLon,
      });

      // Maintain vehicle trajectory & speed trace trail
      if (!state.isFrozen) {
        if (now - state.lastTrailRecordMs > 400) {
          state.lastTrailRecordMs = now;
          state.trail.push({
            latitude: finalLat,
            longitude: finalLon,
            speedKmh: Math.round(state.currentSpeedKmh),
            timestamp: now,
          });
          if (state.trail.length > 25) {
            state.trail.shift();
          }
        }
      }

      const laneDescription = isOpposite
        ? 'Opposite Carriageway (Oncoming)'
        : state.currentLaneOffsetMeters < -1.5
        ? 'Fast / Overtake Lane'
        : state.currentLaneOffsetMeters > 1.5
        ? 'Slow / Freight Lane'
        : 'Center Cruising Lane';

      const vehicleObj: Vehicle = {
        id: state.id,
        name: state.name,
        category: state.category,
        latitude: finalLat,
        longitude: finalLon,
        speedKmh: Math.round(state.currentSpeedKmh),
        heading: absoluteHeading,
        timestamp: now,
        dataSource: 'SIMULATED',
        accuracyMeters: 1.8,
        speedLimitKmh: this.settings.speedLimitKmh,
        speedStatus,
        directionStatus,
        communicationStatus: this.settings.isOfflineSimulated ? 'LOST' : 'ACTIVE',
        distanceMeters: distanceToHost,
        closingSpeedKmh: collisionEval.closingSpeedKmh,
        timeToCollisionSeconds: collisionEval.timeToCollisionSeconds,
        collisionRiskLevel: collisionEval.riskLevel,
        collisionRiskReason: collisionEval.reason,
        notes: laneDescription,
        trail: [...state.trail],
      };

      this.vehicles.set(id, vehicleObj);

      // Trigger safety alerts when warranted
      this.evaluateAlertsForVehicle(vehicleObj);
    });
  }

  private recalculateAllVehicles() {
    this.vehicles.forEach((vehicle, id) => {
      let speedStatus: 'NORMAL' | 'SPEEDING' | 'UNKNOWN' = 'NORMAL';
      if (vehicle.speedKmh === null || vehicle.communicationStatus === 'STALE') {
        speedStatus = 'UNKNOWN';
      } else if (vehicle.speedKmh > (this.settings.speedLimitKmh + this.settings.speedThresholdKmh)) {
        speedStatus = 'SPEEDING';
      } else {
        speedStatus = 'NORMAL';
      }

      vehicle.speedLimitKmh = this.settings.speedLimitKmh;
      vehicle.speedStatus = speedStatus;
      this.vehicles.set(id, vehicle);
    });
  }

  private evaluateAlertsForVehicle(v: Vehicle) {
    if (this.settings.isOfflineSimulated) return;

    // 1. Critical Collision Risk Alert
    if (v.collisionRiskLevel === 'CRITICAL' && v.distanceMeters <= this.settings.targetRadiusMeters) {
      const existing = this.alerts.find(
        (a) => a.targetVehicleId === v.id && a.type === 'COLLISION_RISK' && Date.now() - a.timestamp < 3500
      );
      if (!existing) {
        const newAlert: SafetyAlert = {
          id: `alert-col-${v.id}-${Date.now()}`,
          targetVehicleId: v.id,
          type: 'COLLISION_RISK',
          level: 'CRITICAL',
          message: `Collision Hazard: ${v.name} (${v.distanceMeters}m)`,
          details: v.collisionRiskReason || `Time-to-collision: ${v.timeToCollisionSeconds}s`,
          timestamp: Date.now(),
        };
        this.alerts.unshift(newAlert);
        if (this.alerts.length > 8) this.alerts.pop();

        soundManager.playCriticalAlert();
        appendTelemetryLog({
          id: newAlert.id,
          timestamp: newAlert.timestamp,
          vehicleId: v.id,
          category: v.category,
          speedKmh: v.speedKmh,
          speedLimitKmh: v.speedLimitKmh,
          status: 'COLLISION_HAZARD',
          distanceMeters: v.distanceMeters,
          event: newAlert.message,
        });
      }
    }

    // 2. Speed limit violation alert
    if (v.speedStatus === 'SPEEDING' && v.distanceMeters <= this.settings.targetRadiusMeters) {
      const existing = this.alerts.find(
        (a) => a.targetVehicleId === v.id && a.type === 'SPEED_VIOLATION' && Date.now() - a.timestamp < 8000
      );
      if (!existing) {
        const delta = (v.speedKmh ?? 0) - this.settings.speedLimitKmh;
        const newAlert: SafetyAlert = {
          id: `alert-spd-${v.id}-${Date.now()}`,
          targetVehicleId: v.id,
          type: 'SPEED_VIOLATION',
          level: 'CAUTION',
          message: `Speed Violation: ${v.name} (+${delta} km/h)`,
          details: `Traveling at ${v.speedKmh} km/h on a ${this.settings.speedLimitKmh} km/h segment`,
          timestamp: Date.now(),
        };
        this.alerts.unshift(newAlert);
        if (this.alerts.length > 8) this.alerts.pop();

        soundManager.playSpeedLimitChime();
        appendTelemetryLog({
          id: newAlert.id,
          timestamp: newAlert.timestamp,
          vehicleId: v.id,
          category: v.category,
          speedKmh: v.speedKmh,
          speedLimitKmh: v.speedLimitKmh,
          status: 'SPEED_VIOLATION',
          distanceMeters: v.distanceMeters,
          event: newAlert.message,
        });
      }
    }

    // 3. Opposite Direction Approach
    if (v.directionStatus === 'OPPOSITE_DIRECTION' && v.distanceMeters <= this.settings.targetRadiusMeters) {
      const existing = this.alerts.find(
        (a) => a.targetVehicleId === v.id && a.type === 'OPPOSITE_APPROACH' && Date.now() - a.timestamp < 10000
      );
      if (!existing) {
        const newAlert: SafetyAlert = {
          id: `alert-opp-${v.id}-${Date.now()}`,
          targetVehicleId: v.id,
          type: 'OPPOSITE_APPROACH',
          level: 'CAUTION',
          message: `Oncoming Traffic Detected: ${v.name}`,
          details: `Vehicle moving in opposite direction (${v.distanceMeters}m away)`,
          timestamp: Date.now(),
        };
        this.alerts.unshift(newAlert);
        if (this.alerts.length > 8) this.alerts.pop();

        soundManager.playCautionAlert();
      }
    }
  }

  public dismissAlert(alertId: string) {
    this.alerts = this.alerts.filter((a) => a.id !== alertId);
    this.notify();
  }

  public clearAlerts() {
    this.alerts = [];
    this.notify();
  }
}
