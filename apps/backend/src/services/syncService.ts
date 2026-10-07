import { syncRepository } from '../repositories/syncRepository';
import { incidentRepository } from '../repositories/incidentRepository';
import { conflictRepository } from '../repositories/conflictRepository';
import { incidentService } from './incidentService';
import { conflictService } from './conflictService';
import { wildlifeService } from './wildlifeService';
import {
  BatchSyncRequestDTO,
  BatchSyncResponseDTO,
  SyncResultItem,
  OfflineMutationDTO,
  SyncOperationStatus,
} from '@wildlife/shared';

export class SyncService {
  async processBatch(request: BatchSyncRequestDTO): Promise<BatchSyncResponseDTO> {
    const results: SyncResultItem[] = [];
    let syncedCount = 0;
    let failedCount = 0;

    for (const op of request.operations) {
      try {
        const result = await this.processSingleOperation(op);
        results.push(result);
        if (result.status === SyncOperationStatus.SYNCHRONIZED) {
          syncedCount++;
        } else {
          failedCount++;
        }
      } catch (err: any) {
        failedCount++;
        const errorMessage = err?.message || 'Operation failed during batch synchronization';

        // Record failure audit log in sync_operations
        try {
          await syncRepository.create({
            clientMutationId: op.clientMutationId,
            operationType: op.operationType,
            entityType: op.entityType,
            payload: op.payload,
            status: SyncOperationStatus.FAILED,
            errorMessage,
          });
        } catch {
          // If inserting sync failure itself encounters unique conflict, ignore
        }

        results.push({
          clientMutationId: op.clientMutationId,
          status: SyncOperationStatus.FAILED,
          entityType: op.entityType,
          error: errorMessage,
        });
      }
    }

    return {
      results,
      syncedCount,
      failedCount,
    };
  }

  private async processSingleOperation(op: OfflineMutationDTO): Promise<SyncResultItem> {
    const { clientMutationId, entityType, operationType, payload } = op;

    // Check prior sync record for idempotency
    const existingSync = await syncRepository.findByClientMutationId(clientMutationId);
    if (existingSync && existingSync.status === SyncOperationStatus.SYNCHRONIZED) {
      return {
        clientMutationId,
        status: SyncOperationStatus.SYNCHRONIZED,
        entityType,
        entityId: existingSync.entityId,
      };
    }

    // Secondary check against domain table in case recorded outside sync table
    if (entityType === 'INCIDENT') {
      const existingIncident = await incidentRepository.findByClientMutationId(clientMutationId);
      if (existingIncident) {
        if (!existingSync) {
          await syncRepository.create({
            clientMutationId,
            operationType,
            entityType,
            entityId: existingIncident.id,
            payload,
            status: SyncOperationStatus.SYNCHRONIZED,
          });
        }
        return {
          clientMutationId,
          status: SyncOperationStatus.SYNCHRONIZED,
          entityType,
          entityId: existingIncident.id,
        };
      }
    } else if (entityType === 'CONFLICT_REPORT') {
      const existingConflict = await conflictRepository.findByClientMutationId(clientMutationId);
      if (existingConflict) {
        if (!existingSync) {
          await syncRepository.create({
            clientMutationId,
            operationType,
            entityType,
            entityId: existingConflict.id,
            payload,
            status: SyncOperationStatus.SYNCHRONIZED,
          });
        }
        return {
          clientMutationId,
          status: SyncOperationStatus.SYNCHRONIZED,
          entityType,
          entityId: existingConflict.id,
        };
      }
    }

    let entityId: string | undefined;

    switch (entityType) {
      case 'INCIDENT': {
        const incident = await incidentService.createIncident({
          rangerId: payload.rangerId,
          patrolId: payload.patrolId,
          incidentType: payload.incidentType,
          description: payload.description,
          latitude: payload.latitude,
          longitude: payload.longitude,
          reportedAt: payload.reportedAt || op.createdAt,
          clientMutationId,
        });
        entityId = incident.id;
        break;
      }

      case 'CONFLICT_REPORT': {
        const conflict = await conflictService.createConflictReport({
          communityMemberId: payload.communityMemberId,
          parkId: payload.parkId,
          conflictType: payload.conflictType,
          description: payload.description,
          latitude: payload.latitude,
          longitude: payload.longitude,
          reportedAt: payload.reportedAt || op.createdAt,
          clientMutationId,
          severity: payload.severity,
          estimatedAnimalsInvolved: payload.estimatedAnimalsInvolved,
          locationName: payload.locationName,
          immediateRisk: payload.immediateRisk,
          photoUrls: payload.photoUrls,
        });
        entityId = conflict.id;
        break;
      }

      case 'ALERT_RESPONSE': {
        const response = await wildlifeService.respondToAlert(payload.alertId, {
          responderId: payload.responderId,
          actionTaken: payload.actionTaken,
          status: payload.status,
          notes: payload.notes,
        });
        entityId = response.id;
        break;
      }

      default:
        throw new Error(`Unsupported entity type '${entityType}' for synchronization`);
    }

    // Persist sync audit record
    if (!existingSync) {
      await syncRepository.create({
        clientMutationId,
        operationType,
        entityType,
        entityId,
        payload,
        status: SyncOperationStatus.SYNCHRONIZED,
      });
    }


    return {
      clientMutationId,
      status: SyncOperationStatus.SYNCHRONIZED,
      entityType,
      entityId,
    };
  }
}

export const syncService = new SyncService();
