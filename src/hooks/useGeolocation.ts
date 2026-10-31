/**
 * Real-World Browser Geolocation API Hook
 * High-accuracy GPS tracking with velocity and heading computation from successive fixes,
 * real-time reverse geocoding, and graceful permission state handling.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface GpsData {
  latitude: number | null;
  longitude: number | null;
  altitudeMeters: number | null;
  speedKmh: number | null;
  heading: number | null;
  accuracyMeters: number | null;
  timestamp: number | null;
  status: 'IDLE' | 'REQUESTING' | 'ACTIVE' | 'DENIED' | 'UNAVAILABLE';
  error: string | null;
  placeName: string | null;
  isRealLocation: boolean;
}

// Calculate bearing between two GPS coordinates
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

// Haversine distance in meters
function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useGeolocation() {
  const [gpsData, setGpsData] = useState<GpsData>({
    latitude: null,
    longitude: null,
    altitudeMeters: null,
    speedKmh: null,
    heading: null,
    accuracyMeters: null,
    timestamp: null,
    status: 'IDLE',
    error: null,
    placeName: null,
    isRealLocation: false,
  });

  const watchIdRef = useRef<number | null>(null);
  const prevCoordsRef = useRef<{ lat: number; lon: number; time: number } | null>(null);
  const lastGeocodeCoordsRef = useRef<{ lat: number; lon: number } | null>(null);

  // Reverse geocoding helper
  const reverseGeocode = useCallback(async (lat: number, lon: number) => {
    // Don't re-fetch if within 200m of last geocode
    if (
      lastGeocodeCoordsRef.current &&
      haversineDistanceMeters(lastGeocodeCoordsRef.current.lat, lastGeocodeCoordsRef.current.lon, lat, lon) < 200
    ) {
      return;
    }

    try {
      lastGeocodeCoordsRef.current = { lat, lon };
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        const address = data.address;
        if (address) {
          const parts = [
            address.suburb || address.neighbourhood || address.road || address.quarter,
            address.city || address.town || address.county || address.municipality,
            address.state || address.region,
            address.country,
          ].filter(Boolean);
          const name = parts.slice(0, 3).join(', ');
          if (name) {
            setGpsData((prev) => ({ ...prev, placeName: name }));
            return;
          }
        }
        if (data.display_name) {
          const fallback = data.display_name.split(',').slice(0, 3).join(', ');
          setGpsData((prev) => ({ ...prev, placeName: fallback }));
          return;
        }
      }
    } catch {
      // Graceful fallback to coordinate representation
      setGpsData((prev) => ({
        ...prev,
        placeName: `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`,
      }));
    }
  }, []);

  const handlePositionSuccess = useCallback(
    (position: GeolocationPosition) => {
      const { coords, timestamp } = position;
      const now = timestamp || Date.now();

      let speedKmh: number | null = null;
      let heading: number | null = null;

      // 1. Raw device speed
      if (coords.speed !== null && !isNaN(coords.speed) && coords.speed >= 0) {
        speedKmh = Math.round(coords.speed * 3.6 * 10) / 10;
      }

      // 2. Raw device heading
      if (coords.heading !== null && !isNaN(coords.heading) && coords.heading >= 0) {
        heading = Math.round(coords.heading);
      }

      // 3. Computed velocity / heading from successive fixes if raw is unavailable
      if (prevCoordsRef.current) {
        const dtSeconds = (now - prevCoordsRef.current.time) / 1000;
        if (dtSeconds > 0.5 && dtSeconds < 30) {
          const distM = haversineDistanceMeters(
            prevCoordsRef.current.lat,
            prevCoordsRef.current.lon,
            coords.latitude,
            coords.longitude
          );

          // Only calculate if moved significantly (> 2m) to avoid GPS jitter
          if (distM > 2) {
            if (speedKmh === null) {
              const computedSpeed = (distM / dtSeconds) * 3.6;
              speedKmh = Math.round(computedSpeed * 10) / 10;
            }
            if (heading === null) {
              heading = Math.round(
                calculateBearing(
                  prevCoordsRef.current.lat,
                  prevCoordsRef.current.lon,
                  coords.latitude,
                  coords.longitude
                )
              );
            }
          } else if (speedKmh === null) {
            speedKmh = 0; // Stationary
          }
        }
      }

      prevCoordsRef.current = {
        lat: coords.latitude,
        lon: coords.longitude,
        time: now,
      };

      setGpsData((prev) => ({
        ...prev,
        latitude: coords.latitude,
        longitude: coords.longitude,
        altitudeMeters: coords.altitude ? Math.round(coords.altitude) : null,
        speedKmh,
        heading,
        accuracyMeters: coords.accuracy ? Math.round(coords.accuracy * 10) / 10 : null,
        timestamp: now,
        status: 'ACTIVE',
        error: null,
        isRealLocation: true,
      }));

      // Trigger reverse geocoding in background
      reverseGeocode(coords.latitude, coords.longitude);
    },
    [reverseGeocode]
  );

  const handlePositionError = useCallback((error: GeolocationPositionError) => {
    let message = 'An unknown GPS error occurred.';
    let status: 'DENIED' | 'UNAVAILABLE' = 'UNAVAILABLE';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location permission was denied. You can select a real highway preset or grant permission in browser settings.';
        status = 'DENIED';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Real location information is currently unavailable from device sensors.';
        status = 'UNAVAILABLE';
        break;
      case error.TIMEOUT:
        message = 'Acquiring GPS location timed out. Retrying with network location...';
        status = 'UNAVAILABLE';
        break;
    }

    setGpsData((prev) => ({
      ...prev,
      status,
      error: message,
    }));
  }, []);

  const startWatching = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGpsData((prev) => ({
        ...prev,
        status: 'UNAVAILABLE',
        error: 'Geolocation is not supported by this browser.',
      }));
      return;
    }

    setGpsData((prev) => ({ ...prev, status: 'REQUESTING', error: null }));

    // First do a fast getCurrentPosition for instant response
    navigator.geolocation.getCurrentPosition(handlePositionSuccess, handlePositionError, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 10000,
    });

    // Then start continuous watchPosition
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handlePositionSuccess,
        handlePositionError,
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 2000,
        }
      );
    } catch {
      setGpsData((prev) => ({
        ...prev,
        status: 'UNAVAILABLE',
        error: 'Failed to access browser geolocation API.',
      }));
    }
  }, [handlePositionSuccess, handlePositionError]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsData((prev) => ({
      ...prev,
      status: 'IDLE',
      isRealLocation: false,
    }));
  }, []);

  // Preset setter for real-world locations
  const setPresetLocation = useCallback((lat: number, lon: number, name: string) => {
    setGpsData({
      latitude: lat,
      longitude: lon,
      altitudeMeters: null,
      speedKmh: 75,
      heading: 45,
      accuracyMeters: 3.5,
      timestamp: Date.now(),
      status: 'ACTIVE',
      error: null,
      placeName: name,
      isRealLocation: true,
    });
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    gpsData,
    startWatching,
    stopWatching,
    setPresetLocation,
  };
}
