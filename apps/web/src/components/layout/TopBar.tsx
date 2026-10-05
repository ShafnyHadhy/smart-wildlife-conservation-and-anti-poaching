import { MapPin, RefreshCw, Activity } from 'lucide-react';

interface TopBarProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function TopBar({ onRefresh, isRefreshing = false }: TopBarProps) {
  return (
    <header className="h-16 px-6 border-b border-[#D1B370]/60 bg-[#FAF7EE] flex items-center justify-between shrink-0 shadow-sm">
      {/* Active Park Indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F5F5DC] border border-[#D1B370]/60 text-xs text-stone-800">
          <MapPin className="w-3.5 h-3.5 text-[#3E8E41]" />
          <span className="font-bold text-stone-900">Yala National Park</span>
          <span className="text-[#A76D40] font-medium">• Sector 1</span>
        </div>
      </div>

      {/* System Status and Actions */}
      <div className="flex items-center gap-4">
        {/* Backend & DB Pulse */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#3E8E41]/15 border border-[#3E8E41]/30 text-[#2E6B31] text-xs font-bold">
          <Activity className="w-3.5 h-3.5 animate-pulse text-[#3E8E41]" />
          <span>Neon PostgreSQL Online</span>
        </div>

        {/* Refresh Action */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F5F5DC] text-stone-700 text-xs font-bold border border-[#D1B370]/60 transition-colors duration-150 disabled:opacity-50 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#A76D40] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        )}
      </div>
    </header>
  );
}
