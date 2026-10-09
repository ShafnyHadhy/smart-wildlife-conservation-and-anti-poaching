import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PatrolStatus, LocationType } from '@wildlife/shared';

vi.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: vi.fn().mockResolvedValue({
    coords: {
      latitude: 6.375,
      longitude: 81.52,
      accuracy: 5,
    },
    timestamp: Date.now(),
  }),
  Accuracy: { High: 4 },
}));

// Mock react-native for testing
vi.mock('react-native', () => {
  return {
    Platform: {
      OS: 'web',
      select: (obj: any) => obj.web || obj.default,
    },
    View: ({ children, testID, id, style, accessibilityRole }: any) =>
      React.createElement('div', { 'data-testid': testID, id, style, role: accessibilityRole }, children),
    Text: ({ children, testID, id, style }: any) =>
      React.createElement('span', { 'data-testid': testID, id, style }, children),
    TextInput: ({ value, onChangeText, placeholder, testID }: any) =>
      React.createElement('input', {
        value,
        onChange: (e: any) => onChangeText?.(e.target.value),
        placeholder,
        'data-testid': testID,
      }),
    TouchableOpacity: ({ children, onPress, testID, disabled }: any) =>
      React.createElement('button', { onClick: onPress, type: 'button', 'data-testid': testID, disabled }, children),
    ScrollView: ({ children }: any) => React.createElement('div', null, children),
    ActivityIndicator: () => React.createElement('div', null, 'Loading...'),
    StyleSheet: {
      create: (styles: any) => styles,
    },
    Alert: {
      alert: vi.fn((title, message, buttons) => {
        // Trigger confirm button automatically in tests
        const confirmBtn = buttons?.find((b: any) => b.text !== 'Cancel');
        if (confirmBtn?.onPress) confirmBtn.onPress();
      }),
    },
  };
});

import { PatrolListScreen } from '../features/uc01-patrol/screens/PatrolListScreen';
import { ActivePatrolScreen } from '../features/uc01-patrol/screens/ActivePatrolScreen';
import { PatrolRouteMap } from '../features/uc01-patrol/components/PatrolRouteMap';
import { patrolMobileService } from '../features/uc01-patrol/services/patrolMobileService';
import { Patrol, PatrolRoute } from '../features/uc01-patrol/types';

