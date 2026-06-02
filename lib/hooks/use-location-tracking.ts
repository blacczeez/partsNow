'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Position {
  latitude: number;
  longitude: number;
}

const SEND_INTERVAL_MS = 30000; // 30 seconds

export function useLocationTracking(orderId: string | null) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestPositionRef = useRef<Position | null>(null);

  const sendLocation = useCallback(
    async (position: Position) => {
      if (!orderId) return;
      try {
        await fetch(`/api/rider/orders/${orderId}/location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: position.latitude,
            longitude: position.longitude,
          }),
        });
      } catch {
        // Silent fail for location updates
      }
    },
    [orderId]
  );

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    if (!orderId) {
      setError('No active delivery to track');
      return;
    }

    setError(null);
    setIsTracking(true);

    // Watch position continuously
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const position: Position = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setCurrentPosition(position);
        latestPositionRef.current = position;
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setError('Location permission denied');
        } else {
          setError('Failed to get location');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    // Send location to server every 30 seconds
    intervalRef.current = setInterval(() => {
      if (latestPositionRef.current) {
        sendLocation(latestPositionRef.current);
      }
    }, SEND_INTERVAL_MS);

    // Send initial location immediately
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const position: Position = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setCurrentPosition(position);
        latestPositionRef.current = position;
        sendLocation(position);
      },
      () => {
        // Ignore initial position failure, watchPosition will handle it
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [orderId, sendLocation]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isTracking,
    currentPosition,
    error,
    startTracking,
    stopTracking,
  };
}
