import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Patrol, PatrolStatus } from '@wildlife/shared';
import { BadRequestError, ForbiddenError } from '../src/errors/AppError';
import { AuthenticatedUser } from '../src/middleware/auth';
import { patrolRepository } from '../src/repositories/patrolRepository';
import { PatrolService } from '../src/services/patrolService';

vi.mock('../src/repositories/patrolRepository', () => ({
  patrolRepository: {
    startPatrol: vi.fn(),
    completePatrol: vi.fn(),
    findById: vi.fn(),
    addWaypoint: vi.fn(),
  },
}));

const ranger: AuthenticatedUser = {
  id: 'ranger-1',
  email: 'ranger@example.test',
  fullName: 'Test Ranger',
  role: 'RANGER',
};

const patrol = (status: PatrolStatus, rangerId = ranger.id): Patrol => ({
  id: 'patrol-1',
  patrolCode: 'PAT-1',
  parkId: 'park-1',
  rangerId,
  patrolRouteId: 'route-1',
  status,
  startTime: '2026-06-20T06:00:00.000Z',
  coverageScore: 0,
  createdAt: '2026-06-20T06:00:00.000Z',
  updatedAt: '2026-06-20T06:00:00.000Z',
});

describe('PatrolService Ranger ownership', () => {
  const service = new PatrolService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not start a patrol without an authenticated Ranger', async () => {
    await expect(service.startPatrol('patrol-1')).rejects.toBeInstanceOf(ForbiddenError);
    expect(patrolRepository.startPatrol).not.toHaveBeenCalled();
  });

  it('rejects starting another Ranger’s patrol', async () => {
    vi.mocked(patrolRepository.startPatrol).mockResolvedValue(null);
    vi.mocked(patrolRepository.findById).mockResolvedValue(patrol(PatrolStatus.PLANNED, 'ranger-2'));

    await expect(service.startPatrol('patrol-1', ranger)).rejects.toBeInstanceOf(ForbiddenError);
    expect(patrolRepository.startPatrol).toHaveBeenCalledWith('patrol-1', ranger.id);
  });

  it('allows the assigned Ranger to start a planned patrol using the guarded repository update', async () => {
    const activePatrol = patrol(PatrolStatus.ACTIVE);
    vi.mocked(patrolRepository.startPatrol).mockResolvedValue(activePatrol);

    await expect(service.startPatrol('patrol-1', ranger)).resolves.toBe(activePatrol);
    expect(patrolRepository.startPatrol).toHaveBeenCalledWith('patrol-1', ranger.id);
  });

  it('completes the assigned Ranger’s active patrol', async () => {
    const completedPatrol = patrol(PatrolStatus.COMPLETED);
    vi.mocked(patrolRepository.completePatrol).mockResolvedValue(completedPatrol);

    await expect(service.completePatrol('patrol-1', ranger)).resolves.toBe(completedPatrol);
    expect(patrolRepository.completePatrol).toHaveBeenCalledWith('patrol-1', ranger.id);
  });

  it('rejects completion when the active patrol belongs to a different Ranger', async () => {
    vi.mocked(patrolRepository.completePatrol).mockResolvedValue(null);
    vi.mocked(patrolRepository.findById).mockResolvedValue(
      patrol(PatrolStatus.ACTIVE, 'ranger-2')
    );

    await expect(service.completePatrol('patrol-1', ranger)).rejects.toBeInstanceOf(ForbiddenError);
    expect(patrolRepository.completePatrol).toHaveBeenCalledWith('patrol-1', ranger.id);
  });

  it('rejects completion when the assigned patrol is not active', async () => {
    vi.mocked(patrolRepository.completePatrol).mockResolvedValue(null);
    vi.mocked(patrolRepository.findById).mockResolvedValue(patrol(PatrolStatus.PLANNED));

    await expect(service.completePatrol('patrol-1', ranger)).rejects.toBeInstanceOf(BadRequestError);
  });

  it('rejects waypoint writes unless the assigned Ranger owns an active patrol', async () => {
    vi.mocked(patrolRepository.findById).mockResolvedValue(patrol(PatrolStatus.PLANNED));

    await expect(
      service.addWaypoint('patrol-1', { latitude: 1, longitude: 2 }, ranger)
    ).rejects.toBeInstanceOf(BadRequestError);
    expect(patrolRepository.addWaypoint).not.toHaveBeenCalled();
  });
});
