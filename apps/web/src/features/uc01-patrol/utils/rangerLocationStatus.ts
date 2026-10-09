import { Waypoint, PatrolStatus } from '@wildlife/shared';

/**
 * Centralized freshness threshold for ranger location status classification.
 *
 * Ranger GPS breadcrumbs in active wildlife patrols are expected at intervals of
 * 15-30 minutes. A location older than 30 minutes is considered stale — the
 * ranger may have moved significantly since the last recorded position, and
 * presenting it as "current" would be misleading.
 *
 * 30 minutes = 1800 seconds.
 */
export const LOCATION_FRESHNESS_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

export type RangerLocationStatus = 'Current' | 'Stale' | 'Unavailable';

export interface RangerLocationInfo {
  /**
   * Current/Stale/Unavailable status.
   */
  status: RangerLocationStatus;
  /**
   * The latest recorded patrol waypoint, or null if unavailable.
   */
  latestWaypoint: Waypoint | null;
  /**
   * Parsed timestamp of the latest waypoint, or null if unavailable/invalid.
   */
  recordedAt: Date | null;
  /**
   * How many milliseconds ago the waypoint was recorded (from now at evaluation time).
   * Null if unavailable/invalid.
   */
  ageMs: number | null;
}

/**
 * Formats latitude and longitude coordinates into a human-readable string.
 *
 * Example:
 *   (6.3700, 81.5100) -> "6.3700, 81.5100"
 *
 * Returns null if either coordinate is missing or invalid.
 */
export function formatCoordinates(
  lat: number | undefined | null,
  lng: number | undefined | null
): string | null {
  if (lat === undefined || lat === null || lng === undefined || lng === null) {
    return null;
  }
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (
    Number.isNaN(latNum) ||
    Number.isNaN(lngNum) ||
    !Number.isFinite(latNum) ||
    !Number.isFinite(lngNum)
  ) {
    return null;
  }
  return `${latNum.toFixed(4)}, ${lngNum.toFixed(4)}`;
}

/**
 * Selects the latest recorded patrol waypoint from a patrol's actual GPS breadcrumbs.
 *
 * Selection rules:
 * - Only considers waypoints belonging to the patrol itself (patrolId is set, or not a route checkpoint).
 * - Sorts by `recordedAt` timestamp descending, taking the most recent.
 * - Safely handles empty arrays, missing recordedAt, and invalid timestamps.
 * - Returns null if no usable waypoint is found.
 *
 * NOTE: This intentionally excludes planned route checkpoints (which have
 * patrolRouteId set but no patrolId), since those are not live GPS positions.
 */
export function selectLatestPatrolWaypoint(
  waypoints: Waypoint[] | undefined | null
): Waypoint | null {
  if (!waypoints || waypoints.length === 0) {
    return null;
  }

  // Filter out planned route checkpoints (which have patrolRouteId set but no patrolId)
  const patrolWaypoints = waypoints.filter((wp) => {
    // If it has patrolId, it is definitively a patrol waypoint
    if (wp.patrolId !== undefined && wp.patrolId !== null && wp.patrolId !== '') {
      return true;
    }
    // If it is tagged with patrolRouteId and no patrolId, it is a planned route checkpoint
    if (wp.patrolRouteId !== undefined && wp.patrolRouteId !== null && wp.patrolRouteId !== '') {
      return false;
    }
    // Otherwise it is an untagged waypoint in patrol.waypoints
    return true;
  });

  if (patrolWaypoints.length === 0) {
    return null;
  }

  // Sort descending by recordedAt to find the most recent
  const sorted = patrolWaypoints
    .filter((wp) => {
      if (!wp.recordedAt) return false;
      const t = new Date(wp.recordedAt).getTime();
      return Number.isFinite(t) && !Number.isNaN(t);
    })
    .sort((a, b) => {
      const tA = new Date(a.recordedAt).getTime();
      const tB = new Date(b.recordedAt).getTime();
      return tB - tA; // descending: newest first
    });

  return sorted.length > 0 ? sorted[0] : null;
}

/**
 * Classifies the ranger location status from a recorded patrol waypoint.
 *
 * Classification rules:
 * - No waypoint or invalid timestamp → 'Unavailable'
 * - Waypoint recorded within LOCATION_FRESHNESS_THRESHOLD_MS → 'Current'
 * - Waypoint recorded older than LOCATION_FRESHNESS_THRESHOLD_MS → 'Stale'
 *
 * The threshold is centralized in LOCATION_FRESHNESS_THRESHOLD_MS to avoid
 * scattering magic numbers across React components.
 *
 * @param waypoint Latest recorded patrol waypoint, or null/undefined.
 * @param nowMs Optional override for current time (useful in tests). Defaults to Date.now().
 */
