import React from 'react';

const InitialBalancesModal = ({
  showInitialBalances,
  setShowInitialBalances,
  getAssociationApartments,
  getApartmentBalance,
  setApartmentBalance,
  saveInitialBalances
}) => {
  if (!showInitialBalances) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-yellow-800">⚡ Configurare Solduri Inițiale</h3>
          <p className="text-yellow-700 text-sm">Este prima utilizare a aplicației. Introduceți soldurile existente din luna anterioară.</p>
        </div>
        <button
          onClick={() => setShowInitialBalances(!showInitialBalances)}
          className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
        >
          {showInitialBalances ? "Închide" : "Configurează Solduri"}
        </button>
      </div>
      
      <div className="mt-4 bg-white rounded-lg p-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Apartament</th>
                <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Proprietar</th>
                <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Restanță anterioară (RON)</th>
                <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Penalități anterioare (RON)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {getAssociationApartments().map(apartment => {
                const balance = getApartmentBalance(apartment.id);
                return (
                  <tr key={apartment.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-semibold">Ap. {apartment.number}</td>
                    <td className="px-3 py-2 text-sm">{apartment.owner}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={balance.restante || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || /^\d*[.,]?\d*$/.test(value)) {
                            const normalizedValue = value.replace(',', '.');
                            setApartmentBalance(apartment.id, {
                              ...balance,
                              restante: Math.round((parseFloat(normalizedValue) || 0) * 100) / 100
                            });
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
                        value={balance.penalitati || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || /^\d*[.,]?\d*$/.test(value)) {
                            const normalizedValue = value.replace(',', '.');
                            setApartmentBalance(apartment.id, {
                              ...balance,
                              penalitati: Math.round((parseFloat(normalizedValue) || 0) * 100) / 100
                            });
                          }
                        }}
                        className="w-full p-1 border rounded text-sm"
                        placeholder="0"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={saveInitialBalances}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
          >
            Salvează Solduri Inițiale
          </button>
        </div>
      </div>
    </div>
  );
};

export default InitialBalancesModal;