import { describe, it, expect } from 'vitest';
import {
  calculatePatrolStatistics,
  isSameCalendarDay,
  getPatrolCompletionDate,
} from './patrolStatistics';
import { LocationType, Patrol, PatrolRoute, PatrolStatus } from '@wildlife/shared';

const FIXED_NOW = new Date('2026-10-08T12:00:00.000Z');

function makeRoute(id = 'route-1', waypointsCount = 10): PatrolRoute {
  return {
    id,
    parkId: 'park-1',
    name: 'Coastal Corridor',
    code: 'YALA-RT-01',
    description: 'Yala coastal corridor',
    estimatedDurationMinutes: 240,
    routeType: 'FOOT_PATROL',
    isActive: true,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    waypoints: Array.from({ length: waypointsCount }, (_, i) => ({
      id: `cp-${i + 1}`,
      patrolRouteId: id,
      latitude: 6.37 + i * 0.01,
      longitude: 81.51 + i * 0.01,
      sequenceOrder: i + 1,
      locationType: LocationType.GPS,
      recordedAt: '2026-10-01T00:00:00.000Z',
    })),
  };
}

function makePatrol(overrides?: Partial<Patrol>): Patrol {
  return {
    id: 'patrol-1',
    patrolCode: 'PAT-2026-001',
    parkId: 'park-1',
    rangerId: 'ranger-1',
    patrolRouteId: 'route-1',
    status: PatrolStatus.ACTIVE,
    startTime: '2026-10-08T08:00:00.000Z',
    coverageScore: 0,
    createdAt: '2026-10-08T08:00:00.000Z',
    updatedAt: '2026-10-08T08:00:00.000Z',
    rangerName: 'Kasun Bandara',
    routeName: 'Coastal Corridor',
    waypoints: [],
    ...overrides,
  };
}

