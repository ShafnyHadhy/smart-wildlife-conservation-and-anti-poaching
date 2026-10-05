import { wildlifeRepository } from '../repositories/wildlifeRepository';
import { userRepository } from '../repositories/userRepository';
import {
  WildlifeAnimal,
  LocationRecord,
  RiskZone,
  WildlifeRiskAlert,
  AlertResponse,
  AlertStatus,
  ResponseStatus,
} from '@wildlife/shared';
import { NotFoundError, BadRequestError } from '../errors/AppError';

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
  }): Promise<LocationRecord> {
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

    return wildlifeRepository.createLocationRecord({
      animalId: data.animalId,
      collarId: data.collarId,
      latitude: data.latitude,
      longitude: data.longitude,
      recordedAt: data.recordedAt,
      isSimulated: true,
    });

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
