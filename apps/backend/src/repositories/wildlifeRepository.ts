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

  async findCollarByAnimalId(animalId: string): Promise<TrackingCollar | null> {
    const res = await query('SELECT * FROM tracking_collars WHERE animal_id = $1', [animalId]);
    return res.rows[0] ? mapRowToCollar(res.rows[0]) : null;
  }

  async findRecentLocationsByAnimal(animalId: string, limit = 10): Promise<LocationRecord[]> {
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

  async findActiveAlerts(): Promise<WildlifeRiskAlert[]> {
    const sql = `
      SELECT a.*, w.name AS animal_name, w.species AS animal_species, rz.name AS zone_name,
             lr.latitude, lr.longitude
      FROM wildlife_risk_alerts a
      JOIN wildlife_animals w ON a.animal_id = w.id
      JOIN risk_zones rz ON a.risk_zone_id = rz.id
      LEFT JOIN location_records lr ON a.location_record_id = lr.id
      WHERE a.status = 'ACTIVE'
      ORDER BY a.generated_at DESC
    `;
    const res = await query(sql);
    return res.rows.map(mapRowToAlert);
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
}

export const wildlifeRepository = new WildlifeRepository();
