import { offlineQueue } from '../offline/offlineQueue';
import { ApiErrorResponse, CreateIncidentDTO, CreateConflictReportDTO, CreateAlertResponseDTO } from '@wildlife/shared';

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

  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
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
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers as Record<string, string> || {}),
        },
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
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers as Record<string, string> || {}),
        },
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
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers as Record<string, string> || {}),
        },
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
    } catch (err: any) {
      if (err instanceof MobileApiError && err.status >= 400 && err.status < 500) {
        throw err;
      }
      console.warn('[MobileAPI] Direct submission failed. Enqueueing offline:', err);
      const queued = await offlineQueue.enqueue({
        clientMutationId,
        entityType: 'ALERT_RESPONSE',
        payload,
      });
      return { direct: false, result: queued };
    }
  }
}

export const mobileApiClient = new MobileApiClient();
