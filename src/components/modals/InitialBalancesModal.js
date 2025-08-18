import React, { useState, useEffect } from 'react';
import { XCircle, Save, AlertCircle } from 'lucide-react';

const InitialBalancesModal = ({
  showModal,
  setShowModal,
  apartments,
  blocks,
  stairs,
  onSaveBalances,
  isEditMode = false,
  // Legacy props pentru compatibilitate cu codul existent
  showInitialBalances,
  setShowInitialBalances,
  getAssociationApartments,
  getApartmentBalance,
  setApartmentBalance,
  saveInitialBalances
}) => {
  const [balances, setBalances] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Pentru compatibilitate cu implementarea existentă
  const isLegacyMode = !showModal && showInitialBalances !== undefined;
  const actualShowModal = isLegacyMode ? showInitialBalances : showModal;
  const actualApartments = isLegacyMode ? (getAssociationApartments ? getAssociationApartments() : []) : apartments;

  // Inițializează soldurile când se deschide modalul
  useEffect(() => {
    if (actualShowModal && actualApartments.length > 0) {
      if (isLegacyMode) {
        // Mod legacy - folosește funcțiile existente
        return;
      }
      
      const initialBalances = {};
      actualApartments.forEach(apt => {
        initialBalances[apt.id] = {
          restante: apt.initialBalance?.restante || 0,
          penalitati: apt.initialBalance?.penalitati || 0
        };
      });
      setBalances(initialBalances);
    }
  }, [actualShowModal, actualApartments, isLegacyMode]);

  if (!actualShowModal) return null;

  // Render legacy pentru codul existent
  if (isLegacyMode) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl max-w-6xl max-h-[90vh] w-full overflow-hidden">
          <div className="bg-yellow-50 border-b border-yellow-200 p-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-yellow-800">⚡ Configurare Solduri Inițiale</h3>
              <p className="text-yellow-700 text-sm">Introduceți soldurile existente din luna anterioară.</p>
            </div>
            <button
              onClick={() => setShowInitialBalances(false)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              title="Închide"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
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
                {actualApartments.map(apartment => {
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
      </div>
    );
  }

  // Grupează apartamentele pe blocuri și scări pentru noul modal
  const getGroupedApartments = () => {
    const grouped = {};
    
    actualApartments.forEach(apartment => {
      const stair = stairs?.find(s => s.id === apartment.stairId);
      const block = blocks?.find(b => b.id === stair?.blockId);
      
      const blockName = block?.name || 'Necunoscut';
      const stairName = stair?.name || 'Necunoscută';
      
      if (!grouped[blockName]) {
        grouped[blockName] = {};
      }
      if (!grouped[blockName][stairName]) {
        grouped[blockName][stairName] = [];
      }
      
      grouped[blockName][stairName].push(apartment);
    });
    
    return grouped;
  };

  const handleInputChange = (apartmentId, field, value) => {
    // Validare input numeric
    if (value === "" || /^\d*[.,]?\d*$/.test(value)) {
      const normalizedValue = value.replace(',', '.');
      setBalances(prev => ({
        ...prev,
        [apartmentId]: {
          ...prev[apartmentId],
          [field]: normalizedValue
        }
      }));
    }
  };

  const handleBlur = (apartmentId, field) => {
    const value = balances[apartmentId]?.[field] || '0';
    const numericValue = parseFloat(value) || 0;
    setBalances(prev => ({
      ...prev,
      [apartmentId]: {
        ...prev[apartmentId],
        [field]: numericValue
      }
    }));
  };

  const handleCompleteZero = () => {
    const zeroBalances = {};
    actualApartments.forEach(apt => {
      zeroBalances[apt.id] = {
        restante: 0,
        penalitati: 0
      };
    });
    setBalances(zeroBalances);
  };

  const calculateTotals = () => {
    let totalRestante = 0;
    let totalPenalitati = 0;
    let apartmentsWithDebt = 0;

    Object.values(balances).forEach(balance => {
      const restante = parseFloat(balance.restante) || 0;
      const penalitati = parseFloat(balance.penalitati) || 0;
      
      totalRestante += restante;
      totalPenalitati += penalitati;
      
      if (restante > 0 || penalitati > 0) {
        apartmentsWithDebt++;
      }
    });

    return { totalRestante, totalPenalitati, apartmentsWithDebt };
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Pregătește datele pentru salvare
      const balancesData = Object.entries(balances).map(([apartmentId, balance]) => ({
        apartmentId,
        restante: parseFloat(balance.restante) || 0,
        penalitati: parseFloat(balance.penalitati) || 0
      }));

      await onSaveBalances(balancesData);
      setShowModal(false);
    } catch (error) {
      console.error('Eroare la salvarea soldurilor:', error);
      alert('Eroare la salvarea soldurilor. Vă rugăm încercați din nou.');
    } finally {
      setIsSaving(false);
    }
  };

  const groupedApartments = getGroupedApartments();
  const totals = calculateTotals();

  // Noul modal complet
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 bg-indigo-50 border-b flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">
              💰 {isEditMode ? 'Ajustare Solduri Inițiale' : 'Configurare Solduri Inițiale'}
            </h3>
            {!isEditMode && (
              <p className="text-sm text-gray-600 mt-1">
                Introduceți restanțele și penalitățile acumulate până la începerea utilizării BlocApp
              </p>
            )}
          </div>
          <button
            onClick={() => setShowModal(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Alert pentru wizard */}
        {!isEditMode && (
          <div className="mx-6 mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">Pas obligatoriu pentru prima utilizare</p>
              <p className="text-yellow-700 mt-1">
                Introduceți soldurile existente pentru fiecare apartament. Dacă nu există restanțe, 
                folosiți butonul "Completează 0 la toți" și apoi salvați.
              </p>
            </div>
          </div>
        )}

        {/* Statistici rapide */}
        <div className="p-6 pb-3">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Total apartamente</div>
              <div className="text-xl font-bold text-blue-600">{actualApartments.length}</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Cu restanțe</div>
              <div className="text-xl font-bold text-red-600">{totals.apartmentsWithDebt}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Fără restanțe</div>
              <div className="text-xl font-bold text-green-600">
                {actualApartments.length - totals.apartmentsWithDebt}
              </div>
            </div>
          </div>
        </div>

        {/* Tabel cu apartamente */}
        <div className="flex-1 overflow-y-auto p-6 pt-0">
          <div className="space-y-6">
            {Object.entries(groupedApartments).map(([blockName, blockStairs]) => (
              <div key={blockName} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 font-semibold">
                  Bloc {blockName}
                </div>
                
                {Object.entries(blockStairs).map(([stairName, stairApartments]) => (
                  <div key={stairName} className="border-t">
                    <div className="bg-gray-50 px-4 py-2 text-sm font-medium">
                      Scara {stairName}
                    </div>
                    
                    <div className="p-4">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-sm text-gray-600 border-b">
                            <th className="pb-2">Ap.</th>
                            <th className="pb-2">Proprietar</th>
                            <th className="pb-2 text-right">Restanțe (lei)</th>
                            <th className="pb-2 text-right">Penalități (lei)</th>
                            <th className="pb-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stairApartments
                            .sort((a, b) => a.number - b.number)
                            .map(apartment => {
                              const restante = parseFloat(balances[apartment.id]?.restante) || 0;
                              const penalitati = parseFloat(balances[apartment.id]?.penalitati) || 0;
                              const total = restante + penalitati;
                              
                              return (
                                <tr key={apartment.id} className="border-b">
                                  <td className="py-2 font-medium">{apartment.number}</td>
                                  <td className="py-2 text-sm">{apartment.owner}</td>
                                  <td className="py-2">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={balances[apartment.id]?.restante || ''}
                                      onChange={(e) => handleInputChange(apartment.id, 'restante', e.target.value)}
                                      onBlur={() => handleBlur(apartment.id, 'restante')}
                                      className="w-24 px-2 py-1 border rounded text-right text-sm"
                                      placeholder="0.00"
                                    />
                                  </td>
                                  <td className="py-2">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={balances[apartment.id]?.penalitati || ''}
                                      onChange={(e) => handleInputChange(apartment.id, 'penalitati', e.target.value)}
                                      onBlur={() => handleBlur(apartment.id, 'penalitati')}
                                      className="w-24 px-2 py-1 border rounded text-right text-sm"
                                      placeholder="0.00"
                                    />
                                  </td>
                                  <td className="py-2 text-right font-semibold">
                                    {total > 0 && (
                                      <span className="text-red-600">{total.toFixed(2)} lei</span>
                                    )}
                                    {total === 0 && (
                                      <span className="text-green-600">-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Footer cu totaluri și acțiuni */}
        <div className="p-6 bg-gray-50 border-t">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-6">
              <div>
                <span className="text-sm text-gray-600">Total restanțe:</span>
                <span className="ml-2 font-bold text-red-600">
                  {totals.totalRestante.toFixed(2)} lei
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Total penalități:</span>
                <span className="ml-2 font-bold text-orange-600">
                  {totals.totalPenalitati.toFixed(2)} lei
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600">TOTAL GENERAL:</span>
                <span className="ml-2 font-bold text-lg text-gray-800">
                  {(totals.totalRestante + totals.totalPenalitati).toFixed(2)} lei
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={handleCompleteZero}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center gap-2"
            >
              Completează 0 la toți
            </button>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
              >
                Anulează
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Se salvează...' : 'Salvează și continuă'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InitialBalancesModal;