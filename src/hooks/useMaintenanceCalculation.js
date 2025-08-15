import { useCallback, useMemo, useState } from "react";

/**
 * 🧮 Custom Hook pentru Calculul Întreținerii
 *
 * RESPONSABILITĂȚI:
 * - Calculul întreținerii pentru apartamente
 * - Gestionarea tabelelor lunare
 * - Calculul detaliat al cheltuielilor
 * - Toggle plăți
 * - Gestionarea soldurilor
 */
export const useMaintenanceCalculation = ({
  association,
  blocks,
  stairs,
  apartments,
  expenses,
  currentMonth,
}) => {
  // 📊 STATE LOCAL PENTRU TABELE ȘI SOLDURI
  const [monthlyTables, setMonthlyTables] = useState({});
  const [monthlyBalances, setMonthlyBalances] = useState({});

  // 🏠 CALCULEAZĂ APARTAMENTELE ASOCIAȚIEI - CA FUNCȚIE
  const getAssociationApartments = useCallback(() => {
    if (!association?.id) return [];

    const associationBlocks = blocks.filter((block) => block.associationId === association.id);
    const associationStairs = stairs.filter((stair) =>
      associationBlocks.some((block) => block.id === stair.blockId)
    );
    const associationApartments = apartments.filter((apartment) =>
      associationStairs.some((stair) => stair.id === apartment.stairId)
    );

    return associationApartments.sort((a, b) => {
      const aStair = associationStairs.find((s) => s.id === a.stairId);
      const bStair = associationStairs.find((s) => s.id === b.stairId);
      const aBlock = associationBlocks.find((bl) => bl.id === aStair?.blockId);
      const bBlock = associationBlocks.find((bl) => bl.id === bStair?.blockId);

      if (aBlock?.name !== bBlock?.name) {
        return aBlock?.name.localeCompare(bBlock?.name) || 0;
      }
      if (aStair?.name !== bStair?.name) {
        return aStair?.name.localeCompare(bStair?.name) || 0;
      }
      return a.number - b.number;
    });
  }, [association?.id, blocks, stairs, apartments]);

  // 📋 OBȚINE TABELUL CURENT
  const getCurrentMonthTable = useCallback(() => {
    const key = `${association?.id}-${currentMonth}`;
    return monthlyTables[key] || null;
  }, [association?.id, currentMonth, monthlyTables]);

  // 💰 GESTIONAREA SOLDURILOR
  const getApartmentBalance = useCallback(
    (apartmentId) => {
      const monthKey = `${association?.id}-${currentMonth}`;
      const monthBalances = monthlyBalances[monthKey] || {};
      return monthBalances[apartmentId] || { restante: 0, penalitati: 0 };
    },
    [association?.id, currentMonth, monthlyBalances]
  );

  const setApartmentBalance = useCallback(
    (apartmentId, balance) => {
      const monthKey = `${association?.id}-${currentMonth}`;
      setMonthlyBalances((prev) => ({
        ...prev,
        [monthKey]: {
          ...prev[monthKey],
          [apartmentId]: balance,
        },
      }));
    },
    [association?.id, currentMonth]
  );

  // 🧮 CALCULUL PRINCIPAL AL ÎNTREȚINERII CU DETALII
  const calculateMaintenanceWithDetails = useCallback(() => {
    const associationApartments = getAssociationApartments();
    const associationExpenses = expenses.filter(
      (exp) => exp.associationId === association?.id && exp.month === currentMonth
    );

    if (!associationApartments.length) {
      return [];
    }

    const totalPersons = associationApartments.reduce((sum, apt) => sum + apt.persons, 0);
    const totalApartments = associationApartments.length;

    const tableData = associationApartments
      .map((apartment) => {
        let currentMaintenance = 0;
        const expenseDetails = {};

        associationExpenses.forEach((expense) => {
          let apartmentCost = 0;

          switch (expense.distributionType || "apartment") {
            case "apartment":
              apartmentCost = expense.amount / totalApartments;
              break;

            case "individual":
              apartmentCost = parseFloat(expense.individualAmounts?.[apartment.id]) || 0;
              break;

            case "person":
              const costPerPerson = expense.amount / totalPersons;
              apartmentCost = costPerPerson * apartment.persons;
              break;

            case "consumption":
              const consumption = parseFloat(expense.consumption[apartment.id]) || 0;
              apartmentCost = consumption * expense.unitPrice;
              break;

            default:
              apartmentCost = expense.amount / totalApartments;
          }

          currentMaintenance += apartmentCost;
          // Adaugă în expenseDetails doar dacă valoarea este diferită de 0
          if (apartmentCost > 0) {
            expenseDetails[expense.name] = Math.round(apartmentCost * 100) / 100;
          }
        });

        const balance = getApartmentBalance(apartment.id);
        const stair = stairs.find((s) => s.id === apartment.stairId);
        const block = blocks.find((b) => b.id === stair?.blockId);

        // Calculează soldurile totale incluzând soldurile inițiale
        const initialBalance = apartment.initialBalance || { restante: 0, penalitati: 0 };
        const totalRestante = balance.restante + initialBalance.restante;
        const totalPenalitati = balance.penalitati + initialBalance.penalitati;

        return {
          apartmentId: apartment.id,
          apartment: apartment.number,
          owner: apartment.owner,
          persons: apartment.persons,
          blockName: block?.name || "",
          stairName: stair?.name || "",
          currentMaintenance: Math.round(currentMaintenance * 100) / 100,
          restante: Math.round(totalRestante * 100) / 100,
          totalMaintenance: Math.round((currentMaintenance + totalRestante) * 100) / 100,
          penalitati: Math.round(totalPenalitati * 100) / 100,
          totalDatorat:
            Math.round((currentMaintenance + totalRestante + totalPenalitati) * 100) / 100,
          paid: false,
          expenseDetails: expenseDetails,
          // Adaugă informații despre soldurile inițiale pentru debugging
          initialBalance: {
            restante: initialBalance.restante,
            penalitati: initialBalance.penalitati
          }
        };
      })
      .sort((a, b) => a.apartment - b.apartment);

    return tableData;
  }, [
    getAssociationApartments,
    expenses,
    association?.id,
    currentMonth,
    getApartmentBalance,
    stairs,
    blocks,
  ]);

  // 📊 CALCULUL PRINCIPAL (cu cache din tabel sau recalculare)
  const calculateMaintenance = useCallback(() => {
    const currentTable = getCurrentMonthTable();
    if (currentTable && currentTable.length > 0) {
      return currentTable;
    }
    return calculateMaintenanceWithDetails();
  }, [getCurrentMonthTable, calculateMaintenanceWithDetails]);

  // 💳 TOGGLE PAYMENT STATUS
  const togglePayment = useCallback(
    (apartmentId) => {
      const key = `${association?.id}-${currentMonth}`;
      const currentTable = getCurrentMonthTable() || calculateMaintenanceWithDetails();

      if (!currentTable.length) {
        return;
      }

      const updatedTable = currentTable.map((row) =>
        row.apartmentId === apartmentId ? { ...row, paid: !row.paid } : row
      );

      setMonthlyTables((prev) => ({
        ...prev,
        [key]: updatedTable,
      }));
    },
    [association?.id, currentMonth, getCurrentMonthTable, calculateMaintenanceWithDetails]
  );

  // 📅 ÎNCHIDEREA LUNII CURENTE
  const closeCurrentMonth = useCallback(() => {
    const currentTable = getCurrentMonthTable() || calculateMaintenanceWithDetails();

    const nextMonthDate = new Date();
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const nextMonth = nextMonthDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });

    if (currentTable && currentTable.length > 0) {
      const nextMonthKey = `${association?.id}-${nextMonth}`;
      const nextMonthBalances = {};

      currentTable.forEach((row) => {
        if (!row.paid) {
          nextMonthBalances[row.apartmentId] = {
            restante: Math.round(row.totalDatorat * 100) / 100,
            penalitati: Math.round((row.penalitati + row.totalMaintenance * 0.01) * 100) / 100,
          };
        } else {
          nextMonthBalances[row.apartmentId] = { restante: 0, penalitati: 0 };
        }
      });

      setMonthlyBalances((prev) => ({
        ...prev,
        [nextMonthKey]: nextMonthBalances,
      }));
    }
  }, [association?.id, getCurrentMonthTable, calculateMaintenanceWithDetails]);

  // 📊 MEMOIZED MAINTENANCE DATA
  const maintenanceData = useMemo(() => {
    if (!association?.id || !currentMonth) return [];
    return calculateMaintenance();
  }, [association?.id, currentMonth, calculateMaintenance]);

  // 📈 STATISTICI ÎNTREȚINERE
  const maintenanceStats = useMemo(() => {
    if (!maintenanceData.length) return null;

    const totalMaintenance = maintenanceData.reduce((sum, row) => sum + row.totalDatorat, 0);
    const paidAmount = maintenanceData
      .filter((row) => row.paid)
      .reduce((sum, row) => sum + row.totalDatorat, 0);
    const unpaidAmount = totalMaintenance - paidAmount;
    const totalApartments = maintenanceData.length;
    const paidApartments = maintenanceData.filter((row) => row.paid).length;

    return {
      totalMaintenance: Math.round(totalMaintenance * 100) / 100,
      paidAmount: Math.round(paidAmount * 100) / 100,
      unpaidAmount: Math.round(unpaidAmount * 100) / 100,
      totalApartments,
      paidApartments,
      unpaidApartments: totalApartments - paidApartments,
      paymentPercentage:
        totalApartments > 0 ? Math.round((paidApartments / totalApartments) * 100) : 0,
    };
  }, [maintenanceData]);

  // 🎯 RETURN API
  return {
    // 📊 Date calculate
    maintenanceData,
    maintenanceStats,

    // 🔧 Funcții de calcul
    calculateMaintenance,
    calculateMaintenanceWithDetails,
    getCurrentMonthTable,

    // 💰 Gestionare solduri
    getApartmentBalance,
    setApartmentBalance,
    monthlyBalances,
    setMonthlyBalances,

    // 📋 Gestionare tabele
    monthlyTables,
    setMonthlyTables,

    // 🎮 Acțiuni
    togglePayment,
    closeCurrentMonth,

    // 🏠 Utilitare
    getAssociationApartments,
  };
};