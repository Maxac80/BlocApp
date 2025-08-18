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
  setMonthlyTables,
  forceRecalculate
}) => {
  if (!showAdjustBalances) return null;
  
  console.log('🔍 AdjustBalancesModal props:', { forceRecalculate: !!forceRecalculate });

  const handleSave = async () => {
    try {
      console.log('🔄 Începe salvarea ajustărilor...');
      console.log('📊 Date din modal:', adjustModalData);
      
      // Salvează local (solduri curente pentru luna actuală)
      adjustModalData.forEach(apartmentData => {
        const newBalance = {
          restante: Math.round(apartmentData.restanteAjustate * 100) / 100,
          penalitati: Math.round(apartmentData.penalitatiAjustate * 100) / 100
        };
        
        console.log(`💰 Salvez pentru ap. ${apartmentData.apartmentNumber}:`, {
          vechi: {
            restante: apartmentData.restanteCurente,
            penalitati: apartmentData.penalitatiCurente
          },
          nou: newBalance
        });
        
        setApartmentBalance(apartmentData.apartmentId, newBalance);
      });
      
      // Salvează în Firestore pentru soldurile curente
      await saveBalanceAdjustments(currentMonth, adjustModalData);
      
      // TODO: Dacă se dorește modificarea și a soldurilor inițiale în Firebase,
      // se poate adăuga aici logică pentru updateInitialBalances
      // Momentan ajustăm doar soldurile curente ale lunii
      
      setShowAdjustBalances(false);
      setAdjustModalData([]);
      
      // Forțează recalcularea completă a tabelului
      if (forceRecalculate) {
        console.log('🔄 Forțez recalcularea tabelului...');
        forceRecalculate();
        console.log('✅ Recalcularea forțată completă');
      } else {
        console.log('❌ forceRecalculate nu este disponibil');
      }
      
      alert('✅ Valorile au fost înlocuite cu succes! Tabelul de întreținere va fi recalculat.');
    } catch (error) {
      console.error('❌ Eroare la salvarea ajustărilor:', error);
      alert('❌ Eroare la salvarea ajustărilor: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 bg-indigo-50 border-b flex items-center justify-between">
          <h3 className="text-xl font-semibold">⚡ Ajustări Solduri - {currentMonth}</h3>
          <button
            onClick={() => setShowAdjustBalances(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <p className="text-sm text-gray-600 mb-4">
            <strong>Atenție:</strong> Valorile ajustate vor ÎNLOCUI complet restanțele și penalitățile curente din tabelul de întreținere. 
            Folosiți pentru corecții sau situații speciale.
          </p>
          
          {/* Totaluri */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border">
            <div className="text-center">
              <div className="text-sm text-gray-600">Total Restanțe - Valori Curente</div>
              <div className="text-lg font-bold text-red-600">
                {adjustModalData.reduce((sum, item) => sum + (item.restanteCurente || 0), 0).toFixed(2)} RON
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Total Penalități - Valori Curente</div>
              <div className="text-lg font-bold text-orange-600">
                {adjustModalData.reduce((sum, item) => sum + (item.penalitatiCurente || 0), 0).toFixed(2)} RON
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Total Restanțe - Valori NOI</div>
              <div className="text-lg font-bold text-blue-600">
                {adjustModalData.reduce((sum, item) => sum + (item.restanteAjustate || 0), 0).toFixed(2)} RON
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Total Penalități - Valori NOI</div>
              <div className="text-lg font-bold text-purple-600">
                {adjustModalData.reduce((sum, item) => sum + (item.penalitatiAjustate || 0), 0).toFixed(2)} RON
              </div>
            </div>
          </div>
          
          {/* Diferențe/Impact */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-center">
              <div className="text-sm text-gray-600">Diferență Restanțe (Valori NOI vs Valori Vechi)</div>
              <div className={`text-lg font-bold ${
                (adjustModalData.reduce((sum, item) => sum + (item.restanteAjustate || 0), 0) - 
                 adjustModalData.reduce((sum, item) => sum + (item.restanteCurente || 0), 0)) >= 0 
                ? 'text-green-600' : 'text-red-600'
              }`}>
                {(adjustModalData.reduce((sum, item) => sum + (item.restanteAjustate || 0), 0) - 
                  adjustModalData.reduce((sum, item) => sum + (item.restanteCurente || 0), 0)) >= 0 
                  ? '+' : ''}{(adjustModalData.reduce((sum, item) => sum + (item.restanteAjustate || 0), 0) - 
                  adjustModalData.reduce((sum, item) => sum + (item.restanteCurente || 0), 0)).toFixed(2)} RON
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {(adjustModalData.reduce((sum, item) => sum + (item.restanteAjustate || 0), 0) - 
                 adjustModalData.reduce((sum, item) => sum + (item.restanteCurente || 0), 0)) >= 0 
                ? 'Creștere' : 'Reducere'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Diferență Penalități (Valori NOI vs Valori Vechi)</div>
              <div className={`text-lg font-bold ${
                (adjustModalData.reduce((sum, item) => sum + (item.penalitatiAjustate || 0), 0) - 
                 adjustModalData.reduce((sum, item) => sum + (item.penalitatiCurente || 0), 0)) >= 0 
                ? 'text-green-600' : 'text-red-600'
              }`}>
                {(adjustModalData.reduce((sum, item) => sum + (item.penalitatiAjustate || 0), 0) - 
                  adjustModalData.reduce((sum, item) => sum + (item.penalitatiCurente || 0), 0)) >= 0 
                  ? '+' : ''}{(adjustModalData.reduce((sum, item) => sum + (item.penalitatiAjustate || 0), 0) - 
                  adjustModalData.reduce((sum, item) => sum + (item.penalitatiCurente || 0), 0)).toFixed(2)} RON
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {(adjustModalData.reduce((sum, item) => sum + (item.penalitatiAjustate || 0), 0) - 
                 adjustModalData.reduce((sum, item) => sum + (item.penalitatiCurente || 0), 0)) >= 0 
                ? 'Creștere' : 'Reducere'}
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Apartament</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Proprietar</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Restanță - Valoare Curentă</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Penalități - Valoare Curentă</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Restanță - Valoare NOUĂ</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Penalități - Valoare NOUĂ</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {adjustModalData.map(apartmentData => (
                  <tr key={apartmentData.apartmentId} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-semibold">Ap. {apartmentData.apartmentNumber}</td>
                    <td className="px-3 py-2 text-sm">{apartmentData.owner}</td>
                    <td className="px-3 py-2 font-medium text-red-600">
                      {(apartmentData.restanteCurente || 0).toFixed(2)} RON
                    </td>
                    <td className="px-3 py-2 font-medium text-orange-600">
                      {(apartmentData.penalitatiCurente || 0).toFixed(2)} RON
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
                            const numericValue = normalizedValue === "" ? 0 : parseFloat(normalizedValue) || 0;
                            console.log(`🔄 Update restante ap. ${apartmentData.apartmentNumber}: "${value}" -> ${numericValue}`);
                            setAdjustModalData(prev => prev.map(item => 
                              item.apartmentId === apartmentData.apartmentId 
                                ? { ...item, restanteAjustate: numericValue }
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
                            const numericValue = normalizedValue === "" ? 0 : parseFloat(normalizedValue) || 0;
                            console.log(`🔄 Update penalitati ap. ${apartmentData.apartmentNumber}: "${value}" -> ${numericValue}`);
                            setAdjustModalData(prev => prev.map(item => 
                              item.apartmentId === apartmentData.apartmentId 
                                ? { ...item, penalitatiAjustate: numericValue }
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
            ✅ Înlocuiește Valorile
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdjustBalancesModal;