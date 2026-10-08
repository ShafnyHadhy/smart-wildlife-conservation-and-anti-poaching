import { apiClient } from '../../../services/apiClient';
import {
  ConflictReport,
  ConflictFilterOptions,
  ConflictStats,
  CreateConflictReportDTO,
  UpdateConflictStatusDTO,
} from '../types';

export const webConflictService = {
  async fetchConflicts(filters?: ConflictFilterOptions): Promise<ConflictReport[]> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'ALL') {
      params.append('status', filters.status);
    }
    if (filters?.conflictType && filters.conflictType !== 'ALL') {
      params.append('conflictType', filters.conflictType);
    }
    if (filters?.parkId) {
      params.append('parkId', filters.parkId);
    }
    if (filters?.search) {
      params.append('search', filters.search);
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<ConflictReport[]>(`/conflict-reports${query}`);
  },

  async fetchConflictStats(parkId?: string): Promise<ConflictStats> {
    const query = parkId ? `?parkId=${parkId}` : '';
    try {
      return await apiClient.get<ConflictStats>(`/conflict-reports/stats${query}`);
    } catch {
      return {
        total: 0,
        submitted: 0,
        underReview: 0,
        responding: 0,
        resolved: 0,
        closed: 0,
        cropDamageCount: 0,
        elephantHumanCount: 0,
        propertyDamageCount: 0,
        livestockAttackCount: 0,
      };
    }
  },

  async fetchConflictById(id: string): Promise<ConflictReport> {
    return apiClient.get<ConflictReport>(`/conflict-reports/${id}`);
  },

  async createConflict(dto: CreateConflictReportDTO): Promise<ConflictReport> {
    return apiClient.post<ConflictReport>('/conflict-reports', dto);
  },

  async updateConflictStatus(
    id: string,
    dto: UpdateConflictStatusDTO
  ): Promise<ConflictReport> {
    return apiClient.patch<ConflictReport>(`/conflict-reports/${id}/status`, dto);
  },

  async fetchCommunityMembers(filter?: { phone?: string; village?: string; search?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filter?.phone) params.append('phone', filter.phone);
    if (filter?.village) params.append('village', filter.village);
    if (filter?.search) params.append('search', filter.search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<any[]>(`/community-members${query}`);
  },

  async registerCommunityMember(dto: any): Promise<any> {
    return apiClient.post<any>('/community-members', dto);
  },
};
