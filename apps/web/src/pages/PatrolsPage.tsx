import { useEffect, useState } from 'react';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { apiClient } from '../services/apiClient';
import { Compass, Info } from 'lucide-react';
import { Patrol, PatrolRoute } from '@wildlife/shared';

export function PatrolsPage() {
  const [patrols, setPatrols] = useState<Patrol[]>([]);
  const [routes, setRoutes] = useState<PatrolRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    async function loadPatrolsData() {
      try {
        setLoading(true);
        const [patrolsRes, routesRes] = await Promise.all([
          apiClient.get<Patrol[]>('/patrols').catch(() => []),
          apiClient.get<PatrolRoute[]>('/patrol-routes').catch(() => []),
        ]);
        setPatrols(patrolsRes);
        setRoutes(routesRes);
      } finally {
        setLoading(false);
      }
    }
    loadPatrolsData();
  }, []);

  const filteredPatrols = patrols.filter((p) => {
    if (filter === 'ALL') return true;
    return p.status === filter;
  });

  const columns: Column<Patrol>[] = [
    {
      header: 'Patrol Code',
      accessor: (p) => (
        <span className="font-bold text-white">
          {(p as any).patrolCode || p.id.slice(0, 8)}
        </span>
      ),
    },
    {
      header: 'Assigned Ranger',
      accessor: (p) => (
        <span className="text-slate-300">
          {(p as any).rangerName || p.rangerId?.slice(0, 8) || 'Assigned Ranger'}
        </span>
      ),
    },
    {
      header: 'Route Corridor',
      accessor: (p) => (
        <span className="text-slate-400">
          {(p as any).routeName || 'Coastal Patrol'}
        </span>
      ),
    },
    {
      header: 'Start Time',
      accessor: (p) => (
        <span className="text-slate-400 text-xs">
          {(p as any).startTime ? new Date((p as any).startTime).toLocaleTimeString() : 'Scheduled'}
        </span>
      ),
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
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Patrol Monitoring Command
            </h2>
            <span className="px-2 py-0.5 text-xs font-bold bg-sky-950 text-sky-400 border border-sky-800 rounded">
              UC01 SHELL
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Tracking active ranger patrols, pre-approved corridors, and waypoint coverage.
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2">
          {['ALL', 'ACTIVE', 'PLANNED', 'COMPLETED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 ${
                filter === st
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Feature Architecture Note */}
      <div className="p-4 bg-sky-950/40 border border-sky-800/60 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <div className="text-xs text-sky-200/90 leading-relaxed">
          <strong className="text-sky-300">Team Member 1 Feature Workspace:</strong> Full patrol coverage calculation,
          under-patrolled boundary detection, and the interactive map component belong in{' '}
          <code className="bg-sky-950 px-1.5 py-0.5 rounded border border-sky-800 font-mono text-sky-300">
            apps/web/src/features/uc01-patrol/
          </code>
          .
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <LoadingState message="Fetching current patrols and routes..." />
      ) : (
        <div className="space-y-4">
          <DataTable
            columns={columns}
            data={filteredPatrols}
            keyExtractor={(p) => p.id}
            emptyMessage="No patrols match the selected filter."
          />

          {/* Available Route Corridors Overview */}
          {routes.length > 0 && (
            <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-sky-400" />
                <span>Pre-Approved Designated Corridors ({routes.length})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {routes.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl"
                  >
                    <p className="text-xs font-bold text-slate-200">{r.name}</p>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
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
