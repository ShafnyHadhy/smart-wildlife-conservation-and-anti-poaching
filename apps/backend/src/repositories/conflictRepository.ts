import { query } from '../config/database';
import { ConflictReport, ConflictType, ConflictStatus } from '@wildlife/shared';

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
    reportedAt: row.reported_at.toISOString(),
    clientMutationId: row.client_mutation_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    reporterName: row.reporter_name,
    reporterPhone: row.reporter_phone,
    villageName: row.village_name,
    parkName: row.park_name,
  };
}

export class ConflictRepository {
  async findAll(): Promise<ConflictReport[]> {
    const sql = `
      SELECT c.*, cm.full_name AS reporter_name, cm.phone_number AS reporter_phone,
             cm.village_name, p.name AS park_name
      FROM conflict_reports c
      JOIN community_members cm ON c.community_member_id = cm.id
      LEFT JOIN parks p ON c.park_id = p.id
      ORDER BY c.reported_at DESC
    `;
    const res = await query(sql);
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

  async create(data: {
    communityMemberId: string;
    parkId?: string;
    conflictType: ConflictType;
    description: string;
    latitude: number;
    longitude: number;
    clientMutationId?: string;
  }): Promise<ConflictReport> {
    const sql = `
      INSERT INTO conflict_reports (community_member_id, park_id, conflict_type, description, latitude, longitude, client_mutation_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const params = [
      data.communityMemberId,
      data.parkId || null,
      data.conflictType,
      data.description,
      data.latitude,
      data.longitude,
      data.clientMutationId || null,
    ];
    const res = await query(sql, params);
    return mapRowToConflict(res.rows[0]);
  }
}

export const conflictRepository = new ConflictRepository();
