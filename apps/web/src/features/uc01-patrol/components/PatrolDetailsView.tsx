import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  MapPin,
  Route as RouteIcon,
  Shield,
  User as UserIcon,
  WifiOff,
  AlertTriangle,
  ListChecks,
  RefreshCw,
  UserCog,
} from 'lucide-react';
import { Patrol, PatrolRoute, PatrolStatus, User as PatrolUser, Waypoint } from '@wildlife/shared';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { LoadingState } from '../../../components/common/LoadingState';
import { EmptyState } from '../../../components/common/EmptyState';
import { webPatrolService } from '../services/patrolService';
import { PatrolRouteMap } from './PatrolRouteMap';
import {
  calculatePatrolProgress,
  formatProgress,
  calculatePatrolCoverage,
  classifyPatrolCoverage,
  formatCoverage,
  countVisitedCheckpoints,
  isCheckpointVisited,
  UNDER_PATROLLED_COVERAGE_THRESHOLD,
  getRangerLocationInfo,
  formatRangerLocationLabel,
  formatCoordinates,
  formatLocationAge,
} from '../utils';

export interface PatrolDetailsViewProps {
  patrolId: string;
  onBack: () => void;
  initialPatrol?: Patrol;
  routes?: PatrolRoute[];
  onPatrolUpdated?: (patrol: Patrol) => void;
}

