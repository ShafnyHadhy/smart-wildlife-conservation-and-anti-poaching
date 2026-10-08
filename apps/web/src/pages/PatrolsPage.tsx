import { useEffect, useState, useCallback } from 'react';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { Compass, Info, AlertTriangle, MapPin, Clock, WifiOff } from 'lucide-react';
import { Patrol, PatrolRoute, PatrolStatus } from '@wildlife/shared';
import { webPatrolService } from '../features/uc01-patrol/services/patrolService';
import {
  calculatePatrolProgress,
  formatProgress,
  calculatePatrolCoverage,
  classifyPatrolCoverage,
  formatCoverage,
  UNDER_PATROLLED_COVERAGE_THRESHOLD,
  getRangerLocationInfo,
  formatRangerLocationLabel,
  formatCoordinates,
} from '../features/uc01-patrol/utils';

const STATUS_FILTERS: readonly (PatrolStatus | 'ALL')[] = [
  'ALL',
  PatrolStatus.ACTIVE,
  PatrolStatus.PLANNED,
  PatrolStatus.COMPLETED,
];

export function PatrolsPage() {
  const [patrols, setPatrols] = useState<Patrol[]>([]);
  const [routes, setRoutes] = useState<PatrolRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PatrolStatus | 'ALL'>('ALL');

  const loadPatrolsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [patrolsRes, routesRes] = await Promise.all([
        webPatrolService.fetchPatrols(),
        webPatrolService.fetchPatrolRoutes(),
      ]);

      // Enrich active/completed patrols with detailed waypoints if not already present
      const enrichedPatrols = await Promise.all(
        patrolsRes.map(async (patrol) => {
          if (patrol.waypoints && patrol.waypoints.length > 0) {
            return patrol;
          }
          // Do not fetch details for planned or cancelled patrols
          if (
            patrol.status === PatrolStatus.PLANNED ||
            patrol.status === PatrolStatus.CANCELLED
          ) {
            return { ...patrol, waypoints: [] };
          }
          try {
            const detail = await webPatrolService.fetchPatrolById(patrol.id);
            return {
              ...patrol,
              ...detail,
              waypoints: detail.waypoints || [],
            };
          } catch {
            return patrol;
          }
        })
      );

      setPatrols(enrichedPatrols);
      setRoutes(routesRes);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to fetch patrol monitoring data. Please check connection.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatrolsData();
  }, [loadPatrolsData]);

  const filteredPatrols = patrols.filter((p) => {
    if (filter === 'ALL') return true;
    return p.status === filter;
  });

  const columns: Column<Patrol>[] = [
    {
      header: 'Patrol Code',
      accessor: (p) => (
        <span className="font-bold text-[#1C2A1E]">
          {p.patrolCode || p.id.slice(0, 8)}
        </span>
      ),
    },
    {
      header: 'Assigned Ranger',
      accessor: (p) => (
        <span className="text-stone-700">
          {p.rangerName || p.rangerId?.slice(0, 8) || 'Assigned Ranger'}
        </span>
      ),
    },
    {
      header: 'Route Corridor',
      accessor: (p) => (
        <span className="text-stone-600">
          {p.routeName || 'Coastal Patrol'}
        </span>
      ),
    },
    {
      header: 'Start Time',
      accessor: (p) => (
        <span className="text-stone-500 text-xs">
          {p.startTime ? new Date(p.startTime).toLocaleTimeString() : 'Scheduled'}
        </span>
      ),
    },
    {
      header: 'Progress',
      accessor: (p) => {
        const route = routes.find((r) => r.id === p.patrolRouteId);
        const progress = calculatePatrolProgress(p, route?.waypoints?.length || undefined);
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 bg-stone-200 rounded-full h-1.5 overflow-hidden">
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
            <span className="font-bold text-stone-800 text-xs font-mono">
              {formatProgress(progress)}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Coverage',
      accessor: (p) => {
        const route = routes.find((r) => r.id === p.patrolRouteId);
        const plannedCheckpoints = route?.waypoints;
        const coverage = calculatePatrolCoverage(p, plannedCheckpoints);
        const classification = classifyPatrolCoverage(p, plannedCheckpoints);
        const isGood = classification === 'Good Coverage';
        const isUnder = classification === 'Under-patrolled';

        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="w-16 bg-stone-200 rounded-full h-1.5 overflow-hidden">
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
              <span className="font-bold text-stone-800 text-xs font-mono">
                {formatCoverage(coverage)}
              </span>
            </div>
            {p.status === PatrolStatus.ACTIVE || p.status === PatrolStatus.COMPLETED ? (
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded w-fit ${
                  isGood
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : isUnder
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-stone-100 text-stone-600 border border-stone-200'
                }`}
              >
                {classification}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      header: 'Location Status',
      accessor: (p) => {
        const info = getRangerLocationInfo(p.waypoints);
        const label = formatRangerLocationLabel(info, p.status);
        const { status, latestWaypoint } = info;

        if (
          p.status === PatrolStatus.PLANNED ||
          p.status === PatrolStatus.CANCELLED ||
          status === 'Unavailable'
        ) {
          return (
            <div className="flex items-center gap-1.5 text-stone-400">
              <WifiOff className="w-3 h-3 shrink-0" />
              <span className="text-[11px] font-medium">Location unavailable</span>
            </div>
          );
        }

        const coords = latestWaypoint
          ? formatCoordinates(latestWaypoint.latitude, latestWaypoint.longitude)
          : null;

        if (status === 'Stale') {
          return (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  <Clock className="w-2.5 h-2.5" />
                  Stale
                </span>
                {coords && (
                  <span className="text-[10px] font-mono text-stone-500">{coords}</span>
                )}
              </div>
              <span className="text-[10px] text-stone-500 font-medium">{label}</span>
            </div>
          );
        }

        // Current
        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                <MapPin className="w-2.5 h-2.5" />
                Current
              </span>
              {coords && (
                <span className="text-[10px] font-mono text-stone-500">{coords}</span>
              )}
            </div>
            <span className="text-[10px] text-stone-500 font-medium">{label}</span>
          </div>
        );
      },
    },
    {
      header: 'Status',
      accessor: (p) => <StatusBadge status={p.status} size="sm" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-[#1C2A1E] tracking-tight">
              Patrol Monitoring Command
            </h2>
            <span className="px-2 py-0.5 text-xs font-bold bg-[#3E8E41]/15 text-[#2E6B31] border border-[#3E8E41]/40 rounded">
              UC01 SHELL
            </span>
          </div>
          <p className="text-sm text-[#A76D40] font-medium mt-1">
            Tracking active ranger patrols, pre-approved corridors, and waypoint coverage.
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2">
          {STATUS_FILTERS.map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors duration-150 ${
                filter === st
                  ? 'bg-[#3E8E41] text-white shadow-xs'
                  : 'bg-white text-stone-700 hover:bg-[#F5F5DC] border border-[#D1B370]/60'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Feature Architecture Note */}
      <div className="p-4 bg-[#FAF7EE] border border-[#D1B370]/70 rounded-xl flex items-start gap-3 shadow-xs">
        <Info className="w-5 h-5 text-[#3E8E41] shrink-0 mt-0.5" />
        <div className="text-xs text-stone-700 leading-relaxed font-medium">
          <strong className="text-[#1C2A1E]">Team Member 1 Feature Workspace:</strong> Full patrol coverage calculation,
          under-patrolled boundary detection, and the interactive map component belong in{' '}
          <code className="bg-[#F5F5DC] px-1.5 py-0.5 rounded border border-[#D1B370]/60 font-mono text-[#A76D40]">
            apps/web/src/features/uc01-patrol/
          </code>
          .
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <LoadingState message="Fetching current patrols and routes..." />
      ) : error ? (
        <EmptyState
          title="Unable to Load Patrol Monitoring Data"
          message={error}
          icon={<AlertTriangle className="w-8 h-8 text-amber-600" />}
          action={{
            label: 'Retry',
            onClick: () => {
              void loadPatrolsData();
            },
          }}
        />
      ) : (
        <div className="space-y-4">
          {patrols.length === 0 ? (
            <EmptyState
              title="No Patrols Recorded"
              message="There are currently no active, planned, or completed ranger patrols."
              icon={<Compass className="w-8 h-8 text-[#3E8E41]" />}
              action={{
                label: 'Refresh Data',
                onClick: () => {
                  void loadPatrolsData();
                },
              }}
            />
          ) : (
            <DataTable
              columns={columns}
              data={filteredPatrols}
              keyExtractor={(p) => p.id}
              emptyMessage="No patrols match the selected filter."
            />
          )}

          {/* Available Route Corridors Overview */}
          {routes.length > 0 && (
            <div className="p-5 bg-white border border-[#D1B370]/60 rounded-2xl space-y-3 shadow-xs">
              <h3 className="text-sm font-bold text-[#1C2A1E] flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#3E8E41]" />
                <span>Pre-Approved Designated Corridors ({routes.length})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {routes.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 bg-[#FAF7EE] border border-[#D1B370]/50 rounded-xl"
                  >
                    <p className="text-xs font-bold text-[#1C2A1E]">{r.name}</p>
                    <p className="text-[11px] text-stone-600 mt-1 line-clamp-2">
                      {r.description || 'Designated conservation corridor in Yala.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
