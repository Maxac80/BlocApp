import React from 'react';

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Determină blocul și scara pentru filtrul activ
 */
export const getFilterInfo = (selectedStairTab, stairs, blocks) => {
  if (selectedStairTab === 'all') return { type: 'all' };

  const selectedStair = stairs?.find(s => s.id === selectedStairTab);
  if (!selectedStair) return { type: 'all' };

  const selectedBlock = blocks?.find(b => b.id === selectedStair.blockId);
  return {
    type: 'stair',
    stairId: selectedStair.id,
    blockId: selectedBlock?.id,
    stairName: selectedStair.name,
    blockName: selectedBlock?.name
  };
};

/**
 * Filtrează apartamentele pe baza filtrului activ
 */
export const getFilteredApartments = (getAssociationApartments, selectedStairTab, stairs, blocks) => {
  const allApartments = getAssociationApartments();
  const filterInfo = getFilterInfo(selectedStairTab, stairs, blocks);

  if (filterInfo.type === 'all') return allApartments;

  return allApartments.filter(apt => apt.stairId === filterInfo.stairId);
};

/**
 * Calculează status pentru o cheltuială (completitudine)
 */
export const getExpenseStatus = (
  expenseTypeName,
  getDistributedExpense,
  getExpenseConfig,
  apartments,
  currentSheet
) => {
  const expense = getDistributedExpense(expenseTypeName);
  const config = getExpenseConfig(expenseTypeName);
  const isConsumption = config.distributionType === 'consumption';

  // Filtrează apartamentele EXCLUSE din calcul (nu participă deloc)
  const apartmentParticipations = config.apartmentParticipation || {};
  const nonExcludedApartments = apartments.filter(apt => {
    const participation = apartmentParticipations[apt.id];
    return participation?.type !== 'excluded';
  });

  // Obține datele din expense SAU din pending
  let dataObject = {};
  if (expense) {
    dataObject = isConsumption ? (expense.consumption || {}) : (expense.individualAmounts || {});
  } else {
    // Cheltuială nedistribuită - verifică pending data
    if (isConsumption) {
      dataObject = currentSheet?.pendingConsumptions?.[expenseTypeName] || {};
    } else {
      dataObject = currentSheet?.pendingIndividualAmounts?.[expenseTypeName] || {};
    }
  }

  // Calculează doar pentru apartamentele NON-EXCLUSE
  const completed = nonExcludedApartments.filter(apt => {
    const value = dataObject?.[apt.id];
    return value && parseFloat(value) >= 0;
  }).length;

  return {
    status: expense
      ? (completed === nonExcludedApartments.length ? 'complete' : 'incomplete')
      : 'not_distributed',
    completed,
    total: nonExcludedApartments.length,
    isComplete: completed === nonExcludedApartments.length && nonExcludedApartments.length > 0
  };
};

/**
 * Calculează totalurile pentru toate cheltuielile
 */
export const calculateTotals = (
  allConsumptionTypes,
  getDistributedExpense,
  getExpenseConfig,
  apartments,
  stairs,
  selectedStairTab,
  blocks
) => {
  const filterInfo = getFilterInfo(selectedStairTab, stairs, blocks);
  let totalIntrodus = 0;
  let totalAsteptat = 0;
  let allKnowExpectedAmount = true;

  allConsumptionTypes.forEach(expenseType => {
    const expense = getDistributedExpense(expenseType.name);
    if (!expense) {
      allKnowExpectedAmount = false;
      return;
    }

    const config = getExpenseConfig(expenseType.name);
    const isConsumption = config.distributionType === 'consumption';

    // Mapează receptionMode
    let receptionMode = expense.receptionMode || 'total';
    // expenseEntryMode removed - using receptionMode directly

    // Determină dacă știm suma așteptată pentru această cheltuială
    let knowsExpectedAmount = filterInfo.type === 'all';
    if (!knowsExpectedAmount && filterInfo.type === 'stair') {
      if (receptionMode === 'per_stair') {
        knowsExpectedAmount = true;
      } else if (receptionMode === 'per_block') {
        const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
        knowsExpectedAmount = blockStairs.length === 1;
      }
    }

    // Calculează suma introdusă
    const apartmentParticipations = config.apartmentParticipation || {};
    const nonExcludedApartments = apartments.filter(apt => {
      const participation = apartmentParticipations[apt.id];
      return participation?.type !== 'excluded';
    });

    let sumaIntrodusa = 0;
    if (isConsumption && expense.consumption) {
      nonExcludedApartments.forEach(apt => {
        sumaIntrodusa += parseFloat(expense.consumption[apt.id] || 0) * (expense.unitPrice || 0);
      });
    } else if (!isConsumption && expense.individualAmounts) {
      nonExcludedApartments.forEach(apt => {
        sumaIntrodusa += parseFloat(expense.individualAmounts[apt.id] || 0);
      });
    }

    totalIntrodus += sumaIntrodusa;

    // Calculează suma așteptată
    if (knowsExpectedAmount) {
      let sumaAsteptata = 0;
      if (filterInfo.type === 'all') {
        sumaAsteptata = isConsumption && expense.billAmount ? expense.billAmount : expense.amount;
      } else if (receptionMode === 'per_stair' && expense.amountsByStair) {
        sumaAsteptata = parseFloat(expense.amountsByStair[filterInfo.stairId] || 0);
      } else if (receptionMode === 'per_block' && expense.amountsByBlock && filterInfo.blockId) {
        const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
        if (blockStairs.length === 1) {
          sumaAsteptata = parseFloat(expense.amountsByBlock[filterInfo.blockId] || 0);
        }
      }
      totalAsteptat += sumaAsteptata;
    } else {
      allKnowExpectedAmount = false;
    }
  });

  return { totalIntrodus, totalAsteptat, allKnowExpectedAmount };
};

// ========================================
// BADGE COMPONENTS
// ========================================

/**
 * Badge pentru afișarea statusului completitudinii unei cheltuieli
 */
export const ExpenseStatusBadge = ({ status, isConsumption }) => {
  if (status.status === 'not_distributed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
        ⊘ Nedistribuită - {status.total} apartamente
      </span>
    );
  }

  if (status.isComplete) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
        ✓ {isConsumption ? 'Consumuri introduse' : 'Sume introduse'}: {status.completed}/{status.total} apartamente
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
      ⚠ {isConsumption ? 'Consumuri introduse' : 'Sume introduse'}: {status.completed}/{status.total} apartamente
    </span>
  );
};

/**
 * Componenta pentru afișarea diferenței (în header sau footer)
 */
export const ExpenseDifferenceDisplay = ({
  totalIntrodus,
  totalAsteptat,
  allKnowExpectedAmount,
  className = ""
}) => {
  if (!allKnowExpectedAmount) {
    // Placeholder invizibil când nu știm suma așteptată
    return <div className="mt-1 h-6"></div>;
  }

  const diferenta = totalIntrodus - totalAsteptat;
  // Fără TOLERANCE - afișăm diferență doar când există (>= 0.01)
  const hasDifference = Math.abs(diferenta) >= 0.01;

  if (hasDifference) {
    return (
      <div className={`mt-1 text-xs font-medium px-2 py-1 rounded bg-orange-100 text-orange-700 ${className}`}>
        ⚠ Diferență: {diferenta > 0 ? '+' : ''}{diferenta.toFixed(2)} RON
        {diferenta < 0 ? ' (lipsesc)' : ' (mai mult)'}
      </div>
    );
  }

  // Placeholder invizibil pentru aliniere
  return <div className="mt-1 h-6"></div>;
};

