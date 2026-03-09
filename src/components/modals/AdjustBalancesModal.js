import React from 'react';
import { XCircle, CheckSquare } from 'lucide-react';

const AdjustBalancesModal = ({
  showAdjustBalances,
  setShowAdjustBalances,
  currentMonth,
  adjustModalData,
  setAdjustModalData,
  setApartmentBalance,
  saveBalanceAdjustments,
  updateCurrentSheetMaintenanceTable,
  createInitialSheet,
  currentSheet,
  maintenanceData,
  association,
  setMonthlyTables,
  forceRecalculate
}) => {
  if (!showAdjustBalances) return null;

  const handleSave = async () => {
    try {
      // Salvează local (solduri curente pentru luna actuală)
      adjustModalData.forEach(apartmentData => {
        const newBalance = {
          restante: Math.round(apartmentData.restanteAjustate * 100) / 100,
          penalitati: Math.round(apartmentData.penalitatiAjustate * 100) / 100
        };
        setApartmentBalance(apartmentData.apartmentId, newBalance);
      });

      // Salvează în Firestore
      await saveBalanceAdjustments(currentMonth, adjustModalData);

      setShowAdjustBalances(false);
      setAdjustModalData([]);

      // Forțează recalcularea completă a tabelului
      if (forceRecalculate) {
        forceRecalculate();
      }

      // Actualizează tabelul de întreținere din sheet-ul curent cu noile solduri
      if (updateCurrentSheetMaintenanceTable && maintenanceData && maintenanceData.length > 0) {
        try {
          const updatedMaintenanceTable = maintenanceData.map(row => {
            const adjustment = adjustModalData.find(adj => adj.apartmentId === row.apartmentId);

            if (adjustment) {
              const newRestante = Math.round((adjustment.restanteAjustate || 0) * 100) / 100;
              const newPenalitati = Math.round((adjustment.penalitatiAjustate || 0) * 100) / 100;
              const newTotalMaintenance = Math.round((row.currentMaintenance + newRestante) * 100) / 100;
              const newTotalDatorat = Math.round((newTotalMaintenance + newPenalitati) * 100) / 100;

              return {
                ...row,
                restante: newRestante,
                penalitati: newPenalitati,
                totalMaintenance: newTotalMaintenance,
                totalDatorat: newTotalDatorat
              };
            }

            return row;
          });

          await updateCurrentSheetMaintenanceTable(updatedMaintenanceTable);
        } catch (error) {
          console.error('Eroare la actualizarea tabelului din sheet:', error);
        }
      } else {
        alert('⚠️ Nu există sheet curent pentru salvarea ajustărilor. Completați onboarding-ul întâi.');
        return;
      }
    } catch (error) {
      console.error('Eroare la salvarea ajustărilor:', error);
      alert('Eroare la salvarea ajustărilor: ' + error.message);
    }
  };

  const totalRestanteNoi = adjustModalData.reduce((sum, item) => sum + (item.restanteAjustate || 0), 0);
  const totalPenalitatiNoi = adjustModalData.reduce((sum, item) => sum + (item.penalitatiAjustate || 0), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-[95vw] sm:max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-3 sm:p-4 flex items-center justify-between text-white flex-shrink-0">
          <div className="min-w-0">
            <h3 className="text-base sm:text-xl font-semibold truncate">
              Ajustări Solduri — {currentMonth}
            </h3>
            <p className="text-yellow-100 text-xs sm:text-sm">
              Completați restanțele și penalitățile cu care pornește fiecare apartament
            </p>
          </div>
          <button
            onClick={() => setShowAdjustBalances(false)}
            className="text-white hover:text-yellow-200 transition-colors flex-shrink-0"
          >
            <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6 flex-1 overflow-y-auto min-h-0">
          {/* Totaluri */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg border">
            <div className="text-center">
              <div className="text-xs sm:text-sm text-gray-600">Total Restanțe</div>
              <div className="text-base sm:text-lg font-bold text-red-600">
                {totalRestanteNoi.toFixed(2)} RON
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs sm:text-sm text-gray-600">Total Penalități</div>
              <div className="text-base sm:text-lg font-bold text-orange-600">
                {totalPenalitatiNoi.toFixed(2)} RON
              </div>
            </div>
          </div>

          {/* Tabel apartamente */}
          <div className="overflow-x-auto">
            <table className="w-full" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '10%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-medium text-gray-700">Apartament</th>
                  <th className="px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-medium text-gray-700">Proprietar</th>
                  <th className="px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-medium text-gray-700">Restanță curentă</th>
                  <th className="px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-medium text-gray-700">Penalități curente</th>
                  <th className="px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-medium text-gray-700">Restanță nouă</th>
                  <th className="px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-medium text-gray-700">Penalități noi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {adjustModalData.map(apartmentData => (
                  <tr key={apartmentData.apartmentId} className="hover:bg-gray-50">
                    <td className="px-2 sm:px-3 py-2 text-sm font-semibold">Ap. {apartmentData.apartmentNumber}</td>
                    <td className="px-2 sm:px-3 py-2 text-sm">{apartmentData.owner}</td>
                    <td className="px-2 sm:px-3 py-2 text-sm font-medium text-red-600">
                      {(apartmentData.restanteCurente || 0).toFixed(2)} RON
                    </td>
                    <td className="px-2 sm:px-3 py-2 text-sm font-medium text-orange-600">
                      {(apartmentData.penalitatiCurente || 0).toFixed(2)} RON
                    </td>
                    <td className="px-2 sm:px-3 py-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={apartmentData.restanteAjustate}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || /^\d*[.,]?\d*$/.test(value)) {
                            const normalizedValue = value.replace(',', '.');
                            const numericValue = normalizedValue === "" ? 0 : parseFloat(normalizedValue) || 0;
                            setAdjustModalData(prev => prev.map(item =>
                              item.apartmentId === apartmentData.apartmentId
                                ? { ...item, restanteAjustate: numericValue }
                                : item
                            ));
                          }
                        }}
                        className={`w-full p-1.5 border rounded-lg text-sm ${
                          (apartmentData.restanteAjustate || 0) !== (apartmentData.restanteCurente || 0)
                            ? 'border-orange-400 bg-orange-50 text-orange-900 font-semibold ring-1 ring-orange-200'
                            : 'border-gray-300'
                        }`}
                        placeholder="0"
                      />
                    </td>
                    <td className="px-2 sm:px-3 py-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={apartmentData.penalitatiAjustate}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || /^\d*[.,]?\d*$/.test(value)) {
                            const normalizedValue = value.replace(',', '.');
                            const numericValue = normalizedValue === "" ? 0 : parseFloat(normalizedValue) || 0;
                            setAdjustModalData(prev => prev.map(item =>
                              item.apartmentId === apartmentData.apartmentId
                                ? { ...item, penalitatiAjustate: numericValue }
                                : item
                            ));
                          }
                        }}
                        className={`w-full p-1.5 border rounded-lg text-sm ${
                          (apartmentData.penalitatiAjustate || 0) !== (apartmentData.penalitatiCurente || 0)
                            ? 'border-orange-400 bg-orange-50 text-orange-900 font-semibold ring-1 ring-orange-200'
                            : 'border-gray-300'
                        }`}
                        placeholder="0"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Butoane */}
        <div className="p-3 sm:p-4 bg-gray-50 border-t flex justify-end gap-2 sm:gap-3 flex-shrink-0">
          <button
            onClick={() => {
              setShowAdjustBalances(false);
              setAdjustModalData([]);
            }}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Anulează
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 sm:px-6 py-1.5 sm:py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <CheckSquare className="w-4 h-4" />
            Salvează
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdjustBalancesModal;
