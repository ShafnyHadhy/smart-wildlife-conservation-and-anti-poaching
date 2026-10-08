import { wildlifeRepository } from '../repositories/wildlifeRepository';
import { userRepository } from '../repositories/userRepository';
import { parkRepository } from '../repositories/parkRepository';
import {
  WildlifeAnimal,
  LocationRecord,
  RiskZone,
  WildlifeRiskAlert,
  AlertResponse,
  AlertStatus,
  ResponseStatus,
  RiskLevel,
  PolygonPoint,
  isPointInPolygon,
  calculateHaversineDistanceKm,
} from '@wildlife/shared';
import { NotFoundError, BadRequestError } from '../errors/AppError';

const RISK_LEVEL_ORDER: Record<RiskLevel, number> = {
  [RiskLevel.LOW]: 1,
  [RiskLevel.MEDIUM]: 2,
  [RiskLevel.HIGH]: 3,
  [RiskLevel.CRITICAL]: 4,
};

export class WildlifeService {
  async getAnimals(): Promise<WildlifeAnimal[]> {
    return wildlifeRepository.findAllAnimals();
  }

  async getAnimalById(id: string): Promise<WildlifeAnimal> {
    const animal = await wildlifeRepository.findAnimalById(id);
    if (!animal) {
      throw new NotFoundError('WildlifeAnimal', id);
    }
    return animal;
  }

  async getRecentLocations(animalId: string, limit = 20): Promise<LocationRecord[]> {
    // Validate animal exists first
    await this.getAnimalById(animalId);
    return wildlifeRepository.findRecentLocationsByAnimal(animalId, limit);
  }

  async ingestLocation(data: {
    animalId: string;
    collarId: string;
    latitude: number;
    longitude: number;
    recordedAt: string;
  }): Promise<LocationRecord & { generatedAlert?: WildlifeRiskAlert }> {
    const animal = await wildlifeRepository.findAnimalById(data.animalId);
    if (!animal) {
      throw new NotFoundError('WildlifeAnimal', data.animalId);
    }

    const collar = await wildlifeRepository.findCollarById(data.collarId);
    if (!collar) {
      throw new NotFoundError('TrackingCollar', data.collarId);
    }

    if (collar.animalId !== data.animalId) {
      throw new BadRequestError(
        `Collar '${data.collarId}' is not assigned to animal '${data.animalId}' (assigned to '${collar.animalId || 'none'}')`
      );
    }

    const record = await wildlifeRepository.createLocationRecord({
      animalId: data.animalId,
      collarId: data.collarId,
      latitude: data.latitude,
      longitude: data.longitude,
      recordedAt: data.recordedAt,
      isSimulated: true,
    });

    // 1. Determine animal's park based on proximity
    let parkId: string | undefined;
    try {
      const parks = await parkRepository.findAll();
      if (parks.length > 0) {
        let closestPark = parks[0];
        let minDistance = calculateHaversineDistanceKm(
          data.latitude,
          data.longitude,
          closestPark.latitude,
          closestPark.longitude
        );

        for (let i = 1; i < parks.length; i++) {
          const dist = calculateHaversineDistanceKm(
            data.latitude,
            data.longitude,
            parks[i].latitude,
            parks[i].longitude
          );
          if (dist < minDistance) {
            minDistance = dist;
            closestPark = parks[i];
          }
        }
        parkId = closestPark.id;
      }
    } catch {
      // Park determination fallback
    }

    // 2. Retrieve relevant active risk zones (prefer matching park, fallback to all active)
    let riskZones: RiskZone[] = [];
    try {
      if (parkId) {
        riskZones = await wildlifeRepository.findAllRiskZones(parkId);
      }
      if (riskZones.length === 0) {
        riskZones = await wildlifeRepository.findAllRiskZones();
      }
    } catch {
      riskZones = [];
    }

    // 3. Evaluate point against each risk-zone polygon
    const point: PolygonPoint = {
      latitude: data.latitude,
      longitude: data.longitude,
    };

    const matchingZones: RiskZone[] = [];
    for (const zone of riskZones) {
      try {
        let coords: PolygonPoint[] = zone.boundaryCoordinates;
        if (typeof coords === 'string') {
          coords = JSON.parse(coords);
        }
        if (Array.isArray(coords) && coords.length >= 3) {
          if (isPointInPolygon(point, coords)) {
            matchingZones.push(zone);
          }
        }
      } catch {
        // Malformed polygon geometry must not crash ingestion
      }
    }

    // 4. If outside all relevant zones, return location record without alert
    if (matchingZones.length === 0) {
      return record;
    }

    // 5. If inside multiple zones, select the highest-risk zone (LOW < MEDIUM < HIGH < CRITICAL)
    matchingZones.sort((a, b) => {
      const weightA = RISK_LEVEL_ORDER[a.riskLevel] || 0;
      const weightB = RISK_LEVEL_ORDER[b.riskLevel] || 0;
      if (weightB !== weightA) {
        return weightB - weightA;
      }
      return a.name.localeCompare(b.name);
    });
    const selectedZone = matchingZones[0];

    // 6. Check duplicate active alert protection (ACTIVE, ACKNOWLEDGED, or RESPONDING)
    const existingActiveAlert = await wildlifeRepository.findActiveAlertForAnimalAndZone(
      data.animalId,
      selectedZone.id
    );

    let generatedAlert: WildlifeRiskAlert | undefined;
    if (!existingActiveAlert) {
      generatedAlert = await wildlifeRepository.createAlert({
        animalId: data.animalId,
        riskZoneId: selectedZone.id,
        locationRecordId: record.id,
        severity: selectedZone.riskLevel,
        status: AlertStatus.ACTIVE,
        generatedAt: data.recordedAt || new Date().toISOString(),
        notes: `Automated geofence breach: ${animal.name} (${animal.species}) detected inside ${selectedZone.name} (${selectedZone.riskLevel} risk)`,
      });
    }

    return {
      ...record,
      generatedAlert,
    };
  }

