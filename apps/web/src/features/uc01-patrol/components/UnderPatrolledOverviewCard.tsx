import { AlertTriangle, CheckCircle2, Clock, MapPin, WifiOff } from 'lucide-react';
import {
  UnderPatrolledSummary,
  UNDER_PATROL_COVERAGE_THRESHOLD,
  LOW_PROGRESS_THRESHOLD,
} from '../utils/underPatrolledOverview';

interface UnderPatrolledOverviewCardProps {
  summary: UnderPatrolledSummary;
}

export function UnderPatrolledOverviewCard({ summary }: UnderPatrolledOverviewCardProps) {
  const { attentionCount, attentionPatrols, totalActive } = summary;

  // Reassuring positive state when all patrols are healthy or no active patrols need attention
  if (attentionCount === 0) {
    return (
      <div className="p-4 bg-[#F8FAF7] border border-emerald-300/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-all duration-200">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-100/70 border border-emerald-300/60 rounded-xl text-emerald-700 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1C2A1E]">
              All monitored patrols are currently on track.
            </h3>
            <p className="text-xs text-stone-600 mt-0.5">
              {totalActive > 0
                ? `All ${totalActive} active ranger ${
                    totalActive === 1 ? 'patrol meets' : 'patrols meet'
                  } coverage standards (≥ ${UNDER_PATROL_COVERAGE_THRESHOLD}%), maintain steady progress, and have fresh GPS telemetry.`
                : 'No active ranger patrols currently require attention or under-patrolled intervention.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full whitespace-nowrap">
            Optimal Operational Status
          </span>
        </div>
      </div>
    );
  }

  // Attention required overview
  return (
    <div className="p-4 bg-[#FFFDF7] border border-amber-300/80 rounded-2xl space-y-3.5 shadow-xs transition-all duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-100 border border-amber-300 rounded-lg text-amber-700">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#1C2A1E]">
                Under-Patrolled &amp; Operational Attention
              </h3>
              <span className="px-2 py-0.5 text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 rounded-full">
                {attentionCount} {attentionCount === 1 ? 'Patrol' : 'Patrols'}
              </span>
            </div>
            <p className="text-[11px] text-stone-600 mt-0.5">
              Corridors below {UNDER_PATROL_COVERAGE_THRESHOLD}% coverage, progress under{' '}
              {LOW_PROGRESS_THRESHOLD}%, or stale ranger telemetry requiring supervisor review.
            </p>
          </div>
        </div>
      </div>

      {/* Affected Patrols Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {attentionPatrols.map((patrol) => (
          <div
            key={patrol.patrolId}
            className="p-3 bg-white border border-amber-200/90 rounded-xl space-y-2 hover:border-amber-400 transition-colors duration-150"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-xs text-[#1C2A1E] font-mono">
                {patrol.patrolCode}
              </span>
              <span className="text-xs font-medium text-stone-700">
                {patrol.rangerName}
              </span>
            </div>

            <p className="text-[11px] text-stone-500 truncate" title={patrol.routeName}>
              {patrol.routeName}
            </p>

            {/* Attention Reasons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-stone-100">
              {patrol.reasons.map((reason) => {
                if (reason === 'Low coverage') {
                  return (
                    <span
                      key={reason}
                      className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200"
                    >
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                      Low Coverage ({patrol.coverage}%)
                    </span>
                  );
                }
                if (reason === 'Low progress') {
                  return (
                    <span
                      key={reason}
                      className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-200"
                    >
                      <Clock className="w-2.5 h-2.5 text-orange-600" />
                      Low Progress ({patrol.progress}%)
                    </span>
                  );
                }
                if (reason === 'Stale location') {
                  return (
                    <span
                      key={reason}
                      className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200"
                      title={patrol.locationLabel}
                    >
                      <Clock className="w-2.5 h-2.5 text-amber-600" />
                      Stale Location
                    </span>
                  );
                }
                if (reason === 'Location unavailable') {
                  return (
                    <span
                      key={reason}
                      className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200"
                    >
                      <WifiOff className="w-2.5 h-2.5 text-rose-600" />
                      Location Unavailable
                    </span>
                  );
                }
                return (
                  <span
                    key={reason}
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-700"
                  >
                    <MapPin className="w-2.5 h-2.5" />
                    {reason}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
