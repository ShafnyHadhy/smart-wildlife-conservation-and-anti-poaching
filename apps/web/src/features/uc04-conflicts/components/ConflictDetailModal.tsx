import { useState } from 'react';
import { ConflictReport, ConflictStatus } from '../types';
import { StatusBadge } from '../../../components/common/StatusBadge';
import {
  X,
  MapPin,
  User,
  Phone,
  Calendar,
  AlertTriangle,
  Radio,
  CheckCircle2,
  FileText,
  ShieldAlert,
  Copy,
  Check,
  Camera,
  Maximize2,
} from 'lucide-react';

interface ConflictDetailModalProps {
  report: ConflictReport | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (
    id: string,
    status: ConflictStatus,
    triageNotes?: string,
    mitigationAction?: string,
    damageData?: {
      estimatedDamageLkr?: number;
      cropTypeLost?: string;
      compensationStatus?: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'DISBURSED';
    }
  ) => Promise<void>;
}

const MITIGATION_PRESETS = [
  'Deploy Acoustic Thunder Flashes (Elephant Deterrent)',
  'Dispatch Elephant Chaser Unit (ECU)',
  'Inspect & Repair Solar Electric Fence Line',
  'Agricultural Crop Compensation Survey & Assessment',
  'Reinforce Buffer Trench & Boundary Patrol Sweep',
  'Coordinate Rapid Response Vehicle Escort',
  'Provide Community Flare Kit to Village Head',
  'Other / Custom Action',
];

