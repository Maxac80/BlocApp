import React from 'react';
import { Settings } from 'lucide-react';

const MaintenanceSummary = ({
  association,
  blocks,
  stairs,
  currentMonth,
  setCurrentMonth,
  isMonthReadOnly,
  shouldShowPublishButton,
  shouldShowAdjustButton,
  hasInitialBalances,
  publishMonth,
  unpublishMonth,
  onAdjustBalances,
  exportPDFAvizier,
  maintenanceData,
  handleNavigation,
  getAssociationApartments
}) => {
return (
  <div className="mb-6">
    {/* Butoanele pentru acțiuni */}
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {/* Tab-uri pentru luni */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button 
            onClick={() => setCurrentMonth(new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" }))}
            className={`px-4 py-2 rounded-md transition-all font-medium text-sm ${
              currentMonth === new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" })
                ? "bg-blue-600 text-white shadow-md transform scale-105"
                : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
            }`}
          >
            Luna Curentă
          </button>
          <button 
            onClick={() => {
              const nextMonth = new Date();
              nextMonth.setMonth(nextMonth.getMonth() + 1);
              setCurrentMonth(nextMonth.toLocaleDateString("ro-RO", { month: "long", year: "numeric" }));
            }}
            className={`px-4 py-2 rounded-md transition-all font-medium text-sm ${
              currentMonth !== new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" })
                ? "bg-green-600 text-white shadow-md transform scale-105"
                : "text-gray-600 hover:text-green-600 hover:bg-green-50"
            }`}
          >
            Luna Următoare
          </button>
        </div>

        {/* Buton Publică Luna */}
        {shouldShowPublishButton(currentMonth) && (
          <button 
            onClick={() => publishMonth(currentMonth)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center text-sm font-medium shadow-md whitespace-nowrap"
          >
            📋 Publică Luna
          </button>
        )}
        
        {/* Buton Depublică Luna (doar pentru lunile publicate) */}
        {isMonthReadOnly && (
          <button 
            onClick={() => unpublishMonth(currentMonth)}
            className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 flex items-center text-sm font-medium shadow-md whitespace-nowrap"
            title="Folosește doar în cazuri excepționale!"
          >
            🔓 Depublică
          </button>
        )}

        {/* Buton Ajustări Solduri */}
        {shouldShowAdjustButton(currentMonth) && !isMonthReadOnly && (
          (currentMonth === new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" }) ? hasInitialBalances : true)
        ) && (
          <button 
            onClick={onAdjustBalances}
            className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 flex items-center text-sm font-medium shadow-md whitespace-nowrap"
          >
            <Settings className="w-4 h-4 mr-2" />
            Ajustări Solduri
          </button>
        )}
      </div>
    </div>
  </div>
);
};

export default MaintenanceSummary;