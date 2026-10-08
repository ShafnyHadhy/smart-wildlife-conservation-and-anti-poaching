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
        waypoints: Array.from({ length: 10 }, (_, i) => ({
          id: `cp-${i + 1}`,
          patrolRouteId: 'route-1',
          latitude: 6.37 + i * 0.01,
          longitude: 81.51 + i * 0.01,
          sequenceOrder: i + 1,
          locationType: 'GPS' as any,
          recordedAt: '2026-10-01T00:00:00.000Z',
        })),
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
        waypoints: [],
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

    // Verify Progress and Coverage column headers
    expect(screen.getByRole('columnheader', { name: /Progress/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Coverage/i })).toBeInTheDocument();

    // Verify progress/coverage values for different statuses
    // Active patrol with 8 waypoints / 10 expected = 80%
    await waitFor(() => {
      expect(screen.getAllByText('80%').length).toBeGreaterThan(0);
    });
    // Planned patrol has not started = 0%
    expect(screen.getAllByText('0%').length).toBeGreaterThan(0);
    // Completed patrol with all 10 expected waypoints recorded = 100%
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0);

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
      expect(screen.getAllByText('80%').length).toBeGreaterThan(0);
      expect(screen.queryByText('100%')).not.toBeInTheDocument();
    });
  });

  it('13. Patrol table displays Coverage column correctly with Good Coverage and Under-patrolled classifications', async () => {
    vi.mocked(webPatrolService.fetchPatrols).mockResolvedValue([
      {
        id: 'patrol-good',
        patrolCode: 'PAT-2026-GOOD',
        parkId: 'park-1',
        rangerId: 'ranger-1',
        patrolRouteId: 'route-1',
        status: PatrolStatus.ACTIVE,
        startTime: '2026-10-07T09:00:00.000Z',
        coverageScore: 0,
        createdAt: '2026-10-07T09:00:00.000Z',
        updatedAt: '2026-10-07T09:00:00.000Z',
      },
      {
        id: 'patrol-under',
        patrolCode: 'PAT-2026-UNDER',
        parkId: 'park-1',
        rangerId: 'ranger-2',
        patrolRouteId: 'route-1',
        status: PatrolStatus.ACTIVE,
        startTime: '2026-10-07T09:00:00.000Z',
        coverageScore: 0,
        createdAt: '2026-10-07T09:00:00.000Z',
        updatedAt: '2026-10-07T09:00:00.000Z',
      },
      {
        id: 'patrol-planned',
        patrolCode: 'PAT-2026-PLAN',
        parkId: 'park-1',
        rangerId: 'ranger-3',
        patrolRouteId: 'route-1',
        status: PatrolStatus.PLANNED,
        startTime: '2026-10-07T12:00:00.000Z',
        coverageScore: 0,
        createdAt: '2026-10-07T09:00:00.000Z',
        updatedAt: '2026-10-07T09:00:00.000Z',
      },
      {
        id: 'patrol-nodata',
        patrolCode: 'PAT-2026-NODATA',
        parkId: 'park-1',
        rangerId: 'ranger-4',
        patrolRouteId: 'route-1',
        status: PatrolStatus.COMPLETED,
        startTime: '2026-10-06T06:00:00.000Z',
        coverageScore: 0,
        createdAt: '2026-10-06T06:00:00.000Z',
        updatedAt: '2026-10-06T10:00:00.000Z',
      },
    ]);

    vi.mocked(webPatrolService.fetchPatrolRoutes).mockResolvedValue([
      {
        id: 'route-1',
        parkId: 'park-1',
        name: 'Yala Block 1 Coastal Route',
        code: 'YALA-RT-01',
        description: 'Coastal patrol route',
        estimatedDurationMinutes: 240,
        routeType: 'FOOT_PATROL',
        isActive: true,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
        waypoints: Array.from({ length: 10 }, (_, i) => ({
          id: `cp-${i + 1}`,
          patrolRouteId: 'route-1',
          latitude: 6.37 + i * 0.01,
          longitude: 81.51 + i * 0.01,
          sequenceOrder: i + 1,
          locationType: 'GPS' as any,
          recordedAt: '2026-10-01T00:00:00.000Z',
        })),
      },
    ]);

    // patrol-good visits 8 of 10 checkpoints (80% -> Good Coverage)
    // patrol-under visits 4 of 10 checkpoints (40% -> Under-patrolled)
    // patrol-nodata has no waypoints recorded -> No Coverage Data
    vi.mocked(webPatrolService.fetchPatrolById).mockImplementation(async (id: string) => {
      if (id === 'patrol-good') {
        return {
          id: 'patrol-good',
          patrolCode: 'PAT-2026-GOOD',
          parkId: 'park-1',
          rangerId: 'ranger-1',
          patrolRouteId: 'route-1',
          status: PatrolStatus.ACTIVE,
          startTime: '2026-10-07T09:00:00.000Z',
          coverageScore: 0,
          createdAt: '2026-10-07T09:00:00.000Z',
          updatedAt: '2026-10-07T09:00:00.000Z',
          waypoints: Array.from({ length: 8 }, (_, i) => ({
            id: `wp-g-${i}`,
            latitude: 6.37 + i * 0.01,
            longitude: 81.51 + i * 0.01,
            sequenceOrder: i + 1,
            locationType: 'GPS' as any,
            recordedAt: new Date().toISOString(),
          })),
        } as any;
      }
      if (id === 'patrol-under') {
        return {
          id: 'patrol-under',
          patrolCode: 'PAT-2026-UNDER',
          parkId: 'park-1',
          rangerId: 'ranger-2',
          patrolRouteId: 'route-1',
          status: PatrolStatus.ACTIVE,
          startTime: '2026-10-07T09:00:00.000Z',
          coverageScore: 0,
          createdAt: '2026-10-07T09:00:00.000Z',
          updatedAt: '2026-10-07T09:00:00.000Z',
          waypoints: Array.from({ length: 4 }, (_, i) => ({
            id: `wp-u-${i}`,
            latitude: 6.37 + i * 0.01,
            longitude: 81.51 + i * 0.01,
            sequenceOrder: i + 1,
            locationType: 'GPS' as any,
            recordedAt: new Date().toISOString(),
          })),
        } as any;
      }
      if (id === 'patrol-nodata') {
        return {
          id: 'patrol-nodata',
          patrolCode: 'PAT-2026-NODATA',
          parkId: 'park-1',
          rangerId: 'ranger-4',
          patrolRouteId: 'route-1',
          status: PatrolStatus.COMPLETED,
          startTime: '2026-10-06T06:00:00.000Z',
          coverageScore: 0,
          createdAt: '2026-10-06T06:00:00.000Z',
          updatedAt: '2026-10-06T10:00:00.000Z',
          waypoints: [],
        } as any;
      }
      return {} as any;
    });

    render(<PatrolsPage />);

    await waitFor(() => {
      expect(screen.getByRole('columnheader', { name: /Coverage/i })).toBeInTheDocument();
      expect(screen.getByText('PAT-2026-GOOD')).toBeInTheDocument();
      expect(screen.getAllByText('PAT-2026-UNDER').length).toBeGreaterThan(0);
      expect(screen.getByText('PAT-2026-PLAN')).toBeInTheDocument();
      expect(screen.getByText('PAT-2026-NODATA')).toBeInTheDocument();
    });

    // Verify percentages are rendered
    await waitFor(() => {
      expect(screen.getAllByText('80%').length).toBeGreaterThan(0);
      expect(screen.getAllByText('40%').length).toBeGreaterThan(0);
      expect(screen.getAllByText('0%').length).toBeGreaterThan(0);
    });

    // Verify classification badges
    expect(screen.getByText('Good Coverage')).toBeInTheDocument();
    expect(screen.getAllByText('Under-patrolled').length).toBeGreaterThan(0);
    expect(screen.getByText('No Coverage Data')).toBeInTheDocument();

    // Verify Planned patrol row does not display "Under-patrolled"
    const plannedRow = screen.getByText('PAT-2026-PLAN').closest('tr');
    expect(plannedRow?.textContent).not.toContain('Under-patrolled');
  });

  it('14. Patrol table displays Location Status column with Current, Stale, and Location unavailable states', async () => {
    const now = Date.now();
    const fiveMinutesAgo = new Date(now - 5 * 60 * 1000).toISOString();
    const fortyFiveMinutesAgo = new Date(now - 45 * 60 * 1000).toISOString();

    vi.mocked(webPatrolService.fetchPatrols).mockResolvedValue([
      {
        id: 'patrol-current',
        patrolCode: 'PAT-2026-CUR',
        parkId: 'park-1',
        rangerId: 'ranger-1',
        patrolRouteId: 'route-1',
        status: PatrolStatus.ACTIVE,
        startTime: '2026-10-07T09:00:00.000Z',
        coverageScore: 0,
        createdAt: '2026-10-07T09:00:00.000Z',
        updatedAt: '2026-10-07T09:00:00.000Z',
      },
      {
        id: 'patrol-stale',
        patrolCode: 'PAT-2026-STL',
        parkId: 'park-1',
        rangerId: 'ranger-2',
        patrolRouteId: 'route-1',
        status: PatrolStatus.ACTIVE,
        startTime: '2026-10-07T09:00:00.000Z',
        coverageScore: 0,
        createdAt: '2026-10-07T09:00:00.000Z',
        updatedAt: '2026-10-07T09:00:00.000Z',
      },
      {
        id: 'patrol-planned-loc',
        patrolCode: 'PAT-2026-PLN-LOC',
        parkId: 'park-1',
        rangerId: 'ranger-3',
        patrolRouteId: 'route-1',
        status: PatrolStatus.PLANNED,
        startTime: '2026-10-07T12:00:00.000Z',
        coverageScore: 0,
        createdAt: '2026-10-07T09:00:00.000Z',
        updatedAt: '2026-10-07T09:00:00.000Z',
      },
      {
        id: 'patrol-comp-empty',
        patrolCode: 'PAT-2026-CMP-EMP',
        parkId: 'park-1',
        rangerId: 'ranger-4',
        patrolRouteId: 'route-1',
        status: PatrolStatus.COMPLETED,
        startTime: '2026-10-06T06:00:00.000Z',
        coverageScore: 0,
        createdAt: '2026-10-06T06:00:00.000Z',
        updatedAt: '2026-10-06T10:00:00.000Z',
      },
    ]);

    vi.mocked(webPatrolService.fetchPatrolById).mockImplementation(async (id: string) => {
      if (id === 'patrol-current') {
        return {
          id: 'patrol-current',
          patrolCode: 'PAT-2026-CUR',
          parkId: 'park-1',
          rangerId: 'ranger-1',
          patrolRouteId: 'route-1',
          status: PatrolStatus.ACTIVE,
          startTime: '2026-10-07T09:00:00.000Z',
          coverageScore: 0,
          createdAt: '2026-10-07T09:00:00.000Z',
          updatedAt: '2026-10-07T09:00:00.000Z',
          waypoints: [
            {
              id: 'wp-cur',
              patrolId: 'patrol-current',
              latitude: 6.375,
              longitude: 81.518,
              sequenceOrder: 1,
              locationType: 'GPS' as any,
              recordedAt: fiveMinutesAgo,
            },
          ],
        } as any;
      }
      if (id === 'patrol-stale') {
        return {
          id: 'patrol-stale',
          patrolCode: 'PAT-2026-STL',
          parkId: 'park-1',
          rangerId: 'ranger-2',
          patrolRouteId: 'route-1',
          status: PatrolStatus.ACTIVE,
          startTime: '2026-10-07T09:00:00.000Z',
          coverageScore: 0,
          createdAt: '2026-10-07T09:00:00.000Z',
          updatedAt: '2026-10-07T09:00:00.000Z',
          waypoints: [
            {
              id: 'wp-stl',
              patrolId: 'patrol-stale',
              latitude: 6.381,
              longitude: 81.524,
              sequenceOrder: 1,
              locationType: 'GPS' as any,
              recordedAt: fortyFiveMinutesAgo,
            },
          ],
        } as any;
      }
      if (id === 'patrol-comp-empty') {
        return {
          id: 'patrol-comp-empty',
          patrolCode: 'PAT-2026-CMP-EMP',
          parkId: 'park-1',
          rangerId: 'ranger-4',
          patrolRouteId: 'route-1',
          status: PatrolStatus.COMPLETED,
          startTime: '2026-10-06T06:00:00.000Z',
          coverageScore: 0,
          createdAt: '2026-10-06T06:00:00.000Z',
          updatedAt: '2026-10-06T10:00:00.000Z',
          waypoints: [],
        } as any;
      }
      return {} as any;
    });

    render(<PatrolsPage />);

    await waitFor(() => {
      expect(screen.getByRole('columnheader', { name: /Location Status/i })).toBeInTheDocument();
      expect(screen.getAllByText('PAT-2026-CUR').length).toBeGreaterThan(0);
      expect(screen.getAllByText('PAT-2026-STL').length).toBeGreaterThan(0);
      expect(screen.getByText('PAT-2026-PLN-LOC')).toBeInTheDocument();
      expect(screen.getByText('PAT-2026-CMP-EMP')).toBeInTheDocument();
    });

    // Verify Current status badge and coordinates
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('6.3750, 81.5180')).toBeInTheDocument();
    expect(screen.getByText(/Updated/i)).toBeInTheDocument();

    // Verify Stale status badge and coordinates
    expect(screen.getByText('Stale')).toBeInTheDocument();
    expect(screen.getByText('6.3810, 81.5240')).toBeInTheDocument();
    expect(screen.getByText(/Last known location/i)).toBeInTheDocument();

    // Verify Unavailable status for planned patrol and completed patrol without GPS breadcrumbs
    expect(screen.getAllByText('Location unavailable').length).toBe(2);
  });

  it('15. Renders Under-Patrolled Overview Card and Status/Evaluation indicator (UC01 Task 7)', async () => {
    // 1 active patrol under-patrolled (< 70% coverage)
    // 1 healthy active patrol (100% coverage, on track)
    vi.mocked(webPatrolService.fetchPatrols).mockResolvedValue([
      {
        id: 'patrol-att-1',
        patrolCode: 'PAT-2026-ATT-001',
        parkId: 'park-1',
        rangerId: 'ranger-1',
        patrolRouteId: 'route-1',
        status: PatrolStatus.ACTIVE,
        startTime: '2026-10-07T09:00:00.000Z',
        coverageScore: 0,
        createdAt: '2026-10-07T09:00:00.000Z',
        updatedAt: '2026-10-07T09:00:00.000Z',
        rangerName: 'Saman Kumara',
        routeName: 'Yala Block 1 Coastal Route',
      },
    ]);

    vi.mocked(webPatrolService.fetchPatrolRoutes).mockResolvedValue([
      {
        id: 'route-1',
        parkId: 'park-1',
        name: 'Yala Block 1 Coastal Route',
        code: 'YALA-RT-01',
        description: 'Coastal patrol route',
        estimatedDurationMinutes: 240,
        routeType: 'FOOT_PATROL',
        isActive: true,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
        waypoints: Array.from({ length: 10 }, (_, i) => ({
          id: `cp-${i + 1}`,
          patrolRouteId: 'route-1',
          latitude: 6.37 + i * 0.01,
          longitude: 81.51 + i * 0.01,
          sequenceOrder: i + 1,
          locationType: 'GPS' as any,
          recordedAt: '2026-10-01T00:00:00.000Z',
        })),
      },
    ]);

    // Visited 4 of 10 checkpoints = 40% (< 70% threshold)
    vi.mocked(webPatrolService.fetchPatrolById).mockResolvedValue({
      id: 'patrol-att-1',
      patrolCode: 'PAT-2026-ATT-001',
      parkId: 'park-1',
      rangerId: 'ranger-1',
      patrolRouteId: 'route-1',
      status: PatrolStatus.ACTIVE,
      startTime: '2026-10-07T09:00:00.000Z',
      coverageScore: 0,
      createdAt: '2026-10-07T09:00:00.000Z',
      updatedAt: '2026-10-07T09:00:00.000Z',
      waypoints: Array.from({ length: 4 }, (_, i) => ({
        id: `wp-${i}`,
        patrolId: 'patrol-att-1',
        latitude: 6.37 + i * 0.01,
        longitude: 81.51 + i * 0.01,
        sequenceOrder: i + 1,
        locationType: 'GPS' as any,
        recordedAt: new Date().toISOString(),
      })),
    } as any);

    render(<PatrolsPage />);

    // Verify Under-Patrolled Overview card is displayed
    await waitFor(() => {
      expect(screen.getByText('Under-Patrolled & Operational Attention')).toBeInTheDocument();
      expect(screen.getByText('1 Patrol')).toBeInTheDocument();
      expect(screen.getAllByText('PAT-2026-ATT-001').length).toBeGreaterThan(0);
      expect(screen.getByText('Low Coverage (40%)')).toBeInTheDocument();
    });

    // Verify Status / Evaluation column header and badge
    expect(screen.getByRole('columnheader', { name: /Status \/ Evaluation/i })).toBeInTheDocument();
    expect(screen.getAllByText('Under-patrolled').length).toBeGreaterThan(0);
  });

  it('16. Displays Overview Statistics Cards for Active Patrols, Completed Today, Average Coverage, and Under-Patrolled (UC01 Task 8)', async () => {
    const todayIso = new Date().toISOString();
    const yesterdayIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    vi.mocked(webPatrolService.fetchPatrols).mockResolvedValue([
      {
        id: 'stat-active-1',
        patrolCode: 'PAT-STAT-ACT-1',
        parkId: 'park-1',
        rangerId: 'ranger-1',
        patrolRouteId: 'route-1',
        status: PatrolStatus.ACTIVE,
        startTime: todayIso,
        coverageScore: 0,
        createdAt: todayIso,
        updatedAt: todayIso,
      },
      {
        id: 'stat-active-2',
        patrolCode: 'PAT-STAT-ACT-2',
        parkId: 'park-1',
        rangerId: 'ranger-2',
        patrolRouteId: 'route-1',
        status: PatrolStatus.ACTIVE,
        startTime: todayIso,
        coverageScore: 0,
        createdAt: todayIso,
        updatedAt: todayIso,
      },
      {
        id: 'stat-comp-today',
        patrolCode: 'PAT-STAT-CMP-TODAY',
        parkId: 'park-1',
        rangerId: 'ranger-3',
        patrolRouteId: 'route-1',
        status: PatrolStatus.COMPLETED,
        startTime: todayIso,
        endTime: todayIso,
        coverageScore: 0,
        createdAt: todayIso,
        updatedAt: todayIso,
      },
      {
        id: 'stat-comp-yesterday',
        patrolCode: 'PAT-STAT-CMP-YEST',
        parkId: 'park-1',
        rangerId: 'ranger-4',
        patrolRouteId: 'route-1',
        status: PatrolStatus.COMPLETED,
        startTime: yesterdayIso,
        endTime: yesterdayIso,
        coverageScore: 0,
        createdAt: yesterdayIso,
        updatedAt: yesterdayIso,
      },
      {
        id: 'stat-planned',
        patrolCode: 'PAT-STAT-PLAN',
        parkId: 'park-1',
        rangerId: 'ranger-5',
        patrolRouteId: 'route-1',
        status: PatrolStatus.PLANNED,
        startTime: todayIso,
        coverageScore: 0,
        createdAt: todayIso,
        updatedAt: todayIso,
      },
    ]);

    vi.mocked(webPatrolService.fetchPatrolRoutes).mockResolvedValue([
      {
        id: 'route-1',
        parkId: 'park-1',
        name: 'Yala Block 1 Coastal Route',
        code: 'YALA-RT-01',
        description: 'Coastal patrol route',
        estimatedDurationMinutes: 240,
        routeType: 'FOOT_PATROL',
        isActive: true,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
        waypoints: Array.from({ length: 10 }, (_, i) => ({
          id: `cp-${i + 1}`,
          patrolRouteId: 'route-1',
          latitude: 6.37 + i * 0.01,
          longitude: 81.51 + i * 0.01,
          sequenceOrder: i + 1,
          locationType: 'GPS' as any,
          recordedAt: '2026-10-01T00:00:00.000Z',
        })),
      },
    ]);

    // stat-active-1: visits 8 of 10 = 80% coverage (Good)
    // stat-active-2: visits 4 of 10 = 40% coverage (Under-patrolled)
    vi.mocked(webPatrolService.fetchPatrolById).mockImplementation(async (id: string) => {
      if (id === 'stat-active-1') {
        return {
          id,
          patrolCode: 'PAT-STAT-ACT-1',
          parkId: 'park-1',
          rangerId: 'ranger-1',
          patrolRouteId: 'route-1',
          status: PatrolStatus.ACTIVE,
          startTime: todayIso,
          coverageScore: 0,
          createdAt: todayIso,
          updatedAt: todayIso,
          waypoints: Array.from({ length: 8 }, (_, i) => ({
            id: `wp-a1-${i}`,
            patrolId: id,
            latitude: 6.37 + i * 0.01,
            longitude: 81.51 + i * 0.01,
            sequenceOrder: i + 1,
            locationType: 'GPS' as any,
            recordedAt: todayIso,
          })),
        } as any;
      }
      if (id === 'stat-active-2') {
        return {
          id,
          patrolCode: 'PAT-STAT-ACT-2',
          parkId: 'park-1',
          rangerId: 'ranger-2',
          patrolRouteId: 'route-1',
          status: PatrolStatus.ACTIVE,
          startTime: todayIso,
          coverageScore: 0,
          createdAt: todayIso,
          updatedAt: todayIso,
          waypoints: Array.from({ length: 4 }, (_, i) => ({
            id: `wp-a2-${i}`,
            patrolId: id,
            latitude: 6.37 + i * 0.01,
            longitude: 81.51 + i * 0.01,
            sequenceOrder: i + 1,
            locationType: 'GPS' as any,
            recordedAt: todayIso,
          })),
        } as any;
      }
      return {
        id,
        patrolCode: id,
        parkId: 'park-1',
        rangerId: 'ranger-x',
        patrolRouteId: 'route-1',
        status: PatrolStatus.COMPLETED,
        startTime: todayIso,
        waypoints: [],
      } as any;
    });

    render(<PatrolsPage />);

    // Verify all 4 Stat card titles exist
    await waitFor(() => {
      expect(screen.getByText('Active Patrols')).toBeInTheDocument();
      expect(screen.getByText('Completed Today')).toBeInTheDocument();
      expect(screen.getByText('Average Coverage')).toBeInTheDocument();
      expect(screen.getAllByText('Under-Patrolled').length).toBeGreaterThan(0);
    });

    // Active Patrols = 2
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('rangers in the field')).toBeInTheDocument();

    // Completed Today and Under-Patrolled counts (both are 1)
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('shifts finished today')).toBeInTheDocument();
    expect(screen.getByText('requiring attention')).toBeInTheDocument();

    // Average Coverage: (80% + 40%) / 2 = 60%
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('across designated routes')).toBeInTheDocument();
  });
});
