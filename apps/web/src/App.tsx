import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Compass,
  Radio,
  Users,
  Activity,
  Database,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { HealthResponse } from '@wildlife/shared';

export default function App() {
  const [activeTab, setActiveTab] = useState<'patrols' | 'incidents' | 'alerts' | 'conflicts'>('patrols');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(true);
  const [lastChecked, setLastChecked] = useState<string>('');

  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/health');
      const data: HealthResponse = await res.json();
      setHealth(data);
    } catch (err) {
      setHealth(null);
    } finally {
      setHealthLoading(false);
      setLastChecked(new Date().toLocaleTimeString());
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const getDbStatusBadge = () => {
    if (healthLoading && !health) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
          <RefreshCw className="w-3 h-3 animate-spin" /> Checking...
        </span>
      );
    }
    if (!health) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <XCircle className="w-3 h-3 text-rose-400" /> Backend Offline
        </span>
      );
    }
    if (health.database.status === 'connected') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Neon PostgreSQL Online ({health.database.latencyMs}ms)
        </span>
      );
    }
    if (health.database.status === 'unconfigured') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
          <AlertTriangle className="w-3 h-3 text-amber-400" /> Neon Unconfigured (.env)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <XCircle className="w-3 h-3 text-rose-400" /> DB Disconnected
      </span>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Operational Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">
                  Smart Wildlife Conservation & Monitoring
                </h1>
                <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                  Sri Lanka
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Department of Wildlife Conservation • Command & Control Center
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              {getDbStatusBadge()}
            </div>
            <button
              onClick={fetchHealth}
              disabled={healthLoading}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
              title="Refresh Health"
            >
              <RefreshCw className={`w-4 h-4 ${healthLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">
        {/* Navigation Tabs (UC01 - UC04) */}
        <div className="flex items-center border-b border-slate-800/80 gap-2 pb-px overflow-x-auto">
          <button
            onClick={() => setActiveTab('patrols')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'patrols'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            UC01: Ranger Patrol Monitoring
          </button>
          <button
            onClick={() => setActiveTab('incidents')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'incidents'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            UC02: Poaching & Field Incidents
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'alerts'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            UC03: Wildlife Risk Alerts
          </button>
          <button
            onClick={() => setActiveTab('conflicts')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'conflicts'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            UC04: Human-Wildlife Conflict
          </button>
        </div>

        {/* Phase 1 Foundation Status Card */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                  Phase 1 Complete
                </span>
                <h2 className="text-base font-semibold text-white">Project Infrastructure & System Shell</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Monorepo workspace initialized with Node.js Express Backend, React Tailwind Web Shell, and Expo Mobile Shell.
              </p>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Last probe: {lastChecked || 'Pending'}
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Backend API</span>
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-lg font-bold text-white mt-2">
                {health?.status === 'ok' ? 'Operational' : health ? 'Degraded' : 'Checking...'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 font-mono">Port: 5000 | v1.0.0</p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>PostgreSQL Host</span>
                <Database className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-lg font-bold text-white mt-2">Neon Cloud</p>
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                {health?.database.status === 'connected'
                  ? `Latency: ${health.database.latencyMs}ms`
                  : health?.database.status === 'unconfigured'
                  ? 'Config required'
                  : 'Disconnected'}
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Sanctuary Focus</span>
                <Compass className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-lg font-bold text-white mt-2">Yala & Wilpattu</p>
              <p className="text-[11px] text-slate-500 mt-1">Sri Lanka Southern / NW</p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Offline Sync Ready</span>
                <RefreshCw className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-lg font-bold text-white mt-2">Expo Mobile Shell</p>
              <p className="text-[11px] text-slate-500 mt-1">Pending Queue Model</p>
            </div>
          </div>
        </section>

        {/* Tab View Placeholder Shell */}
        <section className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400">
            {activeTab === 'patrols' && <Compass className="w-8 h-8 text-emerald-400" />}
            {activeTab === 'incidents' && <ShieldAlert className="w-8 h-8 text-emerald-400" />}
            {activeTab === 'alerts' && <Radio className="w-8 h-8 text-emerald-400" />}
            {activeTab === 'conflicts' && <Users className="w-8 h-8 text-emerald-400" />}
          </div>
          <h3 className="text-base font-semibold text-white">
            {activeTab === 'patrols' && 'UC01: Ranger Patrol Monitoring Workspace'}
            {activeTab === 'incidents' && 'UC02: Poaching & Wildlife Incident Triage Workspace'}
            {activeTab === 'alerts' && 'UC03: GPS Collar Risk Alert Assessment Workspace'}
            {activeTab === 'conflicts' && 'UC04: Community Conflict Incident Workspace'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md">
            This module shell is configured and ready for business feature implementation according to the 5-day implementation plan.
          </p>
        </section>
      </div>
    </div>
  );
}
