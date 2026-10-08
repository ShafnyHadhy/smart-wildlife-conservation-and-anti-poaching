import { Patrol, PatrolRoute, PatrolStatus, Waypoint } from '@wildlife/shared';
import {
  UNDER_PATROLLED_COVERAGE_THRESHOLD,
  calculatePatrolCoverage,
  classifyPatrolCoverage,
  CoverageClassification,
} from './patrolCoverage';
import { calculatePatrolProgress } from './patrolProgress';
import {
  getRangerLocationInfo,
  formatRangerLocationLabel,
  RangerLocationStatus,
} from './rangerLocationStatus';

/**
 * Centralized coverage threshold below which a patrol is considered "Under-patrolled".
 * Reuses the existing threshold (70%) defined in patrolCoverage.
 */
export const UNDER_PATROL_COVERAGE_THRESHOLD = UNDER_PATROLLED_COVERAGE_THRESHOLD;

/**
 * Centralized progress threshold percentage below which an active patrol
 * is considered to have low progress.
 */
export const LOW_PROGRESS_THRESHOLD = 30;

export type AttentionReason =
  | 'Low coverage'
  | 'Low progress'
  | 'Stale location'
  | 'Location unavailable';

export interface PatrolAttentionEvaluation {
  patrolId: string;
  patrolCode: string;
  rangerName: string;
  routeName: string;
  status: PatrolStatus;
  needsAttention: boolean;
  isUnderPatrolled: boolean;
  hasLowProgress: boolean;
  hasLocationIssue: boolean;
  reasons: AttentionReason[];
  progress: number;
  coverage: number;
  coverageClassification: CoverageClassification;
  locationStatus: RangerLocationStatus;
  locationLabel: string;
}

export interface UnderPatrolledSummary {
  totalActive: number;
  attentionCount: number;
  underPatrolledCount: number;
  lowProgressCount: number;
  staleLocationCount: number;
  locationUnavailableCount: number;
  attentionPatrols: PatrolAttentionEvaluation[];
  allEvaluations: Map<string, PatrolAttentionEvaluation>;
}

/**
 * Determines whether a patrol is under-patrolled.
 *
 * Rules:
 * - Completed or Cancelled patrols are NOT classified as active under-patrolled patrols
 *   (unless includeNonActive is explicitly true).
 * - Planned patrols have not started, so they are not under-patrolled.
 * - Active patrols are evaluated using classifyPatrolCoverage against planned checkpoints.
 */
export function isPatrolUnderPatrolled(
  patrol: Patrol | undefined | null,
  plannedCheckpoints?: Waypoint[] | number | null,
  options?: { includeNonActive?: boolean }
): boolean {
  if (!patrol) return false;

  if (!options?.includeNonActive && patrol.status !== PatrolStatus.ACTIVE) {
    return false;
  }

  const classification = classifyPatrolCoverage(patrol, plannedCheckpoints);
  return classification === 'Under-patrolled';
}

/**
 * Evaluates whether an active patrol has low progress.
 *
 * Rules:
 * - Only applies to ACTIVE patrols.
 * - If planned/expected waypoints are known and progress < LOW_PROGRESS_THRESHOLD, returns true.
 * - If expected waypoints are missing or patrol is not active, returns false.
 */
export function isPatrolLowProgress(
  patrol: Patrol | undefined | null,
  expectedWaypoints?: number | Waypoint[] | null
): boolean {
  if (!patrol || patrol.status !== PatrolStatus.ACTIVE) {
    return false;
  }

  const expectedCount = Array.isArray(expectedWaypoints)
    ? expectedWaypoints.length
    : typeof expectedWaypoints === 'number'
    ? expectedWaypoints
    : (patrol as { expectedWaypoints?: number | Waypoint[] }).expectedWaypoints;

  const count = typeof expectedCount === 'number' ? expectedCount : Array.isArray(expectedCount) ? expectedCount.length : 0;
  if (count <= 0) {
    return false;
  }

  const progress = calculatePatrolProgress(patrol, count);
  return progress < LOW_PROGRESS_THRESHOLD;
}

/**
 * Evaluates a single patrol for under-patrolled and attention status.
 *
 * Edge cases handled:
 * - Non-active patrols (PLANNED, COMPLETED, CANCELLED): never require active supervisor attention.
 * - Missing route or planned checkpoints: does not crash, safely handles empty data.
 * - 0% or 100% coverage evaluated cleanly via centralized classifyPatrolCoverage.
 * - Stale location or unavailable location detected via existing Task 6 utilities.
 */
