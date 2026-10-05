import { Incident, IncidentType, IncidentStatus, CreateIncidentDTO } from '@wildlife/shared';

export interface IncidentDraft {
  localId?: string;
  incidentType: IncidentType;
  description: string;
  latitude: number;
  longitude: number;
  photoUri?: string;
  patrolId?: string;
  reportedAt: string;
}

export type { Incident, IncidentType, IncidentStatus, CreateIncidentDTO };
