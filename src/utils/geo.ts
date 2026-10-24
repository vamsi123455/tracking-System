/**
 * Geographic and Vector Math Utilities for Highway Tracking
 */

import { DirectionStatus, CollisionRiskLevel } from '../types/vehicle';

export const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculates Haversine distance between two coordinates in meters
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c * 10) / 10;
}

/**
 * Calculates bearing from point A to point B in degrees (0 - 359)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  const bearing = ((theta * 180) / Math.PI + 360) % 360;
  return Math.round(bearing);
}

/**
 * Classifies relative movement direction between host vehicle and remote vehicle
 */
export function classifyRelativeDirection(
  hostHeading: number | null,
  targetHeading: number | null
): DirectionStatus {
  if (hostHeading === null || targetHeading === null) {
    return 'UNKNOWN';
  }

  // Calculate absolute angular difference normalized to 0 - 180
  let diff = Math.abs(hostHeading - targetHeading) % 360;
  if (diff > 180) {
    diff = 360 - diff;
  }

  // Within 45 degrees: Same direction
  if (diff <= 45) {
    return 'SAME_DIRECTION';
  }
  // Above 135 degrees: Opposite direction (oncoming / wrong way)
  if (diff >= 135) {
    return 'OPPOSITE_DIRECTION';
  }
  // In-between: Cross traffic (merging, perpendicular, or turning)
  return 'CROSS_TRAFFIC';
}

/**
 * Estimates Closing Speed (km/h) and Time-to-Collision (TTC in seconds)
 * 
 * Note: Clearly documented as an illustrative prototype calculation.
 * A real automotive V2X system incorporates GNSS covariance, lateral lane offsets,
 * acceleration derivatives, and sensor fusion.
 */
export function evaluateCollisionRisk(params: {
  distanceMeters: number;
  hostSpeedKmh: number | null;
  hostHeading: number | null;
  targetSpeedKmh: number | null;
  targetHeading: number | null;
  hostLat: number;
  hostLon: number;
  targetLat: number;
  targetLon: number;
}): {
  closingSpeedKmh: number;
  timeToCollisionSeconds: number | null;
  riskLevel: CollisionRiskLevel;
  reason: string;
} {
  const {
    distanceMeters,
    hostSpeedKmh,
    hostHeading,
    targetSpeedKmh,
    targetHeading,
    hostLat,
    hostLon,
    targetLat,
    targetLon,
  } = params;

  if (hostSpeedKmh === null || targetSpeedKmh === null) {
    return {
      closingSpeedKmh: 0,
      timeToCollisionSeconds: null,
      riskLevel: 'NONE',
      reason: 'Speed data unavailable for collision assessment',
    };
  }

  const vHost = hostSpeedKmh / 3.6; // convert to m/s
  const vTarget = targetSpeedKmh / 3.6; // convert to m/s

  // Bearing from host to target
  const bearingToTarget = calculateBearing(hostLat, hostLon, targetLat, targetLon);

  // Decompose velocities into host-to-target line-of-sight axis
  const hostHeadingRad = ((hostHeading ?? bearingToTarget) * Math.PI) / 180;
  const targetHeadingRad = ((targetHeading ?? (bearingToTarget + 180)) * Math.PI) / 180;
  const lineOfSightRad = (bearingToTarget * Math.PI) / 180;

  // Velocity components along the line of sight (positive towards target)
  const hostLosVelocity = vHost * Math.cos(hostHeadingRad - lineOfSightRad);
  // Target velocity towards host (opposite of line of sight)
  const targetLosVelocity = -vTarget * Math.cos(targetHeadingRad - lineOfSightRad);

  // Closing speed: rate at which distance decreases (m/s)
  const closingSpeedMs = hostLosVelocity + targetLosVelocity;
  const closingSpeedKmh = Math.round(closingSpeedMs * 3.6 * 10) / 10;

  // If distance is expanding or stationary
  if (closingSpeedMs <= 0.5) {
    return {
      closingSpeedKmh: Math.max(0, closingSpeedKmh),
      timeToCollisionSeconds: null,
      riskLevel: 'NONE',
      reason: 'Separation distance is constant or increasing',
    };
  }

  // Time-to-Collision = Distance / Closing Speed
  const ttc = Math.round((distanceMeters / closingSpeedMs) * 10) / 10;

  // Evaluate risk level based on distance and TTC
  if (distanceMeters <= 25 && ttc <= 3.0) {
    return {
      closingSpeedKmh,
      timeToCollisionSeconds: ttc,
      riskLevel: 'CRITICAL',
      reason: `Imminent trajectory conflict! TTC: ${ttc}s at ${closingSpeedKmh} km/h closing speed (${distanceMeters}m away)`,
    };
  }

  if (distanceMeters <= 55 && ttc <= 6.0) {
    return {
      closingSpeedKmh,
      timeToCollisionSeconds: ttc,
      riskLevel: 'CAUTION',
      reason: `High closing speed (${closingSpeedKmh} km/h). TTC: ${ttc}s at ${distanceMeters}m`,
    };
  }

  if (distanceMeters <= 100 && ttc <= 10.0) {
    return {
      closingSpeedKmh,
      timeToCollisionSeconds: ttc,
      riskLevel: 'LOW',
      reason: `Approaching participant. TTC: ${ttc}s (${distanceMeters}m away)`,
    };
  }

  return {
    closingSpeedKmh,
    timeToCollisionSeconds: ttc,
    riskLevel: 'NONE',
    reason: `Distance: ${distanceMeters}m, safe headway`,
  };
}

/**
 * Projects a new coordinate given start point, distance in meters, and heading in degrees
 */
export function projectCoordinates(
  lat: number,
  lon: number,
  distanceMeters: number,
  headingDegrees: number
): { latitude: number; longitude: number } {
  const d = distanceMeters / EARTH_RADIUS_METERS;
  const theta = (headingDegrees * Math.PI) / 180;
  const phi1 = (lat * Math.PI) / 180;
  const lambda1 = (lon * Math.PI) / 180;

  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(d) + Math.cos(phi1) * Math.sin(d) * Math.cos(theta)
  );
  const lambda2 =
    lambda1 +
    Math.atan2(
      Math.sin(theta) * Math.sin(d) * Math.cos(phi1),
      Math.cos(d) - Math.sin(phi1) * Math.sin(phi2)
    );

  return {
    latitude: (phi2 * 180) / Math.PI,
    longitude: (lambda2 * 180) / Math.PI,
  };
}
