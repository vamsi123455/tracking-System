/**
 * Real-time Highway Vehicle Simulator and Safety Evaluation Engine
 * Continuous Non-stop High-Frequency Kinematics Tracking (No 1-second pause/delay)
 */

import {
  Vehicle,
  HostVehicleState,
  SystemSettings,
  SafetyAlert,
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

// Anchor coordinate for realistic highway track (NH-44 Hyderabad-Bengaluru highway corridor)
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
}

export class HighwaySafetySimulator {
  private activeScenarioId = 'normal-traffic';
  private isRunning = false;
  private animFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private lastStorageSaveTime: number = 0;
  private elapsedSeconds = 0;
  private settings: SystemSettings;
  
  private hostVehicle: HostVehicleState;
  private vehicles: Map<string, Vehicle> = new Map();
  private vehicleStates: Map<string, DynamicVehicleState> = new Map();
  private alerts: SafetyAlert[] = [];
  private listeners: Set<(state: { vehicles: Vehicle[]; host: HostVehicleState; alerts: SafetyAlert[] }) => void> = new Set();

  constructor(initialSettings: SystemSettings) {
    this.settings = { ...initialSettings };
    this.hostVehicle = {
      id: 'HOST-VEHICLE-01',
      name: 'Host Vehicle (My Vehicle)',
      category: 'car',
      latitude: DEFAULT_HIGHWAY_ORIGIN.latitude,
      longitude: DEFAULT_HIGHWAY_ORIGIN.longitude,
      speedKmh: 75,
      heading: DEFAULT_HIGHWAY_ORIGIN.heading,
      accuracyMeters: 2.5,
      timestamp: Date.now(),
      dataSource: 'SIMULATED',
      isGpsActive: false,
      gpsError: null,
    };

    this.initScenario(this.activeScenarioId);
  }

  public subscribe(callback: (state: { vehicles: Vehicle[]; host: HostVehicleState; alerts: SafetyAlert[] }) => void): () => void {
    this.listeners.add(callback);
    this.notify();
    return () => this.listeners.delete(callback);
  }

  private notify() {
    const vehicleArray = Array.from(this.vehicles.values());
    const payload = {
      vehicles: vehicleArray,
      host: { ...this.hostVehicle },
      alerts: [...this.alerts],
    };
    this.listeners.forEach((cb) => cb(payload));
  }

