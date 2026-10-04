import { SyncOperationStatus } from '../enums';

export interface SyncOperation {
  id: string;
  clientMutationId: string;
  operationType: string;
  entityType: string;
  entityId?: string;
  payload: Record<string, any>;
  status: SyncOperationStatus;
  errorMessage?: string;
  createdAt: string;
  synchronizedAt?: string;
}

export interface CreateSyncOperationDTO {
  clientMutationId: string;
  operationType: string;
  entityType: string;
  entityId?: string;
  payload: Record<string, any>;
}
