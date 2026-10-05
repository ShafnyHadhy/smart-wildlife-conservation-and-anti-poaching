import { MapPin, RefreshCw, Activity } from 'lucide-react';

interface TopBarProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function TopBar({ onRefresh, isRefreshing = false }: TopBarProps) {
  return (
    <header className="h-16 px-6 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur flex items-center justify-between shrink-0">
      {/* Active Park Indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <MapPin className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-semibold text-white">Yala National Park</span>
          <span className="text-slate-400">• Sector 1</span>
        </div>
      </div>

      {/* System Status and Actions */}
      <div className="flex items-center gap-4">
        {/* Backend & DB Pulse */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs font-semibold">
          <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
          <span>Neon PostgreSQL Online</span>
        </div>

        {/* Refresh Action */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition-colors duration-150 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        )}
      </div>
    </header>
  );
}
