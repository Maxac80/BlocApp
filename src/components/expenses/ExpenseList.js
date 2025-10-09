import React, { useState, useEffect, useRef } from 'react';
import { Calculator, Trash2, ChevronDown, ChevronUp, AlertCircle, Edit2 } from 'lucide-react';

const ExpenseList = ({
  associationExpenses,
  currentMonth,
  currentSheet,
  getExpenseConfig,
  getAssociationApartments,
  handleDeleteMonthlyExpense,
  isMonthReadOnly,
  monthType,
  selectedStairTab,
  blocks,
  stairs,
  onEditExpense,
  onConsumptionClick,
  expandExpenseName
}) => {
  // State pentru expandarea cheltuielilor (accordion)
  const [expandedExpenses, setExpandedExpenses] = useState({});

  // Refs pentru scroll automat la cheltuieli
  const expenseRefs = useRef({});

  // Auto-expandare când se primește un expense name
  useEffect(() => {
    if (expandExpenseName) {
      // Găsește expense-ul după nume
      const expenseToExpand = associationExpenses.find(exp => exp.name === expandExpenseName);
      if (expenseToExpand) {
        // Expandează DOAR această cheltuială (resetează restul)
        setExpandedExpenses({
          [expenseToExpand.id]: true
        });

        // Scroll automat la cheltuială după un mic delay pentru a permite rendering-ul
        setTimeout(() => {
          const expenseElement = expenseRefs.current[expenseToExpand.id];
          if (expenseElement) {
            expenseElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }
        }, 100);
      }
    }
  }, [expandExpenseName, associationExpenses]);

  // Toggle expand pentru o cheltuială
  const toggleExpense = (expenseId) => {
    setExpandedExpenses(prev => ({
      ...prev,
      [expenseId]: !prev[expenseId]
    }));
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

  // Calculează suma relevantă pentru o cheltuială bazată pe filtrul activ
  const getRelevantAmount = (expense) => {
    const filterInfo = getFilterInfo();

    // Mapează receptionMode din diferite formate
    let receptionMode = expense.receptionMode || 'total';
    if (expense.expenseEntryMode) {
      if (expense.expenseEntryMode === 'building') receptionMode = 'per_block';
      else if (expense.expenseEntryMode === 'staircase') receptionMode = 'per_stair';
      else if (expense.expenseEntryMode === 'total') receptionMode = 'total';
    }

    // Pentru filtrul "Toate"
    if (filterInfo.type === 'all') {
      return expense.isUnitBased ? expense.billAmount : expense.amount;
    }

    // Pentru filtrul pe scară
    if (filterInfo.type === 'stair') {
      if (receptionMode === 'per_stair' && expense.amountsByStair) {
        return parseFloat(expense.amountsByStair[filterInfo.stairId] || 0);
      }
      if (receptionMode === 'per_block' && expense.amountsByBlock && filterInfo.blockId) {
        return parseFloat(expense.amountsByBlock[filterInfo.blockId] || 0);
      }
    }

    // Fallback la suma totală
    return expense.isUnitBased ? expense.billAmount : expense.amount;
  };

  // Filtrează și calculează totalul
  const filteredExpenses = associationExpenses.filter(expense => {
    const filterInfo = getFilterInfo();
    if (filterInfo.type === 'all') return true;

    // Verifică dacă cheltuiala e relevantă pentru scara/blocul selectat
    let receptionMode = expense.receptionMode || 'total';
    if (expense.expenseEntryMode) {
      if (expense.expenseEntryMode === 'building') receptionMode = 'per_block';
      else if (expense.expenseEntryMode === 'staircase') receptionMode = 'per_stair';
      else if (expense.expenseEntryMode === 'total') receptionMode = 'total';
    }

    // Cheltuielile totale sunt relevante pentru toate tab-urile
    if (receptionMode === 'total') return true;

    // Cheltuielile pe scări sunt relevante doar pentru scara respectivă
    if (receptionMode === 'per_stair') {
      return expense.amountsByStair && expense.amountsByStair[filterInfo.stairId] > 0;
    }

    // Cheltuielile pe blocuri sunt relevante pentru toate scările din bloc
    if (receptionMode === 'per_block' && filterInfo.blockId) {
      return expense.amountsByBlock && expense.amountsByBlock[filterInfo.blockId] > 0;
    }

    return true;
  });

  const totalAmount = filteredExpenses.reduce((sum, expense) => {
    return sum + getRelevantAmount(expense);
  }, 0);

  // Calculează suma care revine unui apartament (folosită pentru afișarea sumelor în RON pentru participări procentuale)
  const calculateApartmentAmount = (expense, apartment, relevantAmount) => {
    const config = getExpenseConfig(expense.name);
    const allApartments = getAssociationApartments();

    const distributionType = expense.distributionType || expense.distributionMethod;
    let apartmentStair = stairs?.find(s => s.id === apartment.stairId);
    let apartmentBlockId = apartmentStair?.blockId;

    // Calculează suma bazată pe tipul de distribuție
    switch (distributionType) {
      case 'apartment':
      case 'perApartment':
        // Numărul de apartamente care ar trebui să participe integral
        const totalApartments = allApartments.filter(apt => {
          const p = config.apartmentParticipation?.[apt.id];
          return !p || p.type === 'integral' || p === 1 || p === 100;
        }).length || allApartments.length;
        return relevantAmount / totalApartments;

      case 'person':
      case 'perPerson':
        // Numărul total de persoane care ar trebui să participe integral
        const totalPersons = allApartments.reduce((sum, apt) => {
          const p = config.apartmentParticipation?.[apt.id];
          if (!p || p.type === 'integral' || p === 1 || p === 100) {
            return sum + (apt.persons || 0);
          }
          return sum;
        }, 0) || allApartments.reduce((sum, apt) => sum + (apt.persons || 0), 0);
        return (relevantAmount / totalPersons) * (apartment.persons || 0);

      default:
        return 0;
    }
  };

  // Calculează informații despre participare pentru o cheltuială
  const getParticipationInfo = (expense) => {
    const config = getExpenseConfig(expense.name);
    const allApartments = getAssociationApartments();

    // Filtrează apartamentele relevante pe baza tab-ului activ
    const filterInfo = getFilterInfo();
    let relevantApartments = allApartments;

    if (filterInfo.type === 'stair') {
      relevantApartments = allApartments.filter(apt => {
        const aptStair = stairs?.find(s => s.id === apt.stairId);
        if (expense.receptionMode === 'per_stair') {
          return apt.stairId === filterInfo.stairId;
        } else if (expense.receptionMode === 'per_block') {
          return aptStair?.blockId === filterInfo.blockId;
        }
        return true;
      });
    }

    // Determină suma relevantă pentru calcule
    const relevantAmount = getRelevantAmount(expense);

    // Determină care apartamente participă
    const participating = [];
    const notParticipating = [];
    const partialParticipating = [];

    relevantApartments.forEach(apt => {
      // Verifică dacă există reguli de participare pentru acest apartament
      const participation = config.apartmentParticipation?.[apt.id];

      // Participarea poate fi fie un obiect {type, value}, fie un număr legacy
      if (!participation || participation.type === 'integral' || (typeof participation === 'number' && (participation === 1 || participation === 100))) {
        // Participare completă (sau format vechi: undefined, null, 1, 100)
        participating.push(apt);
      } else if (participation.type === 'excluded' || (typeof participation === 'number' && participation === 0)) {
        // Nu participă deloc
        notParticipating.push({
          ...apt,
          participationPercent: 0
        });
      } else if (participation.type === 'percentage' || participation.type === 'fixed' || typeof participation === 'number') {
        // Participare parțială (procent sau sumă fixă)
        const percent = participation.type === 'percentage'
          ? participation.value
          : participation.type === 'fixed'
            ? participation.value  // Pentru fixed, afișăm valoarea ca procent pentru UI
            : (participation < 1 ? participation * 100 : participation); // Legacy format

        // Calculează suma în RON pentru acest apartament
        const baseAmount = calculateApartmentAmount(expense, apt, relevantAmount);
        const amountInRon = participation.type === 'percentage'
          ? baseAmount * (percent / 100)
          : parseFloat(percent);  // Pentru fixed, valoarea este deja în RON

        partialParticipating.push({
          ...apt,
          participationPercent: parseFloat(percent) || 0,
          participationType: participation.type || 'percentage',
          amountInRon: amountInRon
        });
      }
    });

    return {
      total: relevantApartments.length,
      participating: participating.length,
      partialParticipating,
      notParticipating,
      allParticipate: notParticipating.length === 0 && partialParticipating.length === 0,
      totalParticipating: participating.length + partialParticipating.length  // Total care participă (integral sau parțial)
    };
  };

  // Funcție pentru sortarea cheltuielilor ca în dropdown
  const sortExpenses = (expenses) => {
    return expenses.sort((a, b) => {
      // Sortare ca în dropdown: mai întâi cele standard (în ordinea din defaultExpenseTypes), apoi cele personalizate
      const defaultTypes = [
        "Apă caldă", "Apă rece", "Canal", "Întreținere lift", "Energie electrică", 
        "Service interfon", "Cheltuieli cu asociația", "Salarii NETE", "Impozit ANAF", 
        "Spații în folosință", "Căldură"
      ];
      
      const aIndex = defaultTypes.indexOf(a.name);
      const bIndex = defaultTypes.indexOf(b.name);
      
      // Dacă ambele sunt standard, sortez după index
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // Cheltuielile standard vin înaintea celor personalizate
      if (aIndex !== -1 && bIndex === -1) return -1;
      if (aIndex === -1 && bIndex !== -1) return 1;
      
      // Ambele sunt personalizate, sortez alfabetic
      return a.name.localeCompare(b.name);
    });
  };

  return (
    <>
      {/* Header cu total */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {filteredExpenses.length} {filteredExpenses.length === 1 ? 'cheltuială' : 'cheltuieli'}
            {getFilterInfo().type !== 'all' && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                ({getFilterInfo().blockName} - {getFilterInfo().stairName})
              </span>
            )}
          </h3>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-indigo-600">
            {totalAmount.toFixed(2)} RON
          </div>
          <div className="text-sm text-gray-500">Total</div>
        </div>
      </div>

      {filteredExpenses.length === 0 ? (
        <div className="text-center py-12">
          <Calculator className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Nu există cheltuieli distribuite</p>
          <p className="text-gray-500 text-sm mt-1">Distribuie prima cheltuială pentru a calcula întreținerea</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortExpenses([...filteredExpenses]).map(expense => {
            const config = getExpenseConfig(expense.name);
            const relevantAmount = getRelevantAmount(expense);
            const isExpanded = expandedExpenses[expense.id];
            const participationInfo = getParticipationInfo(expense);

            // Determină modul de recepție
            let receptionMode = expense.receptionMode || 'total';
            if (expense.expenseEntryMode) {
              if (expense.expenseEntryMode === 'building') receptionMode = 'per_block';
              else if (expense.expenseEntryMode === 'staircase') receptionMode = 'per_stair';
              else if (expense.expenseEntryMode === 'total') receptionMode = 'total';
            }

            return (
              <div
                key={expense.id}
                ref={(el) => expenseRefs.current[expense.id] = el}
                className="border border-gray-300 rounded-lg overflow-hidden hover:border-indigo-400 transition-colors"
              >
                {/* Header - întotdeauna vizibil */}
                <div
                  className="p-3 bg-gradient-to-r from-indigo-50 to-white cursor-pointer hover:from-indigo-100"
                  onClick={() => toggleExpense(expense.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Nume și sumă pe același rând */}
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-base text-gray-900">{expense.name}</h4>
                        <div className="text-right">
                          <div className="text-xl font-bold text-indigo-600 ml-4">
                            {relevantAmount.toFixed(2)} RON
                          </div>
                          {/* Afișează suma pe unitate pentru cheltuieli pe apartament/persoană */}
                          {receptionMode === 'total' && config.distributionType === 'apartment' && (() => {
                            const allApts = getAssociationApartments();
                            const participatingApts = allApts.filter(apt => {
                              const participation = config.apartmentParticipation?.[apt.id];
                              return participation === undefined || participation === null || participation === 1 || participation === 100;
                            });
                            if (participatingApts.length > 0) {
                              return (
                                <div className="text-xs text-indigo-600 font-medium">
                                  {(relevantAmount / participatingApts.length).toFixed(2)} RON/apartament
                                </div>
                              );
                            }
                            return null;
                          })()}
                          {receptionMode === 'total' && config.distributionType === 'person' && (() => {
                            const allApts = getAssociationApartments();
                            let totalPersons = 0;
                            allApts.forEach(apt => {
                              const participation = config.apartmentParticipation?.[apt.id];
                              if (participation === undefined || participation === null || participation === 1 || participation === 100) {
                                totalPersons += apt.persons || 0;
                              } else if (participation > 0 && participation < 1) {
                                totalPersons += (apt.persons || 0) * participation;
                              } else if (participation > 1 && participation < 100) {
                                totalPersons += (apt.persons || 0) * (participation / 100);
                              }
                            });
                            if (totalPersons > 0) {
                              return (
                                <div className="text-xs text-indigo-600 font-medium">
                                  {(relevantAmount / totalPersons).toFixed(2)} RON/persoană
                                </div>
                              );
                            }
                            return null;
                          })()}
                          {/* Afișează prețul unitar pentru cheltuieli pe consum */}
                          {config.distributionType === 'consumption' && expense.unitPrice && (
                            <div className="text-xs text-indigo-600 font-medium">
                              {parseFloat(expense.unitPrice).toFixed(2)} RON/{expense.name.toLowerCase().includes("apă") || expense.name.toLowerCase().includes("canal") ? "mc" : "Gcal"}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Badge status consum pentru cheltuieli pe consum */}
                      {config.distributionType === 'consumption' && (() => {
                        const filteredApartments = getFilteredApartments();

                        // Exclude apartamentele EXCLUSE din calcul
                        const apartmentParticipations = config.apartmentParticipation || {};
                        const nonExcludedApartments = filteredApartments.filter(apt => {
                          const participation = apartmentParticipations[apt.id];
                          return participation?.type !== 'excluded';
                        });

                        // Folosește DOAR datele din expense (nu merge cu pending)
                        const dataObject = expense.consumption || {};

                        // Verifică pentru apartamentele filtrate (Toate sau scară specifică) NON-EXCLUSE
                        const apartmentsWithConsumption = nonExcludedApartments.filter(apt => {
                          const value = dataObject?.[apt.id];
                          return value && parseFloat(value) >= 0; // Exact ca în ConsumptionInput
                        }).length;
                        const totalApartments = nonExcludedApartments.length;
                        const isComplete = apartmentsWithConsumption === totalApartments && totalApartments > 0;

                        return (
                          <div className="mt-2">
                            {isComplete ? (
                              <button
                                onClick={() => onConsumptionClick(expense.name)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200 cursor-pointer transition-colors"
                                title="Click pentru a vedea consumurile"
                              >
                                ✓ Consumuri complete
                              </button>
                            ) : (
                              <button
                                onClick={() => onConsumptionClick(expense.name)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium hover:bg-orange-200 cursor-pointer transition-colors"
                                title="Click pentru a completa consumurile"
                              >
                                ⚠ Consumuri incomplete: {apartmentsWithConsumption}/{totalApartments} apartamente
                              </button>
                            )}
                          </div>
                        );
                      })()}

                      {/* Badge status sume pentru cheltuieli cu sume individuale */}
                      {config.distributionType === 'individual' && (() => {
                        const filteredApartments = getFilteredApartments();

                        // Exclude apartamentele EXCLUSE din calcul
                        const apartmentParticipations = config.apartmentParticipation || {};
                        const nonExcludedApartments = filteredApartments.filter(apt => {
                          const participation = apartmentParticipations[apt.id];
                          return participation?.type !== 'excluded';
                        });

                        // Folosește DOAR datele din expense (nu merge cu pending)
                        const dataObject = expense.individualAmounts || {}; // FIX: individualAmounts nu fixedAmounts

                        // Verifică pentru apartamentele filtrate (Toate sau scară specifică) NON-EXCLUSE
                        const apartmentsWithAmounts = nonExcludedApartments.filter(apt => {
                          const value = dataObject?.[apt.id];
                          return value && parseFloat(value) >= 0; // Exact ca în ConsumptionInput
                        }).length;
                        const totalApartments = nonExcludedApartments.length;
                        const isComplete = apartmentsWithAmounts === totalApartments && totalApartments > 0;

                        return (
                          <div className="mt-2">
                            {isComplete ? (
                              <button
                                onClick={() => onConsumptionClick(expense.name)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200 cursor-pointer transition-colors"
                                title="Click pentru a vedea sumele individuale"
                              >
                                ✓ Sume complete
                              </button>
                            ) : (
                              <button
                                onClick={() => onConsumptionClick(expense.name)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium hover:bg-orange-200 cursor-pointer transition-colors"
                                title="Click pentru a completa sumele individuale"
                              >
                                ⚠ Sume incomplete: {apartmentsWithAmounts}/{totalApartments} apartamente
                              </button>
                            )}
                          </div>
                        );
                      })()}

                      {/* Informații pe două linii compacte */}
                      <div className="space-y-1 text-xs">
                        {/* Linia 1: Mod distribuție + Recepție */}
                        <div className="flex items-center gap-3 text-gray-600">
                          <span className="font-medium">Distribuție:</span>
                          <span>
                            {config.distributionType === "apartment" && "Pe apartament (egal)"}
                            {config.distributionType === "person" && "Pe persoană"}
                            {config.distributionType === "consumption" && "Pe consum (mc/apartament)"}
                            {config.distributionType === "individual" && "Sume individuale (RON/apartament)"}
                          </span>
                          {receptionMode === 'total' && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">🏘️ Pe asociație</span>}
                          {receptionMode === 'per_block' && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">🏢 Pe bloc</span>}
                          {receptionMode === 'per_stair' && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">🪜 Pe scară</span>}
                        </div>

                        {/* Linia 2: Participare */}
                        <div className="flex items-center gap-2 text-gray-600">
                          <span className="font-medium">Participare:</span>
                          <span className="text-indigo-600 font-medium">
                            {participationInfo.totalParticipating}/{participationInfo.total} apartamente
                          </span>
                          {!participationInfo.allParticipate && (
                            <>
                              {participationInfo.notParticipating.length > 0 && (
                                <span className="text-red-600">
                                  • {participationInfo.notParticipating.length} nu participă
                                </span>
                              )}
                              {participationInfo.partialParticipating.length > 0 && (
                                <span className="text-orange-600">
                                  • {participationInfo.partialParticipating.length} parțial
                                </span>
                              )}
                            </>
                          )}
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
                    {/* Defalcare pe blocuri/scări */}
                    {receptionMode !== 'total' && getFilterInfo().type === 'all' && (
                      <div>
                        <h5 className="font-semibold text-gray-700 mb-2">📊 Defalcare pe {receptionMode === 'per_block' ? 'blocuri 🏢' : 'scări 🪜'}:</h5>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {receptionMode === 'per_block' && expense.amountsByBlock && blocks && (
                            blocks.map(block => {
                              const blockAmount = parseFloat(expense.amountsByBlock[block.id] || 0);
                              if (blockAmount === 0) return null;
                              const blockStairs = stairs?.filter(s => s.blockId === block.id) || [];
                              const blockApts = getAssociationApartments().filter(apt => {
                                return blockStairs.some(s => s.id === apt.stairId);
                              });
                              // Calculează persoanele din bloc
                              let blockPersons = 0;
                              blockApts.forEach(apt => {
                                const participation = config.apartmentParticipation?.[apt.id];
                                if (participation === undefined || participation === null || participation === 1 || participation === 100) {
                                  blockPersons += apt.persons || 0;
                                } else if (participation > 0 && participation < 1) {
                                  blockPersons += (apt.persons || 0) * participation;
                                } else if (participation > 1 && participation < 100) {
                                  blockPersons += (apt.persons || 0) * (participation / 100);
                                }
                              });

                              // Calculează câte apartamente participă efectiv
                              const participatingApts = blockApts.filter(apt => {
                                const p = config.apartmentParticipation?.[apt.id];
                                return !p || p.type === 'integral' || p === 1 || p === 100;
                              });
                              const partialApts = blockApts.filter(apt => {
                                const p = config.apartmentParticipation?.[apt.id];
                                return p && (p.type === 'percentage' || p.type === 'fixed' || (typeof p === 'number' && p > 0 && p < 1));
                              });

                              return (
                                <div key={block.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="font-medium text-blue-900">{block.name}</div>
                                  <div className="text-xl font-bold text-blue-700">{blockAmount.toFixed(2)} RON</div>
                                  {config.distributionType === "apartment" && blockApts.length > 0 && (
                                    <div className="text-sm text-blue-600">{(blockAmount / blockApts.length).toFixed(2)} RON/apt</div>
                                  )}
                                  {config.distributionType === "person" && blockPersons > 0 && (
                                    <div className="text-sm text-blue-600">{(blockAmount / blockPersons).toFixed(2)} RON/persoană</div>
                                  )}
                                  <div className="text-xs text-blue-500 mt-1">
                                    {participatingApts.length + partialApts.length}/{blockApts.length} apartamente participă
                                  </div>
                                </div>
                              );
                            })
                          )}
                          {receptionMode === 'per_stair' && expense.amountsByStair && stairs && (
                            stairs.map(stair => {
                              const stairAmount = parseFloat(expense.amountsByStair[stair.id] || 0);
                              if (stairAmount === 0) return null;
                              const block = blocks?.find(b => b.id === stair.blockId);
                              const stairApts = getAssociationApartments().filter(apt => apt.stairId === stair.id);

                              // Calculează câte apartamente participă efectiv
                              const participatingApts = stairApts.filter(apt => {
                                const p = config.apartmentParticipation?.[apt.id];
                                return !p || p.type === 'integral' || p === 1 || p === 100;
                              });
                              const partialApts = stairApts.filter(apt => {
                                const p = config.apartmentParticipation?.[apt.id];
                                return p && (p.type === 'percentage' || p.type === 'fixed' || (typeof p === 'number' && p > 0 && p < 1));
                              });

                              // Calculează persoanele din scară
                              let stairPersons = 0;
                              stairApts.forEach(apt => {
                                const participation = config.apartmentParticipation?.[apt.id];
                                if (participation === undefined || participation === null || participation === 1 || participation === 100) {
                                  stairPersons += apt.persons || 0;
                                } else if (participation > 0 && participation < 1) {
                                  stairPersons += (apt.persons || 0) * participation;
                                } else if (participation > 1 && participation < 100) {
                                  stairPersons += (apt.persons || 0) * (participation / 100);
                                }
                              });

                              return (
                                <div key={stair.id} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                  <div className="font-medium text-purple-900">{block?.name} - {stair.name}</div>
                                  <div className="text-xl font-bold text-purple-700">{stairAmount.toFixed(2)} RON</div>
                                  {config.distributionType === "apartment" && stairApts.length > 0 && (
                                    <div className="text-sm text-purple-600">{(stairAmount / stairApts.length).toFixed(2)} RON/apt</div>
                                  )}
                                  {config.distributionType === "person" && stairPersons > 0 && (
                                    <div className="text-sm text-purple-600">{(stairAmount / stairPersons).toFixed(2)} RON/persoană</div>
                                  )}
                                  <div className="text-xs text-purple-500 mt-1">
                                    {participatingApts.length + partialApts.length}/{stairApts.length} apartamente participă
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}

                    {/* Informații despre participare */}
                    {!participationInfo.allParticipate && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <h5 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                          <AlertCircle className="w-5 h-5" />
                          Participare
                        </h5>

                        {/* Grupare pe scări - Apartamente care nu participă deloc */}
                        {participationInfo.notParticipating.length > 0 && (
                          <div className="mb-3">
                            <div className="text-sm font-medium text-red-700 mb-2">
                              Nu participă ({participationInfo.notParticipating.length}):
                            </div>
                            {(() => {
                              // Grupează pe scări
                              const byStair = {};
                              participationInfo.notParticipating.forEach(apt => {
                                const stair = stairs?.find(s => s.id === apt.stairId);
                                const block = blocks?.find(b => b.id === stair?.blockId);
                                const key = stair ? `${block?.name || ''} - ${stair.name}` : 'Fără scară';
                                if (!byStair[key]) byStair[key] = [];
                                byStair[key].push(apt);
                              });
                              return Object.entries(byStair).map(([stairName, apts]) => (
                                <div key={stairName} className="mb-1.5 flex items-center gap-2">
                                  <span className="text-xs text-gray-600 whitespace-nowrap">{stairName}:</span>
                                  <div className="flex flex-wrap gap-2">
                                    {apts.map(apt => (
                                      <span key={apt.id} className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-semibold">
                                        Ap. {apt.number}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        )}

                        {/* Grupare pe scări - Apartamente cu participare parțială */}
                        {participationInfo.partialParticipating.length > 0 && (
                          <div>
                            <div className="text-sm font-medium text-orange-700 mb-2">
                              Participare parțială ({participationInfo.partialParticipating.length}):
                            </div>
                            {(() => {
                              // Grupează pe scări
                              const byStair = {};
                              participationInfo.partialParticipating.forEach(apt => {
                                const stair = stairs?.find(s => s.id === apt.stairId);
                                const block = blocks?.find(b => b.id === stair?.blockId);
                                const key = stair ? `${block?.name || ''} - ${stair.name}` : 'Fără scară';
                                if (!byStair[key]) byStair[key] = [];
                                byStair[key].push(apt);
                              });
                              return Object.entries(byStair).map(([stairName, apts]) => (
                                <div key={stairName} className="mb-1.5 flex items-center gap-2">
                                  <span className="text-xs text-gray-600 whitespace-nowrap">{stairName}:</span>
                                  <div className="flex flex-wrap gap-2">
                                    {apts.map(apt => {
                                      const displayText = apt.participationType === 'fixed'
                                        ? `${apt.amountInRon.toFixed(2)} RON`
                                        : `${apt.participationPercent.toFixed(0)}%: ${apt.amountInRon.toFixed(2)} RON`;
                                      return (
                                        <span key={apt.id} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">
                                          <span className="font-semibold">Ap. {apt.number}</span> ({displayText})
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Calcule pentru consum */}
                    {config.distributionType === "consumption" && expense.consumption && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h5 className="font-semibold text-green-900 mb-3">📊 Calcule consum</h5>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <div className="text-sm text-green-700">Total unități</div>
                            <div className="text-2xl font-bold text-green-900">
                              {Object.values(expense.consumption).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(2)}
                              <span className="text-sm ml-1">{expense.name.toLowerCase().includes("apă") || expense.name.toLowerCase().includes("canal") ? "mc" : "Gcal"}</span>
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-green-700">Preț unitar</div>
                            <div className="text-2xl font-bold text-green-900">
                              {parseFloat(expense.unitPrice).toFixed(2)}
                              <span className="text-sm ml-1">RON</span>
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-green-700">Total calculat</div>
                            <div className="text-2xl font-bold text-green-900">
                              {(Object.values(expense.consumption).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) * expense.unitPrice).toFixed(2)}
                              <span className="text-sm ml-1">RON</span>
                            </div>
                          </div>
                        </div>
                        {expense.billAmount && (
                          <div className="mt-3 pt-3 border-t border-green-300">
                            <div className="text-sm text-green-700">Diferență față de factură</div>
                            <div className={`text-xl font-bold ${
                              Math.abs(Object.values(expense.consumption).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) * expense.unitPrice - expense.billAmount) < 5
                                ? 'text-green-600'
                                : 'text-orange-600'
                            }`}>
                              {(Object.values(expense.consumption).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) * expense.unitPrice - expense.billAmount).toFixed(2)} RON
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Butoane acțiuni */}
                    {!isMonthReadOnly && (
                      <div className="flex justify-end gap-3 pt-2">
                        {onEditExpense && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditExpense(expense);
                            }}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 border border-blue-300"
                          >
                            <Edit2 className="w-4 h-4" />
                            Editează cheltuiala
                          </button>
                        )}
                        {handleDeleteMonthlyExpense && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Sigur vrei să ștergi cheltuiala "${expense.name}"?`)) {
                                handleDeleteMonthlyExpense(expense.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 border border-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                            Șterge cheltuiala
                          </button>
                        )}
                      </div>
                    )}
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

export default ExpenseList;
