import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Activity } from 'lucide-react';

export default function ExpenseAccordion({
  title,
  subtitle,
  badges = [], // [{ label, color }]
  defaultOpen = false,
  iconColor = 'text-blue-600',
  headerBg = 'bg-blue-50',
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-3 px-3 sm:px-4 py-2.5 sm:py-3 transition-colors ${headerBg} hover:opacity-90`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {open ? (
            <ChevronDown className={`w-4 h-4 ${iconColor} flex-shrink-0`} />
          ) : (
            <ChevronRight className={`w-4 h-4 ${iconColor} flex-shrink-0`} />
          )}
          <Activity className={`w-4 h-4 ${iconColor} flex-shrink-0`} />
          <div className="min-w-0 text-left">
            <div className="text-sm sm:text-base font-semibold text-gray-900 truncate">{title}</div>
            {subtitle && (
              <div className="text-xs text-gray-500 truncate">{subtitle}</div>
            )}
          </div>
        </div>
        {badges.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {badges.map((b, i) => (
              <span
                key={i}
                className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${b.color || 'bg-gray-100 text-gray-700'}`}
              >
                {b.label}
              </span>
            ))}
          </div>
        )}
      </button>
      {open && <div className="p-3 sm:p-4 space-y-3 border-t border-gray-100">{children}</div>}
    </div>
  );
}
