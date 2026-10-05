import React from 'react';

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  title,
  message,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-[#D1B370]/60 rounded-2xl shadow-xs">
      {icon && (
        <div className="mb-4 p-3 bg-[#F5F5DC] rounded-2xl text-[#3E8E41]">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-stone-900 mb-1.5">{title}</h3>
      <p className="text-sm text-stone-600 max-w-sm mb-6 leading-relaxed font-medium">
        {message}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 text-sm font-bold text-white bg-[#3E8E41] hover:bg-[#347837] rounded-lg shadow-xs transition-colors duration-150"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
