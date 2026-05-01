import React from 'react';
import { Search, X } from 'lucide-react';

export default function SearchFilterBar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Caută...',
  focusRingColor = 'focus:ring-blue-400',
  filters,
  actions,
  className = ''
}) {
  return (
    <div className={`mb-4 flex flex-col sm:flex-row gap-2 ${className}`}>
      <div className="relative flex-1">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={searchPlaceholder}
          className={`w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 ${focusRingColor}`}
        />
        {searchValue && onSearchChange && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Șterge căutarea"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {filters && <div className="flex flex-wrap gap-2 items-center">{filters}</div>}
      {actions && <div className="flex flex-wrap gap-2 items-center">{actions}</div>}
    </div>
  );
}
