import { mobileApiClient } from '../../../services/apiClient';
import { offlineQueue, QueuedMutation } from '../../../services/offlineQueue';
import { persistentStorage } from '../../../storage/persistentStorage';
import {
  WildlifeRiskAlert,
  AlertResponse,
  CreateAlertResponseDTO,
  AlertStatus,
  ResponseStatus,
} from '../types';

const STORAGE_KEY_ALERTS_CACHE = 'wildlife_mobile_alerts_cache';

export const mobileAlertService = {
  /**
   * Fetches alerts from the backend with safe persistent offline fallback.
   */
  async getAlerts(
    statusFilter?: AlertStatus | 'ALL',
    isOnline = true
  ): Promise<WildlifeRiskAlert[]> {
    if (!isOnline) {
      return this.getCachedAlerts(statusFilter);
    }

    const query =
      statusFilter && statusFilter !== 'ALL'
        ? `?status=${encodeURIComponent(statusFilter)}`
        : '';

    try {
      const alerts = await mobileApiClient.get<WildlifeRiskAlert[]>(`/alerts${query}`);
      if (Array.isArray(alerts)) {
        try {
          // If fetching all alerts, update the master cache
          if (!statusFilter || statusFilter === 'ALL') {
            await persistentStorage.setItem(STORAGE_KEY_ALERTS_CACHE, JSON.stringify(alerts));
          }
        } catch (_err) {
          // Ignore cache write errors
        }
        return alerts;
      }
    } catch (err) {
      console.warn('[MobileAlertService] Remote fetch failed, attempting cached fallback:', err);
      const cached = await this.getCachedAlerts(statusFilter);
      if (cached && cached.length > 0) {
        return cached;
      }
      throw err;
    }

    return this.getCachedAlerts(statusFilter);
  },

  /**
   * Fetches single alert details by ID with cached fallback.
   */
  async getAlertById(id: string): Promise<WildlifeRiskAlert> {
    try {
      const alert = await mobileApiClient.get<WildlifeRiskAlert>(`/alerts/${id}`);
      if (alert && alert.id) {
        // Update item in cache
        try {
          const cached = await this.getCachedAlerts();
          const updated = [alert, ...cached.filter((a) => a.id !== alert.id)];
          await persistentStorage.setItem(STORAGE_KEY_ALERTS_CACHE, JSON.stringify(updated));
        } catch (_err) {
          // Ignore
        }
        return alert;
      }
    } catch (err) {
      console.warn(`[MobileAlertService] Failed to fetch alert ${id} from server:`, err);
    }

    // Search local cache
    const cached = await this.getCachedAlerts();
    const match = cached.find((a) => a.id === id);
    if (match) {
      return match;
    }

    throw new Error(`Alert with identifier '${id}' was not found in local cache.`);
  },

  /**
   * Submits a field response action.
   * If online, dispatches directly to POST /api/alerts/:id/respond.
   * If offline, enqueues to offline queue for background sync replay.
   */
  async respondToAlert(
    alertId: string,
    data: CreateAlertResponseDTO,
    isOnline = true
  ): Promise<{ direct: boolean; result: any }> {
    const res = await mobileApiClient.respondToAlert(alertId, data, isOnline);

    // If online direct success, update cached alert state
    if (res.direct && res.result) {
      try {
        const cached = await this.getCachedAlerts();
        const updated = cached.map((a) => {
          if (a.id === alertId) {
            let nextStatus = a.status;
            if (data.status === ResponseStatus.INITIATED) nextStatus = AlertStatus.ACKNOWLEDGED;
            else if (data.status === ResponseStatus.IN_PROGRESS) nextStatus = AlertStatus.RESPONDING;
            else if (data.status === ResponseStatus.COMPLETED) nextStatus = AlertStatus.RESOLVED;

            const newResponse: AlertResponse = {
              id: (res.result as AlertResponse).id || `resp-${Date.now()}`,
              alertId,
              responderId: data.responderId,
              actionTaken: data.actionTaken,
              status: data.status || ResponseStatus.INITIATED,
              respondedAt: new Date().toISOString(),
              notes: data.notes,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            return {
              ...a,
              status: nextStatus,
              responses: [newResponse, ...(a.responses || [])],
            };
          }
          return a;
        });
        await persistentStorage.setItem(STORAGE_KEY_ALERTS_CACHE, JSON.stringify(updated));
      } catch (_err) {
        // Ignore cache write errors
      }
    }

    return res;
  },

  /**
   * Retrieves pending mutations in the offline queue for a specific alert or all alerts.
   */
  async getPendingAlertActions(alertId?: string): Promise<QueuedMutation[]> {
    try {
      const pending = await offlineQueue.getPending();
      const alertActions = pending.filter((m) => m.entityType === 'ALERT_RESPONSE');
      if (alertId) {
        return alertActions.filter((m) => m.payload?.alertId === alertId);
      }
      return alertActions;
    } catch (_err) {
      return [];
    }
  },

  /**
   * Reads cached alerts from persistent local storage.
   */
  async getCachedAlerts(statusFilter?: AlertStatus | 'ALL'): Promise<WildlifeRiskAlert[]> {
    try {
      const raw = await persistentStorage.getItem(STORAGE_KEY_ALERTS_CACHE);
      if (raw) {
        const list: WildlifeRiskAlert[] = JSON.parse(raw);
        if (statusFilter && statusFilter !== 'ALL') {
          return list.filter((a) => a.status === statusFilter);
        }
        return list;
      }
    } catch (err) {
      console.warn('[MobileAlertService] Error reading cached alerts:', err);
    }
    return [];
  },
};
