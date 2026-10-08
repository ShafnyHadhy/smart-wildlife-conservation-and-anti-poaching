import { useState } from 'react';
import {
  WildlifeAnimal,
  SimulatePingResponse,
} from '../types';
import { webAlertService } from '../services/alertService';
import { StatusBadge } from '../../../components/common/StatusBadge';
import {
  X,
  Radio,
  Send,
  AlertTriangle,
  CheckCircle2,
  Info,
  MapPin,
  RefreshCw,
} from 'lucide-react';

interface SimulateTelemetryModalProps {
  animals: WildlifeAnimal[];
  initialSelectedAnimalId?: string;
  onClose: () => void;
  onSimulationSuccess?: () => void;
}

const PRESET_LOCATIONS = [
  {
    name: 'Safe Sanctuary Interior',
    zone: 'None (Safe Zone)',
    severity: 'NONE',
    latitude: 6.375,
    longitude: 81.52,
    description: 'Deep within sanctuary reserve; safely away from human perimeter.',
  },
  {
    name: 'Kataragama Buffer',
    zone: 'Agricultural Buffer Zone',
    severity: 'HIGH',
    latitude: 6.418,
    longitude: 81.34,
    description: 'Adjoining sugarcane farmland; high crop-raiding conflict risk.',
  },
  {
    name: 'Kittulkote Settlement',
    zone: 'Village Settlement Zone',
    severity: 'CRITICAL',
    latitude: 6.355,
    longitude: 81.335,
    description: 'Dense residential border with village school; critical threat level.',
  },
];

