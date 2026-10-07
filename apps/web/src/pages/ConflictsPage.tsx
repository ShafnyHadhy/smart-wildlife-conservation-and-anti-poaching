import { useEffect, useState, useCallback } from 'react';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { MapPin, ShieldAlert, AlertTriangle, Eye, RefreshCw } from 'lucide-react';
import {
  ConflictReport,
  ConflictStatus,
  ConflictType,
  ConflictStats,
  CreateConflictReportDTO,
} from '../features/uc04-conflicts/types';
import { webConflictService } from '../features/uc04-conflicts/services/conflictService';
import { ConflictStatCards } from '../features/uc04-conflicts/components/ConflictStatCards';
import { ConflictFilterBar } from '../features/uc04-conflicts/components/ConflictFilterBar';
import { ConflictDetailModal } from '../features/uc04-conflicts/components/ConflictDetailModal';
import { NewConflictModal } from '../features/uc04-conflicts/components/NewConflictModal';

export function ConflictsPage() {
  const [reports, setReports] = useState<ConflictReport[]>([]);
  const [stats, setStats] = useState<ConflictStats>({
    total: 0,
    submitted: 0,
    underReview: 0,
    responding: 0,
    resolved: 0,
    closed: 0,
    cropDamageCount: 0,
    elephantHumanCount: 0,
    propertyDamageCount: 0,
    livestockAttackCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ConflictStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<ConflictType | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [selectedReport, setSelectedReport] = useState<ConflictReport | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [fetchedReports, fetchedStats] = await Promise.all([
        webConflictService.fetchConflicts({
          status: statusFilter,
          conflictType: typeFilter,
          search: searchTerm,
        }).catch(() => []),
        webConflictService.fetchConflictStats().catch(() => ({
          total: 0,
          submitted: 0,
          underReview: 0,
          responding: 0,
          resolved: 0,
          closed: 0,
          cropDamageCount: 0,
          elephantHumanCount: 0,
          propertyDamageCount: 0,
          livestockAttackCount: 0,
        })),
      ]);
      setReports(fetchedReports);
      setStats(fetchedStats);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateStatus = async (
    id: string,
    status: ConflictStatus,
    triageNotes?: string,
    mitigationAction?: string,
    damageData?: {
      estimatedDamageLkr?: number;
      cropTypeLost?: string;
      compensationStatus?: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'DISBURSED';
    }
  ) => {
    await webConflictService.updateConflictStatus(id, {
      status,
      triageNotes,
      mitigationAction,
      ...damageData,
    });
    setNotification('Operational triage & damage assessment updated successfully.');
    setTimeout(() => setNotification(null), 3500);
    await loadData();
  };

  const handleCreateReport = async (dto: CreateConflictReportDTO) => {
    await webConflictService.createConflict(dto);
    setNotification('New human-wildlife conflict report recorded.');
    setTimeout(() => setNotification(null), 3500);
    await loadData();
  };

  const handleRowClick = (item: ConflictReport) => {
    setSelectedReport(item);
    setIsDetailModalOpen(true);
  };

  const columns: Column<ConflictReport>[] = [
    {
      header: 'Conflict Incident & Nature',
      accessor: (item) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[#1C2A1E] block text-sm">
              {item.conflictType.replace(/_/g, ' ')}
            </span>
            {item.potentialDuplicateOf && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                Cluster Duplicate
              </span>
            )}
            {item.mitigationAction && (
              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                Action: {item.mitigationAction.slice(0, 22)}...
              </span>
            )}
          </div>
          <span className="text-stone-500 text-xs line-clamp-1 font-medium">
            {item.description}
          </span>
        </div>
      ),
    },
    {
      header: 'Community Reporter',
      accessor: (item) => (
        <div>
          <span className="text-stone-800 block text-xs font-bold">
            {item.reporterName || 'Local Resident'}
          </span>
          <span className="text-[#A76D40] text-[11px] font-medium">
            {item.villageName || 'Buffer Zone Settlement'}
          </span>
        </div>
      ),
    },
    {
      header: 'Location & Coordinates',
      accessor: (item) => (
        <div>
          <span className="text-stone-700 text-xs font-mono flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-[#3E8E41]" />
            {Number(item.latitude).toFixed(4)}, {Number(item.longitude).toFixed(4)}
          </span>
          <span className="text-[10px] text-stone-500 font-medium block">
            {item.parkName || 'Yala Border Corridor'}
          </span>
        </div>
      ),
    },
    {
      header: 'Reported At',
      accessor: (item) => (
        <span className="text-stone-600 text-xs font-medium">
          {item.reportedAt ? new Date(item.reportedAt).toLocaleDateString() : 'Recent'}
        </span>
      ),
    },
    {
      header: 'Triage Status',
      accessor: (item) => <StatusBadge status={item.status} size="sm" />,
    },
    {
      header: 'Action',
      accessor: (item) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRowClick(item);
          }}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#FAF7EE] hover:bg-[#3E8E41] text-stone-700 hover:text-white border border-[#D1B370]/60 hover:border-[#3E8E41] rounded-xl text-xs font-bold transition-all shadow-xs"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Triage</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-[#1C2A1E] tracking-tight">
              Human-Wildlife Conflict Reports
            </h2>
            <span className="px-2 py-0.5 text-xs font-bold bg-[#D1B370]/25 text-[#735A22] border border-[#D1B370]/60 rounded">
              UC04 SHELL
            </span>
          </div>
          <p className="text-sm text-[#A76D40] font-medium mt-1">
            Community crop raiding mitigation, elephant intrusion triage, and rapid dispatch response console.
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-xs font-bold text-stone-700 hover:text-[#3E8E41] border border-[#D1B370]/60 rounded-xl transition-colors self-start sm:self-auto shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <ShieldAlert className="w-4 h-4 text-[#3E8E41]" />
          <span>{notification}</span>
        </div>
      )}

      {/* KPI Summary Cards */}
      <ConflictStatCards
        stats={stats}
        onFilterSelect={(st) => setStatusFilter(st as any)}
      />

      {/* Filter and Search Bar */}
      <ConflictFilterBar
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
      />

      {/* Data Table */}
      {loading ? (
        <LoadingState message="Fetching community conflict records..." />
      ) : (
        <DataTable
          columns={columns}
          data={reports}
          keyExtractor={(item) => item.id}
          onRowClick={handleRowClick}
          emptyMessage="No human-wildlife conflict reports match the selected filters."
        />
      )}

      {/* Detail / Triage Modal */}
      <ConflictDetailModal
        report={selectedReport}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onUpdateStatus={handleUpdateStatus}
      />

      {/* New Conflict Creation Modal */}
      <NewConflictModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateReport}
      />
    </div>
  );
}
