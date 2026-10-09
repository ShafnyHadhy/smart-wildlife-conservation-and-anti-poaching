import {
  ConflictReport,
  ConflictType,
  ConflictStatus,
  ConflictStatusEntry,
  CreateConflictReportDTO,
} from '@wildlife/shared';

export interface ConflictDraft {
  localId?: string;
  communityMemberId: string;
  parkId?: string;
  conflictType: ConflictType;
  description: string;
  latitude: number;
  longitude: number;
  reportedAt: string;
}

export { ConflictType, ConflictStatus };
export type { ConflictReport, ConflictStatusEntry, CreateConflictReportDTO };
