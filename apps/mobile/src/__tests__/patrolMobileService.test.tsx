import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PatrolStatus } from '@wildlife/shared';
import { MobileApiError, mobileApiClient } from '../api/apiClient';
import { persistentStorage } from '../storage/persistentStorage';
import { PatrolMobileService } from '../features/uc01-patrol/services/patrolMobileService';

vi.mock('../api/apiClient', () => ({
  mobileApiClient: {
    getAuthToken: vi.fn(),
    setAuthToken: vi.fn(),
    startPatrol: vi.fn(),
    completePatrol: vi.fn(),
  },
  MobileApiError: class MobileApiError extends Error {
    constructor(message: string, public status: number) {
      super(message);
    }
  },
}));

vi.mock('../storage/persistentStorage', () => ({
  persistentStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

const activePatrol = {
  id: 'patrol-1',
  patrolCode: 'PAT-1',
  parkId: 'park-1',
  rangerId: 'ranger-1',
  patrolRouteId: 'route-1',
  status: PatrolStatus.ACTIVE,
  startTime: '2026-10-09T06:00:00.000Z',
  coverageScore: 70,
  createdAt: '2026-10-09T06:00:00.000Z',
  updatedAt: '2026-10-09T06:00:00.000Z',
};

describe('PatrolMobileService.startPatrol', () => {
  const service = new PatrolMobileService();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mobileApiClient.getAuthToken).mockReturnValue('v1.signed.payload');
    vi.mocked(persistentStorage.getItem).mockResolvedValue(null);
  });

  it('returns and caches the server-confirmed active patrol', async () => {
    vi.mocked(mobileApiClient.startPatrol).mockResolvedValue(activePatrol);

    await expect(service.startPatrol(activePatrol.id)).resolves.toEqual(activePatrol);
    expect(mobileApiClient.startPatrol).toHaveBeenCalledWith(activePatrol.id);
    expect(persistentStorage.setItem).toHaveBeenCalledWith(
      `wildlife_mobile_patrol_detail_${activePatrol.id}`,
      JSON.stringify(activePatrol)
    );
  });

  it('rejects a server response that does not confirm the active status', async () => {
    vi.mocked(mobileApiClient.startPatrol).mockResolvedValue({
      ...activePatrol,
      status: PatrolStatus.PLANNED,
    });

    await expect(service.startPatrol(activePatrol.id)).rejects.toThrow(
      /server did not confirm patrol startup/i
    );
    expect(persistentStorage.setItem).not.toHaveBeenCalled();
  });

  it('does not submit startup without an authenticated Ranger session', async () => {
    vi.mocked(mobileApiClient.getAuthToken).mockReturnValue(null);

    await expect(service.startPatrol(activePatrol.id)).rejects.toThrow(
      /Ranger session is not authenticated/i
    );
    expect(mobileApiClient.startPatrol).not.toHaveBeenCalled();
  });

  it('clears an expired Ranger token and reports that reauthentication is required', async () => {
    vi.mocked(mobileApiClient.startPatrol).mockRejectedValue(
      new MobileApiError('Session expired', 401)
    );

    await expect(service.startPatrol(activePatrol.id)).rejects.toThrow(
      /session has expired.*sign in online again/i
    );
    expect(mobileApiClient.setAuthToken).toHaveBeenCalledWith(null);
    expect(persistentStorage.setItem).not.toHaveBeenCalled();
  });
});

describe('PatrolMobileService.completePatrol', () => {
  const service = new PatrolMobileService();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mobileApiClient.getAuthToken).mockReturnValue('v1.signed.payload');
    vi.mocked(persistentStorage.getItem).mockResolvedValue(null);
  });

  it('returns and caches the server-confirmed completed patrol', async () => {
    const completed = {
      ...activePatrol,
      status: PatrolStatus.COMPLETED,
      endTime: '2026-10-09T10:00:00.000Z',
    };
    vi.mocked(mobileApiClient.completePatrol).mockResolvedValue(completed);

    await expect(service.completePatrol(activePatrol.id)).resolves.toEqual(completed);
    expect(mobileApiClient.completePatrol).toHaveBeenCalledWith(activePatrol.id);
    expect(persistentStorage.setItem).toHaveBeenCalledWith(
      `wildlife_mobile_patrol_detail_${activePatrol.id}`,
      JSON.stringify(completed)
    );
  });

  it('refuses to report success or cache a response that is still active', async () => {
    vi.mocked(mobileApiClient.completePatrol).mockResolvedValue(activePatrol);

    await expect(service.completePatrol(activePatrol.id)).rejects.toThrow(
      /server did not confirm patrol completion/i
    );
    expect(persistentStorage.setItem).not.toHaveBeenCalled();
  });

  it('does not send a completion request without a Ranger session token', async () => {
    vi.mocked(mobileApiClient.getAuthToken).mockReturnValue(null);

    await expect(service.completePatrol(activePatrol.id)).rejects.toThrow(
      /Ranger session is not authenticated/i
    );
    expect(mobileApiClient.completePatrol).not.toHaveBeenCalled();
  });

  it('clears an expired token and reports that the Ranger must sign in again', async () => {
    vi.mocked(mobileApiClient.completePatrol).mockRejectedValue(
      new MobileApiError('Session expired', 401)
    );

    await expect(service.completePatrol(activePatrol.id)).rejects.toThrow(
      /session has expired.*sign in online again/i
    );
    expect(mobileApiClient.setAuthToken).toHaveBeenCalledWith(null);
    expect(persistentStorage.setItem).not.toHaveBeenCalled();
  });
});