  public getSettings(): SystemSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<SystemSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    soundManager.setMuted(!this.settings.soundEnabled);
    this.recalculateAllVehicles();
    this.notify();
  }

  public setHostFromGps(coords: {
    latitude: number;
    longitude: number;
    speedKmh: number | null;
    heading: number | null;
    accuracyMeters: number | null;
  }) {
    this.hostVehicle = {
      ...this.hostVehicle,
      latitude: coords.latitude,
      longitude: coords.longitude,
      speedKmh: coords.speedKmh,
      heading: coords.heading ?? this.hostVehicle.heading,
      accuracyMeters: coords.accuracyMeters,
      timestamp: Date.now(),
      dataSource: 'GPS',
      isGpsActive: true,
      gpsError: null,
    };
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
    blueprints.forEach((bp) => {
      this.vehicleStates.set(bp.id, {
        ...bp,
        currentSpeedKmh: bp.baseSpeedKmh,
        currentLongitudinalOffsetMeters: bp.initialDistanceMeters,
        currentLaneOffsetMeters: bp.laneOffsetMeters,
        isFrozen: false,
        lastBeaconTimestamp: now,
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
    // Delta time in seconds, clamped to avoid huge jumps if tab was backgrounded
    const rawDt = (now - this.lastFrameTime) / 1000;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.1) * (this.settings.simulationMultiplier || 1);
    this.lastFrameTime = now;

    this.stepContinuous(dt);

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private stepContinuous(dtSeconds: number) {
    this.elapsedSeconds += dtSeconds;
    const nowMs = Date.now();

    // 1. Advance Host Vehicle smoothly forward along the highway
    if (!this.hostVehicle.isGpsActive && this.hostVehicle.speedKmh) {
      const hostDist = (this.hostVehicle.speedKmh / 3.6) * dtSeconds;
      const newHostPos = projectCoordinates(
        this.hostVehicle.latitude,
        this.hostVehicle.longitude,
        hostDist,
        this.hostVehicle.heading ?? DEFAULT_HIGHWAY_ORIGIN.heading
      );
      this.hostVehicle.latitude = newHostPos.latitude;
      this.hostVehicle.longitude = newHostPos.longitude;
      this.hostVehicle.timestamp = nowMs;
    }

    const hostSpeed = this.hostVehicle.speedKmh ?? 75;

    // 2. Advance Each Simulated Vehicle Continuously
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

        // Kinematics:
        // For same direction (heading offset 0):
        // Relative speed = targetSpeed - hostSpeed
        // Change in relative distance = (relativeSpeed / 3.6) * dt
        // For oncoming (heading offset 180):
        // Approaching at (targetSpeed + hostSpeed)
        const isOpposite = state.headingOffsetDegrees === 180;
        const relativeSpeedKmh = isOpposite
          ? -(state.currentSpeedKmh + hostSpeed) // Rapidly closing
          : (state.currentSpeedKmh - hostSpeed); // Overtaking or falling behind

        state.currentLongitudinalOffsetMeters += (relativeSpeedKmh / 3.6) * dtSeconds;

        // Infinite Continuous Highway Corridor Wrapping:
        // Vehicles must never stop or disappear permanently!
        // When an oncoming vehicle passes behind the host (> 60m behind), wrap to oncoming horizon (+200m ahead).
        if (isOpposite) {
          if (state.currentLongitudinalOffsetMeters < -60) {
            state.currentLongitudinalOffsetMeters = 220; // Re-enter from oncoming horizon
          }
        } else {
          // For same direction vehicles:
          // If a speeding vehicle goes far ahead (> 260m), reset smoothly to -80m to overtake again
          if (state.currentLongitudinalOffsetMeters > 260) {
            state.currentLongitudinalOffsetMeters = -90;
          }
          // If a slower truck falls far behind (< -140m), respawn ahead (+150m) to cruise past again
          if (state.currentLongitudinalOffsetMeters < -140) {
            state.currentLongitudinalOffsetMeters = 160;
          }
        }
      }
    });

    // 3. Recompute geographic coordinates and collision assessments
    this.recomputePositions();

    // 4. Periodically cache to localStorage (throttled to every 2 seconds to keep 60 FPS buttery smooth)
    if (nowMs - this.lastStorageSaveTime > 2000) {
      this.lastStorageSaveTime = nowMs;
      saveCachedVehicles(Array.from(this.vehicles.values()));
    }

    // 5. Broadcast to React UI
    this.notify();
  }

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

      const relativeDistanceMeters = state.currentLongitudinalOffsetMeters;
      const absoluteHeading = (hostHeading + state.headingOffsetDegrees) % 360;

      // Project longitudinal distance along highway heading
      const longitudinalPoint = projectCoordinates(
        hostLat,
        hostLon,
        Math.abs(relativeDistanceMeters),
        relativeDistanceMeters >= 0 ? hostHeading : (hostHeading + 180) % 360
      );

      // Project lateral lane offset perpendicular to highway (bearing + 90 deg)
      const perpendicularHeading = (hostHeading + 90) % 360;
      const finalPosition = projectCoordinates(
        longitudinalPoint.latitude,
        longitudinalPoint.longitude,
        Math.abs(state.currentLaneOffsetMeters),
        state.currentLaneOffsetMeters >= 0 ? perpendicularHeading : (perpendicularHeading + 180) % 360
      );

      const distanceToHost = calculateHaversineDistance(
        hostLat,
        hostLon,
        finalPosition.latitude,
        finalPosition.longitude
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
        targetLat: finalPosition.latitude,
        targetLon: finalPosition.longitude,
      });

      const vehicleObj: Vehicle = {
        id: state.id,
        name: state.name,
        category: state.category,
        latitude: finalPosition.latitude,
        longitude: finalPosition.longitude,
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
        notes: state.currentLaneOffsetMeters < 0 ? 'Left/Overtake corridor' : 'Right/Cruise corridor',
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
