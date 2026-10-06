import { query } from '../config/database';
import { ConflictReport, ConflictType, ConflictStatus } from '@wildlife/shared';

interface ConflictMetadata {
  triageNotes?: string;
  mitigationAction?: string;
  potentialDuplicateOf?: string;
  distanceToDuplicateKm?: number;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

const metadataStore = new Map<string, ConflictMetadata>();

function mapRowToConflict(row: any): ConflictReport {
  const meta = metadataStore.get(row.id) || {};
  return {
    id: row.id,
    communityMemberId: row.community_member_id,
    parkId: row.park_id,
    conflictType: row.conflict_type as ConflictType,
    description: row.description,
    latitude: parseFloat(row.latitude),
    longitude: parseFloat(row.longitude),
    status: row.status as ConflictStatus,
    reportedAt: row.reported_at instanceof Date ? row.reported_at.toISOString() : new Date(row.reported_at).toISOString(),
    clientMutationId: row.client_mutation_id,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : new Date(row.updated_at).toISOString(),
    reporterName: row.reporter_name,
    reporterPhone: row.reporter_phone,
    villageName: row.village_name,
    parkName: row.park_name,
    potentialDuplicateOf: row.potential_duplicate_of || meta.potentialDuplicateOf,
    distanceToDuplicateKm: row.distance_to_duplicate_km ? parseFloat(row.distance_to_duplicate_km) : meta.distanceToDuplicateKm,
    triageNotes: row.triage_notes || meta.triageNotes,
    mitigationAction: row.mitigation_action || meta.mitigationAction,
    severity: row.severity || meta.severity || 'MEDIUM',
  };
}

export class ConflictRepository {
  async findAll(filter?: {
    status?: ConflictStatus;
    parkId?: string;
    communityMemberId?: string;
    conflictType?: ConflictType;
  }): Promise<ConflictReport[]> {
    let sql = `
      SELECT c.*, cm.full_name AS reporter_name, cm.phone_number AS reporter_phone,
             cm.village_name, p.name AS park_name
      FROM conflict_reports c
      JOIN community_members cm ON c.community_member_id = cm.id
      LEFT JOIN parks p ON c.park_id = p.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter?.status) {
      params.push(filter.status);
      conditions.push(`c.status = $${params.length}`);
    }
    if (filter?.parkId) {
      params.push(filter.parkId);
      conditions.push(`c.park_id = $${params.length}`);
    }
    if (filter?.communityMemberId) {
      params.push(filter.communityMemberId);
      conditions.push(`c.community_member_id = $${params.length}`);
    }
    if (filter?.conflictType) {
      params.push(filter.conflictType);
      conditions.push(`c.conflict_type = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ' ORDER BY c.reported_at DESC';
    const res = await query(sql, params);
    return res.rows.map(mapRowToConflict);
  }

  async findById(id: string): Promise<ConflictReport | null> {
    const sql = `
      SELECT c.*, cm.full_name AS reporter_name, cm.phone_number AS reporter_phone,
             cm.village_name, p.name AS park_name
      FROM conflict_reports c
      JOIN community_members cm ON c.community_member_id = cm.id
      LEFT JOIN parks p ON c.park_id = p.id
      WHERE c.id = $1
    `;
    const res = await query(sql, [id]);
    return res.rows[0] ? mapRowToConflict(res.rows[0]) : null;
  }

  async findByClientMutationId(clientMutationId: string): Promise<ConflictReport | null> {
    const sql = `
      SELECT c.*, cm.full_name AS reporter_name, cm.phone_number AS reporter_phone,
             cm.village_name, p.name AS park_name
      FROM conflict_reports c
      JOIN community_members cm ON c.community_member_id = cm.id
      LEFT JOIN parks p ON c.park_id = p.id
      WHERE c.client_mutation_id = $1
    `;
    const res = await query(sql, [clientMutationId]);
    return res.rows[0] ? mapRowToConflict(res.rows[0]) : null;
  }

  async create(data: {
    communityMemberId: string;
    parkId?: string;
    conflictType: ConflictType;
    description: string;
    latitude: number;
    longitude: number;
    reportedAt?: string | Date;
    clientMutationId?: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    potentialDuplicateOf?: string;
    distanceToDuplicateKm?: number;
  }): Promise<ConflictReport> {
    const sql = `
      INSERT INTO conflict_reports (
        community_member_id, park_id, conflict_type, description, latitude, longitude, reported_at, client_mutation_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const reportedAt = data.reportedAt
      ? typeof data.reportedAt === 'string'
        ? new Date(data.reportedAt)
        : data.reportedAt
      : new Date();

    const params = [
      data.communityMemberId,
      data.parkId || null,
      data.conflictType,
      data.description,
      data.latitude,
      data.longitude,
      reportedAt,
      data.clientMutationId || null,
    ];
    const res = await query(sql, params);
    const report = mapRowToConflict(res.rows[0]);

    if (data.severity || data.potentialDuplicateOf || data.distanceToDuplicateKm) {
      metadataStore.set(report.id, {
        severity: data.severity,
        potentialDuplicateOf: data.potentialDuplicateOf,
        distanceToDuplicateKm: data.distanceToDuplicateKm,
      });
      report.severity = data.severity || 'MEDIUM';
      report.potentialDuplicateOf = data.potentialDuplicateOf;
      report.distanceToDuplicateKm = data.distanceToDuplicateKm;
    }

    return report;
  }

  async updateStatus(
    id: string,
    status: ConflictStatus,
    triageNotes?: string,
    mitigationAction?: string
  ): Promise<ConflictReport | null> {
    const sql = `
      UPDATE conflict_reports
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const res = await query(sql, [status, id]);
    if (!res.rows[0]) return null;

    if (triageNotes || mitigationAction) {
      const existingMeta = metadataStore.get(id) || {};
      metadataStore.set(id, {
        ...existingMeta,
        ...(triageNotes !== undefined && { triageNotes }),
        ...(mitigationAction !== undefined && { mitigationAction }),
      });
    }

    return this.findById(id);
  }
}

export const conflictRepository = new ConflictRepository();