export function SimulateTelemetryModal({
  animals,
  initialSelectedAnimalId,
  onClose,
  onSimulationSuccess,
}: SimulateTelemetryModalProps) {
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>(
    initialSelectedAnimalId || (animals[0]?.id || '')
  );
  const [latitude, setLatitude] = useState<string>('6.3550');
  const [longitude, setLongitude] = useState<string>('81.3350');
  const [recordedAt, setRecordedAt] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<SimulatePingResponse | null>(null);

  const selectedAnimal = animals.find((a) => a.id === selectedAnimalId);

  const handleApplyPreset = (preset: typeof PRESET_LOCATIONS[0]) => {
    setLatitude(preset.latitude.toString());
    setLongitude(preset.longitude.toString());
    setErrorMessage(null);
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnimalId) {
      setErrorMessage('Please select a tracked animal.');
      return;
    }

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setErrorMessage('Latitude must be a valid number between -90 and 90.');
      return;
    }
    if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
      setErrorMessage('Longitude must be a valid number between -180 and 180.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);
      setResult(null);

      const response = await webAlertService.simulatePing(selectedAnimalId, {
        latitude: latNum,
        longitude: lonNum,
        recordedAt: recordedAt.trim() || undefined,
      });

      setResult(response);
      onSimulationSuccess?.();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to transmit simulated telemetry ping');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-[#D1B370]/70 shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-[#D1B370]/40 flex items-start justify-between bg-[#FAF7EE]/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#3E8E41]/15 text-[#2E6B31] border border-[#3E8E41]/30">
              <Radio className="w-5 h-5 text-[#3E8E41]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-[#1C2A1E]">
                  Simulate GPS Telemetry Ping
                </h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#A76D40]/20 text-[#854F26] border border-[#A76D40]/40 font-mono">
                  DEMO ONLY
                </span>
              </div>
              <p className="text-xs text-[#A76D40] font-medium mt-0.5">
                Transmit synthetic GPS collar coordinates through the real backend ingestion pipeline.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSimulate} className="space-y-4">
            {/* Animal Selection */}
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Select Tracked Subject Animal *
              </label>
              <select
                value={selectedAnimalId}
                onChange={(e) => setSelectedAnimalId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#D1B370]/60 bg-white font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#3E8E41]/30"
              >
                {animals.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.species}) — Collar: {a.activeCollar?.collarCode || 'No Collar'}
                  </option>
                ))}
              </select>
              {selectedAnimal && !selectedAnimal.activeCollar?.isActive && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">
                  ⚠️ Notice: Selected animal does not have an active collar. Ping will be rejected by backend rules.
                </p>
              )}
            </div>

            {/* Quick Presets */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A76D40] mb-1.5">
                Demo Coordinate Presets
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PRESET_LOCATIONS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="p-2.5 rounded-xl border border-[#D1B370]/50 bg-[#FAF7EE] hover:bg-[#F5F5DC] text-left transition-colors duration-150 flex flex-col justify-between"
                  >
                    <div>
                      <div className="text-[11px] font-extrabold text-[#1C2A1E]">
                        {preset.name}
                      </div>
                      <div className="text-[10px] text-stone-500 font-mono mt-0.5">
                        {preset.latitude}, {preset.longitude}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                          preset.severity === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : preset.severity === 'HIGH'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {preset.severity}
                      </span>
                      <span className="text-[10px] font-bold text-[#3E8E41]">Apply</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Coordinates Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Latitude *
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="number"
                    step="any"
                    required
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="e.g. 6.3550"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl border border-[#D1B370]/60 bg-white focus:outline-none focus:ring-2 focus:ring-[#3E8E41]/30 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Longitude *
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="number"
                    step="any"
                    required
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="e.g. 81.3350"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl border border-[#D1B370]/60 bg-white focus:outline-none focus:ring-2 focus:ring-[#3E8E41]/30 font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Optional RecordedAt */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Timestamp (Optional ISO date, defaults to current time)
              </label>
              <input
                type="text"
                value={recordedAt}
                onChange={(e) => setRecordedAt(e.target.value)}
                placeholder={new Date().toISOString()}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-[#D1B370]/60 bg-white focus:outline-none focus:ring-2 focus:ring-[#3E8E41]/30"
              />
            </div>

            {/* Submit button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 text-xs font-extrabold text-white bg-[#3E8E41] hover:bg-[#347837] rounded-xl shadow-xs transition-colors duration-150 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Transmitting Telemetry Ping...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Transmit Simulated Ping
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Results Display */}
          {result && (
            <div className="mt-4 p-4 border rounded-xl space-y-3 bg-[#FAF7EE] border-[#D1B370]/60 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-xs font-bold text-[#2E6B31]">
                <CheckCircle2 className="w-4 h-4 text-[#3E8E41]" />
                Telemetry Transmitted Successfully
              </div>

              <div className="p-3 bg-white rounded-lg border border-[#D1B370]/40 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Location ID:</span>
                  <span className="font-mono text-stone-800">{result.location.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Coordinates:</span>
                  <span className="font-mono font-bold text-stone-800">
                    {result.location.latitude.toFixed(4)}, {result.location.longitude.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Simulated Flag:</span>
                  <span className="font-bold text-blue-700">true</span>
                </div>
              </div>

              {/* Alert generated vs Duplicate suppressed vs Outside zones */}
              {result.alert ? (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Geofence Breach Detected!
                    </span>
                    <StatusBadge status={result.alert.severity} size="sm" />
                  </div>
                  <p className="text-rose-800 leading-relaxed font-medium">
                    {result.alert.notes || 'Automated risk alert generated and queued for ranger dispatch.'}
                  </p>
                  <div className="text-[11px] text-stone-600 font-mono">
                    Alert ID: {result.alert.id} | Status: {result.alert.status}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs space-y-1 text-stone-700">
                  <div className="font-bold flex items-center gap-1.5 text-stone-800">
                    <Info className="w-4 h-4 text-[#A76D40]" />
                    No New Alert Created
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Either the animal is located in the safe sanctuary interior (outside high-risk zones),
                    or an active alert already exists for this animal in this zone (duplicate alert suppressed under UC03 deduplication rules).
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#D1B370]/40 bg-[#FAF7EE]/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-stone-700 bg-white border border-[#D1B370]/60 hover:bg-[#F5F5DC] rounded-xl shadow-2xs"
          >
            Close Simulator
          </button>
        </div>
      </div>
    </div>
  );
}
