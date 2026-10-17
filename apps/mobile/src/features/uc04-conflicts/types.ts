import {
  ConflictReport,
  ConflictType,
  ConflictStatus,
  ConflictStatusEntry,
  CreateConflictReportDTO,
} from '@wildlife/shared';

//I — Interface Segregation Principle (ISP): 
//Clients should not be forced to depend upon interfaces or methods that they do not use.
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
