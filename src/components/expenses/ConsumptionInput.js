/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Calculator, MoreVertical, Edit2 } from 'lucide-react';
import { defaultExpenseTypes } from '../../data/expenseTypes';
import { DifferencePlaceholder } from './shared/ExpenseBadges';

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
  calculateExpenseDifferences, // ✨ Primim funcția ca prop
  selectedStairTab,
  setSelectedStairTab,
  getDisabledExpenseTypes,
  getApartmentParticipation,
  expandExpenseName,
  onExpenseNameClick,
  onEditConsumptionClick,
  expandedExpenses, // ✨ Primim starea din parent
  setExpandedExpenses // ✨ Primim setter-ul din parent
}) => {

  // State pentru dropdown menu (3 puncte)
  const [openMenus, setOpenMenus] = useState({});

  // State local pentru optimistic UI updates (evită lag-ul Firebase)
  const [localValues, setLocalValues] = useState({});

  // Refs pentru scroll automat la cheltuieli
  const expenseRefs = useRef({});

  // Auto-expandare când se primește un expense name
  useEffect(() => {
    if (expandExpenseName) {
      // Expandează această cheltuială (păstrează starea celorlalte)
      setExpandedExpenses(prev => ({
        ...prev,
        [expandExpenseName]: true
      }));

      // Scroll automat la cheltuială după un mic delay pentru a permite rendering-ul
      setTimeout(() => {
        const expenseElement = expenseRefs.current[expandExpenseName];
        if (expenseElement) {
          expenseElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          });
        }
      }, 100);
    }
    // NU mai resetăm când expandExpenseName devine null - păstrăm starea
  }, [expandExpenseName, setExpandedExpenses]);

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
      const config = getExpenseConfig(expense);  // Trimite obiectul complet pentru a accesa expenseTypeId
      if ((config.distributionType === 'consumption' || config.distributionType === 'consumption_cumulative') &&
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
      const config = getExpenseConfig(expense);  // Trimite obiectul complet pentru a accesa expenseTypeId
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
    const config = getExpenseConfig(expense || expenseTypeName);  // Trimite obiectul cheltuielii pentru a accesa expenseTypeId
    const apartments = getFilteredApartments();
    const isConsumption = config.distributionType === 'consumption' || config.distributionType === 'consumption_cumulative';

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

  // Calculează totalurile pentru toate cheltuielile
  const calculateTotals = () => {
    const filterInfo = getFilterInfo();
    let totalIntrodus = 0;
    let totalAsteptat = 0;
    let allKnowExpectedAmount = true;

    allConsumptionTypes.forEach(expenseType => {
      const expense = getDistributedExpense(expenseType.name);
      if (!expense) {
        allKnowExpectedAmount = false;
        return;
      }

      const config = getExpenseConfig(expense || expenseType.name);  // Trimite obiectul cheltuielii pentru expenseTypeId
      const isConsumption = config.distributionType === 'consumption' || config.distributionType === 'consumption_cumulative';

      // Mapează receptionMode
      let receptionMode = expense.receptionMode || 'total';
      if (expense.expenseEntryMode) {
        if (expense.expenseEntryMode === 'building') receptionMode = 'per_block';
        else if (expense.expenseEntryMode === 'staircase') receptionMode = 'per_stair';
        else if (expense.expenseEntryMode === 'per_association') receptionMode = 'total';
      }

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
      const apartments = getFilteredApartments();
      const apartmentParticipations = config.apartmentParticipation || {};
      const nonExcludedApartments = apartments.filter(apt => {
        const participation = apartmentParticipations[apt.id];
        return participation?.type !== 'excluded';
      });

      let sumaIntrodusa = 0;
      if (isConsumption && expense.consumption) {
        // Verifică modul de introducere
        const inputMode = config?.indexConfiguration?.inputMode || 'manual';
        const isIndexMode = inputMode === 'indexes';

        nonExcludedApartments.forEach(apt => {
          let aptConsumption = 0;
          if (isIndexMode && expense.indexes?.[apt.id]) {
            const indexes = expense.indexes[apt.id];
            Object.values(indexes).forEach(indexData => {
              if (indexData.newIndex && indexData.oldIndex) {
                aptConsumption += parseFloat(indexData.newIndex) - parseFloat(indexData.oldIndex);
              }
            });
          } else if (!isIndexMode) {
            aptConsumption = parseFloat(expense.consumption[apt.id] || 0);
          }
          sumaIntrodusa += aptConsumption * (expense.unitPrice || 0);
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

  const totals = calculateTotals();

  // Verifică dacă există cheltuieli cu sume individuale
  const hasIndividualExpenses = allConsumptionTypes.some(expenseType => {
    const expense = getDistributedExpense(expenseType.name);
    const config = getExpenseConfig(expense || expenseType.name);  // Trimite obiectul cheltuielii pentru expenseTypeId
    return config.distributionType === 'individual';
  });

  return (
    <>
      {/* Header cu total */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {allConsumptionTypes.length} {
              allConsumptionTypes.length === 1
                ? (hasIndividualExpenses ? 'cheltuială cu consumuri și sume' : 'cheltuială cu consumuri')
                : (hasIndividualExpenses ? 'cheltuieli cu consumuri și sume' : 'cheltuieli cu consumuri')
            }
            {getFilterInfo().type !== 'all' && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                ({getFilterInfo().blockName} - {getFilterInfo().stairName})
              </span>
            )}
          </h3>
        </div>

        {/* Total pe partea dreaptă */}
        {allConsumptionTypes.length > 0 && (
          <div className="text-right">
            <div className="text-2xl font-bold text-teal-600">
              {totals.totalIntrodus.toFixed(2)} RON
            </div>
            <div className="text-sm text-gray-500">Total</div>

            {/* Diferența - doar dacă știm suma așteptată */}
            {totals.allKnowExpectedAmount ? (() => {
              const diferenta = totals.totalIntrodus - totals.totalAsteptat;
              // Fără TOLERANCE - afișăm diferență doar când există (>= 0.01)
              const hasDifference = Math.abs(diferenta) >= 0.01;

              if (hasDifference) {
                return (
                  <div className="mt-1 text-xs font-medium px-2 py-1 rounded bg-orange-100 text-orange-700">
                    ⚠ Diferență: {diferenta > 0 ? '+' : ''}{diferenta.toFixed(2)} RON
                    {diferenta < 0 ? ' (lipsesc)' : ' (mai mult)'}
                  </div>
                );
              }
              // Placeholder invizibil pentru aliniere
              return <DifferencePlaceholder />;
            })() : (
              // Placeholder invizibil când nu știm suma așteptată
              <DifferencePlaceholder />
            )}
          </div>
        )}
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
            const config = getExpenseConfig(expense || expenseType.name);  // Trimite obiectul cheltuielii pentru expenseTypeId
            const status = getExpenseStatus(expenseType.name);
            const isExpanded = expandedExpenses[expenseType.name];
            const apartments = getFilteredApartments();

            const isConsumption = config.distributionType === 'consumption' || config.distributionType === 'consumption_cumulative';

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
              <div
                key={expenseType.name}
                ref={el => expenseRefs.current[expenseType.name] = el}
                className="border border-gray-300 rounded-lg overflow-hidden hover:border-indigo-400 transition-colors"
              >
                {/* Header - întotdeauna vizibil */}
                <div
                  className={`p-3 ${
                    status.status === 'not_distributed'
                      ? 'bg-gray-50'
                      : config.distributionType === 'individual'
                        ? 'bg-gradient-to-r from-green-50 to-white'
                        : 'bg-gradient-to-r from-teal-50 to-white'
                  } cursor-pointer ${
                    status.status === 'not_distributed'
                      ? ''
                      : config.distributionType === 'individual'
                        ? 'hover:from-green-100'
                        : 'hover:from-teal-100'
                  }`}
                  onClick={() => toggleExpense(expenseType.name)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Nume cheltuială */}
                      <div className="mb-2">
                        {expense ? (
                          <h4
                            className="font-semibold text-base text-gray-900 px-2 py-1 -ml-2 rounded cursor-pointer transition-all hover:bg-indigo-50 hover:text-indigo-700 inline-block"
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
                          <h4 className="font-semibold text-base text-gray-900 inline-block">
                            {expenseType.name}
                          </h4>
                        )}
                        {status.status === 'not_distributed' && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded ml-2">
                            Nedistribuită
                          </span>
                        )}
                      </div>

                      {/* Badge status completitudine */}
                      <div className="mt-2">
                        {status.status === 'not_distributed' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                            ⊘ Nedistribuită - {status.total} apartamente
                          </span>
                        ) : status.isComplete ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                            ✓ {isConsumption ? 'Consumuri introduse' : 'Sume introduse'}: {status.completed}/{status.total} apartamente
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                            ⚠ {isConsumption ? 'Consumuri introduse' : 'Sume introduse'}: {status.completed}/{status.total} apartamente
                          </span>
                        )}
                      </div>

                      {/* Informații pe linie compactă */}
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-3 text-gray-600">
                          <span className="font-medium">Distribuție:</span>
                          <span>
                            {config.distributionType === "consumption" && `Pe consum (${config.consumptionUnit || 'mc'}/apartament)`}
                            {config.distributionType === "consumption_cumulative" && `Pe consum cumulat (${config.consumptionUnit || 'mc'}/apartament)`}
                            {config.distributionType === "individual" && "Sume individuale (RON/apartament)"}
                          </span>
                        </div>

                        {/* Linia Sume - doar pentru cheltuieli distribuite */}
                        {expense && (
                          <div className="flex items-center gap-3 text-gray-600">
                            <span className="font-medium">Sume:</span>
                            {(() => {
                              let receptionMode = expense.receptionMode || 'total';
                              if (expense.expenseEntryMode) {
                                if (expense.expenseEntryMode === 'building') receptionMode = 'per_block';
                                else if (expense.expenseEntryMode === 'staircase') receptionMode = 'per_stair';
                                else if (expense.expenseEntryMode === 'per_association') receptionMode = 'total';
                              }
                              return (
                                <>
                                  {receptionMode === 'per_association' && <span>Pe asociație</span>}
                                  {receptionMode === 'per_block' && <span>Pe bloc</span>}
                                  {receptionMode === 'per_stair' && <span>Pe scară</span>}
                                </>
                              );
                            })()}
                          </div>
                        )}

                        {/* Linia Participare și Mod introducere */}
                        <div className="flex items-center gap-2 text-gray-600">
                          <span className="font-medium">Participare:</span>
                          <span className={`font-medium ${config.distributionType === 'individual' ? 'text-green-600' : 'text-teal-600'}`}>
                            {(() => {
                              const filteredApts = apartments;
                              const apartmentParticipations = config.apartmentParticipation || {};

                              // Calculează apartamentele care participă (nu sunt excluse)
                              const participatingApts = filteredApts.filter(apt => {
                                const participation = apartmentParticipations[apt.id];
                                return participation?.type !== 'excluded';
                              });

                              return `${participatingApts.length}/${filteredApts.length}`;
                            })()} apartamente
                          </span>

                          {/* Badge mod introducere - inline cu participare - doar pentru cheltuieli pe consum */}
                          {isConsumption && config.indexConfiguration && (
                            <>
                              <span className="text-gray-400">•</span>
                              <span className="font-medium">Mod introducere:</span>
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
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Partea dreaptă: Sumă + Warning-uri */}
                    {expense && (
                      <div className="flex flex-col items-end gap-1 min-w-[200px]">
                        {/* Sumă principală și mc */}
                        <div className="text-right">
                          {isConsumption && expense.unitPrice ? (
                            <>
                              <div className="text-xl font-bold text-teal-600">
                                {(() => {
                                  const filterInfo = getFilterInfo();
                                  let receptionMode = expense.receptionMode || 'total';
                                  if (expense.expenseEntryMode) {
                                    if (expense.expenseEntryMode === 'building') receptionMode = 'per_block';
                                    else if (expense.expenseEntryMode === 'staircase') receptionMode = 'per_stair';
                                    else if (expense.expenseEntryMode === 'per_association') receptionMode = 'total';
                                  }

                                  // Determină dacă știi suma așteptată
                                  let knowsExpectedAmount = filterInfo.type === 'all';
                                  if (!knowsExpectedAmount && filterInfo.type === 'stair') {
                                    if (receptionMode === 'per_stair') {
                                      knowsExpectedAmount = true;
                                    } else if (receptionMode === 'per_block') {
                                      const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
                                      knowsExpectedAmount = blockStairs.length === 1;
                                    }
                                  }

                                  let amountToDisplay = 0;

                                  if (filterInfo.type === 'all') {
                                    amountToDisplay = expense.billAmount || 0;
                                  } else if (knowsExpectedAmount) {
                                    // Știi suma așteptată - afișează-o
                                    if (receptionMode === 'per_stair' && expense.amountsByStair) {
                                      amountToDisplay = parseFloat(expense.amountsByStair[filterInfo.stairId] || 0);
                                    } else if (receptionMode === 'per_block' && expense.amountsByBlock && filterInfo.blockId) {
                                      amountToDisplay = parseFloat(expense.amountsByBlock[filterInfo.blockId] || 0);
                                    }

                                    // Fallback: dacă suma așteptată este 0, calculează din consumuri
                                    if (amountToDisplay === 0) {
                                      const apartmentParticipations = config.apartmentParticipation || {};
                                      apartments.forEach(apt => {
                                        const participation = apartmentParticipations[apt.id];
                                        if (participation?.type !== 'excluded') {
                                          const consumption = parseFloat(dataObject[apt.id]) || 0;
                                          amountToDisplay += consumption * expense.unitPrice;
                                        }
                                      });
                                    }
                                  } else {
                                    // NU știi suma așteptată - afișează Total distribuit (total introdus + diferență)
                                    if (expense?.isUnitBased && calculateExpenseDifferences) {
                                      const allApartments = getAssociationApartments();
                                      const expenseDifferences = calculateExpenseDifferences(expense, allApartments);
                                      const totalDifference = apartments.reduce((sum, apt) => sum + (expenseDifferences[apt.id] || 0), 0);

                                      // Calculează total introdus pentru apartamentele filtrate
                                      const apartmentParticipations = config?.apartmentParticipation || {};
                                      let totalIntrodus = 0;
                                      apartments.forEach(apt => {
                                        const participation = apartmentParticipations[apt.id];
                                        let aptAmount = 0;

                                        const consumption = parseFloat(dataObject[apt.id]) || 0;
                                        aptAmount = consumption * (expense?.unitPrice || 0);

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

                                        totalIntrodus += aptAmount;
                                      });

                                      amountToDisplay = totalIntrodus + totalDifference;
                                    }
                                  }

                                  return `${amountToDisplay.toFixed(2)} RON`;
                                })()}
                              </div>
                              {/* Total mc + Preț unitar pe o singură linie */}
                              <div className="text-sm text-gray-600">
                                {(() => {
                                  const apartmentParticipations = config.apartmentParticipation || {};
                                  const nonExcludedApartments = apartments.filter(apt => {
                                    const participation = apartmentParticipations[apt.id];
                                    return participation?.type !== 'excluded';
                                  });

                                  let totalUnits = 0;
                                  nonExcludedApartments.forEach(apt => {
                                    totalUnits += parseFloat(dataObject[apt.id] || 0);
                                  });

                                  // Folosește unitatea configurată, nu una hard-coded
                                  let unitLabel = 'mc'; // default
                                  if (config?.consumptionUnit === 'custom' && config?.customConsumptionUnit) {
                                    unitLabel = config.customConsumptionUnit;
                                  } else if (config?.consumptionUnit) {
                                    unitLabel = config.consumptionUnit;
                                  }

                                  return `${totalUnits.toFixed(2)} ${unitLabel} • ${parseFloat(expense.unitPrice).toFixed(2)} RON/${unitLabel}`;
                                })()}
                              </div>
                            </>
                          ) : (
                            <div className="text-xl font-bold text-green-600">
                              {(() => {
                                const filterInfo = getFilterInfo();
                                let receptionMode = expense.receptionMode || 'total';
                                if (expense.expenseEntryMode) {
                                  if (expense.expenseEntryMode === 'building') receptionMode = 'per_block';
                                  else if (expense.expenseEntryMode === 'staircase') receptionMode = 'per_stair';
                                  else if (expense.expenseEntryMode === 'per_association') receptionMode = 'total';
                                }

                                // Determină dacă știi suma așteptată
                                let knowsExpectedAmount = filterInfo.type === 'all';
                                if (!knowsExpectedAmount && filterInfo.type === 'stair') {
                                  if (receptionMode === 'per_stair') {
                                    knowsExpectedAmount = true;
                                  } else if (receptionMode === 'per_block') {
                                    const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
                                    knowsExpectedAmount = blockStairs.length === 1;
                                  }
                                }

                                let amountToDisplay = 0;

                                if (filterInfo.type === 'all') {
                                  amountToDisplay = expense.amount || 0;
                                } else if (knowsExpectedAmount) {
                                  // Știi suma așteptată - afișează-o
                                  if (receptionMode === 'per_stair' && expense.amountsByStair) {
                                    amountToDisplay = parseFloat(expense.amountsByStair[filterInfo.stairId] || 0);
                                  } else if (receptionMode === 'per_block' && expense.amountsByBlock && filterInfo.blockId) {
                                    amountToDisplay = parseFloat(expense.amountsByBlock[filterInfo.blockId] || 0);
                                  }
                                } else {
                                  // NU știi suma așteptată - afișează Total distribuit (total introdus + diferență)
                                  if (expense?.isUnitBased && calculateExpenseDifferences) {
                                    const allApartments = getAssociationApartments();
                                    const expenseDifferences = calculateExpenseDifferences(expense, allApartments);
                                    const totalDifference = apartments.reduce((sum, apt) => sum + (expenseDifferences[apt.id] || 0), 0);

                                    // Calculează total introdus pentru apartamentele filtrate
                                    const apartmentParticipations = config?.apartmentParticipation || {};
                                    let totalIntrodus = 0;
                                    apartments.forEach(apt => {
                                      const participation = apartmentParticipations[apt.id];
                                      let aptAmount = 0;

                                      if (isConsumption) {
                                        // Verifică modul de introducere
                                        const inputMode = config?.indexConfiguration?.inputMode || 'manual';
                                        const isIndexMode = inputMode === 'indexes';

                                        let aptConsumption = 0;
                                        const indexes = expense?.indexes?.[apt.id];

                                        // Folosește indexes DOAR dacă inputMode este 'indexes'
                                        if (isIndexMode && indexes) {
                                          Object.values(indexes).forEach(indexData => {
                                            if (indexData.newIndex && indexData.oldIndex) {
                                              aptConsumption += parseFloat(indexData.newIndex) - parseFloat(indexData.oldIndex);
                                            }
                                          });
                                        } else if (!isIndexMode) {
                                          aptConsumption = parseFloat(expense?.consumption?.[apt.id] || 0);
                                        }
                                        aptAmount = aptConsumption * (expense?.unitPrice || 0);
                                      } else {
                                        aptAmount = parseFloat(expense?.individualAmounts?.[apt.id] || 0);
                                      }

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

                                      totalIntrodus += aptAmount;
                                    });

                                    amountToDisplay = totalIntrodus + totalDifference;
                                  }
                                }

                                return `${amountToDisplay.toFixed(2)} RON`;
                              })()}
                            </div>
                          )}
                        </div>

                        {/* Warning-uri verticale */}
                        {(() => {
                          const apartmentParticipations = config.apartmentParticipation || {};

                          // Calculează totalul DUPĂ aplicarea participărilor (la fel ca în footer)
                          let totalIntrodus = 0;
                          apartments.forEach(apt => {
                            const participation = apartmentParticipations[apt.id];

                            let aptAmount = 0;
                            if (isConsumption && expense.unitPrice) {
                              const consumption = parseFloat(dataObject[apt.id] || 0);
                              aptAmount = consumption * expense.unitPrice;
                            } else {
                              aptAmount = parseFloat(dataObject[apt.id] || 0);
                            }

                            // Aplică participarea (la fel ca în footer)
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

                            totalIntrodus += aptAmount;
                          });

                          const filterInfo = getFilterInfo();
                          let receptionMode = expense.receptionMode || 'total';
                          if (expense.expenseEntryMode) {
                            if (expense.expenseEntryMode === 'building') receptionMode = 'per_block';
                            else if (expense.expenseEntryMode === 'staircase') receptionMode = 'per_stair';
                            else if (expense.expenseEntryMode === 'per_association') receptionMode = 'total';
                          }

                          // Determină dacă știi suma așteptată pentru scara filtrată
                          let knowsExpectedAmount = filterInfo.type === 'all';
                          if (!knowsExpectedAmount && filterInfo.type === 'stair') {
                            if (receptionMode === 'per_stair') {
                              knowsExpectedAmount = true;
                            } else if (receptionMode === 'per_block') {
                              // Știi suma așteptată doar dacă blocul are o singură scară
                              const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
                              knowsExpectedAmount = blockStairs.length === 1;
                            }
                          }

                          let relevantAmount = 0;
                          let diferentaMessage = '';

                          if (filterInfo.type === 'all') {
                            relevantAmount = isConsumption && expense.billAmount ? expense.billAmount : expense.amount;
                          } else if (knowsExpectedAmount) {
                            // Știi suma așteptată - afișează diferența normală
                            if (receptionMode === 'per_stair' && expense.amountsByStair) {
                              relevantAmount = parseFloat(expense.amountsByStair[filterInfo.stairId] || 0);
                            } else if (receptionMode === 'per_block' && expense.amountsByBlock && filterInfo.blockId) {
                              relevantAmount = parseFloat(expense.amountsByBlock[filterInfo.blockId] || 0);
                            }
                          } else {
                            // NU știi suma așteptată - afișează mesaj informativ
                            relevantAmount = totalIntrodus; // Pentru că diferența = 0
                            diferentaMessage = receptionMode === 'per_association' ? 'Diferență pe asociație' : 'Diferență pe bloc';
                          }

                          const diferenta = totalIntrodus - relevantAmount;
                          // Fără TOLERANCE - badge verde doar când diferență = 0 (sau < 0.01)
                          const hasDifference = Math.abs(diferenta) >= 0.01;
                          const shouldBeGreen = knowsExpectedAmount && !hasDifference && totalIntrodus > 0;

                          return (
                            <div className="flex flex-col items-end gap-1 mt-1">
                              {/* Total introdus */}
                              <div className={`text-xs font-medium px-2 py-1 rounded ${
                                shouldBeGreen ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white'
                              }`}>
                                {shouldBeGreen ? '✓ ' : ''}Total introdus: {totalIntrodus.toFixed(2)} RON
                              </div>

                              {/* Diferență */}
                              {knowsExpectedAmount ? (
                                // Știi suma așteptată - afișează diferența când există
                                hasDifference && (
                                  <div className="text-xs font-medium px-2 py-1 rounded bg-orange-100 text-orange-700">
                                    ⚠ Diferență: {diferenta > 0 ? '+' : ''}{diferenta.toFixed(2)} RON {diferenta < 0 ? '(lipsesc)' : '(mai mult)'}
                                  </div>
                                )
                              ) : (
                                // NU știi suma așteptată - afișează diferența distribuită
                                expense?.isUnitBased && calculateExpenseDifferences && (() => {
                                  const allApartments = getAssociationApartments();
                                  const expenseDifferences = calculateExpenseDifferences(expense, allApartments);

                                  // Diferența pentru apartamentele filtrate (scara curentă)
                                  const totalDifferentaScara = apartments.reduce((sum, apt) =>
                                    sum + (expenseDifferences[apt.id] || 0), 0
                                  );

                                  // Diferența totală (pe bloc sau pe asociație)
                                  let apartmentsForGlobalDiff = allApartments;
                                  if (receptionMode === 'per_block' && filterInfo.blockId) {
                                    // Doar apartamentele din blocul curent
                                    const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
                                    const blockStairIds = blockStairs.map(s => s.id);
                                    apartmentsForGlobalDiff = allApartments.filter(apt => blockStairIds.includes(apt.stairId));
                                  }

                                  const totalDifferentaGlobal = apartmentsForGlobalDiff.reduce((sum, apt) =>
                                    sum + (expenseDifferences[apt.id] || 0), 0
                                  );

                                  const diferentaContext = receptionMode === 'per_block' ? 'pe bloc' : 'pe asociație';

                                  return Math.abs(totalDifferentaScara) >= 0.01 ? (
                                    <div className="text-xs font-medium px-2 py-1 rounded bg-orange-100 text-orange-700">
                                      ⚠ Diferență: {totalDifferentaScara > 0 ? '-' : '+'}{Math.abs(totalDifferentaScara).toFixed(2)} RON
                                      (din {totalDifferentaGlobal > 0 ? '-' : '+'}{Math.abs(totalDifferentaGlobal).toFixed(2)} RON {diferentaContext})
                                    </div>
                                  ) : null;
                                })()
                              )}

                              {/* Badge verde pentru total distribuit - doar dacă e cheltuială distribuită cu diferență */}
                              {expense?.isUnitBased && calculateExpenseDifferences && (() => {
                                // Verifică dacă avem sumă așteptată pentru nivelul curent
                                let hasExpectedAmount = false;
                                if (filterInfo.type === 'all' && expense?.billAmount) {
                                  hasExpectedAmount = true;
                                } else if (filterInfo.type === 'stair' && receptionMode === 'per_stair' && expense?.amountsByStair?.[filterInfo.stairId]) {
                                  hasExpectedAmount = true;
                                } else if (filterInfo.type === 'stair' && receptionMode === 'per_block' && filterInfo.blockId && expense?.amountsByBlock?.[filterInfo.blockId]) {
                                  hasExpectedAmount = true;
                                }

                                const allApartments = getAssociationApartments();
                                const expenseDifferences = calculateExpenseDifferences(expense, allApartments);
                                const totalDifference = apartments.reduce((sum, apt) => sum + (expenseDifferences[apt.id] || 0), 0);

                                // Calculează totalul distribuit (total introdus + diferență)
                                const totalDistribuit = totalIntrodus + totalDifference;

                                // Calculează totalul distribuit global (la nivel bloc/asociație)
                                let apartmentsForGlobalTotal = allApartments;
                                if (receptionMode === 'per_block' && filterInfo.blockId) {
                                  const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
                                  const blockStairIds = blockStairs.map(s => s.id);
                                  apartmentsForGlobalTotal = allApartments.filter(apt => blockStairIds.includes(apt.stairId));
                                }

                                const totalDifferenceGlobal = apartmentsForGlobalTotal.reduce((sum, apt) =>
                                  sum + (expenseDifferences[apt.id] || 0), 0
                                );

                                // Calculează total introdus global
                                const apartmentParticipationsGlobal = config?.apartmentParticipation || {};
                                let totalIntrodusGlobal = 0;
                                apartmentsForGlobalTotal.forEach(apt => {
                                  const participation = apartmentParticipationsGlobal[apt.id];
                                  let aptAmount = 0;

                                  if (isConsumption) {
                                    // Verifică modul de introducere
                                    const inputMode = config?.indexConfiguration?.inputMode || 'manual';
                                    const isIndexMode = inputMode === 'indexes';

                                    let aptConsumption = 0;
                                    const indexes = expense?.indexes?.[apt.id];

                                    // Folosește indexes DOAR dacă inputMode este 'indexes'
                                    if (isIndexMode && indexes) {
                                      Object.values(indexes).forEach(indexData => {
                                        if (indexData.newIndex && indexData.oldIndex) {
                                          aptConsumption += parseFloat(indexData.newIndex) - parseFloat(indexData.oldIndex);
                                        }
                                      });
                                    } else if (!isIndexMode) {
                                      aptConsumption = parseFloat(expense?.consumption?.[apt.id] || 0);
                                    }
                                    aptAmount = aptConsumption * (expense?.unitPrice || 0);
                                  } else {
                                    aptAmount = parseFloat(expense?.individualAmounts?.[apt.id] || 0);
                                  }

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

                                  totalIntrodusGlobal += aptAmount;
                                });

                                const totalDistribuitGlobal = totalIntrodusGlobal + totalDifferenceGlobal;
                                const distribuitContext = receptionMode === 'per_block' ? 'pe bloc' : 'pe asociație';

                                // Pentru cazul când ȘTII suma așteptată
                                if (knowsExpectedAmount && hasExpectedAmount) {
                                  // Verifică dacă totalul distribuit e aproape egal cu suma așteptată
                                  const isBalanced = Math.abs(totalDistribuit - relevantAmount) < 0.01;

                                  if (isBalanced && Math.abs(totalDifference) >= 0.01) {
                                    return (
                                      <div className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700">
                                        ✓ Total distribuit: {totalDistribuit.toFixed(2)} RON
                                      </div>
                                    );
                                  }
                                } else {
                                  // Pentru cazul când NU ȘTII suma așteptată - arată întotdeauna totalul distribuit
                                  if (Math.abs(totalDifference) >= 0.01) {
                                    return (
                                      <div className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700">
                                        ✓ Total distribuit: {totalDistribuit.toFixed(2)} RON (din {totalDistribuitGlobal.toFixed(2)} RON {distribuitContext})
                                      </div>
                                    );
                                  }
                                }

                                return null;
                              })()}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Iconițe în dreapta */}
                    <div className="flex-shrink-0 flex items-center gap-2 pt-1">
                      {/* Chevron pentru expand/collapse */}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}

                      {/* Menu 3 puncte */}
                      {expense && (
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenus(prev => ({
                                ...prev,
                                [expenseType.name]: !prev[expenseType.name]
                              }));
                            }}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Opțiuni"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-600" />
                          </button>

                          {/* Dropdown menu */}
                          {openMenus[expenseType.name] && (
                            <>
                              {/* Overlay pentru a închide meniul la click outside */}
                              <div
                                className="fixed inset-0 z-10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenus(prev => ({ ...prev, [expenseType.name]: false }));
                                }}
                              />

                              {/* Meniul propriu-zis */}
                              <div className="absolute right-0 top-8 z-20 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenus(prev => ({ ...prev, [expenseType.name]: false }));
                                    if (onEditConsumptionClick) {
                                      onEditConsumptionClick(expenseType.name);
                                    }
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  Editează consumul
                                </button>
                              </div>
                            </>
                          )}
                        </div>
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
                                <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b-2 border-l w-20">Persoane</th>
                                <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b-2 border-l bg-amber-50 min-w-[120px]">
                                  Participare
                                </th>

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

                                {/* Coloană sumă după participare */}
                                <th className="px-3 py-2 text-right font-semibold text-gray-700 border-b-2 border-l bg-teal-50">
                                  După participare (RON)
                                </th>

                                {/* Coloană diferență distribuită - doar pentru consumption cu isUnitBased */}
                                {isConsumption && expense?.isUnitBased && expense?.billAmount && (
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
                              {isConsumption && config.indexConfiguration?.inputMode !== 'manual' && config.indexConfiguration?.indexTypes?.length > 0 && (
                                <tr className="bg-blue-50 text-xs">
                                  <th className="border-b"></th>
                                  <th className="border-b"></th>
                                  <th className="border-b border-l"></th>
                                  <th className="border-b border-l"></th>
                                  {config.indexConfiguration.indexTypes.map(indexType => (
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
                                // ATENȚIE: folosim `??` nu `||` ca să tratăm 0 ca valoare validă
                                // (`||` ar transforma 0 în '' fiindcă 0 e falsy în JS)
                                const manualValue = String(dataObject[apartment.id] ?? '');

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

                                const displayedConsumption = String(manualValue);

                                // Verifică dacă e complet
                                const isComplete = (!isConsumption && hasManualValue) ||
                                                   (isConsumption && (
                                                     (inputMode === 'manual' && hasManualValue) ||
                                                     (inputMode === 'indexes' && hasIndexData)
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
                                  } else {
                                    finalConsumption = parseFloat(effectiveManualValue) || 0;
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
                                        const participation = apartmentParticipations[apartment.id];
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
                                    {isConsumption && inputMode !== 'manual' && indexTypes.length > 0 && indexTypes.map(indexType => {
                                      const rawIndexData = indexesData[indexType.id] || {};
                                      const indexData = {
                                        oldIndex: String(rawIndexData.oldIndex || ''),
                                        newIndex: String(rawIndexData.newIndex || ''),
                                        meterName: rawIndexData.meterName,
                                        source: rawIndexData.source,
                                        submittedAt: rawIndexData.submittedAt
                                      };
                                      const isOnlineSubmission = indexData.source === 'owner_portal';

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
                                                  }
                                                }}
                                                className="w-16 px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                              />
                                            )}
                                          </td>

                                          {/* Index Nou */}
                                          <td className="px-2 py-1 text-center">
                                            <div className="flex items-center justify-center gap-1">
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
                                                    }
                                                  }}
                                                  className={`w-16 px-2 py-1.5 border rounded text-sm text-gray-900 text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                                                    isOnlineSubmission ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300'
                                                  }`}
                                                />
                                              )}
                                              {/* Marcaj pentru index transmis online */}
                                              {isOnlineSubmission && indexData.newIndex && (
                                                <span
                                                  className="inline-flex items-center justify-center w-4 h-4 bg-emerald-500 text-white rounded-full text-[8px] font-bold cursor-help"
                                                  title={`Transmis online de proprietar${indexData.submittedAt ? ` la ${new Date(indexData.submittedAt).toLocaleString('ro-RO')}` : ''}`}
                                                >
                                                  O
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                        </React.Fragment>
                                      );
                                    })}

                                    {/* Coloană Consum (pentru consumption) */}
                                    {isConsumption && (
                                      <td className="px-3 py-2 text-center border-l bg-green-50">
                                        {isDisabled ? (
                                          <span className="text-gray-700 font-medium">{isExcluded ? '-' : (displayedConsumption !== '' ? displayedConsumption : '-')}</span>
                                        ) : inputMode === 'indexes' ? (
                                          // INDEXES: read-only (calculat automat)
                                          <span className={`font-medium ${hasIndexData ? 'text-blue-700' : 'text-gray-400'}`}>
                                            {hasIndexData ? totalIndexConsumption.toFixed(2) : '-'}
                                          </span>
                                        ) : (
                                          // MANUAL: editabil
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
                                          <span className="text-gray-600">{isExcluded ? '-' : (manualValue !== '' ? manualValue : '-')}</span>
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

                                    {/* După participare (RON) - suma finală după aplicarea participării */}
                                    <td className={`px-3 py-2 text-right font-semibold border-l ${
                                      (() => {
                                        const participation = apartmentParticipations[apartment.id];
                                        // Marchează dacă participarea modifică suma (excluded, percentage sau fixed)
                                        if (participation?.type === 'excluded' || participation?.type === 'percentage' || participation?.type === 'fixed') {
                                          return 'bg-amber-100 text-amber-800';
                                        }
                                        return 'bg-teal-50 text-teal-700';
                                      })()
                                    }`}>
                                      {(() => {
                                        const participation = apartmentParticipations[apartment.id];

                                        // Exclus → 0
                                        if (participation?.type === 'excluded') {
                                          return '-';
                                        }

                                        // Calculează suma de bază
                                        let baseAmount = 0;
                                        if (isConsumption && expense?.unitPrice) {
                                          baseAmount = finalConsumption * expense.unitPrice;
                                        } else if (!isConsumption) {
                                          baseAmount = parseFloat(manualValue) || 0;
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
                                    {isConsumption && expense?.isUnitBased && expense?.billAmount && (
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
                            <tfoot>
                              <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
                                <td colSpan={4 + (isConsumption && config.indexConfiguration?.inputMode !== 'manual' && config.indexConfiguration?.indexTypes?.length > 0 ? config.indexConfiguration.indexTypes.length * 2 : 0)} className="px-2 py-2 text-right border-r">TOTAL:</td>

                                {/* Consum total */}
                                {isConsumption && (
                                  <td className="px-2 py-2 text-center text-blue-700 border-r">
                                    {(() => {
                                      const totalConsumption = apartments.reduce((sum, apt) => {
                                        // Verifică modul de introducere
                                        const inputMode = config?.indexConfiguration?.inputMode || 'manual';
                                        const isIndexMode = inputMode === 'indexes';

                                        let aptConsumption = 0;
                                        const indexes = expense?.indexes?.[apt.id];

                                        // Folosește indexes DOAR dacă inputMode este 'indexes'
                                        if (isIndexMode && indexes) {
                                          Object.values(indexes).forEach(indexData => {
                                            if (indexData.newIndex && indexData.oldIndex) {
                                              aptConsumption += parseFloat(indexData.newIndex) - parseFloat(indexData.oldIndex);
                                            }
                                          });
                                        } else if (!isIndexMode) {
                                          aptConsumption = parseFloat(expense?.consumption?.[apt.id] || 0);
                                        }
                                        return sum + aptConsumption;
                                      }, 0);
                                      return totalConsumption.toFixed(2);
                                    })()}
                                  </td>
                                )}

                                {/* Suma calculată ÎNAINTE de participare (doar dacă avem unitPrice - ca în header) */}
                                {isConsumption && expense?.unitPrice && (
                                  <td className="px-2 py-2 border-r">
                                    <div className="text-right text-purple-700 font-bold">
                                      {(() => {
                                        const totalBeforeParticipation = apartments.reduce((sum, apt) => {
                                          let aptAmount = 0;
                                          if (isConsumption) {
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
                                          } else {
                                            aptAmount = parseFloat(expense?.individualAmounts?.[apt.id] || 0);
                                          }
                                          return sum + aptAmount;
                                        }, 0);
                                        return totalBeforeParticipation.toFixed(2);
                                      })()}
                                    </div>
                                    {/* Diferența față de suma așteptată */}
                                    {expense?.billAmount && (() => {
                                      const filterInfo = getFilterInfo();
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
                                        // ✅ Când filtrezi pe scară dar suma e pe bloc, calculează diferența la nivel de BLOC
                                        expectedAmount = parseFloat(expense?.amountsByBlock?.[filterInfo.blockId] || 0);
                                        const allApts = getAssociationApartments();
                                        const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
                                        const blockStairIds = blockStairs.map(s => s.id);
                                        apartmentsForDiff = allApts.filter(apt => blockStairIds.includes(apt.stairId));
                                      } else if (filterInfo.type === 'stair' && receptionMode === 'per_association') {
                                        // ✅ Când filtrezi pe scară dar suma e pe asociație, calculează diferența la nivel de ASOCIAȚIE
                                        expectedAmount = parseFloat(expense?.billAmount || 0);
                                        apartmentsForDiff = getAssociationApartments();
                                      }

                                      const totalBeforeParticipation = apartmentsForDiff.reduce((sum, apt) => {
                                        let aptAmount = 0;
                                        if (isConsumption) {
                                          // Verifică modul de introducere
                                          const inputMode = config?.indexConfiguration?.inputMode || 'manual';
                                          const isIndexMode = inputMode === 'indexes';

                                          let aptConsumption = 0;
                                          const indexes = expense?.indexes?.[apt.id];

                                          // Folosește indexes DOAR dacă inputMode este 'indexes'
                                          if (isIndexMode && indexes) {
                                            Object.values(indexes).forEach(indexData => {
                                              if (indexData.newIndex && indexData.oldIndex) {
                                                aptConsumption += parseFloat(indexData.newIndex) - parseFloat(indexData.oldIndex);
                                              }
                                            });
                                          } else if (!isIndexMode) {
                                            aptConsumption = parseFloat(expense?.consumption?.[apt.id] || 0);
                                          }
                                          aptAmount = aptConsumption * (expense?.unitPrice || 0);
                                        } else {
                                          aptAmount = parseFloat(expense?.individualAmounts?.[apt.id] || 0);
                                        }
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

                                {/* Celulă goală pentru coloana "Sumă (RON)" la cheltuieli individuale */}
                                {!isConsumption && (
                                  <td className="px-2 py-2 text-center border-l border-r text-gray-400">
                                    -
                                  </td>
                                )}

                                {/* Suma DUPĂ participare */}
                                <td className="px-2 py-2 border-r">
                                  <div className="text-right text-green-700 font-bold">
                                    {(() => {
                                      const expense = getDistributedExpense(expenseType.name);
                                      const config = getExpenseConfig(expense || expenseType.name);
                                      const apartmentParticipations = config?.apartmentParticipation || {};
                                      const isConsumption = config?.distributionType === 'consumption' || config?.distributionType === 'consumption_cumulative';

                                      const totalAfterParticipation = apartments.reduce((sum, apt) => {
                                        const participation = apartmentParticipations[apt.id];

                                        let aptAmount = 0;
                                        if (isConsumption) {
                                          // Verifică modul de introducere
                                          const inputMode = config?.indexConfiguration?.inputMode || 'manual';
                                          const isIndexMode = inputMode === 'indexes';

                                          let aptConsumption = 0;
                                          const indexes = expense?.indexes?.[apt.id];

                                          // Folosește indexes DOAR dacă inputMode este 'indexes'
                                          if (isIndexMode && indexes) {
                                            Object.values(indexes).forEach(indexData => {
                                              if (indexData.newIndex && indexData.oldIndex) {
                                                aptConsumption += parseFloat(indexData.newIndex) - parseFloat(indexData.oldIndex);
                                              }
                                            });
                                          } else if (!isIndexMode) {
                                            aptConsumption = parseFloat(expense?.consumption?.[apt.id] || 0);
                                          }
                                          aptAmount = aptConsumption * (expense?.unitPrice || 0);
                                        } else {
                                          aptAmount = parseFloat(expense?.individualAmounts?.[apt.id] || 0);
                                        }

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
                                  {/* Diferența față de suma așteptată */}
                                  {expense?.billAmount && (() => {
                                    const filterInfo = getFilterInfo();
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
                                      // ✅ Când filtrezi pe scară dar suma e pe bloc, calculează diferența la nivel de BLOC
                                      expectedAmount = parseFloat(expense?.amountsByBlock?.[filterInfo.blockId] || 0);
                                      const allApts = getAssociationApartments();
                                      const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
                                      const blockStairIds = blockStairs.map(s => s.id);
                                      apartmentsForDiff = allApts.filter(apt => blockStairIds.includes(apt.stairId));
                                    } else if (filterInfo.type === 'stair' && receptionMode === 'per_association') {
                                      // ✅ Când filtrezi pe scară dar suma e pe asociație, calculează diferența la nivel de ASOCIAȚIE
                                      expectedAmount = parseFloat(expense?.billAmount || 0);
                                      apartmentsForDiff = getAssociationApartments();
                                    }

                                    const config = getExpenseConfig(expense || expenseType.name);
                                    const apartmentParticipations = config?.apartmentParticipation || {};
                                    const isConsumption = config?.distributionType === 'consumption' || config?.distributionType === 'consumption_cumulative';

                                    const totalAfterParticipation = apartmentsForDiff.reduce((sum, apt) => {
                                      const participation = apartmentParticipations[apt.id];

                                      let aptAmount = 0;
                                      if (isConsumption) {
                                        // Verifică modul de introducere
                                        const inputMode = config?.indexConfiguration?.inputMode || 'manual';
                                        const isIndexMode = inputMode === 'indexes';

                                        let aptConsumption = 0;
                                        const indexes = expense?.indexes?.[apt.id];

                                        // Folosește indexes DOAR dacă inputMode este 'indexes'
                                        if (isIndexMode && indexes) {
                                          Object.values(indexes).forEach(indexData => {
                                            if (indexData.newIndex && indexData.oldIndex) {
                                              aptConsumption += parseFloat(indexData.newIndex) - parseFloat(indexData.oldIndex);
                                            }
                                          });
                                        } else if (!isIndexMode) {
                                          aptConsumption = parseFloat(expense?.consumption?.[apt.id] || 0);
                                        }
                                        aptAmount = aptConsumption * (expense?.unitPrice || 0);
                                      } else {
                                        aptAmount = parseFloat(expense?.individualAmounts?.[apt.id] || 0);
                                      }

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
                                {isConsumption && expense?.isUnitBased && expense?.billAmount && (
                                  <td className="px-2 py-2 border-l bg-orange-50">
                                    <div className="text-right font-bold text-orange-700">
                                      {(() => {
                                        if (!expense || !calculateExpenseDifferences) {
                                          return '-';
                                        }

                                        const allApartments = getAssociationApartments();
                                        const expenseDifferences = calculateExpenseDifferences(expense, allApartments);

                                        const totalDifference = apartments.reduce((sum, apt) => {
                                          return sum + (expenseDifferences[apt.id] || 0);
                                        }, 0);

                                        if (Math.abs(totalDifference) < 0.01) {
                                          return '-';
                                        }

                                        return totalDifference.toFixed(2);
                                      })()}
                                    </div>
                                    {/* Verificare finală: Total după participare + Diferență = Suma așteptată */}
                                    {(() => {
                                      if (!expense || !calculateExpenseDifferences) return null;

                                      const filterInfo = getFilterInfo();
                                      let receptionMode = expense.receptionMode || 'total';
                                      if (expense.expenseEntryMode) {
                                        if (expense.expenseEntryMode === 'building') receptionMode = 'per_block';
                                        else if (expense.expenseEntryMode === 'staircase') receptionMode = 'per_stair';
                                        else if (expense.expenseEntryMode === 'per_association') receptionMode = 'total';
                                      }

                                      // Determină suma așteptată și apartamentele pentru calculul total
                                      let expectedAmount = 0;
                                      let apartmentsForCalculation = apartments; // Default: apartamente filtrate

                                      if (filterInfo.type === 'all') {
                                        expectedAmount = parseFloat(expense?.billAmount || 0);
                                        apartmentsForCalculation = apartments; // Toate apartamentele
                                      } else if (filterInfo.type === 'stair' && receptionMode === 'per_stair') {
                                        expectedAmount = parseFloat(expense?.amountsByStair?.[filterInfo.stairId] || 0);
                                        apartmentsForCalculation = apartments; // Apartamente din scară
                                      } else if (filterInfo.type === 'stair' && receptionMode === 'per_block' && filterInfo.blockId) {
                                        // ✅ FIX: Când filtrezi pe scară dar suma e pe bloc, ia TOATE apartamentele din bloc
                                        expectedAmount = parseFloat(expense?.amountsByBlock?.[filterInfo.blockId] || 0);
                                        const allApts = getAssociationApartments();
                                        const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
                                        const blockStairIds = blockStairs.map(s => s.id);
                                        apartmentsForCalculation = allApts.filter(apt => blockStairIds.includes(apt.stairId));
                                      } else if (filterInfo.type === 'stair' && receptionMode === 'per_association') {
                                        // ✅ FIX: Când filtrezi pe scară dar suma e pe asociație, ia TOATE apartamentele
                                        expectedAmount = parseFloat(expense?.billAmount || 0);
                                        apartmentsForCalculation = getAssociationApartments();
                                      }

                                      const config = getExpenseConfig(expense || expenseType.name);  // Trimite obiectul cheltuielii pentru expenseTypeId
                                      const apartmentParticipations = config?.apartmentParticipation || {};
                                      const isConsumption = config?.distributionType === 'consumption' || config?.distributionType === 'consumption_cumulative';

                                      // Calculează total după participare pentru apartamentele corecte
                                      const totalAfterParticipation = apartmentsForCalculation.reduce((sum, apt) => {
                                        const participation = apartmentParticipations[apt.id];
                                        let aptAmount = 0;

                                        if (isConsumption) {
                                          // Verifică modul de introducere
                                          const inputMode = config?.indexConfiguration?.inputMode || 'manual';
                                          const isIndexMode = inputMode === 'indexes';

                                          let aptConsumption = 0;
                                          const indexes = expense?.indexes?.[apt.id];

                                          // Folosește indexes DOAR dacă inputMode este 'indexes'
                                          if (isIndexMode && indexes) {
                                            Object.values(indexes).forEach(indexData => {
                                              if (indexData.newIndex && indexData.oldIndex) {
                                                aptConsumption += parseFloat(indexData.newIndex) - parseFloat(indexData.oldIndex);
                                              }
                                            });
                                          } else if (!isIndexMode) {
                                            aptConsumption = parseFloat(expense?.consumption?.[apt.id] || 0);
                                          }
                                          aptAmount = aptConsumption * (expense?.unitPrice || 0);
                                        } else {
                                          aptAmount = parseFloat(expense?.individualAmounts?.[apt.id] || 0);
                                        }

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

                                      // Adaugă diferențele pentru apartamentele corecte
                                      const allApartments = getAssociationApartments();
                                      const expenseDifferences = calculateExpenseDifferences(expense, allApartments);


                                      const totalDifference = apartmentsForCalculation.reduce((sum, apt) => {
                                        const diff = expenseDifferences[apt.id] || 0;
                                        return sum + diff;
                                      }, 0);



                                      const finalTotal = totalAfterParticipation + totalDifference;
                                      // Diferență rămasă = calculat - așteptat
                                      const remainingDiff = finalTotal - expectedAmount;

                                      // Calculează diferența pentru apartamentele vizibile (din view-ul curent - scara filtrată)
                                      const totalDifferenceForVisibleApts = apartments.reduce((sum, apt) => {
                                        return sum + (expenseDifferences[apt.id] || 0);
                                      }, 0);

                                      // Determină contextul pentru afișare
                                      const distribuitContext = receptionMode === 'per_block' ? 'pe bloc' :
                                                               receptionMode === 'per_association' ? 'pe asociație' : '';

                                      // Arată echilibrarea finală
                                      if (Math.abs(remainingDiff) < 0.01) {
                                        return (
                                          <div className="text-xs text-green-600 font-medium mt-1">
                                            <div>Diferență distribuită: {totalDifferenceForVisibleApts.toFixed(2)} RON</div>
                                            {distribuitContext && (
                                              <div className="text-[10px] text-gray-500">(din {totalDifference.toFixed(2)} RON {distribuitContext})</div>
                                            )}
                                          </div>
                                        );
                                      } else {
                                        return (
                                          <div className="text-xs text-red-600 mt-1">
                                            Diferență rămasă: {remainingDiff > 0 ? '+' : ''}{remainingDiff.toFixed(2)}
                                          </div>
                                        );
                                      }
                                    })()}
                                  </td>
                                )}
                              </tr>
                            </tfoot>
                          </table>
                        </div>
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
