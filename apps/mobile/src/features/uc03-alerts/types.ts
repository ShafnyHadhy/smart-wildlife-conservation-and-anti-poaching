import {
  WildlifeRiskAlert,
  AlertResponse,
  RiskLevel,
  AlertStatus,
  ResponseStatus,
  CreateAlertResponseDTO,
} from '@wildlife/shared';

export interface AlertFilterOptions {
  status?: AlertStatus;
  riskLevel?: RiskLevel;
  animalId?: string;
}

export { RiskLevel, AlertStatus, ResponseStatus };
export type { WildlifeRiskAlert, AlertResponse, CreateAlertResponseDTO };
