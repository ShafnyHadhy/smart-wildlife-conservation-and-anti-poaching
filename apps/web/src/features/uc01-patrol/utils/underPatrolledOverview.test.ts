import { describe, it, expect } from 'vitest';
import {
  UNDER_PATROL_COVERAGE_THRESHOLD,
  LOW_PROGRESS_THRESHOLD,
  isPatrolUnderPatrolled,
  isPatrolLowProgress,
  evaluatePatrolAttention,
  getUnderPatrolledSummary,
} from './underPatrolledOverview';
import { LocationType, Patrol, PatrolRoute, PatrolStatus } from '@wildlife/shared';

const NOW = new Date('2026-10-08T12:00:00.000Z').getTime();

function minutesAgo(mins: number): string {
  return new Date(NOW - mins * 60 * 1000).toISOString();
}

function makeRoute(waypointsCount = 10): PatrolRoute {
  return {
    id: 'route-1',
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
      patrolRouteId: 'route-1',
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
    startTime: minutesAgo(60),
    coverageScore: 0,
    createdAt: minutesAgo(90),
    updatedAt: minutesAgo(10),
    rangerName: 'Kasun Bandara',
    routeName: 'Coastal Corridor',
    waypoints: [
      {
        id: 'wp-1',
        patrolId: 'patrol-1',
        latitude: 6.37,
        longitude: 81.51,
        sequenceOrder: 1,
        locationType: LocationType.GPS,
        recordedAt: minutesAgo(5),
      },
    ],
    ...overrides,
  };
}

