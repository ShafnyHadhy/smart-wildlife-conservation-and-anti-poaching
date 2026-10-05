import { offlineQueue } from './offlineQueue';
import { mobileApiClient } from '../api/apiClient';
import { BatchSyncRequestDTO, BatchSyncResponseDTO, SyncOperationStatus } from '@wildlife/shared';

export interface SyncProgressResult {
  synced: number;
  failed: number;
  total: number;
  results: Array<{
    clientMutationId: string;
    status: SyncOperationStatus;
    entityId?: string;
    error?: string;
  }>;
}

export class MobileSyncService {
  private isSyncing = false;

  async syncPending(isOnline: boolean): Promise<SyncProgressResult> {
    if (!isOnline) {
      console.log('[MobileSync] Device is offline. Synchronization postponed.');
      const pendingCount = await offlineQueue.getPendingCount();
      return { synced: 0, failed: 0, total: pendingCount, results: [] };
    }

    if (this.isSyncing) {
      console.log('[MobileSync] Sync already in progress.');
      const pendingCount = await offlineQueue.getPendingCount();
      return { synced: 0, failed: 0, total: pendingCount, results: [] };
    }

    this.isSyncing = true;

    try {
      const pending = await offlineQueue.getPending();
      if (pending.length === 0) {
        return { synced: 0, failed: 0, total: 0, results: [] };
      }

      console.log(`[MobileSync] Replaying ${pending.length} pending mutations to backend...`);

      // Mark all items as SYNCING
      for (const item of pending) {
        await offlineQueue.markSyncing(item.clientMutationId);
      }

      const requestPayload: BatchSyncRequestDTO = {
        operations: pending.map((m) => ({
          clientMutationId: m.clientMutationId,
          entityType: m.entityType,
          operationType: m.operationType,
          payload: m.payload,
          createdAt: m.createdAt,
        })),
      };

      const syncResponse = await mobileApiClient.post<BatchSyncResponseDTO>(
        '/sync/batch',
        requestPayload
      );

      let synced = 0;
      let failed = 0;

      for (const res of syncResponse.results) {
        if (res.status === SyncOperationStatus.SYNCHRONIZED) {
          await offlineQueue.remove(res.clientMutationId);
          synced++;
        } else {
          await offlineQueue.markFailed(
            res.clientMutationId,
            res.error || 'Server rejected synchronization'
          );
          failed++;
        }
      }

      console.log(`[MobileSync] Completed: ${synced} synced, ${failed} failed.`);

      return {
        synced,
        failed,
        total: pending.length,
        results: syncResponse.results,
      };
    } catch (err: any) {
      console.error('[MobileSync] Sync failed with error:', err);
      const pending = await offlineQueue.getPending();
      for (const item of pending) {
        await offlineQueue.markFailed(item.clientMutationId, err.message || 'Network error');
      }
      return { synced: 0, failed: pending.length, total: pending.length, results: [] };
    } finally {
      this.isSyncing = false;
    }
  }
}

export const mobileSyncService = new MobileSyncService();