export function classifyRangerLocation(
  waypoint: Waypoint | null | undefined,
  nowMs?: number
): RangerLocationStatus {
  if (!waypoint || !waypoint.recordedAt) {
    return 'Unavailable';
  }

  const recordedMs = new Date(waypoint.recordedAt).getTime();

  if (Number.isNaN(recordedMs) || !Number.isFinite(recordedMs)) {
    return 'Unavailable';
  }

  const now = nowMs ?? Date.now();
  const ageMs = now - recordedMs;

  if (ageMs < 0) {
    // Future timestamp (clock skew / test data): treat as current
    return 'Current';
  }

  if (ageMs <= LOCATION_FRESHNESS_THRESHOLD_MS) {
    return 'Current';
  }

  return 'Stale';
}

/**
 * Returns full ranger location info for a patrol including status, latest
 * waypoint, timestamp and age.
 *
 * Safe for all lifecycle states and missing data:
 * - PLANNED/CANCELLED patrols with no recorded waypoints → status='Unavailable'
 * - ACTIVE/COMPLETED patrols with stale GPS data → status='Stale'
 * - ACTIVE patrol with recent GPS ping → status='Current'
 *
 * @param waypoints Patrol's recorded waypoints array (from patrol.waypoints).
 * @param nowMs Optional override for current time (useful in tests).
 */
export function getRangerLocationInfo(
  waypoints: Waypoint[] | undefined | null,
  nowMs?: number
): RangerLocationInfo {
  const latest = selectLatestPatrolWaypoint(waypoints);

  if (!latest || !latest.recordedAt) {
    return { status: 'Unavailable', latestWaypoint: null, recordedAt: null, ageMs: null };
  }

  const recordedMs = new Date(latest.recordedAt).getTime();

  if (Number.isNaN(recordedMs) || !Number.isFinite(recordedMs)) {
    return { status: 'Unavailable', latestWaypoint: latest, recordedAt: null, ageMs: null };
  }

  const recordedAt = new Date(latest.recordedAt);
  const now = nowMs ?? Date.now();
  const ageMs = now - recordedMs;
  const status = classifyRangerLocation(latest, nowMs);

  return { status, latestWaypoint: latest, recordedAt, ageMs };
}

/**
 * Formats how long ago the location was recorded in a human-readable string.
 *
 * Examples:
 *   - 3 seconds ago → "just now"
 *   - 58 seconds ago → "1 minute ago"
 *   - 90 minutes ago → "1 hour ago"
 *
 * Returns null if ageMs is null or negative.
 */
export function formatLocationAge(ageMs: number | null): string | null {
  if (ageMs === null || ageMs < 0) {
    return null;
  }

  const seconds = Math.floor(ageMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 30) {
    return 'just now';
  }
  if (minutes < 1) {
    return `${seconds} seconds ago`;
  }
  if (minutes === 1) {
    return '1 minute ago';
  }
  if (minutes < 60) {
    return `${minutes} minutes ago`;
  }
  if (hours === 1) {
    return '1 hour ago';
  }
  if (hours < 24) {
    return `${hours} hours ago`;
  }
  if (days === 1) {
    return '1 day ago';
  }
  return `${days} days ago`;
}

/**
 * Returns a displayable location line for a patrol's ranger location.
 *
 * - 'Current': "Updated just now" or "Updated 5 minutes ago"
 * - 'Stale': "Last known location — 45 minutes ago"
 * - 'Unavailable': "Location unavailable"
 *
 * Never presents a stale location as if it were current.
 */
export function formatRangerLocationLabel(
  info: RangerLocationInfo,
  patrolStatus?: PatrolStatus
): string {
  if (
    patrolStatus === PatrolStatus.PLANNED ||
    patrolStatus === PatrolStatus.CANCELLED
  ) {
    return 'Location unavailable';
  }

  if (info.status === 'Unavailable') {
    return 'Location unavailable';
  }

  const age = formatLocationAge(info.ageMs);

  if (info.status === 'Current') {
    return age ? `Updated ${age}` : 'Updated recently';
  }

  // Stale
  return age ? `Last known location — ${age}` : 'Last known location';
}
