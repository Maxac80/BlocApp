import React from 'react';

export default function ContentCard({
  icon: Icon,
  iconColor = 'text-blue-600',
  title,
  subtitle,
  actions,
  headerBg = 'bg-blue-50',
  noPadding = false,
  children,
  className = ''
}) {
  return (
    <div className={`rounded-xl shadow-sm border border-gray-200 bg-white ${className}`}>
      {(title || actions) && (
        <div className={`p-3 sm:p-4 border-b ${headerBg}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div>
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 text-gray-800">
                {Icon && <Icon className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${iconColor}`} />}
                <span>
                  {title}
                  {subtitle && (
                    <span className="text-xs sm:text-sm font-normal text-gray-500 ml-1 sm:ml-2">
                      · {subtitle}
                    </span>
                  )}
                </span>
              </h3>
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>
        </div>
      )}
      <div className={noPadding ? '' : 'p-3 sm:p-4'}>{children}</div>
    </div>
  );
}
