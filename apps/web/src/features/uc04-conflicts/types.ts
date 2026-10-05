import { ConflictReport, ConflictType, ConflictStatus } from '@wildlife/shared';

export interface ConflictFilterOptions {
  status?: ConflictStatus;
  conflictType?: ConflictType;
  parkId?: string;
}

export type { ConflictReport, ConflictType, ConflictStatus };
