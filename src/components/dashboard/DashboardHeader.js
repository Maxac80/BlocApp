// src/components/dashboard/DashboardHeader.js
import React from 'react';

const DashboardHeader = ({
  association,
  currentMonth,
  setCurrentMonth,
  getAvailableMonths,
  expenses = [],
  isMonthReadOnly,
  getAssociationApartments,
  handleNavigation,
  getMonthType
}) => {
  return (
    <header className="mb-8">
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100">
        <div className="flex items-center justify-between">
          {/* Stânga: Numele asociației */}
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {association?.name || "Nume Asociație"}
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              {association?.address ? 
                `${association.address.street || ''} ${association.address.number || ''}, ${association.address.city || ''}, ${association.address.county || ''}`.trim() 
                : "Adresa asociației"}
            </p>
            {/* Informații apartamente și persoane */}
            {association && getAssociationApartments && getAssociationApartments().length > 0 && (
              <p className="text-gray-500 text-xs mt-1">
                {getAssociationApartments().length} apartamente • {getAssociationApartments().reduce((sum, apt) => sum + apt.persons, 0)} persoane
              </p>
            )}
          </div>

          {/* Dreapta: Status luna și selector */}
          <div className="flex items-center space-x-4">
            {/* Selector luna */}
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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

            {/* Status-uri luna */}
            <div className="flex items-center space-x-2">
              {/* Determinăm tipul lunii folosind funcția dinamică */}
              {(() => {
                const monthType = getMonthType ? getMonthType(currentMonth) : 'current';
                if (monthType === 'current') {
                  return (
                    <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full min-w-[150px] text-center inline-block">
                      LUNA ACTIVĂ
                    </span>
                  );
                } else if (monthType === 'next') {
                  return (
                    <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full min-w-[150px] text-center inline-block">
                      LUNA URMĂTOARE
                    </span>
                  );
                } else if (monthType === 'historic') {
                  return (
                    <span className="bg-gray-600 text-white text-sm font-medium px-3 py-1 rounded-full min-w-[150px] text-center inline-block">
                      LUNĂ ISTORICĂ
                    </span>
                  );
                } else {
                  // Pentru orice alt tip, afișăm implicit ca luna activă
                  return (
                    <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full min-w-[150px] text-center inline-block">
                      LUNA ACTIVĂ
                    </span>
                  );
                }
              })()}
              
              {(() => {
                const monthType = getMonthType ? getMonthType(currentMonth) : 'current';
                if (monthType === 'historic' && isMonthReadOnly) {
                  return (
                    <span className="bg-gray-100 text-gray-800 text-sm font-medium px-3 py-1 rounded-full min-w-[120px] text-center inline-block">
                      📚 ARHIVATĂ
                    </span>
                  );
                } else if (isMonthReadOnly) {
                  return (
                    <span className="bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1 rounded-full min-w-[120px] text-center inline-block">
                      📋 PUBLICATĂ
                    </span>
                  );
                } else {
                  return (
                    <span className="bg-orange-100 text-orange-800 text-sm font-medium px-3 py-1 rounded-full min-w-[120px] text-center inline-block">
                      🔧 ÎN LUCRU
                    </span>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;