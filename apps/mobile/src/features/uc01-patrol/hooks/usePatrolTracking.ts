import { useState, useEffect, useCallback, useRef } from 'react';
import { calculateHaversineDistanceKm, LocationType } from '@wildlife/shared';
import { Patrol, PatrolRoute, Waypoint } from '../types';
import { patrolMobileService } from '../services/patrolMobileService';

export type GpsStatus = 'ACQUIRING' | 'LIVE' | 'STALE' | 'PERMISSION_DENIED' | 'UNAVAILABLE' | 'OFF';

export interface LocationReading {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  timestamp: number;
}

export interface UsePatrolTrackingReturn {
  currentLocation: LocationReading | null;
  gpsStatus: GpsStatus;
  gpsError: string | null;
  isRecording: boolean;
  visitedCheckpointIds: string[];
  refreshGps: () => Promise<void>;
  recordCurrentWaypoint: (notes?: string) => Promise<Waypoint | null>;
  calculateDistanceToCheckpoint: (checkpoint: Waypoint) => number | null;
}

export function usePatrolTracking(
  patrol: Patrol | null,
  route: PatrolRoute | null,
  onWaypointRecorded?: (wp: Waypoint) => void
): UsePatrolTrackingReturn {
  const [currentLocation, setCurrentLocation] = useState<LocationReading | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('OFF');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  const watchSubRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  // Compute visited checkpoints from both past recorded waypoints and current location
  const computeVisitedCheckpointIds = useCallback((): string[] => {
    if (!route?.waypoints || route.waypoints.length === 0) return [];

    const recorded = patrol?.waypoints || [];
    const visited = new Set<string>();

    for (const cp of route.waypoints) {
      // Check past recorded waypoints
      const visitedInHistory = recorded.some((wp) => {
        const distKm = calculateHaversineDistanceKm(
          cp.latitude,
          cp.longitude,
          wp.latitude,
          wp.longitude
        );
        return distKm <= 0.2; // 200 meters proximity
      });

      if (visitedInHistory) {
        visited.add(cp.id);
        continue;
      }

      // Check live location fix
      if (currentLocation) {
        const distKm = calculateHaversineDistanceKm(
          cp.latitude,
          cp.longitude,
          currentLocation.latitude,
          currentLocation.longitude
        );
        if (distKm <= 0.2) {
          visited.add(cp.id);
        }
      }
    }

    return Array.from(visited);
  }, [route?.waypoints, patrol?.waypoints, currentLocation]);

  // Acquire current location safely across Expo native & web fallback
  const fetchSingleFix = useCallback(async (): Promise<LocationReading | null> => {
    setGpsError(null);

    // 1. Try native expo-location if available
    try {
      const Location = await import('expo-location');
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setGpsStatus('PERMISSION_DENIED');
        setGpsError('GPS permission was denied by user. Please enable location permissions.');
        return null;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const fix: LocationReading = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracyMeters: pos.coords.accuracy ?? undefined,
        timestamp: pos.timestamp || Date.now(),
      };
      setCurrentLocation(fix);
      setGpsStatus('LIVE');
      return fix;
    } catch (_nativeErr: any) {
      // Fall through to browser/web geolocation
    }

    // 2. Web Geolocation API fallback
    const geo = typeof navigator !== 'undefined' ? navigator.geolocation : undefined;
    if (!geo) {
      setGpsStatus('UNAVAILABLE');
      setGpsError('GPS hardware is not supported or accessible on this device.');
      return null;
    }

    return new Promise<LocationReading | null>((resolve) => {
      geo.getCurrentPosition(
        (pos) => {
          const fix: LocationReading = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracyMeters: pos.coords.accuracy,
            timestamp: pos.timestamp || Date.now(),
          };
          setCurrentLocation(fix);
          setGpsStatus('LIVE');
          resolve(fix);
        },
        (err) => {
          if (err.code === 1) {
            setGpsStatus('PERMISSION_DENIED');
            setGpsError('GPS permission denied. Please allow location access in settings.');
          } else if (err.code === 3) {
            setGpsStatus('STALE');
            setGpsError('GPS position request timed out. Satellite signal may be weak under canopy.');
          } else {
            setGpsStatus('UNAVAILABLE');
            setGpsError(err.message || 'GPS location unavailable.');
          }
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
      );
    });
  }, []);

  const refreshGps = useCallback(async () => {
    setGpsStatus('ACQUIRING');
    await fetchSingleFix();
  }, [fetchSingleFix]);

  // Periodic polling & staleness watchdog when patrol is ACTIVE
  useEffect(() => {
    if (patrol?.status !== 'ACTIVE') {
      setGpsStatus('OFF');
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (watchSubRef.current?.remove) watchSubRef.current.remove();
      return;
    }

    // Immediately acquire fix on activation
    setGpsStatus('ACQUIRING');
    fetchSingleFix();

    // Check location every 15 seconds
    intervalRef.current = setInterval(() => {
      fetchSingleFix();

      // Staleness check: if current fix is older than 45 seconds, mark STALE
      setCurrentLocation((prev) => {
        if (prev && Date.now() - prev.timestamp > 45000) {
          setGpsStatus('STALE');
        }
        return prev;
      });
    }, 15000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (watchSubRef.current?.remove) watchSubRef.current.remove();
    };
  }, [patrol?.status, fetchSingleFix]);

  // Record a GPS waypoint for the active patrol
  const recordCurrentWaypoint = useCallback(
    async (notes?: string): Promise<Waypoint | null> => {
      if (!patrol || patrol.status !== 'ACTIVE') {
        throw new Error('Waypoints can only be recorded for an ACTIVE patrol.');
      }

      setIsRecording(true);
      try {
        let fix = currentLocation;
        // If current fix is stale or absent, refresh
        if (!fix || Date.now() - fix.timestamp > 30000) {
          fix = await fetchSingleFix();
        }

        if (!fix) {
          throw new Error('Unable to record waypoint: Valid GPS fix required.');
        }

        const wp = await patrolMobileService.recordWaypoint(patrol.id, {
          latitude: fix.latitude,
          longitude: fix.longitude,
          locationType: LocationType.GPS,
          recordedAt: new Date(fix.timestamp).toISOString(),
          notes,
        });

        if (onWaypointRecorded) {
          onWaypointRecorded(wp);
        }
        return wp;
      } finally {
        setIsRecording(false);
      }
    },
    [patrol, currentLocation, fetchSingleFix, onWaypointRecorded]
  );

  const calculateDistanceToCheckpoint = useCallback(
    (checkpoint: Waypoint): number | null => {
      if (!currentLocation) return null;
      const km = calculateHaversineDistanceKm(
        currentLocation.latitude,
        currentLocation.longitude,
        checkpoint.latitude,
        checkpoint.longitude
      );
      return Math.round(km * 1000); // meters
    },
    [currentLocation]
  );

  return {
    currentLocation,
    gpsStatus,
    gpsError,
    isRecording,
    visitedCheckpointIds: computeVisitedCheckpointIds(),
    refreshGps,
    recordCurrentWaypoint,
    calculateDistanceToCheckpoint,
  };
}