  async getRiskZones(parkId?: string): Promise<RiskZone[]> {
    return wildlifeRepository.findAllRiskZones(parkId);
  }

  async getRiskZoneById(id: string): Promise<RiskZone> {
    const zone = await wildlifeRepository.findRiskZoneById(id);
    if (!zone) {
      throw new NotFoundError('RiskZone', id);
    }
    return zone;
  }

  async getAlerts(filter?: { status?: AlertStatus; animalId?: string }): Promise<WildlifeRiskAlert[]> {
    return wildlifeRepository.findAlerts(filter);
  }

  async getAlertById(id: string): Promise<WildlifeRiskAlert> {
    const alert = await wildlifeRepository.findAlertById(id);
    if (!alert) {
      throw new NotFoundError('WildlifeRiskAlert', id);
    }
    return alert;
  }

  async respondToAlert(
    alertId: string,
    data: {
      responderId: string;
      actionTaken: string;
      status: ResponseStatus;
      notes?: string;
    }
  ): Promise<AlertResponse> {
    const alert = await this.getAlertById(alertId);

    const responder = await userRepository.findById(data.responderId);
    if (!responder) {
      throw new NotFoundError('Staff User', data.responderId);
    }

    const allowedRoles = ['RANGER', 'COMMUNITY_LIAISON_OFFICER', 'PARK_MANAGER'];
    if (!allowedRoles.includes(responder.role)) {
      throw new BadRequestError(`User '${responder.fullName}' with role '${responder.role}' cannot respond to risk alerts`);
    }

    const response = await wildlifeRepository.createAlertResponse({
      alertId,
      responderId: data.responderId,
      actionTaken: data.actionTaken,
      status: data.status,
      notes: data.notes,
    });

    // Update alert status based on response
    let nextAlertStatus: AlertStatus = AlertStatus.RESPONDING;
    if (data.status === ResponseStatus.COMPLETED) {
      nextAlertStatus = AlertStatus.RESOLVED;
    } else if (data.status === ResponseStatus.INITIATED && alert.status === AlertStatus.ACTIVE) {
      nextAlertStatus = AlertStatus.RESPONDING;
    }

    await wildlifeRepository.updateAlertStatus(alertId, nextAlertStatus);

    return response;
  }

}

export const wildlifeService = new WildlifeService();
