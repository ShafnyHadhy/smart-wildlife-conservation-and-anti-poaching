import { apiClient } from '../../../services/apiClient';
import { Patrol, PatrolRoute, PatrolStatus } from '@wildlife/shared';

export interface PatrolFilterOptions {
  status?: PatrolStatus | 'ALL';
  rangerId?: string;
  parkId?: string;
}

export interface PatrolRouteFilterOptions {
  parkId?: string;
}

export const webPatrolService = {
  /**
   * Fetches patrols with optional filters for status, assigned ranger, or park.
   * Corresponds to GET /api/patrols
   */
  async fetchPatrols(filters?: PatrolFilterOptions): Promise<Patrol[]> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'ALL') {
      params.append('status', filters.status);
    }
    if (filters?.rangerId) {
      params.append('rangerId', filters.rangerId);
    }
    if (filters?.parkId) {
      params.append('parkId', filters.parkId);
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<Patrol[]>(`/patrols${query}`);
  },

  /**
   * Fetches single patrol by ID, enriched with its ordered waypoints breadcrumbs and route info.
   * Corresponds to GET /api/patrols/:id
   */
  async fetchPatrolById(id: string): Promise<Patrol> {
    return apiClient.get<Patrol>(`/patrols/${encodeURIComponent(id)}`);
  },

  /**
   * Fetches pre-approved patrol corridor routes, optionally filtered by park.
   * Corresponds to GET /api/patrol-routes
   */
  async fetchPatrolRoutes(filters?: PatrolRouteFilterOptions | string): Promise<PatrolRoute[]> {
    const parkId = typeof filters === 'string' ? filters : filters?.parkId;
    const query = parkId ? `?parkId=${encodeURIComponent(parkId)}` : '';
    return apiClient.get<PatrolRoute[]>(`/patrol-routes${query}`);
  },

  /**
   * Fetches a single patrol corridor route by ID.
   * Corresponds to GET /api/patrol-routes/:id
   */
  async fetchPatrolRouteById(id: string): Promise<PatrolRoute> {
    return apiClient.get<PatrolRoute>(`/patrol-routes/${encodeURIComponent(id)}`);
  },
};

export const fetchPatrols = webPatrolService.fetchPatrols;
export const fetchPatrolById = webPatrolService.fetchPatrolById;
export const fetchPatrolRoutes = webPatrolService.fetchPatrolRoutes;
export const fetchPatrolRouteById = webPatrolService.fetchPatrolRouteById;
