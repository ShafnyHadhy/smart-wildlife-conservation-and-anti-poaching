import { beforeEach, describe, expect, it, vi } from 'vitest';
import { User, UserRole } from '@wildlife/shared';
import { apiClient } from '../../../services/apiClient';
import { webPatrolService } from './patrolService';

vi.mock('../../../services/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

const activeRanger: User = {
  id: 'active-ranger-db-id',
  fullName: 'Active Ranger',
  email: 'active@example.test',
  role: UserRole.RANGER,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('webPatrolService.fetchRangers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests Ranger accounts and returns only active Rangers with their database IDs', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([
      activeRanger,
      { ...activeRanger, id: 'inactive-ranger-db-id', isActive: false },
    ]);

    await expect(webPatrolService.fetchRangers()).resolves.toEqual([activeRanger]);
    expect(apiClient.get).toHaveBeenCalledWith(`/users?role=${UserRole.RANGER}`);
  });
});
