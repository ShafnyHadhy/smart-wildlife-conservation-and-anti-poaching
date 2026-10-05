import { SyncOperationStatus } from '../enums';

export type EntityType = 'INCIDENT' | 'CONFLICT_REPORT' | 'ALERT_RESPONSE';
export type OperationType = 'CREATE';

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

// Single offline mutation queued on mobile
export interface OfflineMutationDTO<T = Record<string, any>> {
  clientMutationId: string;
  entityType: EntityType;
  operationType: OperationType;
  payload: T;
  createdAt: string;
}

// Batch sync request payload
export interface BatchSyncRequestDTO {
  operations: OfflineMutationDTO[];
}

// Result for a single operation in a sync batch
export interface SyncResultItem {
  clientMutationId: string;
  status: SyncOperationStatus;
  entityType: EntityType;
  entityId?: string;
  error?: string;
}

// Batch sync response payload
export interface BatchSyncResponseDTO {
  results: SyncResultItem[];
  syncedCount: number;
  failedCount: number;
}

