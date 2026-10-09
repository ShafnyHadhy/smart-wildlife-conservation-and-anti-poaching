import { useEffect, useState, useCallback, useMemo } from 'react';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { Compass, AlertTriangle, MapPin, Clock, WifiOff, CheckCircle2, Plus, RefreshCw } from 'lucide-react';
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
  evaluatePatrolAttention,
  getUnderPatrolledSummary,
  calculatePatrolStatistics,
  applyPatrolFilters,
  deriveParkOptions,
  deriveRangerOptions,
  deriveRouteOptions,
  DEFAULT_PATROL_FILTERS,
  PatrolFilterState,
} from '../features/uc01-patrol/utils';
import {
  UnderPatrolledOverviewCard,
  PatrolOverviewStats,
  PatrolFilterBar,
  PatrolDetailsView,
  CreatePatrolModal,
} from '../features/uc01-patrol/components';

export interface PatrolsPageProps {
  initialPatrolId?: string;
}

export function PatrolsPage({ initialPatrolId }: PatrolsPageProps = {}) {
  const [patrols, setPatrols] = useState<Patrol[]>([]);
  const [routes, setRoutes] = useState<PatrolRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PatrolFilterState>(DEFAULT_PATROL_FILTERS);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPatrolId, setSelectedPatrolId] = useState<string | null>(initialPatrolId || null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadPatrolsData = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (silent) setRefreshing(true);
      else {
        setLoading(true);
        setError(null);
      }
      const [patrolsRes, routesRes] = await Promise.all([
        webPatrolService.fetchPatrols(),
        webPatrolService.fetchPatrolRoutes(),
      ]);

      const safePatrols = Array.isArray(patrolsRes) ? patrolsRes : [];
      const safeRoutes = Array.isArray(routesRes) ? routesRes : [];

      // Enrich active/completed patrols with detailed waypoints if not already present
      const enrichedPatrols = await Promise.all(
        safePatrols.map(async (patrol) => {
          if (!patrol || !patrol.id) return patrol;
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
              waypoints: detail?.waypoints || [],
            };
          } catch {
            return patrol;
          }
        })
      );

      setPatrols(enrichedPatrols.filter((p): p is Patrol => Boolean(p && p.id)));
      setRoutes(safeRoutes);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to fetch patrol monitoring data. Please check connection.';
      setError(message);
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatrolsData();
  }, [loadPatrolsData]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadPatrolsData({ silent: true });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [loadPatrolsData]);

  const handlePatrolUpdated = useCallback((updated: Patrol) => {
    setPatrols((current) => current.map((patrol) => patrol.id === updated.id ? updated : patrol));
  }, []);

  // Derive filter options from full patrol dataset
  const parkOptions = useMemo(() => deriveParkOptions(patrols), [patrols]);
  const rangerOptions = useMemo(() => deriveRangerOptions(patrols), [patrols]);
  const routeOptions = useMemo(() => deriveRouteOptions(patrols), [patrols]);

  // Apply all filters together to produce the table dataset
  const filteredPatrols = useMemo(
    () => applyPatrolFilters(patrols, filters),
    [patrols, filters]
  );

  // Task 8 statistics and Task 7 under-patrolled summary always use the FULL dataset (not filtered)
  const underPatrolledSummary = getUnderPatrolledSummary(patrols, routes);
  const overviewStats = calculatePatrolStatistics(patrols, routes);

  function handleFiltersChange(next: PatrolFilterState) {
    setFilters(next);
  }

  function handleResetFilters() {
    setFilters(DEFAULT_PATROL_FILTERS);
  }

  const columns: Column<Patrol>[] = [
    {
      header: 'Patrol Code',
      accessor: (p) => (
        <span className="font-bold text-[#1C2A1E]">
          {p.patrolCode || (p.id ? p.id.slice(0, 8) : 'Not available')}
        </span>
      ),
    },
    {
      header: 'Assigned Ranger',
      accessor: (p) => (
        <span className="text-stone-700">
          {p.rangerName || p.rangerId || 'Not available'}
        </span>
      ),
    },
    {
      header: 'Route Corridor',
      accessor: (p) => (
        <span className="text-stone-600">
          {p.routeName || routes.find((r) => r.id === p.patrolRouteId)?.name || 'Not available'}
        </span>
      ),
    },
    {
      header: 'Start Time',
      accessor: (p) => {
        if (!p.startTime) {
          return (
            <span className="text-stone-500 text-xs">
              {p.status === PatrolStatus.PLANNED ? 'Scheduled' : 'Not available'}
            </span>
          );
        }
        const d = new Date(p.startTime);
        return (
          <span className="text-stone-500 text-xs">
            {!Number.isNaN(d.getTime()) ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not available'}
          </span>
        );
      },
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
      header: 'Status / Evaluation',
      accessor: (p) => {
        const route = routes.find((r) => r.id === p.patrolRouteId);
        const evalResult = evaluatePatrolAttention(p, route);

        if (p.status === PatrolStatus.ACTIVE) {
          if (evalResult.needsAttention) {
            return (
              <div className="flex flex-col gap-1 items-start">
                <StatusBadge status={p.status || PatrolStatus.ACTIVE} size="sm" />
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300"
                  title={evalResult.reasons.join(', ')}
                >
                  <AlertTriangle className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                  {evalResult.isUnderPatrolled ? 'Under-patrolled' : 'Needs Attention'}
                </span>
              </div>
            );
          }

          return (
            <div className="flex flex-col gap-1 items-start">
              <StatusBadge status={p.status || PatrolStatus.ACTIVE} size="sm" />
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                On Track
              </span>
            </div>
          );
        }

        return <StatusBadge status={p.status || PatrolStatus.PLANNED} size="sm" />;
      },
    },
    {
      header: 'Actions',
      accessor: (p) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedPatrolId(p.id);
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-[#2E6B31]
            bg-[#3E8E41]/10 hover:bg-[#3E8E41]/20 border border-[#3E8E41]/30 rounded-lg transition-colors"
          aria-label={`View Details for ${p.patrolCode || p.id}`}
        >
          View Details
        </button>
      ),
    },
  ];

  if (selectedPatrolId) {
    return (
      <PatrolDetailsView
        patrolId={selectedPatrolId}
        onBack={() => {
          setSelectedPatrolId(null);
          void loadPatrolsData({ silent: true });
        }}
        initialPatrol={patrols.find((p) => p.id === selectedPatrolId)}
        routes={routes}
        onPatrolUpdated={handlePatrolUpdated}
      />
    );
  }

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
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="hidden sm:inline text-xs text-stone-500">
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            type="button"
            onClick={() => { void loadPatrolsData({ silent: true }); }}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-stone-700 bg-white
              border border-[#D1B370]/60 rounded-xl hover:bg-[#FAF7EE] disabled:opacity-60"
            aria-label="Refresh patrol monitoring"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        {/* Create Patrol button — visible once data is loaded */}
        {!loading && !error && (
          <button
            id="btn-create-patrol"
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white
              bg-gradient-to-br from-[#3E8E41] to-[#2E6B31] rounded-xl
              hover:from-[#2E6B31] hover:to-[#1C5520] shadow-md transition-all"
            aria-label="Create new patrol assignment"
          >
            <Plus className="w-4 h-4" />
            New Patrol
          </button>
        )}
        </div>
      </div>

      {/* Create Patrol Modal */}
      {showCreateModal && (
        <CreatePatrolModal
          routes={routes}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { void loadPatrolsData(); }}
        />
      )}

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
            <>
              {/* Overview Statistics (UC01 Task 8) — uses full dataset */}
              <PatrolOverviewStats stats={overviewStats} />

              {/* Under-Patrolled & Operational Attention Overview (UC01 Task 7) — uses full dataset */}
              <UnderPatrolledOverviewCard summary={underPatrolledSummary} />

              {/* Filters (UC01 Task 9) */}
              <PatrolFilterBar
                filters={filters}
                parkOptions={parkOptions}
                rangerOptions={rangerOptions}
                routeOptions={routeOptions}
                onFiltersChange={handleFiltersChange}
                onReset={handleResetFilters}
              />

              {/* Patrol table — uses filtered dataset */}
              {filteredPatrols.length === 0 ? (
                <div
                  data-testid="filter-empty-state"
                  className="flex flex-col items-center justify-center gap-3 py-12 px-6
                    bg-white border border-[#D1B370]/60 rounded-2xl shadow-xs text-center"
                >
                  <Compass className="w-8 h-8 text-stone-300" />
                  <p className="text-sm font-bold text-stone-500">No patrols match the selected filters.</p>
                  <p className="text-xs text-stone-400">
                    Try adjusting your filters, or{' '}
                    <button
                      onClick={handleResetFilters}
                      className="font-bold text-[#3E8E41] underline underline-offset-2 hover:text-[#2E6B31]"
                    >
                      clear all filters
                    </button>{' '}
                    to see all patrols.
                  </p>
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={filteredPatrols}
                  keyExtractor={(p) => p.id}
                  onRowClick={(p) => setSelectedPatrolId(p.id)}
                  emptyMessage="No patrols match the selected filter."
                />
              )}
            </>
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
