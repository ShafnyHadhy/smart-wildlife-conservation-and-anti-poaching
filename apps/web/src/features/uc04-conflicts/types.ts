import {
  ConflictReport,
  ConflictType,
  ConflictStatus,
  ConflictStats,
  CreateConflictReportDTO,
  UpdateConflictStatusDTO,
} from '@wildlife/shared';

export interface ConflictFilterOptions {
  status?: ConflictStatus | 'ALL';
  conflictType?: ConflictType | 'ALL';
  parkId?: string;
  search?: string;
}

export { ConflictType, ConflictStatus };

export type {
  ConflictReport,
  ConflictStats,
  CreateConflictReportDTO,
  UpdateConflictStatusDTO,
};
