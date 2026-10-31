/**
 * Local Storage and Offline Persistence Utility
 */

import { SystemSettings, Vehicle } from '../types/vehicle';

const SETTINGS_KEY = 'highway_safety_settings_v1';
const RECENT_VEHICLES_KEY = 'highway_safety_cached_vehicles_v1';
const OFFLINE_EVENT_LOG_KEY = 'highway_safety_event_log_v1';

export const DEFAULT_SETTINGS: SystemSettings = {
  targetRadiusMeters: 1000, // 1 km (1000 meters) default detection & tracing horizon
  speedLimitKmh: 80,
  speedThresholdKmh: 3,
  staleThresholdSeconds: 5,
  soundEnabled: true,
  simulationMultiplier: 1,
  isOfflineSimulated: false,
  showTraces: true,
  roadLockEnabled: true,
  showRoadGuide: true,
};

export function loadStoredSettings(): SystemSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      // If user had previous 100m cached setting, adapt to requested 1km default
      targetRadiusMeters: parsed.targetRadiusMeters && parsed.targetRadiusMeters >= 500 ? parsed.targetRadiusMeters : 1000,
      showTraces: parsed.showTraces !== undefined ? parsed.showTraces : true,
      roadLockEnabled: parsed.roadLockEnabled !== undefined ? parsed.roadLockEnabled : true,
      showRoadGuide: parsed.showRoadGuide !== undefined ? parsed.showRoadGuide : true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: SystemSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to cache settings to localStorage', e);
  }
}

export function saveCachedVehicles(vehicles: Vehicle[]): void {
  try {
    const payload = {
      savedAt: Date.now(),
      vehicles: vehicles.slice(0, 30),
    };
    localStorage.setItem(RECENT_VEHICLES_KEY, JSON.stringify(payload));
  } catch {
    // quota exceeded or storage unavailable
  }
}

export function loadCachedVehicles(): { savedAt: number; vehicles: Vehicle[] } | null {
  try {
    const raw = localStorage.getItem(RECENT_VEHICLES_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export interface TelemetryLogEntry {
  id: string;
  timestamp: number;
  vehicleId: string;
  category: string;
  speedKmh: number | null;
  speedLimitKmh: number | null;
  status: string;
  distanceMeters: number;
  event: string;
}

export function appendTelemetryLog(entry: TelemetryLogEntry): void {
  try {
    const raw = localStorage.getItem(OFFLINE_EVENT_LOG_KEY);
    const list: TelemetryLogEntry[] = raw ? JSON.parse(raw) : [];
    list.unshift(entry);
    if (list.length > 100) list.pop();
    localStorage.setItem(OFFLINE_EVENT_LOG_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function getTelemetryLogs(): TelemetryLogEntry[] {
  try {
    const raw = localStorage.getItem(OFFLINE_EVENT_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearTelemetryLogs(): void {
  try {
    localStorage.removeItem(OFFLINE_EVENT_LOG_KEY);
  } catch {
    // ignore
  }
}
