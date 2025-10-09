import { useCallback, useMemo, useState } from "react";

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
    if (!expense.isUnitBased || !expense.billAmount) {
      return {}; // Nu e cheltuială pe consum sau nu are billAmount
    }

    const config = getExpenseConfig ? getExpenseConfig(expense.name) : null;
    const differenceConfig = config?.differenceDistribution;

    if (!differenceConfig) {
      return {}; // Nu are configurare diferență
    }

    // 1. Calculează consumul total declarat din indecși sau consumption
    let totalDeclaredConsumption = 0;
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
      totalDeclaredConsumption += aptConsumption;
    });

    // 2. Calculează diferența
    const totalCalculated = totalDeclaredConsumption * (expense.unitPrice || 0);
    const difference = expense.billAmount - totalCalculated;

    if (Math.abs(difference) < 0.01) {
      return {}; // Diferența e neglijabilă
    }

    // 3. Calculează participarea fiecărui apartament la diferență
    const differenceByApartment = {};

    // Filtrează apartamentele care participă la diferență
    const participatingApartments = apartments.filter(apt => {
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
      return {};
    }

    // 4. Distribuie diferența conform metodei configurate
    participatingApartments.forEach(apt => {
      let apartmentShare = 0;

      // PASUL 1: Calculează diferența de bază conform metodei alese
      switch (differenceConfig.method) {
        case 'apartment':
          // Egal pe apartament
          apartmentShare = difference / participatingApartments.length;
          break;

        case 'person':
          // Proporțional cu persoanele
          const totalParticipatingPersons = participatingApartments.reduce((sum, a) => sum + a.persons, 0);
          apartmentShare = (difference / totalParticipatingPersons) * apt.persons;
          break;

        case 'consumption':
          // Proporțional cu consumul
          const totalParticipatingConsumption = participatingApartments.reduce(
            (sum, a) => sum + apartmentConsumptions[a.id], 0
          );
          if (totalParticipatingConsumption > 0) {
            apartmentShare = (difference / totalParticipatingConsumption) * apartmentConsumptions[apt.id];
          }
          break;

        default:
          apartmentShare = 0;
      }

      // PASUL 2: Aplică procentele de participare dacă e selectat modul 'participation'
      if (differenceConfig.adjustmentMode === 'participation') {
        const participation = config?.apartmentParticipation?.[apt.id];
        if (participation?.type === 'percentage') {
          const percent = participation.value;
          const multiplier = percent < 1 ? percent : (percent / 100);
          apartmentShare = apartmentShare * multiplier;
        }
      }

      differenceByApartment[apt.id] = apartmentShare;
    });

    // PASUL 3: Aplică ajustarea pe tip de apartament (cu REPONDERARE pentru a păstra suma totală)
    if (differenceConfig.adjustmentMode === 'apartmentType') {
      // Calculează greutățile pentru fiecare apartament
      let totalWeights = 0;
      let totalToDistribute = 0;
      const weights = {};

      participatingApartments.forEach(apt => {
        const apartmentType = apt.apartmentType;
        const typeRatio = differenceConfig.apartmentTypeRatios?.[apartmentType];
        const ratio = (typeRatio !== undefined && typeRatio !== null) ? (typeRatio / 100) : 1;

        // Greutatea = suma după pasul 2 × ratio tip apartament
        weights[apt.id] = differenceByApartment[apt.id] * ratio;
        totalWeights += weights[apt.id];
        totalToDistribute += differenceByApartment[apt.id];
      });

      // Redistribuie proporțional cu greutățile (REPONDERARE - suma totală rămâne aceeași)
      if (totalWeights > 0) {
        participatingApartments.forEach(apt => {
          differenceByApartment[apt.id] = (weights[apt.id] / totalWeights) * totalToDistribute;
        });
      }
    }

    return differenceByApartment;
  }, [getExpenseConfig]);

  // 🧮 CALCULUL PRINCIPAL AL ÎNTREȚINERII CU DETALII
  const calculateMaintenanceWithDetails = useCallback(() => {
    const associationApartments = getAssociationApartments();
    // SHEET-BASED: Folosește cheltuielile din sheet-ul curent
    const sheetExpenses = currentSheet?.expenses || [];

    if (!associationApartments.length) {
      return [];
    }

    const totalPersons = associationApartments.reduce((sum, apt) => sum + apt.persons, 0);
    const totalApartments = associationApartments.length;

    // PRE-CALCUL: Calculează diferențele pentru toate cheltuielile pe consum
    const expenseDifferences = {};
    sheetExpenses.forEach(expense => {
      if (expense.isUnitBased && expense.billAmount) {
        expenseDifferences[expense.name] = calculateExpenseDifferences(expense, associationApartments);
      }
    });

    const tableData = associationApartments
      .map((apartment) => {
        let currentMaintenance = 0;
        const expenseDetails = {};

        // Calculează întreținerea doar dacă există cheltuieli
        if (sheetExpenses.length > 0) {
          sheetExpenses.forEach((expense) => {
            let apartmentExpense = 0;

            // Mapează distributionType din Firebase la logica de calcul
            const distributionType = expense.distributionType || expense.distributionMethod;

            // Mapează expenseEntryMode/receptionMode la nomenclatura folosită în calcule
            let receptionMode = expense.receptionMode || 'total';
            if (expense.expenseEntryMode) {
              // Mapare din nomenclatura UI
              if (expense.expenseEntryMode === 'building') receptionMode = 'per_block';
              else if (expense.expenseEntryMode === 'staircase') receptionMode = 'per_stair';
              else if (expense.expenseEntryMode === 'total') receptionMode = 'total';
            } else if (receptionMode === 'per_blocuri') {
              receptionMode = 'per_block';
            } else if (receptionMode === 'per_scari') {
              receptionMode = 'per_stair';
            }

            // Găsește blockId și stairId pentru apartamentul curent
            const apartmentStair = stairs?.find(s => s.id === apartment.stairId);
            const apartmentBlockId = apartmentStair?.blockId;

            // 🏠 VERIFICARE PARTICIPARE APARTAMENT
            let participation = null;
            if (getExpenseConfig) {
              const config = getExpenseConfig(expense.name);
              participation = config?.apartmentParticipation?.[apartment.id];
            }

            // Dacă apartamentul este exclus, nu participă deloc
            if (participation?.type === 'excluded') {
              expenseDetails[expense.name] = 0;
              return; // Continue to next expense
            }

            // Dacă participarea e sumă fixă, folosește doar acea sumă
            if (participation?.type === 'fixed') {
              const fixedAmount = parseFloat(participation.value || 0);
              currentMaintenance += fixedAmount;
              expenseDetails[expense.name] = fixedAmount;
              return; // Continue to next expense
            }

            // Determină amount-ul relevant pentru acest apartament bazat pe receptionMode
            let relevantAmount = expense.amount || 0;

            if (receptionMode === 'per_block' && expense.amountsByBlock && apartmentBlockId) {
              // Folosește suma specifică blocului acestui apartament
              relevantAmount = parseFloat(expense.amountsByBlock[apartmentBlockId] || 0);
            } else if (receptionMode === 'per_stair' && expense.amountsByStair && apartment.stairId) {
              // Folosește suma specifică scării acestui apartament
              relevantAmount = parseFloat(expense.amountsByStair[apartment.stairId] || 0);
            }

            // Calculează cât din relevantAmount revine acestui apartament
            switch (distributionType) {
              case 'apartment':
              case 'perApartament':
                if (receptionMode === 'per_block' && apartmentBlockId) {
                  // Împarte suma blocului la apartamentele din acel bloc
                  const blockApartments = associationApartments.filter(apt => {
                    const aptStair = stairs?.find(s => s.id === apt.stairId);
                    return aptStair?.blockId === apartmentBlockId;
                  });
                  apartmentExpense = relevantAmount / blockApartments.length;
                } else if (receptionMode === 'per_stair' && apartment.stairId) {
                  // Împarte suma scării la apartamentele din acea scară
                  const stairApartments = associationApartments.filter(apt => apt.stairId === apartment.stairId);
                  apartmentExpense = relevantAmount / stairApartments.length;
                } else {
                  // Mod total - împarte la toate apartamentele
                  apartmentExpense = relevantAmount / totalApartments;
                }
                break;
              case 'person':
              case 'perPerson':
                if (receptionMode === 'per_block' && apartmentBlockId) {
                  // Împarte suma blocului la persoanele din acel bloc
                  const blockApartments = associationApartments.filter(apt => {
                    const aptStair = stairs?.find(s => s.id === apt.stairId);
                    return aptStair?.blockId === apartmentBlockId;
                  });
                  const blockPersons = blockApartments.reduce((sum, apt) => sum + apt.persons, 0);
                  apartmentExpense = (relevantAmount / blockPersons) * apartment.persons;
                } else if (receptionMode === 'per_stair' && apartment.stairId) {
                  // Împarte suma scării la persoanele din acea scară
                  const stairApartments = associationApartments.filter(apt => apt.stairId === apartment.stairId);
                  const stairPersons = stairApartments.reduce((sum, apt) => sum + apt.persons, 0);
                  apartmentExpense = (relevantAmount / stairPersons) * apartment.persons;
                } else {
                  // Mod total - împarte la toate persoanele
                  apartmentExpense = (relevantAmount / totalPersons) * apartment.persons;
                }
                break;
              case 'fixed':
                apartmentExpense = expense.fixedAmounts?.[apartment.id] || 0;
                break;
              default:
                apartmentExpense = 0;
            }

            // 📊 APLICARE PARTICIPARE PROCENTUALĂ
            if (participation?.type === 'percentage') {
              const percent = participation.value;
              // Dacă valoarea e între 0-1, e fracție; dacă e între 1-100, e procent
              const multiplier = percent < 1 ? percent : (percent / 100);
              apartmentExpense = apartmentExpense * multiplier;
            }

            currentMaintenance += apartmentExpense;
            expenseDetails[expense.name] = apartmentExpense;  // Folosește expense.name pentru a se potrivi cu tabelul
          });
        }

        // 💧 ADAUGĂ DIFERENȚELE CALCULATE (pierderi/scurgeri)
        Object.keys(expenseDifferences).forEach(expenseName => {
          const apartmentDifference = expenseDifferences[expenseName][apartment.id] || 0;
          if (apartmentDifference !== 0) {
            currentMaintenance += apartmentDifference;
            // Adaugă diferența la detalii (pentru a fi vizibilă în tabel, dacă e necesar)
            if (expenseDetails[expenseName]) {
              expenseDetails[expenseName] += apartmentDifference;
            } else {
              expenseDetails[expenseName] = apartmentDifference;
            }
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
          expenseDetails
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
    stairs,
    getExpenseConfig
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

    // 📈 Statistici
    maintenanceStats,

    // 📊 Date state
    monthlyBalances
  };
};

export { useMaintenanceCalculation };
export default useMaintenanceCalculation;