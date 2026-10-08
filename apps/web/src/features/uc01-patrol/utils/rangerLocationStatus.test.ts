import { describe, it, expect } from 'vitest';
import {
  LOCATION_FRESHNESS_THRESHOLD_MS,
  selectLatestPatrolWaypoint,
  classifyRangerLocation,
  getRangerLocationInfo,
  formatLocationAge,
  formatRangerLocationLabel,
  formatCoordinates,
} from './rangerLocationStatus';
import { LocationType, PatrolStatus, Waypoint } from '@wildlife/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = new Date('2026-10-08T06:00:00.000Z').getTime();

function makeWaypoint(overrides: Partial<Waypoint> & { patrolId?: string }): Waypoint {
  return {
    id: 'wp-1',
    patrolId: 'patrol-1',
    latitude: 6.37,
    longitude: 81.51,
    sequenceOrder: 1,
    locationType: LocationType.GPS,
    recordedAt: new Date(NOW - 5 * 60 * 1000).toISOString(), // 5 minutes ago by default
    ...overrides,
  };
}

function minutesAgo(mins: number): string {
  return new Date(NOW - mins * 60 * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Ranger Location Status Utility (UC01 Task 6)', () => {
  // -------------------------------------------------------------------------
  describe('LOCATION_FRESHNESS_THRESHOLD_MS', () => {
    it('is centralized at 30 minutes', () => {
      expect(LOCATION_FRESHNESS_THRESHOLD_MS).toBe(30 * 60 * 1000);
    });
  });

  // -------------------------------------------------------------------------
  describe('selectLatestPatrolWaypoint', () => {
    it('returns null for undefined waypoints', () => {
      expect(selectLatestPatrolWaypoint(undefined)).toBeNull();
    });

    it('returns null for null waypoints', () => {
      expect(selectLatestPatrolWaypoint(null)).toBeNull();
    });

    it('returns null for empty waypoint array', () => {
      expect(selectLatestPatrolWaypoint([])).toBeNull();
    });

    it('returns null when all waypoints are planned route checkpoints (no patrolId)', () => {
      const routeCheckpoints: Waypoint[] = [
        {
          id: 'cp-1',
          patrolRouteId: 'route-1',
          latitude: 6.37,
          longitude: 81.51,
          sequenceOrder: 1,
          locationType: LocationType.GPS,
          recordedAt: minutesAgo(1),
        },
      ];
      expect(selectLatestPatrolWaypoint(routeCheckpoints)).toBeNull();
    });

    it('returns the latest recorded waypoint from multiple patrol waypoints', () => {
      const waypoints: Waypoint[] = [
        makeWaypoint({ id: 'wp-old', recordedAt: minutesAgo(90) }),
        makeWaypoint({ id: 'wp-latest', recordedAt: minutesAgo(5) }),
        makeWaypoint({ id: 'wp-mid', recordedAt: minutesAgo(45) }),
      ];
      const result = selectLatestPatrolWaypoint(waypoints);
      expect(result).not.toBeNull();
      expect(result!.id).toBe('wp-latest');
    });

    it('skips waypoints with missing recordedAt', () => {
      const waypoints: Waypoint[] = [
        makeWaypoint({ id: 'wp-no-ts', recordedAt: '' }),
        makeWaypoint({ id: 'wp-valid', recordedAt: minutesAgo(10) }),
      ];
      const result = selectLatestPatrolWaypoint(waypoints);
      expect(result).not.toBeNull();
      expect(result!.id).toBe('wp-valid');
    });

    it('skips waypoints with invalid timestamp strings', () => {
      const waypoints: Waypoint[] = [
        makeWaypoint({ id: 'wp-invalid', recordedAt: 'not-a-date' }),
        makeWaypoint({ id: 'wp-valid', recordedAt: minutesAgo(10) }),
      ];
      const result = selectLatestPatrolWaypoint(waypoints);
      expect(result!.id).toBe('wp-valid');
    });

    it('only returns waypoints belonging to patrol (has patrolId), not route checkpoints', () => {
      const waypoints: Waypoint[] = [
        {
          id: 'cp-route',
          patrolRouteId: 'route-1',
          latitude: 6.37,
          longitude: 81.51,
          sequenceOrder: 1,
          locationType: LocationType.GPS,
          recordedAt: minutesAgo(1),
        },
        makeWaypoint({ id: 'wp-actual', recordedAt: minutesAgo(20) }),
      ];
      const result = selectLatestPatrolWaypoint(waypoints);
      expect(result!.id).toBe('wp-actual');
    });

    it('accepts untagged waypoints (without patrolRouteId or patrolId) from patrol.waypoints', () => {
      const untaggedWaypoints: Waypoint[] = [
        {
          id: 'w-1',
          latitude: 6.37,
          longitude: 81.51,
          sequenceOrder: 1,
          locationType: LocationType.GPS,
          recordedAt: minutesAgo(10),
        },
      ];
      const result = selectLatestPatrolWaypoint(untaggedWaypoints);
      expect(result).not.toBeNull();
      expect(result!.id).toBe('w-1');
    });
  });

  // -------------------------------------------------------------------------
  describe('classifyRangerLocation', () => {
    // ====================== POSITIVE CASES ======================

    it('Recent waypoint (5 min ago) -> "Current"', () => {
      const wp = makeWaypoint({ recordedAt: minutesAgo(5) });
      expect(classifyRangerLocation(wp, NOW)).toBe('Current');
    });

    it('Old waypoint (45 min ago) -> "Stale"', () => {
      const wp = makeWaypoint({ recordedAt: minutesAgo(45) });
      expect(classifyRangerLocation(wp, NOW)).toBe('Stale');
    });

    it('90-minute old waypoint -> "Stale"', () => {
      const wp = makeWaypoint({ recordedAt: minutesAgo(90) });
      expect(classifyRangerLocation(wp, NOW)).toBe('Stale');
    });

    // ====================== NEGATIVE CASES ======================

    it('No waypoint (null) -> "Unavailable"', () => {
      expect(classifyRangerLocation(null, NOW)).toBe('Unavailable');
    });

    it('No waypoint (undefined) -> "Unavailable"', () => {
      expect(classifyRangerLocation(undefined, NOW)).toBe('Unavailable');
    });

    it('Missing recordedAt -> "Unavailable"', () => {
      const wp = makeWaypoint({ recordedAt: '' });
      expect(classifyRangerLocation(wp, NOW)).toBe('Unavailable');
    });

    it('Invalid timestamp string -> "Unavailable"', () => {
      const wp = makeWaypoint({ recordedAt: 'not-a-valid-date' });
      expect(classifyRangerLocation(wp, NOW)).toBe('Unavailable');
    });

    // ====================== EDGE CASES ======================

    it('Exactly at threshold (30 min ago) -> "Current" (boundary inclusive)', () => {
      const atThreshold = minutesAgo(30);
      const wp = makeWaypoint({ recordedAt: atThreshold });
      expect(classifyRangerLocation(wp, NOW)).toBe('Current');
    });

    it('One millisecond past threshold -> "Stale"', () => {
      const justPastThreshold = new Date(NOW - LOCATION_FRESHNESS_THRESHOLD_MS - 1).toISOString();
      const wp = makeWaypoint({ recordedAt: justPastThreshold });
      expect(classifyRangerLocation(wp, NOW)).toBe('Stale');
    });

    it('One millisecond before threshold -> "Current"', () => {
      const justUnderThreshold = new Date(NOW - LOCATION_FRESHNESS_THRESHOLD_MS + 1).toISOString();
      const wp = makeWaypoint({ recordedAt: justUnderThreshold });
      expect(classifyRangerLocation(wp, NOW)).toBe('Current');
    });

    it('Future timestamp (clock skew) -> "Current"', () => {
      const future = new Date(NOW + 60 * 1000).toISOString(); // 1 minute in the future
      const wp = makeWaypoint({ recordedAt: future });
      expect(classifyRangerLocation(wp, NOW)).toBe('Current');
    });
  });

  // -------------------------------------------------------------------------
  describe('getRangerLocationInfo', () => {
    it('Selects latest waypoint when multiple waypoints exist', () => {
      const waypoints: Waypoint[] = [
        makeWaypoint({ id: 'wp-old', recordedAt: minutesAgo(90) }),
        makeWaypoint({ id: 'wp-latest', recordedAt: minutesAgo(5) }),
        makeWaypoint({ id: 'wp-mid', recordedAt: minutesAgo(45) }),
      ];
      const info = getRangerLocationInfo(waypoints, NOW);
      expect(info.latestWaypoint).not.toBeNull();
      expect(info.latestWaypoint!.id).toBe('wp-latest');
      expect(info.status).toBe('Current');
      expect(info.ageMs).not.toBeNull();
    });

    it('No waypoints -> Unavailable with null fields', () => {
      const info = getRangerLocationInfo([], NOW);
      expect(info.status).toBe('Unavailable');
      expect(info.latestWaypoint).toBeNull();
      expect(info.recordedAt).toBeNull();
      expect(info.ageMs).toBeNull();
    });

    it('Missing recordedAt -> Unavailable', () => {
      const info = getRangerLocationInfo([makeWaypoint({ recordedAt: '' })], NOW);
      expect(info.status).toBe('Unavailable');
    });

    it('Stale waypoint -> status=Stale with correct ageMs', () => {
      const info = getRangerLocationInfo([makeWaypoint({ recordedAt: minutesAgo(45) })], NOW);
      expect(info.status).toBe('Stale');
      expect(info.ageMs).not.toBeNull();
      expect(info.ageMs!).toBeGreaterThan(LOCATION_FRESHNESS_THRESHOLD_MS);
    });

    it('Current waypoint -> status=Current with correct ageMs', () => {
      const info = getRangerLocationInfo([makeWaypoint({ recordedAt: minutesAgo(5) })], NOW);
      expect(info.status).toBe('Current');
      expect(info.ageMs).not.toBeNull();
      expect(info.ageMs!).toBeLessThanOrEqual(LOCATION_FRESHNESS_THRESHOLD_MS);
    });
  });

  // -------------------------------------------------------------------------
  describe('formatLocationAge', () => {
    it('returns null for null input', () => {
      expect(formatLocationAge(null)).toBeNull();
    });

    it('returns null for negative values', () => {
      expect(formatLocationAge(-1000)).toBeNull();
    });

    it('returns "just now" for < 30 seconds', () => {
      expect(formatLocationAge(10 * 1000)).toBe('just now');
      expect(formatLocationAge(0)).toBe('just now');
    });

    it('returns singular "1 minute ago" for exactly 1 minute', () => {
      expect(formatLocationAge(60 * 1000)).toBe('1 minute ago');
      expect(formatLocationAge(89 * 1000)).toBe('1 minute ago');
    });

    it('returns "X minutes ago" for less than an hour', () => {
      expect(formatLocationAge(5 * 60 * 1000)).toBe('5 minutes ago');
      expect(formatLocationAge(45 * 60 * 1000)).toBe('45 minutes ago');
    });

    it('returns "1 hour ago" for exactly 1 hour', () => {
      expect(formatLocationAge(60 * 60 * 1000)).toBe('1 hour ago');
    });

    it('returns "X hours ago" for multiple hours', () => {
      expect(formatLocationAge(3 * 60 * 60 * 1000)).toBe('3 hours ago');
    });
  });

  // -------------------------------------------------------------------------
  describe('formatRangerLocationLabel', () => {
    it('Current status -> "Updated X ago"', () => {
      const info = getRangerLocationInfo([makeWaypoint({ recordedAt: minutesAgo(5) })], NOW);
      const label = formatRangerLocationLabel(info);
      expect(label).toMatch(/^Updated /);
      expect(label).not.toMatch(/Last known/i);
      expect(label).not.toBe('Location unavailable');
    });

    it('Stale status -> "Last known location — X ago"', () => {
      const info = getRangerLocationInfo([makeWaypoint({ recordedAt: minutesAgo(45) })], NOW);
      const label = formatRangerLocationLabel(info);
      expect(label).toMatch(/^Last known location/i);
      expect(label).toContain('45 minutes ago');
    });

    it('Unavailable status -> "Location unavailable"', () => {
      const info = getRangerLocationInfo([], NOW);
      expect(formatRangerLocationLabel(info)).toBe('Location unavailable');
    });

    it('PLANNED patrol status -> "Location unavailable" regardless of waypoints', () => {
      const info = getRangerLocationInfo([makeWaypoint({ recordedAt: minutesAgo(5) })], NOW);
      expect(formatRangerLocationLabel(info, PatrolStatus.PLANNED)).toBe('Location unavailable');
    });

    it('CANCELLED patrol status -> "Location unavailable"', () => {
      const info = getRangerLocationInfo([makeWaypoint({ recordedAt: minutesAgo(5) })], NOW);
      expect(formatRangerLocationLabel(info, PatrolStatus.CANCELLED)).toBe('Location unavailable');
    });
  });

  // -------------------------------------------------------------------------
  describe('formatCoordinates', () => {
    it('formats valid decimal coordinates with 4 decimal places', () => {
      expect(formatCoordinates(6.37, 81.51)).toBe('6.3700, 81.5100');
      expect(formatCoordinates(6.3681234, 81.5098765)).toBe('6.3681, 81.5099');
      expect(formatCoordinates(0, 0)).toBe('0.0000, 0.0000');
    });

    it('returns null for undefined or null inputs', () => {
      expect(formatCoordinates(undefined, 81.51)).toBeNull();
      expect(formatCoordinates(6.37, undefined)).toBeNull();
      expect(formatCoordinates(null, null)).toBeNull();
    });

    it('returns null for NaN or non-finite inputs', () => {
      expect(formatCoordinates(Number.NaN, 81.51)).toBeNull();
      expect(formatCoordinates(6.37, Number.POSITIVE_INFINITY)).toBeNull();
    });
  });
});

