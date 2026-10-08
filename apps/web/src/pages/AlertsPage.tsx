import { useEffect, useState, useCallback, useMemo } from 'react';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import {
  AlertTriangle,
  Radio,
  RefreshCw,
  Eye,
  ShieldAlert,
  CheckCircle2,
  Clock,
  MapPin,
} from 'lucide-react';
import {
  WildlifeRiskAlert,
  WildlifeAnimal,
  AlertStatus,
  RiskLevel,
} from '../features/uc03-alerts/types';
import { webAlertService } from '../features/uc03-alerts/services/alertService';
import { CollarFleetCards } from '../features/uc03-alerts/components/CollarFleetCards';
import { AlertDetailModal } from '../features/uc03-alerts/components/AlertDetailModal';
import { SimulateTelemetryModal } from '../features/uc03-alerts/components/SimulateTelemetryModal';

export function AlertsPage() {
  const [alerts, setAlerts] = useState<WildlifeRiskAlert[]>([]);
  const [animals, setAnimals] = useState<WildlifeAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('ALL');

  // Modals state
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  const [simulatingAnimal, setSimulatingAnimal] = useState<WildlifeAnimal | undefined>(undefined);
  const [notification, setNotification] = useState<string | null>(null);

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setIsRefreshing(true);

      const [alertsData, animalsData] = await Promise.all([
        webAlertService.fetchAlerts().catch(() => []),
        webAlertService.fetchAnimals().catch(() => []),
      ]);

      setAlerts(alertsData);
      setAnimals(animalsData);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Dynamic KPI Stats
  const stats = useMemo(() => {
    let activeCount = 0;
    let respondingCount = 0;
    let resolvedCount = 0;
    let criticalCount = 0;

    for (const a of alerts) {
      if (a.status === AlertStatus.ACTIVE) activeCount++;
      if (a.status === AlertStatus.RESPONDING || a.status === AlertStatus.ACKNOWLEDGED) {
        respondingCount++;
      }
      if (a.status === AlertStatus.RESOLVED) resolvedCount++;
      if (a.severity === RiskLevel.CRITICAL && a.status !== AlertStatus.RESOLVED) {
        criticalCount++;
      }
    }

    return {
      total: alerts.length,
      active: activeCount,
      responding: respondingCount,
      resolved: resolvedCount,
      critical: criticalCount,
    };
  }, [alerts]);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    if (filter === 'ALL') return alerts;
    return alerts.filter((item) => item.severity === filter || item.status === filter);
  }, [alerts, filter]);

  const handleOpenSimulate = (animal?: WildlifeAnimal) => {
    setSimulatingAnimal(animal);
    setIsSimulateModalOpen(true);
  };

  const handleAlertUpdated = () => {
    loadData(true);
    setNotification('Alert status updated successfully.');
    setTimeout(() => setNotification(null), 4000);
  };

  const columns: Column<WildlifeRiskAlert>[] = [
    {
      header: 'Subject Animal',
      accessor: (item) => (
        <div>
          <span className="font-extrabold text-[#1C2A1E] block">
            {item.animalName || 'Tracked Animal'}
          </span>
          <span className="text-stone-500 text-xs font-medium">
            {item.animalSpecies || 'Species N/A'}
          </span>
        </div>
      ),
    },
    {
      header: 'Risk Zone',
      accessor: (item) => (
        <span className="text-stone-800 font-semibold text-xs">
          {item.zoneName || 'Corridor / Buffer Zone'}
        </span>
      ),
    },
    {
      header: 'Severity',
      accessor: (item) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge status={item.severity} size="sm" />
          {item.severity === RiskLevel.CRITICAL && (
            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-rose-600 text-white animate-pulse">
              BREACH
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Coordinates',
      accessor: (item) => (
        <span className="text-stone-600 font-mono text-xs font-semibold flex items-center gap-1">
          <MapPin className="w-3 h-3 text-[#A76D40]" />
          {item.location
            ? `${item.location.latitude.toFixed(4)}, ${item.location.longitude.toFixed(4)}`
            : 'Perimeter Point'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (item) => <StatusBadge status={item.status} size="sm" />,
    },
    {
      header: 'Generated',
      accessor: (item) => (
        <span className="text-stone-500 text-xs font-medium">
          {item.generatedAt
            ? new Date(item.generatedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Recent'}
        </span>
      ),
    },
    {
      header: 'Action',
      className: 'text-right',
      accessor: (item) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedAlertId(item.id);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#3E8E41] hover:bg-[#347837] shadow-2xs transition-colors duration-150"
        >
          <Eye className="w-3.5 h-3.5" />
          {item.status === AlertStatus.RESOLVED ? 'View' : 'Respond'}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-[#1C2A1E] tracking-tight">
              Wildlife Risk Alerts & Early Warning
            </h2>
            <span className="px-2 py-0.5 text-xs font-bold bg-[#3E8E41]/15 text-[#2E6B31] border border-[#3E8E41]/30 rounded">
              UC03 LIVE
            </span>
            <span className="sr-only">UC03 SHELL</span>
          </div>
          <p className="text-sm text-[#A76D40] font-medium mt-1">
            Real-time GPS collar telemetry ingestion, automatic geofence evaluation, and ranger dispatch response.
          </p>
        </div>

        {/* Primary Header Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleOpenSimulate()}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-[#A76D40] hover:bg-[#8e5a32] rounded-xl shadow-xs transition-colors duration-150"
          >
            <Radio className="w-4 h-4" />
            Simulate Telemetry
          </button>

          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-stone-700 bg-white hover:bg-[#F5F5DC] border border-[#D1B370]/60 rounded-xl shadow-2xs transition-colors duration-150"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#3E8E41] ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {notification}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white border border-[#D1B370]/60 rounded-xl shadow-2xs">
          <div className="text-xs font-bold text-stone-500 uppercase tracking-wide">
            Total Alerts
          </div>
          <div className="text-2xl font-black text-[#1C2A1E] mt-1">
            {stats.total}
          </div>
        </div>

        <div className="p-4 bg-white border border-[#D1B370]/60 rounded-xl shadow-2xs">
          <div className="text-xs font-bold text-rose-700 uppercase tracking-wide flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Active Breaches
          </div>
          <div className="text-2xl font-black text-rose-700 mt-1">
            {stats.active}
          </div>
        </div>

        <div className="p-4 bg-white border border-[#D1B370]/60 rounded-xl shadow-2xs">
          <div className="text-xs font-bold text-[#A76D40] uppercase tracking-wide flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#A76D40]" />
            In Response
          </div>
          <div className="text-2xl font-black text-[#A76D40] mt-1">
            {stats.responding}
          </div>
        </div>

        <div className="p-4 bg-white border border-[#D1B370]/60 rounded-xl shadow-2xs">
          <div className="text-xs font-bold text-[#3E8E41] uppercase tracking-wide flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#3E8E41]" />
            Resolved
          </div>
          <div className="text-2xl font-black text-[#2E6B31] mt-1">
            {stats.resolved}
          </div>
        </div>
      </div>

      {/* Part 7: Collar Fleet Monitoring Panel */}
      <CollarFleetCards
        animals={animals}
        loading={loading}
        onSimulateForAnimal={(animal) => handleOpenSimulate(animal)}
      />

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['ALL', 'ACTIVE', 'ACKNOWLEDGED', 'RESPONDING', 'RESOLVED', 'CRITICAL', 'HIGH'].map((st) => {
            const isActive = filter === st;
            return (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#3E8E41] text-white shadow-xs'
                    : 'bg-white text-stone-700 hover:bg-[#F5F5DC] border border-[#D1B370]/60'
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>

        <div className="text-xs font-semibold text-stone-500">
          Showing {filteredAlerts.length} of {alerts.length} alerts
        </div>
      </div>

      {/* Alerts Table */}
      {loading ? (
        <LoadingState message="Fetching live wildlife risk alerts from server..." />
      ) : filteredAlerts.length === 0 ? (
        <EmptyState
          title="No Alerts Found"
          message={
            filter === 'ALL'
              ? 'No wildlife risk alerts recorded in the system. Use the simulator above to transmit collar pings.'
              : `No alerts currently match the "${filter}" filter criteria.`
          }
          icon={<ShieldAlert className="w-8 h-8 text-[#3E8E41]" />}
          action={{
            label: 'Simulate Telemetry Ping',
            onClick: () => handleOpenSimulate(),
          }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredAlerts}
          keyExtractor={(item) => item.id}
          onRowClick={(item) => setSelectedAlertId(item.id)}
          emptyMessage="No alerts match the selected filter."
        />
      )}

      {/* Part 4: Alert Detail & Response Modal */}
      {selectedAlertId && (
        <AlertDetailModal
          alertId={selectedAlertId}
          onClose={() => setSelectedAlertId(null)}
          onAlertUpdated={handleAlertUpdated}
        />
      )}

      {/* Part 8: Telemetry Simulation Modal */}
      {isSimulateModalOpen && (
        <SimulateTelemetryModal
          animals={animals}
          initialSelectedAnimalId={simulatingAnimal?.id}
          onClose={() => setIsSimulateModalOpen(false)}
          onSimulationSuccess={() => loadData(true)}
        />
      )}
    </div>
  );
}
