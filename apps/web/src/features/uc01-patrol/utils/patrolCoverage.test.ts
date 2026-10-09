import { describe, it, expect } from 'vitest';
import {
  calculateCoveragePercentage,
  calculatePatrolCoverage,
  isCheckpointVisited,
  countVisitedCheckpoints,
  classifyCoverage,
  classifyPatrolCoverage,
  formatCoverage,
  UNDER_PATROLLED_COVERAGE_THRESHOLD,
  DEFAULT_CHECKPOINT_PROXIMITY_KM,
} from './patrolCoverage';
import { Patrol, PatrolStatus, LocationType, Waypoint } from '@wildlife/shared';

describe('Patrol Coverage Calculation Utility (UC01)', () => {
  describe('calculateCoveragePercentage', () => {
    it('1. returns 0% when 0 visited out of 10 planned', () => {
      expect(calculateCoveragePercentage(0, 10)).toBe(0);
    });

    it('2. returns 50% when 5 visited out of 10 planned', () => {
      expect(calculateCoveragePercentage(5, 10)).toBe(50);
    });

    it('3. returns 80% when 8 visited out of 10 planned', () => {
      expect(calculateCoveragePercentage(8, 10)).toBe(80);
    });

    it('4. returns 100% when 10 visited out of 10 planned', () => {
      expect(calculateCoveragePercentage(10, 10)).toBe(100);
    });

    it('5. clamps to 100% when more visited than planned (e.g. 12 / 10)', () => {
      expect(calculateCoveragePercentage(12, 10)).toBe(100);
      expect(calculateCoveragePercentage(25, 10)).toBe(100);
    });

    it('6. handles zero planned checkpoints safely without returning NaN or Infinity', () => {
      expect(calculateCoveragePercentage(0, 0)).toBe(0);
      expect(calculateCoveragePercentage(5, 0)).toBe(0);
      expect(Number.isNaN(calculateCoveragePercentage(5, 0))).toBe(false);
      expect(Number.isFinite(calculateCoveragePercentage(5, 0))).toBe(true);
    });

    it('7. handles missing planned data safely (undefined / null)', () => {
      expect(calculateCoveragePercentage(5, undefined)).toBe(0);
      expect(calculateCoveragePercentage(5, null)).toBe(0);
      expect(calculateCoveragePercentage(undefined, undefined)).toBe(0);
    });

    it('8. handles missing visited data safely (undefined / null)', () => {
      expect(calculateCoveragePercentage(undefined, 10)).toBe(0);
      expect(calculateCoveragePercentage(null, 10)).toBe(0);
      expect(calculateCoveragePercentage(null, null)).toBe(0);
    });

    it('handles negative numbers safely without returning negative percentages', () => {
      expect(calculateCoveragePercentage(-2, 10)).toBe(0);
      expect(calculateCoveragePercentage(5, -10)).toBe(0);
      expect(calculateCoveragePercentage(-5, -10)).toBe(0);
    });

    it('rounds percentages sensibly', () => {
      // 1 / 3 = 33.333% -> 33%
      expect(calculateCoveragePercentage(1, 3)).toBe(33);
      // 2 / 3 = 66.666% -> 67%
      expect(calculateCoveragePercentage(2, 3)).toBe(67);
      // 7 / 9 = 77.777% -> 78%
      expect(calculateCoveragePercentage(7, 9)).toBe(78);
    });
  });

  describe('Geographic Proximity Checkpoint Matching (Haversine)', () => {
    // Reference checkpoint at Palatupana Base Gate Entry in Yala
    const checkpoint: Waypoint = {
      id: 'cp-1',
      patrolRouteId: 'route-1',
      latitude: 6.3725,
      longitude: 81.5165,
      sequenceOrder: 1,
      locationType: LocationType.GPS,
      recordedAt: '2026-10-07T08:00:00.000Z',
      notes: 'Palatupana Base Gate',
    };

    it('marks checkpoint as visited when actual waypoint is inside accepted distance (<= 0.2 km)', () => {
      // Waypoint very close (~50 meters away: lat diff 0.00045)
      const nearbyWaypoint: Waypoint = {
        id: 'wp-near',
        patrolId: 'patrol-1',
        latitude: 6.3728,
        longitude: 81.5168,
        sequenceOrder: 1,
        locationType: LocationType.GPS,
        recordedAt: '2026-10-07T09:00:00.000Z',
      };

      const visited = isCheckpointVisited(checkpoint, [nearbyWaypoint], DEFAULT_CHECKPOINT_PROXIMITY_KM);
      expect(visited).toBe(true);
    });

    it('marks checkpoint as visited when actual waypoint is at exact coordinates (0 km distance)', () => {
      const exactWaypoint: Waypoint = {
        id: 'wp-exact',
        patrolId: 'patrol-1',
        latitude: 6.3725,
        longitude: 81.5165,
        sequenceOrder: 1,
        locationType: LocationType.GPS,
        recordedAt: '2026-10-07T09:00:00.000Z',
      };

      const visited = isCheckpointVisited(checkpoint, [exactWaypoint], DEFAULT_CHECKPOINT_PROXIMITY_KM);
      expect(visited).toBe(true);
    });

    it('marks checkpoint as NOT visited when actual waypoint is outside accepted distance (> 0.2 km)', () => {
      // Waypoint ~1.5 km away
      const distantWaypoint: Waypoint = {
        id: 'wp-far',
        patrolId: 'patrol-1',
        latitude: 6.385,
        longitude: 81.528,
        sequenceOrder: 1,
        locationType: LocationType.GPS,
        recordedAt: '2026-10-07T09:00:00.000Z',
      };

      const visited = isCheckpointVisited(checkpoint, [distantWaypoint], DEFAULT_CHECKPOINT_PROXIMITY_KM);
      expect(visited).toBe(false);
    });

    it('handles empty or missing actual waypoints safely', () => {
      expect(isCheckpointVisited(checkpoint, [])).toBe(false);
      expect(isCheckpointVisited(checkpoint, undefined)).toBe(false);
      expect(isCheckpointVisited(checkpoint, null)).toBe(false);
    });

    it('correctly counts visited checkpoints across multiple planned checkpoints', () => {
      const plannedCheckpoints: Waypoint[] = [
        {
          id: 'cp-1',
          latitude: 6.3725,
          longitude: 81.5165,
          sequenceOrder: 1,
          locationType: LocationType.GPS,
          recordedAt: '2026-10-07T08:00:00.000Z',
        },
        {
          id: 'cp-2',
          latitude: 6.378,
          longitude: 81.523,
          sequenceOrder: 2,
          locationType: LocationType.GPS,
          recordedAt: '2026-10-07T08:00:00.000Z',
        },
        {
          id: 'cp-3',
          latitude: 6.385,
          longitude: 81.53,
          sequenceOrder: 3,
          locationType: LocationType.GPS,
          recordedAt: '2026-10-07T08:00:00.000Z',
        },
      ];

      // Actual waypoints visiting only cp-1 and cp-2
      const actualWaypoints: Waypoint[] = [
        {
          id: 'wp-1',
          latitude: 6.3725,
          longitude: 81.5165, // matches cp-1
          sequenceOrder: 1,
          locationType: LocationType.GPS,
          recordedAt: '2026-10-07T09:00:00.000Z',
        },
        {
          id: 'wp-2',
          latitude: 6.375,
          longitude: 81.52, // intermediate breadcrumb
          sequenceOrder: 2,
          locationType: LocationType.GPS,
          recordedAt: '2026-10-07T09:30:00.000Z',
        },
        {
          id: 'wp-3',
          latitude: 6.3781,
          longitude: 81.5231, // matches cp-2 (~15m away)
          sequenceOrder: 3,
          locationType: LocationType.GPS,
          recordedAt: '2026-10-07T10:00:00.000Z',
        },
      ];

      const visitedCount = countVisitedCheckpoints(plannedCheckpoints, actualWaypoints);
      expect(visitedCount).toBe(2);
    });
  });

  describe('calculatePatrolCoverage & Lifecycle Rules', () => {
    // 10 planned checkpoints spaced out
    const plannedCheckpoints: Waypoint[] = Array.from({ length: 10 }, (_, i) => ({
      id: `cp-${i + 1}`,
      patrolRouteId: 'route-1',
      latitude: 6.37 + i * 0.01,
      longitude: 81.51 + i * 0.01,
      sequenceOrder: i + 1,
      locationType: LocationType.GPS,
      recordedAt: '2026-10-07T08:00:00.000Z',
    }));

    const basePatrol: Patrol = {
      id: 'patrol-1',
      patrolCode: 'PAT-2026-YAL-001',
      parkId: 'park-1',
      rangerId: 'ranger-1',
      patrolRouteId: 'route-1',
      status: PatrolStatus.ACTIVE,
      startTime: '2026-10-07T09:00:00.000Z',
      coverageScore: 99, // Must NOT be used blindly
      createdAt: '2026-10-07T09:00:00.000Z',
      updatedAt: '2026-10-07T09:00:00.000Z',
      waypoints: plannedCheckpoints.slice(0, 8).map((cp, i) => ({
        id: `wp-${i + 1}`,
        patrolId: 'patrol-1',
        latitude: cp.latitude,
        longitude: cp.longitude,
        sequenceOrder: i + 1,
        locationType: LocationType.GPS,
        recordedAt: '2026-10-07T09:30:00.000Z',
      })),
    };

    it('calculates ACTIVE patrol coverage accurately (8 of 10 visited = 80%)', () => {
      const coverage = calculatePatrolCoverage(basePatrol, plannedCheckpoints);
      expect(coverage).toBe(80);
    });

    it('9. COMPLETED patrol does NOT automatically become 100% (calculates from actual visited data)', () => {
      const completedPatrol: Patrol = {
        ...basePatrol,
        status: PatrolStatus.COMPLETED,
        endTime: '2026-10-07T13:00:00.000Z',
        // Still only visited 8 out of 10 checkpoints
      };

      const coverage = calculatePatrolCoverage(completedPatrol, plannedCheckpoints);
      expect(coverage).toBe(80);
      expect(coverage).not.toBe(100);
    });

    it('COMPLETED patrol returns 100% when all checkpoints are actually visited', () => {
      const fullyCompletedPatrol: Patrol = {
        ...basePatrol,
        status: PatrolStatus.COMPLETED,
        endTime: '2026-10-07T13:00:00.000Z',
        waypoints: plannedCheckpoints.map((cp, i) => ({
          id: `wp-${i + 1}`,
          patrolId: 'patrol-1',
          latitude: cp.latitude,
          longitude: cp.longitude,
          sequenceOrder: i + 1,
          locationType: LocationType.GPS,
          recordedAt: '2026-10-07T09:30:00.000Z',
        })),
      };

      const coverage = calculatePatrolCoverage(fullyCompletedPatrol, plannedCheckpoints);
      expect(coverage).toBe(100);
    });

    it('10. PLANNED patrol does not falsely show active coverage (returns 0%)', () => {
      const plannedPatrol: Patrol = {
        ...basePatrol,
        status: PatrolStatus.PLANNED,
        waypoints: [],
      };

      expect(calculatePatrolCoverage(plannedPatrol, plannedCheckpoints)).toBe(0);
    });

    it('CANCELLED patrol returns 0% safely', () => {
      const cancelledPatrol: Patrol = {
        ...basePatrol,
        status: PatrolStatus.CANCELLED,
      };

      expect(calculatePatrolCoverage(cancelledPatrol, plannedCheckpoints)).toBe(0);
    });

    it('handles missing route or empty planned checkpoints safely without default 10 fallback', () => {
      expect(calculatePatrolCoverage(basePatrol, [])).toBe(0);
      expect(calculatePatrolCoverage(basePatrol, undefined)).toBe(0);
      expect(calculatePatrolCoverage(basePatrol, null as any)).toBe(0);
    });

    it('handles null or undefined patrol safely', () => {
      expect(calculatePatrolCoverage(null, plannedCheckpoints)).toBe(0);
      expect(calculatePatrolCoverage(undefined, plannedCheckpoints)).toBe(0);
    });

    it('supports direct visitedCount in options for flexible calculations', () => {
      expect(
        calculatePatrolCoverage(basePatrol, { visitedCount: 5, plannedCheckpoints: 10 })
      ).toBe(50);
      expect(
        calculatePatrolCoverage(basePatrol, { visitedCount: 10, plannedCheckpoints: 10 })
      ).toBe(100);
    });
  });

  describe('Coverage Classification & Thresholds', () => {
    const plannedCheckpoints: Waypoint[] = Array.from({ length: 10 }, (_, i) => ({
      id: `cp-${i + 1}`,
      patrolRouteId: 'route-1',
      latitude: 6.37 + i * 0.01,
      longitude: 81.51 + i * 0.01,
      sequenceOrder: i + 1,
      locationType: LocationType.GPS,
      recordedAt: '2026-10-07T08:00:00.000Z',
    }));

    const samplePatrol: Patrol = {
      id: 'patrol-1',
      patrolCode: 'PAT-2026-YAL-001',
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
          id: 'wp-1',
          patrolId: 'patrol-1',
          latitude: 6.37,
          longitude: 81.51,
          sequenceOrder: 1,
          locationType: LocationType.GPS,
          recordedAt: '2026-10-07T09:15:00.000Z',
        },
      ],
    };

    it('1. Planned patrol -> not "Under-patrolled"', () => {
      const plannedPatrol: Patrol = {
        ...samplePatrol,
        status: PatrolStatus.PLANNED,
        waypoints: [],
      };
      const classification = classifyPatrolCoverage(plannedPatrol, plannedCheckpoints);
      expect(classification).not.toBe('Under-patrolled');
      expect(classification).toBe('No Coverage Data');
    });

    it('2. Cancelled patrol -> not "Under-patrolled"', () => {
      const cancelledPatrol: Patrol = {
        ...samplePatrol,
        status: PatrolStatus.CANCELLED,
      };
      const classification = classifyPatrolCoverage(cancelledPatrol, plannedCheckpoints);
      expect(classification).not.toBe('Under-patrolled');
      expect(classification).toBe('No Coverage Data');
    });

    it('3. Missing planned checkpoints -> "No Coverage Data"', () => {
      expect(classifyPatrolCoverage(samplePatrol, [])).toBe('No Coverage Data');
      expect(classifyPatrolCoverage(samplePatrol, undefined)).toBe('No Coverage Data');
      expect(classifyPatrolCoverage(samplePatrol, null)).toBe('No Coverage Data');
      expect(classifyPatrolCoverage(samplePatrol, 0)).toBe('No Coverage Data');
      expect(classifyCoverage(50, { plannedCheckpoints: [] })).toBe('No Coverage Data');
      expect(classifyCoverage(50, { plannedCheckpoints: 0 })).toBe('No Coverage Data');
    });

    it('4. Missing actual waypoint data with planned checkpoints -> appropriate no-data behavior ("No Coverage Data")', () => {
      const patrolWithoutWaypoints: Patrol = {
        ...samplePatrol,
        waypoints: [],
      };
      expect(classifyPatrolCoverage(patrolWithoutWaypoints, plannedCheckpoints)).toBe(
        'No Coverage Data'
      );

      const completedPatrolNoData: Patrol = {
        ...samplePatrol,
        status: PatrolStatus.COMPLETED,
        waypoints: [],
      };
      expect(classifyPatrolCoverage(completedPatrolNoData, plannedCheckpoints)).toBe(
        'No Coverage Data'
      );
      expect(classifyPatrolCoverage(completedPatrolNoData, plannedCheckpoints)).not.toBe(
        'Under-patrolled'
      );

      expect(classifyCoverage(0, { plannedCheckpoints: 10, actualWaypoints: [] })).toBe(
        'No Coverage Data'
      );
    });

    it('5. 0 visited / 10 planned -> "Under-patrolled"', () => {
      // Waypoints exist (GPS breadcrumbs recorded away from route), so actual data exists but 0 checkpoints visited
      const patrolWith0Visited: Patrol = {
        ...samplePatrol,
        waypoints: [
          {
            id: 'wp-far',
            patrolId: 'patrol-1',
            latitude: 6.99,
            longitude: 81.99, // Distant location
            sequenceOrder: 1,
            locationType: LocationType.GPS,
            recordedAt: '2026-10-07T09:30:00.000Z',
          },
        ],
      };
      expect(calculatePatrolCoverage(patrolWith0Visited, plannedCheckpoints)).toBe(0);
      expect(classifyPatrolCoverage(patrolWith0Visited, plannedCheckpoints)).toBe(
        'Under-patrolled'
      );
      expect(
        classifyCoverage(0, { plannedCheckpoints: 10, actualWaypoints: 1 })
      ).toBe('Under-patrolled');
    });

    it('6. 69% -> "Under-patrolled"', () => {
      expect(classifyCoverage(69)).toBe('Under-patrolled');
      expect(classifyCoverage(69, { plannedCheckpoints: 10, actualWaypoints: 1 })).toBe(
        'Under-patrolled'
      );
    });

    it('7. 70% -> "Good Coverage"', () => {
      expect(classifyCoverage(70)).toBe('Good Coverage');
      expect(classifyCoverage(70, { plannedCheckpoints: 10, actualWaypoints: 1 })).toBe(
        'Good Coverage'
      );
      expect(classifyCoverage(UNDER_PATROLLED_COVERAGE_THRESHOLD)).toBe('Good Coverage');
    });

    it('8. 100% -> "Good Coverage"', () => {
      expect(classifyCoverage(100)).toBe('Good Coverage');
      expect(classifyCoverage(100, { plannedCheckpoints: 10, actualWaypoints: 1 })).toBe(
        'Good Coverage'
      );
    });

    it('centralizes UNDER_PATROLLED_COVERAGE_THRESHOLD at 70', () => {
      expect(UNDER_PATROLLED_COVERAGE_THRESHOLD).toBe(70);
    });
  });

  describe('formatCoverage', () => {
    it('formats numbers into clean percentage strings', () => {
      expect(formatCoverage(0)).toBe('0%');
      expect(formatCoverage(40)).toBe('40%');
      expect(formatCoverage(80)).toBe('80%');
      expect(formatCoverage(100)).toBe('100%');
    });

    it('handles NaN, Infinity, and invalid values safely', () => {
      expect(formatCoverage(NaN)).toBe('0%');
      expect(formatCoverage(Infinity)).toBe('0%');
      expect(formatCoverage(-Infinity)).toBe('0%');
      expect(formatCoverage(undefined as any)).toBe('0%');
    });
  });
});
