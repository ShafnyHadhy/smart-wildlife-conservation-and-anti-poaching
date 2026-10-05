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
    success: 'bg-[#3E8E41]/15 text-[#2E6B31] border-[#3E8E41]/40',
    warning: 'bg-[#A76D40]/15 text-[#854F26] border-[#A76D40]/40',
    danger: 'bg-rose-50 text-rose-800 border-rose-300',
    info: 'bg-[#D1B370]/25 text-[#735A22] border-[#D1B370]/60',
    neutral: 'bg-stone-100 text-stone-700 border-stone-300',
  };

  const dotColors = {
    success: 'bg-[#3E8E41]',
    warning: 'bg-[#A76D40]',
    danger: 'bg-rose-600',
    info: 'bg-[#A76D40]',
    neutral: 'bg-stone-400',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold border rounded-full ${sizeStyles[size]} ${variantStyles[resolved]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[resolved]}`} />
      {status.toUpperCase()}
    </span>
  );
}