// ========================================
// TABLE COMPONENTS
// ========================================

/**
 * Tabel pentru afișarea și editarea consumurilor (indecși + consum)
 * IMPORTANT: Această componentă gestionează:
 * - Editare inline pentru indecși (vechi/nou)
 * - Editare inline pentru consum
 * - Optimistic UI updates prin localValues
 * - Suport pentru pending consumptions (cheltuieli nedistribuite)
 * - Diferență distribuită
 * - Participări (excluded, percentage, fixed)
 */
export const ConsumptionTable = ({
  apartments,
  config,
  expense,
  expenseTypeName,
  dataObject,
  currentSheet,
  isMonthReadOnly,
  localValues,
  setLocalValues,
  updateExpenseConsumption,
  updatePendingConsumption,
  updateExpenseIndexes,
  updatePendingIndexes,
  getAssociationApartments,
  calculateExpenseDifferences,
  getExpenseConfig,
  stairs,
  selectedStairTab,
  blocks
}) => {
  const indexTypes = config.indexConfiguration?.indexTypes || [];
  const inputMode = config.indexConfiguration?.inputMode || 'manual';

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 sticky top-0">
          <tr>
            {selectedStairTab === 'all' && (
              <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b-2 min-w-[140px]">Bloc - Scară</th>
            )}
            <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b-2 w-16">Apt</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b-2 min-w-[120px]">Proprietar</th>
            <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b-2 border-l w-20">Persoane</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b-2 border-l bg-amber-50 min-w-[120px]">
              Participare
            </th>

            {/* Coloane pentru contoare (INDEXES sau MIXED) */}
            {inputMode !== 'manual' && indexTypes.length > 0 && (
              indexTypes.map(indexType => (
                <React.Fragment key={indexType.id}>
                  <th className="px-2 py-2 text-center font-semibold text-gray-700 border-b-2 border-l bg-blue-50" colSpan="2">
                    {indexType.name}
                  </th>
                </React.Fragment>
              ))
            )}

            {/* Coloană consum */}
            <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b-2 border-l bg-green-50">
              Consum
              <div className="text-[10px] font-normal text-gray-500">({config.consumptionUnit || 'mc'})</div>
            </th>

            {/* Coloană total RON (doar dacă avem preț unitar) */}
            {expense?.unitPrice && (
              <th className="px-3 py-2 text-right font-semibold text-gray-700 border-b-2 border-l bg-purple-50">
                Total (RON)
              </th>
            )}

            {/* Coloană sumă după participare */}
            <th className="px-3 py-2 text-right font-semibold text-gray-700 border-b-2 border-l bg-teal-50">
              După participare (RON)
            </th>

            {/* Coloană diferență distribuită - doar pentru consumption cu isUnitBased */}
            {expense?.isUnitBased && expense?.billAmount && (
              <th className="px-2 py-2 text-right font-semibold text-gray-700 border-b-2 border-l bg-orange-50">
                Diferență distribuită (RON)
                <div className="text-[10px] font-normal text-gray-500 leading-relaxed mt-1 space-y-0.5">
                  {(() => {
                    // Configurație default dacă nu există
                    const diffConfig = config?.differenceDistribution || {
                      method: 'apartment',
                      adjustmentMode: 'none',
                      includeExcludedInDifference: false,
                      includeFixedAmountInDifference: false
                    };

                    // Linia 0: Mod introducere sume (pe scară/bloc/asociație)
                    let receptionMode = expense.receptionMode || 'total';
                    if (expense.expenseEntryMode) {
                      if (expense.expenseEntryMode === 'building') receptionMode = 'per_block';
                      else if (expense.expenseEntryMode === 'staircase') receptionMode = 'per_stair';
                      else if (expense.expenseEntryMode === 'per_association') receptionMode = 'total';
                    }

                    let receptionText = '';
                    switch (receptionMode) {
                      case 'per_stair': receptionText = '📍 Sume pe scară'; break;
                      case 'per_block': receptionText = '📍 Sume pe bloc'; break;
                      case 'total': receptionText = '📍 Sumă pe asociație'; break;
                      default: receptionText = '📍 ' + receptionMode;
                    }

                    // Linia 1: Metoda de distribuție
                    let method = '';
                    switch (diffConfig.method) {
                      case 'apartment': method = 'Egal pe apartament'; break;
                      case 'consumption': method = 'Proporțional cu consumul'; break;
                      case 'person': method = 'Proporțional cu persoanele'; break;
                      default: method = 'Necunoscută';
                    }

                    // Linia 2: Mod de ajustare
                    let adjustment = '';
                    if (diffConfig.adjustmentMode === 'participation') {
                      adjustment = '+ Respectă participările';
                    } else if (diffConfig.adjustmentMode === 'apartmentType') {
                      adjustment = '+ Ajustare pe tip apt';
                    } else {
                      adjustment = 'Fără ajustări';
                    }

                    // Linia 3: Opțiuni suplimentare
                    const options = [];
                    if (diffConfig.includeFixedAmountInDifference) {
                      options.push('Include sumă fixă');
                    }
                    if (diffConfig.includeExcludedInDifference) {
                      options.push('Include excluse');
                    }

                    return (
                      <>
                        <div className="font-medium text-indigo-600">{receptionText}</div>
                        <div>{method}</div>
                        <div>{adjustment}</div>
                        {options.length > 0 && <div>({options.join(', ')})</div>}
                      </>
                    );
                  })()}
                </div>
              </th>
            )}
          </tr>
          {/* Sub-header pentru Vechi/Nou */}
          {inputMode !== 'manual' && indexTypes.length > 0 && (
            <tr className="bg-blue-50 text-xs">
              <th className="border-b"></th>
              <th className="border-b"></th>
              <th className="border-b border-l"></th>
              <th className="border-b border-l"></th>
              {indexTypes.map(indexType => (
                <React.Fragment key={indexType.id}>
                  <th className="px-2 py-1 text-center text-gray-600 border-b border-l">Vechi</th>
                  <th className="px-2 py-1 text-center text-gray-600 border-b">Nou</th>
                </React.Fragment>
              ))}
              <th className="border-b border-l"></th>
              {expense?.unitPrice && <th className="border-b border-l"></th>}
              <th className="border-b border-l"></th>
              {expense?.isUnitBased && expense?.billAmount && <th className="border-b border-l"></th>}
            </tr>
          )}
        </thead>
        <tbody>
          {apartments.map(apartment => {
            // Obține datele de indecși
            let indexesData = {};
            if (expense) {
              indexesData = expense.indexes?.[apartment.id] || {};
            } else {
              indexesData = currentSheet?.pendingIndexes?.[expenseTypeName]?.[apartment.id] || {};
            }

            // Obține consum manual/total
            const manualValue = String(dataObject[apartment.id] || '');

            // Calculează consum total din indecși - verifică OPTIMISTIC values first
            const totalIndexConsumption = indexTypes.reduce((sum, indexType) => {
              const indexData = indexesData[indexType.id];

              // Verifică local values first, apoi Firebase
              const localOld = localValues[`${expenseTypeName}-${apartment.id}-index-${indexType.id}-old`];
              const localNew = localValues[`${expenseTypeName}-${apartment.id}-index-${indexType.id}-new`];

              const oldIndex = localOld !== undefined ? localOld : indexData?.oldIndex;
              const newIndex = localNew !== undefined ? localNew : indexData?.newIndex;

              if (newIndex && oldIndex) {
                return sum + (parseFloat(newIndex) - parseFloat(oldIndex));
              }
              return sum;
            }, 0);

            // Verifică local values FIRST pentru hasManualValue
            const localConsumption = localValues[`${expenseTypeName}-${apartment.id}-consumption`];

            const effectiveManualValue = localConsumption !== undefined ? localConsumption : manualValue;

            const hasIndexData = totalIndexConsumption > 0;
            // ZERO este o valoare validă de completare
            const hasManualValue = effectiveManualValue !== '' && effectiveManualValue !== null && effectiveManualValue !== undefined && !isNaN(parseFloat(effectiveManualValue));

            // Pentru MIXED: auto-fill consum din indecși dacă există
            const displayedConsumption = String((inputMode === 'mixed' && hasIndexData && !hasManualValue)
              ? totalIndexConsumption.toFixed(2)
              : manualValue);

            // Verifică dacă e complet
            const isComplete = (inputMode === 'manual' && hasManualValue) ||
                               (inputMode === 'indexes' && hasIndexData) ||
                               (inputMode === 'mixed' && (hasIndexData || hasManualValue));

            // Verifică dacă apartamentul este exclus din această cheltuială
            const apartmentParticipations = config.apartmentParticipation || {};
            const participation = apartmentParticipations[apartment.id];

            // Verifică dacă e exclus - participation este obiect { type: 'excluded' }
            const isExcluded = participation?.type === 'excluded';

            const isDisabled = isMonthReadOnly || isExcluded;

            // Calculează totalul final pentru acest apartament
            let finalConsumption = 0;
            if (inputMode === 'indexes') {
              finalConsumption = totalIndexConsumption;
            } else if (inputMode === 'mixed') {
              finalConsumption = hasManualValue ? parseFloat(manualValue) : totalIndexConsumption;
            } else {
              finalConsumption = parseFloat(manualValue) || 0;
            }

            return (
              <tr
                key={apartment.id}
                className={`border-b ${
                  isExcluded
                    ? 'bg-gray-100 opacity-60'
                    : !isComplete && !isDisabled
                      ? 'bg-orange-50 hover:bg-orange-100'
                      : 'hover:bg-gray-50'
                }`}
              >
                {/* Bloc - Scară (doar când selectedStairTab === 'all') */}
                {selectedStairTab === 'all' && (() => {
                  const stair = stairs?.find(s => s.id === apartment.stairId);
                  const block = blocks?.find(b => b.id === stair?.blockId);
                  return (
                    <td className="px-3 py-2 text-gray-600 text-sm">
                      {block?.name || '-'} - {stair?.name || '-'}
                    </td>
                  );
                })()}

                {/* Apt */}
                <td className="px-3 py-2 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="inline-block min-w-[40px]">{apartment.number}</span>
                    {!isComplete && !isDisabled && !isExcluded && <span className="text-orange-500 text-xs">⚠</span>}
                  </div>
                </td>

                {/* Proprietar */}
                <td className="px-3 py-2 text-gray-600 truncate max-w-[150px]" title={apartment.owner}>
                  {apartment.owner || '-'}
                </td>

                {/* Persoane */}
                <td className="px-3 py-2 text-center font-medium border-l">
                  {apartment.persons || 0}
                </td>

                {/* Participare */}
                <td className="px-3 py-2 text-gray-700 border-l bg-amber-50">
                  {(() => {
                    if (participation?.type === 'excluded') {
                      return <span className="text-red-600 font-medium">Exclus</span>;
                    } else if (participation?.type === 'percentage') {
                      const percent = participation.value;
                      return <span className="text-blue-600 font-medium">Procent {percent}%</span>;
                    } else if (participation?.type === 'fixed') {
                      const fixedMode = config?.fixedAmountMode || 'apartment';
                      const value = participation.value;
                      return <span className="text-purple-600 font-medium">Sumă fixă {value} RON{fixedMode === 'person' ? '/pers' : ''}</span>;
                    } else {
                      return <span className="text-green-600 font-medium">Integral</span>;
                    }
                  })()}
                </td>

                {/* Contoare: Vechi | Nou (INDEXES sau MIXED) */}
                {inputMode !== 'manual' && indexTypes.length > 0 && indexTypes.map(indexType => {
                  const rawIndexData = indexesData[indexType.id] || {};
                  const indexData = {
                    oldIndex: String(rawIndexData.oldIndex || ''),
                    newIndex: String(rawIndexData.newIndex || ''),
                    meterName: rawIndexData.meterName
                  };

                  return (
                    <React.Fragment key={indexType.id}>
                      {/* Index Vechi */}
                      <td className="px-2 py-1 text-center border-l">
                        {isDisabled ? (
                          <span className="text-gray-600 text-xs">{isExcluded ? '-' : (indexData.oldIndex || '-')}</span>
                        ) : (
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="-"
                            value={localValues[`${expenseTypeName}-${apartment.id}-index-${indexType.id}-old`] ?? indexData.oldIndex}
                            onChange={(e) => {
                              const inputValue = e.target.value;
                              if (inputValue === "" || /^\d*[.,]?\d*$/.test(inputValue)) {
                                const normalizedValue = inputValue.replace(',', '.');

                                // Optimistic UI update
                                setLocalValues(prev => ({
                                  ...prev,
                                  [`${expenseTypeName}-${apartment.id}-index-${indexType.id}-old`]: normalizedValue
                                }));

                                const updatedIndexes = {
                                  ...indexesData,
                                  [indexType.id]: { ...indexData, oldIndex: normalizedValue, meterName: indexType.name }
                                };

                                if (expense) {
                                  updateExpenseIndexes(expense.id, apartment.id, updatedIndexes);
                                } else {
                                  updatePendingIndexes(expenseTypeName, apartment.id, updatedIndexes);
                                }

                                // MIXED: Auto-update consum când schimbi indecșii
                                if (inputMode === 'mixed' && indexData.newIndex && normalizedValue) {
                                  const autoConsumption = parseFloat(indexData.newIndex) - parseFloat(normalizedValue);
                                  if (autoConsumption > 0) {
                                    if (expense) {
                                      updateExpenseConsumption(expense.id, apartment.id, autoConsumption);
                                    } else {
                                      updatePendingConsumption(expenseTypeName, apartment.id, autoConsumption);
                                    }
                                  }
                                }
                              }
                            }}
                            className="w-16 px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                        )}
                      </td>

                      {/* Index Nou */}
                      <td className="px-2 py-1 text-center">
                        {isDisabled ? (
                          <span className="text-gray-600 text-xs">{isExcluded ? '-' : (indexData.newIndex || '-')}</span>
                        ) : (
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="-"
                            value={localValues[`${expenseTypeName}-${apartment.id}-index-${indexType.id}-new`] ?? indexData.newIndex}
                            onChange={(e) => {
                              const inputValue = e.target.value;
                              if (inputValue === "" || /^\d*[.,]?\d*$/.test(inputValue)) {
                                const normalizedValue = inputValue.replace(',', '.');

                                // Optimistic UI update
                                setLocalValues(prev => ({
                                  ...prev,
                                  [`${expenseTypeName}-${apartment.id}-index-${indexType.id}-new`]: normalizedValue
                                }));

                                const updatedIndexes = {
                                  ...indexesData,
                                  [indexType.id]: { ...indexData, newIndex: normalizedValue, meterName: indexType.name }
                                };
                                if (expense) {
                                  updateExpenseIndexes(expense.id, apartment.id, updatedIndexes);
                                } else {
                                  updatePendingIndexes(expenseTypeName, apartment.id, updatedIndexes);
                                }

                                // MIXED: Auto-update consum când schimbi indecșii
                                if (inputMode === 'mixed' && indexData.oldIndex && normalizedValue) {
                                  const autoConsumption = parseFloat(normalizedValue) - parseFloat(indexData.oldIndex);
                                  if (autoConsumption > 0) {
                                    if (expense) {
                                      updateExpenseConsumption(expense.id, apartment.id, autoConsumption);
                                    } else {
                                      updatePendingConsumption(expenseTypeName, apartment.id, autoConsumption);
                                    }
                                  }
                                }
                              }
                            }}
                            className="w-16 px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                        )}
                      </td>
                    </React.Fragment>
                  );
                })}

                {/* Coloană Consum */}
                <td className="px-3 py-2 text-center border-l bg-green-50">
                  {isDisabled ? (
                    <span className="text-gray-700 font-medium">{isExcluded ? '-' : (displayedConsumption || '-')}</span>
                  ) : inputMode === 'indexes' ? (
                    // INDEXES: read-only (calculat automat)
                    <span className={`font-medium ${hasIndexData ? 'text-blue-700' : 'text-gray-400'}`}>
                      {hasIndexData ? totalIndexConsumption.toFixed(2) : '-'}
                    </span>
                  ) : (
                    // MANUAL sau MIXED: editabil
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="-"
                      value={localValues[`${expenseTypeName}-${apartment.id}-consumption`] ?? displayedConsumption}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        if (inputValue === "" || /^\d*[.,]?\d*$/.test(inputValue)) {
                          const normalizedValue = inputValue.replace(',', '.');

                          // Optimistic UI update
                          setLocalValues(prev => ({
                            ...prev,
                            [`${expenseTypeName}-${apartment.id}-consumption`]: normalizedValue
                          }));

                          // Salvare în Firebase
                          if (expense) {
                            updateExpenseConsumption(expense.id, apartment.id, normalizedValue);
                          } else {
                            updatePendingConsumption(expenseTypeName, apartment.id, normalizedValue);
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const numericValue = parseFloat(e.target.value.replace(',', '.')) || 0;
                        if (expense) {
                          updateExpenseConsumption(expense.id, apartment.id, numericValue);
                        } else {
                          updatePendingConsumption(expenseTypeName, apartment.id, numericValue);
                        }
                      }}
                      className={`w-20 px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 text-center font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${!hasManualValue && !hasIndexData ? 'border-orange-300 bg-orange-50' : ''}`}
                    />
                  )}
                </td>

                {/* Total RON (doar dacă avem preț unitar) */}
                {expense?.unitPrice && (
                  <td className="px-3 py-2 text-right font-semibold border-l bg-purple-50 text-purple-700">
                    {isExcluded ? '-' : (finalConsumption > 0 ? (finalConsumption * expense.unitPrice).toFixed(2) : '-')}
                  </td>
                )}

                {/* După participare (RON) - suma finală după aplicarea participării */}
                <td className={`px-3 py-2 text-right font-semibold border-l ${
                  (() => {
                    // Marchează dacă participarea modifică suma (excluded, percentage sau fixed)
                    if (participation?.type === 'excluded' || participation?.type === 'percentage' || participation?.type === 'fixed') {
                      return 'bg-amber-100 text-amber-800';
                    }
                    return 'bg-teal-50 text-teal-700';
                  })()
                }`}>
                  {(() => {
                    // Exclus → 0
                    if (participation?.type === 'excluded') {
                      return '-';
                    }

                    // Calculează suma de bază
                    let baseAmount = 0;
                    if (expense?.unitPrice) {
                      baseAmount = finalConsumption * expense.unitPrice;
                    }

                    // Aplică participarea
                    if (participation?.type === 'fixed') {
                      // Sumă fixă - ignora consumul, afișează suma fixă
                      const fixedMode = config?.fixedAmountMode || 'apartment';
                      const fixedAmount = parseFloat(participation.value || 0);
                      if (fixedMode === 'person') {
                        return (fixedAmount * (apartment.persons || 0)).toFixed(2);
                      } else {
                        return fixedAmount.toFixed(2);
                      }
                    } else if (participation?.type === 'percentage') {
                      // Procent - aplică procentul
                      const percent = participation.value;
                      const multiplier = percent < 1 ? percent : (percent / 100);
                      return (baseAmount * multiplier).toFixed(2);
                    } else {
                      // Integral - afișează suma de bază
                      return baseAmount > 0 ? baseAmount.toFixed(2) : '-';
                    }
                  })()}
                </td>

                {/* Diferență distribuită - doar pentru consumption cu isUnitBased */}
                {expense?.isUnitBased && expense?.billAmount && (
                  <td className="px-2 py-2 text-right font-medium border-l bg-orange-50 text-orange-700">
                    {(() => {
                      // Folosește funcția de calcul din useMaintenanceCalculation
                      if (!expense || !calculateExpenseDifferences) {
                        return '-';
                      }

                      const allApartments = getAssociationApartments();
                      const expenseDifferences = calculateExpenseDifferences(expense, allApartments);
                      const apartmentDifference = expenseDifferences[apartment.id] || 0;

                      if (Math.abs(apartmentDifference) < 0.01) {
                        return '-';
                      }

                      return apartmentDifference.toFixed(2);
                    })()}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>

        {/* RÂND TOTAL */}
        <ConsumptionTableFooter
          apartments={apartments}
          config={config}
          expense={expense}
          expenseTypeName={expenseTypeName}
          inputMode={inputMode}
          indexTypes={indexTypes}
          getExpenseConfig={getExpenseConfig}
          getAssociationApartments={getAssociationApartments}
          calculateExpenseDifferences={calculateExpenseDifferences}
          stairs={stairs}
          selectedStairTab={selectedStairTab}
          blocks={blocks}
        />
      </table>
    </div>
  );
};

/**
 * Footer pentru tabelul de consumuri (rând TOTAL)
 */
const ConsumptionTableFooter = ({
  apartments,
  config,
  expense,
  expenseTypeName,
  inputMode,
  indexTypes,
  getExpenseConfig,
  getAssociationApartments,
  calculateExpenseDifferences,
  stairs,
  selectedStairTab,
  blocks
}) => {
  const isConsumption = true; // ConsumptionTable e doar pentru consumption

  return (
    <tfoot>
      <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
        <td colSpan={(selectedStairTab === 'all' ? 5 : 4) + (inputMode !== 'manual' && indexTypes.length > 0 ? indexTypes.length * 2 : 0)} className="px-2 py-2 text-right border-r">TOTAL:</td>

        {/* Consum total */}
        <td className="px-2 py-2 text-center text-blue-700 border-r">
          {(() => {
            const totalConsumption = apartments.reduce((sum, apt) => {
              let aptConsumption = 0;
              const indexes = expense?.indexes?.[apt.id];
              if (indexes) {
                Object.values(indexes).forEach(indexData => {
                  if (indexData.newIndex && indexData.oldIndex) {
                    aptConsumption += parseFloat(indexData.newIndex) - parseFloat(indexData.oldIndex);
                  }
                });
              } else {
                aptConsumption = parseFloat(expense?.consumption?.[apt.id] || 0);
              }
              return sum + aptConsumption;
            }, 0);
            return totalConsumption.toFixed(2);
          })()}
        </td>

        {/* Suma calculată ÎNAINTE de participare (doar dacă avem unitPrice - ca în header) */}
        {expense?.unitPrice && (
          <td className="px-2 py-2 border-r">
            <div className="text-right text-purple-700 font-bold">
              {(() => {
                const totalBeforeParticipation = apartments.reduce((sum, apt) => {
                  let aptAmount = 0;
                  let aptConsumption = 0;
                  const indexes = expense?.indexes?.[apt.id];
                  if (indexes) {
                    Object.values(indexes).forEach(indexData => {
                      if (indexData.newIndex && indexData.oldIndex) {
                        aptConsumption += parseFloat(indexData.newIndex) - parseFloat(indexData.oldIndex);
                      }
                    });
                  } else {
                    aptConsumption = parseFloat(expense?.consumption?.[apt.id] || 0);
                  }
                  aptAmount = aptConsumption * (expense?.unitPrice || 0);
                  return sum + aptAmount;
                }, 0);
                return totalBeforeParticipation.toFixed(2);
              })()}
            </div>
            {/* Diferența față de suma așteptată */}
            {expense?.billAmount && (() => {
              const filterInfo = getFilterInfo(selectedStairTab, stairs, blocks);
              let receptionMode = expense.receptionMode || 'total';
              if (expense.expenseEntryMode) {
                if (expense.expenseEntryMode === 'building') receptionMode = 'per_block';
                else if (expense.expenseEntryMode === 'staircase') receptionMode = 'per_stair';
                else if (expense.expenseEntryMode === 'per_association') receptionMode = 'total';
              }

              // Determină suma așteptată și apartamentele pentru calcul
              let expectedAmount = 0;
              let apartmentsForDiff = apartments; // Default: apartamente filtrate

              if (filterInfo.type === 'all') {
                expectedAmount = parseFloat(expense?.billAmount || 0);
                apartmentsForDiff = apartments;
              } else if (filterInfo.type === 'stair' && receptionMode === 'per_stair') {
                expectedAmount = parseFloat(expense?.amountsByStair?.[filterInfo.stairId] || 0);
                apartmentsForDiff = apartments;
              } else if (filterInfo.type === 'stair' && receptionMode === 'per_block' && filterInfo.blockId) {
                // Când filtrezi pe scară dar suma e pe bloc, calculează diferența la nivel de BLOC
                expectedAmount = parseFloat(expense?.amountsByBlock?.[filterInfo.blockId] || 0);
                const allApts = getAssociationApartments();
                const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
                const blockStairIds = blockStairs.map(s => s.id);
                apartmentsForDiff = allApts.filter(apt => blockStairIds.includes(apt.stairId));
              } else if (filterInfo.type === 'stair' && receptionMode === 'per_association') {
                // Când filtrezi pe scară dar suma e pe asociație, calculează diferența la nivel de ASOCIAȚIE
                expectedAmount = parseFloat(expense?.billAmount || 0);
                apartmentsForDiff = getAssociationApartments();
              }

              const totalBeforeParticipation = apartmentsForDiff.reduce((sum, apt) => {
                let aptAmount = 0;
                let aptConsumption = 0;
                const indexes = expense?.indexes?.[apt.id];
                if (indexes) {
                  Object.values(indexes).forEach(indexData => {
                    if (indexData.newIndex && indexData.oldIndex) {
                      aptConsumption += parseFloat(indexData.newIndex) - parseFloat(indexData.oldIndex);
                    }
                  });
                } else {
                  aptConsumption = parseFloat(expense?.consumption?.[apt.id] || 0);
                }
                aptAmount = aptConsumption * (expense?.unitPrice || 0);
                return sum + aptAmount;
              }, 0);

              // Diferență = calculat - așteptat (negativ = lipsă, pozitiv = în plus)
              const diff = totalBeforeParticipation - expectedAmount;

              if (Math.abs(diff) >= 0.01) {
                // Determină contextul diferenței
                let diferentaLabel = 'Diferență';
                if (filterInfo.type === 'stair' && receptionMode === 'per_block') {
                  diferentaLabel = 'Diferență pe bloc';
                } else if (filterInfo.type === 'stair' && receptionMode === 'per_association') {
                  diferentaLabel = 'Diferență pe asociație';
                }

                return (
                  <div className="text-xs text-orange-600 mt-1">
                    {diferentaLabel}: {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                  </div>
                );
              }
              return null;
            })()}
          </td>
        )}

        {/* Suma DUPĂ participare */}
        <td className="px-2 py-2 border-r">
          <div className="text-right text-green-700 font-bold">
            {(() => {
              const apartmentParticipations = config?.apartmentParticipation || {};

              const totalAfterParticipation = apartments.reduce((sum, apt) => {
                const participation = apartmentParticipations[apt.id];

                let aptAmount = 0;
                let aptConsumption = 0;
                const indexes = expense?.indexes?.[apt.id];
                if (indexes) {
                  Object.values(indexes).forEach(indexData => {
                    if (indexData.newIndex && indexData.oldIndex) {
                      aptConsumption += parseFloat(indexData.newIndex) - parseFloat(indexData.oldIndex);
                    }
                  });
                } else {
                  aptConsumption = parseFloat(expense?.consumption?.[apt.id] || 0);
                }
                aptAmount = aptConsumption * (expense?.unitPrice || 0);

                // Aplică participarea
                if (participation?.type === 'excluded') {
                  aptAmount = 0;
                } else if (participation?.type === 'percentage') {
                  const percent = participation.value;
                  const multiplier = percent < 1 ? percent : (percent / 100);
                  aptAmount = aptAmount * multiplier;
                } else if (participation?.type === 'fixed') {
                  const fixedMode = config?.fixedAmountMode || 'apartment';
                  const fixedAmount = parseFloat(participation.value || 0);
                  aptAmount = fixedMode === 'person' ? fixedAmount * (apt.persons || 0) : fixedAmount;
                }

                return sum + aptAmount;
              }, 0);
              return totalAfterParticipation.toFixed(2);
            })()}
          </div>
          {/* Diferența față de suma așteptată - după participare */}
          {expense?.billAmount && (() => {
            const filterInfo = getFilterInfo(selectedStairTab, stairs, blocks);
            let receptionMode = expense.receptionMode || 'total';
            if (expense.expenseEntryMode) {
              if (expense.expenseEntryMode === 'building') receptionMode = 'per_block';
              else if (expense.expenseEntryMode === 'staircase') receptionMode = 'per_stair';
              else if (expense.expenseEntryMode === 'per_association') receptionMode = 'total';
            }

            // Determină suma așteptată și apartamentele pentru calcul
            let expectedAmount = 0;
            let apartmentsForDiff = apartments; // Default: apartamente filtrate

            if (filterInfo.type === 'all') {
              expectedAmount = parseFloat(expense?.billAmount || 0);
              apartmentsForDiff = apartments;
            } else if (filterInfo.type === 'stair' && receptionMode === 'per_stair') {
              expectedAmount = parseFloat(expense?.amountsByStair?.[filterInfo.stairId] || 0);
              apartmentsForDiff = apartments;
            } else if (filterInfo.type === 'stair' && receptionMode === 'per_block' && filterInfo.blockId) {
              // Când filtrezi pe scară dar suma e pe bloc, calculează diferența la nivel de BLOC
              expectedAmount = parseFloat(expense?.amountsByBlock?.[filterInfo.blockId] || 0);
              const allApts = getAssociationApartments();
              const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
              const blockStairIds = blockStairs.map(s => s.id);
              apartmentsForDiff = allApts.filter(apt => blockStairIds.includes(apt.stairId));
            } else if (filterInfo.type === 'stair' && receptionMode === 'per_association') {
              // Când filtrezi pe scară dar suma e pe asociație, calculează diferența la nivel de ASOCIAȚIE
              expectedAmount = parseFloat(expense?.billAmount || 0);
              apartmentsForDiff = getAssociationApartments();
            }

            const apartmentParticipations = config?.apartmentParticipation || {};

            const totalAfterParticipation = apartmentsForDiff.reduce((sum, apt) => {
              const participation = apartmentParticipations[apt.id];

              let aptAmount = 0;
              let aptConsumption = 0;
              const indexes = expense?.indexes?.[apt.id];
              if (indexes) {
                Object.values(indexes).forEach(indexData => {
                  if (indexData.newIndex && indexData.oldIndex) {
                    aptConsumption += parseFloat(indexData.newIndex) - parseFloat(indexData.oldIndex);
                  }
                });
              } else {
                aptConsumption = parseFloat(expense?.consumption?.[apt.id] || 0);
              }
              aptAmount = aptConsumption * (expense?.unitPrice || 0);

              // Aplică participarea
              if (participation?.type === 'excluded') {
                aptAmount = 0;
              } else if (participation?.type === 'percentage') {
                const percent = participation.value;
                const multiplier = percent < 1 ? percent : (percent / 100);
                aptAmount = aptAmount * multiplier;
              } else if (participation?.type === 'fixed') {
                const fixedMode = config?.fixedAmountMode || 'apartment';
                const fixedAmount = parseFloat(participation.value || 0);
                aptAmount = fixedMode === 'person' ? fixedAmount * (apt.persons || 0) : fixedAmount;
              }

              return sum + aptAmount;
            }, 0);

            // Diferență = calculat - așteptat (negativ = lipsă, pozitiv = în plus)
            const diff = totalAfterParticipation - expectedAmount;

            if (Math.abs(diff) >= 0.01) {
              // Determină contextul diferenței
              let diferentaLabel = 'Diferență';
              if (filterInfo.type === 'stair' && receptionMode === 'per_block') {
                diferentaLabel = 'Diferență pe bloc';
              } else if (filterInfo.type === 'stair' && receptionMode === 'per_association') {
                diferentaLabel = 'Diferență pe asociație';
              }

              return (
                <div className="text-xs text-orange-600 mt-1">
                  {diferentaLabel}: {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                </div>
              );
            }
            return null;
          })()}
        </td>

        {/* Diferență totală */}
        {expense?.isUnitBased && expense?.billAmount && (
          <td className="px-2 py-2 border-l bg-orange-50">
            <div className="text-right font-bold text-orange-700">
              {(() => {
                if (!expense || !calculateExpenseDifferences) {
                  return '-';
                }

                const allApartments = getAssociationApartments();
                const expenseDifferences = calculateExpenseDifferences(expense, allApartments);
                const filterInfo = getFilterInfo(selectedStairTab, stairs, blocks);

                // Calculează diferența pe apartamentele FILTRATE (ce se afișează în tabel)
                const filteredDifference = apartments.reduce((sum, apt) => {
                  return sum + (expenseDifferences[apt.id] || 0);
                }, 0);

                // Calculează diferența TOTALĂ (pe toate apartamentele din scope)
                let scopeApartments = allApartments;
                let scopeLabel = 'asociație';

                if (filterInfo.type === 'stair') {
                  // Când filtrăm pe scară, scope-ul depinde de modul de recepție
                  let receptionMode = expense.receptionMode || 'total';
                  if (expense.expenseEntryMode) {
                    if (expense.expenseEntryMode === 'building') receptionMode = 'per_block';
                    else if (expense.expenseEntryMode === 'staircase') receptionMode = 'per_stair';
                    else if (expense.expenseEntryMode === 'per_association') receptionMode = 'total';
                  }

                  if (receptionMode === 'per_stair') {
                    // Cheltuială pe scară - scope-ul este doar scara selectată
                    scopeApartments = allApartments.filter(apt => apt.stairId === filterInfo.stairId);
                    scopeLabel = `${filterInfo.blockName} - ${filterInfo.stairName}`;
                  } else if (receptionMode === 'per_block') {
                    // Cheltuială pe bloc - scope-ul este blocul
                    const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
                    const blockStairIds = blockStairs.map(s => s.id);
                    scopeApartments = allApartments.filter(apt => blockStairIds.includes(apt.stairId));
                    scopeLabel = filterInfo.blockName;
                  } else {
                    // Cheltuială pe asociație - scope-ul este întreaga asociație
                    scopeApartments = allApartments;
                    scopeLabel = 'asociație';
                  }
                }

                const totalDifferenceInScope = scopeApartments.reduce((sum, apt) => {
                  return sum + (expenseDifferences[apt.id] || 0);
                }, 0);

                if (Math.abs(filteredDifference) < 0.01) {
                  return '-';
                }

                return filteredDifference.toFixed(2);
              })()}
            </div>
            {(() => {
              // Mesaj explicativ sub valoarea diferenței
              if (!expense) {
                return null;
              }

              const allApartments = getAssociationApartments();
              const filterInfo = getFilterInfo(selectedStairTab, stairs, blocks);

              // Calculează diferența pe apartamentele FILTRATE (pentru verificare dacă afișăm mesajul)
              const expenseDifferences = calculateExpenseDifferences ? calculateExpenseDifferences(expense, allApartments) : {};
              const filteredDifference = apartments.reduce((sum, apt) => {
                return sum + (expenseDifferences[apt.id] || 0);
              }, 0);

              if (Math.abs(filteredDifference) < 0.01) {
                return null;
              }

              // Determină scope-ul și suma așteptată
              let receptionMode = expense.receptionMode || 'total';
              if (expense.expenseEntryMode) {
                if (expense.expenseEntryMode === 'building') receptionMode = 'per_block';
                else if (expense.expenseEntryMode === 'staircase') receptionMode = 'per_stair';
                else if (expense.expenseEntryMode === 'per_association') receptionMode = 'total';
              }

              let scopeApartments = allApartments;
              let scopeLabel = 'asociație';
              let expectedAmount = parseFloat(expense?.billAmount || 0);

              if (filterInfo.type === 'stair') {
                if (receptionMode === 'per_stair') {
                  scopeApartments = allApartments.filter(apt => apt.stairId === filterInfo.stairId);
                  scopeLabel = `${filterInfo.blockName} - ${filterInfo.stairName}`;
                  expectedAmount = parseFloat(expense?.amountsByStair?.[filterInfo.stairId] || 0);
                } else if (receptionMode === 'per_block') {
                  const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
                  const blockStairIds = blockStairs.map(s => s.id);
                  scopeApartments = allApartments.filter(apt => blockStairIds.includes(apt.stairId));
                  scopeLabel = filterInfo.blockName;
                  expectedAmount = parseFloat(expense?.amountsByBlock?.[filterInfo.blockId] || 0);
                } else {
                  scopeApartments = allApartments;
                  scopeLabel = 'asociație';
                  expectedAmount = parseFloat(expense?.billAmount || 0);
                }
              }

              // Calculează total introdus pe scope CU participări (dar fără diferențe distribuite)
              const apartmentParticipations = config?.apartmentParticipation || {};
              const totalIntrodusInScope = scopeApartments.reduce((sum, apt) => {
                const participation = apartmentParticipations[apt.id];

                // Calculează consumul brut
                let aptConsumption = 0;
                const indexes = expense?.indexes?.[apt.id];
                if (indexes) {
                  Object.values(indexes).forEach(indexData => {
                    if (indexData.newIndex && indexData.oldIndex) {
                      aptConsumption += parseFloat(indexData.newIndex) - parseFloat(indexData.oldIndex);
                    }
                  });
                } else {
                  aptConsumption = parseFloat(expense?.consumption?.[apt.id] || 0);
                }

                // Suma înainte de participare
                let aptAmount = aptConsumption * (expense?.unitPrice || 0);

                // Aplică participarea
                if (participation?.type === 'excluded') {
                  aptAmount = 0;
                } else if (participation?.type === 'percentage' && participation?.value !== undefined) {
                  const percent = participation.value < 1 ? participation.value : (participation.value / 100);
                  aptAmount = aptAmount * percent;
                } else if (participation?.type === 'fixed') {
                  const fixedMode = config?.fixedAmountMode || 'apartment';
                  const fixedAmount = parseFloat(participation.value || 0);
                  aptAmount = fixedMode === 'person' ? fixedAmount * (apt.persons || 0) : fixedAmount;
                }

                return sum + aptAmount;
              }, 0);

              // Diferența totală în scope = Total introdus DUPĂ participări - Suma așteptată
              const totalDifferenceInScope = totalIntrodusInScope - expectedAmount;

              return (
                <div className="text-xs text-green-600 font-medium mt-1">
                  <div>Diferență distribuită: {filteredDifference.toFixed(2)} RON</div>
                  <div className="text-[10px] text-gray-500">
                    (din {Math.abs(totalDifferenceInScope).toFixed(2)} RON pe {scopeLabel})
                  </div>
                </div>
              );
            })()}
          </td>
        )}
      </tr>
    </tfoot>
  );
};

/**
 * Tabel pentru afișarea și editarea sumelor individuale
 * IMPORTANT: Această componentă gestionează:
 * - Editare inline pentru sume individuale
 * - Optimistic UI updates prin localValues
 * - Suport pentru pending amounts (cheltuieli nedistribuite)
 * - Participări (excluded, percentage, fixed)
 */
export const IndividualAmountsTable = ({
  apartments,
  config,
  expense,
  expenseTypeName,
  dataObject,
  currentSheet,
  isMonthReadOnly,
  localValues,
  setLocalValues,
  updateExpenseIndividualAmount,
  updatePendingIndividualAmount,
  getAssociationApartments,
  stairs,
  selectedStairTab,
  blocks
}) => {
  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 sticky top-0">
          <tr>
            {selectedStairTab === 'all' && (
              <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b-2 min-w-[140px]">Bloc - Scară</th>
            )}
            <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b-2 w-16">Apt</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b-2 min-w-[120px]">Proprietar</th>
            <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b-2 border-l w-20">Persoane</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b-2 border-l bg-amber-50 min-w-[120px]">
              Participare
            </th>

            {/* Coloană sume individuale */}
            <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b-2 border-l">
              Sumă (RON)
            </th>
          </tr>
        </thead>
        <tbody>
          {apartments.map(apartment => {
            // Obține suma manuală
            const manualValue = String(dataObject[apartment.id] || '');

            // Verifică local values FIRST pentru hasManualValue
            const localIndividual = localValues[`${expenseTypeName}-${apartment.id}`];

            const effectiveManualValue = localIndividual !== undefined ? localIndividual : manualValue;

            // ZERO este o valoare validă de completare
            const hasManualValue = effectiveManualValue !== '' && effectiveManualValue !== null && effectiveManualValue !== undefined && !isNaN(parseFloat(effectiveManualValue));

            // Verifică dacă e complet
            const isComplete = hasManualValue;

            // Verifică dacă apartamentul este exclus din această cheltuială
            const apartmentParticipations = config.apartmentParticipation || {};
            const participation = apartmentParticipations[apartment.id];

            // Verifică dacă e exclus - participation este obiect { type: 'excluded' }
            const isExcluded = participation?.type === 'excluded';

            const isDisabled = isMonthReadOnly || isExcluded;

            return (
              <tr
                key={apartment.id}
                className={`border-b ${
                  isExcluded
                    ? 'bg-gray-100 opacity-60'
                    : !isComplete && !isDisabled
                      ? 'bg-orange-50 hover:bg-orange-100'
                      : 'hover:bg-gray-50'
                }`}
              >
                {/* Bloc - Scară (doar când selectedStairTab === 'all') */}
                {selectedStairTab === 'all' && (() => {
                  const stair = stairs?.find(s => s.id === apartment.stairId);
                  const block = blocks?.find(b => b.id === stair?.blockId);
                  return (
                    <td className="px-3 py-2 text-gray-600 text-sm">
                      {block?.name || '-'} - {stair?.name || '-'}
                    </td>
                  );
                })()}

                {/* Apt */}
                <td className="px-3 py-2 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="inline-block min-w-[40px]">{apartment.number}</span>
                    {!isComplete && !isDisabled && !isExcluded && <span className="text-orange-500 text-xs">⚠</span>}
                  </div>
                </td>

                {/* Proprietar */}
                <td className="px-3 py-2 text-gray-600 truncate max-w-[150px]" title={apartment.owner}>
                  {apartment.owner || '-'}
                </td>

                {/* Persoane */}
                <td className="px-3 py-2 text-center font-medium border-l">
                  {apartment.persons || 0}
                </td>

                {/* Participare */}
                <td className="px-3 py-2 text-gray-700 border-l bg-amber-50">
                  {participation?.type === 'excluded' ? (
                    <span className="text-red-600 font-medium">Exclus</span>
                  ) : (
                    <span className="text-green-600 font-medium">Integral</span>
                  )}
                </td>

                {/* Sume individuale - cu diferență în footer */}
                <td className="px-3 py-2 text-center border-l">
                  {isDisabled ? (
                    <span className="text-gray-600">{isExcluded ? '-' : (manualValue || '-')}</span>
                  ) : (
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="-"
                      value={localValues[`${expenseTypeName}-${apartment.id}`] ?? manualValue}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        if (inputValue === "" || /^\d*[.,]?\d*$/.test(inputValue)) {
                          const normalizedValue = inputValue.replace(',', '.');

                          // Optimistic UI update - afișare imediată
                          setLocalValues(prev => ({
                            ...prev,
                            [`${expenseTypeName}-${apartment.id}`]: normalizedValue
                          }));

                          // Salvare în Firebase (async)
                          if (expense) {
                            updateExpenseIndividualAmount(expense.id, apartment.id, normalizedValue);
                          } else {
                            updatePendingIndividualAmount(expenseTypeName, apartment.id, normalizedValue);
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const numericValue = parseFloat(e.target.value.replace(',', '.')) || 0;
                        if (expense) {
                          updateExpenseIndividualAmount(expense.id, apartment.id, numericValue);
                        } else {
                          updatePendingIndividualAmount(expenseTypeName, apartment.id, numericValue);
                        }
                      }}
                      className={`w-20 px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${!hasManualValue ? 'border-orange-300 bg-orange-50' : ''}`}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>

        {/* RÂND TOTAL */}
        <IndividualAmountsTableFooter
          apartments={apartments}
          config={config}
          expense={expense}
          expenseTypeName={expenseTypeName}
          getAssociationApartments={getAssociationApartments}
          stairs={stairs}
          selectedStairTab={selectedStairTab}
          blocks={blocks}
        />
      </table>
    </div>
  );
};

/**
 * Footer pentru tabelul de sume individuale (rând TOTAL)
 */
const IndividualAmountsTableFooter = ({
  apartments,
  config,
  expense,
  expenseTypeName,
  getAssociationApartments,
  stairs,
  selectedStairTab,
  blocks
}) => {
  return (
    <tfoot>
      <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
        <td colSpan={selectedStairTab === 'all' ? 5 : 4} className="px-2 py-2 text-right border-r">TOTAL:</td>

        {/* Totalul sumelor introduse (exclus apartamentele excluse) */}
        <td className="px-2 py-2 border-l">
          <div className="text-center text-green-700 font-bold">
            {(() => {
              const apartmentParticipations = config?.apartmentParticipation || {};

              const totalIntroduced = apartments.reduce((sum, apt) => {
                const participation = apartmentParticipations[apt.id];

                // Dacă e exclus, nu contribuie la total
                if (participation?.type === 'excluded') {
                  return sum;
                }

                const aptAmount = parseFloat(expense?.individualAmounts?.[apt.id] || 0);
                return sum + aptAmount;
              }, 0);

              return totalIntroduced.toFixed(2);
            })()}
          </div>

          {/* Diferența față de suma așteptată */}
          {expense?.amount && (() => {
            const filterInfo = getFilterInfo(selectedStairTab, stairs, blocks);
            let receptionMode = expense.receptionMode || 'total';
            if (expense.expenseEntryMode) {
              if (expense.expenseEntryMode === 'building') receptionMode = 'per_block';
              else if (expense.expenseEntryMode === 'staircase') receptionMode = 'per_stair';
              else if (expense.expenseEntryMode === 'per_association') receptionMode = 'total';
            }

            // Determină suma așteptată și apartamentele pentru calcul
            let expectedAmount = 0;
            let apartmentsForDiff = apartments; // Default: apartamente filtrate

            if (filterInfo.type === 'all') {
              expectedAmount = parseFloat(expense?.amount || 0);
              apartmentsForDiff = apartments;
            } else if (filterInfo.type === 'stair' && receptionMode === 'per_stair') {
              expectedAmount = parseFloat(expense?.amountsByStair?.[filterInfo.stairId] || 0);
              apartmentsForDiff = apartments;
            } else if (filterInfo.type === 'stair' && receptionMode === 'per_block' && filterInfo.blockId) {
              // Când filtrezi pe scară dar suma e pe bloc, calculează diferența la nivel de BLOC
              expectedAmount = parseFloat(expense?.amountsByBlock?.[filterInfo.blockId] || 0);
              const allApts = getAssociationApartments();
              const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
              const blockStairIds = blockStairs.map(s => s.id);
              apartmentsForDiff = allApts.filter(apt => blockStairIds.includes(apt.stairId));
            } else if (filterInfo.type === 'stair' && receptionMode === 'per_association') {
              // Când filtrezi pe scară dar suma e pe asociație, calculează diferența la nivel de ASOCIAȚIE
              expectedAmount = parseFloat(expense?.amount || 0);
              apartmentsForDiff = getAssociationApartments();
            }

            const apartmentParticipations = config?.apartmentParticipation || {};

            // Calculează totalul introdus (exclus apartamentele excluse)
            const totalIntroduced = apartmentsForDiff.reduce((sum, apt) => {
              const participation = apartmentParticipations[apt.id];

              // Dacă e exclus, nu contribuie la total
              if (participation?.type === 'excluded') {
                return sum;
              }

              const aptAmount = parseFloat(expense?.individualAmounts?.[apt.id] || 0);
              return sum + aptAmount;
            }, 0);

            // Diferență = introdus - așteptat (negativ = lipsă, pozitiv = în plus)
            const diff = totalIntroduced - expectedAmount;

            if (Math.abs(diff) >= 0.01) {
              // Determină contextul diferenței
              let diferentaLabel = 'Diferență';
              if (filterInfo.type === 'stair' && receptionMode === 'per_block') {
                diferentaLabel = 'Diferență pe bloc';
              } else if (filterInfo.type === 'stair' && receptionMode === 'per_association') {
                diferentaLabel = 'Diferență pe asociație';
              }

              return (
                <div className="text-xs text-orange-600 mt-1">
                  {diferentaLabel}: {diff > 0 ? '+' : ''}{diff.toFixed(2)} RON
                </div>
              );
            }
            return null;
          })()}
        </td>
      </tr>
    </tfoot>
  );
};
