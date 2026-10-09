import { Patrol, PatrolStatus, Waypoint } from '@wildlife/shared';

export interface PatrolProgressOptions {
  /**
   * Expected/planned route waypoint count or array of expected Waypoint checkpoints.
   * If not provided, missing expected waypoint data is handled safely without guessing arbitrary defaults.
   */
  expectedWaypoints?: number | Waypoint[];
}

/**
 * Calculates raw progress percentage from recorded vs expected/planned waypoints.
 * 
 * Formula:
 *   progress = (recorded / expected) * 100
 * 
 * Guarantees:
 * - Returns a number between 0 and 100.
 * - Never returns NaN or Infinity.
 * - Handles zero or missing expected waypoints safely (returns 0).
 * - Handles missing/undefined/null waypoint data safely (returns 0).
 * - Clamps results strictly between 0 and 100 (never exceeds 100%, never negative).
 * - Rounds the percentage sensibly.
 * - Does NOT use coverageScore as progress.
 */
export function calculateProgressPercentage(
  recorded: number | Waypoint[] | undefined | null,
  expected: number | Waypoint[] | undefined | null
): number {
  const recordedCount = Array.isArray(recorded)
    ? recorded.length
    : typeof recorded === 'number'
    ? recorded
    : 0;

  const expectedCount = Array.isArray(expected)
    ? expected.length
    : typeof expected === 'number'
    ? expected
    : 0;

  // Handle missing, zero, or invalid expected waypoints safely without dividing by zero
  if (expectedCount <= 0 || !Number.isFinite(expectedCount)) {
    return 0;
  }

  // Handle negative or zero recorded waypoints safely
  if (recordedCount <= 0 || !Number.isFinite(recordedCount)) {
    return 0;
  }

  const rawPercentage = (recordedCount / expectedCount) * 100;

  if (Number.isNaN(rawPercentage) || !Number.isFinite(rawPercentage)) {
    return 0;
  }

  // Strictly clamp between 0 and 100 and round to whole percentage
  const clamped = Math.min(100, Math.max(0, rawPercentage));
  return Math.round(clamped);
}

/**
 * Calculates patrol progress based on actual waypoint data and lifecycle status.
 * 
 * Lifecycle rules:
 * - PLANNED: Returns 0. The patrol has not started yet.
 * - CANCELLED: Returns 0. Cancelled patrols are not treated as active.
 * - ACTIVE & COMPLETED: Calculated strictly based on recorded waypoints vs expected waypoints.
 *   Completed patrols do NOT automatically become 100% if waypoint data indicates otherwise
 *   (e.g. 8 recorded / 10 expected = 80%).
 * - Missing expected waypoint data: Returns 0 safely without inventing an arbitrary default.
 */
export function calculatePatrolProgress(
  patrol: Patrol,
  options?: PatrolProgressOptions | number
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

  const expectedInput =
    typeof options === 'number'
      ? options
      : options?.expectedWaypoints ??
        (patrol as { expectedWaypoints?: number | Waypoint[] }).expectedWaypoints;

  // If expected waypoint count is missing, return safe 0 without inventing arbitrary defaults
  if (expectedInput === undefined || expectedInput === null) {
    return 0;
  }

  return calculateProgressPercentage(patrol.waypoints, expectedInput);
}

/**
 * Formats a calculated progress percentage for clean display in UI (e.g. "80%").
 */
export function formatProgress(progress: number): string {
  if (typeof progress !== 'number' || Number.isNaN(progress) || !Number.isFinite(progress)) {
    return '0%';
  }
  const clamped = Math.min(100, Math.max(0, Math.round(progress)));
  return `${clamped}%`;
}
