import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, MoreVertical } from 'lucide-react';

export default function ExpenseAccordion({
  title,
  subtitle,
  badges = [], // [{ label, color }]
  defaultOpen = false,
  iconColor = 'text-blue-600',
  headerBg = 'bg-blue-50',
  menuItems = [], // [{ label, icon, onClick, danger }]
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      <div
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-3 px-3 sm:px-4 py-2.5 sm:py-3 transition-colors cursor-pointer rounded-t-lg ${!open ? 'rounded-b-lg' : ''} ${headerBg} hover:opacity-90`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="min-w-0 text-left">
            <div className="text-sm sm:text-base font-semibold text-gray-900 truncate">{title}</div>
            {subtitle && (
              <div className="text-xs text-gray-500 truncate">{subtitle}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
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
          {open ? (
            <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
          {menuItems.length > 0 && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((v) => !v);
                }}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                title="Opțiuni"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="py-1">
                    {menuItems.map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={i}
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(false);
                            item.onClick && item.onClick();
                          }}
                          className={`w-full px-4 py-2 text-left flex items-center gap-2 text-sm ${
                            item.danger
                              ? 'text-red-700 hover:bg-red-50'
                              : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                          }`}
                        >
                          {Icon && <Icon className="w-4 h-4" />}
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {open && <div className="p-3 sm:p-4 space-y-3 border-t border-gray-100">{children}</div>}
    </div>
  );
}
