/**
 * Hook for Browser Geolocation API with speed/heading validation
 * Does not fabricate live speed when stationary or unsupported.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface GpsData {
  latitude: number | null;
  longitude: number | null;
  speedKmh: number | null;
  heading: number | null;
  accuracyMeters: number | null;
  timestamp: number | null;
  status: 'IDLE' | 'REQUESTING' | 'ACTIVE' | 'DENIED' | 'UNAVAILABLE';
  error: string | null;
}

export function useGeolocation() {
  const [gpsData, setGpsData] = useState<GpsData>({
    latitude: null,
    longitude: null,
    speedKmh: null,
    heading: null,
    accuracyMeters: null,
    timestamp: null,
    status: 'IDLE',
    error: null,
  });

  const watchIdRef = useRef<number | null>(null);

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

    const onSuccess = (position: GeolocationPosition) => {
      const { coords, timestamp } = position;

      // coords.speed is in m/s; convert to km/h if valid number > 0
      let speedKmh: number | null = null;
      if (coords.speed !== null && !isNaN(coords.speed) && coords.speed >= 0) {
        speedKmh = Math.round(coords.speed * 3.6 * 10) / 10;
      }

      // coords.heading is 0 - 359 degrees; null when stationary
      let heading: number | null = null;
      if (coords.heading !== null && !isNaN(coords.heading) && coords.heading >= 0) {
        heading = Math.round(coords.heading);
      }

      setGpsData({
        latitude: coords.latitude,
        longitude: coords.longitude,
        speedKmh,
        heading,
        accuracyMeters: coords.accuracy ? Math.round(coords.accuracy * 10) / 10 : null,
        timestamp,
        status: 'ACTIVE',
        error: null,
      });
    };

    const onError = (error: GeolocationPositionError) => {
      let message = 'An unknown GPS error occurred.';
      let status: 'DENIED' | 'UNAVAILABLE' = 'UNAVAILABLE';

      switch (error.code) {
        case error.PERMISSION_DENIED:
          message = 'Location permission denied by user. Demonstrating with simulated Highway host.';
          status = 'DENIED';
          break;
        case error.POSITION_UNAVAILABLE:
          message = 'Location information is currently unavailable.';
          status = 'UNAVAILABLE';
          break;
        case error.TIMEOUT:
          message = 'Location acquisition timed out.';
          status = 'UNAVAILABLE';
          break;
      }

      setGpsData((prev) => ({
        ...prev,
        status,
        error: message,
      }));
    };

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 2000,
      });
    } catch (e) {
      setGpsData((prev) => ({
        ...prev,
        status: 'UNAVAILABLE',
        error: 'Failed to access browser geolocation API.',
      }));
    }
  }, []);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsData((prev) => ({
      ...prev,
      status: 'IDLE',
    }));
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
  };
}
