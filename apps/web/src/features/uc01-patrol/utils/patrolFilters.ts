import { Patrol, PatrolStatus } from '@wildlife/shared';

export type PatrolStatusFilter = PatrolStatus | 'ALL';

export interface PatrolFilterState {
  status: PatrolStatusFilter;
  parkId: string | 'ALL';
  rangerId: string | 'ALL';
  routeId: string | 'ALL';
}

export const DEFAULT_PATROL_FILTERS: PatrolFilterState = {
  status: 'ALL',
  parkId: 'ALL',
  rangerId: 'ALL',
  routeId: 'ALL',
};

export interface ParkOption {
  id: string;
  name: string;
}

export interface RangerOption {
  id: string;
  name: string;
}

export interface RouteOption {
  id: string;
  name: string;
}

/**
 * Derives unique park options from a list of patrols.
 * Patrols with no parkId are excluded. Patrols with parkId but no parkName
 * fall back to a short ID representation.
 */
export function deriveParkOptions(patrols: Patrol[]): ParkOption[] {
  const seen = new Map<string, string>();
  for (const p of patrols) {
    if (!p.parkId) continue;
    if (!seen.has(p.parkId)) {
      seen.set(p.parkId, p.parkName || `Park ${p.parkId.slice(0, 6)}`);
    }
  }
  return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
}

/**
 * Derives unique ranger options from a list of patrols.
 * Patrols with no rangerId are excluded. Patrols with rangerId but no rangerName
 * fall back to a short ID representation.
 */
export function deriveRangerOptions(patrols: Patrol[]): RangerOption[] {
  const seen = new Map<string, string>();
  for (const p of patrols) {
    if (!p.rangerId) continue;
    if (!seen.has(p.rangerId)) {
      seen.set(p.rangerId, p.rangerName || `Ranger ${p.rangerId.slice(0, 6)}`);
    }
  }
  return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
}

/**
 * Derives unique route options from a list of patrols.
 * Patrols with no patrolRouteId are excluded. Patrols with routeId but no routeName
 * fall back to a short ID representation.
 */
export function deriveRouteOptions(patrols: Patrol[]): RouteOption[] {
  const seen = new Map<string, string>();
  for (const p of patrols) {
    if (!p.patrolRouteId) continue;
    if (!seen.has(p.patrolRouteId)) {
      seen.set(p.patrolRouteId, p.routeName || `Route ${p.patrolRouteId.slice(0, 6)}`);
    }
  }
  return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
}

/**
 * Applies all four filters (status, park, ranger, route) to a patrol list.
 * Each filter with value 'ALL' is treated as "no restriction".
 * All active filters are combined with AND logic.
 */
export function applyPatrolFilters(patrols: Patrol[], filters: PatrolFilterState): Patrol[] {
  return patrols.filter((p) => {
    if (filters.status !== 'ALL' && p.status !== filters.status) return false;
    if (filters.parkId !== 'ALL' && p.parkId !== filters.parkId) return false;
    if (filters.rangerId !== 'ALL' && p.rangerId !== filters.rangerId) return false;
    if (filters.routeId !== 'ALL' && p.patrolRouteId !== filters.routeId) return false;
    return true;
  });
}

/**
 * Returns true if all filters are at their default 'ALL' state.
 */
export function areFiltersDefault(filters: PatrolFilterState): boolean {
  return (
    filters.status === 'ALL' &&
    filters.parkId === 'ALL' &&
    filters.rangerId === 'ALL' &&
    filters.routeId === 'ALL'
  );
}
