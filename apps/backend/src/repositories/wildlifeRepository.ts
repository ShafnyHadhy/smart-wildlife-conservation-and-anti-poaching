import { query } from '../config/database';
import {
  WildlifeAnimal,
  TrackingCollar,
  LocationRecord,
  RiskZone,
  WildlifeRiskAlert,
  AlertResponse,
  RiskLevel,
  AlertStatus,
  ResponseStatus,
} from '@wildlife/shared';

function mapRowToAnimal(row: any): WildlifeAnimal {
  return {
    id: row.id,
    name: row.name,
    species: row.species,
    gender: row.gender,
    identificationTag: row.identification_tag,
    healthStatus: row.health_status,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapRowToCollar(row: any): TrackingCollar {
  return {
    id: row.id,
    animalId: row.animal_id,
    collarCode: row.collar_code,
    model: row.model,
    batteryPercentage: row.battery_percentage,
    isActive: row.is_active,
    lastTransmissionAt: row.last_transmission_at ? row.last_transmission_at.toISOString() : undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapRowToLocationRecord(row: any): LocationRecord {
  return {
    id: row.id,
    animalId: row.animal_id,
    collarId: row.collar_id,
    latitude: parseFloat(row.latitude),
    longitude: parseFloat(row.longitude),
    recordedAt: row.recorded_at.toISOString(),
    isSimulated: row.is_simulated,
    createdAt: row.created_at.toISOString(),
  };
}

function mapRowToRiskZone(row: any): RiskZone {
  return {
    id: row.id,
    parkId: row.park_id,
    name: row.name,
    zoneType: row.zone_type,
    riskLevel: row.risk_level as RiskLevel,
    boundaryCoordinates: typeof row.boundary_coordinates === 'string'
      ? JSON.parse(row.boundary_coordinates)
      : row.boundary_coordinates,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapRowToAlert(row: any): WildlifeRiskAlert {
  return {
    id: row.id,
    animalId: row.animal_id,
    riskZoneId: row.risk_zone_id,
    locationRecordId: row.location_record_id,
    severity: row.severity as RiskLevel,
    status: row.status as AlertStatus,
    generatedAt: row.generated_at.toISOString(),
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    animalName: row.animal_name,
    animalSpecies: row.animal_species,
    zoneName: row.zone_name,
    location: row.latitude && row.longitude ? {
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
    } : undefined,
  };
}

function mapRowToResponse(row: any): AlertResponse {
  return {
    id: row.id,
    alertId: row.alert_id,
    responderId: row.responder_id,
    actionTaken: row.action_taken,
    status: row.status as ResponseStatus,
    respondedAt: row.responded_at.toISOString(),
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    responderName: row.responder_name,
  };
}

export class WildlifeRepository {
  async findAllAnimals(): Promise<WildlifeAnimal[]> {
    const res = await query('SELECT * FROM wildlife_animals ORDER BY name ASC');
    return res.rows.map(mapRowToAnimal);
  }

  async findAnimalById(id: string): Promise<WildlifeAnimal | null> {
    const res = await query('SELECT * FROM wildlife_animals WHERE id = $1', [id]);
    return res.rows[0] ? mapRowToAnimal(res.rows[0]) : null;
  }

  async findCollarById(id: string): Promise<TrackingCollar | null> {
    const res = await query('SELECT * FROM tracking_collars WHERE id = $1', [id]);
    return res.rows[0] ? mapRowToCollar(res.rows[0]) : null;
  }

  async findCollarByAnimalId(animalId: string): Promise<TrackingCollar | null> {
    const res = await query('SELECT * FROM tracking_collars WHERE animal_id = $1', [animalId]);
    return res.rows[0] ? mapRowToCollar(res.rows[0]) : null;
  }

  async createLocationRecord(data: {
    animalId: string;
    collarId?: string;
    latitude: number;
    longitude: number;
    recordedAt: string | Date;
    isSimulated?: boolean;
  }): Promise<LocationRecord> {
    const sql = `
      INSERT INTO location_records (animal_id, collar_id, latitude, longitude, recorded_at, is_simulated)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const recordedAt = typeof data.recordedAt === 'string' ? new Date(data.recordedAt) : data.recordedAt;
    const res = await query(sql, [
      data.animalId,
      data.collarId || null,
      data.latitude,
      data.longitude,
      recordedAt,
      data.isSimulated ?? true,
    ]);

    // Also update collar's last transmission time if collarId is provided
    if (data.collarId) {
      await query(
        'UPDATE tracking_collars SET last_transmission_at = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [recordedAt, data.collarId]
      );
    }

    return mapRowToLocationRecord(res.rows[0]);
  }

  async findRecentLocationsByAnimal(animalId: string, limit = 20): Promise<LocationRecord[]> {
    const res = await query(
      'SELECT * FROM location_records WHERE animal_id = $1 ORDER BY recorded_at DESC LIMIT $2',
      [animalId, limit]
    );
    return res.rows.map(mapRowToLocationRecord);
  }

  async findAllRiskZones(parkId?: string): Promise<RiskZone[]> {
    const sql = parkId
      ? 'SELECT * FROM risk_zones WHERE park_id = $1 AND is_active = TRUE ORDER BY name ASC'
      : 'SELECT * FROM risk_zones WHERE is_active = TRUE ORDER BY name ASC';
    const params = parkId ? [parkId] : [];
    const res = await query(sql, params);
    return res.rows.map(mapRowToRiskZone);
  }

  async findRiskZoneById(id: string): Promise<RiskZone | null> {
    const res = await query('SELECT * FROM risk_zones WHERE id = $1', [id]);
    return res.rows[0] ? mapRowToRiskZone(res.rows[0]) : null;
  }

  async findAlerts(filter?: { status?: AlertStatus; animalId?: string }): Promise<WildlifeRiskAlert[]> {
    let sql = `
      SELECT a.*, w.name AS animal_name, w.species AS animal_species, rz.name AS zone_name,
             lr.latitude, lr.longitude
      FROM wildlife_risk_alerts a
      JOIN wildlife_animals w ON a.animal_id = w.id
      JOIN risk_zones rz ON a.risk_zone_id = rz.id
      LEFT JOIN location_records lr ON a.location_record_id = lr.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter?.status) {
      params.push(filter.status);
      conditions.push(`a.status = $${params.length}`);
    }
    if (filter?.animalId) {
      params.push(filter.animalId);
      conditions.push(`a.animal_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ' ORDER BY a.generated_at DESC';
    const res = await query(sql, params);
    return res.rows.map(mapRowToAlert);
  }

  async findActiveAlerts(): Promise<WildlifeRiskAlert[]> {
    return this.findAlerts({ status: AlertStatus.ACTIVE });
  }

  async findAlertById(id: string): Promise<WildlifeRiskAlert | null> {
    const sql = `
      SELECT a.*, w.name AS animal_name, w.species AS animal_species, rz.name AS zone_name,
             lr.latitude, lr.longitude
      FROM wildlife_risk_alerts a
      JOIN wildlife_animals w ON a.animal_id = w.id
      JOIN risk_zones rz ON a.risk_zone_id = rz.id
      LEFT JOIN location_records lr ON a.location_record_id = lr.id
      WHERE a.id = $1
    `;
    const res = await query(sql, [id]);
    if (!res.rows[0]) return null;

    const alert = mapRowToAlert(res.rows[0]);
    alert.responses = await this.findResponsesByAlertId(id);
    return alert;
  }

  async findResponsesByAlertId(alertId: string): Promise<AlertResponse[]> {
    const sql = `
      SELECT ar.*, u.full_name AS responder_name
      FROM alert_responses ar
      JOIN users u ON ar.responder_id = u.id
      WHERE ar.alert_id = $1
      ORDER BY ar.responded_at DESC
    `;
    const res = await query(sql, [alertId]);
    return res.rows.map(mapRowToResponse);
  }

  async createAlertResponse(data: {
    alertId: string;
    responderId: string;
    actionTaken: string;
    status: ResponseStatus;
    notes?: string;
  }): Promise<AlertResponse> {
    const sql = `
      INSERT INTO alert_responses (alert_id, responder_id, action_taken, status, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const res = await query(sql, [
      data.alertId,
      data.responderId,
      data.actionTaken,
      data.status,
      data.notes || null,
    ]);
    return mapRowToResponse(res.rows[0]);
  }

  async updateAlertStatus(alertId: string, status: AlertStatus): Promise<void> {
    await query(
      'UPDATE wildlife_risk_alerts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, alertId]
    );
  }

  async createAlert(data: {
    animalId: string;
    riskZoneId: string;
    locationRecordId?: string;
    severity: RiskLevel;
    status?: AlertStatus;
    generatedAt?: string | Date;
    notes?: string;
  }): Promise<WildlifeRiskAlert> {
    const generatedAt = data.generatedAt
      ? typeof data.generatedAt === 'string'
        ? new Date(data.generatedAt)
        : data.generatedAt
      : new Date();
    const status = data.status || AlertStatus.ACTIVE;

    const sql = `
      INSERT INTO wildlife_risk_alerts (animal_id, risk_zone_id, location_record_id, severity, status, generated_at, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const res = await query(sql, [
      data.animalId,
      data.riskZoneId,
      data.locationRecordId || null,
      data.severity,
      status,
      generatedAt,
      data.notes || null,
    ]);

    const created = await this.findAlertById(res.rows[0].id);
    return created || mapRowToAlert(res.rows[0]);
  }

  async findActiveAlertForAnimalAndZone(
    animalId: string,
    riskZoneId: string
  ): Promise<WildlifeRiskAlert | null> {
    const sql = `
      SELECT a.*, w.name AS animal_name, w.species AS animal_species, rz.name AS zone_name,
             lr.latitude, lr.longitude
      FROM wildlife_risk_alerts a
      JOIN wildlife_animals w ON a.animal_id = w.id
      JOIN risk_zones rz ON a.risk_zone_id = rz.id
      LEFT JOIN location_records lr ON a.location_record_id = lr.id
      WHERE a.animal_id = $1
        AND a.risk_zone_id = $2
        AND a.status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESPONDING')
      ORDER BY a.generated_at DESC
      LIMIT 1
    `;
    const res = await query(sql, [animalId, riskZoneId]);
    return res.rows[0] ? mapRowToAlert(res.rows[0]) : null;
  }
}

export const wildlifeRepository = new WildlifeRepository();
