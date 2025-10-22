import { useCallback, useMemo, useState, useRef } from "react";

/**
 * 🧮 Custom Hook pentru Calculul Întreținerii
 *
 * RESPONSABILITĂȚI:
 * - Calculul întreținerii pentru apartamente
 * - Gestionarea tabelelor lunare
 * - Integrarea cu sistemul de sheet-uri și plăți
 */
const useMaintenanceCalculation = ({
  apartments,
  expenses,
  association,
  currentMonth,
  currentSheet,
  publishedSheet,
  blocks,
  stairs,
  calculateNextMonthBalances,
  getSheetBalances,
  getCurrentSheetBalance,
  updateCurrentSheetMaintenanceTable,
  getExpenseConfig,
  ...otherProps
}) => {
  const [monthlyBalances, setMonthlyBalances] = useState({});

  // 🔍 FILTRARE APARTAMENTE PENTRU ASOCIAȚIA CURENTĂ
  // SHEET-BASED: Prioritizează apartamentele din sheet-ul curent, cu fallback către colecții
  const getAssociationApartments = useCallback(() => {
    // 1. PRIORITATE: Dacă există currentSheet cu associationSnapshot, folosește apartamentele din sheet
    if (currentSheet?.associationSnapshot?.apartments && currentSheet.associationSnapshot.apartments.length > 0) {
      return currentSheet.associationSnapshot.apartments;
    }

    // 2. FALLBACK: Folosește colecțiile tradiționale pentru compatibilitate

    if (!apartments || !association?.id) {
      return [];
    }

    // Găsește blocurile care aparțin acestei asociații
    const associationBlocks = blocks.filter(block => block.associationId === association.id);
    if (associationBlocks.length === 0) {
      return [];
    }

    // Găsește scările care aparțin acestor blocuri
    const blockIds = associationBlocks.map(block => block.id);
    const associationStairs = stairs.filter(stair => blockIds.includes(stair.blockId));
    if (associationStairs.length === 0) {
      return [];
    }

    // Găsește apartamentele care aparțin acestor scări
    const stairIds = associationStairs.map(stair => stair.id);
    const filtered = apartments.filter(apt => stairIds.includes(apt.stairId));

    return filtered;
  }, [currentSheet, apartments, association?.id, blocks, stairs]);

  // 📊 CALCULUL SUMELOR TOTALE
  const calculateTotalExpenses = useCallback(() => {
    // SHEET-BASED: Folosește cheltuielile din sheet-ul curent
    const sheetExpenses = currentSheet?.expenses || [];

    return sheetExpenses.reduce((total, exp) => total + (exp.amount || 0), 0);
  }, [currentSheet]);

  const calculateTotalMaintenance = useCallback(() => {
    const tableData = calculateMaintenanceWithDetails();
    return tableData.reduce((total, row) => total + (row.currentMaintenance || 0), 0);
  }, []);

  // 💰 GESTIONAREA SOLDURILOR - LOGICĂ SIMPLĂ ȘI CLARĂ
  const getApartmentBalance = useCallback(
    (apartmentId) => {
      // CAZ 1: Vizualizăm sheet-ul publicat → Date LOCKED din maintenanceTable
      if (publishedSheet && publishedSheet.monthYear === currentMonth) {
        if (publishedSheet.maintenanceTable && publishedSheet.maintenanceTable.length > 0) {
          const apartmentRow = publishedSheet.maintenanceTable.find(row => row.apartmentId === apartmentId);
          if (apartmentRow) {
            return {
              restante: apartmentRow.restante || 0,
              penalitati: apartmentRow.penalitati || 0
            };
          }
        }
      }

      // CAZ 2: Sheet în lucru → Calculează din sheet-ul publicat (dacă există)
      if (publishedSheet && currentSheet && currentSheet.monthYear !== publishedSheet.monthYear) {
        if (publishedSheet.maintenanceTable && publishedSheet.maintenanceTable.length > 0) {
          const apartmentRow = publishedSheet.maintenanceTable.find(row => row.apartmentId === apartmentId);
          if (apartmentRow) {
            const payments = publishedSheet.payments || [];
            const apartmentPayments = payments.filter(p => p.apartmentId === apartmentId);
            const totalPaid = apartmentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
            const totalDatorat = apartmentRow.totalDatorat || 0;
            const restante = Math.max(0, totalDatorat - totalPaid);

            return {
              restante: Math.round(restante * 100) / 100,
              penalitati: 0
            };
          }
        }
      }

      // CAZ 3: Ajustări din sheet → Citește din currentSheet.configSnapshot.balanceAdjustments
      if (currentSheet?.configSnapshot?.balanceAdjustments) {
        const adjustment = currentSheet.configSnapshot.balanceAdjustments[apartmentId];
        if (adjustment) {
          return {
            restante: adjustment.restante || 0,
            penalitati: adjustment.penalitati || 0
          };
        }
      }

      // CAZ 4: Ajustări manuale → Citește din currentSheet.maintenanceTable
      if (currentSheet && currentSheet.maintenanceTable && currentSheet.maintenanceTable.length > 0) {
        const apartmentRow = currentSheet.maintenanceTable.find(row => row.apartmentId === apartmentId);
        if (apartmentRow && (apartmentRow.restante > 0 || apartmentRow.penalitati > 0)) {
          return {
            restante: apartmentRow.restante || 0,
            penalitati: apartmentRow.penalitati || 0
          };
        }
      }

      // CAZ 5: Fallback la soldurile inițiale
      const apartment = apartments.find(apt => apt.id === apartmentId);
      if (apartment?.initialBalance) {
        return {
          restante: apartment.initialBalance.restante || 0,
          penalitati: apartment.initialBalance.penalitati || 0
        };
      }

      // CAZ 6: Fallback final
      return { restante: 0, penalitati: 0 };
    },
    [currentSheet, publishedSheet, currentMonth, apartments]
  );

  const setApartmentBalance = useCallback(
    (apartmentId, balance) => {
      const monthKey = `${association?.id}-${currentMonth}`;
      setMonthlyBalances((prev) => {
        const newBalances = {
          ...prev,
          [monthKey]: {
            ...prev[monthKey],
            [apartmentId]: balance,
          },
        };
        return newBalances;
      });
    },
    [association?.id, currentMonth]
  );

  // 💧 CALCUL DIFERENȚĂ PENTRU CHELTUIELI PE CONSUM CU INDECȘI
  const calculateExpenseDifferences = useCallback((expense, apartments) => {
    if (!expense.isUnitBased) {
      return {}; // Nu e cheltuială pe consum
    }

    const config = getExpenseConfig ? getExpenseConfig(expense.name) : null;

    // Configurație default pentru diferență dacă nu există
    const differenceConfig = config?.differenceDistribution || {
      method: 'apartment', // Egal pe apartament (cel mai simplu și corect)
      adjustmentMode: 'none', // Fără ajustări
      includeExcludedInDifference: false,
      includeFixedAmountInDifference: false
    };

    // Determină nivelul de introducere sume
    let receptionMode = expense.receptionMode || 'total';

    // Mapează expenseEntryMode la receptionMode
    if (expense.expenseEntryMode) {
      if (expense.expenseEntryMode === 'building') receptionMode = 'per_block';
      else if (expense.expenseEntryMode === 'staircase') receptionMode = 'per_stair';
      else if (expense.expenseEntryMode === 'total') receptionMode = 'total';
    } else if (receptionMode === 'per_blocuri') {
      receptionMode = 'per_block';
    } else if (receptionMode === 'per_scari') {
      receptionMode = 'per_stair';
    }


    // 1. Calculează consumul total declarat din indecși sau consumption pentru fiecare apartament
    const apartmentConsumptions = {};

    apartments.forEach(apt => {
      let aptConsumption = 0;

      // Verifică dacă are indecși
      const indexes = expense.indexes?.[apt.id];
      if (indexes) {
        // Calculează consum din indecși
        Object.values(indexes).forEach(indexData => {
          if (indexData.newIndex && indexData.oldIndex) {
            aptConsumption += parseFloat(indexData.newIndex) - parseFloat(indexData.oldIndex);
          }
        });
      } else {
        // Folosește consumul declarat manual
        aptConsumption = parseFloat(expense.consumption?.[apt.id] || 0);
      }

      apartmentConsumptions[apt.id] = aptConsumption;
    });

    // 2. Grupează apartamentele pe nivelul de introducere (scară/bloc/total)
    const apartmentGroups = {};

    apartments.forEach(apartment => {
      const apartmentStair = stairs?.find(s => s.id === apartment.stairId);
      const apartmentBlockId = apartmentStair?.blockId;

      let groupKey = null;

      if (receptionMode === 'per_block') {
        // Doar apartamente cu bloc valid
        if (apartmentBlockId) {
          groupKey = `block_${apartmentBlockId}`;
        }
      } else if (receptionMode === 'per_stair') {
        // Doar apartamente cu scară validă
        if (apartment.stairId) {
          groupKey = `stair_${apartment.stairId}`;
        }
      } else {
        // Mod 'total' - toate apartamentele
        groupKey = 'total';
      }

      // Skip apartamente fără grup valid
      if (!groupKey) {
        return;
      }

      if (!apartmentGroups[groupKey]) {
        apartmentGroups[groupKey] = [];
      }
      apartmentGroups[groupKey].push(apartment);
    });

    // 3. Calculează diferența pentru fiecare grup separat
    const differenceByApartment = {};

    Object.keys(apartmentGroups).forEach(groupKey => {
      const groupApartments = apartmentGroups[groupKey];

      // 3.1 Determină suma așteptată pentru acest grup
      let expectedAmount = 0;

      if (groupKey.startsWith('block_')) {
        const blockId = groupKey.replace('block_', '');
        expectedAmount = parseFloat(expense.amountsByBlock?.[blockId] || 0);
      } else if (groupKey.startsWith('stair_')) {
        const stairId = groupKey.replace('stair_', '');
        expectedAmount = parseFloat(expense.amountsByStair?.[stairId] || 0);
      } else {
        // Total pe asociație
        expectedAmount = parseFloat(expense.billAmount || 0);
      }

      // Dacă nu există sumă așteptată pentru acest grup, skip
      if (expectedAmount === 0) {
        return;
      }

      // 3.2 Calculează suma după participare pentru apartamentele din grup
      let totalAfterParticipation = 0;

      groupApartments.forEach(apt => {
        const aptConsumption = apartmentConsumptions[apt.id];
        const aptAmount = aptConsumption * (expense.unitPrice || 0);
        const participation = config?.apartmentParticipation?.[apt.id];

        let finalAmount = aptAmount;

        // Aplică participarea
        if (participation) {
          if (participation.type === 'excluded') {
            finalAmount = 0;
          } else if (participation.type === 'percentage') {
            const percent = participation.value;
            const multiplier = percent < 1 ? percent : (percent / 100);
            finalAmount = aptAmount * multiplier;
          } else if (participation.type === 'fixed') {
            const fixedMode = config?.fixedAmountMode || 'apartment';
            finalAmount = fixedMode === 'person' ? participation.value * apt.persons : participation.value;
          }
          // else 'integral' - lasă finalAmount neschimbat
        }

        totalAfterParticipation += finalAmount;
      });

      // 3.3 Calculează diferența pentru acest grup
      const groupDifference = expectedAmount - totalAfterParticipation;

      if (Math.abs(groupDifference) < 1) {
        return; // Diferența e neglijabilă pentru acest grup
      }

      // 3.4 Filtrează apartamentele din grup care participă la diferență
      const participatingApartments = groupApartments.filter(apt => {
        const participation = config?.apartmentParticipation?.[apt.id];

        // Exclude apartamentele excluse dacă nu e bifat includeExcludedInDifference
        if (participation?.type === 'excluded' && !differenceConfig.includeExcludedInDifference) {
          return false;
        }

        // Exclude apartamentele cu sumă fixă dacă nu e bifat includeFixedAmountInDifference
        if (participation?.type === 'fixed' && !differenceConfig.includeFixedAmountInDifference) {
          return false;
        }

        return true;
      });

      if (participatingApartments.length === 0) {
        return;
      }

      // 3.5 Distribuie diferența grupului conform metodei configurate
      const groupDifferenceByApartment = {};

      participatingApartments.forEach(apt => {
        let apartmentShare = 0;

        // PASUL 1: Calculează diferența de bază conform metodei alese
        switch (differenceConfig.method) {
          case 'apartment':
            // Egal pe apartament
            apartmentShare = groupDifference / participatingApartments.length;
            break;

          case 'person':
            // Proporțional cu persoanele
            const totalParticipatingPersons = participatingApartments.reduce((sum, a) => sum + a.persons, 0);
            apartmentShare = (groupDifference / totalParticipatingPersons) * apt.persons;
            break;

          case 'consumption':
            // Proporțional cu consumul
            const totalParticipatingConsumption = participatingApartments.reduce(
              (sum, a) => sum + apartmentConsumptions[a.id], 0
            );
            if (totalParticipatingConsumption > 0) {
              apartmentShare = (groupDifference / totalParticipatingConsumption) * apartmentConsumptions[apt.id];
            }
            break;

          default:
            apartmentShare = 0;
        }

        groupDifferenceByApartment[apt.id] = apartmentShare;
      });

      // PASUL 2: Aplică ajustările (participation sau apartmentType) cu REPONDERARE
      if (differenceConfig.adjustmentMode === 'participation') {
        // Calculează greutățile bazate pe procente de participare
        let totalWeights = 0;
        let totalToDistribute = 0;
        const weights = {};

        participatingApartments.forEach(apt => {
          const participation = config?.apartmentParticipation?.[apt.id];
          const baseShare = groupDifferenceByApartment[apt.id];

          let weight = baseShare;
          if (participation?.type === 'percentage') {
            const percent = participation.value;
            const multiplier = percent < 1 ? percent : (percent / 100);
            weight = baseShare * multiplier;
          }

          weights[apt.id] = weight;
          totalWeights += weight;
          totalToDistribute += baseShare;
        });

        // Redistribuie proporțional cu greutățile (REPONDERARE - suma totală rămâne aceeași)
        if (totalWeights > 0) {
          participatingApartments.forEach(apt => {
            groupDifferenceByApartment[apt.id] = (weights[apt.id] / totalWeights) * totalToDistribute;
          });
        }
      } else if (differenceConfig.adjustmentMode === 'apartmentType') {
        // Calculează greutățile pentru fiecare apartament din grup
        let totalWeights = 0;
        let totalToDistribute = 0;
        const weights = {};

        participatingApartments.forEach(apt => {
          const apartmentType = apt.apartmentType;
          const typeRatio = differenceConfig.apartmentTypeRatios?.[apartmentType];
          const ratio = (typeRatio !== undefined && typeRatio !== null) ? (typeRatio / 100) : 1;

          // Greutatea = suma după pasul 2 × ratio tip apartament
          weights[apt.id] = groupDifferenceByApartment[apt.id] * ratio;
          totalWeights += weights[apt.id];
          totalToDistribute += groupDifferenceByApartment[apt.id];
        });

        // Redistribuie proporțional cu greutățile (REPONDERARE - suma totală rămâne aceeași)
        if (totalWeights > 0) {
          participatingApartments.forEach(apt => {
            groupDifferenceByApartment[apt.id] = (weights[apt.id] / totalWeights) * totalToDistribute;
          });
        }
      }

      // 3.6 Adaugă diferențele grupului la rezultatul final
      Object.keys(groupDifferenceByApartment).forEach(aptId => {
        differenceByApartment[aptId] = groupDifferenceByApartment[aptId];
      });
    });

    return differenceByApartment;
  }, [getExpenseConfig, stairs]);

  // 💰 DISTRIBUȚIE CHELTUIALĂ CU REPONDERARE
  const calculateExpenseDistributionWithReweighting = useCallback((expense, apartments) => {
    const distributionByApartment = {};

    // Obține configurația pentru această cheltuială
    const config = getExpenseConfig ? getExpenseConfig(expense.name) : null;

    // Prioritizează distributionType din config, apoi din expense
    const distributionType = config?.distributionType || expense.distributionType || expense.distributionMethod;
    let receptionMode = expense.receptionMode || 'total';

    // Mapează expenseEntryMode/receptionMode
    if (expense.expenseEntryMode) {
      if (expense.expenseEntryMode === 'building') receptionMode = 'per_block';
      else if (expense.expenseEntryMode === 'staircase') receptionMode = 'per_stair';
      else if (expense.expenseEntryMode === 'total') receptionMode = 'total';
    } else if (receptionMode === 'per_blocuri') {
      receptionMode = 'per_block';
    } else if (receptionMode === 'per_scari') {
      receptionMode = 'per_stair';
    }

    // PASUL 1: Inițializează apartamentele excluse cu 0
    apartments.forEach(apartment => {
      const participation = config?.apartmentParticipation?.[apartment.id];
      if (participation?.type === 'excluded') {
        distributionByApartment[apartment.id] = 0;
      }
    });

    // PASUL 2: Grupează apartamentele per scară/bloc pentru procesare separată
    const apartmentGroups = {};

    apartments.forEach(apartment => {
      const participation = config?.apartmentParticipation?.[apartment.id];
      if (participation?.type === 'excluded') {
        return; // Skip excluded apartments
      }

      const apartmentStair = stairs?.find(s => s.id === apartment.stairId);
      const apartmentBlockId = apartmentStair?.blockId;

      let groupKey = 'total';
      if (receptionMode === 'per_block' && apartmentBlockId) {
        groupKey = `block_${apartmentBlockId}`;
      } else if (receptionMode === 'per_stair' && apartment.stairId) {
        groupKey = `stair_${apartment.stairId}`;
      }

      if (!apartmentGroups[groupKey]) {
        apartmentGroups[groupKey] = [];
      }
      apartmentGroups[groupKey].push(apartment);
    });

    // PASUL 3: Procesează fiecare grup separat
    Object.keys(apartmentGroups).forEach(groupKey => {
      const groupApartments = apartmentGroups[groupKey];

      // Determină suma totală pentru acest grup
      let groupTotalAmount = expense.amount || 0;

      if (groupKey.startsWith('block_')) {
        const blockId = groupKey.replace('block_', '');
        groupTotalAmount = parseFloat(expense.amountsByBlock?.[blockId] || 0);
      } else if (groupKey.startsWith('stair_')) {
        const stairId = groupKey.replace('stair_', '');
        groupTotalAmount = parseFloat(expense.amountsByStair?.[stairId] || 0);
      }

      // Calculează sumele fixe pentru acest grup
      let groupFixedAmount = 0;
      groupApartments.forEach(apartment => {
        const participation = config?.apartmentParticipation?.[apartment.id];
        if (participation?.type === 'fixed') {
          // Folosește setarea globală fixedAmountMode din config
          const fixedMode = config?.fixedAmountMode || 'apartment';
          let fixedAmount = parseFloat(participation.value || 0);

          if (fixedMode === 'person') {
            // Sumă fixă per persoană: înmulțește cu numărul de persoane
            fixedAmount = fixedAmount * (apartment.persons || 0);
          }

          distributionByApartment[apartment.id] = fixedAmount;
          groupFixedAmount += fixedAmount;
        }
      });

      // Suma rămasă pentru reponderare între apartamentele cu procent/integral
      const groupAmountToRedistribute = groupTotalAmount - groupFixedAmount;

      // Filtrează apartamentele din acest grup care NU sunt fixe/excluse
      const groupApartmentsForReweighting = groupApartments.filter(apartment => {
        const participation = config?.apartmentParticipation?.[apartment.id];
        return participation?.type !== 'fixed';
      });

      if (groupApartmentsForReweighting.length === 0) {
        return; // Nu mai sunt apartamente de procesat în acest grup
      }

      // Calculează totalul de persoane pentru acest grup
      const groupTotalPersons = groupApartmentsForReweighting.reduce((sum, apt) => sum + apt.persons, 0);

      // Calculează suma de bază pentru fiecare apartament din grup
      groupApartmentsForReweighting.forEach(apartment => {
        let apartmentExpense = 0;
        const participation = config?.apartmentParticipation?.[apartment.id];

        switch (distributionType) {
          case 'apartment':
          case 'perApartament':
            apartmentExpense = groupAmountToRedistribute / groupApartmentsForReweighting.length;
            break;

          case 'person':
          case 'perPerson':
            apartmentExpense = groupTotalPersons > 0 ? (groupAmountToRedistribute / groupTotalPersons) * apartment.persons : 0;
            break;

          case 'individual':
            // Sume individuale per apartament (din expense.individualAmounts)
            apartmentExpense = parseFloat(expense.individualAmounts?.[apartment.id] || 0);

            // Aplică participarea pentru individual
            if (participation?.type === 'percentage') {
              const percent = participation.value;
              const multiplier = percent < 1 ? percent : (percent / 100);
              apartmentExpense = apartmentExpense * multiplier;
            }
            // Sumă fixă suprascrie valoarea individuală
            if (participation?.type === 'fixed') {
              apartmentExpense = parseFloat(participation.value || 0);
            }
            break;

          case 'consumption':
            // Pe consum - calculează consumul de bază pentru apartament
            let apartmentConsumption = 0;

            // Verifică dacă are indecși
            const indexes = expense.indexes?.[apartment.id];
            if (indexes) {
              // Calculează consum din indecși
              Object.values(indexes).forEach(indexData => {
                if (indexData.newIndex && indexData.oldIndex) {
                  apartmentConsumption += parseFloat(indexData.newIndex) - parseFloat(indexData.oldIndex);
                }
              });
            } else {
              // Folosește consumul declarat manual
              apartmentConsumption = parseFloat(expense.consumption?.[apartment.id] || 0);
            }

            // Calculează suma de bază: consum × preț unitar
            apartmentExpense = apartmentConsumption * (expense.unitPrice || 0);

            // NOTĂ: Sumele fixe sunt deja procesate în PASUL 2 (liniile 377-393)
            // și acele apartamente NU ajung aici în groupApartmentsForReweighting.
            // Doar aplicăm participarea procentuală dacă există.
            if (participation?.type === 'percentage') {
              const percent = participation.value;
              const multiplier = percent < 1 ? percent : (percent / 100);
              apartmentExpense = apartmentExpense * multiplier;
            }
            break;

          default:
            apartmentExpense = 0;
        }

        distributionByApartment[apartment.id] = apartmentExpense;
      });

      // REPONDERARE pentru acest grup - calculează greutățile și redistribuie
      // IMPORTANT: Nu reponderăm pentru 'individual' sau 'consumption' - sumele sunt deja fixate!
      if (distributionType !== 'individual' && distributionType !== 'consumption') {
        const groupApartmentsWithPercentage = [];
        const groupApartmentsIntegral = [];

        groupApartmentsForReweighting.forEach(apartment => {
          const participation = config?.apartmentParticipation?.[apartment.id];
          const baseAmount = distributionByApartment[apartment.id] || 0;

          if (participation?.type === 'percentage') {
            groupApartmentsWithPercentage.push({
              id: apartment.id,
              baseAmount,
              percent: participation.value
            });
          } else {
            // Integral (implicit) - participă la reponderare cu 100%
            groupApartmentsIntegral.push({
              id: apartment.id,
              baseAmount,
              percent: 100
            });
          }
        });

        const allGroupParticipating = [...groupApartmentsIntegral, ...groupApartmentsWithPercentage];

        if (allGroupParticipating.length > 0) {
          // Calculează greutățile
          let totalWeights = 0;
          const weights = {};

          allGroupParticipating.forEach(apt => {
            const percent = apt.percent;
            const multiplier = percent < 1 ? percent : (percent / 100);
            weights[apt.id] = apt.baseAmount * multiplier;
            totalWeights += weights[apt.id];
          });

          // Redistribuie proporțional cu greutățile (păstrează suma totală a grupului)
          if (totalWeights > 0) {
            allGroupParticipating.forEach(apt => {
              distributionByApartment[apt.id] = (weights[apt.id] / totalWeights) * groupAmountToRedistribute;
            });
          }
        }
      }
    });

    return distributionByApartment;
  }, [getExpenseConfig, stairs]);

  // 🧮 CALCULUL PRINCIPAL AL ÎNTREȚINERII CU DETALII
  const calculateMaintenanceWithDetails = useCallback(() => {
    const associationApartments = getAssociationApartments();
    const sheetExpenses = currentSheet?.expenses || [];

    if (!associationApartments.length) {
      return [];
    }

    // PRE-CALCUL: Calculează diferențele pentru toate cheltuielile cu sume așteptate
    const expenseDifferences = {};

    sheetExpenses.forEach(expense => {
      const hasExpectedAmount = expense.billAmount ||
                               (expense.amountsByBlock && Object.keys(expense.amountsByBlock).length > 0) ||
                               (expense.amountsByStair && Object.keys(expense.amountsByStair).length > 0);

      if (expense.isUnitBased && hasExpectedAmount) {
        const expenseDiff = calculateExpenseDifferences(expense, associationApartments);
        expenseDifferences[expense.name] = expenseDiff;
      }
    });

    // PRE-CALCUL 2: Calculează distribuția cu reponderare pentru fiecare cheltuială
    const expenseDistributions = {};
    sheetExpenses.forEach(expense => {
      expenseDistributions[expense.name] = calculateExpenseDistributionWithReweighting(
        expense,
        associationApartments
      );
    });

    const tableData = associationApartments
      .map((apartment) => {
        let currentMaintenance = 0;
        const expenseDetails = {};
        const expenseDifferenceDetails = {}; // Separate pentru diferențe

        // Folosește distribuția pre-calculată cu reponderare
        sheetExpenses.forEach((expense) => {
          const distribution = expenseDistributions[expense.name] || {};
          const apartmentExpense = distribution[apartment.id] || 0;

          currentMaintenance += apartmentExpense;
          expenseDetails[expense.name] = apartmentExpense;
        });

        // 💧 ADAUGĂ DIFERENȚELE CALCULATE (pierderi/scurgeri) - SEPARAT
        Object.keys(expenseDifferences).forEach(expenseName => {
          const apartmentDifference = expenseDifferences[expenseName][apartment.id] || 0;
          if (apartmentDifference !== 0) {
            currentMaintenance += apartmentDifference;
            // Salvează diferența separat pentru afișare în tabel
            expenseDifferenceDetails[expenseName] = apartmentDifference;
          }
        });

        const { restante, penalitati } = getApartmentBalance(apartment.id);
        const totalDatorat = currentMaintenance + restante + penalitati;

        return {
          apartmentId: apartment.id,
          apartment: apartment.number,
          owner: apartment.owner,
          building: apartment.buildingNumber,
          persons: apartment.persons,
          currentMaintenance: Math.round(currentMaintenance * 100) / 100,
          restante,
          penalitati,
          totalDatorat: Math.round(totalDatorat * 100) / 100,
          totalMaintenance: Math.round(totalDatorat * 100) / 100,
          expenseDetails,
          expenseDifferenceDetails // Adaugă câmpul nou
        };
      })
      .sort((a, b) => {
        if (a.building !== b.building) {
          return a.building - b.building;
        }
        return String(a.apartment).localeCompare(String(b.apartment), undefined, { numeric: true });
      });

    return tableData;
  }, [
    getAssociationApartments,
    currentSheet,
    getApartmentBalance,
    calculateExpenseDifferences,
    calculateExpenseDistributionWithReweighting
  ]);

  // 🧮 DATE CALCULATE PENTRU TABEL - MEMOIZED
  const maintenanceData = useMemo(() => {
    return calculateMaintenanceWithDetails();
  }, [calculateMaintenanceWithDetails]);

  // 📈 STATISTICI ÎNTREȚINERE
  const maintenanceStats = useMemo(() => {
    const tableData = maintenanceData;

    if (!tableData.length) {
      return {
        totalAmount: 0,
        totalRestante: 0,
        totalPenalitati: 0,
        totalDatorat: 0,
        apartmentCount: 0
      };
    }

    return {
      totalAmount: tableData.reduce((sum, row) => sum + row.currentMaintenance, 0),
      totalRestante: tableData.reduce((sum, row) => sum + row.restante, 0),
      totalPenalitati: tableData.reduce((sum, row) => sum + row.penalitati, 0),
      totalDatorat: tableData.reduce((sum, row) => sum + row.totalDatorat, 0),
      apartmentCount: tableData.length
    };
  }, [maintenanceData]);

  return {
    // 🏠 Date apartamente
    getAssociationApartments,

    // 💰 Gestionare solduri
    getApartmentBalance,
    setApartmentBalance,

    // 🧮 Calcule întreținere
    maintenanceData,
    calculateMaintenanceWithDetails,
    calculateTotalExpenses,
    calculateTotalMaintenance,
    calculateExpenseDifferences, // ✨ Exportăm pentru a fi folosit în ConsumptionInput

    // 📈 Statistici
    maintenanceStats,

    // 📊 Date state
    monthlyBalances
  };
};

export { useMaintenanceCalculation };
export default useMaintenanceCalculation;