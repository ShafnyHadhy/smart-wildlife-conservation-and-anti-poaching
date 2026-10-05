import { ConflictType, ConflictStatus } from '../enums';
import { Coordinates } from './common';

export interface ConflictReport {
  id: string;
  communityMemberId: string;
  parkId?: string;
  conflictType: ConflictType;
  description: string;
  latitude: number;
  longitude: number;
  status: ConflictStatus;
  reportedAt: string;
  clientMutationId?: string;
  createdAt: string;
  updatedAt: string;
  // Enriched presentation fields
  reporterName?: string;
  reporterPhone?: string;
  villageName?: string;
  parkName?: string;
}

export interface CreateConflictReportDTO {
  communityMemberId: string;
  parkId?: string;
  conflictType: ConflictType;
  description: string;
  latitude: number;
  longitude: number;
  location?: Coordinates;
  reportedAt?: string;
  clientMutationId?: string;
}

