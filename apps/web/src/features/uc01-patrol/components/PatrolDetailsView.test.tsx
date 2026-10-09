import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PatrolDetailsView } from './PatrolDetailsView';
import { webPatrolService } from '../services/patrolService';
import { Patrol, PatrolRoute, PatrolStatus, LocationType } from '@wildlife/shared';

vi.mock('../services/patrolService', () => ({
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

describe('UC01 Task 10: PatrolDetailsView Component', () => {
  const mockRoute: PatrolRoute = {
    id: 'route-coastal-1',
    parkId: 'park-yala',
    name: 'Yala Coastal Corridor',
    code: 'YAL-CORR-01',
    description: 'Scenic turtle nesting route',
    estimatedDurationMinutes: 180,
    routeType: 'FOOT_PATROL',
    isActive: true,
    parkName: 'Yala National Park',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    waypoints: [
      {
        id: 'cp-1',
        patrolRouteId: 'route-coastal-1',
        latitude: 6.3700,
        longitude: 81.5100,
        sequenceOrder: 1,
        locationType: LocationType.GPS,
        recordedAt: '2026-10-01T00:00:00.000Z',
        notes: 'North beach checkpoint',
      },
      {
        id: 'cp-2',
        patrolRouteId: 'route-coastal-1',
        latitude: 6.3800,
        longitude: 81.5200,
        sequenceOrder: 2,
        locationType: LocationType.GPS,
        recordedAt: '2026-10-01T00:00:00.000Z',
        notes: 'Dune crossing',
      },
      {
        id: 'cp-3',
        patrolRouteId: 'route-coastal-1',
        latitude: 6.3900,
        longitude: 81.5300,
        sequenceOrder: 3,
        locationType: LocationType.GPS,
        recordedAt: '2026-10-01T00:00:00.000Z',
        notes: 'Estuary lookout',
      },
    ],
  };

  const nowIso = new Date().toISOString();

  const mockActivePatrol: Patrol = {
    id: 'patrol-100',
    patrolCode: 'PAT-2026-YAL-100',
    parkId: 'park-yala',
    rangerId: 'ranger-kasun',
    patrolRouteId: 'route-coastal-1',
    status: PatrolStatus.ACTIVE,
    startTime: '2026-10-08T06:00:00.000Z',
    coverageScore: 66,
    notes: 'Morning coastal monitoring sweep',
    createdAt: '2026-10-08T06:00:00.000Z',
    updatedAt: '2026-10-08T08:30:00.000Z',
    rangerName: 'Kasun Bandara',
    routeName: 'Yala Coastal Corridor',
    parkName: 'Yala National Park',
    waypoints: [
      {
        id: 'wp-1',
        patrolId: 'patrol-100',
        latitude: 6.3701,
        longitude: 81.5101, // Near cp-1 (visited)
        sequenceOrder: 1,
        locationType: LocationType.GPS,
        recordedAt: '2026-10-08T06:30:00.000Z',
      },
      {
        id: 'wp-2',
        patrolId: 'patrol-100',
        latitude: 6.3801,
        longitude: 81.5201, // Near cp-2 (visited)
        sequenceOrder: 2,
        locationType: LocationType.GPS,
        recordedAt: nowIso, // Live GPS ping
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(webPatrolService.fetchPatrolById).mockResolvedValue(mockActivePatrol);
    vi.mocked(webPatrolService.fetchPatrolRouteById).mockResolvedValue(mockRoute);
  });

  it('1. Renders Patrol Information (ID, status, park, ranger, route, start/end dates)', async () => {
    const handleBack = vi.fn();
    render(
      <PatrolDetailsView
        patrolId="patrol-100"
        onBack={handleBack}
        initialPatrol={mockActivePatrol}
        routes={[mockRoute]}
      />
    );

    // Verify header and identifier
    expect(screen.getAllByText('PAT-2026-YAL-100').length).toBeGreaterThan(0);
    expect(screen.getByText('UC01 DETAILS')).toBeInTheDocument();

    // Verify information fields
    expect(screen.getByText('Yala National Park')).toBeInTheDocument();
    expect(screen.getByText('Kasun Bandara')).toBeInTheDocument();
    expect(screen.getAllByText('Yala Coastal Corridor').length).toBeGreaterThan(0);
    expect(screen.getByText('Morning coastal monitoring sweep')).toBeInTheDocument();

    // Verify status badges
    expect(screen.getAllByText('ACTIVE').length).toBeGreaterThan(0);

    // Verify Start & End Time fields
    expect(screen.getByText('Start Date & Time')).toBeInTheDocument();
    expect(screen.getByText('End Date & Time')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('2. Displays Patrol Progress calculation correctly', async () => {
    render(
      <PatrolDetailsView
        patrolId="patrol-100"
        onBack={vi.fn()}
        initialPatrol={mockActivePatrol}
        routes={[mockRoute]}
      />
    );

    // Progress: 2 recorded waypoints / 3 planned checkpoints = 67%
    expect(screen.getByText('Patrol Progress')).toBeInTheDocument();
    expect(screen.getAllByText('67%').length).toBeGreaterThan(0);

    // Breakdown metrics
    expect(screen.getByText('Recorded Waypoints')).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getByText('Planned Waypoints')).toBeInTheDocument();
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    expect(screen.getByText('Remaining Waypoints')).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('3. Displays Patrol Coverage calculation and classification', async () => {
    render(
      <PatrolDetailsView
        patrolId="patrol-100"
        onBack={vi.fn()}
        initialPatrol={mockActivePatrol}
        routes={[mockRoute]}
      />
    );

    // Coverage: 2 checkpoints visited out of 3 = 67% (< 70% = Under-patrolled)
    expect(screen.getByText('Patrol Coverage')).toBeInTheDocument();
    expect(screen.getAllByText('67%').length).toBeGreaterThan(0);
    expect(screen.getByText('Under-patrolled')).toBeInTheDocument();

    // Checkpoint count
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('4. Displays Ranger Location Information for live active patrol', async () => {
    render(
      <PatrolDetailsView
        patrolId="patrol-100"
        onBack={vi.fn()}
        initialPatrol={mockActivePatrol}
        routes={[mockRoute]}
      />
    );

    expect(screen.getByText('Ranger Location Information')).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
    // Latest coordinates: 6.3801, 81.5201
    expect(screen.getByText('6.3801, 81.5201')).toBeInTheDocument();
    expect(screen.getByText('Telemetry Freshness')).toBeInTheDocument();
    expect(screen.getByText('Last GPS Ping')).toBeInTheDocument();
  });

  it('5. Displays Location unavailable for planned patrol without GPS breadcrumbs', async () => {
    const plannedPatrol: Patrol = {
      ...mockActivePatrol,
      id: 'patrol-planned',
      patrolCode: 'PAT-2026-PLN-001',
      status: PatrolStatus.PLANNED,
      waypoints: [],
    };

    render(
      <PatrolDetailsView
        patrolId="patrol-planned"
        onBack={vi.fn()}
        initialPatrol={plannedPatrol}
        routes={[mockRoute]}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('Location unavailable').length).toBeGreaterThan(0);
    });
  });

  it('6. Displays Route & Checkpoints Information table with visited/pending badges', async () => {
    render(
      <PatrolDetailsView
        patrolId="patrol-100"
        onBack={vi.fn()}
        initialPatrol={mockActivePatrol}
        routes={[mockRoute]}
      />
    );

    expect(screen.getByText('Route & Waypoint Information')).toBeInTheDocument();
    expect(screen.getByText('North beach checkpoint')).toBeInTheDocument();
    expect(screen.getByText('Dune crossing')).toBeInTheDocument();
    expect(screen.getByText('Estuary lookout')).toBeInTheDocument();

    // Checkpoint 1 & 2 visited, Checkpoint 3 pending
    expect(screen.getAllByText('Visited').length).toBe(2);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('7. Calls onBack when Back to Patrols button is clicked', async () => {
    const handleBack = vi.fn();
    render(
      <PatrolDetailsView
        patrolId="patrol-100"
        onBack={handleBack}
        initialPatrol={mockActivePatrol}
        routes={[mockRoute]}
      />
    );

    const backBtn = screen.getByTestId('back-to-patrols-btn');
    fireEvent.click(backBtn);

    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('8. Handles missing/not found patrol gracefully with Back to Patrols button', async () => {
    vi.mocked(webPatrolService.fetchPatrolById).mockRejectedValue(
      new Error('Patrol not found in database')
    );

    const handleBack = vi.fn();
    render(
      <PatrolDetailsView
        patrolId="patrol-non-existent"
        onBack={handleBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('patrol-not-found')).toBeInTheDocument();
      expect(screen.getByText('Patrol Not Found')).toBeInTheDocument();
    });

    // Clicking Back button calls onBack
    const backBtn = screen.getByTestId('back-to-patrols-btn');
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('9. Never displays undefined, null, NaN, or Infinity', async () => {
    render(
      <PatrolDetailsView
        patrolId="patrol-100"
        onBack={vi.fn()}
        initialPatrol={mockActivePatrol}
        routes={[mockRoute]}
      />
    );

    const view = screen.getByTestId('patrol-details-view');
    expect(view.textContent).not.toContain('undefined');
    expect(view.textContent).not.toContain('NaN');
    expect(view.textContent).not.toContain('Infinity');
  });
});