export function PatrolDetailsView({
  patrolId,
  onBack,
  initialPatrol,
  routes = [],
  onPatrolUpdated,
}: PatrolDetailsViewProps) {
  const [patrol, setPatrol] = useState<Patrol | null>(initialPatrol || null);
  const [route, setRoute] = useState<PatrolRoute | null>(null);
  const [loading, setLoading] = useState<boolean>(!initialPatrol || !initialPatrol.waypoints);
  const [error, setError] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [rangers, setRangers] = useState<PatrolUser[]>([]);
  const [selectedRangerId, setSelectedRangerId] = useState('');
  const [assignmentBusy, setAssignmentBusy] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null);
  const [detailRefreshError, setDetailRefreshError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDetails() {
      // If initialPatrol and matching route already have complete waypoint data, reuse them immediately
      if (
        refreshVersion === 0 &&
        initialPatrol &&
        initialPatrol.id === patrolId &&
        initialPatrol.waypoints &&
        initialPatrol.waypoints.length > 0
      ) {
        setPatrol(initialPatrol);
        const matching = routes.find((r) => r.id === initialPatrol.patrolRouteId);
        if (matching && matching.waypoints && matching.waypoints.length > 0) {
          setRoute(matching);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }

      try {
        setLoading(true);
        setError(null);
        setDetailRefreshError(null);

        // Fetch detailed patrol including waypoints breadcrumbs
        let fetchedPatrol: Patrol;
        try {
          fetchedPatrol = await webPatrolService.fetchPatrolById(patrolId);
        } catch (fetchErr) {
          // If fetch fails but we had initialPatrol, fall back gracefully
          if (refreshVersion === 0 && initialPatrol && initialPatrol.id === patrolId) {
            fetchedPatrol = initialPatrol;
          } else {
            throw fetchErr;
          }
        }

        if (!isMounted) return;

        // Ensure we have a valid patrol object with non-null ID
        if (!fetchedPatrol || !fetchedPatrol.id) {
          setError('Patrol record not found.');
          setPatrol(null);
          return;
        }

        setPatrol(fetchedPatrol);
        setSelectedRangerId(fetchedPatrol.rangerId);

        // Find or fetch associated route
        const routeId = fetchedPatrol.patrolRouteId;
        const matchingRoute = routes.find((r) => r.id === routeId);

        if (matchingRoute && matchingRoute.waypoints && matchingRoute.waypoints.length > 0) {
          setRoute(matchingRoute);
        } else if (routeId) {
          try {
            const fetchedRoute = await webPatrolService.fetchPatrolRouteById(routeId);
            if (isMounted) {
              setRoute(fetchedRoute);
            }
          } catch {
            if (isMounted) {
              setRoute(matchingRoute || null);
            }
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to load patrol details. Please check connection.';
        if (refreshVersion > 0 && patrol) {
          setDetailRefreshError(message);
        } else {
          setError(message);
          setPatrol(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void loadDetails();

    return () => {
      isMounted = false;
    };
  }, [patrolId, initialPatrol, routes, refreshVersion, onPatrolUpdated]);

  useEffect(() => {
    if (patrol?.status !== PatrolStatus.PLANNED) return;
    let isMounted = true;
    webPatrolService.fetchRangers()
      .then((staff) => {
        if (isMounted) setRangers(staff);
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setAssignmentError(err instanceof Error ? err.message : 'Could not load Rangers.');
        }
      });
    return () => {
      isMounted = false;
    };
  }, [patrol?.status]);

  useEffect(() => {
    if (patrol?.status !== PatrolStatus.ACTIVE) return;
    const timer = window.setInterval(() => setRefreshVersion((version) => version + 1), 30_000);
    return () => window.clearInterval(timer);
  }, [patrol?.status]);

  async function refreshDetails(): Promise<void> {
    setRefreshing(true);
    setRefreshVersion((version) => version + 1);
  }

  async function handleReassign(): Promise<void> {
    if (!patrol || !selectedRangerId || selectedRangerId === patrol.rangerId) return;
    setAssignmentBusy(true);
    setAssignmentError(null);
    setAssignmentMessage(null);
    try {
      const updated = await webPatrolService.reassignPlannedPatrol(patrol.id, {
        rangerId: selectedRangerId,
        parkId: patrol.parkId,
        patrolRouteId: patrol.patrolRouteId,
        patrolCode: patrol.patrolCode,
        startTime: patrol.startTime,
        notes: patrol.notes,
      });
      setPatrol(updated);
      setSelectedRangerId(updated.rangerId);
      setAssignmentMessage('Patrol assignment updated.');
      onPatrolUpdated?.(updated);
    } catch (err: unknown) {
      setAssignmentError(err instanceof Error ? err.message : 'Could not update patrol assignment.');
    } finally {
      setAssignmentBusy(false);
    }
  }

  async function handleCancel(): Promise<void> {
    if (!patrol || !window.confirm(`Cancel planned patrol ${patrol.patrolCode}?`)) return;
    setAssignmentBusy(true);
    setAssignmentError(null);
    setAssignmentMessage(null);
    try {
      const updated = await webPatrolService.cancelPlannedPatrol(patrol.id);
      setPatrol(updated);
      setAssignmentMessage('Patrol cancelled.');
      onPatrolUpdated?.(updated);
    } catch (err: unknown) {
      setAssignmentError(err instanceof Error ? err.message : 'Could not cancel patrol.');
    } finally {
      setAssignmentBusy(false);
    }
  }

  // Loading state
  if (loading && !patrol) {
    return (
      <div data-testid="patrol-details-loading" className="py-12">
        <LoadingState message="Loading patrol details..." />
      </div>
    );
  }

  // Error / Missing patrol state
  if (error || !patrol) {
    return (
      <div data-testid="patrol-not-found" className="space-y-6">
        <div>
          <button
            onClick={onBack}
            data-testid="back-to-patrols-btn"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-stone-700
              bg-white hover:bg-stone-50 border border-[#D1B370]/60 rounded-xl transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-[#3E8E41]" />
            <span>Back to Patrols</span>
          </button>
        </div>
        <EmptyState
          title="Patrol Not Found"
          message={error || 'The requested patrol details could not be found or have been removed.'}
          icon={<AlertTriangle className="w-8 h-8 text-amber-600" />}
          action={{
            label: 'Back to Patrols',
            onClick: onBack,
          }}
        />
      </div>
    );
  }

  // Active route reference
  const currentRoute = route || routes.find((r) => r.id === patrol.patrolRouteId) || null;
  const plannedCheckpoints: Waypoint[] = currentRoute?.waypoints || [];
  const plannedCount = plannedCheckpoints.length;
  const recordedWaypoints = patrol.waypoints || [];
  const recordedCount = recordedWaypoints.length;

  // Progress calculation
  const progress = calculatePatrolProgress(patrol, plannedCount > 0 ? plannedCount : undefined);
  const formattedProgress = formatProgress(progress);

  // Coverage calculation
  const coverage = calculatePatrolCoverage(patrol, plannedCheckpoints);
  const formattedCoverage = formatCoverage(coverage);
  const classification = classifyPatrolCoverage(patrol, plannedCheckpoints);
  const visitedCheckpointsCount = countVisitedCheckpoints(plannedCheckpoints, recordedWaypoints);
  const remainingCheckpointsCount = Math.max(0, plannedCount - visitedCheckpointsCount);

  // Ranger location information
  const locationInfo = getRangerLocationInfo(recordedWaypoints);
  const locationLabel = formatRangerLocationLabel(locationInfo, patrol.status);
  const { status: locStatus, latestWaypoint, recordedAt: locRecordedAt, ageMs: locAgeMs } = locationInfo;
  const isLocationAvailable =
    patrol.status !== PatrolStatus.PLANNED &&
    patrol.status !== PatrolStatus.CANCELLED &&
    locStatus !== 'Unavailable' &&
    latestWaypoint !== null;
  const coordsFormatted = latestWaypoint
    ? formatCoordinates(latestWaypoint.latitude, latestWaypoint.longitude)
    : null;

  // Format dates safely without displaying undefined or null
  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return null;
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const startDisplay =
    formatDateTime(patrol.startTime) ||
    (patrol.status === PatrolStatus.PLANNED ? 'Scheduled' : 'Not available');

  const endDisplay =
    formatDateTime(patrol.endTime) ||
    (patrol.status === PatrolStatus.COMPLETED
      ? 'Not available'
      : patrol.status === PatrolStatus.ACTIVE
      ? 'In Progress'
      : patrol.status === PatrolStatus.PLANNED
      ? 'Scheduled'
      : 'Not available');

  return (
    <div data-testid="patrol-details-view" className="space-y-6">
      {/* Back Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          data-testid="back-to-patrols-btn"
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-stone-700
            bg-white hover:bg-[#FAF7EE] border border-[#D1B370]/60 rounded-xl transition-colors shadow-xs group w-fit"
        >
          <ArrowLeft className="w-4 h-4 text-[#3E8E41] group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Patrols</span>
        </button>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Lifecycle Status:
            </span>
            <StatusBadge status={patrol.status || PatrolStatus.PLANNED} size="md" />
          </div>
          <button
            type="button"
            onClick={() => { void refreshDetails(); }}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-stone-700 bg-white
              border border-[#D1B370]/60 rounded-xl hover:bg-[#FAF7EE] disabled:opacity-60"
            aria-label="Refresh patrol details"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {assignmentError && (
        <div role="alert" className="p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
          {assignmentError}
        </div>
      )}
      {assignmentMessage && (
        <div role="status" className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-sm text-emerald-800">
          {assignmentMessage}
        </div>
      )}
      {detailRefreshError && (
        <div role="alert" className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800">
          Latest patrol details could not be loaded. Showing the last available data. {detailRefreshError}
        </div>
      )}

      {patrol.status === PatrolStatus.PLANNED && (
        <section className="p-5 bg-white border border-[#D1B370]/60 rounded-2xl shadow-xs">
          <h3 className="mb-3 text-sm font-bold text-[#1C2A1E] flex items-center gap-2">
            <UserCog className="w-4 h-4 text-[#3E8E41]" />
            Manage Planned Assignment
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex-1 text-xs font-semibold text-stone-600">
              Reassign Ranger
              <select
                aria-label="Reassign Ranger"
                value={selectedRangerId}
                onChange={(event) => setSelectedRangerId(event.target.value)}
                disabled={assignmentBusy || rangers.length === 0}
                className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
              >
                {rangers.filter((ranger) => !ranger.parkId || ranger.parkId === patrol.parkId).map((ranger) => (
                  <option key={ranger.id} value={ranger.id}>{ranger.fullName}</option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => { void handleReassign(); }}
                disabled={assignmentBusy || !selectedRangerId || selectedRangerId === patrol.rangerId}
                className="px-4 py-2 rounded-lg bg-[#3E8E41] text-white text-sm font-bold disabled:opacity-50"
              >
                {assignmentBusy ? 'Saving…' : 'Save Ranger'}
              </button>
              <button
                type="button"
                onClick={() => { void handleCancel(); }}
                disabled={assignmentBusy}
                className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm font-bold hover:bg-red-50 disabled:opacity-50"
              >
                Cancel Patrol
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Hero Header Card */}
      <div className="p-6 bg-white border border-[#D1B370]/60 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#FAF7EE] border border-[#D1B370]/60 rounded-xl text-[#3E8E41]">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-extrabold text-[#1C2A1E] tracking-tight font-mono">
                    {patrol.patrolCode || patrol.id || 'Not available'}
                  </h2>
                  <span className="px-2 py-0.5 text-xs font-bold bg-[#3E8E41]/15 text-[#2E6B31] border border-[#3E8E41]/40 rounded">
                    UC01 DETAILS
                  </span>
                </div>
                <p className="text-xs text-[#A76D40] font-semibold mt-0.5">
                  Assigned Route: {patrol.routeName || currentRoute?.name || 'Not available'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-stone-500">
              Patrol ID: <span className="font-mono font-bold text-stone-700">{patrol.id || 'Not available'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Patrol Information & Ranger Location */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Patrol Information Card */}
        <div className="p-5 bg-white border border-[#D1B370]/60 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-sm font-bold text-[#1C2A1E] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#3E8E41]" />
              <span>Patrol Information</span>
            </h3>
            <StatusBadge status={patrol.status || PatrolStatus.PLANNED} size="sm" />
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-[#FAF7EE]/60 rounded-xl border border-[#D1B370]/30">
              <dt className="text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                Patrol Identifier
              </dt>
              <dd className="mt-1 font-bold text-stone-900 font-mono text-sm">
                {patrol.patrolCode || patrol.id || 'Not available'}
              </dd>
            </div>

            <div className="p-3 bg-[#FAF7EE]/60 rounded-xl border border-[#D1B370]/30">
              <dt className="text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                Sanctuary / Park
              </dt>
              <dd className="mt-1 font-bold text-stone-900 text-sm">
                {patrol.parkName || currentRoute?.parkName || patrol.parkId || 'Not available'}
              </dd>
            </div>

            <div className="p-3 bg-[#FAF7EE]/60 rounded-xl border border-[#D1B370]/30">
              <dt className="text-stone-500 font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1">
                <UserIcon className="w-3 h-3 text-[#3E8E41]" />
                <span>Assigned Ranger</span>
              </dt>
              <dd className="mt-1 font-bold text-stone-900 text-sm">
                {patrol.rangerName || patrol.rangerId || 'Not available'}
              </dd>
            </div>

            <div className="p-3 bg-[#FAF7EE]/60 rounded-xl border border-[#D1B370]/30">
              <dt className="text-stone-500 font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1">
                <RouteIcon className="w-3 h-3 text-[#3E8E41]" />
                <span>Route Corridor</span>
              </dt>
              <dd className="mt-1 font-bold text-stone-900 text-sm truncate" title={patrol.routeName || currentRoute?.name || 'Not available'}>
                {patrol.routeName || currentRoute?.name || 'Not available'}
              </dd>
            </div>

            <div className="p-3 bg-[#FAF7EE]/60 rounded-xl border border-[#D1B370]/30">
              <dt className="text-stone-500 font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#A76D40]" />
                <span>Start Date &amp; Time</span>
              </dt>
              <dd className="mt-1 font-semibold text-stone-800">
                {startDisplay}
              </dd>
            </div>

            <div className="p-3 bg-[#FAF7EE]/60 rounded-xl border border-[#D1B370]/30">
              <dt className="text-stone-500 font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#A76D40]" />
                <span>End Date &amp; Time</span>
              </dt>
              <dd className="mt-1 font-semibold text-stone-800">
                {endDisplay}
              </dd>
            </div>
          </dl>

          {patrol.notes ? (
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
              <span className="font-bold text-stone-700 block mb-0.5">Patrol Notes:</span>
              <p className="text-stone-600 italic">{patrol.notes}</p>
            </div>
          ) : (
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
              <span className="font-bold text-stone-700 block mb-0.5">Patrol Notes:</span>
              <p className="text-stone-400 italic">Not available</p>
            </div>
          )}
        </div>

        {/* 4. Ranger Location Information Card */}
        <div className="p-5 bg-white border border-[#D1B370]/60 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-sm font-bold text-[#1C2A1E] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#3E8E41]" />
              <span>Ranger Location Information</span>
            </h3>
            {isLocationAvailable ? (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  locStatus === 'Current'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-50 text-amber-800 border border-amber-300'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    locStatus === 'Current' ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'
                  }`}
                />
                {locStatus}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-300">
                <WifiOff className="w-3 h-3" />
                Unavailable
              </span>
            )}
          </div>

          {isLocationAvailable && coordsFormatted ? (
            <div className="space-y-3">
              <div className="p-4 bg-[#FAF7EE] border border-[#D1B370]/50 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                    Current Coordinates
                  </span>
                  <span className="text-xs font-mono font-extrabold text-[#1C2A1E]">
                    {coordsFormatted}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-stone-500 pt-1 border-t border-[#D1B370]/20">
                  <span>Latitude: <strong className="text-stone-800 font-mono">{latestWaypoint?.latitude.toFixed(4)}° N</strong></span>
                  <span>Longitude: <strong className="text-stone-800 font-mono">{latestWaypoint?.longitude.toFixed(4)}° E</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white border border-stone-200 rounded-xl">
                  <span className="text-stone-500 font-medium block text-[11px]">Telemetry Freshness</span>
                  <p className="font-bold text-stone-800 mt-0.5">{locationLabel}</p>
                </div>

                <div className="p-3 bg-white border border-stone-200 rounded-xl">
                  <span className="text-stone-500 font-medium block text-[11px]">Last GPS Ping</span>
                  <p className="font-semibold text-stone-800 mt-0.5">
                    {locRecordedAt ? locRecordedAt.toLocaleTimeString() : 'Recent'}
                    {locAgeMs !== null && (
                      <span className="text-stone-500 text-[10px] block">
                        ({formatLocationAge(locAgeMs) || 'just now'})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-stone-50 border border-stone-200 rounded-xl flex flex-col items-center justify-center text-center gap-2 text-stone-500">
              <WifiOff className="w-6 h-6 text-stone-400" />
              <p className="text-sm font-bold text-stone-700">Location unavailable</p>
              <p className="text-xs text-stone-500 max-w-xs">
                {patrol.status === PatrolStatus.PLANNED
                  ? 'This patrol has not started yet. GPS telemetry will activate once the ranger deploys.'
                  : patrol.status === PatrolStatus.CANCELLED
                  ? 'This patrol was cancelled before live GPS telemetry was recorded.'
                  : 'No recent GPS breadcrumbs recorded for this patrol session.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Patrol Progress & Coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. Patrol Progress Card */}
        <div className="p-5 bg-white border border-[#D1B370]/60 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-sm font-bold text-[#1C2A1E] flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-[#3E8E41]" />
              <span>Patrol Progress</span>
            </h3>
            <span className="text-xl font-extrabold text-[#1C2A1E] font-mono">
              {formattedProgress}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-stone-600">
              <span>Completion Rate</span>
              <span>{formattedProgress}</span>
            </div>
            <div className="w-full bg-stone-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  progress === 100
                    ? 'bg-emerald-600'
                    : progress > 0
                    ? 'bg-[#3E8E41]'
                    : 'bg-stone-300'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Metrics breakdown */}
          <div className="grid grid-cols-3 gap-2 text-center pt-2">
            <div className="p-3 bg-[#FAF7EE] border border-[#D1B370]/40 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-stone-500 block">
                Recorded Waypoints
              </span>
              <span className="text-lg font-extrabold text-[#1C2A1E] font-mono">
                {recordedCount}
              </span>
            </div>

            <div className="p-3 bg-[#FAF7EE] border border-[#D1B370]/40 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-stone-500 block">
                Planned Waypoints
              </span>
              <span className="text-lg font-extrabold text-[#1C2A1E] font-mono">
                {plannedCount}
              </span>
            </div>

            <div className="p-3 bg-[#FAF7EE] border border-[#D1B370]/40 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-stone-500 block">
                Remaining Waypoints
              </span>
              <span className="text-lg font-extrabold text-[#1C2A1E] font-mono">
                {remainingCheckpointsCount}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Patrol Coverage Card */}
        <div className="p-5 bg-white border border-[#D1B370]/60 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-sm font-bold text-[#1C2A1E] flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#3E8E41]" />
              <span>Patrol Coverage</span>
            </h3>
            <span className="text-xl font-extrabold text-[#1C2A1E] font-mono">
              {formattedCoverage}
            </span>
          </div>

          {/* Coverage Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-stone-600">
              <span className="flex items-center gap-1.5">
                <span>Route Checkpoints Verified</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    classification === 'Good Coverage'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      : classification === 'Under-patrolled'
                      ? 'bg-amber-50 text-amber-800 border border-amber-300'
                      : 'bg-stone-100 text-stone-600 border border-stone-300'
                  }`}
                >
                  {classification}
                </span>
              </span>
              <span>{formattedCoverage}</span>
            </div>
            <div className="w-full bg-stone-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  coverage >= UNDER_PATROLLED_COVERAGE_THRESHOLD
                    ? 'bg-emerald-600'
                    : coverage > 0
                    ? 'bg-amber-500'
                    : 'bg-stone-300'
                }`}
                style={{ width: `${coverage}%` }}
              />
            </div>
          </div>

          {/* Coverage Breakdown */}
          <div className="grid grid-cols-2 gap-3 text-center pt-2">
            <div className="p-3 bg-[#FAF7EE] border border-[#D1B370]/40 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-stone-500 block">
                Visited Checkpoints
              </span>
              <span className="text-lg font-extrabold text-[#1C2A1E] font-mono">
                {visitedCheckpointsCount} / {plannedCount}
              </span>
            </div>

            <div className="p-3 bg-[#FAF7EE] border border-[#D1B370]/40 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-stone-500 block">
                Standard Met
              </span>
              <span className="text-xs font-bold text-[#2E6B31] mt-1 block">
                {plannedCount === 0
                  ? 'No Route Data'
                  : coverage >= UNDER_PATROLLED_COVERAGE_THRESHOLD
                  ? '≥ 70% Standard Met'
                  : 'Requires Supervisory Attention'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Route Map Visualization */}
      <PatrolRouteMap patrol={patrol} route={currentRoute} />

      {/* 6. Route & Waypoint Information Table */}
      <div className="p-5 bg-white border border-[#D1B370]/60 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#1C2A1E] flex items-center gap-2">
              <RouteIcon className="w-4 h-4 text-[#3E8E41]" />
              <span>Route &amp; Waypoint Information</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Corridor: <strong className="text-stone-800">{currentRoute?.name || patrol.routeName || 'Not available'}</strong>
              {currentRoute?.code && ` (${currentRoute.code})`}
              {currentRoute?.estimatedDurationMinutes ? ` • Est. Duration: ${currentRoute.estimatedDurationMinutes} mins` : ''}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="text-stone-600">
              Planned Checkpoints: <strong className="text-stone-900 font-mono">{plannedCount}</strong>
            </span>
            <span className="text-stone-400">•</span>
            <span className="text-stone-600">
              Visited: <strong className="text-emerald-700 font-mono">{visitedCheckpointsCount}</strong>
            </span>
            <span className="text-stone-400">•</span>
            <span className="text-stone-600">
              Remaining: <strong className="text-amber-700 font-mono">{remainingCheckpointsCount}</strong>
            </span>
          </div>
        </div>

        {/* Checkpoint table */}
        {plannedCount > 0 ? (
          <div className="overflow-x-auto border border-[#D1B370]/40 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7EE] text-[11px] uppercase tracking-wider text-[#A76D40] border-b border-[#D1B370]/40 font-bold">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Planned Coordinates</th>
                  <th className="py-2.5 px-3">Visited Status</th>
                  <th className="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {plannedCheckpoints.map((cp, idx) => {
                  const visited = isCheckpointVisited(cp, recordedWaypoints);
                  return (
                    <tr key={cp.id || idx} className="hover:bg-[#FAF7EE]/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-stone-700">
                        {cp.sequenceOrder || idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                          {cp.locationType || 'GPS'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-stone-700">
                        {formatCoordinates(cp.latitude, cp.longitude) || 'Not available'}
                      </td>
                      <td className="py-2.5 px-3">
                        {visited ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Visited
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                            <Clock className="w-3 h-3 text-stone-400" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-stone-500 italic">
                        {cp.notes || 'Not available'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 px-4 bg-[#FAF7EE]/50 border border-[#D1B370]/30 rounded-xl text-center text-xs text-stone-600">
            <p className="font-semibold">No planned route checkpoints configured for this corridor.</p>
            <p className="text-stone-500 mt-0.5">
              Recorded GPS breadcrumbs from the field: {recordedCount}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
