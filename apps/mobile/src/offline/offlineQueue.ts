import { persistentStorage } from '../storage/persistentStorage';
import { EntityType, OperationType } from '@wildlife/shared';

// Queue item stored locally when offline
export interface QueuedMutation<T = any> {
  id: string;
  clientMutationId: string;
  entityType: EntityType;
  operationType: OperationType;
  payload: T;
  createdAt: string;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  retryCount: number;
  lastError?: string;
}

const STORAGE_KEY = 'wildlife_offline_mutation_queue';

function generateLocalId(): string {
  return `loc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export class OfflineQueue {

  private queue: QueuedMutation[] = [];
  private isLoaded = false;

  private async ensureLoaded(): Promise<void> {
    if (!this.isLoaded) {
      try {
        const raw = await persistentStorage.getItem(STORAGE_KEY);
        if (raw) {
          this.queue = JSON.parse(raw);
        } else {
          this.queue = [];
        }
      } catch (err) {
        console.warn('[OfflineQueue] Failed to load queue from storage:', err);
        this.queue = [];
      }
      this.isLoaded = true;
    }
  }

  private async persist(): Promise<void> {
    try {
      await persistentStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch (err) {
      console.error('[OfflineQueue] Failed to persist queue to storage:', err);
    }
  }

  async enqueue<T>(mutation: {
    clientMutationId?: string;
    entityType: EntityType;
    operationType?: OperationType;
    payload: T;
  }): Promise<QueuedMutation<T>> {
    await this.ensureLoaded();

    const clientMutationId = mutation.clientMutationId || `mut-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const item: QueuedMutation<T> = {
      id: generateLocalId(),
      clientMutationId,
      entityType: mutation.entityType,
      operationType: mutation.operationType || 'CREATE',
      payload: mutation.payload,
      createdAt: new Date().toISOString(),
      status: 'PENDING',
      retryCount: 0,
    };

    this.queue.push(item);
    await this.persist();
    return item;
  }

  async getPending(): Promise<QueuedMutation[]> {
    await this.ensureLoaded();
    return [...this.queue];
  }

  async getPendingCount(): Promise<number> {
    await this.ensureLoaded();
    return this.queue.filter((m) => m.status === 'PENDING' || m.status === 'FAILED').length;
  }

  async remove(clientMutationId: string): Promise<void> {
    await this.ensureLoaded();
    this.queue = this.queue.filter((m) => m.clientMutationId !== clientMutationId);
    await this.persist();
  }

  async markFailed(clientMutationId: string, error: string): Promise<void> {
    await this.ensureLoaded();
    const item = this.queue.find((m) => m.clientMutationId === clientMutationId);
    if (item) {
      item.status = 'FAILED';
      item.retryCount += 1;
      item.lastError = error;
      await this.persist();
    }
  }

  async markSyncing(clientMutationId: string): Promise<void> {
    await this.ensureLoaded();
    const item = this.queue.find((m) => m.clientMutationId === clientMutationId);
    if (item) {
      item.status = 'SYNCING';
      await this.persist();
    }
  }

  async clear(): Promise<void> {
    this.queue = [];
    await this.persist();
  }
}

export const offlineQueue = new OfflineQueue();