describe('Patrol Overview Statistics Utility (UC01 Task 8)', () => {
  describe('Date Helpers', () => {
    it('isSameCalendarDay returns true for same day different times', () => {
      const d1 = new Date('2026-10-08T02:00:00.000Z');
      const d2 = new Date('2026-10-08T22:30:00.000Z');
      expect(isSameCalendarDay(d1, d2)).toBe(true);
    });

    it('isSameCalendarDay returns false for different calendar days', () => {
      const d1 = new Date('2026-10-07T23:59:59.000Z');
      const d2 = new Date('2026-10-08T00:00:01.000Z');
      expect(isSameCalendarDay(d1, d2)).toBe(false);
    });

    it('getPatrolCompletionDate prefers endTime over updatedAt', () => {
      const patrol = makePatrol({
        status: PatrolStatus.COMPLETED,
        endTime: '2026-10-08T11:00:00.000Z',
        updatedAt: '2026-10-08T12:00:00.000Z',
      });
      const d = getPatrolCompletionDate(patrol);
      expect(d?.toISOString()).toBe('2026-10-08T11:00:00.000Z');
    });

    it('getPatrolCompletionDate falls back to updatedAt when endTime is missing', () => {
      const patrol = makePatrol({
        status: PatrolStatus.COMPLETED,
        endTime: undefined,
        updatedAt: '2026-10-08T10:30:00.000Z',
      });
      const d = getPatrolCompletionDate(patrol);
      expect(d?.toISOString()).toBe('2026-10-08T10:30:00.000Z');
    });

    it('getPatrolCompletionDate returns null for invalid date string', () => {
      const patrol = makePatrol({
        status: PatrolStatus.COMPLETED,
        endTime: 'not-a-date',
        updatedAt: '',
      });
      expect(getPatrolCompletionDate(patrol)).toBeNull();
    });
  });

  describe('1. Active Patrols Count', () => {
    it('accurately counts currently active patrols', () => {
      const patrols = [
        makePatrol({ id: 'p-1', status: PatrolStatus.ACTIVE }),
        makePatrol({ id: 'p-2', status: PatrolStatus.ACTIVE }),
        makePatrol({ id: 'p-3', status: PatrolStatus.PLANNED }),
        makePatrol({ id: 'p-4', status: PatrolStatus.COMPLETED }),
        makePatrol({ id: 'p-5', status: PatrolStatus.CANCELLED }),
      ];

      const stats = calculatePatrolStatistics(patrols, [], FIXED_NOW);
      expect(stats.activeCount).toBe(2);
    });

    it('returns 0 when no patrols are active', () => {
      const patrols = [
        makePatrol({ id: 'p-1', status: PatrolStatus.PLANNED }),
        makePatrol({ id: 'p-2', status: PatrolStatus.COMPLETED }),
        makePatrol({ id: 'p-3', status: PatrolStatus.CANCELLED }),
      ];

      const stats = calculatePatrolStatistics(patrols, [], FIXED_NOW);
      expect(stats.activeCount).toBe(0);
    });

    it('handles multiple active patrols correctly', () => {
      const patrols = Array.from({ length: 5 }, (_, i) =>
        makePatrol({ id: `p-${i}`, status: PatrolStatus.ACTIVE })
      );

      const stats = calculatePatrolStatistics(patrols, [], FIXED_NOW);
      expect(stats.activeCount).toBe(5);
    });
  });

  describe('2. Completed Today Count', () => {
    it('counts patrols completed on current calendar day', () => {
      const patrols = [
        makePatrol({
          id: 'p-today-1',
          status: PatrolStatus.COMPLETED,
          endTime: '2026-10-08T09:30:00.000Z',
        }),
        makePatrol({
          id: 'p-today-2',
          status: PatrolStatus.COMPLETED,
          endTime: '2026-10-08T11:45:00.000Z',
        }),
      ];

      const stats = calculatePatrolStatistics(patrols, [], FIXED_NOW);
      expect(stats.completedTodayCount).toBe(2);
    });

    it('excludes patrols completed yesterday or in previous days', () => {
      const patrols = [
        makePatrol({
          id: 'p-yesterday',
          status: PatrolStatus.COMPLETED,
          endTime: '2026-10-07T16:00:00.000Z', // Yesterday
        }),
        makePatrol({
          id: 'p-last-week',
          status: PatrolStatus.COMPLETED,
          endTime: '2026-10-01T10:00:00.000Z',
        }),
        makePatrol({
          id: 'p-today',
          status: PatrolStatus.COMPLETED,
          endTime: '2026-10-08T06:00:00.000Z',
        }),
      ];

      const stats = calculatePatrolStatistics(patrols, [], FIXED_NOW);
      expect(stats.completedTodayCount).toBe(1);
    });

    it('returns 0 when no patrols completed today', () => {
      const patrols = [
        makePatrol({
          id: 'p-yesterday',
          status: PatrolStatus.COMPLETED,
          endTime: '2026-10-07T22:00:00.000Z',
        }),
        makePatrol({
          id: 'p-active',
          status: PatrolStatus.ACTIVE,
          updatedAt: '2026-10-08T12:00:00.000Z',
        }),
      ];

      const stats = calculatePatrolStatistics(patrols, [], FIXED_NOW);
      expect(stats.completedTodayCount).toBe(0);
    });

    it('does not count ACTIVE, PLANNED, or CANCELLED patrols even if updated today', () => {
      const patrols = [
        makePatrol({
          id: 'p-active',
          status: PatrolStatus.ACTIVE,
          endTime: '2026-10-08T10:00:00.000Z',
        }),
        makePatrol({
          id: 'p-planned',
          status: PatrolStatus.PLANNED,
          updatedAt: '2026-10-08T10:00:00.000Z',
        }),
        makePatrol({
          id: 'p-cancelled',
          status: PatrolStatus.CANCELLED,
          updatedAt: '2026-10-08T10:00:00.000Z',
        }),
      ];

      const stats = calculatePatrolStatistics(patrols, [], FIXED_NOW);
      expect(stats.completedTodayCount).toBe(0);
    });
  });

  describe('3. Average Coverage (Reusing Task 5)', () => {
    const route = makeRoute('route-1', 10);

    it('calculates average coverage across patrols with valid coverage data', () => {
      // Patrol 1 visits 8 of 10 checkpoints = 80%
      const patrol1 = makePatrol({
        id: 'p-1',
        status: PatrolStatus.ACTIVE,
        patrolRouteId: 'route-1',
        waypoints: Array.from({ length: 8 }, (_, i) => ({
          id: `wp-1-${i}`,
          patrolId: 'p-1',
          latitude: route.waypoints![i].latitude,
          longitude: route.waypoints![i].longitude,
          sequenceOrder: i + 1,
          locationType: LocationType.GPS,
          recordedAt: '2026-10-08T09:00:00.000Z',
        })),
      });

      // Patrol 2 visits 4 of 10 checkpoints = 40%
      const patrol2 = makePatrol({
        id: 'p-2',
        status: PatrolStatus.ACTIVE,
        patrolRouteId: 'route-1',
        waypoints: Array.from({ length: 4 }, (_, i) => ({
          id: `wp-2-${i}`,
          patrolId: 'p-2',
          latitude: route.waypoints![i].latitude,
          longitude: route.waypoints![i].longitude,
          sequenceOrder: i + 1,
          locationType: LocationType.GPS,
          recordedAt: '2026-10-08T09:00:00.000Z',
        })),
      });

      // Average of 80% and 40% is 60%
      const stats = calculatePatrolStatistics([patrol1, patrol2], [route], FIXED_NOW);
      expect(stats.averageCoverage).toBe(60);
      expect(stats.averageCoverageFormatted).toBe('60%');
      expect(stats.validCoveragePatrolsCount).toBe(2);
    });

    it('excludes patrols with No Coverage Data (planned or missing route/data) from average', () => {
      // Patrol 1 has 80% coverage
      const patrol1 = makePatrol({
        id: 'p-1',
        status: PatrolStatus.ACTIVE,
        patrolRouteId: 'route-1',
        waypoints: Array.from({ length: 8 }, (_, i) => ({
          id: `wp-1-${i}`,
          patrolId: 'p-1',
          latitude: route.waypoints![i].latitude,
          longitude: route.waypoints![i].longitude,
          sequenceOrder: i + 1,
          locationType: LocationType.GPS,
          recordedAt: '2026-10-08T09:00:00.000Z',
        })),
      });

      // Patrol 2 is PLANNED -> 'No Coverage Data' -> should not dilute average
      const patrol2 = makePatrol({
        id: 'p-2',
        status: PatrolStatus.PLANNED,
        patrolRouteId: 'route-1',
        waypoints: [],
      });

      // Patrol 3 has missing route -> 'No Coverage Data'
      const patrol3 = makePatrol({
        id: 'p-3',
        status: PatrolStatus.ACTIVE,
        patrolRouteId: 'non-existent-route',
        waypoints: [],
      });

      const stats = calculatePatrolStatistics([patrol1, patrol2, patrol3], [route], FIXED_NOW);
      expect(stats.averageCoverage).toBe(80);
      expect(stats.averageCoverageFormatted).toBe('80%');
      expect(stats.validCoveragePatrolsCount).toBe(1);
    });

    it('returns 0 and "0%" when no patrols have valid coverage (never NaN or Infinity)', () => {
      const patrols = [
        makePatrol({ id: 'p-1', status: PatrolStatus.PLANNED, waypoints: [] }),
        makePatrol({ id: 'p-2', status: PatrolStatus.COMPLETED, waypoints: [] }),
      ];

      const stats = calculatePatrolStatistics(patrols, [route], FIXED_NOW);
      expect(stats.averageCoverage).toBe(0);
      expect(stats.averageCoverageFormatted).toBe('0%');
      expect(Number.isNaN(stats.averageCoverage)).toBe(false);
      expect(Number.isFinite(stats.averageCoverage)).toBe(true);
    });

    it('handles 0% and 100% boundary coverages correctly', () => {
      // 0% coverage with planned checkpoints (visited none)
      const patrolZero = makePatrol({
        id: 'p-zero',
        status: PatrolStatus.ACTIVE,
        patrolRouteId: 'route-1',
        waypoints: [
          {
            id: 'wp-far',
            patrolId: 'p-zero',
            latitude: 1.0,
            longitude: 1.0,
            sequenceOrder: 1,
            locationType: LocationType.GPS,
            recordedAt: '2026-10-08T09:00:00.000Z',
          },
        ],
      });

      const statsZero = calculatePatrolStatistics([patrolZero], [route], FIXED_NOW);
      expect(statsZero.averageCoverage).toBe(0);
      expect(statsZero.averageCoverageFormatted).toBe('0%');

      // 100% coverage
      const patrolFull = makePatrol({
        id: 'p-full',
        status: PatrolStatus.ACTIVE,
        patrolRouteId: 'route-1',
        waypoints: Array.from({ length: 10 }, (_, i) => ({
          id: `wp-f-${i}`,
          patrolId: 'p-full',
          latitude: route.waypoints![i].latitude,
          longitude: route.waypoints![i].longitude,
          sequenceOrder: i + 1,
          locationType: LocationType.GPS,
          recordedAt: '2026-10-08T09:00:00.000Z',
        })),
      });

      const statsFull = calculatePatrolStatistics([patrolFull], [route], FIXED_NOW);
      expect(statsFull.averageCoverage).toBe(100);
      expect(statsFull.averageCoverageFormatted).toBe('100%');
    });
  });

  describe('4. Under-Patrolled Count (Reusing Task 7)', () => {
    const route = makeRoute('route-1', 10);

    it('reuses Task 7 under-patrolled summary to count under-patrolled active patrols', () => {
      // Under-patrolled active patrol: 4 of 10 checkpoints = 40% (< 70%)
      const underPatrol = makePatrol({
        id: 'p-under',
        status: PatrolStatus.ACTIVE,
        patrolRouteId: 'route-1',
        waypoints: Array.from({ length: 4 }, (_, i) => ({
          id: `wp-${i}`,
          patrolId: 'p-under',
          latitude: route.waypoints![i].latitude,
          longitude: route.waypoints![i].longitude,
          sequenceOrder: i + 1,
          locationType: LocationType.GPS,
          recordedAt: '2026-10-08T11:55:00.000Z',
        })),
      });

      // Healthy active patrol: 8 of 10 checkpoints = 80% (>= 70%)
      const healthyPatrol = makePatrol({
        id: 'p-healthy',
        status: PatrolStatus.ACTIVE,
        patrolRouteId: 'route-1',
        waypoints: Array.from({ length: 8 }, (_, i) => ({
          id: `wp-${i}`,
          patrolId: 'p-healthy',
          latitude: route.waypoints![i].latitude,
          longitude: route.waypoints![i].longitude,
          sequenceOrder: i + 1,
          locationType: LocationType.GPS,
          recordedAt: '2026-10-08T11:55:00.000Z',
        })),
      });

      const stats = calculatePatrolStatistics([underPatrol, healthyPatrol], [route], FIXED_NOW);
      expect(stats.underPatrolledCount).toBe(1);
    });

    it('returns 0 when no patrols are under-patrolled', () => {
      const healthyPatrol = makePatrol({
        id: 'p-healthy',
        status: PatrolStatus.ACTIVE,
        patrolRouteId: 'route-1',
        waypoints: Array.from({ length: 9 }, (_, i) => ({
          id: `wp-${i}`,
          patrolId: 'p-healthy',
          latitude: route.waypoints![i].latitude,
          longitude: route.waypoints![i].longitude,
          sequenceOrder: i + 1,
          locationType: LocationType.GPS,
          recordedAt: '2026-10-08T11:55:00.000Z',
        })),
      });

      const stats = calculatePatrolStatistics([healthyPatrol], [route], FIXED_NOW);
      expect(stats.underPatrolledCount).toBe(0);
    });

    it('does not count completed or planned patrols as under-patrolled', () => {
      const completed = makePatrol({
        id: 'p-completed',
        status: PatrolStatus.COMPLETED,
        patrolRouteId: 'route-1',
        waypoints: [],
      });
      const planned = makePatrol({
        id: 'p-planned',
        status: PatrolStatus.PLANNED,
        patrolRouteId: 'route-1',
        waypoints: [],
      });

      const stats = calculatePatrolStatistics([completed, planned], [route], FIXED_NOW);
      expect(stats.underPatrolledCount).toBe(0);
    });
  });

  describe('5. Empty Data and Edge Cases', () => {
    it('returns safe default zeros for empty patrol array', () => {
      const stats = calculatePatrolStatistics([], [], FIXED_NOW);
      expect(stats.activeCount).toBe(0);
      expect(stats.completedTodayCount).toBe(0);
      expect(stats.averageCoverage).toBe(0);
      expect(stats.averageCoverageFormatted).toBe('0%');
      expect(stats.underPatrolledCount).toBe(0);
      expect(stats.totalPatrols).toBe(0);
      expect(stats.validCoveragePatrolsCount).toBe(0);
    });

    it('handles null and undefined arguments safely', () => {
      const stats1 = calculatePatrolStatistics(null, null, FIXED_NOW);
      expect(stats1.activeCount).toBe(0);
      expect(stats1.averageCoverageFormatted).toBe('0%');

      const stats2 = calculatePatrolStatistics(undefined, undefined, FIXED_NOW);
      expect(stats2.activeCount).toBe(0);
      expect(stats2.averageCoverageFormatted).toBe('0%');
    });

    it('handles patrols with missing waypoints or missing route gracefully', () => {
      const brokenPatrol = makePatrol({
        id: 'p-broken',
        status: PatrolStatus.ACTIVE,
        patrolRouteId: 'no-match',
        waypoints: undefined,
      });

      expect(() => calculatePatrolStatistics([brokenPatrol], [], FIXED_NOW)).not.toThrow();
      const stats = calculatePatrolStatistics([brokenPatrol], [], FIXED_NOW);
      expect(stats.activeCount).toBe(1);
      expect(stats.averageCoverage).toBe(0);
      expect(stats.averageCoverageFormatted).toBe('0%');
    });
  });
});
