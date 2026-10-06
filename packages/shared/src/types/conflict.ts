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
  // Intelligent Duplicate Detection & Triage Workflow
  potentialDuplicateOf?: string;
  distanceToDuplicateKm?: number;
  triageNotes?: string;
  mitigationAction?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
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
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface UpdateConflictStatusDTO {
  status: ConflictStatus;
  triageNotes?: string;
  mitigationAction?: string;
}

export interface ConflictStats {
  total: number;
  submitted: number;
  underReview: number;
  responding: number;
  resolved: number;
  closed: number;
  cropDamageCount: number;
  elephantHumanCount: number;
  propertyDamageCount: number;
  livestockAttackCount: number;
}

