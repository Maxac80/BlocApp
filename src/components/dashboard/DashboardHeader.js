// src/components/dashboard/DashboardHeader.js
import React from 'react';

const DashboardHeader = ({
  association,
  blocks = [],
  stairs = [],
  currentMonth,
  setCurrentMonth,
  getAvailableMonths,
  expenses = [],
  isMonthReadOnly,
  getAssociationApartments,
  handleNavigation,
  getMonthType
}) => {
  const monthType = getMonthType ? getMonthType(currentMonth) : 'current';
  const isReadOnly = isMonthReadOnly;

  // Helper pentru badge-ul tipului lunii
  const getMonthTypeBadge = () => {
    const baseClasses = "text-[11px] sm:text-xs font-medium px-2 sm:px-3 py-0.5 sm:py-1 rounded text-center whitespace-nowrap";

    if (monthType === 'current') {
      return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>LUNA ACTIVĂ</span>;
    } else if (monthType === 'next') {
      return <span className={`${baseClasses} bg-green-100 text-green-800`}>LUNA URMĂTOARE</span>;
    } else if (monthType === 'historic') {
      return <span className={`${baseClasses} bg-gray-600 text-white`}>LUNĂ ISTORICĂ</span>;
    }
    return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>LUNA ACTIVĂ</span>;
  };

  // Helper pentru badge-ul statusului
  const getStatusBadge = () => {
    const baseClasses = "text-[11px] sm:text-xs font-medium px-2 sm:px-3 py-0.5 sm:py-1 rounded text-center whitespace-nowrap";

    if (monthType === 'historic' && isReadOnly) {
      return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>ARHIVATĂ</span>;
    } else if (isReadOnly) {
      return <span className={`${baseClasses} bg-purple-100 text-purple-800`}>PUBLICATĂ</span>;
    }
    return <span className={`${baseClasses} bg-orange-100 text-orange-800`}>ÎN LUCRU</span>;
  };

  return (
    <header className="mb-4 sm:mb-6 lg:mb-8">
      <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-blue-100">
        {/* Layout: vertical pe mobil, horizontal pe desktop */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4">

          {/* Secțiunea cu informații asociație */}
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 truncate">
              {association?.name || "Nume Asociație"}
            </h1>
            <p className="text-gray-600 text-xs sm:text-sm mt-0.5 sm:mt-1 truncate">
              {association?.address ?
                `${association.address.street || ''} ${association.address.number || ''}, ${association.address.city || ''}, ${association.address.county || ''}`.trim()
                : "Adresa asociației"}
            </p>
            {/* Informații blocuri, scări, apartamente - ascunse pe mobil mic */}
            {association && getAssociationApartments && getAssociationApartments().length > 0 && (
              <p className="hidden sm:block text-gray-500 text-xs mt-1">
                {blocks.length === 1 ? '1 bloc' : `${blocks.length} blocuri`} • {stairs.length === 1 ? '1 scară' : `${stairs.length} scări`} • {getAssociationApartments().length === 1 ? '1 apartament' : `${getAssociationApartments().length} apartamente`} • {getAssociationApartments().reduce((sum, apt) => sum + apt.persons, 0)} persoane
              </p>
            )}
          </div>

          {/* Secțiunea cu controls - selector și badge-uri */}
          <div className="flex items-center justify-between gap-1 sm:gap-3 flex-nowrap">
            {/* Selector luna - la stanga */}
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none flex-shrink-0"
            >
              {getAvailableMonths && typeof getAvailableMonths === 'function' ?
                getAvailableMonths(expenses).map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                )) :
                <option value={currentMonth}>{currentMonth}</option>
              }
            </select>

            {/* Badge-uri status - la dreapta */}
            <div className="flex items-center gap-1 sm:gap-2 flex-nowrap">
              {getMonthTypeBadge()}
              {getStatusBadge()}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;