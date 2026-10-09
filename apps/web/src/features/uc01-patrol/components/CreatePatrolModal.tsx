import { useState, useEffect, useCallback, FormEvent } from 'react';
import { X, Shield, MapPin, User as UserIcon, Clock, FileText, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { PatrolRoute, User } from '@wildlife/shared';
import { webPatrolService } from '../services/patrolService';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParkOption {
  id: string;
  name: string;
}

interface CreatePatrolModalProps {
  routes: PatrolRoute[];
  onClose: () => void;
  onCreated: () => void; // refresh list after creation
}

// ─── Form state shape ─────────────────────────────────────────────────────────

interface FormState {
  parkId: string;
  patrolRouteId: string;
  rangerId: string;
  patrolCode: string;
  startTime: string; // ISO datetime-local string
  notes: string;
}

const EMPTY_FORM: FormState = {
  parkId: '',
  patrolRouteId: '',
  rangerId: '',
  patrolCode: '',
  startTime: '',
  notes: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Derive unique parks from routes (routes already carry parkId + parkName) */
function deriveParkOptionsFromRoutes(routes: PatrolRoute[]): ParkOption[] {
  const seen = new Map<string, string>();
  for (const r of routes) {
    if (r.parkId && r.parkName && !seen.has(r.parkId)) {
      seen.set(r.parkId, r.parkName);
    }
  }
  return Array.from(seen.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Generate a patrol code suggestion based on park + date */
function suggestPatrolCode(parkName: string, date: string): string {
  const prefix = parkName
    .split(' ')
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 4);
  const datePart = date ? date.slice(0, 10).replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 900 + 100);
  return `PAT-${prefix}-${datePart}-${rand}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreatePatrolModal({ routes, onClose, onCreated }: CreatePatrolModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [rangers, setRangers] = useState<User[]>([]);
  const [loadingRangers, setLoadingRangers] = useState(true);
  const [rangerLoadError, setRangerLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Derived
  const parkOptions = deriveParkOptionsFromRoutes(routes);
  const filteredRoutes = form.parkId ? routes.filter((r) => r.parkId === form.parkId) : routes;
  const filteredRangers = form.parkId
    ? rangers.filter((r) => !r.parkId || r.parkId === form.parkId)
    : rangers;

  // ── Load active Rangers through the shared UC01 service ───────────────────
  const loadRangers = useCallback(async () => {
    try {
      setLoadingRangers(true);
      setRangerLoadError(null);
      setRangers(await webPatrolService.fetchRangers());
    } catch (error: unknown) {
      setRangers([]);
      setRangerLoadError(
        error instanceof Error ? error.message : 'Could not load active Rangers.'
      );
    } finally {
      setLoadingRangers(false);
    }
  }, []);

  useEffect(() => {
    void loadRangers();
  }, [loadRangers]);

  // ── Field change handler ──────────────────────────────────────────────────
  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      // When park changes, reset route selection and reset ranger if not in selected park
      if (key === 'parkId') {
        next.patrolRouteId = '';
        if (next.rangerId) {
          const selectedRanger = rangers.find((r) => r.id === next.rangerId);
          if (selectedRanger && selectedRanger.parkId && selectedRanger.parkId !== value) {
            next.rangerId = '';
          }
        }
      }

      // Auto-suggest patrol code when park + startTime are both set and code is empty or was auto-generated
      if ((key === 'parkId' || key === 'startTime') && !prev.patrolCode.startsWith('PAT-')) {
        // leave user-typed codes alone
      }
      if ((key === 'parkId' || key === 'startTime')) {
        const newParkName =
          key === 'parkId'
            ? parkOptions.find((p) => p.id === value)?.name ?? ''
            : parkOptions.find((p) => p.id === prev.parkId)?.name ?? '';
        const newDate = key === 'startTime' ? (value as string) : prev.startTime;
        if (newParkName && (!prev.patrolCode || prev.patrolCode.startsWith('PAT-'))) {
          next.patrolCode = suggestPatrolCode(newParkName, newDate);
        }
      }

      return next;
    });
    // Clear field error on change
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    setServerError(null);
  }

  // ── Validation ────────────────────────────────────────────────────────────
  function validate(): boolean {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (!form.parkId) errors.parkId = 'Park is required.';
    if (!form.patrolRouteId) errors.patrolRouteId = 'Patrol route is required.';
    if (!form.rangerId) errors.rangerId = 'Ranger is required.';
    if (!form.patrolCode.trim()) errors.patrolCode = 'Patrol code is required.';
    else if (form.patrolCode.trim().length < 2) errors.patrolCode = 'Patrol code must be at least 2 characters.';
    if (!form.startTime) errors.startTime = 'Start date/time is required.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setServerError(null);

    try {
      await webPatrolService.createPatrol({
        parkId: form.parkId,
        patrolRouteId: form.patrolRouteId,
        rangerId: form.rangerId,
        patrolCode: form.patrolCode.trim(),
        startTime: new Date(form.startTime).toISOString(),
        notes: form.notes.trim() || undefined,
      });

      setSuccess(true);
      // Close after short success display
      setTimeout(() => {
        onCreated();
        onClose();
      }, 900);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to create patrol. Please try again.';
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Minimum date: now ──────────────────────────────────────────────────────
  const minDateTime = new Date().toISOString().slice(0, 16);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(28,42,30,0.55)', backdropFilter: 'blur(3px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-patrol-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal card */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#D1B370]/40 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#1C2A1E] to-[#2E6B31] text-white">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#D1B370]" />
            <h2 id="create-patrol-modal-title" className="text-base font-bold tracking-tight">
              Create Patrol Assignment
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close create patrol form"
            className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success state */}
        {success && (
          <div className="flex flex-col items-center justify-center gap-3 py-14 px-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <p className="text-base font-bold text-[#1C2A1E]">Patrol Created!</p>
            <p className="text-sm text-stone-500">Refreshing patrol list…</p>
          </div>
        )}

        {/* Form */}
        {!success && (
          <form onSubmit={(e) => { void handleSubmit(e); }} noValidate className="px-6 py-5 space-y-4">
            {/* Server error banner */}
            {serverError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Two-column grid for park + route */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Park */}
              <div className="flex flex-col gap-1">
                <label htmlFor="cp-park" className="text-xs font-bold text-[#1C2A1E] flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#3E8E41]" /> Park <span className="text-red-500">*</span>
                </label>
                <select
                  id="cp-park"
                  value={form.parkId}
                  onChange={(e) => setField('parkId', e.target.value)}
                  className={`w-full px-3 py-2 text-sm bg-[#FAF7EE] border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3E8E41]/40 transition ${
                    fieldErrors.parkId ? 'border-red-400' : 'border-[#D1B370]/60'
                  }`}
                >
                  <option value="">Select park…</option>
                  {parkOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {fieldErrors.parkId && <p className="text-[11px] text-red-500">{fieldErrors.parkId}</p>}
              </div>

              {/* Patrol Route */}
              <div className="flex flex-col gap-1">
                <label htmlFor="cp-route" className="text-xs font-bold text-[#1C2A1E] flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#3E8E41]" /> Route <span className="text-red-500">*</span>
                </label>
                <select
                  id="cp-route"
                  value={form.patrolRouteId}
                  onChange={(e) => setField('patrolRouteId', e.target.value)}
                  disabled={filteredRoutes.length === 0}
                  className={`w-full px-3 py-2 text-sm bg-[#FAF7EE] border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3E8E41]/40 transition disabled:opacity-50 ${
                    fieldErrors.patrolRouteId ? 'border-red-400' : 'border-[#D1B370]/60'
                  }`}
                >
                  <option value="">Select route…</option>
                  {filteredRoutes.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                {fieldErrors.patrolRouteId && <p className="text-[11px] text-red-500">{fieldErrors.patrolRouteId}</p>}
              </div>
            </div>

            {/* Ranger */}
            <div className="flex flex-col gap-1">
              <label htmlFor="cp-ranger" className="text-xs font-bold text-[#1C2A1E] flex items-center gap-1">
                <UserIcon className="w-3 h-3 text-[#3E8E41]" /> Assigned Ranger <span className="text-red-500">*</span>
              </label>
              {loadingRangers ? (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-stone-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading rangers…
                </div>
              ) : (
                <select
                  id="cp-ranger"
                  value={form.rangerId}
                  onChange={(e) => setField('rangerId', e.target.value)}
                  disabled={Boolean(rangerLoadError)}
                  className={`w-full px-3 py-2 text-sm bg-[#FAF7EE] border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3E8E41]/40 transition ${
                    fieldErrors.rangerId ? 'border-red-400' : 'border-[#D1B370]/60'
                  }`}
                >
                  <option value="">
                    {rangerLoadError ? 'Rangers could not be loaded' : 'Select ranger…'}
                  </option>
                  {filteredRangers.length === 0 && (
                    <option disabled value="">No active rangers found for selected park</option>
                  )}
                  {filteredRangers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fullName}{r.badgeNumber ? ` (${r.badgeNumber})` : ''}
                    </option>
                  ))}
                </select>
              )}
              {rangerLoadError && (
                <div className="flex items-center justify-between gap-3 text-[11px] text-red-600" role="alert">
                  <span>{rangerLoadError}</span>
                  <button
                    type="button"
                    onClick={() => void loadRangers()}
                    className="font-semibold underline underline-offset-2"
                  >
                    Retry
                  </button>
                </div>
              )}
              {fieldErrors.rangerId && <p className="text-[11px] text-red-500">{fieldErrors.rangerId}</p>}
            </div>

            {/* Patrol Code + Start Time in two columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Patrol Code */}
              <div className="flex flex-col gap-1">
                <label htmlFor="cp-code" className="text-xs font-bold text-[#1C2A1E] flex items-center gap-1">
                  <Shield className="w-3 h-3 text-[#3E8E41]" /> Patrol Code <span className="text-red-500">*</span>
                </label>
                <input
                  id="cp-code"
                  type="text"
                  value={form.patrolCode}
                  onChange={(e) => setField('patrolCode', e.target.value)}
                  placeholder="e.g. PAT-YNP-20261009-001"
                  maxLength={50}
                  className={`w-full px-3 py-2 text-sm bg-[#FAF7EE] border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3E8E41]/40 transition placeholder:text-stone-400 ${
                    fieldErrors.patrolCode ? 'border-red-400' : 'border-[#D1B370]/60'
                  }`}
                />
                {fieldErrors.patrolCode && <p className="text-[11px] text-red-500">{fieldErrors.patrolCode}</p>}
              </div>

              {/* Start Time */}
              <div className="flex flex-col gap-1">
                <label htmlFor="cp-start" className="text-xs font-bold text-[#1C2A1E] flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#3E8E41]" /> Start Date &amp; Time <span className="text-red-500">*</span>
                </label>
                <input
                  id="cp-start"
                  type="datetime-local"
                  value={form.startTime}
                  min={minDateTime}
                  onChange={(e) => setField('startTime', e.target.value)}
                  className={`w-full px-3 py-2 text-sm bg-[#FAF7EE] border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3E8E41]/40 transition ${
                    fieldErrors.startTime ? 'border-red-400' : 'border-[#D1B370]/60'
                  }`}
                />
                {fieldErrors.startTime && <p className="text-[11px] text-red-500">{fieldErrors.startTime}</p>}
              </div>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1">
              <label htmlFor="cp-notes" className="text-xs font-bold text-[#1C2A1E] flex items-center gap-1">
                <FileText className="w-3 h-3 text-[#3E8E41]" /> Notes <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="cp-notes"
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder="Special instructions, objectives, or safety notes…"
                className="w-full px-3 py-2 text-sm bg-[#FAF7EE] border border-[#D1B370]/60 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-[#3E8E41]/40 transition resize-none placeholder:text-stone-400"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-sm font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200
                  border border-stone-200 rounded-xl transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                id="cp-submit"
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white
                  bg-gradient-to-br from-[#3E8E41] to-[#2E6B31] rounded-xl hover:from-[#2E6B31] hover:to-[#1C5520]
                  shadow-md transition disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Create Patrol
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
