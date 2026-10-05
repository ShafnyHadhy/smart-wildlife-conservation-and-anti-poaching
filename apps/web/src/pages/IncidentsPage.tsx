import { useEffect, useState } from 'react';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { apiClient } from '../services/apiClient';
import { Info, MapPin } from 'lucide-react';
import { Incident } from '@wildlife/shared';

export function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    async function loadIncidents() {
      try {
        setLoading(true);
        const data = await apiClient.get<Incident[]>('/incidents').catch(() => []);
        setIncidents(data);
      } finally {
        setLoading(false);
      }
    }
    loadIncidents();
  }, []);

  const filteredIncidents = incidents.filter((item) => {
    if (filter === 'ALL') return true;
    return item.status === filter;
  });

  const columns: Column<Incident>[] = [
    {
      header: 'Incident Type',
      accessor: (item) => (
        <div>
          <span className="font-bold text-white block">
            {item.incidentType.replace(/_/g, ' ')}
          </span>
          <span className="text-slate-400 text-xs line-clamp-1">
            {item.description}
          </span>
        </div>
      ),
    },
    {
      header: 'Reported By',
      accessor: (item) => (
        <span className="text-slate-300">
          {item.rangerName || item.rangerId?.slice(0, 8) || 'Field Ranger'}
        </span>
      ),
    },
    {
      header: 'GPS Location',
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
              Wildlife & Poaching Incidents
            </h2>
            <span className="px-2 py-0.5 text-xs font-bold bg-amber-950 text-amber-400 border border-amber-800 rounded">
              UC02 SHELL
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Reviewing field incident reports, evidence photos, and illegal snare activities.
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
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Feature Architecture Note */}
      <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/90 leading-relaxed">
          <strong className="text-amber-300">Team Member 2 Feature Workspace:</strong> Full incident creation,
          evidence photo management, and investigation status workflow belong in{' '}
          <code className="bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800 font-mono text-amber-300">
            apps/web/src/features/uc02-incidents/
          </code>
          .
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <LoadingState message="Fetching wildlife incident logs..." />
      ) : (
        <DataTable
          columns={columns}
          data={filteredIncidents}
          keyExtractor={(item) => item.id}
          emptyMessage="No incidents match the selected filter."
        />
      )}
    </div>
  );
}
