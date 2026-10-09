import {
  Patrol,
  PatrolStatus,
  Waypoint,
  calculateHaversineDistanceKm,
} from '@wildlife/shared';

/**
 * Default geographic proximity threshold (in kilometers) to consider a planned route checkpoint
 * "visited" by an actual recorded patrol GPS waypoint.
 * 0.2 km = 200 meters.
 */
export const DEFAULT_CHECKPOINT_PROXIMITY_KM = 0.2;

/**
 * Centralized threshold percentage for identifying under-patrolled routes.
 * In accordance with UC01 operational standards:
 * - Coverage >= 70%: 'Good Coverage'
 * - Coverage < 70%: 'Under-patrolled'
 */
export const UNDER_PATROLLED_COVERAGE_THRESHOLD = 70;

export type CoverageClassification =
  | 'Good Coverage'
  | 'Under-patrolled'
  | 'No Coverage Data';

export interface CoverageClassificationOptions {
  /**
   * Planned route checkpoints or total planned checkpoint count.
   */
  plannedCheckpoints?: Waypoint[] | number | null;
  /**
   * Actual recorded waypoints array, count, or flag indicating whether GPS breadcrumbs exist.
   */
  actualWaypoints?: Waypoint[] | number | boolean | null;
  /**
   * Patrol lifecycle status (e.g. PLANNED, ACTIVE, COMPLETED, CANCELLED).
   */
  patrolStatus?: PatrolStatus;
}

export interface PatrolCoverageOptions {
  /**
   * Planned route checkpoints or total planned checkpoint count.
   */
  plannedCheckpoints?: Waypoint[] | number;
  /**
   * Optional pre-computed visited checkpoint count.
   */
  visitedCount?: number;
  /**
   * Accepted distance in km to consider a checkpoint visited (defaults to 0.2 km).
   */
  proximityKm?: number;
}

/**
 * Determines whether a planned route checkpoint was visited by any actual patrol waypoint
 * using the Haversine great-circle distance formula.
 *
 * @param checkpoint The planned route checkpoint.
 * @param actualWaypoints Array of recorded patrol GPS breadcrumbs.
 * @param proximityKm Maximum distance in kilometers to count as visited (default: 0.2 km).
 * @returns true if at least one actual waypoint is within proximityKm; false otherwise.
 */
export function isCheckpointVisited(
  checkpoint: Waypoint,
  actualWaypoints: Waypoint[] | undefined | null,
  proximityKm: number = DEFAULT_CHECKPOINT_PROXIMITY_KM
): boolean {
  if (!actualWaypoints || actualWaypoints.length === 0) {
    return false;
  }

  return actualWaypoints.some((actual) => {
    const distanceKm = calculateHaversineDistanceKm(
      actual.latitude,
      actual.longitude,
      checkpoint.latitude,
      checkpoint.longitude
    );
    return distanceKm <= proximityKm;
  });
}

/**
 * Counts how many planned route checkpoints have been visited by recorded patrol waypoints.
 *
 * @param plannedCheckpoints Array of planned route checkpoints.
 * @param actualWaypoints Array of recorded patrol waypoints.
 * @param proximityKm Maximum distance in kilometers (default: 0.2 km).
 */
export function countVisitedCheckpoints(
  plannedCheckpoints: Waypoint[] | undefined | null,
  actualWaypoints: Waypoint[] | undefined | null,
  proximityKm: number = DEFAULT_CHECKPOINT_PROXIMITY_KM
): number {
  if (!plannedCheckpoints || plannedCheckpoints.length === 0) {
    return 0;
  }
  if (!actualWaypoints || actualWaypoints.length === 0) {
    return 0;
  }

  let count = 0;
  for (const checkpoint of plannedCheckpoints) {
    if (isCheckpointVisited(checkpoint, actualWaypoints, proximityKm)) {
      count++;
    }
  }
  return count;
}

/**
 * Calculates raw coverage percentage from visited vs planned checkpoint counts.
 *
 * Formula:
 *   Coverage = (visited / planned) * 100
 *
 * Guarantees:
 * - Returns a number strictly between 0 and 100.
 * - Never returns NaN or Infinity.
 * - Handles zero planned checkpoints safely (returns 0).
 * - Handles missing/undefined/null planned or visited data safely (returns 0).
 * - Clamps results strictly between 0 and 100 (never exceeds 100%, never negative).
 * - Rounds sensibly to an integer percentage.
 * - Does NOT use coverageScore or patrol progress as coverage.
 */