describe('UC01: Mobile Ranger Patrol Feature', () => {
  const mockPatrol: Patrol = {
    id: 'patrol-101',
    patrolCode: 'PAT-2026-YAL-001',
    parkId: 'park-1',
    parkName: 'Yala National Park',
    rangerId: 'ranger-1',
    rangerName: 'Kasun Bandara',
    patrolRouteId: 'route-1',
    routeName: 'Yala Coastal Route',
    status: PatrolStatus.PLANNED,
    startTime: '2026-10-09T06:00:00.000Z',
    coverageScore: 0,
    createdAt: '2026-10-09T05:00:00.000Z',
    updatedAt: '2026-10-09T05:00:00.000Z',
    waypoints: [],
  };

  const mockRoute: PatrolRoute = {
    id: 'route-1',
    parkId: 'park-1',
    name: 'Yala Coastal Route',
    code: 'YAL-RT-01',
    estimatedDurationMinutes: 180,
    routeType: 'FOOT_PATROL',
    isActive: true,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    waypoints: [
      {
        id: 'cp-1',
        patrolRouteId: 'route-1',
        latitude: 6.3725,
        longitude: 81.5165,
        sequenceOrder: 1,
        locationType: LocationType.GPS,
        recordedAt: '2026-10-01T00:00:00.000Z',
        notes: 'Gate Entry Point',
      },
      {
        id: 'cp-2',
        patrolRouteId: 'route-1',
        latitude: 6.378,
        longitude: 81.523,
        sequenceOrder: 2,
        locationType: LocationType.GPS,
        recordedAt: '2026-10-01T00:00:00.000Z',
        notes: 'Sand Dune Checkpoint',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PatrolListScreen', () => {
    it('renders list of assigned patrols for the authenticated ranger', async () => {
      vi.spyOn(patrolMobileService, 'getPatrols').mockResolvedValue([mockPatrol]);
      const onSelect = vi.fn();

      render(
        <PatrolListScreen
          user={{
            id: 'ranger-1',
            email: 'ranger@gmail.com',
            fullName: 'Kasun Bandara',
            role: 'RANGER',
            initials: 'KB',
            subtitle: 'Ranger • Yala',
          }}
          isOnline={true}
          onSelectPatrol={onSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('PAT-2026-YAL-001')).toBeDefined();
        expect(screen.getByText('Yala Coastal Route')).toBeDefined();
        expect(screen.getByText('Yala National Park')).toBeDefined();
      });

      // Filter tabs are present
      expect(screen.getByText(/ALL \(1\)/i)).toBeDefined();
      expect(screen.getAllByText(/PLANNED/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/ACTIVE \(0\)/i)).toBeDefined();
      expect(screen.getByText(/COMPLETED \(0\)/i)).toBeDefined();

      // Click card
      fireEvent.click(screen.getByText('PAT-2026-YAL-001'));
      expect(onSelect).toHaveBeenCalledWith(mockPatrol);
    });

    it('renders empty state when no patrols are assigned', async () => {
      vi.spyOn(patrolMobileService, 'getPatrols').mockResolvedValue([]);

      render(
        <PatrolListScreen
          user={{
            id: 'ranger-1',
            email: 'ranger@gmail.com',
            fullName: 'Kasun Bandara',
            role: 'RANGER',
            initials: 'KB',
            subtitle: 'Ranger • Yala',
          }}
          isOnline={true}
          onSelectPatrol={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No Patrols Found')).toBeDefined();
      });
    });

    it('queries strictly for the authenticated ranger ID and does not load other rangers patrols', async () => {
      const getPatrolsSpy = vi.spyOn(patrolMobileService, 'getPatrols').mockResolvedValue([mockPatrol]);

      render(
        <PatrolListScreen
          user={{
            id: 'aaaa0002-0000-0000-0000-000000000002',
            email: 'kasun.ranger@wildlife.gov.lk',
            fullName: 'Kasun Bandara',
            role: 'RANGER',
            initials: 'KB',
            subtitle: 'Ranger • Yala National Park',
          }}
          isOnline={true}
          onSelectPatrol={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(getPatrolsSpy).toHaveBeenCalledWith('aaaa0002-0000-0000-0000-000000000002');
        expect(screen.getByText('PAT-2026-YAL-001')).toBeDefined();
      });
    });
  });

  describe('ActivePatrolScreen & Lifecycle Operations', () => {
    it('allows starting a PLANNED patrol and transitioning to ACTIVE', async () => {
      vi.spyOn(patrolMobileService, 'getPatrolRouteById').mockResolvedValue(mockRoute);
      const activePatrol: Patrol = {
        ...mockPatrol,
        status: PatrolStatus.ACTIVE,
        startTime: new Date().toISOString(),
      };
      const startSpy = vi.spyOn(patrolMobileService, 'startPatrol').mockResolvedValue(activePatrol);
      const onUpdated = vi.fn();

      render(
        <ActivePatrolScreen
          patrol={mockPatrol}
          isOnline={true}
          onBack={vi.fn()}
          onPatrolUpdated={onUpdated}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('PAT-2026-YAL-001')).toBeDefined();
        expect(screen.getByText('Start Patrol Now')).toBeDefined();
      });

      fireEvent.click(screen.getByText('Start Patrol Now'));

      await waitFor(() => {
        expect(startSpy).toHaveBeenCalledWith('patrol-101');
      });
    });

    it('displays Record Waypoint and Complete Patrol actions for an ACTIVE patrol', async () => {
      const activePatrol: Patrol = {
        ...mockPatrol,
        status: PatrolStatus.ACTIVE,
        startTime: new Date().toISOString(),
      };
      vi.spyOn(patrolMobileService, 'getPatrolRouteById').mockResolvedValue(mockRoute);
      const completeSpy = vi
        .spyOn(patrolMobileService, 'completePatrol')
        .mockResolvedValue({
          ...activePatrol,
          status: PatrolStatus.COMPLETED,
          endTime: new Date().toISOString(),
          coverageScore: 85,
        });

      render(
        <ActivePatrolScreen
          patrol={activePatrol}
          isOnline={true}
          onBack={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Record Waypoint')).toBeDefined();
        expect(screen.getByText('Complete Patrol')).toBeDefined();
      });

      fireEvent.click(screen.getByText('Complete Patrol'));
      fireEvent.click(screen.getByText('Confirm Completion'));

      await waitFor(() => {
        expect(completeSpy).toHaveBeenCalledWith('patrol-101');
      });
    });

    it('updates the screen only after the server confirms completion', async () => {
      const activePatrol: Patrol = { ...mockPatrol, status: PatrolStatus.ACTIVE };
      const completedPatrol: Patrol = {
        ...activePatrol,
        status: PatrolStatus.COMPLETED,
        endTime: new Date().toISOString(),
        coverageScore: 85,
      };
      vi.spyOn(patrolMobileService, 'getPatrolRouteById').mockResolvedValue(mockRoute);
      vi.spyOn(patrolMobileService, 'completePatrol').mockResolvedValue(completedPatrol);
      const onUpdated = vi.fn();

      render(
        <ActivePatrolScreen
          patrol={activePatrol}
          isOnline
          onBack={vi.fn()}
          onPatrolUpdated={onUpdated}
        />
      );

      fireEvent.click(await screen.findByText('Complete Patrol'));
      fireEvent.click(screen.getByText('Confirm Completion'));

      await waitFor(() => {
        expect(onUpdated).toHaveBeenCalledWith(completedPatrol);
        expect(screen.getByText('Patrol Concluded Successfully')).toBeDefined();
      });
      expect(screen.queryByText('Completion Error')).toBeNull();
    });

    it('shows a useful error and keeps the patrol active when completion fails', async () => {
      const activePatrol: Patrol = { ...mockPatrol, status: PatrolStatus.ACTIVE };
      vi.spyOn(patrolMobileService, 'getPatrolRouteById').mockResolvedValue(mockRoute);
      vi.spyOn(patrolMobileService, 'completePatrol').mockRejectedValue(
        new Error('Ranger session has expired. Sign in online again.')
      );
      const onUpdated = vi.fn();

      render(
        <ActivePatrolScreen
          patrol={activePatrol}
          isOnline
          onBack={vi.fn()}
          onPatrolUpdated={onUpdated}
        />
      );

      fireEvent.click(await screen.findByText('Complete Patrol'));
      fireEvent.click(screen.getByText('Confirm Completion'));

      const errorBanner = await screen.findByRole('alert');
      expect(errorBanner.textContent).toContain('Ranger session has expired. Sign in online again.');
      expect(screen.getByText('Complete Patrol')).toBeDefined();
      expect(onUpdated).not.toHaveBeenCalled();
    });

    it('prevents duplicate completion requests while one is in flight', async () => {
      const activePatrol: Patrol = { ...mockPatrol, status: PatrolStatus.ACTIVE };
      const completedPatrol: Patrol = {
        ...activePatrol,
        status: PatrolStatus.COMPLETED,
        endTime: new Date().toISOString(),
      };
      vi.spyOn(patrolMobileService, 'getPatrolRouteById').mockResolvedValue(mockRoute);
      let resolveCompletion!: (patrol: Patrol) => void;
      const completion = new Promise<Patrol>((resolve) => {
        resolveCompletion = resolve;
      });
      const completeSpy = vi.spyOn(patrolMobileService, 'completePatrol').mockReturnValue(completion);

      render(
        <ActivePatrolScreen
          patrol={activePatrol}
          isOnline
          onBack={vi.fn()}
        />
      );

      fireEvent.click(await screen.findByText('Complete Patrol'));
      const confirmButton = screen.getByText('Confirm Completion');
      fireEvent.click(confirmButton);
      fireEvent.click(confirmButton);

      expect(completeSpy).toHaveBeenCalledTimes(1);
      resolveCompletion(completedPatrol);
      await waitFor(() => expect(screen.getByText('Patrol Concluded Successfully')).toBeDefined());
    });
  });

  describe('PatrolRouteMap & Checkpoint Verification', () => {
    it('displays planned checkpoints with visited count and progress', () => {
      render(
        <PatrolRouteMap
          patrol={mockPatrol}
          route={mockRoute}
          visitedCheckpointIds={['cp-1']}
        />
      );

      expect(screen.getByText(/Gate Entry Point/i)).toBeDefined();
      expect(screen.getByText(/Sand Dune Checkpoint/i)).toBeDefined();
      expect(screen.getByText(/1\/2 Visited/i)).toBeDefined();
      expect(screen.getByText(/50% Coverage/i)).toBeDefined();
      expect(screen.getByText('VISITED')).toBeDefined();
      expect(screen.getByText('PENDING')).toBeDefined();
    });
  });
});
