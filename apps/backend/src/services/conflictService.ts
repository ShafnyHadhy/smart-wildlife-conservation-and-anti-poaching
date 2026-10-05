import { conflictRepository } from '../repositories/conflictRepository';
import { userRepository } from '../repositories/userRepository';
import { parkRepository } from '../repositories/parkRepository';
import { ConflictReport, ConflictType, ConflictStatus, isValidCoordinate } from '@wildlife/shared';
import { NotFoundError, ValidationError } from '../errors/AppError';

export class ConflictService {
  async getConflicts(filter?: {
    status?: ConflictStatus;
    parkId?: string;
    communityMemberId?: string;
    conflictType?: ConflictType;
  }): Promise<ConflictReport[]> {
    return conflictRepository.findAll(filter);
  }

  async getConflictById(id: string): Promise<ConflictReport> {
    const report = await conflictRepository.findById(id);
    if (!report) {
      throw new NotFoundError('ConflictReport', id);
    }
    return report;
  }

  async createConflictReport(data: {
    communityMemberId: string;
    parkId?: string | null;
    conflictType: ConflictType;
    description: string;
    latitude: number;
    longitude: number;
    reportedAt?: string;
    clientMutationId?: string;
  }): Promise<ConflictReport> {
    if (!isValidCoordinate(data.latitude, data.longitude)) {
      throw new ValidationError('Latitude must be between -90 and 90, and longitude between -180 and 180', [
        { field: 'coordinates', message: `Invalid coordinates: (${data.latitude}, ${data.longitude})` },
      ]);
    }

    // Idempotent return if already submitted
    if (data.clientMutationId) {
      const existing = await conflictRepository.findByClientMutationId(data.clientMutationId);
      if (existing) {
        return existing;
      }
    }

    const member = await userRepository.findCommunityMemberById(data.communityMemberId);
    if (!member) {
      throw new NotFoundError('Community Member', data.communityMemberId);
    }

    if (data.parkId) {
      const park = await parkRepository.findById(data.parkId);
      if (!park) {
        throw new NotFoundError('Park', data.parkId);
      }
    }

    return conflictRepository.create({

      communityMemberId: data.communityMemberId,
      parkId: data.parkId || undefined,
      conflictType: data.conflictType,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
      reportedAt: data.reportedAt,
      clientMutationId: data.clientMutationId,
    });
  }

  async updateStatus(id: string, status: ConflictStatus): Promise<ConflictReport> {
    const updated = await conflictRepository.updateStatus(id, status);
    if (!updated) {
      throw new NotFoundError('ConflictReport', id);
    }
    return updated;
  }
}

export const conflictService = new ConflictService();
