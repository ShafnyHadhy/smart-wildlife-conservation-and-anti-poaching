import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PatrolsPage } from '../../pages/PatrolsPage';
import { webPatrolService } from './services/patrolService';
import { PatrolStatus } from '@wildlife/shared';

vi.mock('./services/patrolService', () => ({
  webPatrolService: {
    fetchPatrols: vi.fn(),
    fetchPatrolRoutes: vi.fn(),
    fetchPatrolById: vi.fn(),
    fetchPatrolRouteById: vi.fn(),
  },
  fetchPatrols: vi.fn(),
  fetchPatrolRoutes: vi.fn(),
  fetchPatrolById: vi.fn(),
  fetchPatrolRouteById: vi.fn(),
}));

describe('UC01: Web PatrolsPage & Patrol Service Connection', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(webPatrolService.fetchPatrols).mockResolvedValue([
      {
        id: 'patrol-1',
        patrolCode: 'PAT-2026-YAL-001',
        parkId: 'park-1',
        rangerId: 'ranger-1',
        patrolRouteId: 'route-1',
        status: PatrolStatus.ACTIVE,
        startTime: '2026-10-07T09:25:00.000Z',
        coverageScore: 65.5,
        notes: 'Coastal sweep',
        createdAt: '2026-10-07T09:00:00.000Z',
        updatedAt: '2026-10-07T09:00:00.000Z',
        rangerName: 'Kasun Bandara',
        routeName: 'Yala Block 1 Coastal Route',
        parkName: 'Yala National Park',
      },
      {
        id: 'patrol-2',
        patrolCode: 'PAT-2026-WIL-001',
        parkId: 'park-2',
        rangerId: 'ranger-2',
        patrolRouteId: 'route-2',
        status: PatrolStatus.PLANNED,
        startTime: '2026-10-07T14:00:00.000Z',
        coverageScore: 0,
        notes: 'Villu sweep',
        createdAt: '2026-10-07T09:00:00.000Z',
        updatedAt: '2026-10-07T09:00:00.000Z',
        rangerName: 'Chaminda Silva',
        routeName: 'Wilpattu West Villu Route',
        parkName: 'Wilpattu National Park',
      },
      {
        id: 'patrol-3',
        patrolCode: 'PAT-2026-YAL-002',
        parkId: 'park-1',
        rangerId: 'ranger-3',
        patrolRouteId: 'route-3',
        status: PatrolStatus.COMPLETED,
        startTime: '2026-10-06T06:00:00.000Z',
        coverageScore: 92,
        notes: 'Northern buffer sweep',
        createdAt: '2026-10-06T06:00:00.000Z',
        updatedAt: '2026-10-06T10:00:00.000Z',
        rangerName: 'Nimal Perera',
        routeName: 'Yala Northern Buffer Corridor',
        parkName: 'Yala National Park',
      },
    ]);

    vi.mocked(webPatrolService.fetchPatrolRoutes).mockResolvedValue([
      {
        id: 'route-1',
        parkId: 'park-1',
        name: 'Yala Block 1 Coastal Route',
        code: 'YALA-RT-01',
        description: 'Coastal patrol monitoring turtle nesting beaches',
        estimatedDurationMinutes: 240,
        routeType: 'FOOT_PATROL',
        isActive: true,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
      {
        id: 'route-2',
        parkId: 'park-2',
        name: 'Wilpattu West Villu Route',
        code: 'WIL-RT-01',
        description: 'Deep forest route covering interior villus',
        estimatedDurationMinutes: 300,
        routeType: 'FOOT_PATROL',
        isActive: true,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
    ]);
  });

  it('calls webPatrolService to fetch patrols and routes on mount', async () => {
    render(<PatrolsPage />);

    expect(screen.getByText('Patrol Monitoring Command')).toBeInTheDocument();
    expect(screen.getByText('UC01 SHELL')).toBeInTheDocument();

    await waitFor(() => {
      expect(webPatrolService.fetchPatrols).toHaveBeenCalledTimes(1);
      expect(webPatrolService.fetchPatrolRoutes).toHaveBeenCalledTimes(1);
    });
  });

  it('renders patrol records, Progress column, and route corridors in the UI', async () => {
    // Mock fetchPatrolById for patrol-1 returning 8 waypoints out of 10 expected (8 / 10 = 80%)
    vi.mocked(webPatrolService.fetchPatrolById).mockImplementation(async (id: string) => {
      if (id === 'patrol-1') {
        return {
          id: 'patrol-1',
          patrolCode: 'PAT-2026-YAL-001',
          parkId: 'park-1',
          rangerId: 'ranger-1',
          patrolRouteId: 'route-1',
          status: PatrolStatus.ACTIVE,
          startTime: '2026-10-07T09:25:00.000Z',
          coverageScore: 65.5,
          createdAt: '2026-10-07T09:00:00.000Z',
          updatedAt: '2026-10-07T09:00:00.000Z',
          expectedWaypoints: 10,
          waypoints: Array.from({ length: 8 }, (_, i) => ({
            id: `w-${i}`,
            latitude: 6.37 + i * 0.01,
            longitude: 81.51 + i * 0.01,
            sequenceOrder: i + 1,
            locationType: 'GPS' as any,
            recordedAt: new Date().toISOString(),
          })),
        } as any;
      }
      if (id === 'patrol-3') {
        // Completed patrol with all 10 expected waypoints recorded
        return {
          id: 'patrol-3',
          patrolCode: 'PAT-2026-YAL-002',
          parkId: 'park-1',
          rangerId: 'ranger-3',
          patrolRouteId: 'route-3',
          status: PatrolStatus.COMPLETED,
          startTime: '2026-10-06T06:00:00.000Z',
          coverageScore: 92,
          createdAt: '2026-10-06T06:00:00.000Z',
          updatedAt: '2026-10-06T10:00:00.000Z',
          expectedWaypoints: 10,
          waypoints: Array.from({ length: 10 }, (_, i) => ({
            id: `w-c-${i}`,
            latitude: 6.37 + i * 0.01,
            longitude: 81.51 + i * 0.01,
            sequenceOrder: i + 1,
            locationType: 'GPS' as any,
            recordedAt: new Date().toISOString(),
          })),
        } as any;
      }
      return {
        id,
        patrolCode: 'TEST',
        parkId: 'park-1',
        rangerId: 'r-1',
        patrolRouteId: 'route-1',
        status: PatrolStatus.PLANNED,
        startTime: new Date().toISOString(),
        coverageScore: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    render(<PatrolsPage />);

    await waitFor(() => {
      expect(screen.getByText('PAT-2026-YAL-001')).toBeInTheDocument();
      expect(screen.getByText('Kasun Bandara')).toBeInTheDocument();
      expect(screen.getByText('PAT-2026-WIL-001')).toBeInTheDocument();
      expect(screen.getByText('Chaminda Silva')).toBeInTheDocument();
      expect(screen.getByText('PAT-2026-YAL-002')).toBeInTheDocument();
      expect(screen.getByText('Nimal Perera')).toBeInTheDocument();
    });

    // Verify Progress column header
    expect(screen.getByRole('columnheader', { name: /Progress/i })).toBeInTheDocument();

    // Verify progress values for different statuses
    // Active patrol with 8 waypoints / 10 expected = 80%
    await waitFor(() => {
      expect(screen.getByText('80%')).toBeInTheDocument();
    });
    // Planned patrol has not started = 0%
    expect(screen.getByText('0%')).toBeInTheDocument();
    // Completed patrol with all 10 expected waypoints recorded = 100%
    expect(screen.getByText('100%')).toBeInTheDocument();

    // Verify pre-approved corridors section
    expect(screen.getByText('Pre-Approved Designated Corridors (2)')).toBeInTheDocument();
    expect(screen.getByText('Coastal patrol monitoring turtle nesting beaches')).toBeInTheDocument();
    expect(screen.getByText('Deep forest route covering interior villus')).toBeInTheDocument();
  });

  it('filters patrols when clicking status filter buttons (ACTIVE, PLANNED, COMPLETED, ALL)', async () => {
    render(<PatrolsPage />);

    await waitFor(() => {
      expect(screen.getByText('PAT-2026-YAL-001')).toBeInTheDocument();
    });

    // Click ACTIVE filter
    fireEvent.click(screen.getByRole('button', { name: 'ACTIVE' }));
    expect(screen.getByText('PAT-2026-YAL-001')).toBeInTheDocument();
    expect(screen.queryByText('PAT-2026-WIL-001')).not.toBeInTheDocument();
    expect(screen.queryByText('PAT-2026-YAL-002')).not.toBeInTheDocument();

    // Click PLANNED filter
    fireEvent.click(screen.getByRole('button', { name: 'PLANNED' }));
    expect(screen.queryByText('PAT-2026-YAL-001')).not.toBeInTheDocument();
    expect(screen.getByText('PAT-2026-WIL-001')).toBeInTheDocument();
    expect(screen.queryByText('PAT-2026-YAL-002')).not.toBeInTheDocument();

    // Click COMPLETED filter
    fireEvent.click(screen.getByRole('button', { name: 'COMPLETED' }));
    expect(screen.queryByText('PAT-2026-YAL-001')).not.toBeInTheDocument();
    expect(screen.queryByText('PAT-2026-WIL-001')).not.toBeInTheDocument();
    expect(screen.getByText('PAT-2026-YAL-002')).toBeInTheDocument();

    // Click ALL filter
    fireEvent.click(screen.getByRole('button', { name: 'ALL' }));
    expect(screen.getByText('PAT-2026-YAL-001')).toBeInTheDocument();
    expect(screen.getByText('PAT-2026-WIL-001')).toBeInTheDocument();
    expect(screen.getByText('PAT-2026-YAL-002')).toBeInTheDocument();
  });

  it('renders EmptyState on error with Retry button', async () => {
    vi.mocked(webPatrolService.fetchPatrols).mockRejectedValue(
      new Error('Network connection timeout')
    );

    render(<PatrolsPage />);

    await waitFor(() => {
      expect(screen.getByText('Unable to Load Patrol Monitoring Data')).toBeInTheDocument();
      expect(screen.getByText('Network connection timeout')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    expect(retryBtn).toBeInTheDocument();

    // Test retry
    vi.mocked(webPatrolService.fetchPatrols).mockResolvedValue([]);
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(webPatrolService.fetchPatrols).toHaveBeenCalledTimes(2);
    });
  });

  it('renders EmptyState when no patrols are returned from the service', async () => {
    vi.mocked(webPatrolService.fetchPatrols).mockResolvedValue([]);
    vi.mocked(webPatrolService.fetchPatrolRoutes).mockResolvedValue([]);

    render(<PatrolsPage />);

    await waitFor(() => {
      expect(screen.getByText('No Patrols Recorded')).toBeInTheDocument();
      expect(
        screen.getByText('There are currently no active, planned, or completed ranger patrols.')
      ).toBeInTheDocument();
    });
  });

  it('displays 80% (not 100%) for a completed patrol with 8 of 10 waypoints recorded', async () => {
    vi.mocked(webPatrolService.fetchPatrols).mockResolvedValue([
      {
        id: 'patrol-comp',
        patrolCode: 'PAT-2026-COMP-001',
        parkId: 'park-1',
        rangerId: 'ranger-1',
        patrolRouteId: 'route-1',
        status: PatrolStatus.COMPLETED,
        startTime: '2026-10-06T06:00:00.000Z',
        coverageScore: 90,
        createdAt: '2026-10-06T06:00:00.000Z',
        updatedAt: '2026-10-06T10:00:00.000Z',
      },
    ]);

    vi.mocked(webPatrolService.fetchPatrolById).mockResolvedValue({
      id: 'patrol-comp',
      patrolCode: 'PAT-2026-COMP-001',
      parkId: 'park-1',
      rangerId: 'ranger-1',
      patrolRouteId: 'route-1',
      status: PatrolStatus.COMPLETED,
      startTime: '2026-10-06T06:00:00.000Z',
      coverageScore: 90,
      createdAt: '2026-10-06T06:00:00.000Z',
      updatedAt: '2026-10-06T10:00:00.000Z',
      expectedWaypoints: 10,
      waypoints: Array.from({ length: 8 }, (_, i) => ({
        id: `w-${i}`,
        latitude: 6.37 + i * 0.01,
        longitude: 81.51 + i * 0.01,
        sequenceOrder: i + 1,
        locationType: 'GPS' as any,
        recordedAt: new Date().toISOString(),
      })),
    } as any);

    render(<PatrolsPage />);

    await waitFor(() => {
      expect(screen.getByText('PAT-2026-COMP-001')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument();
      expect(screen.queryByText('100%')).not.toBeInTheDocument();
    });
  });
});
