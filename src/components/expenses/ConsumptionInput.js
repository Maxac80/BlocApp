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
  currentSheet,
  isMonthReadOnly,
  currentMonth,
  monthType,
  blocks,
  stairs,
  selectedStairTab,
  setSelectedStairTab,
  getDisabledExpenseTypes,
  expandExpenseName
}) => {
  // State pentru expandarea cheltuielilor (accordion)
  const [expandedExpenses, setExpandedExpenses] = useState({});

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

  // Toggle expand pentru o cheltuială
  const toggleExpense = (expenseKey) => {
    setExpandedExpenses(prev => ({
      ...prev,
      [expenseKey]: !prev[expenseKey]
    }));
  };

  // Obține toate tipurile de cheltuieli care POT avea consum (chiar dacă nu sunt distribuite)
  // FILTREAZĂ DOAR CELE ACTIVE (nu disabled)
  const getAllConsumptionExpenseTypes = () => {
    const disabledTypes = getDisabledExpenseTypes ? getDisabledExpenseTypes() : [];

    // Tipurile default care sunt pe consum sau individual ȘI ACTIVE
    const defaultConsumptionTypes = defaultExpenseTypes.filter(type =>
      (type.defaultDistribution === 'consumption' || type.defaultDistribution === 'individual') &&
      !disabledTypes.some(dt => dt.name === type.name)
    );

    // Adaugă și cheltuielile custom care au distribuție pe consum/individual ȘI ACTIVE
    const customTypes = [];
    associationExpenses.forEach(expense => {
      const config = getExpenseConfig(expense.name);
      if ((config.distributionType === 'consumption' || config.distributionType === 'individual') &&
          !defaultConsumptionTypes.some(dt => dt.name === expense.name) &&
          !disabledTypes.some(dt => dt.name === expense.name)) {
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

    // Obține datele din expense SAU din pending
    let dataObject = {};
    if (expense) {
      dataObject = isConsumption ? (expense.consumption || {}) : (expense.fixedAmounts || {});
    } else {
      // Cheltuială nedistribuită - verifică pending data
      if (isConsumption) {
        dataObject = currentSheet?.pendingConsumptions?.[expenseTypeName] || {};
      } else {
        dataObject = currentSheet?.pendingIndividualAmounts?.[expenseTypeName] || {};
      }
    }

    const completed = apartments.filter(apt => {
      const value = dataObject?.[apt.id];
      return value && parseFloat(value) >= 0;
    }).length;

    return {
      status: expense
        ? (completed === apartments.length ? 'complete' : 'incomplete')
        : 'not_distributed',
      completed,
      total: apartments.length,
      isComplete: completed === apartments.length && apartments.length > 0
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
                : (expense.fixedAmounts || {});
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
                          <h4 className="font-semibold text-base text-gray-900">{expenseType.name}</h4>
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
                          <span className="font-medium">Tip:</span>
                          <span>
                            {config.distributionType === "consumption" && "Pe consum (mc/apartament)"}
                            {config.distributionType === "individual" && "Sume individuale (RON/apartament)"}
                          </span>
                        </div>
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
                    {/* Grid cu apartamente - afișat MEREU, chiar dacă nu e distribuită */}
                    <>
                      {/* Grid cu apartamente */}
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {apartments.map(apartment => {
                            const value = dataObject[apartment.id] || '';
                            const hasValue = value && parseFloat(value) >= 0;
                            const isDisabled = isMonthReadOnly; // Permite editare chiar dacă nu e distribuită!
                            const containerClass = hasValue
                              ? "flex items-center gap-2 p-2 border rounded"
                              : "flex items-center gap-2 p-2 border-2 border-orange-300 bg-orange-50 rounded";

                            return (
                              <div key={apartment.id} className={containerClass}>
                                <span className={`text-sm font-medium w-16 ${!hasValue ? 'text-orange-700' : ''}`}>
                                  Apt {apartment.number}
                                  {!hasValue && !isDisabled && <span className="text-orange-500 ml-1">⚠️</span>}
                                </span>
                                {isDisabled ? (
                                  <div className="flex-1 p-2 bg-gray-100 border rounded text-sm text-gray-500">
                                    {value ? `${value} ${isConsumption ? (expenseType.name.toLowerCase().includes("apă") || expenseType.name.toLowerCase().includes("canal") ? "mc" : "Gcal") : "RON"}` : "-"}
                                  </div>
                                ) : (
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder={isConsumption ? (expenseType.name.toLowerCase().includes("apă") || expenseType.name.toLowerCase().includes("canal") ? "mc" : "Gcal") : "RON"}
                                    value={value}
                                    onChange={(e) => {
                                      const inputValue = e.target.value;
                                      if (inputValue === "" || /^\d*[.,]?\d*$/.test(inputValue)) {
                                        const normalizedValue = inputValue.replace(',', '.');
                                        // Folosește funcția corectă în funcție de starea cheltuielii
                                        if (expense) {
                                          // Cheltuială distribuită - salvează în expense
                                          if (isConsumption) {
                                            updateExpenseConsumption(expense.id, apartment.id, normalizedValue);
                                          } else {
                                            updateExpenseIndividualAmount(expense.id, apartment.id, normalizedValue);
                                          }
                                        } else {
                                          // Cheltuială nedistribuită - salvează în pending
                                          if (isConsumption) {
                                            updatePendingConsumption(expenseType.name, apartment.id, normalizedValue);
                                          } else {
                                            updatePendingIndividualAmount(expenseType.name, apartment.id, normalizedValue);
                                          }
                                        }
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const inputValue = e.target.value.replace(',', '.');
                                      const numericValue = parseFloat(inputValue) || 0;
                                      // Folosește funcția corectă în funcție de starea cheltuielii
                                      if (expense) {
                                        // Cheltuială distribuită - salvează în expense
                                        if (isConsumption) {
                                          updateExpenseConsumption(expense.id, apartment.id, numericValue);
                                        } else {
                                          updateExpenseIndividualAmount(expense.id, apartment.id, numericValue);
                                        }
                                      } else {
                                        // Cheltuială nedistribuită - salvează în pending
                                        if (isConsumption) {
                                          updatePendingConsumption(expenseType.name, apartment.id, numericValue);
                                        } else {
                                          updatePendingIndividualAmount(expenseType.name, apartment.id, numericValue);
                                        }
                                      }
                                    }}
                                    className={`flex-1 p-2 border rounded text-sm ${!hasValue ? 'border-orange-300 bg-orange-50' : ''}`}
                                  />
                                )}
                                {isConsumption && hasValue && expense?.unitPrice && (
                                  <span className="text-sm text-green-600 w-20 text-right">
                                    {((parseFloat(value) || 0) * expense.unitPrice).toFixed(2)} RON
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Totaluri */}
                        {isConsumption && expense && expense.unitPrice && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div className="p-3 bg-blue-50 rounded">
                                <div className="text-sm text-gray-500">Total consum</div>
                                <div className="font-bold text-blue-600">
                                  {Object.values(dataObject).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(2)} {expense.name.toLowerCase().includes("apă") || expense.name.toLowerCase().includes("canal") ? "mc" : "Gcal"}
                                </div>
                              </div>
                              <div className="p-3 bg-green-50 rounded">
                                <div className="text-sm text-gray-500">Total calculat</div>
                                <div className="font-bold text-green-600">
                                  {(Object.values(dataObject).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) * expense.unitPrice).toFixed(2)} RON
                                </div>
                              </div>
                              {expense.billAmount && (
                                <div className="p-3 bg-orange-50 rounded">
                                  <div className="text-sm text-gray-500">Diferența</div>
                                  <div className={`font-bold ${(() => {
                                    const totalCalculat = Object.values(dataObject).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) * expense.unitPrice;
                                    const diferenta = totalCalculat - expense.billAmount;
                                    const procentDiferenta = expense.billAmount > 0 ? Math.abs(diferenta / expense.billAmount * 100) : 0;

                                    if (procentDiferenta < 5) return "text-green-600";
                                    else if (procentDiferenta <= 10) return "text-yellow-600";
                                    else return "text-red-600";
                                  })()}`}>
                                    {(Object.values(dataObject).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) * expense.unitPrice - expense.billAmount).toFixed(2)} RON
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
                                  {Object.values(dataObject).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(2)} RON
                                </div>
                              </div>
                              <div className="p-3 bg-green-50 rounded">
                                <div className="text-sm text-gray-500">Total facturat</div>
                                <div className="font-bold text-green-600">{expense.amount.toFixed(2)} RON</div>
                              </div>
                              <div className="p-3 bg-orange-50 rounded">
                                <div className="text-sm text-gray-500">Diferența</div>
                                <div className={`font-bold ${(() => {
                                  const totalIntrodus = Object.values(dataObject).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
                                  const diferenta = totalIntrodus - expense.amount;
                                  const procentDiferenta = expense.amount > 0 ? Math.abs(diferenta / expense.amount * 100) : 0;

                                  if (procentDiferenta < 5) return "text-green-600";
                                  else if (procentDiferenta <= 10) return "text-yellow-600";
                                  else return "text-red-600";
                                })()}`}>
                                  {(Object.values(dataObject).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) - expense.amount).toFixed(2)} RON
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
