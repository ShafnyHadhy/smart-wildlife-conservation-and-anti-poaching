import { query } from '../config/database';
import { SyncOperation, SyncOperationStatus } from '@wildlife/shared';

function mapRowToSyncOperation(row: any): SyncOperation {
  return {
    id: row.id,
    clientMutationId: row.client_mutation_id,
    operationType: row.operation_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
    status: row.status as SyncOperationStatus,
    errorMessage: row.error_message,
    createdAt: row.created_at.toISOString(),
    synchronizedAt: row.synchronized_at ? row.synchronized_at.toISOString() : undefined,
  };
}

export class SyncRepository {
  async findByClientMutationId(clientMutationId: string): Promise<SyncOperation | null> {
    const res = await query('SELECT * FROM sync_operations WHERE client_mutation_id = $1', [
      clientMutationId,
    ]);
    return res.rows[0] ? mapRowToSyncOperation(res.rows[0]) : null;
  }

  async create(data: {
    clientMutationId: string;
    operationType: string;
    entityType: string;
    entityId?: string;
    payload: Record<string, any>;
    status: SyncOperationStatus;
    errorMessage?: string;
  }): Promise<SyncOperation> {
    const sql = `
      INSERT INTO sync_operations (
        client_mutation_id, operation_type, entity_type, entity_id, payload, status, error_message, synchronized_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const synchronizedAt = data.status === 'SYNCHRONIZED' ? new Date() : null;
    const res = await query(sql, [
      data.clientMutationId,
      data.operationType,
      data.entityType,
      data.entityId || null,
      JSON.stringify(data.payload),
      data.status,
      data.errorMessage || null,
      synchronizedAt,
    ]);
    return mapRowToSyncOperation(res.rows[0]);
  }
}

export const syncRepository = new SyncRepository();
