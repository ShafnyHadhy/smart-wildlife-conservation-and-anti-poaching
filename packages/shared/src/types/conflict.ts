import { ConflictType, ConflictStatus } from '../enums';
import { Coordinates } from './common';

/** One entry per status change; drives the community timeline and notifications. */
export interface ConflictStatusEntry {
  status: ConflictStatus;
  at: string;
  byName?: string;
  byRole?: 'COMMUNITY_MEMBER' | 'RANGER' | 'SYSTEM';
  note?: string;
  action?: string;
}

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
  // UC-04 Damage Assessment & Compensation
  estimatedDamageLkr?: number;
  cropTypeLost?: string;
  compensationStatus?: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'DISBURSED';
  estimatedAnimalsInvolved?: number;
  // Community submission details
  locationName?: string;
  immediateRisk?: boolean;
  photoUrls?: string[];
  statusHistory?: ConflictStatusEntry[];
  handledByName?: string;
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
  estimatedDamageLkr?: number;
  cropTypeLost?: string;
  estimatedAnimalsInvolved?: number;
  locationName?: string;
  immediateRisk?: boolean;
  photoUrls?: string[];
}

export interface UpdateConflictStatusDTO {
  status: ConflictStatus;
  updatedByName?: string;
  triageNotes?: string;
  mitigationAction?: string;
  estimatedDamageLkr?: number;
  cropTypeLost?: string;
  compensationStatus?: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'DISBURSED';
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

