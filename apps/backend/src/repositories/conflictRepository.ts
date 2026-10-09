import { query } from '../config/database';
import {
  ConflictReport,
  ConflictType,
  ConflictStatus,
  ConflictStatusEntry,
} from '@wildlife/shared';

type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type CompensationStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'DISBURSED';

const toIso = (v: any): string => (v instanceof Date ? v.toISOString() : new Date(v).toISOString());

function parseJsonArray<T>(value: any): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapRowToConflict(row: any): ConflictReport {
  return {
    id: row.id,
    communityMemberId: row.community_member_id,
    parkId: row.park_id,
    conflictType: row.conflict_type as ConflictType,
    description: row.description,
    latitude: parseFloat(row.latitude),
    longitude: parseFloat(row.longitude),
    status: row.status as ConflictStatus,
    reportedAt: toIso(row.reported_at),
    clientMutationId: row.client_mutation_id,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    reporterName: row.reporter_name,
    reporterPhone: row.reporter_phone,
    villageName: row.village_name,
    parkName: row.park_name,
    potentialDuplicateOf: row.potential_duplicate_of || undefined,
    distanceToDuplicateKm:
      row.distance_to_duplicate_km !== null && row.distance_to_duplicate_km !== undefined
        ? parseFloat(row.distance_to_duplicate_km)
        : undefined,
    triageNotes: row.triage_notes || undefined,
    mitigationAction: row.mitigation_action || undefined,
    severity: (row.severity as Severity) || 'MEDIUM',
    estimatedDamageLkr:
      row.estimated_damage_lkr !== null && row.estimated_damage_lkr !== undefined
        ? parseFloat(row.estimated_damage_lkr)
        : undefined,
    cropTypeLost: row.crop_type_lost || undefined,
    compensationStatus: (row.compensation_status as CompensationStatus) || undefined,
    estimatedAnimalsInvolved: row.animals_involved ?? undefined,
    locationName: row.location_name || undefined,
    immediateRisk: !!row.immediate_risk,
    photoUrls: parseJsonArray<string>(row.photo_urls),
    statusHistory: parseJsonArray<ConflictStatusEntry>(row.status_history),
    handledByName: row.handled_by_name || undefined,
  };
}

const BASE_SELECT = `
  SELECT c.*, cm.full_name AS reporter_name, cm.phone_number AS reporter_phone,
         cm.village_name, p.name AS park_name
  FROM conflict_reports c
  JOIN community_members cm ON c.community_member_id = cm.id
  LEFT JOIN parks p ON c.park_id = p.id
`;

export class ConflictRepository {
  async findAll(filter?: {
    status?: ConflictStatus;
    parkId?: string;
    communityMemberId?: string;
    conflictType?: ConflictType;
  }): Promise<ConflictReport[]> {
    let sql = BASE_SELECT;
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
    const res = await query(`${BASE_SELECT} WHERE c.id = $1`, [id]);
    return res.rows[0] ? mapRowToConflict(res.rows[0]) : null;
  }

  async findByClientMutationId(clientMutationId: string): Promise<ConflictReport | null> {
    const res = await query(`${BASE_SELECT} WHERE c.client_mutation_id = $1`, [clientMutationId]);
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
    severity?: Severity;
    potentialDuplicateOf?: string;
    distanceToDuplicateKm?: number;
    estimatedDamageLkr?: number;
    cropTypeLost?: string;
    estimatedAnimalsInvolved?: number;
    locationName?: string;
    immediateRisk?: boolean;
    photoUrls?: string[];
    reporterName?: string;
  }): Promise<ConflictReport> {
    const reportedAt = data.reportedAt
      ? typeof data.reportedAt === 'string'
        ? new Date(data.reportedAt)
        : data.reportedAt
      : new Date();

    const firstEntry: ConflictStatusEntry = {
      status: ConflictStatus.SUBMITTED,
      at: new Date().toISOString(),
      byName: data.reporterName,
      byRole: 'COMMUNITY_MEMBER',
      note: 'Report submitted by community member.',
    };

    const sql = `
      INSERT INTO conflict_reports (
        community_member_id, park_id, conflict_type, description, latitude, longitude,
        reported_at, client_mutation_id, severity, potential_duplicate_of,
        distance_to_duplicate_km, estimated_damage_lkr, crop_type_lost, compensation_status,
        animals_involved, location_name, immediate_risk, photo_urls, status_history
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::jsonb, $19::jsonb)
      RETURNING id
    `;
    const params = [
      data.communityMemberId,
      data.parkId || null,
      data.conflictType,
      data.description,
      data.latitude,
      data.longitude,
      reportedAt,
      data.clientMutationId || null,
      data.severity || 'MEDIUM',
      data.potentialDuplicateOf || null,
      data.distanceToDuplicateKm ?? null,
      data.estimatedDamageLkr ?? null,
      data.cropTypeLost || null,
      data.estimatedDamageLkr !== undefined || data.cropTypeLost ? 'PENDING_REVIEW' : null,
      data.estimatedAnimalsInvolved ?? null,
      data.locationName || null,
      data.immediateRisk ?? false,
      JSON.stringify(data.photoUrls || []),
      JSON.stringify([firstEntry]),
    ];
    const res = await query(sql, params);
    const created = await this.findById(res.rows[0].id);
    return created as ConflictReport;
  }

  async updateStatus(
    id: string,
    status: ConflictStatus,
    triageNotes?: string,
    mitigationAction?: string,
    damageData?: {
      estimatedDamageLkr?: number;
      cropTypeLost?: string;
      compensationStatus?: CompensationStatus;
    },
    actorName?: string
  ): Promise<ConflictReport | null> {
    const entry: ConflictStatusEntry = {
      status,
      at: new Date().toISOString(),
      byName: actorName,
      byRole: 'RANGER',
      note: triageNotes || undefined,
      action: mitigationAction || undefined,
    };

    const sql = `
      UPDATE conflict_reports
      SET status = $1,
          triage_notes = COALESCE($3, triage_notes),
          mitigation_action = COALESCE($4, mitigation_action),
          estimated_damage_lkr = COALESCE($5, estimated_damage_lkr),
          crop_type_lost = COALESCE($6, crop_type_lost),
          compensation_status = COALESCE($7, compensation_status),
          handled_by_name = COALESCE($8, handled_by_name),
          status_history = status_history || $9::jsonb,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id
    `;
    const res = await query(sql, [
      status,
      id,
      triageNotes ?? null,
      mitigationAction ?? null,
      damageData?.estimatedDamageLkr ?? null,
      damageData?.cropTypeLost ?? null,
      damageData?.compensationStatus ?? null,
      actorName ?? null,
      JSON.stringify([entry]),
    ]);
    if (!res.rows[0]) return null;
    return this.findById(id);
  }
}

export const conflictRepository = new ConflictRepository();
