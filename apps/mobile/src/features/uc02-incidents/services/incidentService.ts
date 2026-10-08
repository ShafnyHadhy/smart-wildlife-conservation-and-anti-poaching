import { CreateIncidentDTO } from '@wildlife/shared';
import { mobileApiClient } from '../../../api/apiClient';

export async function submitIncident(
  data: CreateIncidentDTO,
  isOnline: boolean
) {
  return mobileApiClient.reportIncident(data, isOnline);
}

export async function getRangerIncidents(rangerId: string) {
  return mobileApiClient.get(
    `/incidents?rangerId=${encodeURIComponent(rangerId)}`
  );
}