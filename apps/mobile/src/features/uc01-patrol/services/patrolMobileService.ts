import { MobileApiError, mobileApiClient } from '../../../services/apiClient';
import { persistentStorage } from '../../../storage/persistentStorage';
import { Patrol, PatrolRoute, Waypoint } from '../types';

const STORAGE_KEY_PATROLS_CACHE = 'wildlife_mobile_patrols_cache';
const STORAGE_KEY_PATROL_DETAIL_PREFIX = 'wildlife_mobile_patrol_detail_';
const STORAGE_KEY_ROUTE_PREFIX = 'wildlife_mobile_route_';

export class PatrolMobileService {
  private async cacheUpdatedPatrol(patrol: Patrol): Promise<void> {
    try {
      await persistentStorage.setItem(
        `${STORAGE_KEY_PATROL_DETAIL_PREFIX}${patrol.id}`,
        JSON.stringify(patrol)
      );
      const cached = await persistentStorage.getItem(STORAGE_KEY_PATROLS_CACHE);
      if (!cached) return;
      const patrols = JSON.parse(cached) as Patrol[];
      const index = patrols.findIndex((item) => item.id === patrol.id);
      if (index >= 0) {
        patrols[index] = patrol;
        await persistentStorage.setItem(STORAGE_KEY_PATROLS_CACHE, JSON.stringify(patrols));
      }
    } catch (error) {
      console.warn(`[PatrolMobileService] Could not refresh local cache for patrol ${patrol.id}:`, error);
    }
  }

  /**
   * Fetches assigned patrols for the authenticated ranger, falling back to offline cache.
   */
  async getPatrols(rangerId?: string): Promise<Patrol[]> {
    try {
      const patrols = await mobileApiClient.getPatrols(rangerId);
      if (Array.isArray(patrols)) {
        const filtered = rangerId
          ? patrols.filter((p) => p.rangerId === rangerId)
          : patrols;
        try {
          await persistentStorage.setItem(STORAGE_KEY_PATROLS_CACHE, JSON.stringify(filtered));
        } catch (_err) {
          // ignore cache write error
        }
        return filtered;
      }
    } catch (err) {
      console.warn('[PatrolMobileService] Remote fetch failed, attempting cached patrols:', err);
    }

    // Offline cache fallback strictly scoped to rangerId
    try {
      const cached = await persistentStorage.getItem(STORAGE_KEY_PATROLS_CACHE);
      if (cached) {
        const parsed = JSON.parse(cached) as Patrol[];
        if (rangerId) {
          return parsed.filter((p) => p.rangerId === rangerId);
        }
        return parsed;
      }
    } catch (_cacheErr) {
      // ignore
    }

    return [];
  }

  /**
   * Fetches complete patrol details including recorded waypoints, with cache fallback.
   */
  async getPatrolById(id: string): Promise<Patrol> {
    try {
      const patrol = await mobileApiClient.getPatrolById(id);
      if (patrol) {
        try {
          await persistentStorage.setItem(
            `${STORAGE_KEY_PATROL_DETAIL_PREFIX}${id}`,
            JSON.stringify(patrol)
          );
        } catch (_err) {
          // ignore cache write error
        }
        return patrol;
      }
    } catch (err) {
      console.warn(`[PatrolMobileService] Remote fetch for patrol ${id} failed, attempting cache:`, err);
    }

    try {
      const cached = await persistentStorage.getItem(`${STORAGE_KEY_PATROL_DETAIL_PREFIX}${id}`);
      if (cached) {
        return JSON.parse(cached) as Patrol;
      }
    } catch (_cacheErr) {
      // ignore
    }

    throw new Error(`Patrol ${id} could not be retrieved from network or offline cache.`);
  }

  /**
   * Fetches patrol route and its planned checkpoints.
   */
  async getPatrolRouteById(routeId: string): Promise<PatrolRoute> {
    try {
      const route = await mobileApiClient.getPatrolRouteById(routeId);
      if (route) {
        try {
          await persistentStorage.setItem(
            `${STORAGE_KEY_ROUTE_PREFIX}${routeId}`,
            JSON.stringify(route)
          );
        } catch (_err) {
          // ignore
        }
        return route;
      }
    } catch (err) {
      console.warn(`[PatrolMobileService] Fetch route ${routeId} failed, attempting cache:`, err);
    }

    try {
      const cached = await persistentStorage.getItem(`${STORAGE_KEY_ROUTE_PREFIX}${routeId}`);
      if (cached) {
        return JSON.parse(cached) as PatrolRoute;
      }
    } catch (_cacheErr) {
      // ignore
    }

    throw new Error(`Route ${routeId} could not be retrieved.`);
  }

  /**
   * Starts a PLANNED patrol, transitioning status to ACTIVE.
   */
  async startPatrol(id: string): Promise<Patrol> {
    if (!mobileApiClient.getAuthToken()) {
      throw new Error('Your Ranger session is not authenticated. Sign in online again before starting this patrol.');
    }

    let updated: Patrol;
    try {
      updated = await mobileApiClient.startPatrol(id);
    } catch (error) {
      if (error instanceof MobileApiError && error.status === 401) {
        mobileApiClient.setAuthToken(null);
        throw new Error('Your Ranger session has expired. Sign in online again before starting this patrol.');
      }
      throw error;
    }
    if (updated.id !== id || updated.status !== 'ACTIVE') {
      throw new Error('The server did not confirm patrol startup. Refresh the patrol and try again.');
    }
    await this.cacheUpdatedPatrol(updated);
    return updated;
  }

  /**
   * Completes an ACTIVE patrol, transitioning status to COMPLETED.
   */
  async completePatrol(id: string): Promise<Patrol> {
    if (!mobileApiClient.getAuthToken()) {
      throw new Error('Your Ranger session is not authenticated. Sign in online again before completing this patrol.');
    }

    let updated: Patrol;
    try {
      updated = await mobileApiClient.completePatrol(id);
    } catch (error) {
      if (error instanceof MobileApiError && error.status === 401) {
        mobileApiClient.setAuthToken(null);
        throw new Error('Your Ranger session has expired. Sign in online again before completing this patrol.');
      }
      throw error;
    }
    if (updated.id !== id || updated.status !== 'COMPLETED') {
      throw new Error('The server did not confirm patrol completion. Refresh the patrol and try again.');
    }
    await this.cacheUpdatedPatrol(updated);
    return updated;
  }

  /**
   * Records a GPS waypoint / breadcrumb coordinate for an ACTIVE patrol.
   */
  async recordWaypoint(
    patrolId: string,
    data: {
      latitude: number;
      longitude: number;
      sequenceOrder?: number;
      locationType?: string;
      recordedAt?: string;
      notes?: string;
    }
  ): Promise<Waypoint> {
    const waypoint = await mobileApiClient.recordWaypoint(patrolId, data);
    try {
      const cached = await persistentStorage.getItem(
        `${STORAGE_KEY_PATROL_DETAIL_PREFIX}${patrolId}`
      );
      if (cached) {
        const patrol = JSON.parse(cached) as Patrol;
        await this.cacheUpdatedPatrol({
          ...patrol,
          waypoints: [...(patrol.waypoints || []), waypoint],
        });
      }
    } catch (error) {
      console.warn(`[PatrolMobileService] Could not cache waypoint for patrol ${patrolId}:`, error);
    }
    return waypoint;
  }
}

export const patrolMobileService = new PatrolMobileService();
