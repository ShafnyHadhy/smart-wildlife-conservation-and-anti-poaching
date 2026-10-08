import { useState, useEffect } from 'react';
import {
  WildlifeRiskAlert,
  AlertStatus,
  ResponseStatus,
} from '../types';
import { webAlertService } from '../services/alertService';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { LoadingState } from '../../../components/common/LoadingState';
import {
  X,
  AlertTriangle,
  Radio,
  Clock,
  MapPin,
  CheckCircle2,
  Send,
} from 'lucide-react';

interface AlertDetailModalProps {
  alertId: string;
  onClose: () => void;
  onAlertUpdated?: () => void;
}

const LIFECYCLE_STEPS: AlertStatus[] = [
  AlertStatus.ACTIVE,
  AlertStatus.ACKNOWLEDGED,
  AlertStatus.RESPONDING,
  AlertStatus.RESOLVED,
];

const SEED_RANGER_ID = 'aaaa0002-0000-0000-0000-000000000002'; // Ranger Kasun Bandara

export function AlertDetailModal({
  alertId,
  onClose,
  onAlertUpdated,
}: AlertDetailModalProps) {
  const [alert, setAlert] = useState<WildlifeRiskAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Response form state
  const [actionText, setActionText] = useState('');
  const [responseNotes, setResponseNotes] = useState('');
  const [showActionForm, setShowActionForm] = useState(false);

  useEffect(() => {
    async function fetchDetail() {
      try {
        setLoading(true);
        setErrorMessage(null);
        const data = await webAlertService.fetchAlertById(alertId);
        setAlert(data);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to fetch alert details');
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [alertId]);

  // Determine current step index in lifecycle
  const currentStepIdx = alert ? LIFECYCLE_STEPS.indexOf(alert.status) : -1;

  // Next action configuration
  const getActionConfig = (status: AlertStatus) => {
    switch (status) {
      case AlertStatus.ACTIVE:
        return {
          label: 'Acknowledge Alert',
          responseStatus: ResponseStatus.INITIATED,
          defaultActionText: 'Alert acknowledged by duty ranger. Dispatch team notified.',
          buttonClass: 'bg-[#A76D40] hover:bg-[#8e5a32] text-white',
        };
      case AlertStatus.ACKNOWLEDGED:
        return {
          label: 'Start Response',
          responseStatus: ResponseStatus.IN_PROGRESS,
          defaultActionText: 'Field response team deployed to perimeter boundary.',
          buttonClass: 'bg-[#3E8E41] hover:bg-[#347837] text-white',
        };
      case AlertStatus.RESPONDING:
        return {
          label: 'Resolve Alert',
          responseStatus: ResponseStatus.COMPLETED,
          defaultActionText: 'Animal safely redirected back into reserve interior. Sector cleared.',
          buttonClass: 'bg-emerald-700 hover:bg-emerald-800 text-white',
        };
      default:
        return null;
    }
  };

  const actionConfig = alert ? getActionConfig(alert.status) : null;

  const handleOpenForm = () => {
    if (actionConfig) {
      setActionText(actionConfig.defaultActionText);
      setResponseNotes('');
      setShowActionForm(true);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alert || !actionConfig || !actionText.trim()) return;

    try {
      setActionLoading(true);
      setErrorMessage(null);
      await webAlertService.respondToAlert(alert.id, {
        responderId: SEED_RANGER_ID,
        actionTaken: actionText.trim(),
        status: actionConfig.responseStatus,
        notes: responseNotes.trim() || undefined,
      });

      // Refetch fresh alert state
      const updated = await webAlertService.fetchAlertById(alert.id);
      setAlert(updated);
      setShowActionForm(false);
      setSuccessMessage(`Response action logged. Alert transitioned to ${updated.status}.`);
      onAlertUpdated?.();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit alert response');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-[#D1B370]/70 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#D1B370]/40 flex items-start justify-between bg-[#FAF7EE]/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-800 border border-rose-300">
              <AlertTriangle className="w-5 h-5 text-rose-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-[#1C2A1E]">
                  Wildlife Risk Alert
                </h3>
                {alert && <StatusBadge status={alert.severity} size="sm" />}
                {alert && <StatusBadge status={alert.status} size="sm" />}
              </div>
              <p className="text-xs text-[#A76D40] font-medium mt-0.5">
                ID: <span className="font-mono text-stone-600">{alertId}</span>
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <LoadingState message="Loading alert details and response history..." />
          ) : !alert ? (
            <div className="text-center py-8 text-stone-500">Alert record not found.</div>
          ) : (
            <>
              {/* Feedback banners */}
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  {successMessage}
                </div>
              )}

              {/* Part 10: Lifecycle Stepper Visualization */}
              <div className="p-4 bg-[#FAF7EE] border border-[#D1B370]/50 rounded-xl">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#A76D40] mb-3">
                  Alert Lifecycle Progression
                </h4>
                <div className="grid grid-cols-4 gap-2 relative">
                  {LIFECYCLE_STEPS.map((step, idx) => {
                    const isDone = idx < currentStepIdx;
                    const isCurrent = idx === currentStepIdx;

                    let badgeColor = 'bg-stone-100 text-stone-400 border-stone-200';
                    if (isDone) {
                      badgeColor = 'bg-[#3E8E41]/20 text-[#2E6B31] border-[#3E8E41]/50';
                    } else if (isCurrent) {
                      badgeColor =
                        step === AlertStatus.ACTIVE
                          ? 'bg-rose-100 text-rose-800 border-rose-400 ring-2 ring-rose-300/40'
                          : step === AlertStatus.RESOLVED
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-400 ring-2 ring-emerald-300/40'
                          : 'bg-[#A76D40]/20 text-[#854F26] border-[#A76D40]/60 ring-2 ring-[#A76D40]/30';
                    }

                    return (
                      <div
                        key={step}
                        className={`p-2.5 rounded-lg border text-center transition-all ${badgeColor}`}
                      >
                        <div className="text-[10px] font-mono opacity-70">
                          Step 0{idx + 1}
                        </div>
                        <div className="text-xs font-extrabold mt-0.5 truncate">
                          {isDone ? `✓ ${step}` : step}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Information Grid: Animal, Tracking, Risk */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Animal & Tracking */}
                <div className="p-4 bg-white border border-[#D1B370]/40 rounded-xl space-y-2.5 text-xs shadow-2xs">
                  <h4 className="font-extrabold text-[#1C2A1E] text-xs uppercase tracking-wide flex items-center gap-1.5 pb-1 border-b border-[#D1B370]/30">
                    <Radio className="w-3.5 h-3.5 text-[#3E8E41]" />
                    Subject Animal & Telemetry
                  </h4>
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-medium">Animal:</span>
                    <span className="font-bold text-stone-800">{alert.animalName || 'Identified Animal'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-medium">Species:</span>
                    <span className="font-medium text-stone-700">{alert.animalSpecies || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-medium">Coordinates:</span>
                    <span className="font-mono font-bold text-stone-800 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#A76D40]" />
                      {alert.location
                        ? `${alert.location.latitude.toFixed(4)}, ${alert.location.longitude.toFixed(4)}`
                        : 'Coordinates logged in breach record'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-medium">Telemetry Mode:</span>
                    <span className="inline-flex px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-bold text-[10px]">
                      SIMULATED PING
                    </span>
                  </div>
                </div>

                {/* Risk & Breach */}
                <div className="p-4 bg-white border border-[#D1B370]/40 rounded-xl space-y-2.5 text-xs shadow-2xs">
                  <h4 className="font-extrabold text-[#1C2A1E] text-xs uppercase tracking-wide flex items-center gap-1.5 pb-1 border-b border-[#D1B370]/30">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Geofence Breach & Zone
                  </h4>
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-medium">Risk Zone:</span>
                    <span className="font-bold text-stone-800">{alert.zoneName || 'Boundary Zone'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-medium">Risk Severity:</span>
                    <StatusBadge status={alert.severity} size="sm" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-medium">Generated At:</span>
                    <span className="text-stone-700 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-stone-400" />
                      {new Date(alert.generatedAt).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </span>
                  </div>
                  <div className="pt-1 text-stone-600 italic text-[11px] leading-relaxed">
                    {alert.notes || 'Automated boundary crossing detected.'}
                  </div>
                </div>
              </div>

              {/* Part 6: Response Action Form (if action form opened) */}
              {showActionForm && actionConfig && (
                <form
                  onSubmit={handleSubmitResponse}
                  className="p-4 bg-[#FAF7EE] border border-[#A76D40]/50 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#1C2A1E]">
                      Take Action: <span className="text-[#A76D40]">{actionConfig.label}</span>
                    </h4>
                    <span className="text-[11px] font-semibold text-stone-500">
                      Next Status: <strong className="text-stone-800">{actionConfig.responseStatus}</strong>
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Action Taken Description *
                    </label>
                    <input
                      type="text"
                      required
                      value={actionText}
                      onChange={(e) => setActionText(e.target.value)}
                      placeholder="Specify field action deployed..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#D1B370]/60 bg-white focus:outline-none focus:ring-2 focus:ring-[#3E8E41]/30 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Field Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={responseNotes}
                      onChange={(e) => setResponseNotes(e.target.value)}
                      placeholder="e.g. Wildlife retreated 500m west towards river"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#D1B370]/60 bg-white focus:outline-none focus:ring-2 focus:ring-[#3E8E41]/30 font-medium"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowActionForm(false)}
                      disabled={actionLoading}
                      className="px-3 py-1.5 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className={`px-4 py-1.5 text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 ${actionConfig.buttonClass}`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      {actionLoading ? 'Logging...' : 'Confirm Action'}
                    </button>
                  </div>
                </form>
              )}

              {/* Part 5: Action Button (when form not yet opened) */}
              {!showActionForm && (
                <div className="p-4 bg-white border border-[#D1B370]/40 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold text-[#1C2A1E]">
                      Current State: {alert.status}
                    </h4>
                    <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                      {alert.status === AlertStatus.RESOLVED
                        ? 'Threat has been mitigated. Alert is closed.'
                        : 'Deploy next operational stage for this alert.'}
                    </p>
                  </div>

                  {actionConfig ? (
                    <button
                      onClick={handleOpenForm}
                      className={`px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-colors duration-150 ${actionConfig.buttonClass}`}
                    >
                      {actionConfig.label} &rarr;
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-300">
                      Resolved & Closed
                    </span>
                  )}
                </div>
              )}

              {/* Response Audit History */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#A76D40] uppercase tracking-wider">
                  Field Response History ({alert.responses?.length || 0})
                </h4>

                {alert.responses && alert.responses.length > 0 ? (
                  <div className="border border-[#D1B370]/50 rounded-xl overflow-hidden divide-y divide-[#D1B370]/30 text-xs">
                    {alert.responses.map((resp) => (
                      <div key={resp.id} className="p-3 bg-white hover:bg-[#FAF7EE]/50 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-900">
                            {resp.responderName || 'Assigned Ranger'}
                          </span>
                          <span className="font-mono text-[11px] text-stone-500">
                            {new Date(resp.respondedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="text-stone-700 font-medium">{resp.actionTaken}</div>
                        <div className="flex items-center gap-2 pt-0.5">
                          <StatusBadge status={resp.status} size="sm" />
                          {resp.notes && (
                            <span className="text-stone-500 text-[11px] italic">
                              &ldquo;{resp.notes}&rdquo;
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-stone-50 rounded-xl text-center text-xs text-stone-500 font-medium border border-stone-200">
                    No field responses logged yet for this alert.
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#D1B370]/40 bg-[#FAF7EE]/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-stone-700 bg-white border border-[#D1B370]/60 hover:bg-[#F5F5DC] rounded-xl shadow-2xs"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
