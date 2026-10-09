import {
  WildlifeRiskAlert,
  RiskZone,
  AlertResponse,
  RiskLevel,
  AlertStatus,
  ResponseStatus,
  WildlifeAnimal,
  TrackingCollar,
  LocationRecord,
  SimulatePingDTO,
  SimulatePingResponse,
} from '@wildlife/shared';

export interface AlertFilterOptions {
  status?: AlertStatus | 'ALL';
  riskLevel?: RiskLevel | 'ALL';
  animalId?: string;
  zoneId?: string;
}

export interface RespondToAlertDTO {
  responderId: string;
  actionTaken: string;
  status: ResponseStatus;
  notes?: string;
}

// Re-export runtime enums as values
export { RiskLevel, AlertStatus, ResponseStatus };

// Re-export type contracts
export type {
  WildlifeRiskAlert,
  RiskZone,
  AlertResponse,
  WildlifeAnimal,
  TrackingCollar,
  LocationRecord,
  SimulatePingDTO,
  SimulatePingResponse,
};
