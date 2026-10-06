import { useState, type FormEvent } from 'react';
import { ConflictType, CreateConflictReportDTO } from '../types';
import { X, Wheat, AlertTriangle, Home, PlusCircle, MapPin } from 'lucide-react';

interface NewConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dto: CreateConflictReportDTO) => Promise<void>;
}

const VILLAGE_PRESETS = [
  { name: 'Kataragama Boundary (Buffer Zone)', lat: 6.418, lng: 81.341, parkId: '11111111-1111-1111-1111-111111111111' },
  { name: 'Kittulkote Village Settlement', lat: 6.355, lng: 81.335, parkId: '11111111-1111-1111-1111-111111111111' },
  { name: 'Palatupana (Yala Southern Perimeter)', lat: 6.273, lng: 81.436, parkId: '11111111-1111-1111-1111-111111111111' },
  { name: 'Lunugamvehera Agricultural Border', lat: 6.376, lng: 81.205, parkId: '11111111-1111-1111-1111-111111111111' },
  { name: 'Wilpattu Boundary (Kala Oya Village)', lat: 8.435, lng: 80.021, parkId: '22222222-2222-2222-2222-222222222222' },
];

const SEED_MEMBERS = [
  { id: 'bbbb0001-0000-0000-0000-000000000001', name: 'Gamini Senanayake (Palatupana)', village: 'Palatupana' },
  { id: 'bbbb0002-0000-0000-0000-000000000002', name: 'Kamal Gunaratne (Kataragama Boundary)', village: 'Kataragama Boundary' },
  { id: 'bbbb0003-0000-0000-0000-000000000003', name: 'Sarath Dissanayake (Kittulkote)', village: 'Kittulkote' },
];

export function NewConflictModal({ isOpen, onClose, onSubmit }: NewConflictModalProps) {
  if (!isOpen) return null;

  const [communityMemberId, setCommunityMemberId] = useState(SEED_MEMBERS[0].id);
  const [selectedVillageIndex, setSelectedVillageIndex] = useState<number>(0);
  const [conflictType, setConflictType] = useState<ConflictType>(ConflictType.CROP_DAMAGE);
  const [latitude, setLatitude] = useState<string>(VILLAGE_PRESETS[0].lat.toString());
  const [longitude, setLongitude] = useState<string>(VILLAGE_PRESETS[0].lng.toString());
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVillagePresetChange = (index: number) => {
    setSelectedVillageIndex(index);
    const preset = VILLAGE_PRESETS[index];
    if (preset) {
      setLatitude(preset.lat.toString());
      setLongitude(preset.lng.toString());
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      setError('Please provide valid decimal coordinates for latitude and longitude.');
      return;
    }

    if (!description.trim() || description.trim().length < 5) {
      setError('Please enter a descriptive account of the incident (at least 5 characters).');
      return;
    }

    try {
      setSubmitting(true);
      const preset = VILLAGE_PRESETS[selectedVillageIndex];
      await onSubmit({
        communityMemberId,
        parkId: preset?.parkId || '11111111-1111-1111-1111-111111111111',
        conflictType,
        description: description.trim(),
        latitude: lat,
        longitude: lng,
        reportedAt: new Date().toISOString(),
        clientMutationId: `web-hwc-${Date.now()}`,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit conflict report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-[#D1B370]/60 shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#FAF7EE] border-b border-[#D1B370]/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white border border-[#D1B370]/50 flex items-center justify-center text-[#3E8E41] shadow-xs">
              <PlusCircle className="w-5 h-5 text-[#3E8E41]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#1C2A1E]">
                Log Human-Wildlife Conflict Report
              </h3>
              <p className="text-xs text-[#A76D40] font-medium">
                Community Liaison walk-in & hotline triage intake
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-800 transition-colors border border-stone-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Reporter Selector */}
          <div className="space-y-1">
            <label className="font-bold text-stone-700 block">
              Reporting Community Member:
            </label>
            <select
              value={communityMemberId}
              onChange={(e) => setCommunityMemberId(e.target.value)}
              className="w-full bg-[#FAF7EE]/60 text-xs font-semibold text-stone-800 p-2.5 rounded-xl border border-[#D1B370]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3E8E41]/30 cursor-pointer"
            >
              {SEED_MEMBERS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Conflict Type Radio / Grid */}
          <div className="space-y-1.5">
            <label className="font-bold text-stone-700 block">
              Incident Nature / Category:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: ConflictType.CROP_DAMAGE, label: 'Crop Damage', icon: Wheat },
                { type: ConflictType.ELEPHANT_HUMAN_CONFLICT, label: 'Elephant Encounter', icon: AlertTriangle },
                { type: ConflictType.ANIMAL_INTRUSION, label: 'Village Intrusion', icon: AlertTriangle },
                { type: ConflictType.PROPERTY_DAMAGE, label: 'Property Damage', icon: Home },
                { type: ConflictType.LIVESTOCK_ATTACK, label: 'Livestock Attack', icon: AlertTriangle },
                { type: ConflictType.OTHER, label: 'Other Sighting', icon: AlertTriangle },
              ].map((item) => {
                const isSelected = conflictType === item.type;
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setConflictType(item.type)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left font-bold transition-all ${
                      isSelected
                        ? 'bg-[#3E8E41] text-white border-[#3E8E41] shadow-xs'
                        : 'bg-[#FAF7EE]/50 hover:bg-[#F5F5DC] text-stone-700 border-[#D1B370]/50'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sector / Village Location Preset */}
          <div className="space-y-1">
            <label className="font-bold text-stone-700 block">
              Buffer Zone Village Preset:
            </label>
            <select
              value={selectedVillageIndex}
              onChange={(e) => handleVillagePresetChange(parseInt(e.target.value, 10))}
              className="w-full bg-[#FAF7EE]/60 text-xs font-semibold text-stone-800 p-2.5 rounded-xl border border-[#D1B370]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3E8E41]/30 cursor-pointer"
            >
              {VILLAGE_PRESETS.map((vp, idx) => (
                <option key={vp.name} value={idx}>
                  {vp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Coordinate Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-stone-600 block flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#3E8E41]" />
                Latitude
              </label>
              <input
                type="number"
                step="0.000001"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full p-2 rounded-xl border border-stone-300 font-mono text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#3E8E41]/30"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-stone-600 block flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#3E8E41]" />
                Longitude
              </label>
              <input
                type="number"
                step="0.000001"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full p-2 rounded-xl border border-stone-300 font-mono text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#3E8E41]/30"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="font-bold text-stone-700 block">
              Incident Narrative & Damage Details:
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="e.g., Lone tusker entered banana plantation through broken barbed wire fence. Estimated 25 fruit trees destroyed..."
              className="w-full p-3 rounded-xl border border-stone-300 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#3E8E41]/30 font-medium placeholder:text-stone-400"
              required
            />
          </div>

          {/* Submit Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#3E8E41] hover:bg-[#347837] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {submitting ? 'Recording Report...' : 'Submit Incident Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
