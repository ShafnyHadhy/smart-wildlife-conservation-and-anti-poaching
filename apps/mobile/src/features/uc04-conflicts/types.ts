import { ConflictReport, ConflictType, ConflictStatus, CreateConflictReportDTO } from '@wildlife/shared';

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

export type { ConflictReport, ConflictType, ConflictStatus, CreateConflictReportDTO };
