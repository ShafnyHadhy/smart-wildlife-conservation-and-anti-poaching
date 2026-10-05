import { Patrol, PatrolRoute, Waypoint, PatrolStatus } from '@wildlife/shared';

export interface PatrolTrackingState {
  activePatrol: Patrol | null;
  currentRoute: PatrolRoute | null;
  waypointsRecorded: Waypoint[];
  isTracking: boolean;
  lastKnownLocation: {
    latitude: number;
    longitude: number;
    timestamp: string;
  } | null;
}

export type { Patrol, PatrolRoute, Waypoint, PatrolStatus };
