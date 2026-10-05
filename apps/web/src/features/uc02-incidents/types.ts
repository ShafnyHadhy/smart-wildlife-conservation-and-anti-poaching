import { Incident, IncidentType, IncidentStatus } from '@wildlife/shared';

export interface IncidentFilterOptions {
  status?: IncidentStatus;
  incidentType?: IncidentType;
  rangerId?: string;
}

export type { Incident, IncidentType, IncidentStatus };
