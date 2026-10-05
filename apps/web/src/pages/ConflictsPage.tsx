import { useEffect, useState } from 'react';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { apiClient } from '../services/apiClient';
import { Info, MapPin } from 'lucide-react';
import { ConflictReport } from '@wildlife/shared';

export function ConflictsPage() {
  const [reports, setReports] = useState<ConflictReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    async function loadConflicts() {
      try {
        setLoading(true);
        const data = await apiClient.get<ConflictReport[]>('/conflict-reports').catch(() => []);
        setReports(data);
      } finally {
        setLoading(false);
      }
    }
    loadConflicts();
  }, []);

  const filteredReports = reports.filter((item) => {
    if (filter === 'ALL') return true;
    return item.status === filter;
  });

  const columns: Column<ConflictReport>[] = [
    {
      header: 'Conflict Incident',
      accessor: (item) => (
        <div>
          <span className="font-bold text-white block">
            {item.conflictType.replace(/_/g, ' ')}
          </span>
          <span className="text-slate-400 text-xs line-clamp-1">
            {item.description}
          </span>
        </div>
      ),
    },
    {
      header: 'Community Reporter',
      accessor: (item) => (
        <div>
          <span className="text-slate-200 block text-xs font-semibold">
            {item.reporterName || 'Local Resident'}
          </span>
          <span className="text-slate-500 text-[11px]">
            {item.villageName || 'Buffer Zone Village'}
          </span>
        </div>
      ),
    },
    {
      header: 'Location',
      accessor: (item) => (
        <span className="text-slate-400 text-xs font-mono flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-slate-500" />
          {Number(item.latitude).toFixed(4)}, {Number(item.longitude).toFixed(4)}
        </span>
      ),
    },
    {
      header: 'Reported At',
      accessor: (item) => (
        <span className="text-slate-400 text-xs">
          {item.reportedAt ? new Date(item.reportedAt).toLocaleDateString() : 'Recent'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (item) => <StatusBadge status={item.status} size="sm" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Human-Wildlife Conflict Reports
            </h2>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">
              UC04 SHELL
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Reviewing community crop raid notices, property damage compensation, and verifications.
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2">
          {['ALL', 'REPORTED', 'INVESTIGATING', 'VERIFIED', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 ${
                filter === st
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Feature Architecture Note */}
      <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-200/90 leading-relaxed">
          <strong className="text-emerald-300">Team Member 4 Feature Workspace:</strong> Community liaison reporting,
          officer compensation review workflow, and resolution tracking belong in{' '}
          <code className="bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800 font-mono text-emerald-300">
            apps/web/src/features/uc04-conflicts/
          </code>
          .
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <LoadingState message="Fetching community conflict records..." />
      ) : (
        <DataTable
          columns={columns}
          data={filteredReports}
          keyExtractor={(item) => item.id}
          emptyMessage="No conflict reports match the selected filter."
        />
      )}
    </div>
  );
}
