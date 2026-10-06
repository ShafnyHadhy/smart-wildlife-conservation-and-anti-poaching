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
} from 'lucide-react';

interface ConflictDetailModalProps {
  report: ConflictReport | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (
    id: string,
    status: ConflictStatus,
    triageNotes?: string,
    mitigationAction?: string
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
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${report.latitude}, ${report.longitude}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onUpdateStatus(report.id, selectedStatus, triageNotes, mitigationAction);
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
    </div>
  );
}
