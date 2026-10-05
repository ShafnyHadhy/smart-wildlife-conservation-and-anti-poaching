import { useEffect, useState } from 'react';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { DataTable, Column } from '../components/common/DataTable';
import { LoadingState } from '../components/common/LoadingState';
import { apiClient } from '../services/apiClient';
import { NavPage } from '../components/layout/Sidebar';
import {
  Compass,
  AlertTriangle,
  Radio,
  Users2,
  ExternalLink,
} from 'lucide-react';
import {
  Patrol,
  WildlifeRiskAlert,
  Incident,
  ConflictReport,
} from '@wildlife/shared';

interface DashboardHomeProps {
  onNavigate: (page: NavPage) => void;
  refreshTrigger?: number;
}

export function DashboardHome({ onNavigate, refreshTrigger = 0 }: DashboardHomeProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activePatrols: 1,
    activeAlerts: 1,
    pendingIncidents: 0,
    openConflicts: 0,
  });
  const [patrols, setPatrols] = useState<Patrol[]>([]);
  const [alerts, setAlerts] = useState<WildlifeRiskAlert[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadDashboardData() {
      try {
        setLoading(true);

        const [patrolsData, alertsData, incidentsData, conflictsData] =
          await Promise.all([
            apiClient.get<Patrol[]>('/patrols').catch(() => []),
            apiClient.get<WildlifeRiskAlert[]>('/alerts').catch(() => []),
            apiClient.get<Incident[]>('/incidents').catch(() => []),
            apiClient.get<ConflictReport[]>('/conflict-reports').catch(() => []),
          ]);

        if (isMounted) {
          const activePatrolsList = patrolsData.filter((p) => p.status === 'ACTIVE');
          const activeAlertsList = alertsData.filter(
            (a) => a.status === 'ACTIVE' || a.status === 'RESPONDING'
          );

          setStats({
            activePatrols: activePatrolsList.length,
            activeAlerts: activeAlertsList.length,
            pendingIncidents: incidentsData.length,
            openConflicts: conflictsData.length,
          });

          setPatrols(patrolsData.slice(0, 5));
          setAlerts(alertsData.slice(0, 5));
          setIncidents(incidentsData.slice(0, 5));
        }
      } catch (err) {
        console.warn('[DashboardHome] Live data fetch warning:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  if (loading) {
    return <LoadingState message="Loading live headquarters operational data..." />;
  }

  const patrolColumns: Column<Patrol>[] = [
    {
      header: 'Patrol Code',
      accessor: (p) => (
        <span className="font-bold text-[#1C2A1E]">
          {(p as any).patrolCode || p.id.slice(0, 8)}
        </span>
      ),
    },
    {
      header: 'Ranger Unit',
      accessor: (p) => (
        <span className="text-stone-700">
          {(p as any).rangerName || p.rangerId?.slice(0, 8) || 'Assigned'}
        </span>
      ),
    },
    {
      header: 'Route Corridor',
      accessor: (p) => (
        <span className="text-stone-600">
          {(p as any).routeName || 'Coastal Perimeter'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (p) => <StatusBadge status={p.status} size="sm" />,
    },
  ];

  const alertColumns: Column<WildlifeRiskAlert>[] = [
    {
      header: 'Target Animal',
      accessor: (a) => (
        <div>
          <span className="font-bold text-[#1C2A1E]">
            {a.animalName || 'Elephant Walagamba'}
          </span>
          <span className="block text-[11px] text-stone-500">
            {a.animalSpecies || 'Elephas maximus'}
          </span>
        </div>
      ),
    },
    {
      header: 'Risk Severity',
      accessor: (a) => <StatusBadge status={a.severity || 'HIGH'} size="sm" />,
    },
    {
      header: 'Buffer Zone',
      accessor: (a) => (
        <span className="text-stone-700 font-medium">
          {a.zoneName || 'Kittulkote Village Settlement Zone'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (a) => <StatusBadge status={a.status} size="sm" />,
    },
  ];

  const incidentColumns: Column<Incident>[] = [
    {
      header: 'Incident',
      accessor: (inc) => (
        <span className="font-bold text-[#1C2A1E]">
          {inc.incidentType.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      header: 'Reported By',
      accessor: (inc) => (
        <span className="text-stone-700">
          {inc.rangerName || inc.rangerId?.slice(0, 8) || 'Field Ranger'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (inc) => <StatusBadge status={inc.status} size="sm" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Subtitle */}
      <div>
        <h2 className="text-2xl font-extrabold text-[#1C2A1E] tracking-tight">
          Conservation Command Overview
        </h2>
        <p className="text-sm text-[#A76D40] font-medium mt-1">
          Live monitoring of ranger patrols, wildlife telemetry alerts, and community conflict reports.
        </p>
      </div>

      {/* 4 Primary Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Patrols"
          value={stats.activePatrols}
          subtitle="Rangers currently tracking on-grid"
          variant="info"
          icon={<Compass className="w-5 h-5 text-[#3E8E41]" />}
          onClick={() => onNavigate('patrols')}
        />
        <StatCard
          title="Wildlife Alerts"
          value={stats.activeAlerts}
          subtitle="Active collar geofence intrusions"
          variant={stats.activeAlerts > 0 ? 'danger' : 'default'}
          icon={<Radio className="w-5 h-5 text-rose-600" />}
          onClick={() => onNavigate('alerts')}
        />
        <StatCard
          title="Field Incidents"
          value={stats.pendingIncidents}
          subtitle="Reported wire snares & poaching"
          variant="warning"
          icon={<AlertTriangle className="w-5 h-5 text-[#A76D40]" />}
          onClick={() => onNavigate('incidents')}
        />
        <StatCard
          title="Conflict Reports"
          value={stats.openConflicts}
          subtitle="Village & agricultural reports"
          variant="default"
          icon={<Users2 className="w-5 h-5 text-[#3E8E41]" />}
          onClick={() => onNavigate('conflicts')}
        />
      </div>

      {/* Operational Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Patrols Section */}
        <div className="bg-white border border-[#D1B370]/60 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#1C2A1E]">Active Patrol Units (UC01)</h3>
              <p className="text-xs text-stone-500">Ranger field sweeps in Yala sectors</p>
            </div>
            <button
              onClick={() => onNavigate('patrols')}
              className="text-xs font-bold text-[#3E8E41] hover:text-[#2E6B31] flex items-center gap-1"
            >
              <span>View All</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
          <DataTable
            columns={patrolColumns}
            data={patrols}
            keyExtractor={(p) => p.id}
            emptyMessage="No active patrols at this moment."
            onRowClick={() => onNavigate('patrols')}
          />
        </div>

        {/* Recent Alerts Section */}
        <div className="bg-white border border-[#D1B370]/60 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#1C2A1E]">Geofence Risk Alerts (UC03)</h3>
              <p className="text-xs text-stone-500">High-risk animal intrusions into buffer zones</p>
            </div>
            <button
              onClick={() => onNavigate('alerts')}
              className="text-xs font-bold text-[#3E8E41] hover:text-[#2E6B31] flex items-center gap-1"
            >
              <span>View All</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
          <DataTable
            columns={alertColumns}
            data={alerts}
            keyExtractor={(a) => a.id}
            emptyMessage="No open wildlife risk alerts."
            onRowClick={() => onNavigate('alerts')}
          />
        </div>

        {/* Recent Incidents Section */}
        <div className="bg-white border border-[#D1B370]/60 rounded-2xl p-5 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#1C2A1E]">Recent Field Incidents (UC02)</h3>
              <p className="text-xs text-stone-500">Wire snares, poaching sign, and carcass detections</p>
            </div>
            <button
              onClick={() => onNavigate('incidents')}
              className="text-xs font-bold text-[#3E8E41] hover:text-[#2E6B31] flex items-center gap-1"
            >
              <span>View All</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
          <DataTable
            columns={incidentColumns}
            data={incidents}
            keyExtractor={(i) => i.id}
            emptyMessage="No incidents reported recently."
            onRowClick={() => onNavigate('incidents')}
          />
        </div>
      </div>
    </div>
  );
}
