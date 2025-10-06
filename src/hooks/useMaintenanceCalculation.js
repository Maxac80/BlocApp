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
              case 'perApartment':
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

            currentMaintenance += apartmentExpense;
            expenseDetails[expense.name] = apartmentExpense;  // Folosește expense.name pentru a se potrivi cu tabelul
          });
        }

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
    getApartmentBalance
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