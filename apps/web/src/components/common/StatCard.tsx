import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  onClick,
}: StatCardProps) {
  const borderColors = {
    default: 'border-slate-800 hover:border-slate-700',
    success: 'border-emerald-900/50 hover:border-emerald-700',
    warning: 'border-amber-900/50 hover:border-amber-700',
    danger: 'border-rose-900/50 hover:border-rose-700',
    info: 'border-sky-900/50 hover:border-sky-700',
  };

  const badgeBg = {
    default: 'bg-slate-800/80 text-slate-300',
    success: 'bg-emerald-950 text-emerald-400',
    warning: 'bg-amber-950 text-amber-400',
    danger: 'bg-rose-950 text-rose-400',
    info: 'bg-sky-950 text-sky-400',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-slate-900/90 border ${borderColors[variant]} rounded-xl p-5 shadow-lg backdrop-blur transition-all duration-150 ${
        onClick ? 'cursor-pointer hover:scale-[1.01]' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
          {title}
        </span>
        {icon && (
          <div className={`p-2 rounded-lg ${badgeBg[variant]}`}>
            {icon}
          </div>
        )}
      </div>
      <div className="text-3xl font-extrabold text-white tracking-tight">
        {value}
      </div>
      {subtitle && (
        <p className="mt-2 text-xs text-slate-400">
          {subtitle}
        </p>
      )}
    </div>
  );
}
