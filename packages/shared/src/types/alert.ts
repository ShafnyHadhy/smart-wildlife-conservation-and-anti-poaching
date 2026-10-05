import { RiskLevel, AlertStatus, ResponseStatus } from '../enums';
import { Coordinates } from './common';

export interface PolygonPoint {
  latitude: number;
  longitude: number;
}

export interface RiskZone {
  id: string;
  parkId: string;
  name: string;
  zoneType: string;
  riskLevel: RiskLevel;
  boundaryCoordinates: PolygonPoint[];
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WildlifeRiskAlert {
  id: string;
  animalId: string;
  riskZoneId: string;
  locationRecordId?: string;
  severity: RiskLevel;
  status: AlertStatus;
  generatedAt: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Enriched presentation fields
  animalName?: string;
  animalSpecies?: string;
  zoneName?: string;
  location?: Coordinates;
  responses?: AlertResponse[];
}

export interface AlertResponse {
  id: string;
  alertId: string;
  responderId: string;
  actionTaken: string;
  status: ResponseStatus;
  respondedAt: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Enriched presentation fields
  responderName?: string;
}

export interface CreateAlertResponseDTO {
  alertId: string;
  responderId: string;
  actionTaken: string;
  status?: ResponseStatus;
  respondedAt?: string;
  notes?: string;
}
