import { query } from '../config/database';
import { Incident, SupportingEvidence, IncidentType, IncidentStatus, EvidenceType } from '@wildlife/shared';

function mapRowToIncident(row: any): Incident {
  return {
    id: row.id,
    rangerId: row.ranger_id,
    patrolId: row.patrol_id,
    incidentType: row.incident_type as IncidentType,
    description: row.description,
    latitude: parseFloat(row.latitude),
    longitude: parseFloat(row.longitude),
    status: row.status as IncidentStatus,
    reportedAt: row.reported_at.toISOString(),
    clientMutationId: row.client_mutation_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    rangerName: row.ranger_name,
    patrolCode: row.patrol_code,
  };
}

function mapRowToEvidence(row: any): SupportingEvidence {
  return {
    id: row.id,
    incidentId: row.incident_id,
    evidenceType: row.evidence_type as EvidenceType,
    filePath: row.file_path,
    fileName: row.file_name,
    fileType: row.file_type,
    capturedAt: row.captured_at.toISOString(),
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
  };
}

export class IncidentRepository {
  async findAll(filter?: {
    status?: IncidentStatus;
    rangerId?: string;
    patrolId?: string;
    incidentType?: IncidentType;
  }): Promise<Incident[]> {
    let sql = `
      SELECT i.*, u.full_name AS ranger_name, p.patrol_code
      FROM incidents i
      JOIN users u ON i.ranger_id = u.id
      LEFT JOIN patrols p ON i.patrol_id = p.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter?.status) {
      params.push(filter.status);
      conditions.push(`i.status = $${params.length}`);
    }
    if (filter?.rangerId) {
      params.push(filter.rangerId);
      conditions.push(`i.ranger_id = $${params.length}`);
    }
    if (filter?.patrolId) {
      params.push(filter.patrolId);
      conditions.push(`i.patrol_id = $${params.length}`);
    }
    if (filter?.incidentType) {
      params.push(filter.incidentType);
      conditions.push(`i.incident_type = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ' ORDER BY i.reported_at DESC';
    const res = await query(sql, params);
    return res.rows.map(mapRowToIncident);
  }

  async findById(id: string): Promise<Incident | null> {
    const sql = `
      SELECT i.*, u.full_name AS ranger_name, p.patrol_code
      FROM incidents i
      JOIN users u ON i.ranger_id = u.id
      LEFT JOIN patrols p ON i.patrol_id = p.id
      WHERE i.id = $1
    `;
    const res = await query(sql, [id]);
    if (!res.rows[0]) return null;

    const incident = mapRowToIncident(res.rows[0]);
    incident.evidence = await this.findEvidenceByIncidentId(id);
    return incident;
  }

  async findByClientMutationId(clientMutationId: string): Promise<Incident | null> {
    const sql = `
      SELECT i.*, u.full_name AS ranger_name, p.patrol_code
      FROM incidents i
      JOIN users u ON i.ranger_id = u.id
      LEFT JOIN patrols p ON i.patrol_id = p.id
      WHERE i.client_mutation_id = $1
    `;
    const res = await query(sql, [clientMutationId]);
    if (!res.rows[0]) return null;

    const incident = mapRowToIncident(res.rows[0]);
    incident.evidence = await this.findEvidenceByIncidentId(incident.id);
    return incident;
  }

  async findEvidenceByIncidentId(incidentId: string): Promise<SupportingEvidence[]> {
    const res = await query(
      'SELECT * FROM supporting_evidence WHERE incident_id = $1 ORDER BY captured_at ASC',
      [incidentId]
    );
    return res.rows.map(mapRowToEvidence);
  }

  async create(data: {
    rangerId: string;
    patrolId?: string;
    incidentType: IncidentType;
    description: string;
    latitude: number;
    longitude: number;
    reportedAt?: string | Date;
    clientMutationId?: string;
  }): Promise<Incident> {
    const sql = `
      INSERT INTO incidents (
        ranger_id, patrol_id, incident_type, description, latitude, longitude, reported_at, client_mutation_id
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
      data.rangerId,
      data.patrolId || null,
      data.incidentType,
      data.description,
      data.latitude,
      data.longitude,
      reportedAt,
      data.clientMutationId || null,
    ];
    const res = await query(sql, params);
    return mapRowToIncident(res.rows[0]);
  }

  async updateStatus(
    id: string,
    status: IncidentStatus
  ): Promise<Incident | null> {
    const sql = `
      UPDATE incidents
      SET status = $2,
          updated_at = NOW()
      WHERE id = $1
        AND status = 'SUBMITTED'
        AND $2 = 'REVIEWED'
      RETURNING id
    `;

    const result = await query(sql, [id, status]);

    if (!result.rows[0]) {
      return null;
    }

    return this.findById(id);
  }

  async addEvidence(data: {
    incidentId: string;
    evidenceType: EvidenceType;
    filePath: string;
    fileName?: string;
    fileType?: string;
    capturedAt?: string | Date;
    notes?: string;
  }): Promise<SupportingEvidence> {
    const sql = `
      INSERT INTO supporting_evidence (
        incident_id,
        evidence_type,
        file_path,
        file_name,
        file_type,
        captured_at,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const capturedAt = data.capturedAt
      ? typeof data.capturedAt === 'string'
        ? new Date(data.capturedAt)
        : data.capturedAt
      : new Date();

    const params = [
      data.incidentId,
      data.evidenceType,
      data.filePath,
      data.fileName || null,
      data.fileType || null,
      capturedAt,
      data.notes || null,
    ];

    const res = await query(sql, params);

    return mapRowToEvidence(res.rows[0]);
  }
}

export const incidentRepository = new IncidentRepository();