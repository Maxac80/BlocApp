// src/components/dashboard/DashboardHeader.js
import React from 'react';
import { History } from 'lucide-react';

const DashboardHeader = ({
  association,
  currentMonth,
  setCurrentMonth,
  getAvailableMonths,
  expenses = [],
  isMonthReadOnly,
  getAssociationApartments,
  handleNavigation,
  onShowVersionHistory
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
            {association && getAssociationApartments().length > 0 && (
              <p className="text-gray-500 text-xs mt-1">
                {getAssociationApartments().length} apartamente • 
                {getAssociationApartments().reduce((sum, apt) => sum + apt.persons, 0)} persoane
              </p>
            )}
          </div>

          {/* Dreapta: Status luna și selector */}
          <div className="flex items-center space-x-4">
            {/* Buton istoric versiuni */}
            {onShowVersionHistory && (
              <button
                onClick={onShowVersionHistory}
                className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm flex items-center"
                title="Istoric versiuni publicate"
              >
                <History className="w-4 h-4 mr-2" />
                Istoric
              </button>
            )}

            {/* Selector luna */}
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              {getAvailableMonths(expenses).map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>

            {/* Status-uri luna */}
            <div className="flex items-center space-x-2">
              {currentMonth === new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" }) ? (
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                  LUNA CURENTĂ
                </span>
              ) : (
                <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                  LUNA URMĂTOARE
                </span>
              )}
              
              {isMonthReadOnly(currentMonth) ? (
                <span className="bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1 rounded-full">
                  📋 PUBLICATĂ
                </span>
              ) : (
                <span className="bg-orange-100 text-orange-800 text-sm font-medium px-3 py-1 rounded-full">
                  🔧 ÎN LUCRU
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;