import { mobileApiClient } from '../../../services/apiClient';
import { offlineQueue } from '../../../services/offlineQueue';
import { persistentStorage } from '../../../storage/persistentStorage';
import {
  ConflictReport,
  ConflictStatus,
  CreateConflictReportDTO,
} from '../types';

export interface StatusUpdateInput {
  status: ConflictStatus;
  /** Message shown to the community member. */
  triageNotes?: string;
  mitigationAction?: string;
  /** Name of the ranger making the change (appears in the timeline). */
  updatedByName?: string;
}

const STORAGE_KEY_CONFLICT_CACHE = 'wildlife_conflict_reports_cache';

export const mobileConflictService = {
  async submitConflict(
    dto: CreateConflictReportDTO,
    isOnline = true
  ): Promise<{ direct: boolean; result: any }> {
    const res = await mobileApiClient.reportConflict(dto, isOnline);
    if (res.direct && res.result && (res.result as ConflictReport).id) {
      try {
        const cachedRaw = await persistentStorage.getItem(STORAGE_KEY_CONFLICT_CACHE);
        const list: ConflictReport[] = cachedRaw ? JSON.parse(cachedRaw) : [];
        const updated = [res.result as ConflictReport, ...list.filter((r) => r.id !== res.result.id)];
        await persistentStorage.setItem(STORAGE_KEY_CONFLICT_CACHE, JSON.stringify(updated));
      } catch (_err) {
        // ignore
      }
    }
    return res;
  },

  /**
   * Fetches conflict reports from backend with seamless persistent offline fallback.
   */
  async getConflictReports(communityMemberId?: string): Promise<ConflictReport[]> {
    const query = communityMemberId
      ? `?communityMemberId=${encodeURIComponent(communityMemberId)}`
      : '';

    try {
      const reports = await mobileApiClient.get<ConflictReport[]>(`/conflict-reports${query}`);
      if (Array.isArray(reports)) {
        try {
          await persistentStorage.setItem(STORAGE_KEY_CONFLICT_CACHE, JSON.stringify(reports));
        } catch (_err) {
          // ignore
        }
        return reports;
      }
    } catch (err) {
      console.warn('[ConflictService] Remote fetch failed, falling back to local storage cache:', err);
    }

    try {
      const cachedRaw = await persistentStorage.getItem(STORAGE_KEY_CONFLICT_CACHE);
      if (cachedRaw) {
        const cachedList: ConflictReport[] = JSON.parse(cachedRaw);
        if (communityMemberId) {
          return cachedList.filter((r) => r.communityMemberId === communityMemberId);
        }
        return cachedList;
      }
    } catch (_err) {
      // ignore
    }

    return [];
  },

  async getConflictReport(id: string): Promise<ConflictReport> {
    try {
      return await mobileApiClient.get<ConflictReport>(`/conflict-reports/${id}`);
    } catch (_err) {
      const cachedRaw = await persistentStorage.getItem(STORAGE_KEY_CONFLICT_CACHE);
      if (cachedRaw) {
        const cachedList: ConflictReport[] = JSON.parse(cachedRaw);
        const match = cachedList.find((r) => r.id === id);
        if (match) return match;
      }
      throw _err;
    }
  },

  async getPendingOfflineConflicts() {
    const allPending = await offlineQueue.getPending();
    return allPending.filter((m) => m.entityType === 'CONFLICT_REPORT');
  },

  async updateConflictStatus(id: string, dto: StatusUpdateInput): Promise<ConflictReport> {
    const updated = await mobileApiClient.patch<ConflictReport>(`/conflict-reports/${id}/status`, dto);
    try {
      const cachedRaw = await persistentStorage.getItem(STORAGE_KEY_CONFLICT_CACHE);
      if (cachedRaw) {
        const list: ConflictReport[] = JSON.parse(cachedRaw);
        const nextList = list.map((r) => (r.id === id ? updated : r));
        await persistentStorage.setItem(STORAGE_KEY_CONFLICT_CACHE, JSON.stringify(nextList));
      }
    } catch (_err) {
      // ignore
    }
    return updated;
  },
};
