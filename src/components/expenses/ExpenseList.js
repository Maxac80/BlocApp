import React, { useState, useEffect, useRef } from 'react';
import { Calculator, Trash2, ChevronDown, ChevronUp, AlertCircle, Edit2, Layers, Building2, BarChart, MoreVertical, Settings } from 'lucide-react';

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
  expandExpenseName,
  onConfigureExpense
}) => {
  // Helper: Obține unitatea de măsură configurată
  const getUnitLabel = (expenseName) => {
    const config = getExpenseConfig(expenseName);
    if (config?.consumptionUnit === 'custom' && config?.customConsumptionUnit) {
      return config.customConsumptionUnit;
    } else if (config?.consumptionUnit) {
      return config.consumptionUnit;
    }
    return 'mc'; // default
  };

  // State pentru expandarea cheltuielilor (accordion)
  const [expandedExpenses, setExpandedExpenses] = useState({});

  // State pentru dropdown meniu acțiuni
  const [openDropdown, setOpenDropdown] = useState(null);

  // Refs pentru scroll automat la cheltuieli
  const expenseRefs = useRef({});
  const dropdownRefs = useRef({});

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

  // Închide dropdown când se dă click în afară
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdown && dropdownRefs.current[openDropdown]) {
        if (!dropdownRefs.current[openDropdown].contains(event.target)) {
          setOpenDropdown(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

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

  // Calculează suma care revine unui apartament folosind logica de reponderare
  const calculateApartmentAmount = (expense, apartment, relevantAmount, apartmentsInScope) => {
    const config = getExpenseConfig(expense.name);
    const distributionType = expense.distributionType || expense.distributionMethod;

    // Determină modul de recepție pentru a filtra apartamentele corect
    let receptionMode = expense.receptionMode || 'total';
    if (expense.expenseEntryMode) {
      if (expense.expenseEntryMode === 'building') receptionMode = 'per_block';
      else if (expense.expenseEntryMode === 'staircase') receptionMode = 'per_stair';
      else if (expense.expenseEntryMode === 'total') receptionMode = 'total';
    }

    // CRUCIAL: Pentru cheltuieli "Pe scară" sau "Pe bloc", recalculează suma relevantă pentru grupul apartamentului
    let actualRelevantAmount = relevantAmount;

    if (receptionMode === 'per_stair' && apartment.stairId) {
      // Folosește suma specifică pentru scara apartamentului
      actualRelevantAmount = parseFloat(expense.amountsByStair?.[apartment.stairId] || 0);
    } else if (receptionMode === 'per_block' && apartment.stairId) {
      // Găsește blocul apartamentului și folosește suma specifică pentru bloc
      const apartmentStair = stairs?.find(s => s.id === apartment.stairId);
      if (apartmentStair?.blockId) {
        actualRelevantAmount = parseFloat(expense.amountsByBlock?.[apartmentStair.blockId] || 0);
      }
    }

    // CRUCIAL: Pentru cheltuieli "Pe scară" sau "Pe bloc", folosește DOAR apartamentele din grupul respectiv
    let allApartments = apartmentsInScope || getAssociationApartments();

    if (receptionMode === 'per_stair' && apartment.stairId) {
      // Filtrează doar apartamentele din aceeași scară
      allApartments = allApartments.filter(apt => apt.stairId === apartment.stairId);
    } else if (receptionMode === 'per_block' && apartment.stairId) {
      // Găsește blocul apartamentului și filtrează doar apartamentele din același bloc
      const apartmentStair = stairs?.find(s => s.id === apartment.stairId);
      if (apartmentStair?.blockId) {
        const blockStairs = stairs?.filter(s => s.blockId === apartmentStair.blockId) || [];
        const blockStairIds = blockStairs.map(s => s.id);
        allApartments = allApartments.filter(apt => blockStairIds.includes(apt.stairId));
      }
    }

    // PASUL 1: Identifică apartamentele participante (exclude cele excluse)
    const participatingApartments = allApartments.filter(apt => {
      const participation = config?.apartmentParticipation?.[apt.id];
      return participation?.type !== 'excluded';
    });

    // PASUL 2: Scade sumele fixe
    let totalFixedAmount = 0;
    participatingApartments.forEach(apt => {
      const participation = config?.apartmentParticipation?.[apt.id];
      if (participation?.type === 'fixed') {
        // Folosește setarea globală fixedAmountMode din config
        const fixedMode = config?.fixedAmountMode || 'apartment';
        if (fixedMode === 'person') {
          // Sumă fixă per persoană: înmulțește cu numărul de persoane
          totalFixedAmount += parseFloat(participation.value || 0) * (apt.persons || 0);
        } else {
          // Sumă fixă per apartament
          totalFixedAmount += parseFloat(participation.value || 0);
        }
      }
    });

    const amountToRedistribute = actualRelevantAmount - totalFixedAmount;

    // PASUL 3: Găsește apartamentele care participă la reponderare (nu sunt fixe/excluse)
    const apartmentsForReweighting = participatingApartments.filter(apt => {
      const participation = config?.apartmentParticipation?.[apt.id];
      return participation?.type !== 'fixed';
    });

    const totalPersons = apartmentsForReweighting.reduce((sum, apt) => sum + (apt.persons || 0), 0);

    // PASUL 4: Calculează suma de bază pentru apartamentul dat
    let baseAmount = 0;
    const participation = config?.apartmentParticipation?.[apartment.id];

    if (participation?.type === 'excluded') {
      return 0;
    }

    if (participation?.type === 'fixed') {
      // Folosește setarea globală fixedAmountMode din config
      const fixedMode = config?.fixedAmountMode || 'apartment';
      if (fixedMode === 'person') {
        // Sumă fixă per persoană: înmulțește cu numărul de persoane
        return parseFloat(participation.value || 0) * (apartment.persons || 0);
      } else {
        // Sumă fixă per apartament
        return parseFloat(participation.value || 0);
      }
    }

    // Calculează suma de bază conform tipului de distribuție
    switch (distributionType) {
      case 'apartment':
      case 'perApartament':
        baseAmount = amountToRedistribute / apartmentsForReweighting.length;
        break;

      case 'person':
      case 'perPerson':
        baseAmount = totalPersons > 0 ? (amountToRedistribute / totalPersons) * (apartment.persons || 0) : 0;
        break;

      default:
        return 0;
    }

    // PASUL 5: Aplică reponderarea pentru procente
    // Calculează greutățile pentru toți participanții
    let totalWeights = 0;
    const weights = {};

    apartmentsForReweighting.forEach(apt => {
      const aptParticipation = config?.apartmentParticipation?.[apt.id];
      let aptBaseAmount = 0;

      switch (distributionType) {
        case 'apartment':
        case 'perApartament':
          aptBaseAmount = amountToRedistribute / apartmentsForReweighting.length;
          break;
        case 'person':
        case 'perPerson':
          aptBaseAmount = totalPersons > 0 ? (amountToRedistribute / totalPersons) * (apt.persons || 0) : 0;
          break;
      }

      const percent = aptParticipation?.type === 'percentage' ? aptParticipation.value : 100;
      const multiplier = percent < 1 ? percent : (percent / 100);
      weights[apt.id] = aptBaseAmount * multiplier;
      totalWeights += weights[apt.id];
    });

    // Redistribuie proporțional
    if (totalWeights > 0 && weights[apartment.id] !== undefined) {
      return (weights[apartment.id] / totalWeights) * amountToRedistribute;
    }

    return baseAmount;
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
        // Pentru cheltuieli "Pe bloc" când filtrezi pe scară, calculează suma pentru acea scară
        const blockAmount = parseFloat(expense.amountsByBlock[filterInfo.blockId] || 0);
        const config = getExpenseConfig(expense.name);

        // Găsește toate apartamentele din scara selectată
        const allApts = getAssociationApartments();
        const stairApts = allApts.filter(apt => apt.stairId === filterInfo.stairId);

        // Găsește toate apartamentele din bloc pentru calcul corect
        const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
        const blockStairIds = blockStairs.map(s => s.id);
        const blockApts = allApts.filter(apt => blockStairIds.includes(apt.stairId));

        // Dacă blocul are o singură scară, suma pe bloc este implicit suma pe scară
        const blockHasOnlyOneStair = blockStairs.length === 1;
        if (blockHasOnlyOneStair && (config?.distributionType === 'consumption' || config?.distributionType === 'individual')) {
          return blockAmount;
        }

        // SPECIAL: Pentru cheltuieli pe CONSUM sau INDIVIDUAL cu multiple scări pe bloc, calculează suma din introduceri
        if (config?.distributionType === 'consumption' || config?.distributionType === 'individual') {
          let stairIntroducedAmount = 0;
          stairApts.forEach(apt => {
            const participation = config?.apartmentParticipation?.[apt.id];
            if (participation?.type !== 'excluded') {
              if (config.distributionType === 'consumption') {
                const consumption = parseFloat(expense.consumption?.[apt.id] || 0);
                stairIntroducedAmount += consumption * (expense.unitPrice || 0);
              } else if (config.distributionType === 'individual') {
                stairIntroducedAmount += parseFloat(expense.individualAmounts?.[apt.id] || 0);
              }
            }
          });
          return stairIntroducedAmount;
        }

        // Pentru celelalte tipuri (apartment, person), calculează suma totală pentru scara respectivă
        let stairTotalAmount = 0;
        stairApts.forEach(apt => {
          const participation = config?.apartmentParticipation?.[apt.id];
          if (participation?.type !== 'excluded') {
            stairTotalAmount += calculateApartmentAmount(expense, apt, blockAmount, blockApts);
          }
        });

        return stairTotalAmount;
      }
      if (receptionMode === 'total') {
        // Pentru cheltuieli "Pe asociație" când filtrezi pe scară, calculează suma pentru acea scară
        const config = getExpenseConfig(expense.name);
        const allApts = getAssociationApartments();
        const stairApts = allApts.filter(apt => apt.stairId === filterInfo.stairId);
        const totalAssociationAmount = expense.isUnitBased ? expense.billAmount : expense.amount;

        // SPECIAL: Pentru cheltuieli pe CONSUM sau INDIVIDUAL, calculează suma din introduceri, nu din distribuție
        if (config?.distributionType === 'consumption' || config?.distributionType === 'individual') {
          let stairIntroducedAmount = 0;
          stairApts.forEach(apt => {
            const participation = config?.apartmentParticipation?.[apt.id];
            if (participation?.type !== 'excluded') {
              if (config.distributionType === 'consumption') {
                const consumption = parseFloat(expense.consumption?.[apt.id] || 0);
                stairIntroducedAmount += consumption * (expense.unitPrice || 0);
              } else if (config.distributionType === 'individual') {
                stairIntroducedAmount += parseFloat(expense.individualAmounts?.[apt.id] || 0);
              }
            }
          });
          return stairIntroducedAmount;
        }

        // Pentru celelalte tipuri (apartment, person), calculează suma totală pentru scara respectivă
        let stairTotalAmount = 0;
        stairApts.forEach(apt => {
          const participation = config?.apartmentParticipation?.[apt.id];
          if (participation?.type !== 'excluded') {
            stairTotalAmount += calculateApartmentAmount(expense, apt, totalAssociationAmount, allApts);
          }
        });

        return stairTotalAmount;
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

  // Calculează totalurile introdus și așteptat pentru a afișa diferența
  const calculateTotals = () => {
    const filterInfo = getFilterInfo();
    let totalIntrodus = 0;
    let totalAsteptat = 0;
    let allKnowExpectedAmount = true;

    filteredExpenses.forEach(expense => {
      const config = getExpenseConfig(expense.name);

      // Mapează receptionMode
      let receptionMode = expense.receptionMode || 'total';
      if (expense.expenseEntryMode) {
        if (expense.expenseEntryMode === 'building') receptionMode = 'per_block';
        else if (expense.expenseEntryMode === 'staircase') receptionMode = 'per_stair';
        else if (expense.expenseEntryMode === 'total') receptionMode = 'total';
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
      const allApts = getAssociationApartments();
      const apartments = filterInfo.type === 'stair'
        ? allApts.filter(apt => apt.stairId === filterInfo.stairId)
        : allApts;

      const apartmentParticipations = config.apartmentParticipation || {};
      const nonExcludedApartments = apartments.filter(apt => {
        const participation = apartmentParticipations[apt.id];
        return participation?.type !== 'excluded';
      });

      let sumaIntrodusa = 0;
      if (config.distributionType === 'consumption' && expense.consumption) {
        nonExcludedApartments.forEach(apt => {
          sumaIntrodusa += parseFloat(expense.consumption[apt.id] || 0) * (expense.unitPrice || 0);
        });
      } else if (config.distributionType === 'individual' && expense.individualAmounts) {
        nonExcludedApartments.forEach(apt => {
          sumaIntrodusa += parseFloat(expense.individualAmounts[apt.id] || 0);
        });
      } else {
        // Pentru apartment/person, suma introdusă este egală cu suma așteptată (calculată)
        sumaIntrodusa = getRelevantAmount(expense);
      }

      totalIntrodus += sumaIntrodusa;

      // Calculează suma așteptată
      if (knowsExpectedAmount) {
        totalAsteptat += getRelevantAmount(expense);
      } else {
        allKnowExpectedAmount = false;
      }
    });

    return { totalIntrodus, totalAsteptat, allKnowExpectedAmount };
  };

  const totals = calculateTotals();

  // Calculează informații despre participare pentru o cheltuială
  const getParticipationInfo = (expense) => {
    const config = getExpenseConfig(expense.name);
    const allApartments = getAssociationApartments();

    // Filtrează apartamentele relevante pe baza tab-ului activ
    const filterInfo = getFilterInfo();
    let relevantApartments = allApartments;

    if (filterInfo.type === 'stair') {
      // Când filtrezi pe scară, arată ÎNTOTDEAUNA doar apartamentele din scara selectată
      // indiferent de modul de introducere al sumelor (per_block, per_stair, sau total)
      relevantApartments = allApartments.filter(apt => apt.stairId === filterInfo.stairId);
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

        // Calculează suma în RON pentru acest apartament folosind logica de reponderare
        const amountInRon = calculateApartmentAmount(expense, apt, relevantAmount, relevantApartments);

        // Calculează suma pentru un apartament integral din aceeași scară pentru comparație
        // Creează un apartament fictiv cu participare integrală pentru calcul
        const integralApartment = { ...apt };
        const integralAmount = calculateApartmentAmount(expense, integralApartment, relevantAmount, relevantApartments);

        partialParticipating.push({
          ...apt,
          participationPercent: parseFloat(percent) || 0,
          participationType: participation.type || 'percentage',
          amountInRon: amountInRon,
          integralAmount: integralAmount
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
            {filteredExpenses.length} {filteredExpenses.length === 1 ? 'cheltuială distribuită' : 'cheltuieli distribuite'}
            {getFilterInfo().type !== 'all' && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                ({getFilterInfo().blockName} - {getFilterInfo().stairName})
              </span>
            )}
          </h3>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {totalAmount.toFixed(2)} RON
          </div>
          <div className="text-sm text-gray-500">Total</div>

          {/* Diferența - doar dacă știm suma așteptată */}
          {totals.allKnowExpectedAmount ? (() => {
            const diferenta = totals.totalIntrodus - totals.totalAsteptat;
            const TOLERANCE = 0.20;
            const isDifferenceOk = Math.abs(diferenta) <= TOLERANCE;

            if (!isDifferenceOk) {
              return (
                <div className="mt-1 text-xs font-medium px-2 py-1 rounded bg-red-100 text-red-700">
                  ⚠ Diferență: {diferenta > 0 ? '+' : ''}{diferenta.toFixed(2)} RON
                </div>
              );
            }
            // Placeholder invizibil pentru aliniere
            return <div className="mt-1 h-6"></div>;
          })() : (
            // Placeholder invizibil când nu știm suma așteptată
            <div className="mt-1 h-6"></div>
          )}
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
                className="border border-gray-300 rounded-lg hover:border-indigo-400 transition-colors relative"
              >
                {/* Header - întotdeauna vizibil */}
                <div
                  className="p-3 bg-gradient-to-r from-blue-50 to-white cursor-pointer hover:from-blue-100 rounded-t-lg"
                  onClick={() => toggleExpense(expense.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Nume cheltuială */}
                      <div className="mb-2">
                        <h4
                          className="font-semibold text-base text-gray-900 px-2 py-1 -ml-2 rounded cursor-pointer transition-all hover:bg-indigo-50 hover:text-indigo-700 inline-block"
                          onClick={(e) => {
                            e.stopPropagation();
                            onConsumptionClick(expense.name);
                          }}
                          title="Click pentru a vedea consumurile cheltuielii"
                        >
                          {expense.name}
                        </h4>
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
                            {/* Badge completitudine */}
                            <div
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                isComplete
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}
                            >
                              {isComplete ? `✓ Consumuri introduse: ${apartmentsWithConsumption}/${totalApartments} apartamente` : `⚠ Consumuri introduse: ${apartmentsWithConsumption}/${totalApartments} apartamente`}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Badge status pentru sume individuale */}
                      {config.distributionType === 'individual' && (() => {
                        const filteredApartments = getFilteredApartments();

                        // Exclude apartamentele EXCLUSE din calcul
                        const apartmentParticipations = config.apartmentParticipation || {};
                        const nonExcludedApartments = filteredApartments.filter(apt => {
                          const participation = apartmentParticipations[apt.id];
                          return participation?.type !== 'excluded';
                        });

                        // Folosește DOAR datele din expense (nu merge cu pending)
                        const dataObject = expense.individualAmounts || {};

                        // Verifică pentru apartamentele filtrate (Toate sau scară specifică) NON-EXCLUSE
                        const apartmentsWithAmounts = nonExcludedApartments.filter(apt => {
                          const value = dataObject?.[apt.id];
                          return value && parseFloat(value) >= 0;
                        }).length;
                        const totalApartments = nonExcludedApartments.length;
                        const isComplete = apartmentsWithAmounts === totalApartments && totalApartments > 0;

                        return (
                          <div className="mt-2">
                            {/* Badge completitudine */}
                            <div
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                isComplete
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}
                            >
                              {isComplete ? `✓ Sume introduse: ${apartmentsWithAmounts}/${totalApartments} apartamente` : `⚠ Sume introduse: ${apartmentsWithAmounts}/${totalApartments} apartamente`}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Informații pe trei linii compacte */}
                      <div className="space-y-1 text-xs">
                        {/* Linia 1: Mod distribuție */}
                        <div className="flex items-center gap-3 text-gray-600">
                          <span className="font-medium">Distribuție:</span>
                          <span>
                            {config.distributionType === "apartment" && "Pe apartament (egal)"}
                            {config.distributionType === "person" && "Pe persoană"}
                            {config.distributionType === "consumption" && "Pe consum (mc/apartament)"}
                            {config.distributionType === "individual" && "Sume individuale (RON/apartament)"}
                          </span>
                        </div>

                        {/* Linia 2: Introducere sume */}
                        <div className="flex items-center gap-3 text-gray-600">
                          <span className="font-medium">Sume:</span>
                          {receptionMode === 'total' && <span>Pe asociație</span>}
                          {receptionMode === 'per_block' && <span>Pe bloc</span>}
                          {receptionMode === 'per_stair' && <span>Pe scară</span>}
                        </div>

                        {/* Linia 3: Participare */}
                        <div className="flex items-center gap-2 text-gray-600">
                          <span className="font-medium">Participare:</span>
                          <span className="text-blue-600 font-medium">
                            {participationInfo.totalParticipating}/{participationInfo.total} apartamente
                          </span>
                          {config.distributionType === 'person' && (() => {
                            // Calculează numărul total de persoane și persoanele participante (exclude doar cele excluse)
                            const allApts = getFilteredApartments();
                            let totalPersons = 0;
                            let participatingPersons = 0;

                            allApts.forEach(apt => {
                              const persons = apt.persons || 0;
                              totalPersons += persons;

                              const participation = config.apartmentParticipation?.[apt.id];

                              // Exclude: persoanele NU participă deloc
                              if (participation?.type === 'excluded') {
                                return;
                              }

                              // Toate celelalte persoane participă (integral, fixed, percentage)
                              participatingPersons += persons;
                            });

                            return (
                              <span className="text-blue-600 font-medium">
                                • {participatingPersons}/{totalPersons} persoane
                              </span>
                            );
                          })()}
                          {!participationInfo.allParticipate && (
                            <>
                              {participationInfo.notParticipating.length > 0 && (
                                <span className="text-red-600">
                                  • {participationInfo.notParticipating.length} {participationInfo.notParticipating.length === 1 ? 'apartament exclus' : 'apartamente excluse'}{config.distributionType === 'person' ? ` (${participationInfo.notParticipating.reduce((sum, apt) => sum + (apt.persons || 0), 0)} pers)` : ''}
                                </span>
                              )}
                              {participationInfo.partialParticipating.length > 0 && (
                                <span className="text-orange-600">
                                  • {participationInfo.partialParticipating.length} {participationInfo.partialParticipating.length === 1 ? 'apartament cu participare diferită' : 'apartamente cu participare diferită'}{config.distributionType === 'person' ? ` (${participationInfo.partialParticipating.reduce((sum, apt) => sum + (apt.persons || 0), 0)} pers)` : ''}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Partea dreaptă: Sumă + Warning-uri */}
                    <div className="flex flex-col items-end gap-1 min-w-[200px]">
                      {/* Sumă principală și mc */}
                      <div className="text-right">
                        <div className="text-xl font-bold text-blue-600">
                          {(() => {
                            // Determină dacă știi suma așteptată pentru scara filtrată
                            const filterInfo = getFilterInfo();
                            let knowsExpectedAmount = filterInfo.type === 'all';
                            if (!knowsExpectedAmount && filterInfo.type === 'stair') {
                              if (receptionMode === 'per_stair') {
                                knowsExpectedAmount = true;
                              } else if (receptionMode === 'per_block') {
                                const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
                                knowsExpectedAmount = blockStairs.length === 1;
                              }
                            }

                            // Dacă știi suma așteptată, afișează-o (cu fallback dacă e 0)
                            if (knowsExpectedAmount) {
                              // Fallback: dacă suma așteptată este 0, calculează din introduceri
                              if (relevantAmount === 0) {
                                const filteredApartments = getFilteredApartments();
                                const apartmentParticipations = config.apartmentParticipation || {};
                                const nonExcludedApartments = filteredApartments.filter(apt => {
                                  const participation = apartmentParticipations[apt.id];
                                  return participation?.type !== 'excluded';
                                });

                                let amountToDisplay = 0;
                                if (config.distributionType === 'consumption') {
                                  const dataObject = expense.consumption || {};
                                  let totalConsumption = 0;
                                  nonExcludedApartments.forEach(apt => {
                                    totalConsumption += parseFloat(dataObject[apt.id] || 0);
                                  });
                                  amountToDisplay = totalConsumption * (expense.unitPrice || 0);
                                } else if (config.distributionType === 'individual') {
                                  const dataObject = expense.individualAmounts || {};
                                  nonExcludedApartments.forEach(apt => {
                                    amountToDisplay += parseFloat(dataObject[apt.id] || 0);
                                  });
                                }
                                return `${amountToDisplay.toFixed(2)} RON`;
                              }
                              return `${relevantAmount.toFixed(2)} RON`;
                            }

                            // Dacă NU știi suma așteptată, afișează suma introdusă
                            const filteredApartments = getFilteredApartments();
                            const apartmentParticipations = config.apartmentParticipation || {};
                            const nonExcludedApartments = filteredApartments.filter(apt => {
                              const participation = apartmentParticipations[apt.id];
                              return participation?.type !== 'excluded';
                            });

                            let amountToDisplay = 0;
                            if (config.distributionType === 'consumption') {
                              const dataObject = expense.consumption || {};
                              let totalConsumption = 0;
                              nonExcludedApartments.forEach(apt => {
                                totalConsumption += parseFloat(dataObject[apt.id] || 0);
                              });
                              amountToDisplay = totalConsumption * (expense.unitPrice || 0);
                            } else if (config.distributionType === 'individual') {
                              const dataObject = expense.individualAmounts || {};
                              nonExcludedApartments.forEach(apt => {
                                amountToDisplay += parseFloat(dataObject[apt.id] || 0);
                              });
                            }

                            return `${amountToDisplay.toFixed(2)} RON`;
                          })()}
                        </div>
                        {/* Total mc + Preț unitar pe o singură linie */}
                        {config.distributionType === 'consumption' && expense.unitPrice && (() => {
                          const filteredApartments = getFilteredApartments();
                          const apartmentParticipations = config.apartmentParticipation || {};
                          const nonExcludedApartments = filteredApartments.filter(apt => {
                            const participation = apartmentParticipations[apt.id];
                            return participation?.type !== 'excluded';
                          });

                          const dataObject = expense.consumption || {};
                          let totalUnits = 0;
                          nonExcludedApartments.forEach(apt => {
                            totalUnits += parseFloat(dataObject[apt.id] || 0);
                          });

                          const unitLabel = getUnitLabel(expense.name);

                          return (
                            <div className="text-sm text-gray-600">
                              {totalUnits.toFixed(2)} {unitLabel} • {parseFloat(expense.unitPrice).toFixed(2)} RON/{unitLabel}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Warning-uri verticale pentru cheltuieli pe consum */}
                      {config.distributionType === 'consumption' && (() => {
                        const filteredApartments = getFilteredApartments();
                        const apartmentParticipations = config.apartmentParticipation || {};
                        const nonExcludedApartments = filteredApartments.filter(apt => {
                          const participation = apartmentParticipations[apt.id];
                          return participation?.type !== 'excluded';
                        });

                        const dataObject = expense.consumption || {};
                        let totalConsumption = 0;
                        nonExcludedApartments.forEach(apt => {
                          totalConsumption += parseFloat(dataObject[apt.id] || 0);
                        });

                        const totalIntrodus = totalConsumption * (expense.unitPrice || 0);

                        // Determină dacă știi suma așteptată pentru scara filtrată
                        const filterInfo = getFilterInfo();
                        let knowsExpectedAmount = filterInfo.type === 'all';
                        if (!knowsExpectedAmount && filterInfo.type === 'stair') {
                          if (receptionMode === 'per_stair') {
                            knowsExpectedAmount = true;
                          } else if (receptionMode === 'per_block') {
                            const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
                            knowsExpectedAmount = blockStairs.length === 1;
                          }
                        }

                        const diferenta = totalIntrodus - relevantAmount;
                        const TOLERANCE = 0.20;
                        const isDifferenceOk = Math.abs(diferenta) <= TOLERANCE;
                        const diferentaMessage = receptionMode === 'total' ? 'Diferență pe asociație' : 'Diferență pe bloc';

                        // Badge verde DOAR dacă: știi suma așteptată, diferența e ok ȘI ai introdus ceva (nu 0)
                        const shouldBeGreen = knowsExpectedAmount && isDifferenceOk && totalIntrodus > 0;

                        return (
                          <div className="flex flex-col items-end gap-1 mt-1">
                            {/* Total introdus */}
                            <div className={`text-xs font-medium px-2 py-1 rounded ${
                              shouldBeGreen ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {shouldBeGreen ? '✓ ' : '⚠ '}Total introdus: {totalIntrodus.toFixed(2)} RON
                            </div>

                            {/* Diferență */}
                            {knowsExpectedAmount ? (
                              // Știi suma așteptată - afișează diferența normală
                              !isDifferenceOk && (
                                <div className="text-xs font-medium px-2 py-1 rounded bg-red-100 text-red-700">
                                  ⚠ Diferență: {diferenta > 0 ? '+' : ''}{diferenta.toFixed(2)} RON {diferenta < 0 ? '(lipsesc)' : '(mai mult)'}
                                </div>
                              )
                            ) : (
                              // NU știi suma așteptată - afișează mesaj informativ în roșu
                              <div className="text-xs font-medium px-2 py-1 rounded bg-red-100 text-red-700">
                                ⚠ {diferentaMessage}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Warning-uri verticale pentru cheltuieli individuale */}
                      {config.distributionType === 'individual' && (() => {
                        const filteredApartments = getFilteredApartments();
                        const apartmentParticipations = config.apartmentParticipation || {};
                        const nonExcludedApartments = filteredApartments.filter(apt => {
                          const participation = apartmentParticipations[apt.id];
                          return participation?.type !== 'excluded';
                        });

                        const dataObject = expense.individualAmounts || {};
                        let totalIntrodus = 0;
                        nonExcludedApartments.forEach(apt => {
                          totalIntrodus += parseFloat(dataObject[apt.id] || 0);
                        });

                        // Determină dacă știi suma așteptată pentru scara filtrată
                        const filterInfo = getFilterInfo();
                        let knowsExpectedAmount = filterInfo.type === 'all';
                        if (!knowsExpectedAmount && filterInfo.type === 'stair') {
                          if (receptionMode === 'per_stair') {
                            knowsExpectedAmount = true;
                          } else if (receptionMode === 'per_block') {
                            const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
                            knowsExpectedAmount = blockStairs.length === 1;
                          }
                        }

                        const diferenta = totalIntrodus - relevantAmount;
                        const TOLERANCE = 0.20;
                        const isDifferenceOk = Math.abs(diferenta) <= TOLERANCE;
                        const diferentaMessage = receptionMode === 'total' ? 'Diferență pe asociație' : 'Diferență pe bloc';

                        // Badge verde DOAR dacă: știi suma așteptată, diferența e ok ȘI ai introdus ceva (nu 0)
                        const shouldBeGreen = knowsExpectedAmount && isDifferenceOk && totalIntrodus > 0;

                        return (
                          <div className="flex flex-col items-end gap-1 mt-1">
                            {/* Total introdus */}
                            <div className={`text-xs font-medium px-2 py-1 rounded ${
                              shouldBeGreen ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {shouldBeGreen ? '✓ ' : '⚠ '}Total introdus: {totalIntrodus.toFixed(2)} RON
                            </div>

                            {/* Diferență */}
                            {knowsExpectedAmount ? (
                              // Știi suma așteptată - afișează diferența normală
                              !isDifferenceOk && (
                                <div className="text-xs font-medium px-2 py-1 rounded bg-red-100 text-red-700">
                                  ⚠ Diferență: {diferenta > 0 ? '+' : ''}{diferenta.toFixed(2)} RON {diferenta < 0 ? '(lipsesc)' : '(mai mult)'}
                                </div>
                              )
                            ) : (
                              // NU știi suma așteptată - afișează mesaj informativ în roșu
                              <div className="text-xs font-medium px-2 py-1 rounded bg-red-100 text-red-700">
                                ⚠ {diferentaMessage}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Chevron și meniu acțiuni */}
                    <div className="flex-shrink-0 pt-1 flex items-center gap-2">
                      {/* Chevron pentru expand/collapse */}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}

                      {/* Meniu acțiuni (trei puncte verticale) - doar dacă nu este read-only */}
                      {!isMonthReadOnly && (onEditExpense || handleDeleteMonthlyExpense) && (
                        <div className="relative" ref={(el) => dropdownRefs.current[expense.id] = el}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdown(openDropdown === expense.id ? null : expense.id);
                            }}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Acțiuni"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-600" />
                          </button>

                          {/* Dropdown meniu */}
                          {openDropdown === expense.id && (
                            <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[100]">
                              {onEditExpense && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdown(null);
                                    onEditExpense(expense);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 whitespace-nowrap"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  Editează distribuirea
                                </button>
                              )}
                              {onConfigureExpense && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdown(null);
                                    onConfigureExpense(expense.name);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 whitespace-nowrap"
                                >
                                  <Settings className="w-4 h-4" />
                                  Configurează cheltuiala
                                </button>
                              )}
                              {handleDeleteMonthlyExpense && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdown(null);
                                    if (window.confirm(`Sigur vrei să ștergi distribuirea pentru "${expense.name}"?`)) {
                                      handleDeleteMonthlyExpense(expense.id);
                                    }
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 whitespace-nowrap"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Șterge distribuirea
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Detalii expandabile */}
                {isExpanded && (
                  <div className="p-4 bg-white border-t border-gray-200 space-y-4 rounded-b-lg">
                    {/* Card detalii pentru cheltuieli pe asociație (receptionMode === 'total') */}
                    {receptionMode === 'total' && getFilterInfo().type === 'all' && (
                      <div>
                        <h5 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <BarChart className="w-5 h-5" />
                          Detalii distribuție:
                        </h5>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {(() => {
                            const allApts = getAssociationApartments();

                            // Calculează câte apartamente participă efectiv
                            const participatingApts = allApts.filter(apt => {
                              const p = config.apartmentParticipation?.[apt.id];
                              return !p || p.type === 'integral' || p === 1 || p === 100;
                            });
                            const partialApts = allApts.filter(apt => {
                              const p = config.apartmentParticipation?.[apt.id];
                              return p && (p.type === 'percentage' || p.type === 'fixed' || (typeof p === 'number' && p > 0 && p < 1));
                            });
                            const excludedApts = allApts.filter(apt => {
                              const p = config.apartmentParticipation?.[apt.id];
                              return p && p.type === 'excluded';
                            });

                            // Calculează persoanele din asociație (total și participante)
                            let totalPersons = 0;
                            let participatingPersons = 0;
                            allApts.forEach(apt => {
                              const persons = apt.persons || 0;
                              totalPersons += persons;

                              const participation = config.apartmentParticipation?.[apt.id];
                              if (participation?.type === 'excluded') {
                                return;
                              }
                              participatingPersons += persons;
                            });

                            // Calculează suma integrală
                            let integralAmount = 0;
                            if (participatingApts.length > 0) {
                              const sampleIntegralApt = participatingApts[0];
                              integralAmount = calculateApartmentAmount(expense, sampleIntegralApt, relevantAmount, allApts);

                              if (config.distributionType === 'person' && sampleIntegralApt.persons > 0) {
                                integralAmount = integralAmount / sampleIntegralApt.persons;
                              }
                            }

                            // Calculează sumele pentru apartamentele parțiale
                            const partialAptsWithAmounts = partialApts.map(apt => {
                              const p = config.apartmentParticipation?.[apt.id];
                              const amountInRon = calculateApartmentAmount(expense, apt, relevantAmount, allApts);
                              return {
                                ...apt,
                                participationType: p.type,
                                participationValue: p.value,
                                amountInRon
                              };
                            });

                            // Calculează numărul de persoane cu participare integrală
                            const integralPersons = participatingApts.reduce((sum, apt) => sum + (apt.persons || 0), 0);

                            // Calculează totalul unităților pentru consum (Pe asociație)
                            let totalConsumptionUnitsAssoc = 0;
                            if (config.distributionType === 'consumption' && expense.consumption) {
                              allApts.forEach(apt => {
                                const participation = config.apartmentParticipation?.[apt.id];
                                if (participation?.type !== 'excluded') {
                                  totalConsumptionUnitsAssoc += parseFloat(expense.consumption[apt.id] || 0);
                                }
                              });
                            }

                            // Calculează totalul introdus pentru consumption și individual (Pe asociație)
                            let totalIntrodusForAssoc = 0;
                            if (config.distributionType === 'consumption' && expense.consumption) {
                              allApts.forEach(apt => {
                                const participation = config.apartmentParticipation?.[apt.id];
                                if (participation?.type !== 'excluded') {
                                  totalIntrodusForAssoc += parseFloat(expense.consumption[apt.id] || 0) * (expense.unitPrice || 0);
                                }
                              });
                            } else if (config.distributionType === 'individual' && expense.individualAmounts) {
                              allApts.forEach(apt => {
                                const participation = config.apartmentParticipation?.[apt.id];
                                if (participation?.type !== 'excluded') {
                                  totalIntrodusForAssoc += parseFloat(expense.individualAmounts[apt.id] || 0);
                                }
                              });
                            }

                            return (
                              <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                                <div className="font-medium text-indigo-900">Pe asociație</div>
                                <div className="text-xl font-bold text-indigo-700">{relevantAmount.toFixed(2)} RON</div>

                                {/* Total introdus și diferență - pentru CONSUM și INDIVIDUAL */}
                                {(config.distributionType === 'consumption' || config.distributionType === 'individual') && (() => {
                                  const diferenta = totalIntrodusForAssoc - relevantAmount;
                                  const TOLERANCE = 0.20;
                                  const isDifferenceOk = Math.abs(diferenta) <= TOLERANCE;

                                  return (
                                    <>
                                      <div className="text-xs text-blue-600 font-semibold mt-1">
                                        Total introdus: {totalIntrodusForAssoc.toFixed(2)} RON
                                      </div>
                                      {!isDifferenceOk && (
                                        <div className="text-xs text-red-600 font-semibold mt-0.5">
                                          ⚠ Diferență: {diferenta > 0 ? '+' : ''}{diferenta.toFixed(2)} RON
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}

                                {/* Sub sumă - pentru apartment/person */}
                                {integralAmount > 0 && config.distributionType !== 'consumption' && config.distributionType !== 'individual' && (
                                  <div className="text-xs text-green-700 font-semibold mt-1">
                                    {integralAmount.toFixed(2)} {config.distributionType === 'person' ? `RON/persoană (${integralPersons} pers)` : 'RON/apartament'}
                                  </div>
                                )}

                                {/* Sub sumă - DOAR pentru CONSUM */}
                                {config.distributionType === 'consumption' && expense.unitPrice && (
                                  <>
                                    <div className="text-xs text-green-700 font-semibold mt-1">
                                      {totalConsumptionUnitsAssoc.toFixed(2)} {getUnitLabel(expense.name)} introduși
                                    </div>
                                    <div className="text-xs text-green-700 font-semibold">
                                      {expense.unitPrice.toFixed(2)} RON/{getUnitLabel(expense.name)}
                                    </div>
                                  </>
                                )}

                                <div className="text-xs text-indigo-500 mt-1">
                                  {participatingApts.length + partialApts.length}/{allApts.length} apartamente
                                  {config.distributionType === 'person' && totalPersons > 0 && (
                                    <span className="text-blue-600 font-medium">
                                      {' • '}{participatingPersons}/{totalPersons} {totalPersons === 1 ? 'persoană' : 'persoane'}
                                    </span>
                                  )}
                                </div>

                                {/* Apartamente excluse */}
                                {excludedApts.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-indigo-300">
                                    <div className="text-xs font-medium text-red-700 mb-1">
                                      {excludedApts.length} {excludedApts.length === 1 ? 'apartament exclus' : 'apartamente excluse'}{config.distributionType === 'person' ? ` (${excludedApts.reduce((sum, apt) => sum + (apt.persons || 0), 0)} ${excludedApts.reduce((sum, apt) => sum + (apt.persons || 0), 0) === 1 ? 'pers' : 'pers'})` : ''}:
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {excludedApts.map(apt => (
                                        <span key={apt.id} className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded text-xs font-semibold">
                                          Ap. {apt.number}{config.distributionType === 'person' ? ` (${apt.persons || 0} pers)` : ''}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Apartamente incomplete și diferență (numai pentru individual) */}
                                {config.distributionType === 'individual' && (() => {
                                  const dataObject = expense.individualAmounts || {};
                                  const nonExcludedApts = allApts.filter(apt => {
                                    const participation = config.apartmentParticipation?.[apt.id];
                                    return participation?.type !== 'excluded';
                                  });

                                  // Calculează apartamente incomplete
                                  const incompleteApts = nonExcludedApts.filter(apt => {
                                    const value = dataObject?.[apt.id];
                                    return !value || parseFloat(value) < 0;
                                  });

                                  // Calculează diferența
                                  let totalIntrodus = 0;
                                  nonExcludedApts.forEach(apt => {
                                    totalIntrodus += parseFloat(dataObject[apt.id] || 0);
                                  });
                                  const diferenta = totalIntrodus - relevantAmount;
                                  const TOLERANCE = 0.20;
                                  const isDifferenceOk = Math.abs(diferenta) <= TOLERANCE;

                                  // Afișează separator și conținut doar dacă există apartamente incomplete SAU diferență
                                  const hasIssues = incompleteApts.length > 0 || !isDifferenceOk;

                                  return (
                                    <>
                                      {hasIssues && (
                                        <div className="mt-2 pt-2 border-t border-indigo-300">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            {/* Badge 1: Apartamente incomplete */}
                                            {incompleteApts.length > 0 && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onConsumptionClick(expense.name);
                                                }}
                                                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium hover:opacity-90 cursor-pointer transition-colors bg-orange-100 text-orange-700"
                                                title="Click pentru a completa sumele lipsă"
                                              >
                                                ⚠ {incompleteApts.length} {incompleteApts.length === 1 ? 'apartament necompletat' : 'apartamente necompletate'}
                                              </button>
                                            )}

                                            {/* Badge 2: Total introdus */}
                                            <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                              isDifferenceOk
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                            }`}>
                                              {!isDifferenceOk && '⚠ '}Total introdus: <span className="font-semibold ml-1">{totalIntrodus.toFixed(2)} RON</span>
                                            </div>

                                            {/* Badge 3: Diferență */}
                                            {!isDifferenceOk && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onConsumptionClick(expense.name);
                                                }}
                                                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium hover:opacity-90 cursor-pointer transition-colors bg-red-100 text-red-700"
                                                title="Click pentru a corecta diferența"
                                              >
                                                ⚠ Diferență: {diferenta > 0 ? '+' : ''}{diferenta.toFixed(2)} RON {diferenta < 0 ? '(lipsesc)' : '(mai mult)'}
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}

                                {/* Apartamente cu participare parțială */}
                                {partialAptsWithAmounts.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-indigo-300">
                                    <div className="text-xs font-medium text-orange-700 mb-1">
                                      {partialAptsWithAmounts.length} {partialAptsWithAmounts.length === 1 ? 'apartament cu participare diferită' : 'apartamente cu participare diferită'}{config.distributionType === 'person' ? ` (${partialAptsWithAmounts.reduce((sum, apt) => sum + (apt.persons || 0), 0)} pers)` : ''}:
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {partialAptsWithAmounts.map(apt => {
                                        let displayText;
                                        if (apt.participationType === 'fixed') {
                                          const fixedMode = config.fixedAmountMode || 'apartment';
                                          if (fixedMode === 'person' && apt.persons > 0) {
                                            const amountPerPerson = apt.amountInRon / apt.persons;
                                            displayText = `${amountPerPerson.toFixed(2)} RON fix/pers`;
                                          } else {
                                            displayText = `${apt.amountInRon.toFixed(2)} RON fix/ap.`;
                                          }
                                        } else if (config.distributionType === 'person' && apt.participationType === 'percentage' && apt.persons > 0) {
                                          const amountPerPerson = apt.amountInRon / apt.persons;
                                          displayText = `${apt.participationValue}%: ${amountPerPerson.toFixed(2)} RON/pers`;
                                        } else {
                                          displayText = `${apt.participationValue}%: ${apt.amountInRon.toFixed(2)} RON`;
                                        }

                                        return (
                                          <span key={apt.id} className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded text-xs">
                                            <span className="font-semibold">Ap. {apt.number}</span>{config.distributionType === 'person' ? ` (${apt.persons || 0} pers)` : ''} ({displayText})
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Card detalii pentru scară specifică când suma e pe asociație */}
                    {receptionMode === 'total' && getFilterInfo().type === 'stair' && (
                      <div>
                        <h5 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <BarChart className="w-5 h-5" />
                          Detalii pentru {getFilterInfo().blockName} - {getFilterInfo().stairName}:
                        </h5>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {(() => {
                            const filterInfo = getFilterInfo();
                            const allApts = getAssociationApartments();
                            const stairApts = allApts.filter(apt => apt.stairId === filterInfo.stairId);

                            // Calculează suma pentru scara curentă
                            let stairAmount = 0;
                            stairApts.forEach(apt => {
                              const participation = config.apartmentParticipation?.[apt.id];
                              if (participation?.type !== 'excluded') {
                                // Pentru receptionMode 'total', folosește toată asociația pentru calcul
                                const totalAssociationAmount = expense.isUnitBased ? expense.billAmount : expense.amount;
                                stairAmount += calculateApartmentAmount(expense, apt, totalAssociationAmount, allApts);
                              }
                            });

                            // Calculează câte apartamente participă efectiv
                            const participatingApts = stairApts.filter(apt => {
                              const p = config.apartmentParticipation?.[apt.id];
                              return !p || p.type === 'integral' || p === 1 || p === 100;
                            });
                            const partialApts = stairApts.filter(apt => {
                              const p = config.apartmentParticipation?.[apt.id];
                              return p && (p.type === 'percentage' || p.type === 'fixed' || (typeof p === 'number' && p > 0 && p < 1));
                            });
                            const excludedApts = stairApts.filter(apt => {
                              const p = config.apartmentParticipation?.[apt.id];
                              return p && p.type === 'excluded';
                            });

                            // Calculează persoanele din scară
                            let totalStairPersons = 0;
                            let participatingStairPersons = 0;
                            stairApts.forEach(apt => {
                              const persons = apt.persons || 0;
                              totalStairPersons += persons;

                              const participation = config.apartmentParticipation?.[apt.id];
                              if (participation?.type === 'excluded') {
                                return;
                              }
                              participatingStairPersons += persons;
                            });

                            // Calculează suma integrală pentru această scară
                            let integralAmountForStair = 0;
                            if (participatingApts.length > 0) {
                              const sampleIntegralApt = participatingApts[0];

                              // Folosește apartamentele corecte pentru calcul în funcție de reception mode
                              let apartmentsForCalculation = stairApts;
                              if (receptionMode === 'per_block' && filterInfo.blockId) {
                                // Pentru per_block, folosește toate apartamentele din bloc
                                const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
                                const blockStairIds = blockStairs.map(s => s.id);
                                apartmentsForCalculation = allApts.filter(apt => blockStairIds.includes(apt.stairId));
                              }

                              integralAmountForStair = calculateApartmentAmount(expense, sampleIntegralApt, stairAmount, apartmentsForCalculation);

                              if (config.distributionType === 'person' && sampleIntegralApt.persons > 0) {
                                integralAmountForStair = integralAmountForStair / sampleIntegralApt.persons;
                              }
                            }

                            // Calculează sumele pentru apartamentele parțiale
                            let apartmentsForCalculation = stairApts;
                            if (receptionMode === 'per_block' && filterInfo.blockId) {
                              const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
                              const blockStairIds = blockStairs.map(s => s.id);
                              apartmentsForCalculation = allApts.filter(apt => blockStairIds.includes(apt.stairId));
                            }

                            const partialAptsWithAmounts = partialApts.map(apt => {
                              const p = config.apartmentParticipation?.[apt.id];
                              const amountInRon = calculateApartmentAmount(expense, apt, stairAmount, apartmentsForCalculation);
                              return {
                                ...apt,
                                participationType: p.type,
                                participationValue: p.value,
                                amountInRon
                              };
                            });

                            // Calculează numărul de persoane cu participare integrală
                            const integralPersonsForStair = participatingApts.reduce((sum, apt) => sum + (apt.persons || 0), 0);

                            // Calculează suma să afișeze INTRODUSĂ pentru consum/individual
                            const amountToDisplay = (() => {
                              if (config.distributionType === 'consumption' && expense.consumption) {
                                let totalConsumption = 0;
                                stairApts.forEach(apt => {
                                  const participation = config.apartmentParticipation?.[apt.id];
                                  if (participation?.type !== 'excluded') {
                                    totalConsumption += parseFloat(expense.consumption[apt.id] || 0);
                                  }
                                });
                                return totalConsumption * (expense.unitPrice || 0);
                              }

                              if (config.distributionType === 'individual' && expense.individualAmounts) {
                                let totalIndividual = 0;
                                stairApts.forEach(apt => {
                                  const participation = config.apartmentParticipation?.[apt.id];
                                  if (participation?.type !== 'excluded') {
                                    totalIndividual += parseFloat(expense.individualAmounts[apt.id] || 0);
                                  }
                                });
                                return totalIndividual;
                              }

                              return stairAmount; // Pentru apartment/person
                            })();

                            // Calculează totalul unităților pentru consum
                            let totalConsumptionUnits = 0;
                            if (config.distributionType === 'consumption' && expense.consumption) {
                              stairApts.forEach(apt => {
                                const participation = config.apartmentParticipation?.[apt.id];
                                if (participation?.type !== 'excluded') {
                                  totalConsumptionUnits += parseFloat(expense.consumption[apt.id] || 0);
                                }
                              });
                            }

                            return (
                              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                <div className="font-medium text-purple-900">{filterInfo.blockName} - {filterInfo.stairName}</div>
                                {/* Pentru consumption/individual, afișăm suma introdusă; pentru apartment/person, suma calculată */}
                                <div className="text-xl font-bold text-purple-700">
                                  {(config.distributionType === 'consumption' || config.distributionType === 'individual')
                                    ? amountToDisplay.toFixed(2)
                                    : stairAmount.toFixed(2)} RON
                                </div>

                                {/* Total introdus - pentru CONSUM și INDIVIDUAL */}
                                {(config.distributionType === 'consumption' || config.distributionType === 'individual') && (
                                  <div className="text-xs text-blue-600 font-semibold mt-1">
                                    Total introdus: {amountToDisplay.toFixed(2)} RON
                                  </div>
                                )}

                                {/* Sub sumă - DOAR pentru CONSUM */}
                                {config.distributionType === 'consumption' && expense.unitPrice && (
                                  <>
                                    <div className="text-xs text-green-700 font-semibold mt-1">
                                      {totalConsumptionUnits.toFixed(2)} {getUnitLabel(expense.name)} introduși
                                    </div>
                                    <div className="text-xs text-green-700 font-semibold">
                                      {expense.unitPrice.toFixed(2)} RON/{getUnitLabel(expense.name)}
                                    </div>
                                  </>
                                )}

                                {/* Pentru apartment/person - afișează suma per apartament/persoană */}
                                {integralAmountForStair > 0 && config.distributionType !== 'consumption' && config.distributionType !== 'individual' && (
                                  <div className="text-xs text-green-700 font-semibold mt-1">
                                    {integralAmountForStair.toFixed(2)} {config.distributionType === 'person' ? `RON/persoană (${integralPersonsForStair} pers)` : 'RON/apartament'}
                                  </div>
                                )}
                                <div className="text-xs text-blue-600 mt-1">
                                  {participatingApts.length + partialApts.length}/{stairApts.length} apartamente
                                  {config.distributionType === 'person' && totalStairPersons > 0 && (
                                    <span className="text-purple-700 font-medium">
                                      {' • '}{participatingStairPersons}/{totalStairPersons} {totalStairPersons === 1 ? 'persoană' : 'persoane'}
                                    </span>
                                  )}
                                </div>

                                {/* Apartamente excluse */}
                                {excludedApts.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-purple-300">
                                    <div className="text-xs font-medium text-red-700 mb-2">
                                      {excludedApts.length} {excludedApts.length === 1 ? 'apartament exclus' : 'apartamente excluse'}{config.distributionType === 'person' ? ` (${excludedApts.reduce((sum, apt) => sum + (apt.persons || 0), 0)} ${excludedApts.reduce((sum, apt) => sum + (apt.persons || 0), 0) === 1 ? 'pers' : 'pers'})` : ''}:
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {excludedApts.map(apt => (
                                        <span key={apt.id} className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded text-xs font-semibold">
                                          Ap. {apt.number}{config.distributionType === 'person' ? ` (${apt.persons || 0} pers)` : ''}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Apartamente incomplete și diferență (numai pentru individual) */}
                                {config.distributionType === 'individual' && (() => {
                                  const dataObject = expense.individualAmounts || {};
                                  const nonExcludedStairApts = stairApts.filter(apt => {
                                    const participation = config.apartmentParticipation?.[apt.id];
                                    return participation?.type !== 'excluded';
                                  });

                                  // Calculează apartamente incomplete pentru această scară
                                  const incompleteApts = nonExcludedStairApts.filter(apt => {
                                    const value = dataObject?.[apt.id];
                                    return !value || parseFloat(value) < 0;
                                  });

                                  // Calculează diferența pentru această scară
                                  let totalIntrodusStair = 0;
                                  nonExcludedStairApts.forEach(apt => {
                                    totalIntrodusStair += parseFloat(dataObject[apt.id] || 0);
                                  });
                                  const diferentaStair = totalIntrodusStair - stairAmount;
                                  const TOLERANCE = 0.20;
                                  const isDifferenceOk = Math.abs(diferentaStair) <= TOLERANCE;

                                  // Afișează separator și conținut doar dacă există apartamente incomplete SAU diferență
                                  const hasIssues = incompleteApts.length > 0 || !isDifferenceOk;

                                  return (
                                    <>
                                      {hasIssues && (
                                        <div className="mt-3 pt-3 border-t border-purple-300">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            {/* Badge 1: Apartamente incomplete */}
                                            {incompleteApts.length > 0 && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onConsumptionClick(expense.name, filterInfo.stairId);
                                                }}
                                                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium hover:opacity-90 cursor-pointer transition-colors bg-orange-100 text-orange-700"
                                                title="Click pentru a completa sumele lipsă"
                                              >
                                                ⚠ {incompleteApts.length} {incompleteApts.length === 1 ? 'apartament necompletat' : 'apartamente necompletate'}
                                              </button>
                                            )}

                                            {/* Badge 2: Total introdus */}
                                            <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                              isDifferenceOk
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                            }`}>
                                              {!isDifferenceOk && '⚠ '}Total introdus: <span className="font-semibold ml-1">{totalIntrodusStair.toFixed(2)} RON</span>
                                            </div>

                                            {/* Badge 3: Diferență - pentru sume pe asociație afișează mesaj generic */}
                                            {!isDifferenceOk && (
                                              <div className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">
                                                ⚠ Diferență pe asociație
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}

                                {/* Apartamente cu participare parțială */}
                                {partialAptsWithAmounts.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-purple-300">
                                    <div className="text-xs font-medium text-orange-700 mb-2">
                                      {partialAptsWithAmounts.length} {partialAptsWithAmounts.length === 1 ? 'apartament cu participare diferită' : 'apartamente cu participare diferită'}{config.distributionType === 'person' ? ` (${partialAptsWithAmounts.reduce((sum, apt) => sum + (apt.persons || 0), 0)} pers)` : ''}:
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {partialAptsWithAmounts.map(apt => {
                                        let displayText;
                                        if (apt.participationType === 'fixed') {
                                          const fixedMode = config.fixedAmountMode || 'apartment';
                                          if (fixedMode === 'person' && apt.persons > 0) {
                                            const amountPerPerson = apt.amountInRon / apt.persons;
                                            displayText = `${amountPerPerson.toFixed(2)} RON fix/pers`;
                                          } else {
                                            displayText = `${apt.amountInRon.toFixed(2)} RON fix/ap.`;
                                          }
                                        } else if (config.distributionType === 'person' && apt.participationType === 'percentage' && apt.persons > 0) {
                                          const amountPerPerson = apt.amountInRon / apt.persons;
                                          displayText = `${apt.participationValue}%: ${amountPerPerson.toFixed(2)} RON/pers`;
                                        } else {
                                          displayText = `${apt.participationValue}%: ${apt.amountInRon.toFixed(2)} RON`;
                                        }

                                        return (
                                          <span key={apt.id} className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded text-xs">
                                            <span className="font-semibold">Ap. {apt.number}</span>{config.distributionType === 'person' ? ` (${apt.persons || 0} pers)` : ''} ({displayText})
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Defalcare pe blocuri/scări - afișează carduri în grid */}
                    {receptionMode !== 'total' && (
                      <div>
                        <h5 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <BarChart className="w-5 h-5" />
                          {getFilterInfo().type === 'stair' ? (
                            <>Detalii pentru {getFilterInfo().blockName} - {getFilterInfo().stairName}:</>
                          ) : (
                            <>Defalcare pe {receptionMode === 'per_block' ? (
                              <><span>blocuri</span> <Building2 className="w-4 h-4 inline" /></>
                            ) : (
                              <><span>scări</span> <Layers className="w-4 h-4 inline" /></>
                            )}:</>
                          )}
                        </h5>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {receptionMode === 'per_block' && expense.amountsByBlock && blocks && getFilterInfo().type === 'all' && (
                            blocks.map(block => {
                              const blockAmount = parseFloat(expense.amountsByBlock[block.id] || 0);
                              if (blockAmount === 0) return null;
                              const blockStairs = stairs?.filter(s => s.blockId === block.id) || [];
                              const blockApts = getAssociationApartments().filter(apt => {
                                return blockStairs.some(s => s.id === apt.stairId);
                              });
                              // Calculează persoanele din bloc (total și participante - exclude doar cele excluse)
                              let totalBlockPersons = 0;
                              let participatingBlockPersons = 0;
                              blockApts.forEach(apt => {
                                const persons = apt.persons || 0;
                                totalBlockPersons += persons;

                                const participation = config.apartmentParticipation?.[apt.id];

                                // Exclude: persoanele NU participă deloc
                                if (participation?.type === 'excluded') {
                                  return;
                                }

                                // Toate celelalte persoane participă (integral, fixed, percentage)
                                participatingBlockPersons += persons;
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
                              const excludedApts = blockApts.filter(apt => {
                                const p = config.apartmentParticipation?.[apt.id];
                                return p && p.type === 'excluded';
                              });

                              // Calculează suma integrală pentru acest bloc
                              let integralAmountForBlock = 0;
                              if (participatingApts.length > 0) {
                                // Pentru distribuție pe persoană: calculează suma pentru O PERSOANĂ integrală
                                // Pentru distribuție pe apartament: calculează suma pentru UN APARTAMENT integral
                                const sampleIntegralApt = participatingApts[0];
                                integralAmountForBlock = calculateApartmentAmount(expense, sampleIntegralApt, blockAmount, blockApts);

                                // Dacă e distribuție pe persoană, împarte suma apartamentului la numărul de persoane
                                if (config.distributionType === 'person' && sampleIntegralApt.persons > 0) {
                                  integralAmountForBlock = integralAmountForBlock / sampleIntegralApt.persons;
                                }
                              }

                              // Calculează sumele pentru apartamentele parțiale
                              const partialAptsWithAmounts = partialApts.map(apt => {
                                const p = config.apartmentParticipation?.[apt.id];
                                const amountInRon = calculateApartmentAmount(expense, apt, blockAmount, blockApts);
                                return {
                                  ...apt,
                                  participationType: p.type,
                                  participationValue: p.value,
                                  amountInRon
                                };
                              });

                              // Calculează numărul de persoane cu participare integrală pentru acest bloc
                              const integralPersonsForBlock = participatingApts.reduce((sum, apt) => sum + (apt.persons || 0), 0);

                              // Calculează totalul unităților pentru consum (Pe bloc)
                              let totalConsumptionUnitsBlock = 0;
                              if (config.distributionType === 'consumption' && expense.consumption) {
                                blockApts.forEach(apt => {
                                  const participation = config.apartmentParticipation?.[apt.id];
                                  if (participation?.type !== 'excluded') {
                                    totalConsumptionUnitsBlock += parseFloat(expense.consumption[apt.id] || 0);
                                  }
                                });
                              }

                              // Calculează totalul introdus pentru consumption și individual
                              let totalIntrodusForBlock = 0;
                              if (config.distributionType === 'consumption' && expense.consumption) {
                                blockApts.forEach(apt => {
                                  const participation = config.apartmentParticipation?.[apt.id];
                                  if (participation?.type !== 'excluded') {
                                    totalIntrodusForBlock += parseFloat(expense.consumption[apt.id] || 0) * (expense.unitPrice || 0);
                                  }
                                });
                              } else if (config.distributionType === 'individual' && expense.individualAmounts) {
                                blockApts.forEach(apt => {
                                  const participation = config.apartmentParticipation?.[apt.id];
                                  if (participation?.type !== 'excluded') {
                                    totalIntrodusForBlock += parseFloat(expense.individualAmounts[apt.id] || 0);
                                  }
                                });
                              }

                              return (
                                <div key={block.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="font-medium text-blue-900">{block.name}</div>
                                  <div className="text-xl font-bold text-blue-700">{blockAmount.toFixed(2)} RON</div>

                                  {/* Total introdus și diferență - pentru CONSUM și INDIVIDUAL */}
                                  {(config.distributionType === 'consumption' || config.distributionType === 'individual') && (() => {
                                    const diferenta = totalIntrodusForBlock - blockAmount;
                                    const TOLERANCE = 0.20;
                                    const isDifferenceOk = Math.abs(diferenta) <= TOLERANCE;

                                    return (
                                      <>
                                        <div className="text-xs text-blue-600 font-semibold mt-1">
                                          Total introdus: {totalIntrodusForBlock.toFixed(2)} RON
                                        </div>
                                        {!isDifferenceOk && (
                                          <div className="text-xs text-red-600 font-semibold mt-0.5">
                                            ⚠ Diferență: {diferenta > 0 ? '+' : ''}{diferenta.toFixed(2)} RON
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}

                                  {/* Sub sumă - pentru apartment/person */}
                                  {integralAmountForBlock > 0 && config.distributionType !== 'consumption' && config.distributionType !== 'individual' && (
                                    <div className="text-xs text-green-700 font-semibold mt-1">
                                      {integralAmountForBlock.toFixed(2)} {config.distributionType === 'person' ? `RON/persoană (${integralPersonsForBlock} pers)` : 'RON/apartament'}
                                    </div>
                                  )}

                                  {/* Sub sumă - DOAR pentru CONSUM */}
                                  {config.distributionType === 'consumption' && expense.unitPrice && (
                                    <>
                                      <div className="text-xs text-green-700 font-semibold mt-1">
                                        {totalConsumptionUnitsBlock.toFixed(2)} {getUnitLabel(expense.name)} introduși
                                      </div>
                                      <div className="text-xs text-green-700 font-semibold">
                                        {expense.unitPrice.toFixed(2)} RON/{getUnitLabel(expense.name)}
                                      </div>
                                    </>
                                  )}

                                  <div className="text-xs text-blue-500 mt-1">
                                    {participatingApts.length + partialApts.length}/{blockApts.length} apartamente
                                    {config.distributionType === 'person' && totalBlockPersons > 0 && (
                                      <span className="text-blue-600 font-medium">
                                        {' • '}{participatingBlockPersons}/{totalBlockPersons} {totalBlockPersons === 1 ? 'persoană' : 'persoane'}
                                      </span>
                                    )}
                                  </div>

                                  {/* Apartamente excluse */}
                                  {excludedApts.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-blue-300">
                                      <div className="text-xs font-medium text-red-700 mb-1">
                                        {excludedApts.length} {excludedApts.length === 1 ? 'apartament exclus' : 'apartamente excluse'}{config.distributionType === 'person' ? ` (${excludedApts.reduce((sum, apt) => sum + (apt.persons || 0), 0)} ${excludedApts.reduce((sum, apt) => sum + (apt.persons || 0), 0) === 1 ? 'pers' : 'pers'})` : ''}:
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {excludedApts.map(apt => (
                                          <span key={apt.id} className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded text-xs font-semibold">
                                            Ap. {apt.number}{config.distributionType === 'person' ? ` (${apt.persons || 0} pers)` : ''}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Apartamente incomplete și diferență (numai pentru individual) */}
                                  {config.distributionType === 'individual' && (() => {
                                    const dataObject = expense.individualAmounts || {};
                                    const nonExcludedBlockApts = blockApts.filter(apt => {
                                      const participation = config.apartmentParticipation?.[apt.id];
                                      return participation?.type !== 'excluded';
                                    });

                                    // Calculează apartamente incomplete pentru acest bloc
                                    const incompleteApts = nonExcludedBlockApts.filter(apt => {
                                      const value = dataObject?.[apt.id];
                                      return !value || parseFloat(value) < 0;
                                    });

                                    // Calculează diferența pentru acest bloc
                                    let totalIntrodusBlock = 0;
                                    nonExcludedBlockApts.forEach(apt => {
                                      totalIntrodusBlock += parseFloat(dataObject[apt.id] || 0);
                                    });
                                    const diferentaBlock = totalIntrodusBlock - blockAmount;
                                    const TOLERANCE = 0.20;
                                    const isDifferenceOk = Math.abs(diferentaBlock) <= TOLERANCE;

                                    // Afișează separator și conținut doar dacă există apartamente incomplete SAU diferență
                                    const hasIssues = incompleteApts.length > 0 || !isDifferenceOk;

                                    return (
                                      <>
                                        {hasIssues && (
                                          <div className="mt-2 pt-2 border-t border-blue-300">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              {/* Badge 1: Apartamente incomplete */}
                                              {incompleteApts.length > 0 && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onConsumptionClick(expense.name);
                                                  }}
                                                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium hover:opacity-90 cursor-pointer transition-colors bg-orange-100 text-orange-700"
                                                  title="Click pentru a completa sumele lipsă"
                                                >
                                                  ⚠ {incompleteApts.length} {incompleteApts.length === 1 ? 'apartament necompletat' : 'apartamente necompletate'}
                                                </button>
                                              )}

                                              {/* Badge 2: Total introdus */}
                                              <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                                isDifferenceOk
                                                  ? 'bg-green-100 text-green-700'
                                                  : 'bg-red-100 text-red-700'
                                              }`}>
                                                {!isDifferenceOk && '⚠ '}Total introdus: <span className="font-semibold ml-1">{totalIntrodusBlock.toFixed(2)} RON</span>
                                              </div>

                                              {/* Badge 3: Diferență */}
                                              {!isDifferenceOk && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onConsumptionClick(expense.name);
                                                  }}
                                                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium hover:opacity-90 cursor-pointer transition-colors bg-red-100 text-red-700"
                                                  title="Click pentru a corecta diferența"
                                                >
                                                  ⚠ Diferență: {diferentaBlock > 0 ? '+' : ''}{diferentaBlock.toFixed(2)} RON {diferentaBlock < 0 ? '(lipsesc)' : '(mai mult)'}
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}

                                  {/* Apartamente cu participare parțială */}
                                  {partialAptsWithAmounts.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-blue-300">
                                      <div className="text-xs font-medium text-orange-700 mb-1">
                                        {partialAptsWithAmounts.length} {partialAptsWithAmounts.length === 1 ? 'apartament cu participare diferită' : 'apartamente cu participare diferită'}{config.distributionType === 'person' ? ` (${partialAptsWithAmounts.reduce((sum, apt) => sum + (apt.persons || 0), 0)} pers)` : ''}:
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {partialAptsWithAmounts.map(apt => {
                                          let displayText;
                                          if (apt.participationType === 'fixed') {
                                            // Folosește setarea globală fixedAmountMode din config
                                            const fixedMode = config.fixedAmountMode || 'apartment';
                                            if (fixedMode === 'person' && apt.persons > 0) {
                                              // Sumă fixă per persoană: afișăm doar suma per persoană
                                              const amountPerPerson = apt.amountInRon / apt.persons;
                                              displayText = `${amountPerPerson.toFixed(2)} RON fix/pers`;
                                            } else {
                                              // Sumă fixă per apartament
                                              displayText = `${apt.amountInRon.toFixed(2)} RON fix/ap.`;
                                            }
                                          } else if (config.distributionType === 'person' && apt.participationType === 'percentage' && apt.persons > 0) {
                                            // Pentru distribuție pe persoană cu procent, afișăm suma per persoană
                                            const amountPerPerson = apt.amountInRon / apt.persons;
                                            displayText = `${apt.participationValue}%: ${amountPerPerson.toFixed(2)} RON/pers`;
                                          } else {
                                            // Pentru alte cazuri (distribuție pe apartament cu procent)
                                            displayText = `${apt.participationValue}%: ${apt.amountInRon.toFixed(2)} RON`;
                                          }

                                          return (
                                            <span key={apt.id} className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded text-xs">
                                              <span className="font-semibold">Ap. {apt.number}</span>{config.distributionType === 'person' ? ` (${apt.persons || 0} pers)` : ''} ({displayText})
                                            </span>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                          {receptionMode === 'per_block' && expense.amountsByBlock && getFilterInfo().type === 'stair' && (() => {
                            // Pentru scară specifică, afișează un singur card cu detalii pentru scara respectivă
                            const filterInfo = getFilterInfo();
                            const stair = stairs?.find(s => s.id === filterInfo.stairId);
                            const block = blocks?.find(b => b.id === filterInfo.blockId);
                            let blockAmount = parseFloat(expense.amountsByBlock[filterInfo.blockId] || 0);

                            if (!stair) return null;

                            const stairApts = getAssociationApartments().filter(apt => apt.stairId === stair.id);

                            // Fallback: dacă blockAmount este 0, calculează din tot blocul pentru consum/individual
                            const blockStairsForFallback = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
                            const blockStairIdsForFallback = blockStairsForFallback.map(s => s.id);
                            const blockAptsForFallback = getAssociationApartments().filter(apt => blockStairIdsForFallback.includes(apt.stairId));

                            if (blockAmount === 0) {
                              if (config.distributionType === 'consumption' && expense.consumption) {
                                let totalConsumption = 0;
                                blockAptsForFallback.forEach(apt => {
                                  const participation = config.apartmentParticipation?.[apt.id];
                                  if (participation?.type !== 'excluded') {
                                    totalConsumption += parseFloat(expense.consumption[apt.id] || 0);
                                  }
                                });
                                blockAmount = totalConsumption * (expense.unitPrice || 0);
                              } else if (config.distributionType === 'individual' && expense.individualAmounts) {
                                blockAptsForFallback.forEach(apt => {
                                  const participation = config.apartmentParticipation?.[apt.id];
                                  if (participation?.type !== 'excluded') {
                                    blockAmount += parseFloat(expense.individualAmounts[apt.id] || 0);
                                  }
                                });
                              }
                            }

                            // Calculează câte apartamente participă efectiv
                            const participatingApts = stairApts.filter(apt => {
                              const p = config.apartmentParticipation?.[apt.id];
                              return !p || p.type === 'integral' || p === 1 || p === 100;
                            });
                            const partialApts = stairApts.filter(apt => {
                              const p = config.apartmentParticipation?.[apt.id];
                              return p && (p.type === 'percentage' || p.type === 'fixed' || (typeof p === 'number' && p > 0 && p < 1));
                            });
                            const excludedApts = stairApts.filter(apt => {
                              const p = config.apartmentParticipation?.[apt.id];
                              return p && p.type === 'excluded';
                            });

                            // Calculează persoanele din scară
                            let totalStairPersons = 0;
                            let participatingStairPersons = 0;
                            stairApts.forEach(apt => {
                              const persons = apt.persons || 0;
                              totalStairPersons += persons;

                              const participation = config.apartmentParticipation?.[apt.id];
                              if (participation?.type === 'excluded') {
                                return;
                              }
                              participatingStairPersons += persons;
                            });

                            // Pentru per_block, folosește toate apartamentele din bloc pentru calcul
                            const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
                            const blockStairIds = blockStairs.map(s => s.id);
                            const blockApts = getAssociationApartments().filter(apt => blockStairIds.includes(apt.stairId));

                            // Calculează suma integrală pentru această scară
                            let integralAmountForStair = 0;
                            if (participatingApts.length > 0) {
                              const sampleIntegralApt = participatingApts[0];
                              integralAmountForStair = calculateApartmentAmount(expense, sampleIntegralApt, blockAmount, blockApts);

                              if (config.distributionType === 'person' && sampleIntegralApt.persons > 0) {
                                integralAmountForStair = integralAmountForStair / sampleIntegralApt.persons;
                              }
                            }

                            // Calculează suma totală pentru scara respectivă
                            let stairTotalAmount = 0;

                            // Dacă blocul are o singură scară, suma pe bloc este implicit suma pe scară
                            const blockHasOnlyOneStair = blockStairsForFallback.length === 1;

                            if (blockHasOnlyOneStair && (config.distributionType === 'consumption' || config.distributionType === 'individual')) {
                              // Bloc cu o singură scară - folosește suma de pe bloc direct
                              stairTotalAmount = blockAmount;
                            } else if (config.distributionType === 'consumption' && expense.consumption) {
                              // Pentru consumption, calculează direct din consumption
                              stairApts.forEach(apt => {
                                const participation = config.apartmentParticipation?.[apt.id];
                                if (participation?.type !== 'excluded') {
                                  stairTotalAmount += parseFloat(expense.consumption[apt.id] || 0) * (expense.unitPrice || 0);
                                }
                              });
                            } else if (config.distributionType === 'individual' && expense.individualAmounts) {
                              // Pentru individual, calculează direct din individualAmounts
                              stairApts.forEach(apt => {
                                const participation = config.apartmentParticipation?.[apt.id];
                                if (participation?.type !== 'excluded') {
                                  stairTotalAmount += parseFloat(expense.individualAmounts[apt.id] || 0);
                                }
                              });
                            } else {
                              // Pentru apartment/person, folosește calculateApartmentAmount
                              stairApts.forEach(apt => {
                                const participation = config.apartmentParticipation?.[apt.id];
                                if (participation?.type !== 'excluded') {
                                  stairTotalAmount += calculateApartmentAmount(expense, apt, blockAmount, blockApts);
                                }
                              });
                            }

                            // Calculează sumele pentru apartamentele parțiale
                            const partialAptsWithAmounts = partialApts.map(apt => {
                              const p = config.apartmentParticipation?.[apt.id];
                              const amountInRon = calculateApartmentAmount(expense, apt, blockAmount, blockApts);
                              return {
                                ...apt,
                                participationType: p.type,
                                participationValue: p.value,
                                amountInRon
                              };
                            });

                            // Calculează numărul de persoane cu participare integrală pentru această scară
                            const integralPersonsForThisStair = participatingApts.reduce((sum, apt) => sum + (apt.persons || 0), 0);

                            // Calculează totalul unităților pentru consum
                            let totalConsumptionUnitsForStair = 0;
                            if (config.distributionType === 'consumption' && expense.consumption) {
                              stairApts.forEach(apt => {
                                const participation = config.apartmentParticipation?.[apt.id];
                                if (participation?.type !== 'excluded') {
                                  totalConsumptionUnitsForStair += parseFloat(expense.consumption[apt.id] || 0);
                                }
                              });
                            }

                            return (
                              <div key={stair.id} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                <div className="font-medium text-purple-900">{block?.name} - {stair.name}</div>
                                <div className="text-xl font-bold text-purple-700">{stairTotalAmount.toFixed(2)} RON</div>

                                {/* Total introdus și diferență - pentru CONSUM și INDIVIDUAL */}
                                {(config.distributionType === 'consumption' || config.distributionType === 'individual') && (() => {
                                  // Calculăm totalul introdus pentru această scară
                                  let totalIntrodusForStair = 0;
                                  if (config.distributionType === 'consumption' && expense.consumption) {
                                    stairApts.forEach(apt => {
                                      const participation = config.apartmentParticipation?.[apt.id];
                                      if (participation?.type !== 'excluded') {
                                        totalIntrodusForStair += parseFloat(expense.consumption[apt.id] || 0) * (expense.unitPrice || 0);
                                      }
                                    });
                                  } else if (config.distributionType === 'individual' && expense.individualAmounts) {
                                    stairApts.forEach(apt => {
                                      const participation = config.apartmentParticipation?.[apt.id];
                                      if (participation?.type !== 'excluded') {
                                        totalIntrodusForStair += parseFloat(expense.individualAmounts[apt.id] || 0);
                                      }
                                    });
                                  }

                                  // Calculăm suma așteptată pentru această scară bazat pe proporția din bloc
                                  let expectedAmountForStair = 0;
                                  if (blockHasOnlyOneStair) {
                                    expectedAmountForStair = blockAmount;
                                  } else {
                                    // Calculăm totalul introdus pentru întreg blocul
                                    let totalIntrodusForBlock = 0;
                                    if (config.distributionType === 'consumption' && expense.consumption) {
                                      blockApts.forEach(apt => {
                                        const participation = config.apartmentParticipation?.[apt.id];
                                        if (participation?.type !== 'excluded') {
                                          totalIntrodusForBlock += parseFloat(expense.consumption[apt.id] || 0) * (expense.unitPrice || 0);
                                        }
                                      });
                                    } else if (config.distributionType === 'individual' && expense.individualAmounts) {
                                      blockApts.forEach(apt => {
                                        const participation = config.apartmentParticipation?.[apt.id];
                                        if (participation?.type !== 'excluded') {
                                          totalIntrodusForBlock += parseFloat(expense.individualAmounts[apt.id] || 0);
                                        }
                                      });
                                    }

                                    // Proporția acestei scări din total bloc
                                    if (totalIntrodusForBlock > 0) {
                                      expectedAmountForStair = blockAmount * (totalIntrodusForStair / totalIntrodusForBlock);
                                    }
                                  }

                                  const diferenta = totalIntrodusForStair - expectedAmountForStair;
                                  const TOLERANCE = 0.20;
                                  const isDifferenceOk = Math.abs(diferenta) <= TOLERANCE;

                                  return (
                                    <>
                                      <div className="text-xs text-blue-600 font-semibold mt-1">
                                        Total introdus: {totalIntrodusForStair.toFixed(2)} RON
                                      </div>
                                      {!isDifferenceOk && (
                                        <div className="text-xs text-red-600 font-semibold mt-0.5">
                                          ⚠ Diferență: {diferenta > 0 ? '+' : ''}{diferenta.toFixed(2)} RON
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}

                                {/* Sub sumă - DOAR pentru CONSUM */}
                                {config.distributionType === 'consumption' && expense.unitPrice && (
                                  <>
                                    <div className="text-xs text-green-700 font-semibold mt-1">
                                      {totalConsumptionUnitsForStair.toFixed(2)} {getUnitLabel(expense.name)} introduși
                                    </div>
                                    <div className="text-xs text-green-700 font-semibold">
                                      {expense.unitPrice.toFixed(2)} RON/{getUnitLabel(expense.name)}
                                    </div>
                                  </>
                                )}

                                {/* Pentru apartment/person - afișează suma per apartament/persoană */}
                                {integralAmountForStair > 0 && config.distributionType !== 'consumption' && config.distributionType !== 'individual' && (
                                  <div className="text-xs text-green-700 font-semibold mt-1">
                                    {integralAmountForStair.toFixed(2)} {config.distributionType === 'person' ? `RON/persoană (${integralPersonsForThisStair} pers)` : 'RON/apartament'}
                                  </div>
                                )}

                                <div className="text-xs text-purple-500 mt-1">
                                  {participatingApts.length + partialApts.length}/{stairApts.length} apartamente
                                  {config.distributionType === 'person' && totalStairPersons > 0 && (
                                    <span className="text-blue-600 font-medium">
                                      {' • '}{participatingStairPersons}/{totalStairPersons} {totalStairPersons === 1 ? 'persoană' : 'persoane'}
                                    </span>
                                  )}
                                </div>

                                {/* Apartamente excluse */}
                                {excludedApts.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-purple-300">
                                    <div className="text-xs font-medium text-red-700 mb-1">
                                      {excludedApts.length} {excludedApts.length === 1 ? 'apartament exclus' : 'apartamente excluse'}{config.distributionType === 'person' ? ` (${excludedApts.reduce((sum, apt) => sum + (apt.persons || 0), 0)} ${excludedApts.reduce((sum, apt) => sum + (apt.persons || 0), 0) === 1 ? 'pers' : 'pers'})` : ''}:
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {excludedApts.map(apt => (
                                        <span key={apt.id} className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded text-xs font-semibold">
                                          Ap. {apt.number}{config.distributionType === 'person' ? ` (${apt.persons || 0} pers)` : ''}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Apartamente incomplete și diferență (numai pentru individual) */}
                                {config.distributionType === 'individual' && (() => {
                                  const dataObject = expense.individualAmounts || {};
                                  const nonExcludedStairApts = stairApts.filter(apt => {
                                    const participation = config.apartmentParticipation?.[apt.id];
                                    return participation?.type !== 'excluded';
                                  });

                                  // Calculează apartamente incomplete pentru această scară
                                  const incompleteApts = nonExcludedStairApts.filter(apt => {
                                    const value = dataObject?.[apt.id];
                                    return !value || parseFloat(value) < 0;
                                  });

                                  // Calculează diferența pentru această scară
                                  let totalIntrodusStair = 0;
                                  nonExcludedStairApts.forEach(apt => {
                                    totalIntrodusStair += parseFloat(dataObject[apt.id] || 0);
                                  });
                                  const diferentaStair = totalIntrodusStair - stairTotalAmount;
                                  const TOLERANCE = 0.20;
                                  const isDifferenceOk = Math.abs(diferentaStair) <= TOLERANCE;

                                  // Afișează separator și conținut doar dacă există apartamente incomplete SAU diferență
                                  const hasIssues = incompleteApts.length > 0 || !isDifferenceOk;

                                  return (
                                    <>
                                      {hasIssues && (
                                        <div className="mt-2 pt-2 border-t border-purple-300">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            {/* Badge 1: Apartamente incomplete */}
                                            {incompleteApts.length > 0 && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onConsumptionClick(expense.name, filterInfo.stairId);
                                                }}
                                                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium hover:opacity-90 cursor-pointer transition-colors bg-orange-100 text-orange-700"
                                                title="Click pentru a completa sumele lipsă"
                                              >
                                                ⚠ {incompleteApts.length} {incompleteApts.length === 1 ? 'apartament necompletat' : 'apartamente necompletate'}
                                              </button>
                                            )}

                                            {/* Badge 2: Total introdus */}
                                            <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                              isDifferenceOk
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                            }`}>
                                              {!isDifferenceOk && '⚠ '}Total introdus: <span className="font-semibold ml-1">{totalIntrodusStair.toFixed(2)} RON</span>
                                            </div>

                                            {/* Badge 3: Diferență */}
                                            {!isDifferenceOk && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onConsumptionClick(expense.name, filterInfo.stairId);
                                                }}
                                                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium hover:opacity-90 cursor-pointer transition-colors bg-red-100 text-red-700"
                                                title="Click pentru a corecta diferența"
                                              >
                                                ⚠ Diferență: {diferentaStair > 0 ? '+' : ''}{diferentaStair.toFixed(2)} RON {diferentaStair < 0 ? '(lipsesc)' : '(mai mult)'}
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}

                                {/* Apartamente cu participare parțială */}
                                {partialAptsWithAmounts.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-purple-300">
                                    <div className="text-xs font-medium text-orange-700 mb-1">
                                      {partialAptsWithAmounts.length} {partialAptsWithAmounts.length === 1 ? 'apartament cu participare diferită' : 'apartamente cu participare diferită'}{config.distributionType === 'person' ? ` (${partialAptsWithAmounts.reduce((sum, apt) => sum + (apt.persons || 0), 0)} pers)` : ''}:
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {partialAptsWithAmounts.map(apt => {
                                        let displayText;
                                        if (apt.participationType === 'fixed') {
                                          const fixedMode = config.fixedAmountMode || 'apartment';
                                          if (fixedMode === 'person' && apt.persons > 0) {
                                            const amountPerPerson = apt.amountInRon / apt.persons;
                                            displayText = `${amountPerPerson.toFixed(2)} RON fix/pers`;
                                          } else {
                                            displayText = `${apt.amountInRon.toFixed(2)} RON fix/ap.`;
                                          }
                                        } else if (config.distributionType === 'person' && apt.participationType === 'percentage' && apt.persons > 0) {
                                          const amountPerPerson = apt.amountInRon / apt.persons;
                                          displayText = `${apt.participationValue}%: ${amountPerPerson.toFixed(2)} RON/pers`;
                                        } else {
                                          displayText = `${apt.participationValue}%: ${apt.amountInRon.toFixed(2)} RON`;
                                        }

                                        return (
                                          <span key={apt.id} className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded text-xs">
                                            <span className="font-semibold">Ap. {apt.number}</span>{config.distributionType === 'person' ? ` (${apt.persons || 0} pers)` : ''} ({displayText})
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          {receptionMode === 'per_stair' && expense.amountsByStair && stairs && (() => {
                            // Filtrează scările: în tab "Toate" afișează toate, în tab specific afișează doar scara curentă
                            const filterInfo = getFilterInfo();
                            const stairsToShow = filterInfo.type === 'stair'
                              ? stairs.filter(s => s.id === filterInfo.stairId)
                              : stairs;

                            return stairsToShow.map(stair => {
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
                              const excludedApts = stairApts.filter(apt => {
                                const p = config.apartmentParticipation?.[apt.id];
                                return p && p.type === 'excluded';
                              });

                              // Calculează persoanele din scară (total și participante - exclude doar cele excluse)
                              let totalStairPersons = 0;
                              let participatingStairPersons = 0;
                              stairApts.forEach(apt => {
                                const persons = apt.persons || 0;
                                totalStairPersons += persons;

                                const participation = config.apartmentParticipation?.[apt.id];

                                // Exclude: persoanele NU participă deloc
                                if (participation?.type === 'excluded') {
                                  return;
                                }

                                // Toate celelalte persoane participă (integral, fixed, percentage)
                                participatingStairPersons += persons;
                              });

                              // Calculează suma integrală pentru această scară
                              let integralAmountForStair = 0;
                              if (participatingApts.length > 0) {
                                // Pentru distribuție pe persoană: calculează suma pentru O PERSOANĂ integrală
                                // Pentru distribuție pe apartament: calculează suma pentru UN APARTAMENT integral
                                const sampleIntegralApt = participatingApts[0];
                                integralAmountForStair = calculateApartmentAmount(expense, sampleIntegralApt, stairAmount, stairApts);

                                // Dacă e distribuție pe persoană, împarte suma apartamentului la numărul de persoane
                                if (config.distributionType === 'person' && sampleIntegralApt.persons > 0) {
                                  integralAmountForStair = integralAmountForStair / sampleIntegralApt.persons;
                                }
                              }

                              // Calculează sumele pentru apartamentele parțiale
                              const partialAptsWithAmounts = partialApts.map(apt => {
                                const p = config.apartmentParticipation?.[apt.id];
                                const amountInRon = calculateApartmentAmount(expense, apt, stairAmount, stairApts);
                                return {
                                  ...apt,
                                  participationType: p.type,
                                  participationValue: p.value,
                                  fixedMode: p.fixedMode,
                                  amountInRon
                                };
                              });

                              // Calculează numărul de persoane cu participare integrală pentru această scară
                              const integralPersonsForStair = participatingApts.reduce((sum, apt) => sum + (apt.persons || 0), 0);

                              // Calculează totalul unităților pentru consum
                              let totalConsumptionUnitsForStair = 0;
                              if (config.distributionType === 'consumption' && expense.consumption) {
                                stairApts.forEach(apt => {
                                  const participation = config.apartmentParticipation?.[apt.id];
                                  if (participation?.type !== 'excluded') {
                                    totalConsumptionUnitsForStair += parseFloat(expense.consumption[apt.id] || 0);
                                  }
                                });
                              }

                              // Calculează totalul introdus pentru consumption și individual
                              let totalIntrodusForStair = 0;
                              if (config.distributionType === 'consumption' && expense.consumption) {
                                stairApts.forEach(apt => {
                                  const participation = config.apartmentParticipation?.[apt.id];
                                  if (participation?.type !== 'excluded') {
                                    totalIntrodusForStair += parseFloat(expense.consumption[apt.id] || 0) * (expense.unitPrice || 0);
                                  }
                                });
                              } else if (config.distributionType === 'individual' && expense.individualAmounts) {
                                stairApts.forEach(apt => {
                                  const participation = config.apartmentParticipation?.[apt.id];
                                  if (participation?.type !== 'excluded') {
                                    totalIntrodusForStair += parseFloat(expense.individualAmounts[apt.id] || 0);
                                  }
                                });
                              }

                              return (
                                <div key={stair.id} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                  <div className="font-medium text-purple-900">{block?.name} - {stair.name}</div>
                                  <div className="text-xl font-bold text-purple-700">{stairAmount.toFixed(2)} RON</div>

                                  {/* Total introdus și diferență - pentru CONSUM și INDIVIDUAL */}
                                  {(config.distributionType === 'consumption' || config.distributionType === 'individual') && (() => {
                                    const diferenta = totalIntrodusForStair - stairAmount;
                                    const TOLERANCE = 0.20;
                                    const isDifferenceOk = Math.abs(diferenta) <= TOLERANCE;

                                    return (
                                      <>
                                        <div className="text-xs text-blue-600 font-semibold mt-1">
                                          Total introdus: {totalIntrodusForStair.toFixed(2)} RON
                                        </div>
                                        {!isDifferenceOk && (
                                          <div className="text-xs text-red-600 font-semibold mt-0.5">
                                            ⚠ Diferență: {diferenta > 0 ? '+' : ''}{diferenta.toFixed(2)} RON
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}

                                  {/* Sub sumă - DOAR pentru CONSUM */}
                                  {config.distributionType === 'consumption' && expense.unitPrice && (
                                    <>
                                      <div className="text-xs text-green-700 font-semibold mt-1">
                                        {totalConsumptionUnitsForStair.toFixed(2)} {getUnitLabel(expense.name)} introduși
                                      </div>
                                      <div className="text-xs text-green-700 font-semibold">
                                        {expense.unitPrice.toFixed(2)} RON/{getUnitLabel(expense.name)}
                                      </div>
                                    </>
                                  )}

                                  {/* Pentru apartment/person - afișează suma per apartament/persoană */}
                                  {integralAmountForStair > 0 && config.distributionType !== 'consumption' && config.distributionType !== 'individual' && (
                                    <div className="text-xs text-green-700 font-semibold mt-1">
                                      {integralAmountForStair.toFixed(2)} {config.distributionType === 'person' ? `RON/persoană (${integralPersonsForStair} pers)` : 'RON/apartament'}
                                    </div>
                                  )}
                                  <div className="text-xs text-purple-500 mt-1">
                                    {participatingApts.length + partialApts.length}/{stairApts.length} apartamente
                                    {config.distributionType === 'person' && totalStairPersons > 0 && (
                                      <span className="text-blue-600 font-medium">
                                        {' • '}{participatingStairPersons}/{totalStairPersons} {totalStairPersons === 1 ? 'persoană' : 'persoane'}
                                      </span>
                                    )}
                                  </div>

                                  {/* Apartamente excluse */}
                                  {excludedApts.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-purple-300">
                                      <div className="text-xs font-medium text-red-700 mb-1">
                                        {excludedApts.length} {excludedApts.length === 1 ? 'apartament exclus' : 'apartamente excluse'}{config.distributionType === 'person' ? ` (${excludedApts.reduce((sum, apt) => sum + (apt.persons || 0), 0)} ${excludedApts.reduce((sum, apt) => sum + (apt.persons || 0), 0) === 1 ? 'pers' : 'pers'})` : ''}:
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {excludedApts.map(apt => (
                                          <span key={apt.id} className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded text-xs font-semibold">
                                            Ap. {apt.number}{config.distributionType === 'person' ? ` (${apt.persons || 0} pers)` : ''}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Apartamente incomplete și diferență (numai pentru individual) */}
                                  {config.distributionType === 'individual' && (() => {
                                    const dataObject = expense.individualAmounts || {};
                                    const nonExcludedStairApts = stairApts.filter(apt => {
                                      const participation = config.apartmentParticipation?.[apt.id];
                                      return participation?.type !== 'excluded';
                                    });

                                    // Calculează apartamente incomplete pentru această scară
                                    const incompleteApts = nonExcludedStairApts.filter(apt => {
                                      const value = dataObject?.[apt.id];
                                      return !value || parseFloat(value) < 0;
                                    });

                                    // Calculează diferența pentru această scară
                                    let totalIntrodusStair = 0;
                                    nonExcludedStairApts.forEach(apt => {
                                      totalIntrodusStair += parseFloat(dataObject[apt.id] || 0);
                                    });
                                    const diferentaStair = totalIntrodusStair - stairAmount;
                                    const TOLERANCE = 0.20;
                                    const isDifferenceOk = Math.abs(diferentaStair) <= TOLERANCE;

                                    // Afișează separator și conținut doar dacă există apartamente incomplete SAU diferență
                                    const hasIssues = incompleteApts.length > 0 || !isDifferenceOk;

                                    return (
                                      <>
                                        {hasIssues && (
                                          <div className="mt-2 pt-2 border-t border-purple-300">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              {/* Badge 1: Apartamente incomplete */}
                                              {incompleteApts.length > 0 && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onConsumptionClick(expense.name, stair.id);
                                                  }}
                                                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium hover:opacity-90 cursor-pointer transition-colors bg-orange-100 text-orange-700"
                                                  title="Click pentru a completa sumele lipsă"
                                                >
                                                  ⚠ {incompleteApts.length} {incompleteApts.length === 1 ? 'apartament necompletat' : 'apartamente necompletate'}
                                                </button>
                                              )}

                                              {/* Badge 2: Total introdus */}
                                              <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                                isDifferenceOk
                                                  ? 'bg-green-100 text-green-700'
                                                  : 'bg-red-100 text-red-700'
                                              }`}>
                                                {!isDifferenceOk && '⚠ '}Total introdus: <span className="font-semibold ml-1">{totalIntrodusStair.toFixed(2)} RON</span>
                                              </div>

                                              {/* Badge 3: Diferență */}
                                              {!isDifferenceOk && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onConsumptionClick(expense.name, stair.id);
                                                  }}
                                                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium hover:opacity-90 cursor-pointer transition-colors bg-red-100 text-red-700"
                                                  title="Click pentru a corecta diferența"
                                                >
                                                  ⚠ Diferență: {diferentaStair > 0 ? '+' : ''}{diferentaStair.toFixed(2)} RON {diferentaStair < 0 ? '(lipsesc)' : '(mai mult)'}
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}

                                  {/* Apartamente cu participare parțială */}
                                  {partialAptsWithAmounts.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-purple-300">
                                      <div className="text-xs font-medium text-orange-700 mb-1">
                                        {partialAptsWithAmounts.length} {partialAptsWithAmounts.length === 1 ? 'apartament cu participare diferită' : 'apartamente cu participare diferită'}{config.distributionType === 'person' ? ` (${partialAptsWithAmounts.reduce((sum, apt) => sum + (apt.persons || 0), 0)} pers)` : ''}:
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {partialAptsWithAmounts.map(apt => {
                                          let displayText;
                                          if (apt.participationType === 'fixed') {
                                            // Folosește setarea globală fixedAmountMode din config
                                            const fixedMode = config.fixedAmountMode || 'apartment';
                                            if (fixedMode === 'person' && apt.persons > 0) {
                                              // Sumă fixă per persoană: afișăm doar suma per persoană
                                              const amountPerPerson = apt.amountInRon / apt.persons;
                                              displayText = `${amountPerPerson.toFixed(2)} RON fix/pers`;
                                            } else {
                                              // Sumă fixă per apartament
                                              displayText = `${apt.amountInRon.toFixed(2)} RON fix/ap.`;
                                            }
                                          } else if (config.distributionType === 'person' && apt.participationType === 'percentage' && apt.persons > 0) {
                                            // Pentru distribuție pe persoană cu procent, afișăm suma per persoană
                                            const amountPerPerson = apt.amountInRon / apt.persons;
                                            displayText = `${apt.participationValue}%: ${amountPerPerson.toFixed(2)} RON/pers`;
                                          } else {
                                            // Pentru alte cazuri (distribuție pe apartament cu procent)
                                            displayText = `${apt.participationValue}%: ${apt.amountInRon.toFixed(2)} RON`;
                                          }

                                          return (
                                            <span key={apt.id} className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded text-xs">
                                              <span className="font-semibold">Ap. {apt.number}</span>{config.distributionType === 'person' ? ` (${apt.persons || 0} pers)` : ''} ({displayText})
                                            </span>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>
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
