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
    default: 'border-[#D1B370]/60 hover:border-[#D1B370]',
    success: 'border-[#3E8E41]/40 hover:border-[#3E8E41]',
    warning: 'border-[#A76D40]/40 hover:border-[#A76D40]',
    danger: 'border-rose-300 hover:border-rose-500',
    info: 'border-[#D1B370]/80 hover:border-[#A76D40]',
  };

  const badgeBg = {
    default: 'bg-[#F5F5DC] text-[#3E8E41]',
    success: 'bg-[#3E8E41]/15 text-[#3E8E41]',
    warning: 'bg-[#A76D40]/15 text-[#A76D40]',
    danger: 'bg-rose-50 text-rose-600',
    info: 'bg-[#D1B370]/25 text-[#A76D40]',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white border ${borderColors[variant]} rounded-xl p-5 shadow-xs transition-all duration-150 ${
        onClick ? 'cursor-pointer hover:scale-[1.01] hover:shadow-md' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold tracking-wider text-[#A76D40] uppercase">
          {title}
        </span>
        {icon && (
          <div className={`p-2 rounded-lg ${badgeBg[variant]}`}>
            {icon}
          </div>
        )}
      </div>
      <div className="text-3xl font-extrabold text-[#1C2A1E] tracking-tight">
        {value}
      </div>
      {subtitle && (
        <p className="mt-2 text-xs text-stone-500">
          {subtitle}
        </p>
      )}
    </div>
  );
}
