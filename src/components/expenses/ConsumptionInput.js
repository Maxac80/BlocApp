import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Calculator } from 'lucide-react';
import { defaultExpenseTypes } from '../../data/expenseTypes';

const ConsumptionInput = ({
  associationExpenses,
  getExpenseConfig,
  getAssociationApartments,
  updateExpenseConsumption,
  updateExpenseIndividualAmount,
  updatePendingConsumption,
  updatePendingIndividualAmount,
  updateExpenseIndexes,
  updatePendingIndexes,
  currentSheet,
  isMonthReadOnly,
  currentMonth,
  monthType,
  blocks,
  stairs,
  selectedStairTab,
  setSelectedStairTab,
  getDisabledExpenseTypes,
  getApartmentParticipation,
  expandExpenseName,
  onExpenseNameClick
}) => {
  // State pentru expandarea cheltuielilor (accordion)
  const [expandedExpenses, setExpandedExpenses] = useState({});

  // State local pentru optimistic UI updates (evită lag-ul Firebase)
  const [localValues, setLocalValues] = useState({});

  // Auto-expandare când se primește un expense name
  useEffect(() => {
    if (expandExpenseName) {
      // Expandează DOAR această cheltuială (resetează restul)
      setExpandedExpenses({
        [expandExpenseName]: true
      });
    } else {
      // Când nu avem expense name, strânge toate
      setExpandedExpenses({});
    }
  }, [expandExpenseName]);

  // Cleanup local values când sheet-ul se schimbă
  useEffect(() => {
    setLocalValues({});
  }, [currentSheet?.id]);

  // Toggle expand pentru o cheltuială
  const toggleExpense = (expenseKey) => {
    setExpandedExpenses(prev => ({
      ...prev,
      [expenseKey]: !prev[expenseKey]
    }));
  };

  // Obține toate tipurile de cheltuieli care POT avea consum (chiar dacă nu sunt distribuite)
  // FILTREAZĂ DOAR CELE ACTIVE (nu disabled)
  // IMPORTANT: Arată DOAR cheltuielile pe CONSUM, NU cele individuale nedistribuite
  const getAllConsumptionExpenseTypes = () => {
    const disabledTypes = getDisabledExpenseTypes ? getDisabledExpenseTypes() : [];

    // Tipurile default care sunt pe consum ȘI ACTIVE
    const defaultConsumptionTypes = defaultExpenseTypes.filter(type =>
      type.defaultDistribution === 'consumption' &&
      !disabledTypes.some(dt => dt.name === type.name)
    );

    // Adaugă și cheltuielile custom care au distribuție pe consum ȘI ACTIVE
    const customTypes = [];
    associationExpenses.forEach(expense => {
      const config = getExpenseConfig(expense.name);
      if (config.distributionType === 'consumption' &&
          !defaultConsumptionTypes.some(dt => dt.name === expense.name) &&
          !disabledTypes.some(dt => dt.name === expense.name)) {
        customTypes.push({
          name: expense.name,
          defaultDistribution: config.distributionType
        });
      }
    });

    // Adaugă cheltuielile DISTRIBUITE cu sume individuale (doar pentru afișare/editare)
    associationExpenses.forEach(expense => {
      const config = getExpenseConfig(expense.name);
      if (config.distributionType === 'individual' &&
          !disabledTypes.some(dt => dt.name === expense.name) &&
          !customTypes.some(ct => ct.name === expense.name) &&
          !defaultConsumptionTypes.some(dt => dt.name === expense.name)) {
        customTypes.push({
          name: expense.name,
          defaultDistribution: config.distributionType
        });
      }
    });

    return [...defaultConsumptionTypes, ...customTypes];
  };

  // Funcție pentru sortarea cheltuielilor
  const sortExpenseTypes = (types) => {
    return types.sort((a, b) => {
      const defaultOrder = [
        "Apă caldă", "Apă rece", "Canal", "Întreținere lift", "Energie electrică",
        "Service interfon", "Cheltuieli cu asociația", "Salarii NETE", "Impozit ANAF",
        "Spații în folosință", "Căldură"
      ];

      const aIndex = defaultOrder.indexOf(a.name);
      const bIndex = defaultOrder.indexOf(b.name);

      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }

      if (aIndex !== -1 && bIndex === -1) return -1;
      if (aIndex === -1 && bIndex !== -1) return 1;

      return a.name.localeCompare(b.name);
    });
  };

  const allConsumptionTypes = sortExpenseTypes(getAllConsumptionExpenseTypes());

  // Găsește cheltuiala distribuită pentru un tip (dacă există)
  const getDistributedExpense = (expenseTypeName) => {
    return associationExpenses.find(exp => exp.name === expenseTypeName);
  };

  // Determină blocul și scara pentru filtrul activ
  const getFilterInfo = () => {
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

  // Filtrează apartamentele pe baza filtrului activ
  const getFilteredApartments = () => {
    const allApartments = getAssociationApartments();
    const filterInfo = getFilterInfo();

    if (filterInfo.type === 'all') return allApartments;

    return allApartments.filter(apt => apt.stairId === filterInfo.stairId);
  };

  // Calculează status pentru o cheltuială
  const getExpenseStatus = (expenseTypeName) => {
    const expense = getDistributedExpense(expenseTypeName);
    const config = getExpenseConfig(expenseTypeName);
    const apartments = getFilteredApartments();
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
      dataObject = isConsumption ? (expense.consumption || {}) : (expense.individualAmounts || {}); // FIX: individualAmounts
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

  return (
    <>
      {/* Header cu total */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {allConsumptionTypes.length} {allConsumptionTypes.length === 1 ? 'tip de cheltuială' : 'tipuri de cheltuieli'}
            {getFilterInfo().type !== 'all' && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                ({getFilterInfo().blockName} - {getFilterInfo().stairName})
              </span>
            )}
          </h3>
        </div>
      </div>

      {allConsumptionTypes.length === 0 ? (
        <div className="text-center py-12">
          <Calculator className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Nu există cheltuieli pe consum sau individuale</p>
          <p className="text-gray-500 text-sm mt-1">Configurează tipuri de cheltuieli cu distribuție pe consum</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allConsumptionTypes.map(expenseType => {
            const expense = getDistributedExpense(expenseType.name);
            const config = getExpenseConfig(expenseType.name);
            const status = getExpenseStatus(expenseType.name);
            const isExpanded = expandedExpenses[expenseType.name];
            const apartments = getFilteredApartments();

            const isConsumption = config.distributionType === 'consumption';

            // Obține date din expense distribuit SAU din pending consumptions
            let dataObject = {};
            if (expense) {
              // Cheltuială distribuită - folosește datele din expense
              dataObject = isConsumption
                ? (expense.consumption || {})
                : (expense.individualAmounts || {}); // FIX: folosește individualAmounts, nu fixedAmounts
            } else {
              // Cheltuială nedistribuită - folosește datele pending din sheet
              if (isConsumption) {
                dataObject = currentSheet?.pendingConsumptions?.[expenseType.name] || {};
              } else {
                dataObject = currentSheet?.pendingIndividualAmounts?.[expenseType.name] || {};
              }
            }

            return (
              <div key={expenseType.name} className="border border-gray-300 rounded-lg overflow-hidden hover:border-indigo-400 transition-colors">
                {/* Header - întotdeauna vizibil */}
                <div
                  className={`p-3 ${
                    status.status === 'not_distributed'
                      ? 'bg-gray-50'
                      : 'bg-gradient-to-r from-blue-50 to-white'
                  } cursor-pointer hover:from-blue-100`}
                  onClick={() => toggleExpense(expenseType.name)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Nume și sumă pe același rând */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {expense ? (
                            <h4
                              className="font-semibold text-base text-gray-900 px-2 py-1 -ml-2 rounded cursor-pointer transition-all hover:bg-indigo-50 hover:text-indigo-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onExpenseNameClick) {
                                  onExpenseNameClick(expenseType.name);
                                }
                              }}
                              title="Click pentru a vedea cheltuiala în Cheltuieli distribuite"
                            >
                              {expenseType.name}
                            </h4>
                          ) : (
                            <h4 className="font-semibold text-base text-gray-900">
                              {expenseType.name}
                            </h4>
                          )}
                          {status.status === 'not_distributed' && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                              Nedistribuită
                            </span>
                          )}
                        </div>
                        {expense && (
                          <div className="text-right">
                            <div className="text-xl font-bold text-blue-600 ml-4">
                              {isConsumption && expense.unitPrice ? (
                                `${parseFloat(expense.unitPrice).toFixed(2)} RON/${expense.name.toLowerCase().includes("apă") || expense.name.toLowerCase().includes("canal") ? "mc" : "Gcal"}`
                              ) : (
                                `${(expense.amount || 0).toFixed(2)} RON`
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Status badge */}
                      <div className="mt-2">
                        {status.isComplete ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                            ✓ {isConsumption ? 'Consumuri complete' : 'Sume complete'}
                          </span>
                        ) : status.status === 'not_distributed' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                            ⊘ Nedistribuită - {status.total} apartamente
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                            ⚠ {isConsumption ? 'Consumuri' : 'Sume'} incomplete: {status.completed}/{status.total} apartamente
                          </span>
                        )}
                      </div>

                      {/* Informații pe linie compactă */}
                      <div className="space-y-1 text-xs mt-2">
                        <div className="flex items-center gap-3 text-gray-600">
                          <span className="font-medium">Distribuție:</span>
                          <span>
                            {config.distributionType === "consumption" && "Pe consum (mc/apartament)"}
                            {config.distributionType === "individual" && "Sume individuale (RON/apartament)"}
                          </span>
                        </div>
                        {/* Badge mod introducere */}
                        {isConsumption ? (
                          // Pentru cheltuieli pe consum - afișează modul bazat pe config
                          config.indexConfiguration && (
                            <div className="flex items-center gap-3 text-gray-600">
                              <span className="font-medium">Mod introducere:</span>
                              {config.indexConfiguration.inputMode === 'mixed' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                                  🔧 Mixt
                                </span>
                              )}
                              {config.indexConfiguration.inputMode === 'indexes' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                  📊 Indecși
                                </span>
                              )}
                              {config.indexConfiguration.inputMode === 'manual' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                                  ✏️ Introducere consumuri
                                </span>
                              )}
                            </div>
                          )
                        ) : (
                          // Pentru cheltuieli individuale - badge fix (dummy)
                          <div className="flex items-center gap-3 text-gray-600">
                            <span className="font-medium">Mod introducere:</span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                              ✏️ Introducere sume
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Chevron pentru expand/collapse */}
                    <div className="flex-shrink-0 pt-1">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Detalii expandabile */}
                {isExpanded && (
                  <div className="p-4 bg-white border-t border-gray-200 space-y-4">
                    {status.status === 'not_distributed' && (
                      <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-700">
                          💡 <strong>Notă:</strong> Această cheltuială nu a fost încă distribuită pentru {currentMonth}.
                          Poți introduce {isConsumption ? 'consumurile' : 'sumele'} acum, iar când vei distribui cheltuiala, datele vor fi preluate automat.
                        </p>
                      </div>
                    )}

                    {/* Tabel apartamente - afișat MEREU, chiar dacă nu e distribuită */}
                    <>
                        <div className="overflow-x-auto border rounded-lg">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b-2 w-16">Apt</th>
                                <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b-2 min-w-[120px]">Proprietar</th>

                                {/* Coloane pentru contoare (INDEXES sau MIXED) */}
                                {isConsumption && config.indexConfiguration?.inputMode !== 'manual' && config.indexConfiguration?.indexTypes?.length > 0 && (
                                  config.indexConfiguration.indexTypes.map(indexType => (
                                    <React.Fragment key={indexType.id}>
                                      <th className="px-2 py-2 text-center font-semibold text-gray-700 border-b-2 border-l bg-blue-50" colSpan="2">
                                        {indexType.name}
                                      </th>
                                    </React.Fragment>
                                  ))
                                )}

                                {/* Coloană consum (pentru toate modurile când e consumption) */}
                                {isConsumption && (
                                  <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b-2 border-l bg-green-50">
                                    Consum
                                    <div className="text-[10px] font-normal text-gray-500">({config.consumptionUnit || 'mc'})</div>
                                  </th>
                                )}

                                {/* Coloană sume individuale (pentru distributionType === 'individual') */}
                                {!isConsumption && (
                                  <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b-2 border-l">
                                    Sumă (RON)
                                  </th>
                                )}

                                {/* Coloană total RON (doar dacă avem preț unitar) */}
                                {isConsumption && expense?.unitPrice && (
                                  <th className="px-3 py-2 text-right font-semibold text-gray-700 border-b-2 border-l bg-purple-50">
                                    Total (RON)
                                  </th>
                                )}
                              </tr>
                              {/* Sub-header pentru Vechi/Nou */}
                              {isConsumption && config.indexConfiguration?.inputMode !== 'manual' && config.indexConfiguration?.indexTypes?.length > 0 && (
                                <tr className="bg-blue-50 text-xs">
                                  <th className="border-b"></th>
                                  <th className="border-b"></th>
                                  {config.indexConfiguration.indexTypes.map(indexType => (
                                    <React.Fragment key={indexType.id}>
                                      <th className="px-2 py-1 text-center text-gray-600 border-b border-l">Vechi</th>
                                      <th className="px-2 py-1 text-center text-gray-600 border-b">Nou</th>
                                    </React.Fragment>
                                  ))}
                                  <th className="border-b border-l"></th>
                                  {expense?.unitPrice && <th className="border-b border-l"></th>}
                                </tr>
                              )}
                            </thead>
                            <tbody>
                              {apartments.map(apartment => {
                                const indexTypes = config.indexConfiguration?.indexTypes || [];
                                const inputMode = config.indexConfiguration?.inputMode || 'manual';

                                // Obține datele de indecși
                                let indexesData = {};
                                if (expense) {
                                  indexesData = expense.indexes?.[apartment.id] || {};
                                } else {
                                  indexesData = currentSheet?.pendingIndexes?.[expenseType.name]?.[apartment.id] || {};
                                }

                                // Obține consum manual/total
                                const manualValue = String(dataObject[apartment.id] || '');

                                // Calculează consum total din indecși - verifică OPTIMISTIC values first
                                const totalIndexConsumption = indexTypes.reduce((sum, indexType) => {
                                  const indexData = indexesData[indexType.id];

                                  // Verifică local values first, apoi Firebase
                                  const localOld = localValues[`${expenseType.name}-${apartment.id}-index-${indexType.id}-old`];
                                  const localNew = localValues[`${expenseType.name}-${apartment.id}-index-${indexType.id}-new`];

                                  const oldIndex = localOld !== undefined ? localOld : indexData?.oldIndex;
                                  const newIndex = localNew !== undefined ? localNew : indexData?.newIndex;

                                  if (newIndex && oldIndex) {
                                    return sum + (parseFloat(newIndex) - parseFloat(oldIndex));
                                  }
                                  return sum;
                                }, 0);

                                // Verifică local values FIRST pentru hasManualValue
                                const localConsumption = localValues[`${expenseType.name}-${apartment.id}-consumption`];
                                const localIndividual = localValues[`${expenseType.name}-${apartment.id}`];

                                const effectiveManualValue = isConsumption
                                  ? (localConsumption !== undefined ? localConsumption : manualValue)
                                  : (localIndividual !== undefined ? localIndividual : manualValue);

                                const hasIndexData = totalIndexConsumption > 0;
                                // ZERO este o valoare validă de completare
                                const hasManualValue = effectiveManualValue !== '' && effectiveManualValue !== null && effectiveManualValue !== undefined && !isNaN(parseFloat(effectiveManualValue));

                                // Pentru MIXED: auto-fill consum din indecși dacă există
                                const displayedConsumption = String((inputMode === 'mixed' && hasIndexData && !hasManualValue)
                                  ? totalIndexConsumption.toFixed(2)
                                  : manualValue);

                                // Verifică dacă e complet
                                const isComplete = (!isConsumption && hasManualValue) ||
                                                   (isConsumption && (
                                                     (inputMode === 'manual' && hasManualValue) ||
                                                     (inputMode === 'indexes' && hasIndexData) ||
                                                     (inputMode === 'mixed' && (hasIndexData || hasManualValue))
                                                   ));

                                // Verifică dacă apartamentul este exclus din această cheltuială
                                // Citește din config.apartmentParticipation care e salvat în Firebase
                                const apartmentParticipations = config.apartmentParticipation || {};
                                const participation = apartmentParticipations[apartment.id];

                                // Verifică dacă e exclus - participation este obiect { type: 'excluded' }
                                const isExcluded = participation?.type === 'excluded';

                                const isDisabled = isMonthReadOnly || isExcluded;

                                // Calculează totalul final pentru acest apartament
                                let finalConsumption = 0;
                                if (isConsumption) {
                                  if (inputMode === 'indexes') {
                                    finalConsumption = totalIndexConsumption;
                                  } else if (inputMode === 'mixed') {
                                    finalConsumption = hasManualValue ? parseFloat(manualValue) : totalIndexConsumption;
                                  } else {
                                    finalConsumption = parseFloat(manualValue) || 0;
                                  }
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
                                    {/* Apt */}
                                    <td className="px-3 py-2 font-medium">
                                      <div className="flex items-center gap-2">
                                        <span className="inline-block min-w-[40px]">{apartment.number}</span>
                                        {isExcluded && <span className="text-xs bg-gray-300 text-gray-700 px-1.5 py-0.5 rounded">EXCLUS</span>}
                                        {!isComplete && !isDisabled && !isExcluded && <span className="text-orange-500 text-xs">⚠</span>}
                                      </div>
                                    </td>

                                    {/* Proprietar */}
                                    <td className="px-3 py-2 text-gray-600 truncate max-w-[150px]" title={apartment.owner}>
                                      {apartment.owner || '-'}
                                    </td>

                                    {/* Contoare: Vechi | Nou (INDEXES sau MIXED) */}
                                    {isConsumption && inputMode !== 'manual' && indexTypes.length > 0 && indexTypes.map(indexType => {
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
                                                value={localValues[`${expenseType.name}-${apartment.id}-index-${indexType.id}-old`] ?? indexData.oldIndex}
                                                onChange={(e) => {
                                                  const inputValue = e.target.value;
                                                  if (inputValue === "" || /^\d*[.,]?\d*$/.test(inputValue)) {
                                                    const normalizedValue = inputValue.replace(',', '.');

                                                    // Optimistic UI update
                                                    setLocalValues(prev => ({
                                                      ...prev,
                                                      [`${expenseType.name}-${apartment.id}-index-${indexType.id}-old`]: normalizedValue
                                                    }));

                                                    const updatedIndexes = {
                                                      ...indexesData,
                                                      [indexType.id]: { ...indexData, oldIndex: normalizedValue, meterName: indexType.name }
                                                    };

                                                    if (expense) {
                                                      updateExpenseIndexes(expense.id, apartment.id, updatedIndexes);
                                                    } else {
                                                      updatePendingIndexes(expenseType.name, apartment.id, updatedIndexes);
                                                    }

                                                    // MIXED: Auto-update consum când schimbi indecșii
                                                    if (inputMode === 'mixed' && indexData.newIndex && normalizedValue) {
                                                      const autoConsumption = parseFloat(indexData.newIndex) - parseFloat(normalizedValue);
                                                      if (autoConsumption > 0) {
                                                        if (expense) {
                                                          updateExpenseConsumption(expense.id, apartment.id, autoConsumption);
                                                        } else {
                                                          updatePendingConsumption(expenseType.name, apartment.id, autoConsumption);
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
                                                value={localValues[`${expenseType.name}-${apartment.id}-index-${indexType.id}-new`] ?? indexData.newIndex}
                                                onChange={(e) => {
                                                  const inputValue = e.target.value;
                                                  if (inputValue === "" || /^\d*[.,]?\d*$/.test(inputValue)) {
                                                    const normalizedValue = inputValue.replace(',', '.');

                                                    // Optimistic UI update
                                                    setLocalValues(prev => ({
                                                      ...prev,
                                                      [`${expenseType.name}-${apartment.id}-index-${indexType.id}-new`]: normalizedValue
                                                    }));

                                                    const updatedIndexes = {
                                                      ...indexesData,
                                                      [indexType.id]: { ...indexData, newIndex: normalizedValue, meterName: indexType.name }
                                                    };
                                                    if (expense) {
                                                      updateExpenseIndexes(expense.id, apartment.id, updatedIndexes);
                                                    } else {
                                                      updatePendingIndexes(expenseType.name, apartment.id, updatedIndexes);
                                                    }

                                                    // MIXED: Auto-update consum când schimbi indecșii
                                                    if (inputMode === 'mixed' && indexData.oldIndex && normalizedValue) {
                                                      const autoConsumption = parseFloat(normalizedValue) - parseFloat(indexData.oldIndex);
                                                      if (autoConsumption > 0) {
                                                        if (expense) {
                                                          updateExpenseConsumption(expense.id, apartment.id, autoConsumption);
                                                        } else {
                                                          updatePendingConsumption(expenseType.name, apartment.id, autoConsumption);
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

                                    {/* Coloană Consum (pentru consumption) */}
                                    {isConsumption && (
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
                                            value={localValues[`${expenseType.name}-${apartment.id}-consumption`] ?? displayedConsumption}
                                            onChange={(e) => {
                                              const inputValue = e.target.value;
                                              if (inputValue === "" || /^\d*[.,]?\d*$/.test(inputValue)) {
                                                const normalizedValue = inputValue.replace(',', '.');

                                                // Optimistic UI update
                                                setLocalValues(prev => ({
                                                  ...prev,
                                                  [`${expenseType.name}-${apartment.id}-consumption`]: normalizedValue
                                                }));

                                                // Salvare în Firebase
                                                if (expense) {
                                                  updateExpenseConsumption(expense.id, apartment.id, normalizedValue);
                                                } else {
                                                  updatePendingConsumption(expenseType.name, apartment.id, normalizedValue);
                                                }
                                              }
                                            }}
                                            onBlur={(e) => {
                                              const numericValue = parseFloat(e.target.value.replace(',', '.')) || 0;
                                              if (expense) {
                                                updateExpenseConsumption(expense.id, apartment.id, numericValue);
                                              } else {
                                                updatePendingConsumption(expenseType.name, apartment.id, numericValue);
                                              }
                                            }}
                                            className={`w-20 px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 text-center font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${!hasManualValue && !hasIndexData ? 'border-orange-300 bg-orange-50' : ''}`}
                                          />
                                        )}
                                      </td>
                                    )}

                                    {/* Sume individuale (pentru distributionType === 'individual') */}
                                    {!isConsumption && (
                                      <td className="px-3 py-2 text-center border-l">
                                        {isDisabled ? (
                                          <span className="text-gray-600">{isExcluded ? '-' : (manualValue || '-')}</span>
                                        ) : (
                                          <input
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="-"
                                            value={localValues[`${expenseType.name}-${apartment.id}`] ?? manualValue}
                                            onChange={(e) => {
                                              const inputValue = e.target.value;
                                              if (inputValue === "" || /^\d*[.,]?\d*$/.test(inputValue)) {
                                                const normalizedValue = inputValue.replace(',', '.');

                                                // Optimistic UI update - afișare imediată
                                                setLocalValues(prev => ({
                                                  ...prev,
                                                  [`${expenseType.name}-${apartment.id}`]: normalizedValue
                                                }));

                                                // Salvare în Firebase (async)
                                                if (expense) {
                                                  updateExpenseIndividualAmount(expense.id, apartment.id, normalizedValue);
                                                } else {
                                                  updatePendingIndividualAmount(expenseType.name, apartment.id, normalizedValue);
                                                }
                                              }
                                            }}
                                            onBlur={(e) => {
                                              const numericValue = parseFloat(e.target.value.replace(',', '.')) || 0;
                                              if (expense) {
                                                updateExpenseIndividualAmount(expense.id, apartment.id, numericValue);
                                              } else {
                                                updatePendingIndividualAmount(expenseType.name, apartment.id, numericValue);
                                              }
                                            }}
                                            className={`w-20 px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${!hasManualValue ? 'border-orange-300 bg-orange-50' : ''}`}
                                          />
                                        )}
                                      </td>
                                    )}

                                    {/* Total RON (doar dacă avem preț unitar) */}
                                    {isConsumption && expense?.unitPrice && (
                                      <td className="px-3 py-2 text-right font-semibold border-l bg-purple-50 text-purple-700">
                                        {isExcluded ? '-' : (finalConsumption > 0 ? (finalConsumption * expense.unitPrice).toFixed(2) : '-')}
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>

                            {/* Footer cu totaluri - CONSUMPTION */}
                            {isConsumption && expense && apartments.length > 0 && (
                              <tfoot className="bg-gray-100 font-bold sticky bottom-0">
                                <tr className="border-t-2">
                                  <td colSpan="2" className="px-3 py-2 text-right">TOTAL:</td>

                                  {/* Coloane pentru contoare - lasă goale */}
                                  {config.indexConfiguration?.inputMode !== 'manual' && config.indexConfiguration?.indexTypes?.length > 0 && (
                                    config.indexConfiguration.indexTypes.map(indexType => (
                                      <React.Fragment key={indexType.id}>
                                        <td className="border-l"></td>
                                        <td></td>
                                      </React.Fragment>
                                    ))
                                  )}

                                  {/* Total consum */}
                                  <td className="px-3 py-2 text-center border-l bg-green-100 text-green-700">
                                    {(() => {
                                      const inputMode = config.indexConfiguration?.inputMode || 'manual';
                                      const indexTypes = config.indexConfiguration?.indexTypes || [];
                                      let totalConsum = 0;

                                      apartments.forEach(apartment => {
                                        // Skip apartamentele excluse din totaluri
                                        const apartmentParticipations = config.apartmentParticipation || {};
                                        const participation = apartmentParticipations[apartment.id];
                                        if (participation?.type === 'excluded') return;

                                        // Verifică local values OPTIMISTIC
                                        const localConsumption = localValues[`${expenseType.name}-${apartment.id}-consumption`];
                                        const firebaseValue = dataObject[apartment.id] || 0;
                                        const manualValue = localConsumption !== undefined ? localConsumption : firebaseValue;

                                        if (inputMode === 'indexes') {
                                          // INDEXES: doar din indecși (cu local values optimistic)
                                          const indexesData = expense.indexes?.[apartment.id] || {};
                                          const indexTotal = indexTypes.reduce((sum, indexType) => {
                                            const indexData = indexesData[indexType.id];
                                            // Verifică local values pentru indecși
                                            const localOld = localValues[`${expenseType.name}-${apartment.id}-index-${indexType.id}-old`];
                                            const localNew = localValues[`${expenseType.name}-${apartment.id}-index-${indexType.id}-new`];
                                            const oldIndex = localOld !== undefined ? localOld : indexData?.oldIndex;
                                            const newIndex = localNew !== undefined ? localNew : indexData?.newIndex;

                                            if (newIndex && oldIndex) {
                                              return sum + (parseFloat(newIndex) - parseFloat(oldIndex));
                                            }
                                            return sum;
                                          }, 0);
                                          totalConsum += indexTotal;
                                        } else if (inputMode === 'mixed') {
                                          // MIXED: prioritate manual, apoi indecși
                                          if (manualValue && parseFloat(manualValue) >= 0 && manualValue !== '') {
                                            totalConsum += parseFloat(manualValue);
                                          } else {
                                            const indexesData = expense.indexes?.[apartment.id] || {};
                                            const indexTotal = indexTypes.reduce((sum, indexType) => {
                                              const indexData = indexesData[indexType.id];
                                              // Verifică local values pentru indecși
                                              const localOld = localValues[`${expenseType.name}-${apartment.id}-index-${indexType.id}-old`];
                                              const localNew = localValues[`${expenseType.name}-${apartment.id}-index-${indexType.id}-new`];
                                              const oldIndex = localOld !== undefined ? localOld : indexData?.oldIndex;
                                              const newIndex = localNew !== undefined ? localNew : indexData?.newIndex;

                                              if (newIndex && oldIndex) {
                                                return sum + (parseFloat(newIndex) - parseFloat(oldIndex));
                                              }
                                              return sum;
                                            }, 0);
                                            totalConsum += indexTotal;
                                          }
                                        } else {
                                          // MANUAL: doar manual
                                          totalConsum += parseFloat(manualValue) || 0;
                                        }
                                      });

                                      return totalConsum.toFixed(2);
                                    })()}
                                  </td>

                                  {/* Total RON */}
                                  {expense?.unitPrice && (
                                    <td className="px-3 py-2 text-right border-l bg-purple-100 text-purple-700">
                                      {(() => {
                                        const inputMode = config.indexConfiguration?.inputMode || 'manual';
                                        const indexTypes = config.indexConfiguration?.indexTypes || [];
                                        let totalAmount = 0;

                                        apartments.forEach(apartment => {
                                          // Skip apartamentele excluse din totaluri
                                          const apartmentParticipations = config.apartmentParticipation || {};
                                          const participation = apartmentParticipations[apartment.id];
                                          if (participation?.type === 'excluded') return;

                                          // Verifică local values OPTIMISTIC
                                          const localConsumption = localValues[`${expenseType.name}-${apartment.id}-consumption`];
                                          const firebaseValue = dataObject[apartment.id] || 0;
                                          const manualValue = localConsumption !== undefined ? localConsumption : firebaseValue;

                                          if (inputMode === 'indexes') {
                                            const indexesData = expense.indexes?.[apartment.id] || {};
                                            const indexTotal = indexTypes.reduce((sum, indexType) => {
                                              const indexData = indexesData[indexType.id];
                                              // Verifică local values pentru indecși
                                              const localOld = localValues[`${expenseType.name}-${apartment.id}-index-${indexType.id}-old`];
                                              const localNew = localValues[`${expenseType.name}-${apartment.id}-index-${indexType.id}-new`];
                                              const oldIndex = localOld !== undefined ? localOld : indexData?.oldIndex;
                                              const newIndex = localNew !== undefined ? localNew : indexData?.newIndex;

                                              if (newIndex && oldIndex) {
                                                return sum + (parseFloat(newIndex) - parseFloat(oldIndex));
                                              }
                                              return sum;
                                            }, 0);
                                            totalAmount += indexTotal;
                                          } else if (inputMode === 'mixed') {
                                            if (manualValue && parseFloat(manualValue) >= 0 && manualValue !== '') {
                                              totalAmount += parseFloat(manualValue);
                                            } else {
                                              const indexesData = expense.indexes?.[apartment.id] || {};
                                              const indexTotal = indexTypes.reduce((sum, indexType) => {
                                                const indexData = indexesData[indexType.id];
                                                // Verifică local values pentru indecși
                                                const localOld = localValues[`${expenseType.name}-${apartment.id}-index-${indexType.id}-old`];
                                                const localNew = localValues[`${expenseType.name}-${apartment.id}-index-${indexType.id}-new`];
                                                const oldIndex = localOld !== undefined ? localOld : indexData?.oldIndex;
                                                const newIndex = localNew !== undefined ? localNew : indexData?.newIndex;

                                                if (newIndex && oldIndex) {
                                                  return sum + (parseFloat(newIndex) - parseFloat(oldIndex));
                                                }
                                                return sum;
                                              }, 0);
                                              totalAmount += indexTotal;
                                            }
                                          } else {
                                            totalAmount += parseFloat(manualValue) || 0;
                                          }
                                        });

                                        return (totalAmount * expense.unitPrice).toFixed(2);
                                      })()}
                                    </td>
                                  )}
                                </tr>
                              </tfoot>
                            )}

                            {/* Footer cu totaluri - INDIVIDUAL */}
                            {!isConsumption && expense && apartments.length > 0 && (
                              <tfoot className="bg-gray-100 font-bold sticky bottom-0">
                                <tr className="border-t-2">
                                  <td colSpan="2" className="px-3 py-2 text-right">TOTAL:</td>

                                  {/* Total sume individuale */}
                                  <td className="px-3 py-2 text-center border-l bg-green-100 text-green-700">
                                    {(() => {
                                      // Calculează total folosind local values OPTIMISTIC
                                      let total = 0;
                                      apartments.forEach(apartment => {
                                        // Skip apartamentele excluse din totaluri
                                        const apartmentParticipations = config.apartmentParticipation || {};
                                        const participation = apartmentParticipations[apartment.id];
                                        if (participation?.type === 'excluded') return;

                                        const localVal = localValues[`${expenseType.name}-${apartment.id}`];
                                        const firebaseVal = dataObject[apartment.id];
                                        const effectiveValue = localVal !== undefined ? localVal : firebaseVal;
                                        total += parseFloat(effectiveValue) || 0;
                                      });
                                      return total.toFixed(2) + ' RON';
                                    })()}
                                  </td>
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>

                        {/* Totaluri */}
                        {isConsumption && expense && expense.unitPrice && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div className="p-3 bg-blue-50 rounded">
                                <div className="text-sm text-gray-500">Total consum</div>
                                <div className="font-bold text-blue-600">
                                  {(() => {
                                    // Calculează total folosind local values OPTIMISTIC
                                    let total = 0;
                                    apartments.forEach(apt => {
                                      // Skip apartamentele excluse din totaluri
                                      const apartmentParticipations = config.apartmentParticipation || {};
                                      const participation = apartmentParticipations[apt.id];
                                      if (participation?.type === 'excluded') return;

                                      const localVal = localValues[`${expenseType.name}-${apt.id}-consumption`];
                                      const firebaseVal = dataObject[apt.id];
                                      const effectiveValue = localVal !== undefined ? localVal : firebaseVal;
                                      total += parseFloat(effectiveValue) || 0;
                                    });
                                    return total.toFixed(2);
                                  })()} {expense.name.toLowerCase().includes("apă") || expense.name.toLowerCase().includes("canal") ? "mc" : "Gcal"}
                                </div>
                              </div>
                              <div className="p-3 bg-green-50 rounded">
                                <div className="text-sm text-gray-500">Total calculat</div>
                                <div className="font-bold text-green-600">
                                  {(() => {
                                    // Calculează total folosind local values OPTIMISTIC
                                    let total = 0;
                                    apartments.forEach(apt => {
                                      // Skip apartamentele excluse din totaluri
                                      const apartmentParticipations = config.apartmentParticipation || {};
                                      const participation = apartmentParticipations[apt.id];
                                      if (participation?.type === 'excluded') return;

                                      const localVal = localValues[`${expenseType.name}-${apt.id}-consumption`];
                                      const firebaseVal = dataObject[apt.id];
                                      const effectiveValue = localVal !== undefined ? localVal : firebaseVal;
                                      total += parseFloat(effectiveValue) || 0;
                                    });
                                    return (total * expense.unitPrice).toFixed(2);
                                  })()} RON
                                </div>
                              </div>
                              {expense.billAmount && (
                                <div className="p-3 bg-orange-50 rounded">
                                  <div className="text-sm text-gray-500">Diferența</div>
                                  <div className={`font-bold ${(() => {
                                    // Calculează total folosind local values OPTIMISTIC
                                    let total = 0;
                                    apartments.forEach(apt => {
                                      // Skip apartamentele excluse din totaluri
                                      const apartmentParticipations = config.apartmentParticipation || {};
                                      const participation = apartmentParticipations[apt.id];
                                      if (participation?.type === 'excluded') return;

                                      const localVal = localValues[`${expenseType.name}-${apt.id}-consumption`];
                                      const firebaseVal = dataObject[apt.id];
                                      const effectiveValue = localVal !== undefined ? localVal : firebaseVal;
                                      total += parseFloat(effectiveValue) || 0;
                                    });
                                    const totalCalculat = total * expense.unitPrice;
                                    const diferenta = totalCalculat - expense.billAmount;
                                    const procentDiferenta = expense.billAmount > 0 ? Math.abs(diferenta / expense.billAmount * 100) : 0;

                                    if (procentDiferenta < 5) return "text-green-600";
                                    else if (procentDiferenta <= 10) return "text-yellow-600";
                                    else return "text-red-600";
                                  })()}`}>
                                    {(() => {
                                      // Calculează total folosind local values OPTIMISTIC
                                      let total = 0;
                                      apartments.forEach(apt => {
                                        // Skip apartamentele excluse din totaluri
                                        const apartmentParticipations = config.apartmentParticipation || {};
                                        const participation = apartmentParticipations[apt.id];
                                        if (participation?.type === 'excluded') return;

                                        const localVal = localValues[`${expenseType.name}-${apt.id}-consumption`];
                                        const firebaseVal = dataObject[apt.id];
                                        const effectiveValue = localVal !== undefined ? localVal : firebaseVal;
                                        total += parseFloat(effectiveValue) || 0;
                                      });
                                      return (total * expense.unitPrice - expense.billAmount).toFixed(2);
                                    })()} RON
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {!isConsumption && expense && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div className="p-3 bg-blue-50 rounded">
                                <div className="text-sm text-gray-500">Total introdus</div>
                                <div className="font-bold text-blue-600">
                                  {(() => {
                                    // Calculează total folosind local values OPTIMISTIC
                                    let total = 0;
                                    apartments.forEach(apt => {
                                      // Skip apartamentele excluse din totaluri
                                      const apartmentParticipations = config.apartmentParticipation || {};
                                      const participation = apartmentParticipations[apt.id];
                                      if (participation?.type === 'excluded') return;

                                      const localVal = localValues[`${expenseType.name}-${apt.id}`];
                                      const firebaseVal = dataObject[apt.id];
                                      const effectiveValue = localVal !== undefined ? localVal : firebaseVal;
                                      total += parseFloat(effectiveValue) || 0;
                                    });
                                    return total.toFixed(2);
                                  })()} RON
                                </div>
                              </div>
                              <div className="p-3 bg-green-50 rounded">
                                <div className="text-sm text-gray-500">Total facturat</div>
                                <div className="font-bold text-green-600">{expense.amount.toFixed(2)} RON</div>
                              </div>
                              <div className="p-3 bg-orange-50 rounded">
                                <div className="text-sm text-gray-500">Diferența</div>
                                <div className={`font-bold ${(() => {
                                  // Calculează total folosind local values OPTIMISTIC
                                  let totalIntrodus = 0;
                                  apartments.forEach(apt => {
                                    // Skip apartamentele excluse din totaluri
                                    const apartmentParticipations = config.apartmentParticipation || {};
                                    const participation = apartmentParticipations[apt.id];
                                    if (participation?.type === 'excluded') return;

                                    const localVal = localValues[`${expenseType.name}-${apt.id}`];
                                    const firebaseVal = dataObject[apt.id];
                                    const effectiveValue = localVal !== undefined ? localVal : firebaseVal;
                                    totalIntrodus += parseFloat(effectiveValue) || 0;
                                  });
                                  const diferenta = totalIntrodus - expense.amount;
                                  const procentDiferenta = expense.amount > 0 ? Math.abs(diferenta / expense.amount * 100) : 0;

                                  if (procentDiferenta < 5) return "text-green-600";
                                  else if (procentDiferenta <= 10) return "text-yellow-600";
                                  else return "text-red-600";
                                })()}`}>
                                  {(() => {
                                    // Calculează total folosind local values OPTIMISTIC
                                    let totalIntrodus = 0;
                                    apartments.forEach(apt => {
                                      // Skip apartamentele excluse din totaluri
                                      const apartmentParticipations = config.apartmentParticipation || {};
                                      const participation = apartmentParticipations[apt.id];
                                      if (participation?.type === 'excluded') return;

                                      const localVal = localValues[`${expenseType.name}-${apt.id}`];
                                      const firebaseVal = dataObject[apt.id];
                                      const effectiveValue = localVal !== undefined ? localVal : firebaseVal;
                                      totalIntrodus += parseFloat(effectiveValue) || 0;
                                    });
                                    return (totalIntrodus - expense.amount).toFixed(2);
                                  })()} RON
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default ConsumptionInput;
