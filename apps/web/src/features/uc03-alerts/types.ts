import { WildlifeRiskAlert, RiskZone, AlertResponse, RiskLevel, AlertStatus } from '@wildlife/shared';

export interface AlertFilterOptions {
  status?: AlertStatus;
  riskLevel?: RiskLevel;
  animalId?: string;
  zoneId?: string;
}

export type { WildlifeRiskAlert, RiskZone, AlertResponse, RiskLevel, AlertStatus };