export function ConflictDetailModal({
  report,
  isOpen,
  onClose,
  onUpdateStatus,
}: ConflictDetailModalProps) {
  if (!isOpen || !report) return null;

  const [selectedStatus, setSelectedStatus] = useState<ConflictStatus>(report.status);
  const [mitigationAction, setMitigationAction] = useState<string>(
    report.mitigationAction || MITIGATION_PRESETS[0]
  );
  const [triageNotes, setTriageNotes] = useState<string>(report.triageNotes || '');
  const [estimatedDamageLkr, setEstimatedDamageLkr] = useState<string>(
    report.estimatedDamageLkr !== undefined ? report.estimatedDamageLkr.toString() : ''
  );
  const [cropTypeLost, setCropTypeLost] = useState<string>(report.cropTypeLost || '');
  const [compensationStatus, setCompensationStatus] = useState<
    'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'DISBURSED'
  >(report.compensationStatus || 'PENDING_REVIEW');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${report.latitude}, ${report.longitude}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const parsedLkr = estimatedDamageLkr.trim() ? parseFloat(estimatedDamageLkr) : undefined;
      await onUpdateStatus(
        report.id,
        selectedStatus,
        triageNotes,
        mitigationAction,
        {
          estimatedDamageLkr: !isNaN(parsedLkr as number) ? parsedLkr : undefined,
          cropTypeLost: cropTypeLost.trim() || undefined,
          compensationStatus,
        }
      );
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const isDuplicate = !!report.potentialDuplicateOf;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-[#D1B370]/60 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#FAF7EE] border-b border-[#D1B370]/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#D1B370]/50 flex items-center justify-center text-[#3E8E41] shadow-xs">
              <ShieldAlert className="w-5 h-5 text-[#3E8E41]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-[#1C2A1E]">
                  {report.conflictType.replace(/_/g, ' ')}
                </h3>
                <StatusBadge status={report.status} size="sm" />
              </div>
              <p className="text-xs text-[#A76D40] font-medium">
                Report ID: <span className="font-mono">{report.id.slice(0, 8)}...</span> • {report.parkName || 'National Park'}
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

        {/* Modal Scrollable Body */}
        <div className="px-6 py-5 overflow-y-auto space-y-5 text-xs text-stone-700">
          {/* Intelligent Duplicate Warning Alert */}
          {isDuplicate && (
            <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-amber-900 block text-xs">
                  Intelligent Duplicate Cluster Detected
                </span>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Another conflict report was lodged within a <strong>1.5 km radius</strong> within the last 6 hours
                  {report.distanceToDuplicateKm !== undefined && (
                    <span> (approx. <strong>{report.distanceToDuplicateKm} km</strong> away)</span>
                  )}.
                  Related incident reference: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-amber-900">{report.potentialDuplicateOf}</code>.
                </p>
              </div>
            </div>
          )}

          {/* Reporter & Location Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Community Reporter Card */}
            <div className="p-3.5 bg-[#FAF7EE] border border-[#D1B370]/40 rounded-xl space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A76D40] block">
                Community Reporter
              </span>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#3E8E41]" />
                <span className="font-bold text-sm text-[#1C2A1E]">
                  {report.reporterName || 'Local Resident'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-stone-600">
                <Phone className="w-3.5 h-3.5 text-stone-400" />
                <span>{report.reporterPhone || '+94 77 000 0000'}</span>
              </div>
              <div className="flex items-center gap-2 text-stone-600">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                <span className="font-medium text-[#A76D40]">{report.villageName || 'Buffer Zone Village'}</span>
              </div>
            </div>

            {/* GPS Occurrence Card */}
            <div className="p-3.5 bg-[#FAF7EE] border border-[#D1B370]/40 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A76D40] block">
                  Spatial Coordinates
                </span>
                <button
                  onClick={handleCopyCoords}
                  className="flex items-center gap-1 text-[11px] text-[#3E8E41] hover:underline font-bold"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="font-mono text-xs font-bold text-stone-800 bg-white px-2.5 py-1.5 rounded-lg border border-stone-200">
                Lat: {Number(report.latitude).toFixed(6)}, Lng: {Number(report.longitude).toFixed(6)}
              </div>
              <div className="flex items-center gap-2 text-stone-500 text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <span>
                  Reported: {report.reportedAt ? new Date(report.reportedAt).toLocaleString() : 'Recent'}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Narrative Description */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#3E8E41]" />
              Factual Incident Description
            </span>
            <div className="p-4 bg-white border border-stone-200 rounded-xl text-stone-800 leading-relaxed font-medium">
              {report.description}
            </div>
          </div>

          {/* Photographic Evidence Section */}
          {report.photoUrls && report.photoUrls.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#3E8E41]" />
                Photographic Evidence ({report.photoUrls.length})
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-[#FAF7EE] border border-[#D1B370]/50 rounded-2xl">
                {report.photoUrls.map((url, idx) => (
                  <div
                    key={idx}
                    onClick={() => setPreviewImage(url)}
                    className="group relative aspect-4/3 rounded-xl overflow-hidden border border-[#D1B370]/60 bg-stone-100 cursor-pointer shadow-xs hover:shadow-md transition-all"
                  >
                    <img
                      src={url}
                      alt={`Evidence ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                      <Maximize2 className="w-4 h-4" />
                      <span>View Full Image</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Damage Assessment & Compensation Form (UC04) */}
          <div className="p-4 bg-[#FAF7EE] border border-[#D1B370]/70 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🌾</span>
                <h4 className="font-extrabold text-[#1C2A1E] text-xs uppercase tracking-wider">
                  Damage Assessment & Village Compensation
                </h4>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  compensationStatus === 'APPROVED' || compensationStatus === 'DISBURSED'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : compensationStatus === 'REJECTED'
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                {compensationStatus.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Estimated Damage LKR */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-600 block">
                  Est. Damage (LKR):
                </label>
                <input
                  type="number"
                  value={estimatedDamageLkr}
                  onChange={(e) => setEstimatedDamageLkr(e.target.value)}
                  placeholder="e.g. 75000"
                  className="w-full bg-white text-xs p-2 rounded-xl border border-stone-300 font-semibold focus:outline-none focus:ring-2 focus:ring-[#3E8E41]/30 text-stone-800"
                />
              </div>

              {/* Crop Type Lost */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-600 block">
                  Crop Type Lost:
                </label>
                <select
                  value={cropTypeLost}
                  onChange={(e) => setCropTypeLost(e.target.value)}
                  className="w-full bg-white text-xs p-2 rounded-xl border border-stone-300 font-semibold focus:outline-none focus:ring-2 focus:ring-[#3E8E41]/30 text-stone-800 cursor-pointer"
                >
                  <option value="">None / Not Applicable</option>
                  <option value="Paddy (Rice)">Paddy (Rice)</option>
                  <option value="Banana / Plantain">Banana / Plantain</option>
                  <option value="Sugarcane">Sugarcane</option>
                  <option value="Coconut">Coconut</option>
                  <option value="Vegetables / Home Garden">Vegetables / Home Garden</option>
                  <option value="Fencing / Farm Shed">Fencing / Farm Shed</option>
                  <option value="Domestic Livestock">Domestic Livestock</option>
                </select>
              </div>

              {/* Compensation Review Status */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-600 block">
                  Compensation Review:
                </label>
                <select
                  value={compensationStatus}
                  onChange={(e) => setCompensationStatus(e.target.value as any)}
                  className="w-full bg-white text-xs p-2 rounded-xl border border-stone-300 font-semibold focus:outline-none focus:ring-2 focus:ring-[#3E8E41]/30 text-stone-800 cursor-pointer"
                >
                  <option value="PENDING_REVIEW">Pending Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="DISBURSED">Disbursed</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          {/* Operational Triage Workflow Section */}
          <div className="p-4 bg-[#FAF7EE] border border-[#D1B370]/70 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#3E8E41]" />
              <h4 className="font-extrabold text-[#1C2A1E] text-xs uppercase tracking-wider">
                Liaison Officer Operational Triage & Actions
              </h4>
            </div>

            {/* Status Transition Pills */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-600 block">
                Update Operational Status:
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: ConflictStatus.SUBMITTED, label: 'SUBMITTED' },
                  { value: ConflictStatus.UNDER_REVIEW, label: 'UNDER REVIEW' },
                  { value: ConflictStatus.RESPONDING, label: 'RESPONDING (DISPATCH)' },
                  { value: ConflictStatus.RESOLVED, label: 'RESOLVED' },
                  { value: ConflictStatus.CLOSED, label: 'CLOSED' },
                ].map((st) => (
                  <button
                    key={st.value}
                    type="button"
                    onClick={() => setSelectedStatus(st.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedStatus === st.value
                        ? 'bg-[#3E8E41] text-white shadow-xs'
                        : 'bg-white text-stone-700 hover:bg-[#F5F5DC] border border-stone-300'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mitigation Action Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-600 block">
                Mitigation Response Action:
              </label>
              <select
                value={mitigationAction}
                onChange={(e) => setMitigationAction(e.target.value)}
                className="w-full bg-white text-xs font-semibold text-stone-800 p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#3E8E41]/30 cursor-pointer"
              >
                {MITIGATION_PRESETS.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>

            {/* Triage Notes */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-600 block">
                Officer Assessment & Dispatch Notes:
              </label>
              <textarea
                value={triageNotes}
                onChange={(e) => setTriageNotes(e.target.value)}
                rows={3}
                placeholder="Log field team dispatch details, authorized deterrent measures, or compensation survey notes..."
                className="w-full bg-white text-xs p-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#3E8E41]/30 text-stone-800 font-medium placeholder:text-stone-400"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#FAF7EE] border-t border-[#D1B370]/50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 bg-[#3E8E41] hover:bg-[#347837] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
          >
            {saving ? (
              <span>Saving Changes...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Triage Updates</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Fullscreen Photo Lightbox Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-150"
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewImage}
            alt="Conflict Evidence Preview"
            className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