export function calculateCoveragePercentage(
  visited: number | undefined | null,
  planned: number | undefined | null
): number {
  const visitedCount =
    typeof visited === 'number' && Number.isFinite(visited) ? visited : 0;
  const plannedCount =
    typeof planned === 'number' && Number.isFinite(planned) ? planned : 0;

  // Handle zero, negative, or missing planned checkpoints safely
  if (plannedCount <= 0) {
    return 0;
  }

  // Handle zero or negative visited checkpoints safely
  if (visitedCount <= 0) {
    return 0;
  }

  const rawPercentage = (visitedCount / plannedCount) * 100;

  if (Number.isNaN(rawPercentage) || !Number.isFinite(rawPercentage)) {
    return 0;
  }

  // Clamp strictly between 0 and 100, rounding to integer
  const clamped = Math.min(100, Math.max(0, rawPercentage));
  return Math.round(clamped);
}

/**
 * Calculates patrol coverage based on planned route checkpoints, recorded waypoints,
 * and patrol lifecycle status.
 *
 * Lifecycle rules:
 * - PLANNED: Returns 0%. Patrol has not started yet.
 * - CANCELLED: Returns 0%. Cancelled patrols are not active.
 * - ACTIVE & COMPLETED: Calculated strictly from actual visited checkpoints vs planned checkpoints.
 *   Completed patrols do NOT automatically become 100%.
 * - Missing or zero planned checkpoints: Returns 0% safely.
 */
export function calculatePatrolCoverage(
  patrol: Patrol | undefined | null,
  optionsOrPlanned?: Waypoint[] | number | PatrolCoverageOptions | null,
  proximityKmParam?: number
): number {
  if (!patrol) {
    return 0;
  }

  // Planned patrols have not started
  if (patrol.status === PatrolStatus.PLANNED) {
    return 0;
  }

  // Cancelled patrols are aborted
  if (patrol.status === PatrolStatus.CANCELLED) {
    return 0;
  }

  let plannedCheckpoints: Waypoint[] | undefined;
  let plannedCount = 0;
  let visitedCount: number | undefined;
  let proximityKm = proximityKmParam ?? DEFAULT_CHECKPOINT_PROXIMITY_KM;

  if (Array.isArray(optionsOrPlanned)) {
    plannedCheckpoints = optionsOrPlanned;
    plannedCount = optionsOrPlanned.length;
  } else if (typeof optionsOrPlanned === 'number') {
    plannedCount = optionsOrPlanned;
  } else if (optionsOrPlanned && typeof optionsOrPlanned === 'object') {
    if (Array.isArray(optionsOrPlanned.plannedCheckpoints)) {
      plannedCheckpoints = optionsOrPlanned.plannedCheckpoints;
      plannedCount = plannedCheckpoints.length;
    } else if (typeof optionsOrPlanned.plannedCheckpoints === 'number') {
      plannedCount = optionsOrPlanned.plannedCheckpoints;
    }
    if (typeof optionsOrPlanned.visitedCount === 'number') {
      visitedCount = optionsOrPlanned.visitedCount;
    }
    if (typeof optionsOrPlanned.proximityKm === 'number') {
      proximityKm = optionsOrPlanned.proximityKm;
    }
  }

  if (plannedCount <= 0) {
    return 0;
  }

  if (visitedCount !== undefined) {
    return calculateCoveragePercentage(visitedCount, plannedCount);
  }

  if (plannedCheckpoints && plannedCheckpoints.length > 0) {
    const visited = countVisitedCheckpoints(
      plannedCheckpoints,
      patrol.waypoints,
      proximityKm
    );
    return calculateCoveragePercentage(visited, plannedCount);
  }

  return 0;
}

