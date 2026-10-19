import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PatrolRoute, User, UserRole } from '@wildlife/shared';
import { CreatePatrolModal } from './CreatePatrolModal';
import { webPatrolService } from '../services/patrolService';

vi.mock('../services/patrolService', () => ({
  webPatrolService: {
    fetchRangers: vi.fn(),
    createPatrol: vi.fn(),
  },
}));

const ranger: User = {
  id: 'ranger-db-id-123',
  fullName: 'Active Ranger',
  email: 'ranger@example.test',
  role: UserRole.RANGER,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const route: PatrolRoute = {
  id: 'route-db-id-123',
  parkId: 'park-db-id-123',
  parkName: 'Test Park',
  name: 'North Route',
  code: 'NORTH-1',
  estimatedDurationMinutes: 60,
  routeType: 'FOOT',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  waypoints: [],
};

describe('CreatePatrolModal Ranger assignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(webPatrolService.fetchRangers).mockResolvedValue([ranger]);
    vi.mocked(webPatrolService.createPatrol).mockResolvedValue({} as never);
  });

  it('uses the selected active Ranger database ID when creating an assignment', async () => {
    render(
      <CreatePatrolModal
        routes={[route]}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />
    );

    await waitFor(() => expect(webPatrolService.fetchRangers).toHaveBeenCalledOnce());
    fireEvent.change(screen.getByLabelText(/Park/), { target: { value: route.parkId } });
    fireEvent.change(screen.getByLabelText(/Route/), { target: { value: route.id } });
    fireEvent.change(screen.getByLabelText(/Assigned Ranger/), { target: { value: ranger.id } });
    fireEvent.change(screen.getByLabelText(/Patrol Code/), { target: { value: 'PAT-TEST-001' } });
    fireEvent.change(screen.getByLabelText(/Start Date & Time/), {
      target: { value: '2030-01-01T08:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Create Patrol/ }));

    await waitFor(() => {
      expect(webPatrolService.createPatrol).toHaveBeenCalledWith(
        expect.objectContaining({
          rangerId: ranger.id,
          parkId: route.parkId,
          patrolRouteId: route.id,
        })
      );
    });
  });

  it('shows a retryable error if Ranger loading fails', async () => {
    vi.mocked(webPatrolService.fetchRangers).mockRejectedValueOnce(
      new Error('Ranger list unavailable')
    );
    render(
      <CreatePatrolModal
        routes={[route]}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Ranger list unavailable');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
