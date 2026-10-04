import { Coordinates } from './common';
import { PatrolStatus, LocationType } from '../enums';

export interface PatrolRoute {
  id: string;
  parkId: string;
  name: string;
  code: string;
  description?: string;
  estimatedDurationMinutes: number;
  routeType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Waypoint {
  id: string;
  patrolId?: string;
  patrolRouteId?: string;
  latitude: number;
  longitude: number;
  sequenceOrder: number;
  locationType: LocationType;
  recordedAt: string;
  notes?: string;
}

export interface Patrol {
  id: string;
  patrolCode: string;
  parkId: string;
  rangerId: string;
  patrolRouteId: string;
  status: PatrolStatus;
  startTime: string;
  endTime?: string;
  coverageScore: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Optional enriched fields from queries
  waypoints?: Waypoint[];
  rangerName?: string;
  routeName?: string;
  parkName?: string;
}

export interface CreatePatrolDTO {
  parkId: string;
  rangerId: string;
  patrolRouteId: string;
  patrolCode: string;
  startTime: string;
  notes?: string;
}

export interface AddWaypointDTO {
  patrolId?: string;
  patrolRouteId?: string;
  location: Coordinates;
  sequenceOrder: number;
  locationType?: LocationType;
  recordedAt?: string;
  notes?: string;
}
