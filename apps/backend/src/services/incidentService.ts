import { incidentRepository } from '../repositories/incidentRepository';
import { userRepository } from '../repositories/userRepository';
import { patrolRepository } from '../repositories/patrolRepository';
import {
  Incident,
  IncidentType,
  IncidentStatus,
  EvidenceType,
  SupportingEvidence,
  isValidCoordinate,
} from '@wildlife/shared';
import { NotFoundError, BadRequestError, ValidationError } from '../errors/AppError';

export class IncidentService {
  async getIncidents(filter?: {
    status?: IncidentStatus;
    rangerId?: string;
    patrolId?: string;
    incidentType?: IncidentType;
  }): Promise<Incident[]> {
    return incidentRepository.findAll(filter);
  }

  async getIncidentById(id: string): Promise<Incident> {
    const incident = await incidentRepository.findById(id);
    if (!incident) {
      throw new NotFoundError('Incident', id);
    }
    return incident;
  }

  async createIncident(data: {
    rangerId: string;
    patrolId?: string | null;
    incidentType: IncidentType;
    description: string;
    latitude: number;
    longitude: number;
    reportedAt?: string;
    clientMutationId?: string;
  }): Promise<Incident> {
    if (!isValidCoordinate(data.latitude, data.longitude)) {
      throw new ValidationError('Latitude must be between -90 and 90, and longitude between -180 and 180', [
        { field: 'coordinates', message: `Invalid coordinates: (${data.latitude}, ${data.longitude})` },
      ]);
    }

    // Idempotent return if already submitted
    if (data.clientMutationId) {
      const existing = await incidentRepository.findByClientMutationId(data.clientMutationId);
      if (existing) {
        return existing;
      }
    }

    const ranger = await userRepository.findById(data.rangerId);
    if (!ranger) {
      throw new NotFoundError('Ranger User', data.rangerId);
    }
    if (ranger.role !== 'RANGER') {
      throw new BadRequestError(`User '${ranger.fullName}' has role '${ranger.role}', not 'RANGER'. Only rangers can file incident reports.`);
    }

    if (data.patrolId) {
      const patrol = await patrolRepository.findById(data.patrolId);
      if (!patrol) {
        throw new NotFoundError('Patrol', data.patrolId);
      }
    }


    return incidentRepository.create({

      rangerId: data.rangerId,
      patrolId: data.patrolId || undefined,
      incidentType: data.incidentType,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
      reportedAt: data.reportedAt,
      clientMutationId: data.clientMutationId,
    });
  }

  async addEvidence(
    incidentId: string,
    data: {
      evidenceType?: EvidenceType;
      filePath: string;
      fileName?: string;
      fileType?: string;
      capturedAt?: string;
      notes?: string;
    }
  ): Promise<SupportingEvidence> {
    const incident = await incidentRepository.findById(incidentId);

    if (!incident) {
      throw new NotFoundError('Incident', incidentId);
    }

    return incidentRepository.addEvidence({
      incidentId,
      evidenceType: data.evidenceType || EvidenceType.PHOTO,
      filePath: data.filePath,
      fileName: data.fileName,
      fileType: data.fileType,
      capturedAt: data.capturedAt,
      notes: data.notes,
    });
  }
}

export const incidentService = new IncidentService();