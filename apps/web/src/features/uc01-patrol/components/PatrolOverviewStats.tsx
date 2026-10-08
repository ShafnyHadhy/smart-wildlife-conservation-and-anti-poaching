import { Compass, CheckCircle2, Target, AlertTriangle } from 'lucide-react';
import { PatrolOverviewStatistics } from '../utils/patrolStatistics';

interface PatrolOverviewStatsProps {
  stats: PatrolOverviewStatistics;
}

export function PatrolOverviewStats({ stats }: PatrolOverviewStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Active Patrols */}
      <div className="bg-white p-5 rounded-2xl border border-[#D1B370]/50 shadow-xs hover:border-[#3E8E41] hover:shadow-md transition-all duration-200 group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Active Patrols
          </span>
          <div className="w-10 h-10 rounded-xl bg-[#FAF7EE] border border-[#D1B370]/50 flex items-center justify-center text-[#3E8E41] group-hover:scale-110 transition-transform">
            <Compass className="w-5 h-5 text-[#3E8E41]" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-[#1C2A1E] tracking-tight">
            {stats.activeCount}
          </span>
          <span className="text-xs font-medium text-stone-500">
            rangers in the field
          </span>
        </div>
        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
          {stats.activeCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 font-bold text-xs text-[#2E6B31]">
              <span className="w-2 h-2 rounded-full bg-[#3E8E41] animate-pulse" />
              Live Monitoring Active
            </span>
          ) : (
            <span className="text-stone-400 font-medium">No rangers currently deployed</span>
          )}
        </div>
      </div>

      {/* 2. Completed Today */}
      <div className="bg-white p-5 rounded-2xl border border-[#D1B370]/50 shadow-xs hover:border-[#3E8E41] hover:shadow-md transition-all duration-200 group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Completed Today
          </span>
          <div className="w-10 h-10 rounded-xl bg-[#FAF7EE] border border-[#D1B370]/50 flex items-center justify-center text-[#3E8E41] group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-5 h-5 text-[#3E8E41]" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-[#1C2A1E] tracking-tight">
            {stats.completedTodayCount}
          </span>
          <span className="text-xs font-medium text-stone-500">
            shifts finished today
          </span>
        </div>
        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 font-medium">
          <span>Calendar day count</span>
          <span className="font-mono text-[11px] text-stone-400">00:00 - 23:59 UTC</span>
        </div>
      </div>

      {/* 3. Average Coverage */}
      <div className="bg-white p-5 rounded-2xl border border-[#D1B370]/50 shadow-xs hover:border-[#A76D40] hover:shadow-md transition-all duration-200 group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Average Coverage
          </span>
          <div className="w-10 h-10 rounded-xl bg-[#FAF7EE] border border-[#D1B370]/50 flex items-center justify-center text-[#A76D40] group-hover:scale-110 transition-transform">
            <Target className="w-5 h-5 text-[#A76D40]" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-[#1C2A1E] tracking-tight font-mono">
            {stats.averageCoverageFormatted}
          </span>
          <span className="text-xs font-medium text-stone-500">
            across designated routes
          </span>
        </div>
        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 font-medium">
          <span>Corridors with data</span>
          <span className="font-bold text-stone-700">
            {stats.validCoveragePatrolsCount} Evaluated
          </span>
        </div>
      </div>

      {/* 4. Under-Patrolled */}
      <div
        className={`bg-white p-5 rounded-2xl border shadow-xs transition-all duration-200 group ${
          stats.underPatrolledCount > 0
            ? 'border-amber-300/90 hover:border-amber-400 hover:shadow-md'
            : 'border-[#D1B370]/50 hover:border-[#3E8E41] hover:shadow-md'
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-bold uppercase tracking-wider ${
              stats.underPatrolledCount > 0 ? 'text-amber-800' : 'text-stone-500'
            }`}
          >
            Under-Patrolled
          </span>
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center group-hover:scale-110 transition-transform ${
              stats.underPatrolledCount > 0
                ? 'bg-amber-50 border-amber-200 text-amber-600'
                : 'bg-[#FAF7EE] border-[#D1B370]/50 text-stone-400'
            }`}
          >
            <AlertTriangle
              className={`w-5 h-5 ${
                stats.underPatrolledCount > 0 ? 'text-amber-600' : 'text-stone-400'
              }`}
            />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span
            className={`text-3xl font-extrabold tracking-tight ${
              stats.underPatrolledCount > 0 ? 'text-amber-700' : 'text-[#1C2A1E]'
            }`}
          >
            {stats.underPatrolledCount}
          </span>
          <span className="text-xs font-medium text-stone-500">
            requiring attention
          </span>
        </div>
        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
          {stats.underPatrolledCount > 0 ? (
            <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[11px]">
              &lt; 70% Route Threshold
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px]">
              All Corridors Covered
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
