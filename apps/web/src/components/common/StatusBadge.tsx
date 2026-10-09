export type StatusVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'orange'
  | 'primary'
  | 'neutral'
  | 'offline';

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  size?: 'sm' | 'md';
}

function resolveVariant(status: string): StatusVariant {
  const norm = status.toUpperCase().replace(/[\s-]+/g, '_');

  // 1. Success / Resolved / Completed / Active
  if (['ACTIVE', 'RESOLVED', 'CLOSED', 'COMPLETED', 'ONLINE', 'HEALTHY', 'SYNCED'].includes(norm)) {
    return 'success';
  }
  // 2. Urgent / Danger / Critical
  if (['HIGH', 'CRITICAL', 'FAILED', 'CANCELLED', 'REJECTED'].includes(norm)) {
    return 'danger';
  }
  // 3. Responding / Action In Progress / Dispatched
  if (['RESPONDING', 'IN_PROGRESS', 'DISPATCHED', 'ACTION_TAKEN'].includes(norm)) {
    return 'purple';
  }
  // 4. In Review / Under Investigation / Medium
  if (['UNDER_REVIEW', 'INVESTIGATING', 'UNDER_INVESTIGATION', 'MEDIUM'].includes(norm)) {
    return 'warning';
  }
  // 5. Submitted / New / Scheduled / Planned / Low (Awaiting review/triage)
  if (['SUBMITTED', 'NEW', 'REPORTED', 'SCHEDULED', 'PLANNED', 'LOW'].includes(norm)) {
    return 'info';
  }
  // 6. Offline / Pending Sync
  if (['PENDING_SYNC', 'OFFLINE', 'OFFLINE_QUEUED', 'PENDING'].includes(norm)) {
    return 'orange';
  }
  // 7. Neutral / Paused / Acknowledged
  if (['ACKNOWLEDGED', 'PAUSED', 'DISMISSED', 'FALSE_ALARM'].includes(norm)) {
    return 'neutral';
  }
  return 'neutral';
}

export function StatusBadge({ status, variant, size = 'md' }: StatusBadgeProps) {
  const resolved = variant || resolveVariant(status);

  const variantStyles: Record<StatusVariant, string> = {
    // Green (Resolved, Active, Completed)
    success: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    // Amber / Gold (Under Review, Investigating)
    warning: 'bg-amber-50 text-amber-800 border-amber-300',
    // Rose / Crimson (Critical, High, Failed)
    danger: 'bg-rose-50 text-rose-800 border-rose-300',
    // Sky Blue (Submitted, New, Planned, Scheduled)
    info: 'bg-sky-50 text-sky-800 border-sky-300',
    // Royal Blue (Primary)
    primary: 'bg-blue-50 text-blue-800 border-blue-300',
    // Purple / Indigo (Responding, Dispatched, Action Taken)
    purple: 'bg-purple-50 text-purple-800 border-purple-300',
    // Orange / Tangerine (Pending Sync, Offline Queue)
    orange: 'bg-orange-50 text-orange-800 border-orange-300',
    // Offline
    offline: 'bg-orange-50 text-orange-800 border-orange-300',
    // Muted Stone
    neutral: 'bg-stone-100 text-stone-700 border-stone-300',
  };

  const dotColors: Record<StatusVariant, string> = {
    success: 'bg-emerald-600',
    warning: 'bg-amber-500',
    danger: 'bg-rose-600',
    info: 'bg-sky-500',
    primary: 'bg-blue-600',
    purple: 'bg-purple-600',
    orange: 'bg-orange-500',
    offline: 'bg-orange-500',
    neutral: 'bg-stone-400',
  };

  const sizeStyles = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold border rounded-full tracking-wide shadow-2xs ${sizeStyles[size]} ${variantStyles[resolved] || variantStyles.neutral}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[resolved] || dotColors.neutral}`} />
      {status.toUpperCase()}
    </span>
  );
}

