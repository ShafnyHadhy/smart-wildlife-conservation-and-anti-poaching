import { Patrol, PatrolRoute, PatrolStatus } from '@wildlife/shared';
import {
  calculatePatrolCoverage,
  classifyPatrolCoverage,
  formatCoverage,
} from './patrolCoverage';
import { getUnderPatrolledSummary } from './underPatrolledOverview';

export interface PatrolOverviewStatistics {
  /**
   * Number of patrols currently in ACTIVE status.
   */
  activeCount: number;
  /**
   * Number of patrols with COMPLETED status whose completion date falls on the current calendar day.
   */
  completedTodayCount: number;
  /**
   * Average coverage percentage across all patrols with valid planned routes and coverage data.
   * Clamped between 0 and 100, rounded to nearest whole percentage. 0 if no valid data.
   */
  averageCoverage: number;
  /**
   * Formatted average coverage string (e.g. "75%", "0%"). Never NaN or Infinity.
   */
  averageCoverageFormatted: string;
  /**
   * Number of active patrols currently evaluated as under-patrolled (< 70% coverage).
   * Reuses existing Task 7 evaluation rules.
   */
  underPatrolledCount: number;
  /**
   * Total number of patrols evaluated.
   */
  totalPatrols: number;
  /**
   * Total number of patrols with valid coverage data included in the average.
   */
  validCoveragePatrolsCount: number;
}

/**
 * Checks whether two dates represent the same calendar day (in UTC, matching API ISO timestamps).
 */
export function isSameCalendarDay(d1: Date, d2: Date): boolean {
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
}

/**
 * Resolves the completion date of a completed patrol.
 * Prefers `endTime`, falling back to `updatedAt`.
 * Returns null if no valid date can be parsed.
 */
export function getPatrolCompletionDate(patrol: Patrol): Date | null {
  const dateStr = patrol.endTime || patrol.updatedAt;
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * Calculates overview statistics for UC01 patrol monitoring.
 *
 * Requirements:
 * 1. Active Patrols: Count of patrols where status === ACTIVE.
 * 2. Completed Today: Count of COMPLETED patrols where endTime/updatedAt falls on current day.
 * 3. Average Coverage: Average coverage across patrols with valid coverage data, reusing Task 5.
 * 4. Under-Patrolled: Count of under-patrolled active patrols, reusing Task 7.
 *
 * Edge cases handled:
 * - Empty / null / undefined patrol array -> returns all 0s and "0%", never NaN.
 * - Missing route or waypoints -> handled safely without throwing.
 * - Patrols completed yesterday or in the past -> excluded from completedTodayCount.
 * - Planned patrols or patrols without planned checkpoints -> excluded from average coverage.
 *
 * @param patrols Full array of patrols (or undefined/null).
 * @param routes Available patrol routes (or undefined/null).
 * @param now Optional date override (useful for testing). Defaults to new Date().
 */
export function calculatePatrolStatistics(
  patrols: Patrol[] | undefined | null,
  routes: PatrolRoute[] | undefined | null,
  now?: Date | number
): PatrolOverviewStatistics {
  const safePatrols = Array.isArray(patrols) ? patrols : [];
  const safeRoutes = Array.isArray(routes) ? routes : [];
  const nowDate = now ? (now instanceof Date ? now : new Date(now)) : new Date();

  const routesMap = new Map<string, PatrolRoute>();
  for (const r of safeRoutes) {
    routesMap.set(r.id, r);
  }

  let activeCount = 0;
  let completedTodayCount = 0;
  let totalCoverageSum = 0;
  let validCoveragePatrolsCount = 0;

  for (const patrol of safePatrols) {
    // 1. Active Patrols
    if (patrol.status === PatrolStatus.ACTIVE) {
      activeCount++;
    }

    // 2. Completed Today
    if (patrol.status === PatrolStatus.COMPLETED) {
      const completionDate = getPatrolCompletionDate(patrol);
      if (completionDate && isSameCalendarDay(completionDate, nowDate)) {
        completedTodayCount++;
      }
    }

    // 3. Average Coverage (Reuses Task 5)
    // Only include patrols where coverage can actually be calculated
    // (i.e. not 'No Coverage Data')
    const route = patrol.patrolRouteId ? routesMap.get(patrol.patrolRouteId) : undefined;
    const classification = classifyPatrolCoverage(patrol, route?.waypoints);

    if (classification !== 'No Coverage Data') {
      const coverage = calculatePatrolCoverage(patrol, route?.waypoints);
      if (typeof coverage === 'number' && !Number.isNaN(coverage) && Number.isFinite(coverage)) {
        totalCoverageSum += coverage;
        validCoveragePatrolsCount++;
      }
    }
  }

  // Calculate safe average
  const averageCoverage =
    validCoveragePatrolsCount > 0
      ? Math.min(100, Math.max(0, Math.round(totalCoverageSum / validCoveragePatrolsCount)))
      : 0;

  const averageCoverageFormatted = formatCoverage(averageCoverage);

  // 4. Under-Patrolled (Reuses Task 7)
  const underPatrolledSummary = getUnderPatrolledSummary(
    safePatrols,
    safeRoutes,
    nowDate.getTime()
  );
  const underPatrolledCount = underPatrolledSummary.underPatrolledCount;

  return {
    activeCount,
    completedTodayCount,
    averageCoverage,
    averageCoverageFormatted,
    underPatrolledCount,
    totalPatrols: safePatrols.length,
    validCoveragePatrolsCount,
  };
}
