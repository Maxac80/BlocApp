import { useCallback, useMemo, useState, useEffect } from "react";
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

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
  calculateNextMonthBalances, // Funcția din useBalanceManagement
  // Parametri noi pentru integrarea cu sheet-uri
  currentSheet,
  publishedSheet,
  getSheetBalances,
  getCurrentSheetBalance
}) => {
  // 📊 STATE LOCAL PENTRU TABELE ȘI SOLDURI
  const [monthlyTables, setMonthlyTables] = useState({});
  const [monthlyBalances, setMonthlyBalances] = useState({});

  // 🔄 ÎNCARCĂ SOLDURILE PENTRU LUNA CURENTĂ DIN FIREBASE
  useEffect(() => {
    const loadCurrentMonthBalances = async () => {
      if (!association?.id || !currentMonth) return;

      const monthKey = `${association.id}-${currentMonth}`;
      
      // Verifică dacă sunt deja încărcate
      if (monthlyBalances[monthKey]) return;

      try {
        console.log(`📥 Încarc soldurile pentru luna curentă: ${currentMonth}`);
        
        const balancesQuery = query(
          collection(db, 'initialBalances'),
          where('associationId', '==', association.id),
          where('month', '==', currentMonth)
        );
        const balancesSnapshot = await getDocs(balancesQuery);
        
        const loadedBalances = {};
        balancesSnapshot.docs.forEach(docSnapshot => {
          const data = docSnapshot.data();
          loadedBalances[data.apartmentId] = {
            restante: data.restante || 0,
            penalitati: data.penalitati || 0
          };
        });
        
        if (Object.keys(loadedBalances).length > 0) {
          console.log(`✅ Solduri încărcate pentru ${currentMonth}:`, Object.keys(loadedBalances).length, 'apartamente');
          setMonthlyBalances(prev => ({
            ...prev,
            [monthKey]: loadedBalances
          }));
        } else {
          console.log(`ℹ️ Nu există solduri salvate pentru ${currentMonth} - pornesc cu 0`);
        }
        
      } catch (error) {
        console.error(`❌ Eroare la încărcarea soldurilor pentru ${currentMonth}:`, error);
      }
    };

    loadCurrentMonthBalances();
  }, [association?.id, currentMonth, monthlyBalances]);

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

  // 🔄 SINCRONIZARE AUTOMATĂ A SOLDURILOR PENTRU LUNA CURENTĂ
  // DEZACTIVAT - folosim doar solduri 0 pentru luna curentă, fără încărcare din alte surse
  const syncCurrentMonthBalances = useCallback(() => {
    if (!association?.id || !currentMonth) return;
    
    const monthKey = `${association?.id}-${currentMonth}`;
    
    // Verifică dacă avem deja solduri pentru luna curentă
    if (monthlyBalances[monthKey]) {
      return; // Deja sunt încărcate
    }
    
    console.log(`🔄 syncCurrentMonthBalances - Inițializez solduri 0 pentru luna curentă: ${currentMonth}`);
    
    // Nu mai calculez din luna precedentă - toate soldurile încep cu 0
    // Soldurile reale vor veni doar din tabelul de întreținere cu încasările efectuate
    
  }, [association?.id, currentMonth, monthlyBalances]);

  // 💰 GESTIONAREA SOLDURILOR  
  const getApartmentBalance = useCallback(
    (apartmentId) => {
      // NOUA LOGICĂ: Calculează dinamic din sheet-ul publicat
      if (publishedSheet && currentSheet) {
        // Găsește datele apartamentului din tabelul de întreținere publicat
        const publishedTable = publishedSheet.maintenanceTable || [];
        
        
        const apartmentRow = publishedTable.find(row => row.apartmentId === apartmentId);
        
        if (apartmentRow) {
          // Calculează cât a plătit apartamentul în luna publicată
          const payments = publishedSheet.payments || [];
          const apartmentPayments = payments.filter(p => p.apartmentId === apartmentId);
          const totalPaid = apartmentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
          
          // Calculează restanța = Total datorat - Total plătit
          const totalDatorat = apartmentRow.totalDatorat || 0;
          const restante = Math.max(0, totalDatorat - totalPaid);
          
          
          return {
            restante: Math.round(restante * 100) / 100,
            penalitati: 0
          };
        }
      }
      
      // Pentru primul sheet sau când nu există sheet publicat - folosește initialBalance din apartament
      const apartment = apartments.find(apt => apt.id === apartmentId);
      if (apartment?.initialBalance) {
        return {
          restante: apartment.initialBalance.restante || 0,
          penalitati: apartment.initialBalance.penalitati || 0
        };
      }

      return { restante: 0, penalitati: 0 };
    },
    [publishedSheet, currentSheet, apartments]
  );

  const setApartmentBalance = useCallback(
    (apartmentId, balance) => {
      const monthKey = `${association?.id}-${currentMonth}`;
      console.log(`💾 setApartmentBalance - apartmentId: ${apartmentId}, balance:`, balance);
      setMonthlyBalances((prev) => {
        const newBalances = {
          ...prev,
          [monthKey]: {
            ...prev[monthKey],
            [apartmentId]: balance,
          },
        };
        console.log('💾 Updated monthlyBalances:', newBalances);
        return newBalances;
      });
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

        // SIMPLIFICAT - folosim doar solduri 0 + ce vine din publicarea lunii precedente
        // Nu mai adunăm cu apartment.initialBalance sau alte surse
        const totalRestante = balance.restante || 0;  // Ce a fost transferat din luna precedentă
        const totalPenalitati = balance.penalitati || 0;  // Ce a fost transferat din luna precedentă
          
        console.log(`🧮 Calcul simplificat pentru ap. ${apartment.number}:`, {
          balanceFromPreviousMonth: balance,
          totalRestante,
          totalPenalitati
        });

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
          expenseDetails: expenseDetails
          // Nu mai returnăm initialBalance - folosim doar solduri din luna precedentă
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
    console.log('📅 closeCurrentMonth - Folosesc logica din useBalanceManagement');
    
    const currentTable = getCurrentMonthTable() || calculateMaintenanceWithDetails();

    if (currentTable && currentTable.length > 0 && calculateNextMonthBalances) {
      // Folosim funcția din useBalanceManagement care ia în calcul plățile parțiale
      const nextMonthBalances = calculateNextMonthBalances(currentTable, currentMonth);
      
      console.log('📅 closeCurrentMonth - Solduri calculate pentru luna următoare:', nextMonthBalances);
      
      // Actualizăm monthlyBalances cu noile solduri
      setMonthlyBalances((prev) => ({
        ...prev,
        ...nextMonthBalances  // nextMonthBalances vine deja cu cheia corectă
      }));
      
      return nextMonthBalances;
    } else {
      console.warn('📅 closeCurrentMonth - Nu pot calcula soldurile: currentTable sau calculateNextMonthBalances lipsește');
      return {};
    }
  }, [association?.id, getCurrentMonthTable, calculateMaintenanceWithDetails, currentMonth, calculateNextMonthBalances]);

  // 🔄 FORȚARE RECALCULARE COMPLETĂ
  const forceRecalculate = useCallback(() => {
    const key = `${association?.id}-${currentMonth}`;
    console.log(`🔄 forceRecalculate - Șterg cache pentru cheia: ${key}`);
    setMonthlyTables(prev => {
      const newTables = { ...prev };
      console.log('🔄 Cache înainte de ștergere:', prev);
      delete newTables[key];
      console.log('🔄 Cache după ștergere:', newTables);
      return newTables;
    });
  }, [association?.id, currentMonth]);

  // 📊 MEMOIZED MAINTENANCE DATA
  const maintenanceData = useMemo(() => {
    console.log('🔄 useMemo maintenanceData se recalculează pentru:', {
      associationId: association?.id,
      currentMonth,
      monthlyBalancesKeys: Object.keys(monthlyBalances)
    });
    if (!association?.id || !currentMonth) return [];

    // Pentru sheet-ul publicat, folosește datele înghețate din sheet
    if (publishedSheet && publishedSheet.monthYear === currentMonth && publishedSheet.maintenanceTable) {
      console.log('📋 Folosind datele înghețate din sheet-ul publicat pentru:', currentMonth);
      return publishedSheet.maintenanceTable;
    }

    // Pentru sheet-ul în lucru, calculează dinamic bazat pe sheet-ul anterior
    const result = calculateMaintenance();
    console.log('📊 Noul maintenanceData calculat pentru sheet în lucru:', result);

    // Dacă avem un sheet publicat anterior, actualizează restanțele și penalitățile din el
    if (publishedSheet && publishedSheet.maintenanceTable && currentSheet && currentSheet.monthYear !== publishedSheet.monthYear) {
      console.log('🔄 Actualizez Sheet în lucru cu datele din sheet-ul publicat anterior');
      return result.map(row => {
        const publishedRow = publishedSheet.maintenanceTable.find(pRow => pRow.apartmentId === row.apartmentId);
        if (publishedRow && !publishedRow.isPaid) {
          // Calculează ce rămâne neplătit din sheet-ul anterior
          const remainingFromPrevious = (publishedRow.restante || 0) + (publishedRow.currentMaintenance || 0);
          const remainingPenalties = publishedRow.penalitati || 0;

          return {
            ...row,
            restante: remainingFromPrevious, // Restanța = total întreținere neplătită din sheet anterior
            penalitati: remainingPenalties   // Penalitățile rămase din sheet anterior
          };
        }
        return row;
      });
    }

    return result;
  }, [association?.id, currentMonth, calculateMaintenance, monthlyBalances, publishedSheet, currentSheet]);

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
    forceRecalculate,

    // 🏠 Utilitare
    getAssociationApartments,
  };
};