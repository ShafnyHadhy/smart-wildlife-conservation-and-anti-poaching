import { describe, it, expect } from 'vitest';
import {
  calculateProgressPercentage,
  calculatePatrolProgress,
  formatProgress,
} from './patrolProgress';
import { Patrol, PatrolStatus, LocationType } from '@wildlife/shared';

describe('Patrol Progress Calculation Utility', () => {
  describe('calculateProgressPercentage', () => {
    it('1. returns 0% when 0 waypoints are recorded out of 10 expected', () => {
      expect(calculateProgressPercentage(0, 10)).toBe(0);
    });

    it('2. returns 50% when 5 waypoints are recorded out of 10 expected (partial completion)', () => {
      expect(calculateProgressPercentage(5, 10)).toBe(50);
    });

    it('3. returns 80% when 8 waypoints are recorded out of 10 expected', () => {
      expect(calculateProgressPercentage(8, 10)).toBe(80);
    });

    it('4. returns 100% when all expected waypoints are recorded (10 of 10)', () => {
      expect(calculateProgressPercentage(10, 10)).toBe(100);
    });

    it('5. handles zero expected waypoints safely without returning NaN or Infinity', () => {
      expect(calculateProgressPercentage(0, 0)).toBe(0);
      expect(calculateProgressPercentage(5, 0)).toBe(0);
      expect(Number.isNaN(calculateProgressPercentage(5, 0))).toBe(false);
      expect(Number.isFinite(calculateProgressPercentage(5, 0))).toBe(true);
    });

    it('6. handles missing/undefined/null waypoint data safely', () => {
      expect(calculateProgressPercentage(undefined, undefined)).toBe(0);
      expect(calculateProgressPercentage(undefined, 10)).toBe(0);
      expect(calculateProgressPercentage(5, undefined)).toBe(0);
      expect(calculateProgressPercentage(null, null)).toBe(0);
    });

    it('7. ensures progress never exceeds 100%', () => {
      expect(calculateProgressPercentage(15, 10)).toBe(100);
      expect(calculateProgressPercentage(100, 10)).toBe(100);
    });

    it('8. ensures progress never becomes negative', () => {
      expect(calculateProgressPercentage(-5, 10)).toBe(0);
      expect(calculateProgressPercentage(-1, -10)).toBe(0);
    });

    it('works with Waypoint object arrays as input', () => {
      const mockWaypoints = [
        {
          id: 'w1',
          latitude: 6.37,
          longitude: 81.51,
          sequenceOrder: 1,
          locationType: LocationType.GPS,
          recordedAt: new Date().toISOString(),
        },
        {
          id: 'w2',
          latitude: 6.38,
          longitude: 81.52,
          sequenceOrder: 2,
          locationType: LocationType.GPS,
          recordedAt: new Date().toISOString(),
        },
      ];

      expect(calculateProgressPercentage(mockWaypoints, 4)).toBe(50);
    });

    it('rounds percentage values sensibly', () => {
      expect(calculateProgressPercentage(1, 3)).toBe(33);
      expect(calculateProgressPercentage(2, 3)).toBe(67);
      expect(calculateProgressPercentage(7, 20)).toBe(35);
    });
  });

  describe('calculatePatrolProgress by Patrol Status', () => {
    const activePatrol: Patrol = {
      id: 'patrol-1',
      patrolCode: 'PAT-2026-YAL-001',
      parkId: 'park-1',
      rangerId: 'ranger-1',
      patrolRouteId: 'route-1',
      status: PatrolStatus.ACTIVE,
      startTime: '2026-10-07T09:00:00.000Z',
      coverageScore: 65, // Must NOT be used for progress
      createdAt: '2026-10-07T09:00:00.000Z',
      updatedAt: '2026-10-07T09:00:00.000Z',
      waypoints: Array.from({ length: 8 }, (_, i) => ({
        id: `w-${i}`,
        latitude: 6.37 + i * 0.01,
        longitude: 81.51 + i * 0.01,
        sequenceOrder: i + 1,
        locationType: LocationType.GPS,
        recordedAt: new Date().toISOString(),
      })),
    };

    it('calculates ACTIVE patrol progress using actual planned/expected waypoint count', () => {
      // 8 recorded waypoints out of 10 expected = 80%
      expect(calculatePatrolProgress(activePatrol, 10)).toBe(80);
      // 8 recorded waypoints out of 16 expected = 50%
      expect(calculatePatrolProgress(activePatrol, 16)).toBe(50);
    });

    it('COMPLETED patrol does NOT automatically become 100% when waypoint data indicates otherwise', () => {
      const completedPatrolWithPartialWaypoints: Patrol = {
        ...activePatrol,
        status: PatrolStatus.COMPLETED,
        endTime: '2026-10-07T13:00:00.000Z',
      };
      // 8 recorded waypoints out of 10 expected = 80% (NOT 100%)
      expect(calculatePatrolProgress(completedPatrolWithPartialWaypoints, 10)).toBe(80);
      // 5 recorded out of 10 expected = 50%
      const halfCompleted: Patrol = {
        ...completedPatrolWithPartialWaypoints,
        waypoints: activePatrol.waypoints!.slice(0, 5),
      };
      expect(calculatePatrolProgress(halfCompleted, 10)).toBe(50);
    });

    it('COMPLETED patrol displays 100% only when available waypoint data actually supports full completion', () => {
      const fullyCompletedPatrol: Patrol = {
        ...activePatrol,
        status: PatrolStatus.COMPLETED,
        waypoints: Array.from({ length: 10 }, (_, i) => ({
          id: `w-${i}`,
          latitude: 6.37 + i * 0.01,
          longitude: 81.51 + i * 0.01,
          sequenceOrder: i + 1,
          locationType: LocationType.GPS,
          recordedAt: new Date().toISOString(),
        })),
      };
      // 10 recorded out of 10 expected = 100%
      expect(calculatePatrolProgress(fullyCompletedPatrol, 10)).toBe(100);
    });

    it('PLANNED patrol returns 0% without pretending patrol has started', () => {
      const plannedPatrol: Patrol = {
        ...activePatrol,
        status: PatrolStatus.PLANNED,
        waypoints: [],
      };
      expect(calculatePatrolProgress(plannedPatrol, 10)).toBe(0);
      expect(calculatePatrolProgress(plannedPatrol)).toBe(0);
    });

    it('CANCELLED patrol returns 0% and is handled safely', () => {
      const cancelledPatrol: Patrol = {
        ...activePatrol,
        status: PatrolStatus.CANCELLED,
      };
      expect(calculatePatrolProgress(cancelledPatrol, 10)).toBe(0);
      expect(calculatePatrolProgress(cancelledPatrol)).toBe(0);
    });

    it('handles missing expected waypoint data safely without guessing an arbitrary default 10', () => {
      // Without expected waypoint data, returns safe 0 instead of guessing 10
      expect(calculatePatrolProgress(activePatrol)).toBe(0);
      expect(calculatePatrolProgress(activePatrol, undefined)).toBe(0);
    });

    it('never uses coverageScore as progress', () => {
      const patrolWithMismatchCoverage: Patrol = {
        ...activePatrol,
        coverageScore: 99, // High coverage score
        waypoints: activePatrol.waypoints!.slice(0, 2), // Only 2 waypoints
      };
      // 2 waypoints / 10 expected = 20%, never 99%
      expect(calculatePatrolProgress(patrolWithMismatchCoverage, 10)).toBe(20);
    });
  });

  describe('formatProgress', () => {
    it('formats numbers into clean percentage strings', () => {
      expect(formatProgress(0)).toBe('0%');
      expect(formatProgress(35)).toBe('35%');
      expect(formatProgress(80)).toBe('80%');
      expect(formatProgress(100)).toBe('100%');
    });

    it('handles unexpected non-number values safely', () => {
      expect(formatProgress(NaN)).toBe('0%');
      expect(formatProgress(Infinity)).toBe('0%');
      expect(formatProgress(undefined as any)).toBe('0%');
    });
  });
});
