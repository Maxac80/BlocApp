import React from 'react';
import { Calendar, CalendarDays } from 'lucide-react';

const MaintenanceSummary = ({
  association,
  blocks,
  stairs,
  currentMonth,
  setCurrentMonth,
  isMonthReadOnly,
  shouldShowPublishButton,
  shouldShowAdjustButton,
  publishMonth,
  onAdjustBalances,
  exportPDFAvizier,
  maintenanceData,
  handleNavigation,
  getAssociationApartments,
  getCurrentActiveMonth,
  getNextActiveMonth,
  getMonthType,
  tabContent // Noul prop pentru conținutul tab-urilor
}) => {
// Obținem luna curentă activă și luna următoare
const currentActiveMonth = getCurrentActiveMonth();
const nextActiveMonth = getNextActiveMonth();
const monthType = getMonthType ? getMonthType(currentMonth) : null;

// Verificăm dacă avem ceva de afișat
const hasContent =
  (currentActiveMonth && nextActiveMonth && monthType !== 'historic') ||
  shouldShowPublishButton(currentMonth) ||
  (isMonthReadOnly && monthType !== 'historic') ||
  (shouldShowAdjustButton(currentMonth) && !isMonthReadOnly);

// Nu afișăm nimic dacă nu avem conținut - sheet-ul se creează automat acum
if (!hasContent) {
  return null;
}

return (
  <div className="mb-6">
    <div className="bg-white rounded-xl shadow-lg">
      {/* Tab-uri pentru luni în stil elegant */}
      {currentActiveMonth && nextActiveMonth && monthType !== 'historic' && (
        <>
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setCurrentMonth(currentActiveMonth.value)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                  currentMonth === currentActiveMonth.value
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Calendar className="w-5 h-5" />
                Luna Activă
              </button>
              <button
                onClick={() => setCurrentMonth(nextActiveMonth.value)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                  currentMonth === nextActiveMonth.value
                    ? 'bg-green-50 text-green-700 border-b-2 border-green-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CalendarDays className="w-5 h-5" />
                Luna Următoare
              </button>
            </div>
          </div>

          {/* Conținutul tab-ului selectat */}
          <div className="tab-content">
            {/* Buton Publică Luna pentru tab-ul curent */}
            {shouldShowPublishButton(currentMonth) && (
              <div className="p-6 border-b">
                <button
                  onClick={async () => {
                    const result = await publishMonth(currentMonth);
                    console.log('Publish result:', result);
                  }}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 flex items-center gap-2 font-medium shadow-md transition-all hover:shadow-lg"
                >
                  📋 Publică Luna
                </button>
              </div>
            )}

            {/* Conținutul efectiv al tab-ului */}
            {tabContent}
          </div>
        </>
      )}

      {/* Dacă nu avem tab-uri, afișăm conținutul direct */}
      {(!currentActiveMonth || !nextActiveMonth || monthType === 'historic') && (
        <div>
          {shouldShowPublishButton(currentMonth) && (
            <div className="p-6 border-b">
              <button
                onClick={async () => {
                  const result = await publishMonth(currentMonth);
                  console.log('Publish result:', result);
                }}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 flex items-center gap-2 font-medium shadow-md transition-all hover:shadow-lg"
              >
                📋 Publică Luna
              </button>
            </div>
          )}
          {tabContent}
        </div>
      )}
    </div>
  </div>
);
};

export default MaintenanceSummary;