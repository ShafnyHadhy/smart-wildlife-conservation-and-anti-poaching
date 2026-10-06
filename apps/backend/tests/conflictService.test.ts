import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictService } from '../src/services/conflictService';
import { conflictRepository } from '../src/repositories/conflictRepository';
import { userRepository } from '../src/repositories/userRepository';
import { parkRepository } from '../src/repositories/parkRepository';
import {
  ConflictType,
  ConflictStatus,
  calculateHaversineDistanceKm,
} from '@wildlife/shared';
import { ValidationError, NotFoundError } from '../src/errors/AppError';

vi.mock('../src/repositories/conflictRepository', () => ({
  conflictRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    findByClientMutationId: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

vi.mock('../src/repositories/userRepository', () => ({
  userRepository: {
    findCommunityMemberById: vi.fn(),
  },
}));

vi.mock('../src/repositories/parkRepository', () => ({
  parkRepository: {
    findById: vi.fn(),
  },
}));

describe('UC04: ConflictService Unit Tests', () => {
  let service: ConflictService;

  const mockMemberId = 'bbbb0001-0000-0000-0000-000000000001';
  const mockParkId = '11111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ConflictService();

    // Default mocks
    vi.mocked(userRepository.findCommunityMemberById).mockResolvedValue({
      id: mockMemberId,
      fullName: 'Gamini Senanayake',
      phoneNumber: '+94711112233',
      villageName: 'Palatupana',
    } as any);

    vi.mocked(parkRepository.findById).mockResolvedValue({
      id: mockParkId,
      name: 'Yala National Park',
    } as any);
  });

  describe('Haversine Distance Precision & Math', () => {
    it('calculates 0 km distance for identical coordinates', () => {
      const dist = calculateHaversineDistanceKm(6.368, 81.332, 6.368, 81.332);
      expect(dist).toBe(0);
    });

    it('accurately calculates distance between Palatupana and Kataragama (~12 km)', () => {
      // Palatupana (6.273, 81.436) to Kataragama (6.413, 81.332)
      const dist = calculateHaversineDistanceKm(6.273, 81.436, 6.413, 81.332);
      expect(dist).toBeGreaterThan(15);
      expect(dist).toBeLessThan(25);
    });

    it('calculates sub-kilometer proximity within buffer zones (~400m)', () => {
      // Two points separated by ~0.003 degrees in latitude
      const dist = calculateHaversineDistanceKm(6.368, 81.332, 6.371, 81.332);
      expect(dist).toBeGreaterThan(0.3);
      expect(dist).toBeLessThan(0.5);
    });
  });

  describe('Coordinate Validation', () => {
    it('throws ValidationError when latitude is out of bounds', async () => {
      await expect(
        service.createConflictReport({
          communityMemberId: mockMemberId,
          conflictType: ConflictType.CROP_DAMAGE,
          description: 'Elephant damaged crop',
          latitude: 95.0, // Invalid!
          longitude: 81.332,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when longitude is out of bounds', async () => {
      await expect(
        service.createConflictReport({
          communityMemberId: mockMemberId,
          conflictType: ConflictType.CROP_DAMAGE,
          description: 'Elephant damaged crop',
          latitude: 6.368,
          longitude: 195.0, // Invalid!
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Intelligent Duplicate Detection (1.5 km & 6-Hour Rule)', () => {
    it('flags potential duplicate when incident is within 1.5 km and reported within 6 hours', async () => {
      const existingReport = {
        id: 'conf-existing-1',
        communityMemberId: mockMemberId,
        conflictType: ConflictType.CROP_DAMAGE,
        description: 'Herd of 3 elephants raiding banana plantation',
        latitude: 6.368,
        longitude: 81.332,
        status: ConflictStatus.UNDER_REVIEW,
        reportedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(conflictRepository.findAll).mockResolvedValue([existingReport as any]);
      vi.mocked(conflictRepository.create).mockImplementation(async (data: any) => ({
        id: 'conf-new-1',
        ...data,
        status: ConflictStatus.SUBMITTED,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      // Nearby point (~500m away) reported now
      const result = await service.createConflictReport({
        communityMemberId: mockMemberId,
        parkId: mockParkId,
        conflictType: ConflictType.CROP_DAMAGE,
        description: 'Same elephant herd sighted at neighbor fence',
        latitude: 6.371,
        longitude: 81.332,
        reportedAt: new Date().toISOString(),
      });

      expect(result.potentialDuplicateOf).toBe('conf-existing-1');
      expect(result.distanceToDuplicateKm).toBeDefined();
      expect(result.distanceToDuplicateKm).toBeLessThanOrEqual(1.5);
    });

    it('does NOT flag duplicate when distance exceeds 1.5 km', async () => {
      const existingFarReport = {
        id: 'conf-far-1',
        communityMemberId: mockMemberId,
        conflictType: ConflictType.CROP_DAMAGE,
        description: 'Faraway incident in Wilpattu',
        latitude: 8.435, // Far away
        longitude: 80.021,
        status: ConflictStatus.UNDER_REVIEW,
        reportedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(conflictRepository.findAll).mockResolvedValue([existingFarReport as any]);
      vi.mocked(conflictRepository.create).mockImplementation(async (data: any) => ({
        id: 'conf-new-2',
        ...data,
        status: ConflictStatus.SUBMITTED,
      }));

      const result = await service.createConflictReport({
        communityMemberId: mockMemberId,
        conflictType: ConflictType.CROP_DAMAGE,
        description: 'Local report in Yala buffer',
        latitude: 6.368,
        longitude: 81.332,
      });

      expect(result.potentialDuplicateOf).toBeUndefined();
    });

    it('does NOT flag duplicate when report is older than 6 hours', async () => {
      const oldReport = {
        id: 'conf-old-1',
        communityMemberId: mockMemberId,
        conflictType: ConflictType.CROP_DAMAGE,
        description: 'Yesterday incident at same location',
        latitude: 6.368,
        longitude: 81.332,
        status: ConflictStatus.RESOLVED,
        reportedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(conflictRepository.findAll).mockResolvedValue([oldReport as any]);
      vi.mocked(conflictRepository.create).mockImplementation(async (data: any) => ({
        id: 'conf-new-3',
        ...data,
        status: ConflictStatus.SUBMITTED,
      }));

      const result = await service.createConflictReport({
        communityMemberId: mockMemberId,
        conflictType: ConflictType.CROP_DAMAGE,
        description: 'New fresh incident at same spot',
        latitude: 6.368,
        longitude: 81.332,
      });

      expect(result.potentialDuplicateOf).toBeUndefined();
    });
  });

  describe('Offline Idempotency via clientMutationId', () => {
    it('returns existing conflict report on duplicate clientMutationId without re-inserting', async () => {
      const existing = {
        id: 'conf-cached-1',
        clientMutationId: 'mut-hwc-unique-123',
        description: 'Existing stored report',
        status: ConflictStatus.SUBMITTED,
      };

      vi.mocked(conflictRepository.findByClientMutationId).mockResolvedValue(existing as any);

      const result = await service.createConflictReport({
        communityMemberId: mockMemberId,
        conflictType: ConflictType.PROPERTY_DAMAGE,
        description: 'Replayed submission from mobile phone',
        latitude: 6.368,
        longitude: 81.332,
        clientMutationId: 'mut-hwc-unique-123',
      });

      expect(result.id).toBe('conf-cached-1');
      expect(conflictRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('Triage Workflow & Status Transitions', () => {
    it('updates status and applies triage notes and mitigation action', async () => {
      const updatedMock = {
        id: 'conf-1',
        status: ConflictStatus.RESPONDING,
        triageNotes: 'Elephant Chaser Unit dispatched with flash flares',
        mitigationAction: 'DISPATCH_CHASER_UNIT',
      };

      vi.mocked(conflictRepository.updateStatus).mockResolvedValue(updatedMock as any);

      const result = await service.updateStatus(
        'conf-1',
        ConflictStatus.RESPONDING,
        'Elephant Chaser Unit dispatched with flash flares',
        'DISPATCH_CHASER_UNIT'
      );

      expect(result.status).toBe(ConflictStatus.RESPONDING);
      expect(result.triageNotes).toBe('Elephant Chaser Unit dispatched with flash flares');
      expect(conflictRepository.updateStatus).toHaveBeenCalledWith(
        'conf-1',
        ConflictStatus.RESPONDING,
        'Elephant Chaser Unit dispatched with flash flares',
        'DISPATCH_CHASER_UNIT'
      );
    });

    it('throws NotFoundError if report does not exist on status update', async () => {
      vi.mocked(conflictRepository.updateStatus).mockResolvedValue(null);

      await expect(
        service.updateStatus('non-existent-id', ConflictStatus.RESOLVED)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('Conflict Search & Filter Logic', () => {
    it('filters reports matching keyword search in description or village', async () => {
      const reports = [
        { id: '1', description: 'Elephants damaged paddy crops', villageName: 'Kataragama' },
        { id: '2', description: 'Broken boundary barbed wire', villageName: 'Palatupana' },
        { id: '3', description: 'Leopard attacked goat pen', villageName: 'Kittulkote' },
      ];

      vi.mocked(conflictRepository.findAll).mockResolvedValue(reports as any);

      const results = await service.getConflicts({ search: 'paddy' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');

      const villageResults = await service.getConflicts({ search: 'palatupana' });
      expect(villageResults).toHaveLength(1);
      expect(villageResults[0].id).toBe('2');
    });
  });

  describe('Conflict KPI Statistics Computation', () => {
    it('aggregates counts by status and conflict type correctly', async () => {
      const reports = [
        { status: ConflictStatus.SUBMITTED, conflictType: ConflictType.CROP_DAMAGE },
        { status: ConflictStatus.UNDER_REVIEW, conflictType: ConflictType.CROP_DAMAGE },
        { status: ConflictStatus.RESPONDING, conflictType: ConflictType.ELEPHANT_HUMAN_CONFLICT },
        { status: ConflictStatus.RESOLVED, conflictType: ConflictType.PROPERTY_DAMAGE },
        { status: ConflictStatus.CLOSED, conflictType: ConflictType.LIVESTOCK_ATTACK },
      ];

      vi.mocked(conflictRepository.findAll).mockResolvedValue(reports as any);

      const stats = await service.getStats();

      expect(stats.total).toBe(5);
      expect(stats.submitted).toBe(1);
      expect(stats.underReview).toBe(1);
      expect(stats.responding).toBe(1);
      expect(stats.resolved).toBe(1);
      expect(stats.closed).toBe(1);
      expect(stats.cropDamageCount).toBe(2);
      expect(stats.elephantHumanCount).toBe(1);
      expect(stats.propertyDamageCount).toBe(1);
      expect(stats.livestockAttackCount).toBe(1);
    });
  });
});
