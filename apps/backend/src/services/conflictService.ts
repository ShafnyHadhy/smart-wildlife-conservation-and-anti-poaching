import { conflictRepository } from '../repositories/conflictRepository';
import { userRepository } from '../repositories/userRepository';
import { parkRepository } from '../repositories/parkRepository';
import {
  ConflictReport,
  ConflictType,
  ConflictStatus,
  ConflictStats,
  isValidCoordinate,
  calculateHaversineDistanceKm,
} from '@wildlife/shared';
import { NotFoundError, ValidationError } from '../errors/AppError';

export class ConflictService {
  /**
   * Evaluates potential duplicate conflict reports within a 1.5 km radius and 6-hour window.
   */
  async checkForDuplicate(
    latitude: number,
    longitude: number,
    reportedAt?: string,
    excludeReportId?: string
  ): Promise<{ duplicateOf?: string; distanceKm?: number }> {
    const allReports = await conflictRepository.findAll();
    const targetTime = reportedAt ? new Date(reportedAt).getTime() : Date.now();
    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
    const MAX_DUPLICATE_RADIUS_KM = 1.5;

    for (const report of allReports) {
      if (excludeReportId && report.id === excludeReportId) {
        continue;
      }
      const reportTime = new Date(report.reportedAt).getTime();
      const timeDiff = Math.abs(targetTime - reportTime);
      if (timeDiff <= SIX_HOURS_MS) {
        const distance = calculateHaversineDistanceKm(
          latitude,
          longitude,
          report.latitude,
          report.longitude
        );
        if (distance <= MAX_DUPLICATE_RADIUS_KM) {
          return { duplicateOf: report.id, distanceKm: distance };
        }
      }
    }
    return {};
  }

  async getConflicts(filter?: {
    status?: ConflictStatus;
    parkId?: string;
    communityMemberId?: string;
    conflictType?: ConflictType;
    search?: string;
  }): Promise<ConflictReport[]> {
    let reports = await conflictRepository.findAll(filter);

    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      reports = reports.filter(
        (r) =>
          r.description?.toLowerCase().includes(q) ||
          r.villageName?.toLowerCase().includes(q) ||
          r.reporterName?.toLowerCase().includes(q) ||
          r.conflictType?.toLowerCase().includes(q)
      );
    }

    return reports;
  }

  async getConflictById(id: string): Promise<ConflictReport> {
    const report = await conflictRepository.findById(id);
    if (!report) {
      throw new NotFoundError('ConflictReport', id);
    }
    return report;
  }

  async getStats(parkId?: string): Promise<ConflictStats> {
    const reports = await conflictRepository.findAll(parkId ? { parkId } : undefined);

    const stats: ConflictStats = {
      total: reports.length,
      submitted: 0,
      underReview: 0,
      responding: 0,
      resolved: 0,
      closed: 0,
      cropDamageCount: 0,
      elephantHumanCount: 0,
      propertyDamageCount: 0,
      livestockAttackCount: 0,
    };

    for (const r of reports) {
      if (r.status === ConflictStatus.SUBMITTED) stats.submitted++;
      else if (r.status === ConflictStatus.UNDER_REVIEW) stats.underReview++;
      else if (r.status === ConflictStatus.RESPONDING) stats.responding++;
      else if (r.status === ConflictStatus.RESOLVED) stats.resolved++;
      else if (r.status === ConflictStatus.CLOSED) stats.closed++;

      if (r.conflictType === ConflictType.CROP_DAMAGE) stats.cropDamageCount++;
      else if (r.conflictType === ConflictType.ELEPHANT_HUMAN_CONFLICT || r.conflictType === ConflictType.ANIMAL_INTRUSION) stats.elephantHumanCount++;
      else if (r.conflictType === ConflictType.PROPERTY_DAMAGE) stats.propertyDamageCount++;
      else if (r.conflictType === ConflictType.LIVESTOCK_ATTACK) stats.livestockAttackCount++;
    }

    return stats;
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
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
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

    // Intelligent Duplicate Detection (1.5 km & 6-hour window)
    const duplicateCheck = await this.checkForDuplicate(
      data.latitude,
      data.longitude,
      data.reportedAt
    );

    return conflictRepository.create({
      communityMemberId: data.communityMemberId,
      parkId: data.parkId || undefined,
      conflictType: data.conflictType,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
      reportedAt: data.reportedAt,
      clientMutationId: data.clientMutationId,
      severity: data.severity,
      potentialDuplicateOf: duplicateCheck.duplicateOf,
      distanceToDuplicateKm: duplicateCheck.distanceKm,
    });
  }

  async updateStatus(
    id: string,
    status: ConflictStatus,
    triageNotes?: string,
    mitigationAction?: string
  ): Promise<ConflictReport> {
    const updated = await conflictRepository.updateStatus(id, status, triageNotes, mitigationAction);
    if (!updated) {
      throw new NotFoundError('ConflictReport', id);
    }
    return updated;
  }
}

export const conflictService = new ConflictService();
