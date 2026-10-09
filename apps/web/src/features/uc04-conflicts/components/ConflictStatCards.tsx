import { ConflictStats } from '../types';
import { AlertTriangle, Clock, Radio, CheckCircle2, Wheat, Home } from 'lucide-react';

interface ConflictStatCardsProps {
  stats: ConflictStats;
  onFilterSelect?: (status: string) => void;
}

export function ConflictStatCards({ stats, onFilterSelect }: ConflictStatCardsProps) {
  const safeStats = {
    total: stats?.total ?? 0,
    submitted: stats?.submitted ?? 0,
    underReview: stats?.underReview ?? 0,
    responding: stats?.responding ?? 0,
    resolved: stats?.resolved ?? 0,
    closed: stats?.closed ?? 0,
    cropDamageCount: stats?.cropDamageCount ?? 0,
    propertyDamageCount: stats?.propertyDamageCount ?? 0,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Incidents */}
      <div
        onClick={() => onFilterSelect?.('ALL')}
        className="cursor-pointer bg-white p-5 rounded-2xl border border-[#D1B370]/50 shadow-xs hover:border-[#3E8E41] hover:shadow-md transition-all duration-200 group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Total Conflict Reports
          </span>
          <div className="w-10 h-10 rounded-xl bg-[#FAF7EE] border border-[#D1B370]/50 flex items-center justify-center text-[#A76D40] group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-5 h-5 text-[#A76D40]" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-[#1C2A1E] tracking-tight">
            {safeStats.total}
          </span>
          <span className="text-xs font-medium text-stone-500">
            all recorded encounters
          </span>
        </div>
        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
          <span className="flex items-center gap-1 font-medium">
            <Wheat className="w-3.5 h-3.5 text-[#3E8E41]" />
            {safeStats.cropDamageCount} Crop Raids
          </span>
          <span className="flex items-center gap-1 font-medium">
            <Home className="w-3.5 h-3.5 text-[#A76D40]" />
            {safeStats.propertyDamageCount} Property
          </span>
        </div>
      </div>

      {/* 2. Pending Triage / Under Review */}
      <div
        onClick={() => onFilterSelect?.('UNDER_REVIEW')}
        className="cursor-pointer bg-white p-5 rounded-2xl border border-amber-200/80 shadow-xs hover:border-amber-400 hover:shadow-md transition-all duration-200 group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
            Awaiting Officer Triage
          </span>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-amber-700 tracking-tight">
            {safeStats.submitted + safeStats.underReview}
          </span>
          <span className="text-xs font-medium text-amber-600">
            {safeStats.submitted} new, {safeStats.underReview} reviewing
          </span>
        </div>
        <div className="mt-3 pt-3 border-t border-amber-100/80 flex items-center gap-1.5 text-xs text-amber-700 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Requires immediate severity verification
        </div>
      </div>

      {/* 3. Dispatched / Responding */}
      <div
        onClick={() => onFilterSelect?.('RESPONDING')}
        className="cursor-pointer bg-white p-5 rounded-2xl border border-blue-200/80 shadow-xs hover:border-blue-400 hover:shadow-md transition-all duration-200 group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
            Active Rapid Response
          </span>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
            <Radio className="w-5 h-5 text-blue-600 animate-pulse" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-blue-700 tracking-tight">
            {safeStats.responding}
          </span>
          <span className="text-xs font-medium text-blue-600">
            field teams on-scene
          </span>
        </div>
        <div className="mt-3 pt-3 border-t border-blue-100 flex items-center gap-1.5 text-xs text-blue-700 font-medium">
          Elephant Chaser & fence teams deployed
        </div>
      </div>

      {/* 4. Resolved & Mitigated */}
      <div
        onClick={() => onFilterSelect?.('RESOLVED')}
        className="cursor-pointer bg-white p-5 rounded-2xl border border-emerald-200/80 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all duration-200 group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Mitigated & Resolved
          </span>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-5 h-5 text-[#3E8E41]" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-emerald-700 tracking-tight">
            {safeStats.resolved + safeStats.closed}
          </span>
          <span className="text-xs font-medium text-emerald-600">
            {safeStats.resolved} resolved, {safeStats.closed} closed
          </span>
        </div>
        <div className="mt-3 pt-3 border-t border-emerald-100 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
          Deterrent successful / Claims completed
        </div>
      </div>
    </div>
  );
}
