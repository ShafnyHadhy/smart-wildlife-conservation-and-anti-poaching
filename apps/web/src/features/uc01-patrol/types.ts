import { Patrol, PatrolRoute, Waypoint, PatrolStatus } from '@wildlife/shared';

export interface PatrolDashboardState {
  activePatrols: Patrol[];
  selectedPatrol: Patrol | null;
  routes: PatrolRoute[];
  filterStatus?: PatrolStatus;
}

export type { Patrol, PatrolRoute, Waypoint, PatrolStatus };