describe('Under-Patrolled Overview & Identification (UC01 Task 7)', () => {
  describe('Centralized Constants', () => {
    it('UNDER_PATROL_COVERAGE_THRESHOLD is centralized at 70%', () => {
      expect(UNDER_PATROL_COVERAGE_THRESHOLD).toBe(70);
    });

    it('LOW_PROGRESS_THRESHOLD is centralized at 30%', () => {
      expect(LOW_PROGRESS_THRESHOLD).toBe(30);
    });
  });

  describe('isPatrolUnderPatrolled', () => {
    const route = makeRoute(10);

    it('returns true when active patrol has coverage < 70% with planned checkpoints', () => {
      // 5 out of 10 checkpoints visited = 50% (< 70%)
      const patrol = makePatrol({
        status: PatrolStatus.ACTIVE,
        waypoints: Array.from({ length: 5 }, (_, i) => ({
          id: `wp-${i + 1}`,
          patrolId: 'patrol-1',
          latitude: route.waypoints![i].latitude,
          longitude: route.waypoints![i].longitude,
          sequenceOrder: i + 1,
          locationType: LocationType.GPS,
          recordedAt: minutesAgo(10),
        })),
      });

      expect(isPatrolUnderPatrolled(patrol, route.waypoints)).toBe(true);
    });

    it('returns false when active patrol has coverage >= 70%', () => {
      // 8 out of 10 checkpoints visited = 80% (>= 70%)
      const patrol = makePatrol({
        status: PatrolStatus.ACTIVE,
        waypoints: Array.from({ length: 8 }, (_, i) => ({
          id: `wp-${i + 1}`,
          patrolId: 'patrol-1',
          latitude: route.waypoints![i].latitude,
          longitude: route.waypoints![i].longitude,
          sequenceOrder: i + 1,
          locationType: LocationType.GPS,
          recordedAt: minutesAgo(10),
        })),
      });

      expect(isPatrolUnderPatrolled(patrol, route.waypoints)).toBe(false);
    });

    it('boundary condition: exactly 70% coverage is NOT under-patrolled (inclusive)', () => {
      // 7 out of 10 checkpoints visited = 70%
      const patrol = makePatrol({
        status: PatrolStatus.ACTIVE,
        waypoints: Array.from({ length: 7 }, (_, i) => ({
          id: `wp-${i + 1}`,
          patrolId: 'patrol-1',
          latitude: route.waypoints![i].latitude,
          longitude: route.waypoints![i].longitude,
          sequenceOrder: i + 1,
          locationType: LocationType.GPS,
          recordedAt: minutesAgo(10),
        })),
      });

      expect(isPatrolUnderPatrolled(patrol, route.waypoints)).toBe(false);
    });

    it('boundary condition: 69% coverage is under-patrolled', () => {
      // 69 out of 100 checkpoints visited = 69%
      const largeRoute = makeRoute(100);
      const patrol = makePatrol({
        status: PatrolStatus.ACTIVE,
        waypoints: Array.from({ length: 69 }, (_, i) => ({
          id: `wp-${i + 1}`,
          patrolId: 'patrol-1',
          latitude: largeRoute.waypoints![i].latitude,
          longitude: largeRoute.waypoints![i].longitude,
          sequenceOrder: i + 1,
          locationType: LocationType.GPS,
          recordedAt: minutesAgo(10),
        })),
      });

      expect(isPatrolUnderPatrolled(patrol, largeRoute.waypoints)).toBe(true);
    });

    it('0% coverage with planned checkpoints and recorded waypoints outside corridor is under-patrolled', () => {
      const patrol = makePatrol({
        status: PatrolStatus.ACTIVE,
        waypoints: [
          {
            id: 'wp-far',
            patrolId: 'patrol-1',
            latitude: 1.0,
            longitude: 1.0,
            sequenceOrder: 1,
            locationType: LocationType.GPS,
            recordedAt: minutesAgo(10),
          },
        ],
      });

      expect(isPatrolUnderPatrolled(patrol, route.waypoints)).toBe(true);
    });

    it('100% coverage is NOT under-patrolled', () => {
      const patrol = makePatrol({
        status: PatrolStatus.ACTIVE,
        waypoints: Array.from({ length: 10 }, (_, i) => ({
          id: `wp-${i + 1}`,
          patrolId: 'patrol-1',
          latitude: route.waypoints![i].latitude,
          longitude: route.waypoints![i].longitude,
          sequenceOrder: i + 1,
          locationType: LocationType.GPS,
          recordedAt: minutesAgo(10),
        })),
      });

      expect(isPatrolUnderPatrolled(patrol, route.waypoints)).toBe(false);
    });

    it('returns false for PLANNED patrol (not started yet)', () => {
      const planned = makePatrol({ status: PatrolStatus.PLANNED });
      expect(isPatrolUnderPatrolled(planned, route.waypoints)).toBe(false);
    });

    it('returns false for COMPLETED patrol (shift ended, not an active under-patrolled patrol)', () => {
      const completed = makePatrol({
        status: PatrolStatus.COMPLETED,
        waypoints: [],
      });
      expect(isPatrolUnderPatrolled(completed, route.waypoints)).toBe(false);
    });

    it('returns false for CANCELLED patrol', () => {
      const cancelled = makePatrol({ status: PatrolStatus.CANCELLED });
      expect(isPatrolUnderPatrolled(cancelled, route.waypoints)).toBe(false);
    });

    it('returns false when planned route has no checkpoints (missing data)', () => {
      const patrol = makePatrol({ status: PatrolStatus.ACTIVE });
      expect(isPatrolUnderPatrolled(patrol, [])).toBe(false);
      expect(isPatrolUnderPatrolled(patrol, null)).toBe(false);
    });

    it('returns false when patrol is null or undefined', () => {
      expect(isPatrolUnderPatrolled(null, route.waypoints)).toBe(false);
      expect(isPatrolUnderPatrolled(undefined, route.waypoints)).toBe(false);
    });
  });

  describe('isPatrolLowProgress', () => {
    it('detects low progress (< 30%) on active patrol', () => {
      // 2 out of 10 waypoints = 20% (< 30%)
      const patrol = makePatrol({
        status: PatrolStatus.ACTIVE,
        waypoints: [
          {
            id: 'wp-1',
            patrolId: 'patrol-1',
            latitude: 6.37,
            longitude: 81.51,
            sequenceOrder: 1,
            locationType: LocationType.GPS,
            recordedAt: minutesAgo(5),
          },
          {
            id: 'wp-2',
            patrolId: 'patrol-1',
            latitude: 6.38,
            longitude: 81.52,
            sequenceOrder: 2,
            locationType: LocationType.GPS,
            recordedAt: minutesAgo(2),
          },
        ],
      });

      expect(isPatrolLowProgress(patrol, 10)).toBe(true);
    });

    it('returns false when progress >= 30%', () => {
      // 4 out of 10 waypoints = 40% (>= 30%)
      const patrol = makePatrol({
        status: PatrolStatus.ACTIVE,
        waypoints: Array.from({ length: 4 }, (_, i) => ({
          id: `wp-${i + 1}`,
          patrolId: 'patrol-1',
          latitude: 6.37 + i * 0.01,
          longitude: 81.51 + i * 0.01,
          sequenceOrder: i + 1,
          locationType: LocationType.GPS,
          recordedAt: minutesAgo(5),
        })),
      });

      expect(isPatrolLowProgress(patrol, 10)).toBe(false);
    });

    it('returns false for non-active patrols', () => {
      const planned = makePatrol({ status: PatrolStatus.PLANNED });
      expect(isPatrolLowProgress(planned, 10)).toBe(false);
      const completed = makePatrol({ status: PatrolStatus.COMPLETED });
      expect(isPatrolLowProgress(completed, 10)).toBe(false);
    });

    it('returns false when expected waypoints are missing or 0', () => {
      const patrol = makePatrol({ status: PatrolStatus.ACTIVE });
      expect(isPatrolLowProgress(patrol, 0)).toBe(false);
      expect(isPatrolLowProgress(patrol, null)).toBe(false);
    });
  });

  describe('evaluatePatrolAttention', () => {
    const route = makeRoute(10);

    it('evaluates healthy active patrol with good coverage, good progress, and current GPS', () => {
      // 8 of 10 checkpoints visited, recorded 5 mins ago
      const patrol = makePatrol({
        status: PatrolStatus.ACTIVE,
        waypoints: Array.from({ length: 8 }, (_, i) => ({
          id: `wp-${i + 1}`,
          patrolId: 'patrol-1',
          latitude: route.waypoints![i].latitude,
          longitude: route.waypoints![i].longitude,
          sequenceOrder: i + 1,
          locationType: LocationType.GPS,
          recordedAt: minutesAgo(5),
        })),
      });

      const result = evaluatePatrolAttention(patrol, route, NOW);
      expect(result.needsAttention).toBe(false);
      expect(result.isUnderPatrolled).toBe(false);
      expect(result.hasLowProgress).toBe(false);
      expect(result.hasLocationIssue).toBe(false);
      expect(result.reasons).toEqual([]);
      expect(result.coverage).toBe(80);
      expect(result.progress).toBe(80);
      expect(result.locationStatus).toBe('Current');
    });

    it('detects under-patrolled reason (coverage < 70%)', () => {
      // 4 of 10 checkpoints visited = 40% coverage
      const patrol = makePatrol({
        status: PatrolStatus.ACTIVE,
        waypoints: Array.from({ length: 4 }, (_, i) => ({
          id: `wp-${i + 1}`,
          patrolId: 'patrol-1',
          latitude: route.waypoints![i].latitude,
          longitude: route.waypoints![i].longitude,
          sequenceOrder: i + 1,
          locationType: LocationType.GPS,
          recordedAt: minutesAgo(5),
        })),
      });

      const result = evaluatePatrolAttention(patrol, route, NOW);
      expect(result.needsAttention).toBe(true);
      expect(result.isUnderPatrolled).toBe(true);
      expect(result.reasons).toContain('Low coverage');
    });

    it('detects low progress reason (progress < 30%)', () => {
      // 2 of 10 waypoints = 20% progress
      const patrol = makePatrol({
        status: PatrolStatus.ACTIVE,
        waypoints: Array.from({ length: 2 }, (_, i) => ({
          id: `wp-${i + 1}`,
          patrolId: 'patrol-1',
          latitude: route.waypoints![i].latitude,
          longitude: route.waypoints![i].longitude,
          sequenceOrder: i + 1,
          locationType: LocationType.GPS,
          recordedAt: minutesAgo(5),
        })),
      });

      const result = evaluatePatrolAttention(patrol, route, NOW);
      expect(result.needsAttention).toBe(true);
      expect(result.hasLowProgress).toBe(true);
      expect(result.reasons).toContain('Low progress');
    });

    it('detects stale location reason (GPS ping > 30 minutes ago)', () => {
      // Waypoint recorded 45 minutes ago
      const patrol = makePatrol({
        status: PatrolStatus.ACTIVE,
        waypoints: Array.from({ length: 8 }, (_, i) => ({
          id: `wp-${i + 1}`,
          patrolId: 'patrol-1',
          latitude: route.waypoints![i].latitude,
          longitude: route.waypoints![i].longitude,
          sequenceOrder: i + 1,
          locationType: LocationType.GPS,
          recordedAt: minutesAgo(45),
        })),
      });

      const result = evaluatePatrolAttention(patrol, route, NOW);
      expect(result.needsAttention).toBe(true);
      expect(result.hasLocationIssue).toBe(true);
      expect(result.locationStatus).toBe('Stale');
      expect(result.reasons).toContain('Stale location');
    });

    it('detects location unavailable reason (no GPS waypoints recorded for active patrol)', () => {
      const patrol = makePatrol({
        status: PatrolStatus.ACTIVE,
        waypoints: [],
      });

      const result = evaluatePatrolAttention(patrol, route, NOW);
      expect(result.needsAttention).toBe(true);
      expect(result.hasLocationIssue).toBe(true);
      expect(result.locationStatus).toBe('Unavailable');
      expect(result.reasons).toContain('Location unavailable');
    });

    it('detects multiple reasons simultaneously (e.g. low coverage + low progress + stale location)', () => {
      const patrol = makePatrol({
        status: PatrolStatus.ACTIVE,
        waypoints: [
          {
            id: 'wp-1',
            patrolId: 'patrol-1',
            latitude: 6.37,
            longitude: 81.51,
            sequenceOrder: 1,
            locationType: LocationType.GPS,
            recordedAt: minutesAgo(60), // stale
          },
        ],
      });

      const result = evaluatePatrolAttention(patrol, route, NOW);
      expect(result.needsAttention).toBe(true);
      expect(result.isUnderPatrolled).toBe(true);
      expect(result.hasLowProgress).toBe(true);
      expect(result.hasLocationIssue).toBe(true);
      expect(result.reasons).toEqual(['Low coverage', 'Low progress', 'Stale location']);
    });

    it('does not flag PLANNED patrol as needing attention', () => {
      const planned = makePatrol({
        status: PatrolStatus.PLANNED,
        waypoints: [],
      });
      const result = evaluatePatrolAttention(planned, route, NOW);
      expect(result.needsAttention).toBe(false);
      expect(result.reasons).toEqual([]);
    });

    it('does not flag COMPLETED patrol as needing active attention', () => {
      const completed = makePatrol({
        status: PatrolStatus.COMPLETED,
        waypoints: [],
      });
      const result = evaluatePatrolAttention(completed, route, NOW);
      expect(result.needsAttention).toBe(false);
      expect(result.reasons).toEqual([]);
    });

    it('does not flag CANCELLED patrol as needing active attention', () => {
      const cancelled = makePatrol({
        status: PatrolStatus.CANCELLED,
        waypoints: [],
      });
      const result = evaluatePatrolAttention(cancelled, route, NOW);
      expect(result.needsAttention).toBe(false);
      expect(result.reasons).toEqual([]);
    });

    it('handles missing route safely without throwing', () => {
      const patrol = makePatrol({ status: PatrolStatus.ACTIVE });
      expect(() => evaluatePatrolAttention(patrol, undefined, NOW)).not.toThrow();
    });
  });

  describe('getUnderPatrolledSummary', () => {
    const route = makeRoute(10);

    it('aggregates multiple affected patrols correctly', () => {
      const healthyPatrol = makePatrol({
        id: 'patrol-ok',
        patrolCode: 'PAT-HEALTHY',
        status: PatrolStatus.ACTIVE,
        waypoints: Array.from({ length: 8 }, (_, i) => ({
          id: `wp-${i + 1}`,
          patrolId: 'patrol-ok',
          latitude: route.waypoints![i].latitude,
          longitude: route.waypoints![i].longitude,
          sequenceOrder: i + 1,
          locationType: LocationType.GPS,
          recordedAt: minutesAgo(5),
        })),
      });

      const underPatrolledPatrol = makePatrol({
        id: 'patrol-under',
        patrolCode: 'PAT-UNDER',
        status: PatrolStatus.ACTIVE,
        waypoints: Array.from({ length: 4 }, (_, i) => ({
          id: `wp-${i + 1}`,
          patrolId: 'patrol-under',
          latitude: route.waypoints![i].latitude,
          longitude: route.waypoints![i].longitude,
          sequenceOrder: i + 1,
          locationType: LocationType.GPS,
          recordedAt: minutesAgo(5),
        })),
      });

      const stalePatrol = makePatrol({
        id: 'patrol-stale',
        patrolCode: 'PAT-STALE',
        status: PatrolStatus.ACTIVE,
        waypoints: Array.from({ length: 8 }, (_, i) => ({
          id: `wp-${i + 1}`,
          patrolId: 'patrol-stale',
          latitude: route.waypoints![i].latitude,
          longitude: route.waypoints![i].longitude,
          sequenceOrder: i + 1,
          locationType: LocationType.GPS,
          recordedAt: minutesAgo(50),
        })),
      });

      const completedPatrol = makePatrol({
        id: 'patrol-comp',
        patrolCode: 'PAT-COMP',
        status: PatrolStatus.COMPLETED,
        waypoints: [],
      });

      const summary = getUnderPatrolledSummary(
        [healthyPatrol, underPatrolledPatrol, stalePatrol, completedPatrol],
        [route],
        NOW
      );

      expect(summary.totalActive).toBe(3);
      expect(summary.attentionCount).toBe(2);
      expect(summary.underPatrolledCount).toBe(1);
      expect(summary.staleLocationCount).toBe(1);
      expect(summary.attentionPatrols).toHaveLength(2);
      expect(summary.attentionPatrols.map((p) => p.patrolCode)).toEqual(['PAT-UNDER', 'PAT-STALE']);
    });

    it('returns empty attention list when all active patrols are healthy', () => {
      const healthyPatrol = makePatrol({
        id: 'patrol-ok',
        status: PatrolStatus.ACTIVE,
        waypoints: Array.from({ length: 10 }, (_, i) => ({
          id: `wp-${i + 1}`,
          patrolId: 'patrol-ok',
          latitude: route.waypoints![i].latitude,
          longitude: route.waypoints![i].longitude,
          sequenceOrder: i + 1,
          locationType: LocationType.GPS,
          recordedAt: minutesAgo(5),
        })),
      });

      const summary = getUnderPatrolledSummary([healthyPatrol], [route], NOW);
      expect(summary.totalActive).toBe(1);
      expect(summary.attentionCount).toBe(0);
      expect(summary.attentionPatrols).toEqual([]);
    });

    it('returns attentionCount 0 when there are no active patrols (only planned/completed)', () => {
      const planned = makePatrol({ status: PatrolStatus.PLANNED, waypoints: [] });
      const completed = makePatrol({ status: PatrolStatus.COMPLETED, waypoints: [] });

      const summary = getUnderPatrolledSummary([planned, completed], [route], NOW);
      expect(summary.totalActive).toBe(0);
      expect(summary.attentionCount).toBe(0);
      expect(summary.attentionPatrols).toEqual([]);
    });

    it('handles empty patrol array cleanly without error', () => {
      const summary = getUnderPatrolledSummary([], [route], NOW);
      expect(summary.totalActive).toBe(0);
      expect(summary.attentionCount).toBe(0);
      expect(summary.attentionPatrols).toEqual([]);
    });
  });
});
