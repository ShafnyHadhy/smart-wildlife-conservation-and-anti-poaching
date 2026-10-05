import { useEffect, useState } from 'react';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { apiClient } from '../services/apiClient';
import { Info } from 'lucide-react';
import { WildlifeRiskAlert } from '@wildlife/shared';

export function AlertsPage() {
  const [alerts, setAlerts] = useState<WildlifeRiskAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    async function loadAlerts() {
      try {
        setLoading(true);
        const data = await apiClient.get<WildlifeRiskAlert[]>('/alerts').catch(() => []);
        setAlerts(data);
      } finally {
        setLoading(false);
      }
    }
    loadAlerts();
  }, []);

  const filteredAlerts = alerts.filter((item) => {
    if (filter === 'ALL') return true;
    return item.severity === filter || item.status === filter;
  });

  const columns: Column<WildlifeRiskAlert>[] = [
    {
      header: 'Subject Animal',
      accessor: (item) => (
        <div>
          <span className="font-bold text-[#1C2A1E] block">
            {item.animalName || 'Tracked Elephant'}
          </span>
          <span className="text-stone-500 text-xs">
            {item.animalSpecies || 'Elephas maximus maximus'}
          </span>
        </div>
      ),
    },
    {
      header: 'Risk Zone',
      accessor: (item) => (
        <span className="text-stone-700 font-medium">
          {item.zoneName || 'Buffer Zone / Corridor'}
        </span>
      ),
    },
    {
      header: 'Severity',
      accessor: (item) => <StatusBadge status={item.severity} size="sm" />,
    },
    {
      header: 'Generated At',
      accessor: (item) => (
        <span className="text-stone-500 text-xs">
          {item.generatedAt ? new Date(item.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
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
            <h2 className="text-2xl font-extrabold text-[#1C2A1E] tracking-tight">
              Wildlife Risk Alerts & Early Warning
            </h2>
            <span className="px-2 py-0.5 text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 rounded">
              UC03 SHELL
            </span>
          </div>
          <p className="text-sm text-[#A76D40] font-medium mt-1">
            Real-time animal geofence breaches, high-risk buffer zone proximity, and dispatch actions.
          </p>
        </div>

        {/* Severity / Status Filters */}
        <div className="flex items-center gap-2">
          {['ALL', 'CRITICAL', 'HIGH', 'ACTIVE', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors duration-150 ${
                filter === st
                  ? 'bg-rose-700 text-white shadow-xs'
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
        <Info className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
        <div className="text-xs text-stone-700 leading-relaxed font-medium">
          <strong className="text-[#1C2A1E]">Team Member 3 Feature Workspace:</strong> Automated risk zone
          point-in-polygon calculation, early warning dispatch notifications, and field response tracking belong in{' '}
          <code className="bg-[#F5F5DC] px-1.5 py-0.5 rounded border border-[#D1B370]/60 font-mono text-[#A76D40]">
            apps/web/src/features/uc03-alerts/
          </code>
          .
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <LoadingState message="Fetching active wildlife risk warnings..." />
      ) : (
        <DataTable
          columns={columns}
          data={filteredAlerts}
          keyExtractor={(item) => item.id}
          emptyMessage="No alerts match the selected filter."
        />
      )}
    </div>
  );
}