/**
 * Classifies coverage percentage into operational categories based on the centralized threshold.
 * Distinguishes "No Coverage Data" from actual low coverage ("Under-patrolled").
 *
 * Rules:
 * - PLANNED / CANCELLED -> 'No Coverage Data' (never 'Under-patrolled').
 * - Missing or zero planned checkpoints -> 'No Coverage Data'.
 * - Missing actual recorded waypoint data -> 'No Coverage Data'.
 * - 0% with known planned checkpoints and verified actual data -> 'Under-patrolled'.
 * - 1-69% -> 'Under-patrolled'.
 * - 70-100% -> 'Good Coverage'.
 *
 * @param coverage Calculated coverage percentage (0-100).
 * @param options Optional context specifying planned/actual data and lifecycle status.
 * @returns 'Good Coverage', 'Under-patrolled', or 'No Coverage Data'.
 */
export function classifyCoverage(
  coverage: number | undefined | null,
  options?: CoverageClassificationOptions
): CoverageClassification {
  // Lifecycle check: Planned or cancelled patrols do not show "Under-patrolled"
  if (
    options?.patrolStatus === PatrolStatus.PLANNED ||
    options?.patrolStatus === PatrolStatus.CANCELLED
  ) {
    return 'No Coverage Data';
  }

  // Planned checkpoints check
  if (options?.plannedCheckpoints !== undefined) {
    const plannedCount = Array.isArray(options.plannedCheckpoints)
      ? options.plannedCheckpoints.length
      : typeof options.plannedCheckpoints === 'number'
      ? options.plannedCheckpoints
      : 0;
    if (plannedCount <= 0) {
      return 'No Coverage Data';
    }
  }

  // Actual waypoints check
  if (options?.actualWaypoints !== undefined) {
    const hasActual = Array.isArray(options.actualWaypoints)
      ? options.actualWaypoints.length > 0
      : typeof options.actualWaypoints === 'number'
      ? options.actualWaypoints > 0
      : Boolean(options.actualWaypoints);
    if (!hasActual) {
      return 'No Coverage Data';
    }
  }

  if (
    typeof coverage !== 'number' ||
    Number.isNaN(coverage) ||
    !Number.isFinite(coverage)
  ) {
    return 'No Coverage Data';
  }

  if (coverage >= UNDER_PATROLLED_COVERAGE_THRESHOLD) {
    return 'Good Coverage';
  }

  return 'Under-patrolled';
}

/**
 * Classifies patrol coverage by evaluating the patrol's lifecycle status,
 * planned checkpoints, and recorded GPS breadcrumbs.
 *
 * Lifecycle and data rules:
 * - PLANNED: Returns 'No Coverage Data' (patrol has not started yet).
 * - CANCELLED: Returns 'No Coverage Data' (patrol aborted).
 * - Missing or zero planned checkpoints: Returns 'No Coverage Data'.
 * - Missing recorded GPS waypoints: Returns 'No Coverage Data' (insufficient data).
 * - ACTIVE or COMPLETED with known planned and actual data:
 *   - < 70%: 'Under-patrolled' (including 0% with recorded breadcrumbs outside route)
 *   - >= 70%: 'Good Coverage'
 */
export function classifyPatrolCoverage(
  patrol: Patrol | undefined | null,
  plannedCheckpoints?: Waypoint[] | number | null
): CoverageClassification {
  if (!patrol) {
    return 'No Coverage Data';
  }

  if (
    patrol.status === PatrolStatus.PLANNED ||
    patrol.status === PatrolStatus.CANCELLED
  ) {
    return 'No Coverage Data';
  }

  const plannedCount = Array.isArray(plannedCheckpoints)
    ? plannedCheckpoints.length
    : typeof plannedCheckpoints === 'number'
    ? plannedCheckpoints
    : 0;

  if (plannedCount <= 0) {
    return 'No Coverage Data';
  }

  if (!patrol.waypoints || patrol.waypoints.length === 0) {
    return 'No Coverage Data';
  }

  const coverage = calculatePatrolCoverage(patrol, plannedCheckpoints);
  return classifyCoverage(coverage, {
    plannedCheckpoints,
    actualWaypoints: patrol.waypoints,
    patrolStatus: patrol.status,
  });
}

/**
 * Formats a calculated coverage percentage for clean display in UI (e.g. "80%").
 */
export function formatCoverage(coverage: number): string {
  if (
    typeof coverage !== 'number' ||
    Number.isNaN(coverage) ||
    !Number.isFinite(coverage)
  ) {
    return '0%';
  }
  const clamped = Math.min(100, Math.max(0, Math.round(coverage)));
  return `${clamped}%`;
}
