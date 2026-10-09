import { WildlifeAnimal } from '../types';
import { Radio, Battery, Activity } from 'lucide-react';

interface CollarFleetCardsProps {
  animals: WildlifeAnimal[];
  loading?: boolean;
  onSimulateForAnimal?: (animal: WildlifeAnimal) => void;
}

function getBatteryDisplay(percentage?: number) {
  if (percentage === undefined || percentage === null) {
    return { label: 'N/A', color: 'text-stone-400 bg-stone-100', dot: 'bg-stone-400' };
  }
  if (percentage > 50) {
    return { label: `${percentage}% Healthy`, color: 'text-[#2E6B31] bg-[#3E8E41]/15 border-[#3E8E41]/40', dot: 'bg-[#3E8E41]' };
  }
  if (percentage >= 20) {
    return { label: `${percentage}% Medium`, color: 'text-[#854F26] bg-[#A76D40]/15 border-[#A76D40]/40', dot: 'bg-[#A76D40]' };
  }
  return { label: `${percentage}% Low`, color: 'text-rose-800 bg-rose-50 border-rose-300', dot: 'bg-rose-600' };
}

function formatLastSignal(timestamp?: string): string {
  if (!timestamp) return 'No transmission recorded';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function CollarFleetCards({
  animals,
  loading = false,
  onSimulateForAnimal,
}: CollarFleetCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="p-4 bg-white border border-[#D1B370]/40 rounded-xl animate-pulse space-y-3"
          >
            <div className="h-4 bg-[#F5F5DC] rounded w-3/4" />
            <div className="h-3 bg-[#F5F5DC] rounded w-1/2" />
            <div className="h-6 bg-[#F5F5DC] rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (animals.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#A76D40] flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-[#3E8E41]" />
          Active Collar Fleet & Telemetry Monitored Animals
        </h3>
        <span className="text-xs text-stone-500 font-medium">
          {animals.filter((a) => a.activeCollar?.isActive).length} / {animals.length} collars online
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {animals.map((animal) => {
          const collar = animal.activeCollar;
          const battery = getBatteryDisplay(collar?.batteryPercentage);
          const isCollarActive = Boolean(collar?.isActive);

          return (
            <div
              key={animal.id}
              className="p-4 bg-white border border-[#D1B370]/60 rounded-xl shadow-2xs hover:shadow-xs transition-all duration-150 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-stone-900 text-sm leading-tight">
                      {animal.name}
                    </h4>
                    <p className="text-xs text-[#A76D40] font-medium mt-0.5">
                      {animal.species}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      isCollarActive
                        ? 'bg-[#3E8E41]/10 text-[#2E6B31] border-[#3E8E41]/30'
                        : 'bg-stone-100 text-stone-600 border-stone-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isCollarActive ? 'bg-[#3E8E41]' : 'bg-stone-400'
                      }`}
                    />
                    {isCollarActive ? 'Active' : 'No Collar'}
                  </span>
                </div>

                <div className="mt-3.5 pt-3 border-t border-[#D1B370]/30 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-stone-600 font-medium">
                    <span className="flex items-center gap-1.5 text-stone-500">
                      <Radio className="w-3.5 h-3.5 text-stone-400" />
                      Collar Code:
                    </span>
                    <span className="font-mono font-bold text-stone-800">
                      {collar?.collarCode || 'Unassigned'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-stone-600 font-medium">
                    <span className="flex items-center gap-1.5 text-stone-500">
                      <Battery className="w-3.5 h-3.5 text-stone-400" />
                      Battery:
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-bold ${battery.color}`}
                    >
                      <span className={`w-1 h-1 rounded-full ${battery.dot}`} />
                      {battery.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-stone-600 font-medium">
                    <span className="flex items-center gap-1.5 text-stone-500">
                      <Activity className="w-3.5 h-3.5 text-stone-400" />
                      Last Signal:
                    </span>
                    <span className="text-stone-700">
                      {formatLastSignal(collar?.lastTransmissionAt)}
                    </span>
                  </div>
                </div>
              </div>

              {onSimulateForAnimal && isCollarActive && (
                <div className="mt-3 pt-2.5 border-t border-[#D1B370]/30 flex justify-end">
                  <button
                    onClick={() => onSimulateForAnimal(animal)}
                    className="text-xs font-bold text-[#3E8E41] hover:text-[#2E6B31] hover:underline"
                  >
                    Simulate Ping &rarr;
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
