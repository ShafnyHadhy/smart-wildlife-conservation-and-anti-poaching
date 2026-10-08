import { apiClient } from '../../../services/apiClient';
import {
  WildlifeRiskAlert,
  WildlifeAnimal,
  AlertResponse,
  RespondToAlertDTO,
  SimulatePingDTO,
  SimulatePingResponse,
  RiskZone,
  AlertFilterOptions,
} from '../types';

export const webAlertService = {
  async fetchAlerts(filters?: AlertFilterOptions): Promise<WildlifeRiskAlert[]> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'ALL') {
      params.append('status', filters.status);
    }
    if (filters?.animalId) {
      params.append('animalId', filters.animalId);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<WildlifeRiskAlert[]>(`/alerts${query}`);
  },

  async fetchAlertById(id: string): Promise<WildlifeRiskAlert> {
    return apiClient.get<WildlifeRiskAlert>(`/alerts/${id}`);
  },

  async respondToAlert(alertId: string, dto: RespondToAlertDTO): Promise<AlertResponse> {
    return apiClient.post<AlertResponse>(`/alerts/${alertId}/respond`, dto);
  },

  async fetchAnimals(): Promise<WildlifeAnimal[]> {
    return apiClient.get<WildlifeAnimal[]>('/animals');
  },

  async fetchRiskZones(): Promise<RiskZone[]> {
    return apiClient.get<RiskZone[]>('/risk-zones');
  },

  async simulatePing(animalId: string, dto: SimulatePingDTO): Promise<SimulatePingResponse> {
    return apiClient.post<SimulatePingResponse>(`/animals/${animalId}/simulate-ping`, dto);
  },
};
