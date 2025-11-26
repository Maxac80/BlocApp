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

  // Verifică inputMode pentru cheltuieli de tip consumption
  const inputMode = config.indexConfiguration?.inputMode || 'manual';
  const indexTypes = config.indexConfiguration?.indexTypes || [];
  const hasIndexConfig = config.indexConfiguration?.enabled && indexTypes.length > 0;

  // Calculează doar pentru apartamentele NON-EXCLUSE
  let completed = 0;

  if (isConsumption && hasIndexConfig && inputMode !== 'manual') {
    // Modul INDECȘI sau MIXT: verifică indexurile
    let indexesData = {};
    if (expense) {
      indexesData = expense.indexes || {};
    } else {
      indexesData = currentSheet?.pendingIndexes?.[expenseTypeName] || {};
    }

    completed = nonExcludedApartments.filter(apt => {
      const apartmentIndexes = indexesData[apt.id] || {};

      if (inputMode === 'indexes') {
        // Modul INDECȘI STRICT: trebuie să existe indexuri completate (non-empty)
        return indexTypes.some(indexType => {
          const indexData = apartmentIndexes[indexType.id];
          const oldVal = indexData?.oldIndex;
          const newVal = indexData?.newIndex;
          // Verifică că sunt string-uri non-empty sau numere valide
          return oldVal && newVal && String(oldVal).trim() !== '' && String(newVal).trim() !== '';
        });
      } else if (inputMode === 'mixed') {
        // Modul MIXT: acceptă fie indexuri, fie consum manual
        const hasIndexes = indexTypes.some(indexType => {
          const indexData = apartmentIndexes[indexType.id];
          const oldVal = indexData?.oldIndex;
          const newVal = indexData?.newIndex;
          // Verifică că sunt string-uri non-empty sau numere valide
          return oldVal && newVal && String(oldVal).trim() !== '' && String(newVal).trim() !== '';
        });

        if (hasIndexes) return true;

        // Verifică consum manual ca fallback
        let dataObject = {};
        if (expense) {
          dataObject = expense.consumption || {};
        } else {
          dataObject = currentSheet?.pendingConsumptions?.[expenseTypeName] || {};
        }
        const value = dataObject[apt.id];
        return value && parseFloat(value) >= 0;
      }

      return false;
    }).length;
  } else {
    // Modul MANUAL sau cheltuială fără indexuri: verifică consumption/individualAmounts
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

    completed = nonExcludedApartments.filter(apt => {
      const value = dataObject?.[apt.id];
      return value && parseFloat(value) >= 0;
    }).length;
  }

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
  blocks,
  maintenanceData // 🆕 Adăugat pentru a citi valorile ajustate cu rotunjire
}) => {
  const indexTypes = config.indexConfiguration?.indexTypes || [];
  const inputMode = config.indexConfiguration?.inputMode || 'manual';

  // 🔧 Configurare contoare per apartament
  const apartmentMeters = config.indexConfiguration?.apartmentMeters || {};

  // 🔐 State pentru controlul editării indexurilor vechi
  const [allowOldIndexEdit, setAllowOldIndexEdit] = React.useState(false);

  // Cheia pentru localValues - folosește expense.id pentru cheltuieli distribute, expenseTypeName pentru pending
  const localValuesKey = expense?.id || expenseTypeName;

  // Verifică dacă există apartamente cu participare parțială (percentage sau fixed)
  // Coloana "După participare" are sens DOAR pentru percentage și fixed
  const apartmentParticipations = config?.apartmentParticipation || {};
  const hasPartialParticipation = apartments.some(apartment => {
    const participation = apartmentParticipations[apartment.id];
    return participation?.type === 'percentage' || participation?.type === 'fixed';
  });

  // Arată coloana "După participare" doar dacă există participări parțiale
  const showParticipationColumns = hasPartialParticipation;

  // Verifică dacă coloana "Persoane" este relevantă
  // Arată doar când: distribuție pe persoane SAU diferență distribuită proporțional cu persoanele
  const isPerPersonDistribution = config?.distributionType === 'perPerson';
  const differenceUsesPersons = expense?.isUnitBased &&
                                 expense?.billAmount &&
                                 config?.differenceDistribution?.method === 'person';
  const showPersonsColumn = isPerPersonDistribution || differenceUsesPersons;

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 sticky top-0 border-b-2 border-gray-400">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-gray-700 w-16 align-top">Apt</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-700 min-w-[120px] align-top">Proprietar</th>

            {/* Coloană Persoane - doar când e relevantă pentru calcule */}
            {showPersonsColumn && (
              <th className="px-3 py-2 text-center font-semibold text-gray-700 border-l w-20 align-top">Persoane</th>
            )}

            {/* Coloană Participare - doar dacă nu sunt toate integrale */}
            {showParticipationColumns && (
              <th className="px-3 py-2 text-left font-semibold text-gray-700 border-l bg-amber-50 min-w-[120px] align-top">
                Participare
              </th>
            )}

            {/* Coloane pentru contoare (INDEXES sau MIXED) */}
            {inputMode !== 'manual' && indexTypes.length > 0 && (
              indexTypes.map((indexType, idx) => (
                <React.Fragment key={indexType.id}>
                  <th className="px-2 py-2 text-center font-semibold text-gray-700 border-l bg-blue-50 align-top" colSpan="2">
                    <div className="flex flex-col items-center gap-1">
                      <span>{indexType.name}</span>
                      {/* Buton editare index vechi - doar pentru primul contor */}
                      {idx === 0 && !isMonthReadOnly && (
                        <button
                          onClick={() => setAllowOldIndexEdit(!allowOldIndexEdit)}
                          className={`text-sm px-1.5 py-0.5 rounded transition-all ${
                            allowOldIndexEdit
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                          }`}
                          title={allowOldIndexEdit ? 'Blochează editare index vechi' : 'Permite editare index vechi'}
                        >
                          {allowOldIndexEdit ? '🔓' : '🔒'}
                        </button>
                      )}
                    </div>
                  </th>
                </React.Fragment>
              ))
            )}

            {/* Coloană consum */}
            <th className="px-3 py-2 text-center font-semibold text-gray-700 border-l bg-green-50 align-top" style={{ minWidth: '100px', maxWidth: '100px', width: '100px' }}>
              Consum
              <div className="text-[10px] font-normal text-gray-500">({config.consumptionUnit || 'mc'})</div>
            </th>

            {/* Coloană total RON (doar dacă avem preț unitar) */}
            {expense?.unitPrice && (
              <th className="px-3 py-2 text-right font-semibold text-gray-700 border-l bg-purple-50 align-top" style={{ minWidth: '160px', maxWidth: '160px', width: '160px' }}>
                Total (RON)
              </th>
            )}

            {/* Coloană sumă după participare - doar dacă nu sunt toate integrale */}
            {showParticipationColumns && (
              <th className="px-3 py-2 text-right font-semibold text-gray-700 border-l bg-teal-50 align-top" style={{ minWidth: '180px', maxWidth: '180px', width: '180px' }}>
                După participare (RON)
              </th>
            )}

            {/* Coloană diferență distribuită - doar pentru consumption cu isUnitBased */}
            {expense?.isUnitBased && expense?.billAmount && (
              <th className="px-2 py-2 text-right font-semibold text-gray-700 border-l bg-orange-50 align-top" style={{ minWidth: '200px', maxWidth: '200px', width: '200px' }}>
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
                      case 'per_stair': receptionText = 'Sume pe scară'; break;
                      case 'per_block': receptionText = 'Sume pe bloc'; break;
                      case 'total': receptionText = 'Pe asociație'; break;
                      case 'per_association': receptionText = 'Pe asociație'; break;
                      default: receptionText = receptionMode;
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
                      adjustment = 'Respectă participările';
                    } else if (diffConfig.adjustmentMode === 'apartmentType') {
                      adjustment = 'Ajustare pe tip apt';
                    } else {
                      adjustment = 'Fără ajustări';
                    }

                    // Construiește array cu toate caracteristicile
                    const characteristics = [receptionText, method, adjustment];

                    // Adaugă opțiunile suplimentare
                    if (diffConfig.includeFixedAmountInDifference) {
                      characteristics.push('Include sumă fixă');
                    }
                    if (diffConfig.includeExcludedInDifference) {
                      characteristics.push('Include excluse');
                    }

                    return (
                      <div>{characteristics.join(' • ')}</div>
                    );
                  })()}
                </div>
              </th>
            )}

            {/* Coloană TOTAL DISTRIBUIT - suma finală din tabelul de întreținere */}
            {expense?.isUnitBased && expense?.billAmount && (
              <th className="px-2 py-2 text-right font-semibold text-gray-700 border-l bg-indigo-50 align-top" style={{ minWidth: '180px', maxWidth: '180px', width: '180px' }}>
                Total distribuit (RON)
                <div className="text-[10px] font-normal text-gray-500">În tabel întreținere</div>
              </th>
            )}
          </tr>
          {/* Sub-header pentru Vechi/Nou */}
          {inputMode !== 'manual' && indexTypes.length > 0 && (
            <tr className="bg-blue-50 text-xs">
              <th className="border-b"></th>
              <th className="border-b"></th>
              {showPersonsColumn && <th className="border-b border-l"></th>}
              {showParticipationColumns && <th className="border-b border-l"></th>}
              {indexTypes.map((indexType, idx) => (
                <React.Fragment key={indexType.id}>
                  <th className="px-2 py-1 text-center text-gray-600 border-b border-l">
                    Vechi
                  </th>
                  <th className="px-2 py-1 text-center text-gray-600 border-b">Nou</th>
                </React.Fragment>
              ))}
              <th className="border-b border-l"></th>
              {expense?.unitPrice && <th className="border-b border-l"></th>}
              {showParticipationColumns && <th className="border-b border-l"></th>}
              {expense?.isUnitBased && expense?.billAmount && <th className="border-b border-l"></th>}
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

            // 🔧 Verifică care contoare sunt enabled pentru acest apartament
            const aptMeters = apartmentMeters[apartment.id] || {};

            // Funcție helper pentru a verifica dacă un contor este enabled
            // Backward compatibility: dacă apartmentMeters nu e configurat deloc, toate contoarele sunt enabled
            const isMeterEnabled = (meterId) => {
              // Dacă nu există configurare apartmentMeters deloc, toate contoarele sunt enabled (backward compat)
              if (Object.keys(apartmentMeters).length === 0) return true;
              // 🔧 Dacă există configurare dar apartamentul nu e în ea → toate dezactivate
              // (forțează configurare explicită în tab Contoare)
              if (!apartmentMeters[apartment.id]) return false;
              // Altfel, verifică dacă contorul specific e enabled
              return aptMeters[meterId]?.enabled === true;
            };

            // 🔧 Verifică dacă apartamentul are cel puțin un contor enabled
            const hasAnyEnabledMeters = indexTypes.some(indexType => isMeterEnabled(indexType.id));

            // Calculează consum total din indecși - verifică OPTIMISTIC values first
            // 🔧 DOAR pentru contoarele enabled
            const totalIndexConsumption = indexTypes.reduce((sum, indexType) => {
              // Skip contoarele care nu sunt enabled pentru acest apartament
              if (!isMeterEnabled(indexType.id)) return sum;

              const indexData = indexesData[indexType.id];

              // Verifică local values first, apoi Firebase
              const localOld = localValues[`${localValuesKey}-${apartment.id}-index-${indexType.id}-old`];
              const localNew = localValues[`${localValuesKey}-${apartment.id}-index-${indexType.id}-new`];

              const oldIndex = localOld !== undefined ? localOld : indexData?.oldIndex;
              const newIndex = localNew !== undefined ? localNew : indexData?.newIndex;

              if (newIndex && oldIndex) {
                return sum + (parseFloat(newIndex) - parseFloat(oldIndex));
              }
              return sum;
            }, 0);

            // Verifică local values FIRST pentru hasManualValue
            const localConsumption = localValues[`${localValuesKey}-${apartment.id}-consumption`];

            const effectiveManualValue = localConsumption !== undefined ? localConsumption : manualValue;

            const hasIndexData = totalIndexConsumption > 0;
            // ZERO este o valoare validă de completare
            const hasManualValue = effectiveManualValue !== '' && effectiveManualValue !== null && effectiveManualValue !== undefined && !isNaN(parseFloat(effectiveManualValue));

            const displayedConsumption = String(manualValue);

            // Verifică dacă e complet
            const isComplete = (inputMode === 'manual' && hasManualValue) ||
                               (inputMode === 'indexes' && hasIndexData);

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
            } else {
              finalConsumption = parseFloat(effectiveManualValue) || 0;
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
                style={{ height: '40px' }}
              >
                {/* Apt */}
                <td className="px-3 py-2 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="inline-block min-w-[40px]">{apartment.number}</span>
                    {/* Spațiu rezervat fix pentru iconița de atenționare */}
                    <span className={`inline-block w-3 text-xs ${!isComplete && !isDisabled && !isExcluded ? 'text-orange-500' : 'invisible'}`}>
                      ⚠
                    </span>
                  </div>
                </td>

                {/* Proprietar */}
                <td className="px-3 py-2 text-gray-600 truncate max-w-[150px]" title={apartment.owner}>
                  {apartment.owner || '-'}
                </td>

                {/* Persoane - doar când e relevantă */}
                {showPersonsColumn && (
                  <td className="px-3 py-2 text-center font-medium border-l">
                    {apartment.persons || 0}
                  </td>
                )}

                {/* Participare - doar dacă nu sunt toate integrale */}
                {showParticipationColumns && (
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
                )}

                {/* Contoare: Vechi | Nou (INDEXES sau MIXED) */}
                {/* În modul MIXT: ascunde indexurile dacă există consum manual */}
                {/* 🔧 Afișează celule pentru toate contoarele, dar inputuri doar pentru cele enabled */}
                {inputMode !== 'manual' && indexTypes.length > 0 && indexTypes.map(indexType => {
                  // 🔧 Verifică dacă contorul este enabled pentru acest apartament
                  const meterEnabled = isMeterEnabled(indexType.id);

                  // În modul MIXT: ascunde conținutul celulelor dacă există consum manual
                  const hideCellsInMixedMode = inputMode === 'mixed' && hasManualValue;
                  const rawIndexData = indexesData[indexType.id] || {};
                  const indexData = {
                    oldIndex: String(rawIndexData.oldIndex || ''),
                    newIndex: String(rawIndexData.newIndex || ''),
                    meterName: rawIndexData.meterName
                  };

                  return (
                    <React.Fragment key={indexType.id}>
                      {/* Index Vechi */}
                      <td className={`px-2 py-1 text-center border-l ${!meterEnabled ? 'bg-gray-100' : ''}`}>
                        {/* 🔧 Dacă contorul nu e enabled pentru acest apartament, afișează "-" */}
                        {!meterEnabled ? (
                          <span className="text-gray-400 text-xs" title="Contor neinstalat">-</span>
                        ) : hideCellsInMixedMode ? (
                          <span className="text-gray-400 text-xs italic" title="Folosește consum manual">-</span>
                        ) : isDisabled ? (
                          <span className="text-gray-600 text-xs">{isExcluded ? '-' : (indexData.oldIndex || '-')}</span>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5">
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="-"
                              disabled={!allowOldIndexEdit || isExcluded}
                              value={localValues[`${localValuesKey}-${apartment.id}-index-${indexType.id}-old`] ?? indexData.oldIndex}
                              onChange={(e) => {
                                const inputValue = e.target.value;
                                if (inputValue === "" || /^\d*[.,]?\d*$/.test(inputValue)) {
                                  const normalizedValue = inputValue.replace(',', '.');

                                  // Optimistic UI update
                                  setLocalValues(prev => ({
                                    ...prev,
                                    [`${localValuesKey}-${apartment.id}-index-${indexType.id}-old`]: normalizedValue
                                  }));

                                  // Determină oldIndexSource bazat pe modificare
                                  let oldIndexSource = rawIndexData.oldIndexSource || 'initial';
                                  // Dacă modifici un index transferat automat → devine manual
                                  if (rawIndexData.oldIndexSource === 'transferred' && normalizedValue !== indexData.oldIndex) {
                                    oldIndexSource = 'manual';
                                  }

                                  const updatedIndexes = {
                                    ...indexesData,
                                    [indexType.id]: {
                                      ...indexData,
                                      oldIndex: normalizedValue,
                                      oldIndexSource,
                                      meterName: indexType.name
                                    }
                                  };

                                  if (expense) {
                                    updateExpenseIndexes(expense.id, apartment.id, updatedIndexes);
                                  } else {
                                    updatePendingIndexes(expenseTypeName, apartment.id, updatedIndexes);
                                  }
                                }
                              }}
                              className={`w-16 px-2 py-0.5 border border-gray-300 rounded text-xs text-gray-900 text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                                rawIndexData.oldIndexSource === 'manual' ? 'bg-yellow-50' : ''
                              }`}
                            />
                          </div>
                        )}
                      </td>

                      {/* Index Nou */}
                      <td className={`px-2 py-1 text-center ${!meterEnabled ? 'bg-gray-100' : ''}`}>
                        {/* 🔧 Dacă contorul nu e enabled pentru acest apartament, afișează "-" */}
                        {!meterEnabled ? (
                          <span className="text-gray-400 text-xs" title="Contor neinstalat">-</span>
                        ) : hideCellsInMixedMode ? (
                          <span className="text-gray-400 text-xs italic" title="Folosește consum manual">-</span>
                        ) : isDisabled ? (
                          <span className="text-gray-600 text-xs">{isExcluded ? '-' : (indexData.newIndex || '-')}</span>
                        ) : (
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="-"
                            value={localValues[`${localValuesKey}-${apartment.id}-index-${indexType.id}-new`] ?? indexData.newIndex}
                            onChange={(e) => {
                              const inputValue = e.target.value;
                              if (inputValue === "" || /^\d*[.,]?\d*$/.test(inputValue)) {
                                const normalizedValue = inputValue.replace(',', '.');

                                // Optimistic UI update
                                setLocalValues(prev => ({
                                  ...prev,
                                  [`${localValuesKey}-${apartment.id}-index-${indexType.id}-new`]: normalizedValue
                                }));

                                // Validare: newIndex >= oldIndex
                                const oldIndexValue = parseFloat(indexData.oldIndex) || 0;
                                const newIndexValue = parseFloat(normalizedValue) || 0;

                                // Salvează doar dacă e valid (newIndex >= oldIndex) SAU dacă e gol
                                if (normalizedValue === '' || newIndexValue >= oldIndexValue) {
                                  const updatedIndexes = {
                                    ...indexesData,
                                    [indexType.id]: { ...indexData, newIndex: normalizedValue, meterName: indexType.name }
                                  };
                                  if (expense) {
                                    updateExpenseIndexes(expense.id, apartment.id, updatedIndexes);
                                  } else {
                                    updatePendingIndexes(expenseTypeName, apartment.id, updatedIndexes);
                                  }
                                }
                              }
                            }}
                            className={`w-16 px-2 py-0.5 border rounded text-xs text-gray-900 text-center focus:ring-1 ${
                              (() => {
                                const newVal = localValues[`${localValuesKey}-${apartment.id}-index-${indexType.id}-new`] ?? indexData.newIndex;
                                const oldVal = indexData.oldIndex;
                                const isInvalid = newVal && oldVal && parseFloat(newVal) < parseFloat(oldVal);
                                return isInvalid
                                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';
                              })()
                            }`}
                          />
                        )}
                      </td>
                    </React.Fragment>
                  );
                })}

                {/* Coloană Consum */}
                <td className="px-3 py-0.5 text-center border-l bg-green-50" style={{ minWidth: '100px', maxWidth: '100px', width: '100px' }}>
                  {isDisabled ? (
                    <span className="text-gray-700 font-medium">{isExcluded ? '-' : (displayedConsumption || '-')}</span>
                  ) : ((inputMode === 'indexes' && hasAnyEnabledMeters) || (inputMode === 'mixed' && hasIndexData)) ? (
                    // INDEXES (cu contoare active) sau MIXT cu indexuri: read-only (calculat automat)
                    <span className={`font-medium ${hasIndexData ? 'text-blue-700' : 'text-gray-400'}`}>
                      {hasIndexData ? totalIndexConsumption.toFixed(2) : '-'}
                    </span>
                  ) : (
                    // MANUAL sau MIXT fără indexuri: editabil
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="-"
                      value={localValues[`${localValuesKey}-${apartment.id}-consumption`] ?? displayedConsumption}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        if (inputValue === "" || /^\d*[.,]?\d*$/.test(inputValue)) {
                          const normalizedValue = inputValue.replace(',', '.');

                          // Optimistic UI update
                          setLocalValues(prev => ({
                            ...prev,
                            [`${localValuesKey}-${apartment.id}-consumption`]: normalizedValue
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
                      style={{ maxWidth: '80px' }}
                      className={`w-20 px-2 py-0.5 border border-gray-300 rounded text-xs text-gray-900 text-center font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${!hasManualValue && !hasIndexData ? 'border-orange-300 bg-orange-50' : ''}`}
                    />
                  )}
                </td>

                {/* Total RON (doar dacă avem preț unitar) */}
                {expense?.unitPrice && (
                  <td className="px-3 py-2 text-right font-semibold border-l bg-purple-50 text-purple-700" style={{ minWidth: '160px', maxWidth: '160px', width: '160px' }}>
                    {isExcluded ? '-' : (finalConsumption > 0 ? (finalConsumption * expense.unitPrice).toFixed(2) : '-')}
                  </td>
                )}

                {/* După participare (RON) - suma finală după aplicarea participării - doar dacă nu sunt toate integrale */}
                {showParticipationColumns && (
                  <td className={`px-3 py-2 text-right font-semibold border-l ${
                    (() => {
                      // Marchează dacă participarea modifică suma (excluded, percentage sau fixed)
                      if (participation?.type === 'excluded' || participation?.type === 'percentage' || participation?.type === 'fixed') {
                        return 'bg-amber-100 text-amber-800';
                      }
                      return 'bg-teal-50 text-teal-700';
                    })()
                  }`} style={{ minWidth: '180px', maxWidth: '180px', width: '180px' }}>
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
                )}

                {/* Diferență distribuită - doar pentru consumption cu isUnitBased */}
                {expense?.isUnitBased && expense?.billAmount && (
                  <td className="px-2 py-2 text-right font-medium border-l bg-orange-50 text-orange-700" style={{ minWidth: '200px', maxWidth: '200px', width: '200px' }}>
                    {(() => {
                      // Folosește funcția de calcul din useMaintenanceCalculation
                      if (!expense || !calculateExpenseDifferences) {
                        return '-';
                      }

                      // Creează un expense actualizat cu consumurile din localValues
                      const updatedConsumption = {};
                      const allApartments = getAssociationApartments();

                      allApartments.forEach(apt => {
                        let finalValue = 0;

                        if (inputMode === 'indexes') {
                          // Pentru indexes mode, calculează consumul din indecși
                          const aptIndexesData = expense?.indexes?.[apt.id] || {};
                          finalValue = indexTypes.reduce((sum, indexType) => {
                            const indexData = aptIndexesData[indexType.id];
                            const localOld = localValues[`${localValuesKey}-${apt.id}-index-${indexType.id}-old`];
                            const localNew = localValues[`${localValuesKey}-${apt.id}-index-${indexType.id}-new`];
                            const oldIndex = localOld !== undefined ? localOld : indexData?.oldIndex;
                            const newIndex = localNew !== undefined ? localNew : indexData?.newIndex;
                            if (newIndex && oldIndex) {
                              return sum + (parseFloat(newIndex) - parseFloat(oldIndex));
                            }
                            return sum;
                          }, 0);
                        } else {
                          // Pentru manual/mixed mode, folosește consumption
                          const localKey = `${localValuesKey}-${apt.id}-consumption`;
                          const localConsumption = localValues[localKey];
                          const manualValue = expense?.consumption?.[apt.id];
                          finalValue = localConsumption !== undefined ? localConsumption : manualValue;
                        }

                        // Convert to number for calculation
                        updatedConsumption[apt.id] = parseFloat(finalValue) || 0;
                      });

                      const updatedExpense = {
                        ...expense,
                        consumption: updatedConsumption
                      };

                      const expenseDifferences = calculateExpenseDifferences(updatedExpense, allApartments);
                      const apartmentDifference = expenseDifferences[apartment.id] || 0;

                      if (Math.abs(apartmentDifference) < 0.01) {
                        return '-';
                      }

                      return apartmentDifference.toFixed(2);
                    })()}
                  </td>
                )}

                {/* TOTAL DE PLATĂ - suma finală din tabelul de întreținere (AJUSTATĂ pentru rotunjire) */}
                {expense?.isUnitBased && expense?.billAmount && (
                  <td className="px-2 py-2 text-right font-bold border-l bg-indigo-50 text-indigo-800" style={{ minWidth: '180px', maxWidth: '180px', width: '180px' }}>
                    {(() => {
                      // Caută valoarea AJUSTATĂ din maintenanceData (care include ajustarea de rotunjire)
                      if (maintenanceData && maintenanceData.length > 0) {
                        const apartmentRow = maintenanceData.find(row => row.apartmentId === apartment.id);
                        if (apartmentRow && apartmentRow.expenseDetails) {
                          const expenseKey = expense.expenseTypeId || expense.id || expense.name;
                          const expenseDetail = apartmentRow.expenseDetails[expenseKey];
                          const expenseDifference = apartmentRow.expenseDifferenceDetails?.[expenseKey] || 0;

                          if (expenseDetail) {
                            const totalForExpense = (expenseDetail.amount || 0) + expenseDifference;

                            // Afișează totalul chiar dacă apartamentul e exclus, dacă are diferență distribuită
                            if (totalForExpense === 0) {
                              return '-';
                            }

                            return totalForExpense.toFixed(2);
                          }
                        }
                      }

                      // FALLBACK: Dacă maintenanceData nu e disponibil, calculează manual (fără ajustare rotunjire)
                      // Calculează suma după participare
                      let baseAmount = 0;
                      if (expense?.unitPrice) {
                        baseAmount = finalConsumption * expense.unitPrice;
                      }

                      // Aplică participarea
                      let afterParticipation = baseAmount;
                      if (participation?.type === 'excluded') {
                        afterParticipation = 0;
                      } else if (participation?.type === 'fixed') {
                        const fixedMode = config?.fixedAmountMode || 'apartment';
                        const fixedAmount = parseFloat(participation.value || 0);
                        afterParticipation = fixedMode === 'person' ? fixedAmount * (apartment.persons || 0) : fixedAmount;
                      } else if (participation?.type === 'percentage') {
                        const percent = participation.value;
                        const multiplier = percent < 1 ? percent : (percent / 100);
                        afterParticipation = baseAmount * multiplier;
                      }

                      // Calculează diferența distribuită
                      let apartmentDifference = 0;
                      if (calculateExpenseDifferences) {
                        const updatedConsumption = {};
                        const allApartments = getAssociationApartments();
                        allApartments.forEach(apt => {
                          const localKey = `${localValuesKey}-${apt.id}-consumption`;
                          const localConsumption = localValues[localKey];
                          const manualValue = expense?.consumption?.[apt.id];
                          const finalValue = localConsumption !== undefined ? localConsumption : manualValue;
                          updatedConsumption[apt.id] = parseFloat(finalValue) || 0;
                        });
                        const updatedExpense = { ...expense, consumption: updatedConsumption };
                        const expenseDifferences = calculateExpenseDifferences(updatedExpense, allApartments);
                        apartmentDifference = expenseDifferences[apartment.id] || 0;
                      }

                      // Total = După participare + Diferență
                      const totalDePlata = afterParticipation + apartmentDifference;

                      // Afișează totalul chiar dacă apartamentul e exclus, dacă are diferență distribuită
                      if (totalDePlata === 0) {
                        return '-';
                      }

                      return totalDePlata.toFixed(2);
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
          localValues={localValues}
          localValuesKey={localValuesKey}
          showParticipationColumns={showParticipationColumns}
          showPersonsColumn={showPersonsColumn}
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
  blocks,
  localValues = {},
  localValuesKey,
  showParticipationColumns = true,
  showPersonsColumn = true
}) => {
  return (
    <tfoot>
      <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
        <td colSpan={2 + (showPersonsColumn ? 1 : 0) + (showParticipationColumns ? 1 : 0) + (inputMode !== 'manual' && indexTypes.length > 0 ? indexTypes.length * 2 : 0)} className="px-2 py-2 text-right border-r align-top">TOTAL:</td>

        {/* Consum total */}
        <td className="px-2 py-2 text-center text-blue-700 border-r align-top">
          {(() => {
            const apartmentParticipations = config?.apartmentParticipation || {};
            const totalConsumption = apartments.reduce((sum, apt) => {
              // Verifică dacă apartamentul este exclus
              const participation = apartmentParticipations[apt.id];
              if (participation?.type === 'excluded') {
                return sum; // Nu adăuga consumul apartamentelor excluse
              }

              let aptConsumption = 0;

              // Folosește aceeași logică ca în calcul pentru fiecare apartament
              const localConsumption = localValues[`${localValuesKey}-${apt.id}-consumption`];
              const manualValue = expense?.consumption?.[apt.id];
              const effectiveManualValue = localConsumption !== undefined ? localConsumption : manualValue;

              if (inputMode === 'indexes') {
                // Pentru indexes, calculează din indecși (verifică localValues first pentru optimistic updates)
                const indexesData = expense?.indexes?.[apt.id] || {};
                aptConsumption = indexTypes.reduce((sum, indexType) => {
                  const indexData = indexesData[indexType.id];
                  const localOld = localValues[`${localValuesKey}-${apt.id}-index-${indexType.id}-old`];
                  const localNew = localValues[`${localValuesKey}-${apt.id}-index-${indexType.id}-new`];
                  const oldIndex = localOld !== undefined ? localOld : indexData?.oldIndex;
                  const newIndex = localNew !== undefined ? localNew : indexData?.newIndex;
                  if (newIndex && oldIndex) {
                    return sum + (parseFloat(newIndex) - parseFloat(oldIndex));
                  }
                  return sum;
                }, 0);
              } else {
                // Pentru manual, folosește effectiveManualValue
                aptConsumption = parseFloat(effectiveManualValue) || 0;
              }

              return sum + aptConsumption;
            }, 0);
            return `${totalConsumption.toFixed(2)} mc`;
          })()}
        </td>

        {/* Suma calculată ÎNAINTE de participare (doar dacă avem unitPrice - ca în header) */}
        {expense?.unitPrice && (
          <td className="px-2 py-2 border-r align-top">
            <div className="text-right text-purple-700 font-bold">
              {(() => {
                const apartmentParticipations = config?.apartmentParticipation || {};
                const totalBeforeParticipation = apartments.reduce((sum, apt) => {
                  // Verifică dacă apartamentul este exclus
                  const participation = apartmentParticipations[apt.id];
                  if (participation?.type === 'excluded') {
                    return sum; // Nu adăuga suma apartamentelor excluse
                  }

                  let aptAmount = 0;
                  let aptConsumption = 0;

                  // Folosește aceeași logică ca în calcul pentru fiecare apartament
                  const localConsumption = localValues[`${localValuesKey}-${apt.id}-consumption`];
                  const manualValue = expense?.consumption?.[apt.id];
                  const effectiveManualValue = localConsumption !== undefined ? localConsumption : manualValue;

                  if (inputMode === 'indexes') {
                    // Pentru indexes, calculează din indecși (verifică localValues first pentru optimistic updates)
                    const indexesData = expense?.indexes?.[apt.id] || {};
                    aptConsumption = indexTypes.reduce((sum, indexType) => {
                      const indexData = indexesData[indexType.id];
                      const localOld = localValues[`${localValuesKey}-${apt.id}-index-${indexType.id}-old`];
                      const localNew = localValues[`${localValuesKey}-${apt.id}-index-${indexType.id}-new`];
                      const oldIndex = localOld !== undefined ? localOld : indexData?.oldIndex;
                      const newIndex = localNew !== undefined ? localNew : indexData?.newIndex;
                      if (newIndex && oldIndex) {
                        return sum + (parseFloat(newIndex) - parseFloat(oldIndex));
                      }
                      return sum;
                    }, 0);
                  } else {
                    // Pentru manual, folosește effectiveManualValue
                    aptConsumption = parseFloat(effectiveManualValue) || 0;
                  }

                  aptAmount = aptConsumption * (expense?.unitPrice || 0);
                  return sum + aptAmount;
                }, 0);
                return `${totalBeforeParticipation.toFixed(2)} RON`;
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
              let apartmentsForDiff = apartments;

              if (filterInfo.type === 'all') {
                expectedAmount = parseFloat(expense?.billAmount || 0);
                apartmentsForDiff = apartments;
              } else if (filterInfo.type === 'stair' && receptionMode === 'per_stair') {
                expectedAmount = parseFloat(expense?.amountsByStair?.[filterInfo.stairId] || 0);
                apartmentsForDiff = apartments;
              } else if (filterInfo.type === 'stair' && receptionMode === 'per_block' && filterInfo.blockId) {
                expectedAmount = parseFloat(expense?.amountsByBlock?.[filterInfo.blockId] || 0);
                const allApts = getAssociationApartments();
                const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
                const blockStairIds = blockStairs.map(s => s.id);
                apartmentsForDiff = allApts.filter(apt => blockStairIds.includes(apt.stairId));
              } else if (filterInfo.type === 'stair' && receptionMode === 'per_association') {
                expectedAmount = parseFloat(expense?.billAmount || 0);
                apartmentsForDiff = getAssociationApartments();
              }

              const apartmentParticipations = config?.apartmentParticipation || {};
              const totalBeforeParticipation = apartmentsForDiff.reduce((sum, apt) => {
                // Verifică dacă apartamentul este exclus
                const participation = apartmentParticipations[apt.id];
                if (participation?.type === 'excluded') {
                  return sum; // Nu adăuga suma apartamentelor excluse
                }

                let aptAmount = 0;
                let aptConsumption = 0;

                const localConsumption = localValues[`${localValuesKey}-${apt.id}-consumption`];
                const manualValue = expense?.consumption?.[apt.id];
                const effectiveManualValue = localConsumption !== undefined ? localConsumption : manualValue;

                if (inputMode === 'indexes') {
                  // Pentru indexes, calculează din indecși (verifică localValues first)
                  const indexesData = expense?.indexes?.[apt.id] || {};
                  aptConsumption = indexTypes.reduce((sum, indexType) => {
                    const indexData = indexesData[indexType.id];
                    const localOld = localValues[`${localValuesKey}-${apt.id}-index-${indexType.id}-old`];
                    const localNew = localValues[`${localValuesKey}-${apt.id}-index-${indexType.id}-new`];
                    const oldIndex = localOld !== undefined ? localOld : indexData?.oldIndex;
                    const newIndex = localNew !== undefined ? localNew : indexData?.newIndex;
                    if (newIndex && oldIndex) {
                      return sum + (parseFloat(newIndex) - parseFloat(oldIndex));
                    }
                    return sum;
                  }, 0);
                } else {
                  aptConsumption = parseFloat(effectiveManualValue) || 0;
                }

                aptAmount = aptConsumption * (expense?.unitPrice || 0);
                return sum + aptAmount;
              }, 0);

              const diff = totalBeforeParticipation - expectedAmount;

              if (Math.abs(diff) >= 0.01) {
                let diferentaLabel = 'Diferență';
                if (filterInfo.type === 'stair' && receptionMode === 'per_block') {
                  diferentaLabel = 'Diferență pe bloc';
                } else if (filterInfo.type === 'stair' && receptionMode === 'per_association') {
                  diferentaLabel = 'Diferență pe asociație';
                }

                return (
                  <div className="text-xs text-orange-600 font-medium mt-1">
                    {diferentaLabel}: {diff > 0 ? '+' : ''}{diff.toFixed(2)} RON
                  </div>
                );
              }
              return null;
            })()}
          </td>
        )}

        {/* Suma DUPĂ participare - doar dacă nu sunt toate integrale */}
        {showParticipationColumns && (
          <td className="px-2 py-2 border-r align-top">
            <div className="text-right text-green-700 font-bold">
              {(() => {
                const apartmentParticipations = config?.apartmentParticipation || {};

                const totalAfterParticipation = apartments.reduce((sum, apt) => {
                const participation = apartmentParticipations[apt.id];

                let aptAmount = 0;
                let aptConsumption = 0;

                // Folosește aceeași logică ca în calcul pentru fiecare apartament
                const localConsumption = localValues[`${localValuesKey}-${apt.id}-consumption`];
                const manualValue = expense?.consumption?.[apt.id];
                const effectiveManualValue = localConsumption !== undefined ? localConsumption : manualValue;

                if (inputMode === 'indexes') {
                  // Pentru indexes, calculează din indecși (verifică localValues first)
                  const indexesData = expense?.indexes?.[apt.id] || {};
                  aptConsumption = indexTypes.reduce((sum, indexType) => {
                    const indexData = indexesData[indexType.id];
                    const localOld = localValues[`${localValuesKey}-${apt.id}-index-${indexType.id}-old`];
                    const localNew = localValues[`${localValuesKey}-${apt.id}-index-${indexType.id}-new`];
                    const oldIndex = localOld !== undefined ? localOld : indexData?.oldIndex;
                    const newIndex = localNew !== undefined ? localNew : indexData?.newIndex;
                    if (newIndex && oldIndex) {
                      return sum + (parseFloat(newIndex) - parseFloat(oldIndex));
                    }
                    return sum;
                  }, 0);
                } else {
                  // Pentru manual, folosește effectiveManualValue
                  aptConsumption = parseFloat(effectiveManualValue) || 0;
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
              return `${totalAfterParticipation.toFixed(2)} RON`;
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
            let apartmentsForDiff = apartments;

            if (filterInfo.type === 'all') {
              expectedAmount = parseFloat(expense?.billAmount || 0);
              apartmentsForDiff = apartments;
            } else if (filterInfo.type === 'stair' && receptionMode === 'per_stair') {
              expectedAmount = parseFloat(expense?.amountsByStair?.[filterInfo.stairId] || 0);
              apartmentsForDiff = apartments;
            } else if (filterInfo.type === 'stair' && receptionMode === 'per_block' && filterInfo.blockId) {
              expectedAmount = parseFloat(expense?.amountsByBlock?.[filterInfo.blockId] || 0);
              const allApts = getAssociationApartments();
              const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
              const blockStairIds = blockStairs.map(s => s.id);
              apartmentsForDiff = allApts.filter(apt => blockStairIds.includes(apt.stairId));
            } else if (filterInfo.type === 'stair' && receptionMode === 'per_association') {
              expectedAmount = parseFloat(expense?.billAmount || 0);
              apartmentsForDiff = getAssociationApartments();
            }

            const apartmentParticipations = config?.apartmentParticipation || {};

            const totalAfterParticipation = apartmentsForDiff.reduce((sum, apt) => {
              const participation = apartmentParticipations[apt.id];

              let aptAmount = 0;
              let aptConsumption = 0;

              const localConsumption = localValues[`${localValuesKey}-${apt.id}-consumption`];
              const manualValue = expense?.consumption?.[apt.id];
              const effectiveManualValue = localConsumption !== undefined ? localConsumption : manualValue;

              if (inputMode === 'indexes') {
                // Pentru indexes, calculează din indecși (verifică localValues first)
                const indexesData = expense?.indexes?.[apt.id] || {};
                aptConsumption = indexTypes.reduce((sum, indexType) => {
                  const indexData = indexesData[indexType.id];
                  const localOld = localValues[`${localValuesKey}-${apt.id}-index-${indexType.id}-old`];
                  const localNew = localValues[`${localValuesKey}-${apt.id}-index-${indexType.id}-new`];
                  const oldIndex = localOld !== undefined ? localOld : indexData?.oldIndex;
                  const newIndex = localNew !== undefined ? localNew : indexData?.newIndex;
                  if (newIndex && oldIndex) {
                    return sum + (parseFloat(newIndex) - parseFloat(oldIndex));
                  }
                  return sum;
                }, 0);
              } else {
                aptConsumption = parseFloat(effectiveManualValue) || 0;
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

            const diff = totalAfterParticipation - expectedAmount;

            if (Math.abs(diff) >= 0.01) {
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
        )}

        {/* Diferență totală */}
        {expense?.isUnitBased && expense?.billAmount && (
          <td className="px-2 py-2 border-l bg-orange-50 align-top">
            <div className="text-right font-bold text-orange-700">
              {(() => {
                if (!expense || !calculateExpenseDifferences) {
                  return '-';
                }

                const allApartments = getAssociationApartments();
                const filterInfo = getFilterInfo(selectedStairTab, stairs, blocks);

                // Creează un expense actualizat cu consumurile din localValues
                const updatedConsumption = {};
                allApartments.forEach(apt => {
                  const localConsumption = localValues[`${localValuesKey}-${apt.id}-consumption`];
                  const manualValue = expense?.consumption?.[apt.id];
                  const finalValue = localConsumption !== undefined ? localConsumption : manualValue;
                  updatedConsumption[apt.id] = parseFloat(finalValue) || 0;
                });

                const updatedExpense = {
                  ...expense,
                  consumption: updatedConsumption
                };

                const expenseDifferences = calculateExpenseDifferences(updatedExpense, allApartments);

                // Determină scope-ul (scara, bloc sau asociație)
                let receptionMode = expense.receptionMode || 'total';
                if (expense.expenseEntryMode) {
                  if (expense.expenseEntryMode === 'building') receptionMode = 'per_block';
                  else if (expense.expenseEntryMode === 'staircase') receptionMode = 'per_stair';
                  else if (expense.expenseEntryMode === 'per_association') receptionMode = 'total';
                }

                let scopeApartments = allApartments;
                if (filterInfo.type === 'stair') {
                  if (receptionMode === 'per_stair') {
                    scopeApartments = allApartments.filter(apt => apt.stairId === filterInfo.stairId);
                  } else if (receptionMode === 'per_block') {
                    const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
                    const blockStairIds = blockStairs.map(s => s.id);
                    scopeApartments = allApartments.filter(apt => blockStairIds.includes(apt.stairId));
                  } else {
                    scopeApartments = allApartments;
                  }
                }

                // Calculează diferența pe apartamentele din SCOPE
                // Exclude apartamentele cu participare "exclus" DOAR dacă includeExcludedInDifference nu este bifat
                const apartmentParticipations = config?.apartmentParticipation || {};
                const diffConfig = expense?.differenceDistribution || config?.differenceDistribution || {};
                const includeExcluded = diffConfig.includeExcludedInDifference || false;

                const filteredDifference = scopeApartments.reduce((sum, apt) => {
                  const participation = apartmentParticipations[apt.id];
                  // Exclude doar dacă este exclus ȘI nu avem includeExcludedInDifference
                  if (participation?.type === 'excluded' && !includeExcluded) {
                    return sum;
                  }
                  return sum + (expenseDifferences[apt.id] || 0);
                }, 0);

                if (Math.abs(filteredDifference) < 0.01) {
                  return '-';
                }

                return `${filteredDifference.toFixed(2)} RON`;
              })()}
            </div>
            {(() => {
              // Mesaj explicativ sub valoarea diferenței - green message
              if (!expense || !calculateExpenseDifferences) {
                return null;
              }

              const allApartments = getAssociationApartments();
              const filterInfo = getFilterInfo(selectedStairTab, stairs, blocks);

              // Creează un expense actualizat cu consumurile din localValues
              const updatedConsumption = {};
              allApartments.forEach(apt => {
                const localConsumption = localValues[`${localValuesKey}-${apt.id}-consumption`];
                const manualValue = expense?.consumption?.[apt.id];
                const finalValue = localConsumption !== undefined ? localConsumption : manualValue;
                updatedConsumption[apt.id] = parseFloat(finalValue) || 0;
              });

              const updatedExpense = {
                ...expense,
                consumption: updatedConsumption
              };

              const expenseDifferences = calculateExpenseDifferences(updatedExpense, allApartments);

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

              // Declarație comună pentru apartmentParticipations (folosită pentru calcule scope)
              const apartmentParticipations = config?.apartmentParticipation || {};

              // Calculează total introdus pe scope CU participări (dar fără diferențe distribuite)
              const totalIntrodusInScope = scopeApartments.reduce((sum, apt) => {
                const participation = apartmentParticipations[apt.id];

                // Calculează consumul brut - FOLOSEȘTE localValues pentru optimistic UI
                let aptConsumption = 0;
                const localConsumption = localValues[`${localValuesKey}-${apt.id}-consumption`];
                const manualValue = expense?.consumption?.[apt.id];
                const effectiveManualValue = localConsumption !== undefined ? localConsumption : manualValue;

                // Verifică dacă are indecși VALIDI
                const indexes = expense?.indexes?.[apt.id];
                let hasValidIndexes = false;
                if (indexes && Object.keys(indexes).length > 0) {
                  hasValidIndexes = Object.values(indexes).some(indexData =>
                    indexData.newIndex && indexData.oldIndex
                  );
                }

                // Determină inputMode (default 'manual' dacă nu există)
                const currentInputMode = config.indexConfiguration?.inputMode || 'manual';

                if (currentInputMode === 'indexes') {
                  // Modul INDECȘI: Folosește DOAR indexuri, ignoră consumption manual
                  if (hasValidIndexes) {
                    Object.values(indexes).forEach(indexData => {
                      if (indexData.newIndex && indexData.oldIndex) {
                        aptConsumption += parseFloat(indexData.newIndex) - parseFloat(indexData.oldIndex);
                      }
                    });
                  }
                  // Altfel aptConsumption rămâne 0 (nu folosește effectiveManualValue)
                } else {
                  // Modul MANUAL sau MIXT: prioritate indexuri, apoi manual
                  if (hasValidIndexes) {
                    Object.values(indexes).forEach(indexData => {
                      if (indexData.newIndex && indexData.oldIndex) {
                        aptConsumption += parseFloat(indexData.newIndex) - parseFloat(indexData.oldIndex);
                      }
                    });
                  } else {
                    aptConsumption = parseFloat(effectiveManualValue) || 0;
                  }
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

              // Calculează diferența distribuită pentru afișare
              // Exclude apartamentele cu participare "exclus" DOAR dacă includeExcludedInDifference nu este bifat
              const diffConfig = expense?.differenceDistribution || config?.differenceDistribution || {};
              const includeExcluded = diffConfig.includeExcludedInDifference || false;

              // Folosește scopeApartments (toate apartamentele din scope) pentru calcul
              const filteredDifference = scopeApartments.reduce((sum, apt) => {
                const participation = apartmentParticipations[apt.id];
                const aptDiff = expenseDifferences[apt.id] || 0;

                // Exclude doar dacă este exclus ȘI nu avem includeExcludedInDifference
                if (participation?.type === 'excluded' && !includeExcluded) {
                  return sum;
                }
                return sum + aptDiff;
              }, 0);

              if (Math.abs(filteredDifference) < 0.01) {
                return null;
              }

              return (
                <div className="text-xs text-green-600 font-medium mt-1">
                  Diferență distribuită: {filteredDifference.toFixed(2)} RON
                  <div className="text-[10px] text-gray-500">
                    (din {Math.abs(totalDifferenceInScope).toFixed(2)} RON pe {scopeLabel})
                  </div>
                </div>
              );
            })()}
          </td>
        )}

        {/* TOTAL DISTRIBUIT - suma totală din tabelul de întreținere */}
        {expense?.isUnitBased && expense?.billAmount && (
          <td className="px-2 py-2 border-l bg-indigo-50 align-top">
            <div className="text-right font-bold text-indigo-800 text-base">
              {(() => {
                // Calculează totalul după participare pentru apartamentele filtrate
                const apartmentParticipations = config?.apartmentParticipation || {};
                const totalAfterParticipation = apartments.reduce((sum, apt) => {
                  const participation = apartmentParticipations[apt.id];

                  let aptConsumption = 0;
                  const localConsumption = localValues[`${localValuesKey}-${apt.id}-consumption`];
                  const manualValue = expense?.consumption?.[apt.id];
                  const effectiveManualValue = localConsumption !== undefined ? localConsumption : manualValue;

                  if (inputMode === 'indexes') {
                    // Modul INDECȘI: Folosește DOAR indexuri
                    const indexes = expense?.indexes?.[apt.id];
                    if (indexes) {
                      Object.values(indexes).forEach(indexData => {
                        if (indexData.newIndex && indexData.oldIndex) {
                          aptConsumption += parseFloat(indexData.newIndex) - parseFloat(indexData.oldIndex);
                        }
                      });
                    }
                    // Nu folosește effectiveManualValue în modul 'indexes'
                  } else {
                    // Modul MANUAL sau MIXT: prioritate indexuri, apoi manual
                    const indexes = expense?.indexes?.[apt.id];
                    let hasValidIndexes = false;
                    if (indexes && Object.keys(indexes).length > 0) {
                      hasValidIndexes = Object.values(indexes).some(indexData =>
                        indexData.newIndex && indexData.oldIndex
                      );
                    }

                    if (hasValidIndexes) {
                      // Folosește indexuri dacă există
                      Object.values(indexes).forEach(indexData => {
                        if (indexData.newIndex && indexData.oldIndex) {
                          aptConsumption += parseFloat(indexData.newIndex) - parseFloat(indexData.oldIndex);
                        }
                      });
                    } else {
                      // Altfel folosește consumption manual
                      aptConsumption = parseFloat(effectiveManualValue) || 0;
                    }
                  }

                  let aptAmount = aptConsumption * (expense?.unitPrice || 0);

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

                // Calculează diferența distribuită pe apartamentele din SCOPE (scara/bloc/asociație)
                // Exclude apartamentele cu participare "exclus" DOAR dacă includeExcludedInDifference nu este bifat
                const allApartments = getAssociationApartments();
                const expenseDifferences = calculateExpenseDifferences ? calculateExpenseDifferences(expense, allApartments) : {};
                const diffConfig = expense?.differenceDistribution || config?.differenceDistribution || {};
                const includeExcluded = diffConfig.includeExcludedInDifference || false;

                // Determină filterInfo pentru a afla scope-ul curent
                const filterInfo = getFilterInfo(selectedStairTab, stairs, blocks);

                // Determină scope-ul (scara, bloc sau asociație)
                let receptionMode = expense.receptionMode || 'total';
                if (expense.expenseEntryMode) {
                  if (expense.expenseEntryMode === 'building') receptionMode = 'per_block';
                  else if (expense.expenseEntryMode === 'staircase') receptionMode = 'per_stair';
                  else if (expense.expenseEntryMode === 'per_association') receptionMode = 'total';
                }

                let scopeApartments = allApartments;
                if (filterInfo.type === 'stair') {
                  if (receptionMode === 'per_stair') {
                    scopeApartments = allApartments.filter(apt => apt.stairId === filterInfo.stairId);
                  } else if (receptionMode === 'per_block') {
                    const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
                    const blockStairIds = blockStairs.map(s => s.id);
                    scopeApartments = allApartments.filter(apt => blockStairIds.includes(apt.stairId));
                  } else {
                    scopeApartments = allApartments;
                  }
                }

                // Folosește scopeApartments (apartamentele din scope) pentru calcul total
                const totalDifference = scopeApartments.reduce((sum, apt) => {
                  const participation = apartmentParticipations[apt.id];
                  // Exclude doar dacă este exclus ȘI nu avem includeExcludedInDifference
                  if (participation?.type === 'excluded' && !includeExcluded) {
                    return sum;
                  }
                  return sum + (expenseDifferences[apt.id] || 0);
                }, 0);

                // Total = După participare + Diferență
                const grandTotal = totalAfterParticipation + totalDifference;

                return `${grandTotal.toFixed(2)} RON`;
              })()}
            </div>
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
  // Verifică dacă coloana "Persoane" este relevantă
  // Pentru sume individuale, arată doar când distribuția este pe persoane
  const showPersonsColumn = config?.distributionType === 'perPerson';

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 sticky top-0">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b-2 w-16">Apt</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b-2 min-w-[120px]">Proprietar</th>

            {/* Coloană Persoane - doar când distribuția este pe persoane */}
            {showPersonsColumn && (
              <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b-2 border-l w-20">Persoane</th>
            )}

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
                style={{ height: '40px' }}
              >
                {/* Apt */}
                <td className="px-3 py-2 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="inline-block min-w-[40px]">{apartment.number}</span>
                    {/* Spațiu rezervat fix pentru iconița de atenționare */}
                    <span className={`inline-block w-3 text-xs ${!isComplete && !isDisabled && !isExcluded ? 'text-orange-500' : 'invisible'}`}>
                      ⚠
                    </span>
                  </div>
                </td>

                {/* Proprietar */}
                <td className="px-3 py-2 text-gray-600 truncate max-w-[150px]" title={apartment.owner}>
                  {apartment.owner || '-'}
                </td>

                {/* Persoane - doar când e relevantă */}
                {showPersonsColumn && (
                  <td className="px-3 py-2 text-center font-medium border-l">
                    {apartment.persons || 0}
                  </td>
                )}

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
                      className={`w-20 px-2 py-0.5 border border-gray-300 rounded text-xs text-gray-900 text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${!hasManualValue ? 'border-orange-300 bg-orange-50' : ''}`}
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
          showPersonsColumn={showPersonsColumn}
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
  blocks,
  showPersonsColumn = true
}) => {
  return (
    <tfoot>
      <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
        <td colSpan={2 + (showPersonsColumn ? 1 : 0) + 1} className="px-2 py-2 text-right border-r">TOTAL:</td>

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
