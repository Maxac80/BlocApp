import React from 'react';

export default function PageHeader({
  icon: Icon,
  iconColor = 'text-blue-600',
  title,
  subtitle,
  rightAction,
  className = ''
}) {
  return (
    <div className={`mb-4 sm:mb-6 flex items-start justify-between gap-3 ${className}`}>
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-start gap-2 min-w-0">
        {Icon && (
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-0.5 sm:mt-1 ${iconColor}`} />
        )}
        <span>
          {title}
          {subtitle && (
            <span className="block sm:inline text-xs sm:text-base font-normal text-gray-500 sm:ml-2">
              <span className="hidden sm:inline">· </span>
              {subtitle}
            </span>
          )}
        </span>
      </h1>
      {rightAction && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {rightAction}
        </div>
      )}
    </div>
  );
}
