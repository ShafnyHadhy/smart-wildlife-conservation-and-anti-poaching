import { mobileApiClient } from '../../../services/apiClient';
import { offlineQueue } from '../../../services/offlineQueue';
import {
  ConflictReport,
  CreateConflictReportDTO,
} from '../types';

export const mobileConflictService = {
  async submitConflict(
    dto: CreateConflictReportDTO,
    isOnline = true
  ): Promise<{ direct: boolean; result: any }> {
    return mobileApiClient.reportConflict(dto, isOnline);
  },

  async getConflictReports(): Promise<ConflictReport[]> {
    try {
      return await mobileApiClient.get<ConflictReport[]>('/conflict-reports');
    } catch {
      return [];
    }
  },

  async getPendingOfflineConflicts() {
    const allPending = await offlineQueue.getPending();
    return allPending.filter((m) => m.entityType === 'CONFLICT_REPORT');
  },
};
