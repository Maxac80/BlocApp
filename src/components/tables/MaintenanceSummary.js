import React, { useMemo } from 'react';
import { Calendar, CalendarDays, AlertCircle, CheckCircle } from 'lucide-react';
import { validateTotalsMatch } from '../../utils/validationHelpers';

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
  expenses, // Array of active expenses for current month
  tabContent // Noul prop pentru conținutul tab-urilor
}) => {
// Obținem luna curentă activă și luna următoare
const currentActiveMonth = getCurrentActiveMonth();
const nextActiveMonth = getNextActiveMonth();
const monthType = getMonthType ? getMonthType(currentMonth) : null;

// Calculăm validarea totale pentru luna curentă
const totalsValidation = useMemo(() => {
  if (!expenses || !maintenanceData || isMonthReadOnly) {
    return null;
  }
  return validateTotalsMatch(expenses, maintenanceData, association?.id);
}, [expenses, maintenanceData, association?.id, isMonthReadOnly]);

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
              <div className="flex items-center gap-4">
                <button
                  onClick={async () => {
                    const result = await publishMonth(currentMonth);
                    console.log('Publish result:', result);
                  }}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 flex items-center gap-2 font-medium shadow-md transition-all hover:shadow-lg"
                >
                  📋 Publică Luna
                </button>

                {/* Badge validare totale */}
                {totalsValidation && (
                  <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                      totalsValidation.match
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}
                    title={
                      totalsValidation.match
                        ? `Total cheltuieli: ${totalsValidation.totalCheltuieli} RON\nTotal tabel: ${totalsValidation.totalTabel} RON\n✓ Distribuție completă`
                        : `Total cheltuieli: ${totalsValidation.totalCheltuieli} RON\nTotal tabel: ${totalsValidation.totalTabel} RON\nDiferență nedistribuită: ${totalsValidation.diferenta} RON`
                    }
                  >
                    {totalsValidation.match ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        <span>Total: {totalsValidation.totalCheltuieli} RON ✓</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5" />
                        <span>Diferență: {totalsValidation.diferenta} RON</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Mesaj eroare dacă diferență nedistribuită */}
              {totalsValidation && !totalsValidation.match && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    <strong>Atenție:</strong> Există o diferență de {totalsValidation.diferenta} RON între
                    total cheltuieli ({totalsValidation.totalCheltuieli} RON) și
                    total tabel întreținere ({totalsValidation.totalTabel} RON).
                    Vă rugăm să verificați distribuția înainte de publicare.
                  </p>
                </div>
              )}
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