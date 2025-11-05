import React, { useState, useEffect, useRef } from 'react';
import { Calculator, Trash2, ChevronDown, ChevronUp, AlertCircle, Edit2, Layers, Building2, BarChart, MoreVertical, Settings, FileText } from 'lucide-react';
import {
  ConsumptionTable,
  IndividualAmountsTable,
  ExpenseStatusBadge,
  ExpenseDifferenceDisplay,
  getExpenseStatus,
  calculateTotals,
  getFilterInfo as getFilterInfoShared,
  getFilteredApartments as getFilteredApartmentsShared
} from './shared/ConsumptionComponents';
import {
  calculateExpenseDifferenceInfo
} from './shared/DifferenceCalculations';
import {
  ExpenseTotalBadge,
  DifferenceBadge
} from './shared/ExpenseBadges';

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
  calculateExpenseDifferences,
  onEditExpense,
  onConsumptionClick,
  expandExpenseName,
  onConfigureExpense,
  expandedExpenses, // ✨ Primim starea din parent
  setExpandedExpenses, // ✨ Primim setter-ul din parent
  // Props pentru tabeluri
  updateExpenseConsumption,
  updateExpenseIndividualAmount,
  updatePendingConsumption,
  updatePendingIndividualAmount,
  updateExpenseIndexes,
  updatePendingIndexes,
  getDisabledExpenseTypes,
  getApartmentParticipation,
  // Props pentru facturi
  invoices,
  getInvoiceForExpense
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

  // State pentru dropdown meniu acțiuni
  const [openDropdown, setOpenDropdown] = useState(null);

  // State pentru optimistic UI updates în tabeluri
  const [localValues, setLocalValues] = useState({});

  // Refs pentru scroll automat la cheltuieli
  const expenseRefs = useRef({});
  const dropdownRefs = useRef({});

  // Auto-expandare când se primește un expense name
  useEffect(() => {
    if (expandExpenseName) {
      // Găsește expense-ul după nume
      const expenseToExpand = associationExpenses.find(exp => exp.name === expandExpenseName);
      if (expenseToExpand) {
        // Expandează această cheltuială (păstrează starea celorlalte)
        setExpandedExpenses(prev => ({
          ...prev,
          [expenseToExpand.id]: true
        }));

        // Scroll automat la cheltuială după un mic delay pentru a permite rendering-ul
        setTimeout(() => {
          const expenseElement = expenseRefs.current[expenseToExpand.id];
          if (expenseElement) {
            expenseElement.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
              inline: 'nearest'
            });
          }
        }, 100);
      }
    }
  }, [expandExpenseName, associationExpenses, setExpandedExpenses]);

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

      // Pentru reponderare, folosește GREUTATEA nu suma calculată!
      // Acest lucru previne aplicarea dublă a procentului.
      let baseWeight = 0;

      switch (distributionType) {
        case 'apartment':
        case 'perApartament':
          // Pentru distribuție pe apartament: greutatea este 1.0 (o unitate per apartament)
          baseWeight = 1.0;
          break;
        case 'person':
        case 'perPerson':
          // Pentru distribuție pe persoană: greutatea este numărul de persoane
          baseWeight = apt.persons || 0;
          break;
      }

      const percent = aptParticipation?.type === 'percentage' ? aptParticipation.value : 100;
      const multiplier = percent < 1 ? percent : (percent / 100);
      weights[apt.id] = baseWeight * multiplier;
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

    // Determină receptionMode
    let receptionMode = expense.receptionMode || 'total';

    // Pentru filtrul "Toate"
    if (filterInfo.type === 'all') {
      const config = getExpenseConfig(expense.name);

      // Pentru cheltuieli pe scară (per_stair), calculează totalul din toate scările
      if (receptionMode === 'per_stair' && expense.amountsByStair && Object.keys(expense.amountsByStair).length > 0 && stairs) {
        return stairs.reduce((sum, stair) =>
          sum + parseFloat(expense.amountsByStair[stair.id] || 0), 0
        );
      }

      // Pentru cheltuieli pe bloc (per_block), calculează totalul din toate blocurile
      if (receptionMode === 'per_block' && expense.amountsByBlock && Object.keys(expense.amountsByBlock).length > 0 && blocks) {
        return blocks.reduce((sum, block) =>
          sum + parseFloat(expense.amountsByBlock[block.id] || 0), 0
        );
      }

      // Pentru consumption cu participări, calculează suma distribuită
      if (config?.distributionType === 'consumption' && expense.consumption) {
        const allApts = getAssociationApartments();
        let totalIntroduced = 0;

        allApts.forEach(apt => {
          const participation = config?.apartmentParticipation?.[apt.id];
          let aptAmount = 0;

          if (participation?.type !== 'excluded') {
            aptAmount = parseFloat(expense.consumption?.[apt.id] || 0) * (expense.unitPrice || 0);

            // Aplică participarea
            if (participation?.type === 'percentage' && participation?.value !== undefined) {
              const percent = participation.value < 1 ? participation.value : (participation.value / 100);
              aptAmount = aptAmount * percent;
            } else if (participation?.type === 'fixed') {
              const fixedMode = config?.fixedAmountMode || 'apartment';
              if (fixedMode === 'person') {
                aptAmount = parseFloat(participation.value || 0) * (apt.persons || 0);
              } else {
                aptAmount = parseFloat(participation.value || 0);
              }
            }
          }

          totalIntroduced += aptAmount;
        });

        // Adaugă diferența dacă există (pentru isUnitBased)
        if (expense?.isUnitBased && calculateExpenseDifferences) {
          const expenseDifferences = calculateExpenseDifferences(expense, allApts);
          const totalDifference = allApts.reduce((sum, apt) => sum + (expenseDifferences[apt.id] || 0), 0);
          return totalIntroduced + totalDifference;
        }

        return totalIntroduced;
      }

      // Pentru individual, returnează suma așteptată (expense.amount), NU suma introdusă!
      if (config?.distributionType === 'individual') {
        // Pentru sume pe scară/bloc, sumează din amountsByStair/amountsByBlock
        if (receptionMode === 'per_stair' && expense.amountsByStair && stairs) {
          return stairs.reduce((sum, stair) =>
            sum + parseFloat(expense.amountsByStair[stair.id] || 0), 0
          );
        }
        if (receptionMode === 'per_block' && expense.amountsByBlock && blocks) {
          return blocks.reduce((sum, block) =>
            sum + parseFloat(expense.amountsByBlock[block.id] || 0), 0
          );
        }
        // Pentru sume pe asociație, returnează expense.amount
        return parseFloat(expense.amount || 0);
      }

      // Pentru alte tipuri, returnează suma așteptată
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
        if (blockHasOnlyOneStair && (config?.distributionType === 'consumption' || config?.distributionType === 'individual' ||
            config?.distributionType === 'cotaParte')) {
          return blockAmount;
        }

        // SPECIAL: Pentru cheltuieli pe CONSUM, INDIVIDUAL sau COTĂ PARTE INDIVIZĂ cu multiple scări pe bloc, calculează suma din introduceri
        if (config?.distributionType === 'consumption' || config?.distributionType === 'individual' ||
            config?.distributionType === 'cotaParte') {
          let stairIntroducedAmount = 0;
          stairApts.forEach(apt => {
            const participation = config?.apartmentParticipation?.[apt.id];
            let aptAmount = 0;

            if (participation?.type === 'excluded') {
              aptAmount = 0;
            } else {
              if (config.distributionType === 'consumption') {
                const consumption = parseFloat(expense.consumption?.[apt.id] || 0);
                aptAmount = consumption * (expense.unitPrice || 0);
              } else if (config.distributionType === 'individual') {
                aptAmount = parseFloat(expense.individualAmounts?.[apt.id] || 0);
              } else if (config.distributionType === 'cotaParte') {
                // Pentru cotă parte indiviză: calculează suma cu reponderare
                // Pasul 1: Calculează suma fixă totală pentru bloc
                let blockFixedAmount = 0;
                blockApts.forEach(blockApt => {
                  const blockAptParticipation = config?.apartmentParticipation?.[blockApt.id];
                  if (blockAptParticipation?.type === 'fixed') {
                    const fixedMode = config?.fixedAmountMode || 'apartment';
                    blockFixedAmount += fixedMode === 'person'
                      ? parseFloat(blockAptParticipation.value || 0) * (blockApt.persons || 0)
                      : parseFloat(blockAptParticipation.value || 0);
                  }
                });

                // Pasul 2: Suma de redistribuit
                const amountToRedistribute = blockAmount - blockFixedAmount;

                // Pasul 3: Filtrează apartamentele care participă la reponderare din bloc
                const blockAptsForReweighting = blockApts.filter(blockApt => {
                  const blockAptParticipation = config?.apartmentParticipation?.[blockApt.id];
                  return blockAptParticipation?.type !== 'excluded' && blockAptParticipation?.type !== 'fixed';
                });

                // Pasul 4: Calculează suma pentru apartamentul curent
                if (participation?.type === 'fixed') {
                  const fixedMode = config?.fixedAmountMode || 'apartment';
                  aptAmount = fixedMode === 'person'
                    ? parseFloat(participation.value || 0) * (apt.persons || 0)
                    : parseFloat(participation.value || 0);
                } else if (blockAptsForReweighting.length > 0) {
                  // Calculează suprafața totală din bloc pentru apartamentele de reponderare
                  const blockTotalSurface = blockApts.reduce((sum, a) => sum + (parseFloat(a.surface) || 0), 0);

                  if (apt.surface && blockTotalSurface > 0) {
                    // Calculează cota parte pentru acest apartament
                    const cotaParte = parseFloat(((parseFloat(apt.surface) / blockTotalSurface) * 100).toFixed(4));

                    // Calculează greutățile pentru reponderare
                    let totalWeights = 0;
                    blockAptsForReweighting.forEach(blockApt => {
                      const blockAptParticipation = config?.apartmentParticipation?.[blockApt.id];
                      const blockAptSurface = parseFloat(blockApt.surface) || 0;
                      const blockAptCotaParte = blockTotalSurface > 0
                        ? parseFloat(((blockAptSurface / blockTotalSurface) * 100).toFixed(4))
                        : 0;

                      const percent = blockAptParticipation?.type === 'percentage' ? blockAptParticipation.value : 100;
                      const multiplier = percent < 1 ? percent : (percent / 100);
                      totalWeights += blockAptCotaParte * multiplier;
                    });

                    // Calculează greutatea acestui apartament
                    const percent = participation?.type === 'percentage' ? participation.value : 100;
                    const multiplier = percent < 1 ? percent : (percent / 100);
                    const weight = cotaParte * multiplier;

                    // Redistribuie
                    if (totalWeights > 0) {
                      aptAmount = (weight / totalWeights) * amountToRedistribute;
                    }
                  }
                }
              }


              // Aplică participarea (doar pentru consumption și individual, cotaParte se calculează cu reponderare mai sus)
              if (config.distributionType !== 'cotaParte') {
                if (participation?.type === 'percentage' && participation?.value !== undefined) {
                  const percent = participation.value < 1 ? participation.value : (participation.value / 100);
                  aptAmount = aptAmount * percent;
                } else if (participation?.type === 'fixed') {
                  const fixedMode = config.fixedAmountMode || 'apartment';
                  if (fixedMode === 'person') {
                    aptAmount = parseFloat(participation.value || 0) * (apt.persons || 0);
                  } else {
                    aptAmount = parseFloat(participation.value || 0);
                  }
                }
              }
            }

            stairIntroducedAmount += aptAmount;
          });

          // Adaugă diferența dacă există (pentru isUnitBased)
          if (expense?.isUnitBased && calculateExpenseDifferences) {
            const expenseDifferences = calculateExpenseDifferences(expense, allApts);
            const totalDifference = stairApts.reduce((sum, apt) => sum + (expenseDifferences[apt.id] || 0), 0);
            return stairIntroducedAmount + totalDifference;
          }

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
      if (receptionMode === 'per_association') {
        // Pentru cheltuieli "Pe asociație" când filtrezi pe scară, calculează suma pentru acea scară
        const config = getExpenseConfig(expense.name);
        const allApts = getAssociationApartments();
        const stairApts = allApts.filter(apt => apt.stairId === filterInfo.stairId);
        const totalAssociationAmount = expense.isUnitBased ? expense.billAmount : expense.amount;


        // SPECIAL: Pentru cheltuieli pe CONSUM, INDIVIDUAL sau COTĂ PARTE INDIVIZĂ, calculează suma cu participări aplicate
        if (config?.distributionType === 'consumption' || config?.distributionType === 'individual' ||
            config?.distributionType === 'cotaParte') {
          let stairIntroducedAmount = 0;
          stairApts.forEach(apt => {
            const participation = config?.apartmentParticipation?.[apt.id];
            if (participation?.type !== 'excluded') {
              let aptAmount = 0;
              if (config.distributionType === 'consumption') {
                aptAmount = parseFloat(expense.consumption?.[apt.id] || 0) * (expense.unitPrice || 0);
              } else if (config.distributionType === 'individual') {
                aptAmount = parseFloat(expense.individualAmounts?.[apt.id] || 0);
              } else if (config.distributionType === 'cotaParte') {
                // Pentru cotă parte indiviză: calculează suma cu reponderare pe baza asociației
                // Pasul 1: Calculează suma fixă totală pentru asociație
                let associationFixedAmount = 0;
                allApts.forEach(assocApt => {
                  const assocAptParticipation = config?.apartmentParticipation?.[assocApt.id];
                  if (assocAptParticipation?.type === 'fixed') {
                    const fixedMode = config?.fixedAmountMode || 'apartment';
                    associationFixedAmount += fixedMode === 'person'
                      ? parseFloat(assocAptParticipation.value || 0) * (assocApt.persons || 0)
                      : parseFloat(assocAptParticipation.value || 0);
                  }
                });

                // Pasul 2: Suma de redistribuit
                const amountToRedistribute = totalAssociationAmount - associationFixedAmount;

                // Pasul 3: Filtrează apartamentele care participă la reponderare din asociație
                const associationAptsForReweighting = allApts.filter(assocApt => {
                  const assocAptParticipation = config?.apartmentParticipation?.[assocApt.id];
                  return assocAptParticipation?.type !== 'excluded' && assocAptParticipation?.type !== 'fixed';
                });

                // Pasul 4: Calculează suma pentru apartamentul curent
                if (participation?.type === 'fixed') {
                  const fixedMode = config?.fixedAmountMode || 'apartment';
                  aptAmount = fixedMode === 'person'
                    ? parseFloat(participation.value || 0) * (apt.persons || 0)
                    : parseFloat(participation.value || 0);
                } else if (associationAptsForReweighting.length > 0) {
                  // Calculează suprafața totală din asociație pentru apartamentele de reponderare
                  const associationTotalSurface = allApts.reduce((sum, a) => sum + (parseFloat(a.surface) || 0), 0);

                  if (apt.surface && associationTotalSurface > 0) {
                    // Calculează cota parte pentru acest apartament
                    const cotaParte = parseFloat(((parseFloat(apt.surface) / associationTotalSurface) * 100).toFixed(4));

                    // Calculează greutățile pentru reponderare
                    let totalWeights = 0;
                    associationAptsForReweighting.forEach(assocApt => {
                      const assocAptParticipation = config?.apartmentParticipation?.[assocApt.id];
                      const assocAptSurface = parseFloat(assocApt.surface) || 0;
                      const assocAptCotaParte = associationTotalSurface > 0
                        ? parseFloat(((assocAptSurface / associationTotalSurface) * 100).toFixed(4))
                        : 0;

                      const percent = assocAptParticipation?.type === 'percentage' ? assocAptParticipation.value : 100;
                      const multiplier = percent < 1 ? percent : (percent / 100);
                      totalWeights += assocAptCotaParte * multiplier;
                    });

                    // Calculează greutatea acestui apartament
                    const percent = participation?.type === 'percentage' ? participation.value : 100;
                    const multiplier = percent < 1 ? percent : (percent / 100);
                    const weight = cotaParte * multiplier;

                    // Redistribuie
                    if (totalWeights > 0) {
                      aptAmount = (weight / totalWeights) * amountToRedistribute;
                    }
                  }
                }
              }


              // Aplică participarea (doar pentru consumption și individual, cotaParte se calculează cu reponderare mai sus)
              if (config.distributionType !== 'cotaParte') {
                if (participation?.type === 'percentage' && participation?.value !== undefined) {
                  const percent = participation.value < 1 ? participation.value : (participation.value / 100);
                  aptAmount = aptAmount * percent;
                } else if (participation?.type === 'fixed') {
                  const fixedMode = config.fixedAmountMode || 'apartment';
                  if (fixedMode === 'person') {
                    aptAmount = parseFloat(participation.value || 0) * (apt.persons || 0);
                  } else {
                    aptAmount = parseFloat(participation.value || 0);
                  }
                }
              }

              stairIntroducedAmount += aptAmount;
            }
          });

          // Adaugă diferența dacă există (pentru isUnitBased)
          if (expense?.isUnitBased && calculateExpenseDifferences) {
            const expenseDifferences = calculateExpenseDifferences(expense, allApts);
            const totalDifference = stairApts.reduce((sum, apt) => sum + (expenseDifferences[apt.id] || 0), 0);
            stairIntroducedAmount += totalDifference;
          }

          return stairIntroducedAmount;
        }

        // Pentru celelalte tipuri (apartment, person), calculează suma totală pentru scara respectivă
        console.log(`  Calculez suma pentru apartment/person...`);
        let stairTotalAmount = 0;
        stairApts.forEach(apt => {
          const participation = config?.apartmentParticipation?.[apt.id];
          if (participation?.type !== 'excluded') {
            const aptAmount = calculateApartmentAmount(expense, apt, totalAssociationAmount, allApts);
            console.log(`    Apt ${apt.number}: ${aptAmount.toFixed(2)} RON`);
            stairTotalAmount += aptAmount;
          }
        });

        console.log(`  TOTAL pentru scară: ${stairTotalAmount.toFixed(2)} RON`);
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

    // Cheltuielile totale sunt relevante pentru toate tab-urile
    if (receptionMode === 'per_association') return true;

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
    let totalDistribuit = 0;
    let allKnowExpectedAmount = true;

    filteredExpenses.forEach(expense => {
      const config = getExpenseConfig(expense.name);

      // Determină receptionMode
      let receptionMode = expense.receptionMode || 'total';

      // Determină dacă știm suma așteptată pentru această cheltuială
      let knowsExpectedAmount = filterInfo.type === 'all';
      if (!knowsExpectedAmount && filterInfo.type === 'stair') {
        if (receptionMode === 'per_stair') {
          knowsExpectedAmount = true;
        } else if (receptionMode === 'per_block') {
          const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
          // Pentru cotaParte, știm întotdeauna suma pentru scară
          if (config.distributionType === 'cotaParte') {
            knowsExpectedAmount = true;
          } else {
            knowsExpectedAmount = blockStairs.length === 1;
          }
        }
      }

      // Calculează suma introdusă
      const allApts = getAssociationApartments();
      const apartments = filterInfo.type === 'stair'
        ? allApts.filter(apt => apt.stairId === filterInfo.stairId)
        : allApts;

      const apartmentParticipations = config.apartmentParticipation || {};

      let sumaIntrodusa = 0;
      if (config.distributionType === 'consumption' && expense.consumption) {
        // Calculează suma cu participări aplicate
        apartments.forEach(apt => {
          const participation = apartmentParticipations[apt.id];
          let aptAmount = parseFloat(expense.consumption[apt.id] || 0) * (expense.unitPrice || 0);

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

          sumaIntrodusa += aptAmount;
        });
      } else if (config.distributionType === 'individual' && expense.individualAmounts) {
        // Calculează suma cu participări aplicate
        apartments.forEach(apt => {
          const participation = apartmentParticipations[apt.id];
          let aptAmount = parseFloat(expense.individualAmounts[apt.id] || 0);

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

          sumaIntrodusa += aptAmount;
        });
      } else {
        // Pentru apartment/person, suma introdusă este egală cu suma așteptată (calculată)
        sumaIntrodusa = getRelevantAmount(expense);
      }

      // Calculează diferența distribuită pentru această cheltuială
      let sumaDistribuita = sumaIntrodusa;
      if (expense?.isUnitBased && calculateExpenseDifferences) {
        const allApartments = getAssociationApartments();
        const expenseDifferences = calculateExpenseDifferences(expense, allApartments);
        const totalDifference = apartments.reduce((sum, apt) => sum + (expenseDifferences[apt.id] || 0), 0);
        sumaDistribuita = sumaIntrodusa + totalDifference;
      }

      // Calculează suma așteptată pentru această cheltuială
      let sumaAsteptata = 0;
      if (knowsExpectedAmount) {
        sumaAsteptata = getRelevantAmount(expense);
      }

      // Verifică dacă cheltuiala este complet distribuită (balanced)
      const isFullyDistributed = knowsExpectedAmount && Math.abs(sumaDistribuita - sumaAsteptata) < 0.01;

      // Adaugă la totaluri:
      // - TOATE cheltuielile individual (chiar dacă sunt balansate)
      // - Cheltuielile apartment/person/cotaParte/consumption doar dacă NU sunt balansate
      const shouldInclude = config.distributionType === 'individual' || !isFullyDistributed;

      console.log(`Cheltuială: ${expense.name}`);
      console.log(`  Tip: ${config.distributionType}`);
      console.log(`  Suma introdusă: ${sumaIntrodusa.toFixed(2)}`);
      console.log(`  Suma așteptată: ${sumaAsteptata.toFixed(2)}`);
      console.log(`  Suma distribuită: ${sumaDistribuita.toFixed(2)}`);
      console.log(`  Knows expected: ${knowsExpectedAmount}`);
      console.log(`  Is fully distributed: ${isFullyDistributed}`);
      console.log(`  Should include: ${shouldInclude}`);
      console.log(`  Diferență: ${(sumaIntrodusa - sumaAsteptata).toFixed(2)}`);

      if (shouldInclude) {
        totalIntrodus += sumaIntrodusa;
        totalDistribuit += sumaDistribuita;
        if (knowsExpectedAmount) {
          totalAsteptat += sumaAsteptata;
        } else {
          allKnowExpectedAmount = false;
        }
      }
    });

    return { totalIntrodus, totalAsteptat, totalDistribuit, allKnowExpectedAmount };
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

          {/* Badge-uri pentru status distribuție */}
          {totals.allKnowExpectedAmount ? (() => {
            const diferenta = totals.totalIntrodus - totals.totalAsteptat;
            const diferentaDistribuit = totals.totalDistribuit - totals.totalAsteptat;
            // Fără TOLERANCE - afișăm diferență doar când există
            const hasDifference = Math.abs(diferenta) >= 0.01;
            const isBalanced = Math.abs(diferentaDistribuit) < 0.01;

            // Afișează diferența când există
            if (hasDifference) {
              return (
                <div className="mt-1 text-xs font-medium px-2 py-1 rounded bg-orange-100 text-orange-700">
                  ⚠ Diferență: {diferenta > 0 ? '+' : ''}{diferenta.toFixed(2)} RON
                  {diferenta < 0 ? ' (lipsesc)' : ' (mai mult)'}
                </div>
              );
            }

            // Badge verde pentru total distribuit - când e balansat și există diferență distribuită
            if (isBalanced && Math.abs(totals.totalDistribuit - totals.totalIntrodus) >= 0.01) {
              return (
                <div className="mt-1 text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700">
                  ✓ Total distribuit: {totals.totalDistribuit.toFixed(2)} RON
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

            // IMPORTANT: Pentru afișaj, folosim receptionMode ORIGINAL (cum a fost efectiv distribuită)
            // NU folosim expenseEntryMode din configurație pentru afișaj!
            const actualReceptionMode = expense.receptionMode || 'total';

            // Pentru calcule interne, folosim expenseEntryMode din configurație
            let receptionMode = actualReceptionMode;
            if (expense.expenseEntryMode) {
              if (expense.expenseEntryMode === 'building') receptionMode = 'per_block';
              else if (expense.expenseEntryMode === 'staircase') receptionMode = 'per_stair';
              else if (expense.expenseEntryMode === 'per_association') receptionMode = 'total';
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
                        <h4 className="font-semibold text-base text-gray-900 px-2 py-1 -ml-2 rounded inline-block">
                          {expense.name}
                        </h4>
                        {/* Badge pentru status consumuri/sume individuale */}
                        {(config.distributionType === 'consumption' || config.distributionType === 'individual') && (() => {
                          const filteredApartments = getFilteredApartments();
                          const status = getExpenseStatus(
                            expense.name,
                            (expenseTypeName) => expense, // getDistributedExpense
                            getExpenseConfig,
                            filteredApartments,
                            currentSheet
                          );
                          return (
                            <div className="mt-1">
                              <ExpenseStatusBadge status={status} isConsumption={config.distributionType === 'consumption'} />
                            </div>
                          );
                        })()}
                      </div>

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
                            {config.distributionType === "cotaParte" && "Pe cotă parte indiviză"}
                          </span>
                        </div>

                        {/* Linia 2: Introducere sume - folosește actualReceptionMode pentru afișaj corect */}
                        <div className="flex items-center gap-3 text-gray-600">
                          <span className="font-medium">Sume:</span>
                          {actualReceptionMode === 'per_association' && <span>Pe asociație</span>}
                          {actualReceptionMode === 'per_block' && <span>Pe bloc</span>}
                          {actualReceptionMode === 'per_stair' && <span>Pe scară</span>}
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

                        {/* Linia 4: Factură (dacă există) */}
                        {(() => {
                          const invoice = getInvoiceForExpense?.(expense);
                          if (!invoice) return null;

                          return (
                            <div className="flex items-center gap-3 text-gray-600 pt-1 border-t border-gray-200 mt-1">
                              <span className="font-medium">Factură:</span>
                              <span className="text-indigo-600 font-medium">
                                {invoice.supplierName && `${invoice.supplierName} • `}
                                Nr. {invoice.invoiceNumber}
                                {invoice.invoiceDate && ` • ${new Date(invoice.invoiceDate).toLocaleDateString('ro-RO')}`}
                                {invoice.invoiceAmount && ` • ${parseFloat(invoice.invoiceAmount).toFixed(2)} RON`}
                              </span>
                            </div>
                          );
                        })()}
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
                                // Pentru cotaParte, apartment și person, știm întotdeauna suma pentru scară
                                // (getRelevantAmount calculează corect suma pe scară prin reponderare)
                                if (config.distributionType === 'cotaParte' ||
                                    config.distributionType === 'apartment' ||
                                    config.distributionType === 'person') {
                                  knowsExpectedAmount = true;
                                } else {
                                  // Pentru consumption/individual, știm suma doar dacă blocul are o singură scară
                                  knowsExpectedAmount = blockStairs.length === 1;
                                }
                              } else if (receptionMode === 'per_association') {
                                // Pentru cheltuieli pe asociație:
                                // - apartment/person/cotaParte: ȘTIM suma (reponderare automată)
                                // - consumption/individual: calculăm din introduceri
                                if (config.distributionType === 'apartment' ||
                                    config.distributionType === 'person' ||
                                    config.distributionType === 'cotaParte' ||
                                    config.distributionType === 'consumption' ||
                                    config.distributionType === 'individual') {
                                  knowsExpectedAmount = true;
                                }
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

                                // Adaugă diferența la suma afișată (dacă există)
                                if (expense?.isUnitBased && calculateExpenseDifferences) {
                                  const allApts = getAssociationApartments();
                                  const expenseDifferences = calculateExpenseDifferences(expense, allApts);
                                  const totalDifferentaScara = nonExcludedApartments.reduce((sum, apt) =>
                                    sum + (expenseDifferences[apt.id] || 0), 0
                                  );
                                  amountToDisplay += totalDifferentaScara;
                                }

                                return `${amountToDisplay.toFixed(2)} RON`;
                              }
                              return `${relevantAmount.toFixed(2)} RON`;
                            }

                            // Dacă NU știi suma așteptată, afișează suma introdusă CU PARTICIPĂRI
                            const filteredApartments = getFilteredApartments();
                            const apartmentParticipations = config.apartmentParticipation || {};

                            let amountToDisplay = 0;
                            if (config.distributionType === 'consumption') {
                              const dataObject = expense.consumption || {};
                              filteredApartments.forEach(apt => {
                                const participation = apartmentParticipations[apt.id];
                                let aptAmount = parseFloat(dataObject[apt.id] || 0) * (expense.unitPrice || 0);

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

                                amountToDisplay += aptAmount;
                              });
                            } else if (config.distributionType === 'individual') {
                              const dataObject = expense.individualAmounts || {};
                              filteredApartments.forEach(apt => {
                                const participation = apartmentParticipations[apt.id];
                                let aptAmount = parseFloat(dataObject[apt.id] || 0);

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

                                amountToDisplay += aptAmount;
                              });
                            }

                            // Adaugă diferența la suma afișată (dacă există)
                            if (expense?.isUnitBased && calculateExpenseDifferences) {
                              const allApts = getAssociationApartments();
                              const expenseDifferences = calculateExpenseDifferences(expense, allApts);
                              const totalDifferentaScara = filteredApartments.reduce((sum, apt) =>
                                sum + (expenseDifferences[apt.id] || 0), 0
                              );
                              amountToDisplay += totalDifferentaScara;
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

                        const dataObject = expense.consumption || {};

                        // Calculează total introdus cu participări aplicate (la fel ca în ConsumptionInput)
                        let totalIntrodus = 0;
                        filteredApartments.forEach(apt => {
                          const participation = apartmentParticipations[apt.id];
                          let aptAmount = parseFloat(dataObject[apt.id] || 0) * (expense.unitPrice || 0);

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

                          totalIntrodus += aptAmount;
                        });

                        // Determină dacă știi suma așteptată pentru scara filtrată
                        const filterInfo = getFilterInfo();
                        let knowsExpectedAmount = filterInfo.type === 'all';
                        if (!knowsExpectedAmount && filterInfo.type === 'stair') {
                          if (receptionMode === 'per_stair') {
                            knowsExpectedAmount = true;
                          } else if (receptionMode === 'per_block') {
                            const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
                            // Pentru cotaParte, știm întotdeauna suma pentru scară
                            if (config.distributionType === 'cotaParte') {
                              knowsExpectedAmount = true;
                            } else {
                              knowsExpectedAmount = blockStairs.length === 1;
                            }
                          }
                        }

                        const diferenta = totalIntrodus - relevantAmount;
                        // Fără TOLERANCE - badge verde doar când diferență = 0
                        const hasDifference = Math.abs(diferenta) >= 0.01;
                        const diferentaMessage = receptionMode === 'per_association' ? 'Diferență pe asociație' : 'Diferență pe bloc';

                        // Badge verde DOAR când: știi suma așteptată, NU există diferență ȘI ai introdus ceva (nu 0)
                        const shouldBeGreen = knowsExpectedAmount && !hasDifference && totalIntrodus > 0;

                        // Calculează dacă cheltuiala este complet distribuită (similar cu logica din calculateTotals)
                        let isFullyDistributed = false;
                        if (knowsExpectedAmount) {
                          let sumaDistribuita = totalIntrodus;
                          if (expense?.isUnitBased && calculateExpenseDifferences) {
                            const allApartments = getAssociationApartments();
                            const expenseDifferences = calculateExpenseDifferences(expense, allApartments);
                            const totalDifference = filteredApartments.reduce((sum, apt) => sum + (expenseDifferences[apt.id] || 0), 0);
                            sumaDistribuita = totalIntrodus + totalDifference;
                          }
                          isFullyDistributed = Math.abs(sumaDistribuita - relevantAmount) < 0.01;
                        }

                        return (
                          <div className="flex flex-col items-end gap-1 mt-1">
                            {/* Total introdus */}
                            {shouldBeGreen ? (
                              <div className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700">
                                ✓ Total introdus: {totalIntrodus.toFixed(2)} RON
                              </div>
                            ) : (
                              <div className="text-xs font-semibold text-blue-600">
                                Total introdus: {totalIntrodus.toFixed(2)} RON
                              </div>
                            )}

                            {/* Diferență - badge portocaliu DOAR pentru individual, text portocaliu pentru consumption */}
                            {knowsExpectedAmount ? (
                              // Știi suma așteptată - afișează diferența
                              hasDifference && (
                                config.distributionType === 'individual' ? (
                                  // Individual: Badge portocaliu
                                  <div className="text-xs font-medium px-2 py-1 rounded bg-orange-100 text-orange-700">
                                    ⚠ Diferență: {diferenta > 0 ? '+' : ''}{diferenta.toFixed(2)} RON {diferenta < 0 ? '(lipsesc)' : '(mai mult)'}
                                  </div>
                                ) : (
                                  // Consumption/alte tipuri: Doar text roșu, fără badge
                                  <div className="text-xs font-semibold text-red-600">
                                    ⚠ Diferență: {diferenta > 0 ? '+' : ''}{diferenta.toFixed(2)} RON {diferenta < 0 ? '(lipsesc)' : '(mai mult)'}
                                  </div>
                                )
                              )
                            ) : (
                              // NU știi suma așteptată - afișează diferența distribuită
                              expense?.isUnitBased && calculateExpenseDifferences && (() => {
                                const allApartments = getAssociationApartments();
                                const expenseDifferences = calculateExpenseDifferences(expense, allApartments);

                                // Diferența pentru apartamentele filtrate (scara curentă)
                                const totalDifferentaScara = filteredApartments.reduce((sum, apt) =>
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

                                // Verifică dacă diferența este complet distribuită
                                // Badge roșu doar dacă NU este complet distribuită
                                const isDifferenceFullyDistributed = isFullyDistributed;

                                // Pentru consumption: ÎNTOTDEAUNA text roșu fără badge
                                return Math.abs(totalDifferentaScara) >= 0.01 ? (
                                  <div className="text-xs font-semibold text-red-600">
                                    ⚠ Diferență: {totalDifferentaScara > 0 ? '-' : '+'}{Math.abs(totalDifferentaScara).toFixed(2)} RON
                                    (din {totalDifferentaGlobal > 0 ? '-' : '+'}{Math.abs(totalDifferentaGlobal).toFixed(2)} RON {diferentaContext})
                                  </div>
                                ) : null;
                              })()
                            )}

                            {/* Badge verde pentru total distribuit - doar dacă e cheltuială distribuită cu diferență */}
                            {expense?.isUnitBased && calculateExpenseDifferences && (() => {
                              const allApartments = getAssociationApartments();
                              const expenseDifferences = calculateExpenseDifferences(expense, allApartments);
                              const totalDifference = filteredApartments.reduce((sum, apt) => sum + (expenseDifferences[apt.id] || 0), 0);

                              // Calculează totalul distribuit (total introdus + diferență)
                              const totalDistribuit = totalIntrodus + totalDifference;

                              // Calculează totalul distribuit global (la nivel bloc/asociație)
                              const filterInfo = getFilterInfo();
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
                                let aptAmount = parseFloat(dataObject[apt.id] || 0) * (expense.unitPrice || 0);

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
                              if (knowsExpectedAmount) {
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

                      {/* Warning-uri verticale pentru cheltuieli individuale */}
                      {config.distributionType === 'individual' && (() => {
                        const filterInfo = getFilterInfo();
                        const apartmentParticipations = config.apartmentParticipation || {};
                        const dataObject = expense.individualAmounts || {};
                        const allApts = getAssociationApartments();
                        const filteredApts = getFilteredApartments();

                        // TOTAL INTRODUS: calculează pentru apartamentele FILTRATE (scara curentă sau toate)
                        const nonExcludedFilteredApts = filteredApts.filter(apt => {
                          const participation = apartmentParticipations[apt.id];
                          return participation?.type !== 'excluded';
                        });

                        let totalIntrodusFiltered = 0;
                        nonExcludedFilteredApts.forEach(apt => {
                          totalIntrodusFiltered += parseFloat(dataObject[apt.id] || 0);
                        });

                        // DIFERENȚĂ: calculează la nivelul la care știm suma așteptată
                        let apartmentsForDifference;
                        let relevantAmount;
                        let diferentaContext;

                        // Determină nivelul la care știm suma așteptată
                        if (receptionMode === 'per_stair') {
                          // Știm suma pe scară
                          if (filterInfo.type === 'stair') {
                            apartmentsForDifference = allApts.filter(apt => apt.stairId === filterInfo.stairId);
                            relevantAmount = parseFloat(expense.amountsByStair?.[filterInfo.stairId] || 0);
                            diferentaContext = 'pe scară';
                          } else {
                            // Filtru "Toate" - raportăm la nivel asociație (suma tuturor scărilor)
                            apartmentsForDifference = allApts;
                            relevantAmount = parseFloat(expense.amount || 0);
                            diferentaContext = 'pe asociație';
                          }
                        } else if (receptionMode === 'per_block') {
                          // Știm suma pe bloc
                          if (filterInfo.type === 'stair') {
                            // Suntem pe o scară, dar suma e pe bloc - raportăm la nivel bloc
                            const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
                            const blockStairIds = blockStairs.map(s => s.id);
                            apartmentsForDifference = allApts.filter(apt => blockStairIds.includes(apt.stairId));
                            relevantAmount = parseFloat(expense.amountsByBlock?.[filterInfo.blockId] || 0);
                            diferentaContext = 'pe bloc';
                          } else {
                            // Filtru "Toate" - raportăm la nivel asociație (suma tuturor blocurilor)
                            apartmentsForDifference = allApts;
                            relevantAmount = parseFloat(expense.amount || 0);
                            diferentaContext = 'pe asociație';
                          }
                        } else {
                          // receptionMode === 'per_association' - știm suma pe asociație
                          apartmentsForDifference = allApts;
                          relevantAmount = parseFloat(expense.amount || 0);
                          diferentaContext = 'pe asociație';
                        }

                        // Exclude apartamentele excluse din calculul diferenței
                        const nonExcludedApartmentsForDiff = apartmentsForDifference.filter(apt => {
                          const participation = apartmentParticipations[apt.id];
                          return participation?.type !== 'excluded';
                        });

                        // Calculează total introdus la nivelul diferenței
                        let totalIntrodusForDiff = 0;
                        nonExcludedApartmentsForDiff.forEach(apt => {
                          totalIntrodusForDiff += parseFloat(dataObject[apt.id] || 0);
                        });

                        const diferenta = totalIntrodusForDiff - relevantAmount;
                        // Fără TOLERANCE
                        const hasDifference = Math.abs(diferenta) >= 0.01;

                        return (
                          <div className="flex flex-col items-end gap-1 mt-1">
                            {/* Badge total introdus - afișează suma filtrată */}
                            <div className="text-xs font-semibold text-blue-600">
                              Total introdus: {totalIntrodusFiltered.toFixed(2)} RON
                            </div>

                            {/* Badge diferență - afișează diferența la nivel asociație/bloc/scară */}
                            {hasDifference && (
                              <div className="text-xs font-medium px-2 py-1 rounded bg-orange-100 text-orange-700">
                                ⚠ Diferență {diferentaContext}: {diferenta > 0 ? '+' : ''}{diferenta.toFixed(2)} RON {diferenta < 0 ? '(lipsesc)' : '(mai mult)'}
                              </div>
                            )}

                            {/* Badge total distribuit - verde (când diferența este OK) */}
                            {!hasDifference && totalIntrodusForDiff > 0 && (
                              <div className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700">
                                ✓ Total distribuit: {totalIntrodusFiltered.toFixed(2)} RON
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Badge pentru apartment/person/cotaParte */}
                      {(config.distributionType === 'apartment' || config.distributionType === 'person' || config.distributionType === 'cotaParte') && (() => {
                        const filterInfo = getFilterInfo();

                        // Determină contextul pentru badge
                        let badgeText = '';
                        let totalAmount = relevantAmount;

                        if (filterInfo.type === 'all') {
                          // Tab "Toate"
                          if (receptionMode === 'per_association') {
                            badgeText = `✓ Total distribuit: ${totalAmount.toFixed(2)} RON`;
                          } else if (receptionMode === 'per_block') {
                            // Calculează totalul pe asociație
                            const totalAssoc = blocks?.reduce((sum, block) =>
                              sum + parseFloat(expense.amountsByBlock?.[block.id] || 0), 0) || 0;
                            badgeText = `✓ Total distribuit: ${totalAssoc.toFixed(2)} RON`;
                          } else if (receptionMode === 'per_stair') {
                            // Calculează totalul pe asociație
                            const totalAssoc = stairs?.reduce((sum, stair) =>
                              sum + parseFloat(expense.amountsByStair?.[stair.id] || 0), 0) || 0;
                            badgeText = `✓ Total distribuit: ${totalAssoc.toFixed(2)} RON`;
                          }
                        } else if (filterInfo.type === 'stair') {
                          // Tab scară specifică
                          if (receptionMode === 'per_association') {
                            const totalAssoc = expense.isUnitBased ? expense.billAmount : expense.amount;
                            badgeText = `✓ Total distribuit: ${totalAmount.toFixed(2)} RON (din ${totalAssoc.toFixed(2)} RON pe asociație)`;
                          } else if (receptionMode === 'per_block' && filterInfo.blockId && expense.amountsByBlock) {
                            const blockTotal = parseFloat(expense.amountsByBlock[filterInfo.blockId] || 0);
                            const block = blocks?.find(b => b.id === filterInfo.blockId);
                            badgeText = `✓ Total distribuit: ${totalAmount.toFixed(2)} RON (din ${blockTotal.toFixed(2)} RON pe ${block?.name || 'bloc'})`;
                          } else if (receptionMode === 'per_stair') {
                            badgeText = `✓ Total distribuit: ${totalAmount.toFixed(2)} RON`;
                          }
                        }

                        return badgeText ? (
                          <div className="flex flex-col items-end gap-1 mt-1">
                            <div className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700">
                              {badgeText}
                            </div>
                          </div>
                        ) : null;
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
                    {/* Card detalii factură (dacă există) */}
                    {(() => {
                      const invoice = getInvoiceForExpense?.(expense);
                      if (!invoice) return null;

                      return (
                        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                          <h5 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Detalii factură
                          </h5>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {invoice.supplierName && (
                              <div>
                                <div className="text-gray-600 font-medium">Furnizor:</div>
                                <div className="text-gray-900">{invoice.supplierName}</div>
                              </div>
                            )}
                            <div>
                              <div className="text-gray-600 font-medium">Număr factură:</div>
                              <div className="text-gray-900">{invoice.invoiceNumber}</div>
                            </div>
                            {invoice.invoiceAmount && (
                              <div>
                                <div className="text-gray-600 font-medium">Suma factură:</div>
                                <div className="text-gray-900 font-semibold">{parseFloat(invoice.invoiceAmount).toFixed(2)} RON</div>
                              </div>
                            )}
                            {invoice.invoiceDate && (
                              <div>
                                <div className="text-gray-600 font-medium">Data emiterii:</div>
                                <div className="text-gray-900">{new Date(invoice.invoiceDate).toLocaleDateString('ro-RO')}</div>
                              </div>
                            )}
                            {invoice.dueDate && (
                              <div>
                                <div className="text-gray-600 font-medium">Data scadenței:</div>
                                <div className="text-gray-900">{new Date(invoice.dueDate).toLocaleDateString('ro-RO')}</div>
                              </div>
                            )}
                            {invoice.notes && (
                              <div className="col-span-2">
                                <div className="text-gray-600 font-medium">Observații:</div>
                                <div className="text-gray-900">{invoice.notes}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Card detalii pentru cheltuieli pe asociație (receptionMode === 'per_association') */}
                    {receptionMode === 'per_association' && getFilterInfo().type === 'all' && (
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

                              // Calculează suma în funcție de tipul de distribuție și participare
                              let amountInRon = 0;

                              if (p?.type === 'fixed') {
                                // Pentru sumă fixă: folosește valoarea fixă setată
                                const fixedMode = config.fixedAmountMode || 'apartment';
                                if (fixedMode === 'person') {
                                  amountInRon = parseFloat(p.value || 0) * (apt.persons || 0);
                                } else {
                                  amountInRon = parseFloat(p.value || 0);
                                }
                              } else {
                                // Pentru alte tipuri de participare: calculează suma normală
                                if (config.distributionType === 'consumption' && expense.consumption) {
                                  // Pentru consum: consum × preț unitar
                                  amountInRon = parseFloat(expense.consumption[apt.id] || 0) * (expense.unitPrice || 0);

                                  // Aplică participarea procentuală pentru consumption
                                  if (p?.type === 'percentage' && p?.value !== undefined) {
                                    const percent = p.value < 1 ? p.value : (p.value / 100);
                                    amountInRon = amountInRon * percent;
                                  }
                                } else if (config.distributionType === 'individual' && expense.individualAmounts) {
                                  // Pentru sume individuale: direct suma introdusă
                                  amountInRon = parseFloat(expense.individualAmounts[apt.id] || 0);

                                  // Aplică participarea procentuală pentru individual
                                  if (p?.type === 'percentage' && p?.value !== undefined) {
                                    const percent = p.value < 1 ? p.value : (p.value / 100);
                                    amountInRon = amountInRon * percent;
                                  }
                                } else {
                                  // Pentru apartment/person/cotaParte: folosește funcția de calcul
                                  // IMPORTANT: calculateApartmentAmount DEJA aplică reponderarea cu procente!
                                  // NU mai aplicăm procentul aici pentru a evita aplicarea dublă.
                                  amountInRon = calculateApartmentAmount(expense, apt, relevantAmount, allApts);
                                }
                              }

                              return {
                                ...apt,
                                participationType: p?.type,
                                participationValue: p?.value,
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

                            // Calculează totalul introdus pentru consumption și individual (Pe asociație) cu participări aplicate
                            let totalIntrodusForAssoc = 0;
                            if (config.distributionType === 'consumption' && expense.consumption) {
                              allApts.forEach(apt => {
                                const participation = config.apartmentParticipation?.[apt.id];
                                let aptAmount = parseFloat(expense.consumption[apt.id] || 0) * (expense.unitPrice || 0);

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

                                totalIntrodusForAssoc += aptAmount;
                              });
                            } else if (config.distributionType === 'individual' && expense.individualAmounts) {
                              allApts.forEach(apt => {
                                const participation = config.apartmentParticipation?.[apt.id];
                                let aptAmount = parseFloat(expense.individualAmounts[apt.id] || 0);

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

                                totalIntrodusForAssoc += aptAmount;
                              });
                            }

                            return (
                              <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                                <div className="font-medium text-indigo-900">Pe asociație</div>
                                <div className="text-xl font-bold text-indigo-700">{relevantAmount.toFixed(2)} RON</div>

                                {/* Total introdus și diferență - DOAR pentru CONSUM */}
                                {config.distributionType === 'consumption' && (() => {
                                  const diferenta = totalIntrodusForAssoc - relevantAmount;
                                  // Fără TOLERANCE
                                  const hasDifference = Math.abs(diferenta) >= 0.01;

                                  // Calculează total distribuit dacă e cheltuială cu isUnitBased
                                  let totalDistribuit = totalIntrodusForAssoc;
                                  if (expense?.isUnitBased && calculateExpenseDifferences) {
                                    const expenseDifferences = calculateExpenseDifferences(expense, allApts);
                                    const totalDifference = allApts.reduce((sum, apt) => sum + (expenseDifferences[apt.id] || 0), 0);
                                    totalDistribuit = totalIntrodusForAssoc + totalDifference;
                                  }

                                  const isBalanced = Math.abs(totalDistribuit - relevantAmount) < 0.01;

                                  return (
                                    <>
                                      <div className="text-xs text-blue-600 font-semibold mt-1">
                                        Total introdus: {totalIntrodusForAssoc.toFixed(2)} RON
                                      </div>
                                      {hasDifference && (
                                        <div className="text-xs text-red-600 font-semibold mt-0.5">
                                          ⚠ Diferență: {diferenta > 0 ? '+' : ''}{diferenta.toFixed(2)} RON
                                        </div>
                                      )}
                                      {/* Badge verde pentru total distribuit */}
                                      {expense?.isUnitBased && calculateExpenseDifferences && isBalanced && Math.abs(totalDistribuit - totalIntrodusForAssoc) >= 0.01 && (
                                        <div className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700 mt-0.5 inline-block">
                                          ✓ Total distribuit: {totalDistribuit.toFixed(2)} RON
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}

                                {/* Total introdus și diferență pentru individual */}
                                {config.distributionType === 'individual' && (() => {
                                  const dataObject = expense.individualAmounts || {};
                                  const apartmentParticipations = config.apartmentParticipation || {};

                                  // Calculează total introdus pe asociație
                                  const nonExcludedApts = allApts.filter(apt => {
                                    const participation = apartmentParticipations[apt.id];
                                    return participation?.type !== 'excluded';
                                  });

                                  let totalIntrodus = 0;
                                  nonExcludedApts.forEach(apt => {
                                    totalIntrodus += parseFloat(dataObject[apt.id] || 0);
                                  });

                                  // Calculează diferența
                                  const diferenta = totalIntrodus - relevantAmount;
                                  // Fără TOLERANCE
                                  const hasDifference = Math.abs(diferenta) >= 0.01;

                                  return (
                                    <>
                                      <div className="text-xs text-blue-600 font-semibold mt-1">
                                        Total introdus: {totalIntrodus.toFixed(2)} RON
                                      </div>

                                      {/* Diferență - text roșu */}
                                      {hasDifference && (
                                        <div className="text-xs text-red-600 font-semibold mt-0.5">
                                          ⚠ Diferență: {diferenta > 0 ? '+' : ''}{diferenta.toFixed(2)} RON
                                        </div>
                                      )}

                                      {/* Badge verde pentru total distribuit (când diferența este OK) */}
                                      {!hasDifference && totalIntrodus > 0 && (
                                        <div className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700 mt-0.5 inline-block">
                                          ✓ Total distribuit: {totalIntrodus.toFixed(2)} RON
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}

                                {/* Badge verde pentru cotaParte pe asociație */}
                                {config.distributionType === 'cotaParte' && (
                                  <div className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700 mt-1 inline-block">
                                    ✓ Total distribuit: {relevantAmount.toFixed(2)} RON
                                  </div>
                                )}

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

                                {/* Apartamente incomplete (numai pentru individual) */}
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

                                  // Afișează doar dacă există apartamente incomplete
                                  return (
                                    <>
                                      {incompleteApts.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-indigo-300">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            {/* Badge: Apartamente incomplete */}
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
                                          const rawValue = parseFloat(apt.participationValue) || 0;
                                          const percentValue = rawValue < 1 ? (rawValue * 100) : rawValue;
                                          displayText = `${percentValue.toFixed(0)}%: ${amountPerPerson.toFixed(2)} RON/pers`;
                                        } else {
                                          const rawValue = parseFloat(apt.participationValue) || 0;
                                          const percentValue = rawValue < 1 ? (rawValue * 100) : rawValue;
                                          displayText = `${percentValue.toFixed(0)}%: ${apt.amountInRon.toFixed(2)} RON`;
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
                    {receptionMode === 'per_association' && getFilterInfo().type === 'stair' && (
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
                            // Pentru apartment/person/cotaParte cu suma pe asociație sau pe bloc, folosim getRelevantAmount()
                            // care calculează corect suma pentru scară cu participări aplicate
                            let stairAmount = 0;

                            if ((config.distributionType === 'apartment' || config.distributionType === 'person' || config.distributionType === 'cotaParte') &&
                                (receptionMode === 'per_association' || receptionMode === 'per_block')) {
                              // Folosește getRelevantAmount() care calculează corect suma pentru scară
                              stairAmount = getRelevantAmount(expense);
                            } else {
                              // Pentru alte tipuri, calculează local
                              stairApts.forEach(apt => {
                                const participation = config.apartmentParticipation?.[apt.id];
                                if (participation?.type !== 'excluded') {
                                  let aptAmount = 0;

                                  if (config.distributionType === 'consumption' && expense.consumption) {
                                    // Pentru consum: consum × preț unitar
                                    aptAmount = parseFloat(expense.consumption[apt.id] || 0) * (expense.unitPrice || 0);
                                  } else if (config.distributionType === 'individual' && expense.individualAmounts) {
                                    // Pentru sume individuale: direct suma introdusă
                                    aptAmount = parseFloat(expense.individualAmounts[apt.id] || 0);
                                  } else {
                                    // Pentru apartment/person: folosește funcția de calcul
                                    const totalAssociationAmount = expense.isUnitBased ? expense.billAmount : expense.amount;
                                    aptAmount = calculateApartmentAmount(expense, apt, totalAssociationAmount, allApts);
                                  }

                                  // Aplică participarea (DOAR pentru consumption și individual)
                                  if (config.distributionType !== 'cotaParte') {
                                    if (participation?.type === 'percentage' && participation?.value !== undefined) {
                                      const percent = participation.value < 1 ? participation.value : (participation.value / 100);
                                      aptAmount = aptAmount * percent;
                                    } else if (participation?.type === 'fixed') {
                                      const fixedMode = config.fixedAmountMode || 'apartment';
                                      if (fixedMode === 'person') {
                                        aptAmount = parseFloat(participation.value || 0) * (apt.persons || 0);
                                      } else {
                                        aptAmount = parseFloat(participation.value || 0);
                                      }
                                    }
                                  }

                                  stairAmount += aptAmount;
                                }
                              });
                            }

                            // NU adăugăm diferența aici - o vom adăuga mai târziu în totalDistribuitScara

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
                              let totalAmountForCalculation = stairAmount;

                              if (receptionMode === 'per_block' && filterInfo.blockId) {
                                // Pentru per_block, folosește toate apartamentele din bloc
                                const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
                                const blockStairIds = blockStairs.map(s => s.id);
                                apartmentsForCalculation = allApts.filter(apt => blockStairIds.includes(apt.stairId));
                                // Suma pentru bloc
                                totalAmountForCalculation = receptionMode === 'per_block' && expense.amountsByBlock
                                  ? parseFloat(expense.amountsByBlock[filterInfo.blockId] || 0)
                                  : stairAmount;
                              } else if (receptionMode === 'per_association') {
                                // Pentru asociație, folosește TOATE apartamentele și suma pe asociație
                                apartmentsForCalculation = allApts;
                                totalAmountForCalculation = expense.isUnitBased ? expense.billAmount : expense.amount;
                              }

                              integralAmountForStair = calculateApartmentAmount(expense, sampleIntegralApt, totalAmountForCalculation, apartmentsForCalculation);

                              if (config.distributionType === 'person' && sampleIntegralApt.persons > 0) {
                                integralAmountForStair = integralAmountForStair / sampleIntegralApt.persons;
                              }
                            }

                            // Calculează sumele pentru apartamentele parțiale
                            let apartmentsForPartialCalculation = stairApts;
                            let totalAmountForPartialCalculation = stairAmount;

                            if (receptionMode === 'per_block' && filterInfo.blockId) {
                              const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
                              const blockStairIds = blockStairs.map(s => s.id);
                              apartmentsForPartialCalculation = allApts.filter(apt => blockStairIds.includes(apt.stairId));
                              totalAmountForPartialCalculation = receptionMode === 'per_block' && expense.amountsByBlock
                                ? parseFloat(expense.amountsByBlock[filterInfo.blockId] || 0)
                                : stairAmount;
                            } else if (receptionMode === 'per_association') {
                              // Pentru asociație, folosește TOATE apartamentele și suma pe asociație
                              apartmentsForPartialCalculation = allApts;
                              totalAmountForPartialCalculation = expense.isUnitBased ? expense.billAmount : expense.amount;
                            }

                            const partialAptsWithAmounts = partialApts.map(apt => {
                              const p = config.apartmentParticipation?.[apt.id];

                              // Calculează suma în funcție de tipul de distribuție și participare
                              let amountInRon = 0;

                              if (p?.type === 'fixed') {
                                // Pentru sumă fixă: folosește valoarea fixă setată
                                const fixedMode = config.fixedAmountMode || 'apartment';
                                if (fixedMode === 'person') {
                                  amountInRon = parseFloat(p.value || 0) * (apt.persons || 0);
                                } else {
                                  amountInRon = parseFloat(p.value || 0);
                                }
                              } else {
                                // Pentru alte tipuri de participare: calculează suma normală
                                if (config.distributionType === 'consumption' && expense.consumption) {
                                  // Pentru consum: consum × preț unitar
                                  amountInRon = parseFloat(expense.consumption[apt.id] || 0) * (expense.unitPrice || 0);

                                  // Aplică participarea procentuală pentru consumption
                                  if (p?.type === 'percentage' && p?.value !== undefined) {
                                    const percent = p.value < 1 ? p.value : (p.value / 100);
                                    amountInRon = amountInRon * percent;
                                  }
                                } else if (config.distributionType === 'individual' && expense.individualAmounts) {
                                  // Pentru sume individuale: direct suma introdusă
                                  amountInRon = parseFloat(expense.individualAmounts[apt.id] || 0);

                                  // Aplică participarea procentuală pentru individual
                                  if (p?.type === 'percentage' && p?.value !== undefined) {
                                    const percent = p.value < 1 ? p.value : (p.value / 100);
                                    amountInRon = amountInRon * percent;
                                  }
                                } else {
                                  // Pentru apartment/person/cotaParte: folosește funcția de calcul
                                  // IMPORTANT: calculateApartmentAmount DEJA aplică reponderarea cu procente!
                                  // NU mai aplicăm procentul aici pentru a evita aplicarea dublă.
                                  amountInRon = calculateApartmentAmount(expense, apt, totalAmountForPartialCalculation, apartmentsForPartialCalculation);
                                }
                              }

                              return {
                                ...apt,
                                participationType: p?.type,
                                participationValue: p?.value,
                                amountInRon
                              };
                            });

                            // Calculează numărul de persoane cu participare integrală
                            const integralPersonsForStair = participatingApts.reduce((sum, apt) => sum + (apt.persons || 0), 0);

                            // Calculează totalul introdus pentru scară (FĂRĂ diferență) - pentru header și badge-uri
                            // IMPORTANT: Trebuie să fie identic cu calculul stairAmount de mai sus!
                            let totalIntrodusScara = stairAmount;

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

                            // Calculează totalul distribuit (cu diferență) pentru afișare în header
                            let totalDistribuitScara = totalIntrodusScara;
                            if (expense?.isUnitBased && calculateExpenseDifferences) {
                              const allApts = getAssociationApartments();
                              const expenseDifferences = calculateExpenseDifferences(expense, allApts);
                              const totalDifferentaScara = stairApts.reduce((sum, apt) => sum + (expenseDifferences[apt.id] || 0), 0);
                              totalDistribuitScara = totalIntrodusScara + totalDifferentaScara;
                            }

                            return (
                              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                <div className="font-medium text-purple-900">{filterInfo.blockName} - {filterInfo.stairName}</div>
                                {/* Afișăm totalul distribuit (suma după participări + diferență) */}
                                <div className="text-xl font-bold text-purple-700">
                                  {totalDistribuitScara.toFixed(2)} RON
                                </div>

                                {/* Total introdus - DOAR pentru CONSUM */}
                                {config.distributionType === 'consumption' && (() => {
                                  // totalIntrodusScara deja calculat mai sus (liniile 1891-1940)

                                  // Calculează diferența dacă există
                                  let totalDifferentaScara = 0;
                                  let totalDifferentaGlobal = 0;
                                  let totalIntrodusGlobal = 0;
                                  let totalDistribuitScara = totalIntrodusScara;
                                  let totalDistribuitGlobal = totalIntrodusScara;

                                  if (expense?.isUnitBased && calculateExpenseDifferences) {
                                    const expenseDifferences = calculateExpenseDifferences(expense, allApts);

                                    // Diferență pentru scara curentă
                                    totalDifferentaScara = stairApts
                                      .filter(apt => {
                                        const participation = config.apartmentParticipation?.[apt.id];
                                        return participation?.type !== 'excluded';
                                      })
                                      .reduce((sum, apt) => sum + (expenseDifferences[apt.id] || 0), 0);

                                    // Diferență globală (pe asociație)
                                    totalDifferentaGlobal = allApts
                                      .filter(apt => {
                                        const participation = config.apartmentParticipation?.[apt.id];
                                        return participation?.type !== 'excluded';
                                      })
                                      .reduce((sum, apt) => sum + (expenseDifferences[apt.id] || 0), 0);

                                    // Calculează total introdus global pentru asociație (cu participări aplicate)
                                    if (config.distributionType === 'consumption' && expense.consumption) {
                                      allApts.forEach(apt => {
                                        const participation = config.apartmentParticipation?.[apt.id];
                                        if (participation?.type !== 'excluded') {
                                          let aptAmount = parseFloat(expense.consumption[apt.id] || 0) * (expense.unitPrice || 0);

                                          // Aplică participarea
                                          if (participation?.type === 'percentage' && participation?.value !== undefined) {
                                            const percent = participation.value < 1 ? participation.value : (participation.value / 100);
                                            aptAmount = aptAmount * percent;
                                          } else if (participation?.type === 'fixed') {
                                            const fixedMode = config.fixedAmountMode || 'apartment';
                                            if (fixedMode === 'person') {
                                              aptAmount = parseFloat(participation.value || 0) * (apt.persons || 0);
                                            } else {
                                              aptAmount = parseFloat(participation.value || 0);
                                            }
                                          }

                                          totalIntrodusGlobal += aptAmount;
                                        }
                                      });
                                    } else if (config.distributionType === 'individual' && expense.individualAmounts) {
                                      allApts.forEach(apt => {
                                        const participation = config.apartmentParticipation?.[apt.id];
                                        if (participation?.type !== 'excluded') {
                                          let aptAmount = parseFloat(expense.individualAmounts[apt.id] || 0);

                                          // Aplică participarea
                                          if (participation?.type === 'percentage' && participation?.value !== undefined) {
                                            const percent = participation.value < 1 ? participation.value : (participation.value / 100);
                                            aptAmount = aptAmount * percent;
                                          } else if (participation?.type === 'fixed') {
                                            const fixedMode = config.fixedAmountMode || 'apartment';
                                            if (fixedMode === 'person') {
                                              aptAmount = parseFloat(participation.value || 0) * (apt.persons || 0);
                                            } else {
                                              aptAmount = parseFloat(participation.value || 0);
                                            }
                                          }

                                          totalIntrodusGlobal += aptAmount;
                                        }
                                      });
                                    }

                                    totalDistribuitScara = totalIntrodusScara + totalDifferentaScara;
                                    totalDistribuitGlobal = totalIntrodusGlobal + totalDifferentaGlobal;
                                  }

                                  return (
                                    <>
                                      <div className="text-xs text-blue-600 font-semibold mt-1">
                                        Total introdus: {totalIntrodusScara.toFixed(2)} RON
                                      </div>

                                      {/* Diferență - text roșu fără badge */}
                                      {expense?.isUnitBased && calculateExpenseDifferences && Math.abs(totalDifferentaScara) >= 0.01 && (
                                        <div className="text-xs text-red-600 font-semibold mt-0.5">
                                          ⚠ Diferență: {totalDifferentaScara > 0 ? '-' : '+'}{Math.abs(totalDifferentaScara).toFixed(2)} RON (din {totalDifferentaGlobal > 0 ? '-' : '+'}{Math.abs(totalDifferentaGlobal).toFixed(2)} RON pe asociație)
                                        </div>
                                      )}

                                      {/* Total distribuit - badge verde */}
                                      {expense?.isUnitBased && calculateExpenseDifferences && Math.abs(totalDifferentaScara) >= 0.01 && (
                                        <div className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700 mt-0.5 inline-block">
                                          ✓ Total distribuit: {totalDistribuitScara.toFixed(2)} RON (din {totalDistribuitGlobal.toFixed(2)} RON pe asociație)
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}

                                {/* Total introdus și diferență pentru individual */}
                                {config.distributionType === 'individual' && (() => {
                                  const dataObject = expense.individualAmounts || {};
                                  const allApts = getAssociationApartments();
                                  const nonExcludedStairApts = stairApts.filter(apt => {
                                    const participation = config.apartmentParticipation?.[apt.id];
                                    return participation?.type !== 'excluded';
                                  });

                                  // Calculează total introdus pentru scara curentă
                                  let totalIntrodusStair = 0;
                                  nonExcludedStairApts.forEach(apt => {
                                    totalIntrodusStair += parseFloat(dataObject[apt.id] || 0);
                                  });

                                  // Calculează total introdus global (pe asociație)
                                  const nonExcludedAllApts = allApts.filter(apt => {
                                    const participation = config.apartmentParticipation?.[apt.id];
                                    return participation?.type !== 'excluded';
                                  });
                                  let totalIntrodusGlobal = 0;
                                  nonExcludedAllApts.forEach(apt => {
                                    totalIntrodusGlobal += parseFloat(dataObject[apt.id] || 0);
                                  });

                                  // Calculează diferența pe asociație
                                  const diferentaGlobal = totalIntrodusGlobal - parseFloat(expense.amount || 0);
                                  // Fără TOLERANCE
                                  const hasDifference = Math.abs(diferentaGlobal) >= 0.01;

                                  return (
                                    <>
                                      <div className="text-xs text-blue-600 font-semibold mt-1">
                                        Total introdus: {totalIntrodusStair.toFixed(2)} RON
                                      </div>

                                      {/* Diferență - text roșu fără badge */}
                                      {hasDifference && (
                                        <div className="text-xs text-red-600 font-semibold mt-0.5">
                                          ⚠ Diferență: {diferentaGlobal > 0 ? '+' : ''}{diferentaGlobal.toFixed(2)} RON pe asociație
                                        </div>
                                      )}

                                      {/* Total distribuit - badge verde (când diferența este OK) */}
                                      {!hasDifference && totalIntrodusGlobal > 0 && (
                                        <div className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700 mt-0.5 inline-block">
                                          ✓ Total distribuit: {totalIntrodusStair.toFixed(2)} RON (din {totalIntrodusGlobal.toFixed(2)} RON pe asociație)
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}

                                {/* Badge verde pentru cotaParte cu suma pe asociație */}
                                {config.distributionType === 'cotaParte' && receptionMode === 'per_association' && (() => {
                                  // Calculează totalul pe asociație
                                  const totalAssociationAmount = expense.isUnitBased ? expense.billAmount : expense.amount;

                                  return (
                                    <div className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700 mt-1 inline-block">
                                      ✓ Total distribuit: {stairAmount.toFixed(2)} RON (din {totalAssociationAmount.toFixed(2)} RON pe asociație)
                                    </div>
                                  );
                                })()}

                                {/* Badge verde pentru apartment/person cu suma pe asociație */}
                                {(config.distributionType === 'apartment' || config.distributionType === 'person') && receptionMode === 'per_association' && (() => {
                                  // Calculează totalul pe asociație
                                  const totalAssociationAmount = expense.isUnitBased ? expense.billAmount : expense.amount;

                                  return (
                                    <div className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700 mt-1 inline-block">
                                      ✓ Total distribuit: {stairAmount.toFixed(2)} RON (din {totalAssociationAmount.toFixed(2)} RON pe asociație)
                                    </div>
                                  );
                                })()}

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
                                <div className="text-xs text-purple-500 mt-1">
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

                                {/* Apartamente incomplete (numai pentru individual) */}
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

                                  return (
                                    <>
                                      {incompleteApts.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-purple-300">
                                          <div className="flex items-center gap-2 flex-wrap">
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
                                          const rawValue = parseFloat(apt.participationValue) || 0;
                                          const percentValue = rawValue < 1 ? (rawValue * 100) : rawValue;
                                          displayText = `${percentValue.toFixed(0)}%: ${amountPerPerson.toFixed(2)} RON/pers`;
                                        } else {
                                          const rawValue = parseFloat(apt.participationValue) || 0;
                                          const percentValue = rawValue < 1 ? (rawValue * 100) : rawValue;
                                          displayText = `${percentValue.toFixed(0)}%: ${apt.amountInRon.toFixed(2)} RON`;
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
                    {receptionMode !== 'per_association' && (
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

                              // Calculează totalul introdus pentru consumption și individual cu participări aplicate
                              let totalIntrodusForBlock = 0;
                              if (config.distributionType === 'consumption' && expense.consumption) {
                                blockApts.forEach(apt => {
                                  const participation = config.apartmentParticipation?.[apt.id];
                                  let aptAmount = parseFloat(expense.consumption[apt.id] || 0) * (expense.unitPrice || 0);

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

                                  totalIntrodusForBlock += aptAmount;
                                });
                              } else if (config.distributionType === 'individual' && expense.individualAmounts) {
                                blockApts.forEach(apt => {
                                  const participation = config.apartmentParticipation?.[apt.id];
                                  let aptAmount = parseFloat(expense.individualAmounts[apt.id] || 0);

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

                                  totalIntrodusForBlock += aptAmount;
                                });
                              }

                              return (
                                <div key={block.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="font-medium text-blue-900">{block.name}</div>
                                  <div className="text-xl font-bold text-blue-700">{blockAmount.toFixed(2)} RON</div>

                                  {/* Total introdus și diferență - DOAR pentru CONSUM */}
                                  {config.distributionType === 'consumption' && (() => {
                                    const diferenta = totalIntrodusForBlock - blockAmount;
                                    // Fără TOLERANCE
                                    const hasDifference = Math.abs(diferenta) >= 0.01;

                                    // Calculează total distribuit dacă e cheltuială cu isUnitBased
                                    let totalDistribuit = totalIntrodusForBlock;
                                    if (expense?.isUnitBased && calculateExpenseDifferences) {
                                      const allApts = getAssociationApartments();
                                      const expenseDifferences = calculateExpenseDifferences(expense, allApts);
                                      const totalDifference = blockApts.reduce((sum, apt) => sum + (expenseDifferences[apt.id] || 0), 0);
                                      totalDistribuit = totalIntrodusForBlock + totalDifference;
                                    }

                                    const isBalanced = Math.abs(totalDistribuit - blockAmount) < 0.01;

                                    return (
                                      <>
                                        <div className="text-xs text-blue-600 font-semibold mt-1">
                                          Total introdus: {totalIntrodusForBlock.toFixed(2)} RON
                                        </div>
                                        {hasDifference && (
                                          <div className="text-xs text-red-600 font-semibold mt-0.5">
                                            ⚠ Diferență: {diferenta > 0 ? '+' : ''}{diferenta.toFixed(2)} RON
                                          </div>
                                        )}
                                        {/* Badge verde pentru total distribuit */}
                                        {expense?.isUnitBased && calculateExpenseDifferences && isBalanced && Math.abs(totalDistribuit - totalIntrodusForBlock) >= 0.01 && (
                                          <div className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700 mt-0.5 inline-block">
                                            ✓ Total distribuit: {totalDistribuit.toFixed(2)} RON
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}

                                  {/* Total introdus și diferență pentru individual */}
                                  {config.distributionType === 'individual' && (() => {
                                    const diferenta = totalIntrodusForBlock - blockAmount;
                                    // Fără TOLERANCE
                                    const hasDifference = Math.abs(diferenta) >= 0.01;

                                    return (
                                      <>
                                        <div className="text-xs text-blue-600 font-semibold mt-1">
                                          Total introdus: {totalIntrodusForBlock.toFixed(2)} RON
                                        </div>
                                        {hasDifference && (
                                          <div className="text-xs text-red-600 font-semibold mt-0.5">
                                            ⚠ Diferență: {diferenta > 0 ? '+' : ''}{diferenta.toFixed(2)} RON
                                          </div>
                                        )}
                                        {/* Badge verde pentru total distribuit (când diferența este OK) */}
                                        {!hasDifference && totalIntrodusForBlock > 0 && (
                                          <div className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700 mt-0.5 inline-block">
                                            ✓ Total distribuit: {totalIntrodusForBlock.toFixed(2)} RON
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}

                                  {/* Badge verde pentru cotaParte pe bloc */}
                                  {config.distributionType === 'cotaParte' && (
                                    <div className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700 mt-1 inline-block">
                                      ✓ Total distribuit: {blockAmount.toFixed(2)} RON
                                    </div>
                                  )}

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

                                  {/* Apartamente incomplete (numai pentru individual) */}
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

                                    return (
                                      <>
                                        {incompleteApts.length > 0 && (
                                          <div className="mt-2 pt-2 border-t border-blue-300">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              {/* Badge: Apartamente incomplete */}
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

                            if ((config.distributionType === 'cotaParte')) {
                              // Pentru cotă parte indiviză, folosește getRelevantAmount()
                              stairTotalAmount = getRelevantAmount(expense);
                            } else if (blockHasOnlyOneStair && (config.distributionType === 'consumption' || config.distributionType === 'individual')) {
                              // Bloc cu o singură scară - folosește suma de pe bloc direct
                              stairTotalAmount = blockAmount;
                            } else if (config.distributionType === 'consumption' && expense.consumption) {
                              // Pentru consumption, calculează direct din consumption CU PARTICIPĂRI
                              stairApts.forEach(apt => {
                                const participation = config.apartmentParticipation?.[apt.id];
                                let aptAmount = parseFloat(expense.consumption[apt.id] || 0) * (expense.unitPrice || 0);

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

                                stairTotalAmount += aptAmount;
                              });
                            } else if (config.distributionType === 'individual' && expense.individualAmounts) {
                              // Pentru individual, calculează direct din individualAmounts CU PARTICIPĂRI
                              stairApts.forEach(apt => {
                                const participation = config.apartmentParticipation?.[apt.id];
                                let aptAmount = parseFloat(expense.individualAmounts[apt.id] || 0);

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

                                stairTotalAmount += aptAmount;
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

                            // Calculează totalul introdus și total distribuit ÎNAINTE de return pentru consum/individual
                            let totalIntrodusForStair = 0;
                            let totalDistribuit = stairTotalAmount;
                            let totalDifferenceStair = 0;

                            if ((config.distributionType === 'consumption' || config.distributionType === 'individual')) {
                              if (config.distributionType === 'consumption' && expense.consumption) {
                                stairApts.forEach(apt => {
                                  const participation = config.apartmentParticipation?.[apt.id];
                                  let aptAmount = parseFloat(expense.consumption[apt.id] || 0) * (expense.unitPrice || 0);

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

                                  totalIntrodusForStair += aptAmount;
                                });
                              } else if (config.distributionType === 'individual' && expense.individualAmounts) {
                                stairApts.forEach(apt => {
                                  const participation = config.apartmentParticipation?.[apt.id];
                                  let aptAmount = parseFloat(expense.individualAmounts[apt.id] || 0);

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

                                  totalIntrodusForStair += aptAmount;
                                });
                              }

                              // Calculează total distribuit dacă e cheltuială cu isUnitBased
                              if (expense?.isUnitBased && calculateExpenseDifferences) {
                                const allApts = getAssociationApartments();
                                const expenseDifferences = calculateExpenseDifferences(expense, allApts);

                                // Diferența pentru scara curentă
                                totalDifferenceStair = stairApts.reduce((sum, apt) => sum + (expenseDifferences[apt.id] || 0), 0);
                                totalDistribuit = totalIntrodusForStair + totalDifferenceStair;
                              }
                            }

                            return (
                              <div key={stair.id} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                <div className="font-medium text-purple-900">{block?.name} - {stair.name}</div>
                                <div className="text-xl font-bold text-purple-700">
                                  {((config.distributionType === 'consumption' || config.distributionType === 'individual') && expense?.isUnitBased
                                    ? totalDistribuit
                                    : stairTotalAmount
                                  ).toFixed(2)} RON
                                </div>

                                {/* Total introdus și diferență - DOAR pentru CONSUM */}
                                {config.distributionType === 'consumption' && (() => {
                                  // Calculăm suma așteptată pentru această scară bazat pe proporția din bloc
                                  let expectedAmountForStair = 0;
                                  if (blockHasOnlyOneStair) {
                                    expectedAmountForStair = blockAmount;
                                  } else {
                                    // Calculăm totalul introdus pentru întreg blocul CU PARTICIPĂRI
                                    let totalIntrodusForBlock = 0;
                                    if (config.distributionType === 'consumption' && expense.consumption) {
                                      blockApts.forEach(apt => {
                                        const participation = config.apartmentParticipation?.[apt.id];
                                        let aptAmount = parseFloat(expense.consumption[apt.id] || 0) * (expense.unitPrice || 0);

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

                                        totalIntrodusForBlock += aptAmount;
                                      });
                                    } else if (config.distributionType === 'individual' && expense.individualAmounts) {
                                      blockApts.forEach(apt => {
                                        const participation = config.apartmentParticipation?.[apt.id];
                                        let aptAmount = parseFloat(expense.individualAmounts[apt.id] || 0);

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

                                        totalIntrodusForBlock += aptAmount;
                                      });
                                    }

                                    // Proporția acestei scări din total bloc
                                    if (totalIntrodusForBlock > 0) {
                                      expectedAmountForStair = blockAmount * (totalIntrodusForStair / totalIntrodusForBlock);
                                    }
                                  }

                                  const diferenta = totalIntrodusForStair - expectedAmountForStair;
                                  // Fără TOLERANCE
                                  const hasDifference = Math.abs(diferenta) >= 0.01;

                                  // Calculează variabile pentru context
                                  let totalDifferenceBlock = 0;
                                  let totalDistribuitBlock = 0;

                                  if (expense?.isUnitBased && calculateExpenseDifferences) {
                                    const allApts = getAssociationApartments();
                                    const expenseDifferences = calculateExpenseDifferences(expense, allApts);

                                    // Diferența pentru întreg blocul
                                    totalDifferenceBlock = blockApts.reduce((sum, apt) => sum + (expenseDifferences[apt.id] || 0), 0);

                                    // Total introdus pe bloc (pentru context) CU PARTICIPĂRI
                                    let totalIntrodusBlock = 0;
                                    if (config.distributionType === 'consumption' && expense.consumption) {
                                      blockApts.forEach(apt => {
                                        const participation = config.apartmentParticipation?.[apt.id];
                                        let aptAmount = parseFloat(expense.consumption[apt.id] || 0) * (expense.unitPrice || 0);

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

                                        totalIntrodusBlock += aptAmount;
                                      });
                                    } else if (config.distributionType === 'individual' && expense.individualAmounts) {
                                      blockApts.forEach(apt => {
                                        const participation = config.apartmentParticipation?.[apt.id];
                                        let aptAmount = parseFloat(expense.individualAmounts[apt.id] || 0);

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

                                        totalIntrodusBlock += aptAmount;
                                      });
                                    }
                                    totalDistribuitBlock = totalIntrodusBlock + totalDifferenceBlock;
                                  }

                                  const isBalanced = Math.abs(totalDistribuit - expectedAmountForStair) < 0.01;

                                  return (
                                    <>
                                      <div className="text-xs text-blue-600 font-semibold mt-1">
                                        Total introdus: {totalIntrodusForStair.toFixed(2)} RON
                                      </div>

                                      {/* Diferență - text roșu */}
                                      {expense?.isUnitBased && calculateExpenseDifferences && Math.abs(totalDifferenceStair) >= 0.01 && (
                                        <div className="text-xs text-red-600 font-semibold mt-0.5">
                                          ⚠ Diferență: {totalDifferenceStair > 0 ? '-' : '+'}{Math.abs(totalDifferenceStair).toFixed(2)} RON (din {totalDifferenceBlock > 0 ? '-' : '+'}{Math.abs(totalDifferenceBlock).toFixed(2)} RON pe bloc)
                                        </div>
                                      )}

                                      {/* Badge verde pentru total distribuit */}
                                      {expense?.isUnitBased && calculateExpenseDifferences && Math.abs(totalDifferenceStair) >= 0.01 && (
                                        <div className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700 mt-0.5 inline-block">
                                          ✓ Total distribuit: {totalDistribuit.toFixed(2)} RON (din {totalDistribuitBlock.toFixed(2)} RON pe bloc)
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}

                                {/* Total introdus și diferență - DOAR pentru INDIVIDUAL */}
                                {config.distributionType === 'individual' && (() => {
                                  const dataObject = expense.individualAmounts || {};

                                  // Calculează total introdus pentru această scară
                                  const nonExcludedStairApts = stairApts.filter(apt => {
                                    const participation = config.apartmentParticipation?.[apt.id];
                                    return participation?.type !== 'excluded';
                                  });

                                  let totalIntrodusForStairIndividual = 0;
                                  nonExcludedStairApts.forEach(apt => {
                                    totalIntrodusForStairIndividual += parseFloat(dataObject[apt.id] || 0);
                                  });

                                  // Calculează diferența la nivelul blocului
                                  const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
                                  const blockStairIds = blockStairs.map(s => s.id);
                                  const blockApts = getAssociationApartments().filter(apt => blockStairIds.includes(apt.stairId));

                                  const nonExcludedBlockApts = blockApts.filter(apt => {
                                    const participation = config.apartmentParticipation?.[apt.id];
                                    return participation?.type !== 'excluded';
                                  });

                                  let totalIntrodusForBlock = 0;
                                  nonExcludedBlockApts.forEach(apt => {
                                    totalIntrodusForBlock += parseFloat(dataObject[apt.id] || 0);
                                  });

                                  const diferentaBlock = totalIntrodusForBlock - blockAmount;
                                  // Fără TOLERANCE
                                  const hasDifference = Math.abs(diferentaBlock) >= 0.01;

                                  return (
                                    <>
                                      <div className="text-xs text-blue-600 font-semibold mt-1">
                                        Total introdus: {totalIntrodusForStairIndividual.toFixed(2)} RON
                                      </div>

                                      {hasDifference && (
                                        <div className="text-xs text-red-600 font-semibold mt-0.5">
                                          ⚠ Diferență pe bloc: {diferentaBlock > 0 ? '+' : ''}{diferentaBlock.toFixed(2)} RON {diferentaBlock < 0 ? '(lipsesc)' : '(mai mult)'}
                                        </div>
                                      )}

                                      {!hasDifference && totalIntrodusForBlock > 0 && (
                                        <div className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700 mt-0.5 inline-block">
                                          ✓ Total distribuit: {totalIntrodusForStairIndividual.toFixed(2)} RON (din {totalIntrodusForBlock.toFixed(2)} RON pe bloc)
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}

                                {/* Badge verde pentru cotaParte */}
                                {config.distributionType === 'cotaParte' && (
                                  <div className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700 mt-1 inline-block">
                                    ✓ Total distribuit: {stairTotalAmount.toFixed(2)} RON (din {blockAmount.toFixed(2)} RON pe {block?.name})
                                  </div>
                                )}

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

                                {/* Apartamente incomplete (numai pentru individual) */}
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

                                  return (
                                    <>
                                      {incompleteApts.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-purple-300">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            {/* Badge: Apartamente incomplete */}
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
                                          const rawValue = parseFloat(apt.participationValue) || 0;
                                          const percentValue = rawValue < 1 ? (rawValue * 100) : rawValue;
                                          displayText = `${percentValue.toFixed(0)}%: ${amountPerPerson.toFixed(2)} RON/pers`;
                                        } else {
                                          const rawValue = parseFloat(apt.participationValue) || 0;
                                          const percentValue = rawValue < 1 ? (rawValue * 100) : rawValue;
                                          displayText = `${percentValue.toFixed(0)}%: ${apt.amountInRon.toFixed(2)} RON`;
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

                              // Calculează totalul introdus pentru consumption și individual cu participări aplicate
                              let totalIntrodusForStair = 0;
                              if (config.distributionType === 'consumption' && expense.consumption) {
                                stairApts.forEach(apt => {
                                  const participation = config.apartmentParticipation?.[apt.id];
                                  let aptAmount = parseFloat(expense.consumption[apt.id] || 0) * (expense.unitPrice || 0);

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

                                  totalIntrodusForStair += aptAmount;
                                });
                              } else if (config.distributionType === 'individual' && expense.individualAmounts) {
                                stairApts.forEach(apt => {
                                  const participation = config.apartmentParticipation?.[apt.id];
                                  let aptAmount = parseFloat(expense.individualAmounts[apt.id] || 0);

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

                                  totalIntrodusForStair += aptAmount;
                                });
                              }

                              return (
                                <div key={stair.id} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                  <div className="font-medium text-purple-900">{block?.name} - {stair.name}</div>
                                  <div className="text-xl font-bold text-purple-700">{stairAmount.toFixed(2)} RON</div>

                                  {/* Total introdus și diferență - DOAR pentru CONSUM */}
                                  {config.distributionType === 'consumption' && (() => {
                                    const diferenta = totalIntrodusForStair - stairAmount;
                                    // Fără TOLERANCE
                                    const hasDifference = Math.abs(diferenta) >= 0.01;

                                    // Calculează total distribuit dacă e cheltuială cu isUnitBased
                                    let totalDistribuit = totalIntrodusForStair;
                                    let totalDifferenceStair = 0;
                                    let totalDifferenceBlock = 0;
                                    let totalDistribuitBlock = 0;

                                    if (expense?.isUnitBased && calculateExpenseDifferences) {
                                      const allApts = getAssociationApartments();
                                      const expenseDifferences = calculateExpenseDifferences(expense, allApts);

                                      // Diferența pentru scara curentă
                                      totalDifferenceStair = stairApts.reduce((sum, apt) => sum + (expenseDifferences[apt.id] || 0), 0);
                                      totalDistribuit = totalIntrodusForStair + totalDifferenceStair;

                                      // Găsește toate apartamentele din bloc pentru calcul diferență bloc
                                      const blockStairs = stairs?.filter(s => s.blockId === block.id) || [];
                                      const blockStairIds = blockStairs.map(s => s.id);
                                      const blockApts = allApts.filter(apt => blockStairIds.includes(apt.stairId));

                                      // Diferența pentru întreg blocul
                                      totalDifferenceBlock = blockApts.reduce((sum, apt) => sum + (expenseDifferences[apt.id] || 0), 0);

                                      // Total introdus pe bloc (pentru context)
                                      let totalIntrodusBlock = 0;
                                      if (config.distributionType === 'consumption' && expense.consumption) {
                                        blockApts.forEach(apt => {
                                          const participation = config.apartmentParticipation?.[apt.id];
                                          if (participation?.type !== 'excluded') {
                                            totalIntrodusBlock += parseFloat(expense.consumption[apt.id] || 0) * (expense.unitPrice || 0);
                                          }
                                        });
                                      } else if (config.distributionType === 'individual' && expense.individualAmounts) {
                                        blockApts.forEach(apt => {
                                          const participation = config.apartmentParticipation?.[apt.id];
                                          if (participation?.type !== 'excluded') {
                                            totalIntrodusBlock += parseFloat(expense.individualAmounts[apt.id] || 0);
                                          }
                                        });
                                      }
                                      totalDistribuitBlock = totalIntrodusBlock + totalDifferenceBlock;
                                    }

                                    const isBalanced = Math.abs(totalDistribuit - stairAmount) < 0.01;

                                    return (
                                      <>
                                        <div className="text-xs text-blue-600 font-semibold mt-1">
                                          Total introdus: {totalIntrodusForStair.toFixed(2)} RON
                                        </div>

                                        {/* Diferență - text roșu */}
                                        {expense?.isUnitBased && calculateExpenseDifferences && Math.abs(totalDifferenceStair) >= 0.01 && (
                                          <div className="text-xs text-red-600 font-semibold mt-0.5">
                                            ⚠ Diferență: {totalDifferenceStair > 0 ? '-' : '+'}{Math.abs(totalDifferenceStair).toFixed(2)} RON (din {totalDifferenceBlock > 0 ? '-' : '+'}{Math.abs(totalDifferenceBlock).toFixed(2)} RON pe bloc)
                                          </div>
                                        )}

                                        {/* Badge verde pentru total distribuit */}
                                        {expense?.isUnitBased && calculateExpenseDifferences && Math.abs(totalDifferenceStair) >= 0.01 && (
                                          <div className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700 mt-0.5 inline-block">
                                            ✓ Total distribuit: {totalDistribuit.toFixed(2)} RON (din {totalDistribuitBlock.toFixed(2)} RON pe bloc)
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}

                                  {/* Total introdus și diferență pentru individual */}
                                  {config.distributionType === 'individual' && (() => {
                                    const diferenta = totalIntrodusForStair - stairAmount;
                                    // Fără TOLERANCE
                                    const hasDifference = Math.abs(diferenta) >= 0.01;

                                    return (
                                      <>
                                        <div className="text-xs text-blue-600 font-semibold mt-1">
                                          Total introdus: {totalIntrodusForStair.toFixed(2)} RON
                                        </div>
                                        {hasDifference && (
                                          <div className="text-xs text-red-600 font-semibold mt-0.5">
                                            ⚠ Diferență: {diferenta > 0 ? '+' : ''}{diferenta.toFixed(2)} RON
                                          </div>
                                        )}
                                        {/* Badge verde pentru total distribuit (când diferența este OK) */}
                                        {!hasDifference && totalIntrodusForStair > 0 && (
                                          <div className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700 mt-0.5 inline-block">
                                            ✓ Total distribuit: {totalIntrodusForStair.toFixed(2)} RON
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}

                                  {/* Badge verde pentru cotaParte cu suma pe scară */}
                                  {config.distributionType === 'cotaParte' && (
                                    <div className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700 mt-1 inline-block">
                                      ✓ Total distribuit: {stairAmount.toFixed(2)} RON
                                    </div>
                                  )}

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

                                  {/* Apartamente incomplete (numai pentru individual) */}
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

                                    return (
                                      <>
                                        {incompleteApts.length > 0 && (
                                          <div className="mt-2 pt-2 border-t border-purple-300">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              {/* Badge: Apartamente incomplete */}
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

                    {/* TABELURI DE CONSUMURI ȘI SUME INDIVIDUALE */}
                    {(() => {
                      const filteredApartments = getFilteredApartments();

                      // Pentru cheltuieli pe consum - afișează tabel de consumuri
                      if (config.distributionType === 'consumption') {
                        const dataObject = expense.consumption || {};

                        return (
                          <div className="mt-6">
                            <h5 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <Calculator className="w-5 h-5" />
                              Tabel consumuri:
                            </h5>
                            <ConsumptionTable
                              apartments={filteredApartments}
                              config={config}
                              expense={expense}
                              expenseTypeName={expense.name}
                              dataObject={dataObject}
                              currentSheet={currentSheet}
                              isMonthReadOnly={isMonthReadOnly}
                              localValues={localValues}
                              setLocalValues={setLocalValues}
                              updateExpenseConsumption={updateExpenseConsumption}
                              updatePendingConsumption={updatePendingConsumption}
                              updateExpenseIndexes={updateExpenseIndexes}
                              updatePendingIndexes={updatePendingIndexes}
                              getAssociationApartments={getAssociationApartments}
                              calculateExpenseDifferences={calculateExpenseDifferences}
                              getExpenseConfig={getExpenseConfig}
                              stairs={stairs}
                              selectedStairTab={selectedStairTab}
                              blocks={blocks}
                            />
                          </div>
                        );
                      }

                      // Pentru cheltuieli individuale - afișează tabel de sume individuale
                      if (config.distributionType === 'individual') {
                        const dataObject = expense.individualAmounts || {};

                        return (
                          <div className="mt-6">
                            <h5 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <Calculator className="w-5 h-5" />
                              Tabel sume individuale:
                            </h5>
                            <IndividualAmountsTable
                              apartments={filteredApartments}
                              config={config}
                              expense={expense}
                              expenseTypeName={expense.name}
                              dataObject={dataObject}
                              currentSheet={currentSheet}
                              isMonthReadOnly={isMonthReadOnly}
                              localValues={localValues}
                              setLocalValues={setLocalValues}
                              updateExpenseIndividualAmount={updateExpenseIndividualAmount}
                              updatePendingIndividualAmount={updatePendingIndividualAmount}
                              getAssociationApartments={getAssociationApartments}
                              stairs={stairs}
                              selectedStairTab={selectedStairTab}
                              blocks={blocks}
                            />
                          </div>
                        );
                      }

                      return null;
                    })()}

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
