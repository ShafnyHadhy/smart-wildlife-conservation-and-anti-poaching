import { WildlifeRiskAlert, AlertResponse, RiskLevel, AlertStatus, ResponseStatus, CreateAlertResponseDTO } from '@wildlife/shared';

export interface AlertFilterOptions {
  status?: AlertStatus;
  riskLevel?: RiskLevel;
  animalId?: string;
}

export type { WildlifeRiskAlert, AlertResponse, RiskLevel, AlertStatus, ResponseStatus, CreateAlertResponseDTO };