export function evaluatePatrolAttention(
  patrol: Patrol,
  route?: PatrolRoute,
  nowMs?: number
): PatrolAttentionEvaluation {
  const routeWaypoints = route?.waypoints;
  const progress = calculatePatrolProgress(patrol, routeWaypoints?.length);
  const coverage = calculatePatrolCoverage(patrol, routeWaypoints);
  const coverageClassification = classifyPatrolCoverage(patrol, routeWaypoints);
  const locInfo = getRangerLocationInfo(patrol.waypoints, nowMs);
  const locationLabel = formatRangerLocationLabel(locInfo, patrol.status);

  const patrolCode = patrol.patrolCode || patrol.id.slice(0, 8);
  const rangerName = patrol.rangerName || patrol.rangerId?.slice(0, 8) || 'Assigned Ranger';
  const routeName = patrol.routeName || route?.name || 'Corridor Route';

  // Only ACTIVE patrols require active operational attention
  if (patrol.status !== PatrolStatus.ACTIVE) {
    return {
      patrolId: patrol.id,
      patrolCode,
      rangerName,
      routeName,
      status: patrol.status,
      needsAttention: false,
      isUnderPatrolled: false,
      hasLowProgress: false,
      hasLocationIssue: false,
      reasons: [],
      progress,
      coverage,
      coverageClassification,
      locationStatus: locInfo.status,
      locationLabel,
    };
  }

  const reasons: AttentionReason[] = [];

  // 1. Coverage evaluation (< 70% threshold with planned checkpoints)
  const isUnderPatrolled = coverageClassification === 'Under-patrolled';
  if (isUnderPatrolled) {
    reasons.push('Low coverage');
  }

  // 2. Progress evaluation (< 30% progress when expected checkpoints exist)
  const hasExpected = (routeWaypoints && routeWaypoints.length > 0) || Boolean((patrol as { expectedWaypoints?: unknown }).expectedWaypoints);
  const hasLowProgress = hasExpected && progress < LOW_PROGRESS_THRESHOLD;
  if (hasLowProgress) {
    reasons.push('Low progress');
  }

  // 3. Location evaluation (Stale or Location unavailable)
  let hasLocationIssue = false;
  if (locInfo.status === 'Stale') {
    hasLocationIssue = true;
    reasons.push('Stale location');
  } else if (locInfo.status === 'Unavailable') {
    hasLocationIssue = true;
    reasons.push('Location unavailable');
  }

  const needsAttention = reasons.length > 0;

  return {
    patrolId: patrol.id,
    patrolCode,
    rangerName,
    routeName,
    status: patrol.status,
    needsAttention,
    isUnderPatrolled,
    hasLowProgress,
    hasLocationIssue,
    reasons,
    progress,
    coverage,
    coverageClassification,
    locationStatus: locInfo.status,
    locationLabel,
  };
}

/**
 * Aggregates all patrols and returns an UnderPatrolledSummary for the dashboard overview.
 */
export function getUnderPatrolledSummary(
  patrols: Patrol[],
  routes: PatrolRoute[],
  nowMs?: number
): UnderPatrolledSummary {
  const routesMap = new Map<string, PatrolRoute>();
  for (const r of routes) {
    routesMap.set(r.id, r);
  }

  let totalActive = 0;
  let underPatrolledCount = 0;
  let lowProgressCount = 0;
  let staleLocationCount = 0;
  let locationUnavailableCount = 0;

  const attentionPatrols: PatrolAttentionEvaluation[] = [];
  const allEvaluations = new Map<string, PatrolAttentionEvaluation>();

  for (const patrol of patrols) {
    const route = patrol.patrolRouteId ? routesMap.get(patrol.patrolRouteId) : undefined;
    const evaluation = evaluatePatrolAttention(patrol, route, nowMs);

    allEvaluations.set(patrol.id, evaluation);

    if (patrol.status === PatrolStatus.ACTIVE) {
      totalActive++;

      if (evaluation.isUnderPatrolled) {
        underPatrolledCount++;
      }
      if (evaluation.hasLowProgress) {
        lowProgressCount++;
      }
      if (evaluation.locationStatus === 'Stale') {
        staleLocationCount++;
      }
      if (evaluation.locationStatus === 'Unavailable') {
        locationUnavailableCount++;
      }
      if (evaluation.needsAttention) {
        attentionPatrols.push(evaluation);
      }
    }
  }

  return {
    totalActive,
    attentionCount: attentionPatrols.length,
    underPatrolledCount,
    lowProgressCount,
    staleLocationCount,
    locationUnavailableCount,
    attentionPatrols,
    allEvaluations,
  };
}
