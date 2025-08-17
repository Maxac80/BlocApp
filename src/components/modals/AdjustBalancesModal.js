import React from 'react';
import { XCircle } from 'lucide-react';

const AdjustBalancesModal = ({
  showAdjustBalances,
  setShowAdjustBalances,
  currentMonth,
  adjustModalData,
  setAdjustModalData,
  setApartmentBalance,
  saveBalanceAdjustments,
  association,
  setMonthlyTables
}) => {
  if (!showAdjustBalances) return null;

  const handleSave = async () => {
    try {
      // Salvează local (solduri curente pentru luna actuală)
      adjustModalData.forEach(apartmentData => {
        setApartmentBalance(apartmentData.apartmentId, {
          restante: Math.round(apartmentData.restanteAjustate * 100) / 100,
          penalitati: Math.round(apartmentData.penalitatiAjustate * 100) / 100
        });
      });
      
      // Salvează în Firestore pentru soldurile curente
      await saveBalanceAdjustments(currentMonth, adjustModalData);
      
      // TODO: Dacă se dorește modificarea și a soldurilor inițiale în Firebase,
      // se poate adăuga aici logică pentru updateInitialBalances
      // Momentan ajustăm doar soldurile curente ale lunii
      
      setShowAdjustBalances(false);
      setAdjustModalData([]);
      
      // Invalidează cache-ul tabelelor pentru recalculare
      const key = `${association?.id}-${currentMonth}`;
      setMonthlyTables(prev => {
        const newTables = { ...prev };
        delete newTables[key];
        return newTables;
      });
      
      alert('✅ Ajustările au fost salvate cu succes!');
    } catch (error) {
      console.error('❌ Eroare la salvarea ajustărilor:', error);
      alert('❌ Eroare la salvarea ajustărilor: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 bg-indigo-50 border-b flex items-center justify-between">
          <h3 className="text-xl font-semibold">⚡ Ajustări Solduri - {currentMonth}</h3>
          <button
            onClick={() => setShowAdjustBalances(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
          <p className="text-sm text-gray-600 mb-4">
            Ajustați manual restanțele și penalitățile pentru situații speciale (plăți parțiale, scutiri, corecții).
          </p>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Apartament</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Proprietar</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Restanță curentă</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Penalități curente</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Restanță ajustată</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Penalități ajustate</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {adjustModalData.map(apartmentData => (
                  <tr key={apartmentData.apartmentId} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-semibold">Ap. {apartmentData.apartmentNumber}</td>
                    <td className="px-3 py-2 text-sm">{apartmentData.owner}</td>
                    <td className="px-3 py-2 font-medium text-red-600">
                      {apartmentData.restanteCurente}
                    </td>
                    <td className="px-3 py-2 font-medium text-orange-600">
                      {apartmentData.penalitatiCurente}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={apartmentData.restanteAjustate}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || /^\d*[.,]?\d*$/.test(value)) {
                            const normalizedValue = value.replace(',', '.');
                            setAdjustModalData(prev => prev.map(item => 
                              item.apartmentId === apartmentData.apartmentId 
                                ? { ...item, restanteAjustate: parseFloat(normalizedValue) || 0 }
                                : item
                            ));
                          }
                        }}
                        className="w-full p-1 border rounded text-sm"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={apartmentData.penalitatiAjustate}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || /^\d*[.,]?\d*$/.test(value)) {
                            const normalizedValue = value.replace(',', '.');
                            setAdjustModalData(prev => prev.map(item => 
                              item.apartmentId === apartmentData.apartmentId 
                                ? { ...item, penalitatiAjustate: parseFloat(normalizedValue) || 0 }
                                : item
                            ));
                          }
                        }}
                        className="w-full p-1 border rounded text-sm"
                        placeholder="0"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="p-6 bg-gray-50 border-t flex justify-between">
          <button
            onClick={() => {
              setShowAdjustBalances(false);
              setAdjustModalData([]);
            }}
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
          >
            Anulează
          </button>

          <button
            onClick={handleSave}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
          >
            Salvează Ajustări
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdjustBalancesModal;