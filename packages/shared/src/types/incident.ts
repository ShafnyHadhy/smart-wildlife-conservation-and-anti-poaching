import { IncidentType, IncidentStatus, EvidenceType } from '../enums';
import { Coordinates } from './common';

export interface SupportingEvidence {
  id: string;
  incidentId: string;
  evidenceType: EvidenceType;
  filePath: string;
  fileName?: string;
  fileType?: string;
  capturedAt: string;
  notes?: string;
  createdAt: string;
}

export interface Incident {
  id: string;
  rangerId: string;
  patrolId?: string;
  incidentType: IncidentType;
  description: string;
  latitude: number;
  longitude: number;
  status: IncidentStatus;
  reportedAt: string;
  clientMutationId?: string;
  createdAt: string;
  updatedAt: string;
  // Enriched presentation fields
  evidence?: SupportingEvidence[];
  rangerName?: string;
  patrolCode?: string;
}

export interface CreateIncidentDTO {
  rangerId: string;
  patrolId?: string;
  incidentType: IncidentType;
  description: string;
  location: Coordinates;
  reportedAt?: string;
  clientMutationId?: string;
  evidence?: {
    filePath: string;
    fileName?: string;
    fileType?: string;
    evidenceType?: EvidenceType;
    capturedAt?: string;
    notes?: string;
  }[];
}
