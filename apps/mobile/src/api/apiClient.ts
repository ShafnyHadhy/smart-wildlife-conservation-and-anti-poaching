import { offlineQueue } from '../offline/offlineQueue';
import {
  ApiErrorResponse,
  CreateIncidentDTO,
  CreateConflictReportDTO,
  CreateAlertResponseDTO,
  Patrol,
  PatrolRoute,
  Waypoint,
} from '@wildlife/shared';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export class MobileApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: any[];

  constructor(message: string, code = 'NETWORK_ERROR', status = 0, details?: any[]) {
    super(message);
    this.name = 'MobileApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class MobileApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  getAuthToken(): string | null {
    return this.authToken;
  }

  private buildHeaders(customHeaders?: HeadersInit): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((customHeaders as Record<string, string>) || {}),
    };
    if (this.authToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  private getFullUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${cleanEndpoint}`;
  }

  async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = this.getFullUrl(endpoint);
    try {
      const res = await fetch(url, {
        ...options,
        method: 'GET',
        headers: this.buildHeaders(options.headers),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        if (json && json.success === false && json.error) {
          const err = json as ApiErrorResponse;
          throw new MobileApiError(err.error.message, err.error.code, res.status, err.error.details);
        }
        throw new MobileApiError(
          json?.message || `HTTP ${res.status}: ${res.statusText}`,
          'HTTP_ERROR',
          res.status
        );
      }

      if (json && typeof json === 'object' && json.success === true && 'data' in json) {
        return json.data as T;
      }

      return json as T;
    } catch (err: any) {
      if (err instanceof MobileApiError) throw err;
      throw new MobileApiError(
        `Network request failed to ${endpoint}: ${err.message || 'Check connection'}`,
        'NETWORK_ERROR',
        0
      );
    }
  }

  async post<T>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    const url = this.getFullUrl(endpoint);
    try {
      const res = await fetch(url, {
        ...options,
        method: 'POST',
        headers: this.buildHeaders(options.headers),
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        if (json && json.success === false && json.error) {
          const err = json as ApiErrorResponse;
          throw new MobileApiError(err.error.message, err.error.code, res.status, err.error.details);
        }
        throw new MobileApiError(
          json?.message || `HTTP ${res.status}: ${res.statusText}`,
          'HTTP_ERROR',
          res.status
        );
      }

      if (json && typeof json === 'object' && json.success === true && 'data' in json) {
        return json.data as T;
      }

      return json as T;
    } catch (err: any) {
      if (err instanceof MobileApiError) throw err;
      throw new MobileApiError(
        `Network request failed to ${endpoint}: ${err.message || 'Check connection'}`,
        'NETWORK_ERROR',
        0
      );
    }
  }

  async patch<T>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    const url = this.getFullUrl(endpoint);
    try {
      const res = await fetch(url, {
        ...options,
        method: 'PATCH',
        headers: this.buildHeaders(options.headers),
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        if (json && json.success === false && json.error) {
          const err = json as ApiErrorResponse;
          throw new MobileApiError(err.error.message, err.error.code, res.status, err.error.details);
        }
        throw new MobileApiError(
          json?.message || `HTTP ${res.status}: ${res.statusText}`,
          'HTTP_ERROR',
          res.status
        );
      }

      if (json && typeof json === 'object' && json.success === true && 'data' in json) {
        return json.data as T;
      }

      return json as T;
    } catch (err: any) {
      if (err instanceof MobileApiError) throw err;
      throw new MobileApiError(
        `Network request failed to ${endpoint}: ${err.message || 'Check connection'}`,
        'NETWORK_ERROR',
        0
      );
    }
  }

  // Submit directly if online, otherwise enqueue locally for background sync
  async reportIncident(
    data: CreateIncidentDTO,
    isOnline = true
  ): Promise<{ direct: boolean; result: any }> {
    const clientMutationId = data.clientMutationId || `inc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const payload = { ...data, clientMutationId };

    if (!isOnline) {
      const queued = await offlineQueue.enqueue({
        clientMutationId,
        entityType: 'INCIDENT',
        payload,
      });
      return { direct: false, result: queued };
    }

    try {
      const directResult = await this.post('/incidents', payload);
      return { direct: true, result: directResult };
    } catch (err) {
      console.warn('[MobileAPI] Direct submission failed. Enqueueing offline:', err);
      const queued = await offlineQueue.enqueue({
        clientMutationId,
        entityType: 'INCIDENT',
        payload,
      });
      return { direct: false, result: queued };
    }
  }

  async reportConflict(
    data: CreateConflictReportDTO,
    isOnline = true
  ): Promise<{ direct: boolean; result: any }> {
    const clientMutationId = data.clientMutationId || `hwc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const payload = { ...data, clientMutationId };

    if (!isOnline) {
      const queued = await offlineQueue.enqueue({
        clientMutationId,
        entityType: 'CONFLICT_REPORT',
        payload,
      });
      return { direct: false, result: queued };
    }

    try {
      const directResult = await this.post('/conflict-reports', payload);
      return { direct: true, result: directResult };
    } catch (err) {
      console.warn('[MobileAPI] Direct submission failed. Enqueueing offline:', err);
      const queued = await offlineQueue.enqueue({
        clientMutationId,
        entityType: 'CONFLICT_REPORT',
        payload,
      });
      return { direct: false, result: queued };
    }
  }

  async respondToAlert(
    alertId: string,
    data: CreateAlertResponseDTO,
    isOnline = true
  ): Promise<{ direct: boolean; result: any }> {

    const clientMutationId = `alt-resp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const payload = { ...data, alertId, clientMutationId };

    if (!isOnline) {
      const queued = await offlineQueue.enqueue({
        clientMutationId,
        entityType: 'ALERT_RESPONSE',
        payload,
      });
      return { direct: false, result: queued };
    }

    try {
      const directResult = await this.post(`/alerts/${alertId}/respond`, data);
      return { direct: true, result: directResult };
    } catch (err) {
      console.warn('[MobileAPI] Direct submission failed. Enqueueing offline:', err);
      const queued = await offlineQueue.enqueue({
        clientMutationId,
        entityType: 'ALERT_RESPONSE',
        payload,
      });
      return { direct: false, result: queued };
    }
  }

  // UC01: Ranger Patrol API Endpoints
  async getPatrols(rangerId?: string): Promise<Patrol[]> {
    const query = rangerId ? `?rangerId=${encodeURIComponent(rangerId)}` : '';
    return this.get<Patrol[]>(`/patrols${query}`);
  }

  async getPatrolById(id: string): Promise<Patrol> {
    return this.get<Patrol>(`/patrols/${encodeURIComponent(id)}`);
  }

  async getPatrolRouteById(routeId: string): Promise<PatrolRoute> {
    return this.get<PatrolRoute>(`/patrol-routes/${encodeURIComponent(routeId)}`);
  }

  async startPatrol(id: string): Promise<Patrol> {
    return this.patch<Patrol>(`/patrols/${encodeURIComponent(id)}/start`);
  }

  async completePatrol(id: string): Promise<Patrol> {
    return this.patch<Patrol>(`/patrols/${encodeURIComponent(id)}/complete`);
  }

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
    return this.post<Waypoint>(`/patrols/${encodeURIComponent(patrolId)}/waypoints`, data);
  }
}

export const mobileApiClient = new MobileApiClient();
