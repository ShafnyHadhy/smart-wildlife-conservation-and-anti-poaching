
export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  size?: 'sm' | 'md';
}

function resolveVariant(status: string): StatusVariant {
  const norm = status.toUpperCase();
  if (['ACTIVE', 'RESOLVED', 'COMPLETED', 'ONLINE', 'HEALTHY'].includes(norm)) {
    return 'success';
  }
  if (['HIGH', 'CRITICAL', 'FAILED', 'CANCELLED'].includes(norm)) {
    return 'danger';
  }
  if (['PENDING', 'UNDER_REVIEW', 'RESPONDING', 'IN_PROGRESS', 'MEDIUM'].includes(norm)) {
    return 'warning';
  }
  if (['SUBMITTED', 'SCHEDULED', 'PLANNED', 'LOW'].includes(norm)) {
    return 'info';
  }
  return 'neutral';
}

export function StatusBadge({ status, variant, size = 'md' }: StatusBadgeProps) {
  const resolved = variant || resolveVariant(status);

  const variantStyles = {
    success: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60',
    warning: 'bg-amber-950/80 text-amber-400 border-amber-800/60',
    danger: 'bg-rose-950/80 text-rose-400 border-rose-800/60',
    info: 'bg-sky-950/80 text-sky-400 border-sky-800/60',
    neutral: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
  };

  const dotColors = {
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-rose-400',
    info: 'bg-sky-400',
    neutral: 'bg-slate-400',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold border rounded-full ${sizeStyles[size]} ${variantStyles[resolved]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[resolved]}`} />
      {status.toUpperCase()}
    </span>
  );
}
