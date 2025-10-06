// hooks/useMonthManagementV2.js
// VERSIUNE NOUĂ SIMPLIFICATĂ - Wrapper peste useSheetManagement
// Păstrează interfața existentă pentru compatibilitate dar folosește sheet-uri

import { useState, useCallback, useEffect, useMemo } from 'react';
import { doc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import useSheetManagement from './useSheetManagement';

export const useMonthManagement = (associationId) => {
  // Folosește useSheetManagement pentru conectare la Firebase
  const {
    sheets,
    currentSheet,
    publishedSheet,
    archivedSheets,
    loading,
    error,
    createInitialSheet,
    publishCurrentSheet,
    addExpenseToSheet,
    removeExpenseFromSheet,
    updateExpenseInSheet,
    addPaymentToPublishedSheet,
    SHEET_STATUS,
    updateStructureSnapshot,
    updateConfigSnapshot,
    updateSheetCustomName,
    updateSheetMonthSettings,
    updateCurrentSheetMaintenanceTable,
    fixTransferredBalances,
    // 🆕 SHEET-BASED STRUCTURE OPERATIONS
    addBlockToSheet,
    addStairToSheet,
    addApartmentToSheet,
    deleteBlockFromSheet,
    deleteStairFromSheet,
    deleteApartmentFromSheet,
    updateBlockInSheet,
    updateStairInSheet,
    updateApartmentInSheet
  } = useSheetManagement(associationId);

  // State pentru compatibilitate cu vechea interfață
  const [currentMonth, setCurrentMonth] = useState(
    new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" })
  );

  // Actualizează luna curentă când se schimbă sheet-ul - prioritizează published sheet
  useEffect(() => {
    if (publishedSheet) {
      setCurrentMonth(publishedSheet.monthYear); // Luna activă publicată
    } else if (currentSheet) {
      setCurrentMonth(currentSheet.monthYear);   // Luna activă în lucru
    }
  }, [publishedSheet, currentSheet]);

  // Construiește availableMonths - fallback simplu dacă sheet-urile nu se încarcă
  const availableMonths = useMemo(() => {
    const months = [];

    // Dacă avem sheet-uri, folosește-le
    if (currentSheet || publishedSheet || archivedSheets.length > 0) {
      // Adaugă sheet-ul în lucru
      if (currentSheet) {
        months.push({
          value: currentSheet.monthYear,
          label: currentSheet.customMonthName || currentSheet.monthYear, // Folosește numele personalizat dacă există
          type: "current",
          status: "in_lucru"
        });
      }

      // Adaugă sheet-ul publicat (doar dacă nu este același cu cel curent)
      if (publishedSheet && (!currentSheet || publishedSheet.id !== currentSheet.id)) {
        months.push({
          value: publishedSheet.monthYear,
          label: publishedSheet.customMonthName || publishedSheet.monthYear, // Folosește numele personalizat dacă există
          type: "historic", // Sheet-ul publicat devine istoric
          status: "afisata"
        });
      }

      // Adaugă sheet-urile arhivate (ultimele 3 pentru performance)
      archivedSheets.slice(0, 3).forEach(sheet => {
        months.push({
          value: sheet.monthYear,
          label: sheet.customMonthName || sheet.monthYear, // Folosește numele personalizat dacă există
          type: "historic",
          status: "arhivata"
        });
      });
    } else {
      // Fallback: Creează luna curentă manual
      const currentDate = new Date();
      const currentMonthStr = currentDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
      months.push({
        value: currentMonthStr,
        label: currentMonthStr,
        type: "current",
        status: "in_lucru"
      });
    }

    return months;
  }, [currentSheet, publishedSheet, archivedSheets]);

  // Construiește monthStatuses din sheet-uri
  const monthStatuses = useMemo(() => {
    const statuses = {};

    sheets.forEach(sheet => {
      let status = "in_lucru";
      if (sheet.status === SHEET_STATUS.PUBLISHED) {
        status = "afisata";
      } else if (sheet.status === SHEET_STATUS.ARCHIVED) {
        status = "arhivata";
      }

      statuses[sheet.monthYear] = {
        status: status,
        updatedAt: sheet.updatedAt,
        publishedAt: sheet.publishedAt
      };
    });

    return statuses;
  }, [sheets, SHEET_STATUS]);

  // Inițializarea - creează primul sheet
  const initializeMonths = useCallback(async (associationData, explicitAssociationId = null) => {
    // Folosește ID-ul explicit dacă este furnizat, altfel folosește cel din hook
    const idToUse = explicitAssociationId || associationId;

    if (!idToUse || !associationData) {
      console.error('Cannot initialize without association ID and data');
      return;
    }

    // Pentru a evita race conditions, verificăm sheet-urile direct din Firebase
    // în loc să ne bazăm pe state-ul local care poate fi învechit
    console.log(`🎯 Inițializez sheet-ul pentru asociația ${idToUse}`);

    try {
      // Creează sheet-ul folosind ID-ul explicit
      // Trebuie să modificăm createInitialSheet să accepte ID-ul
      await createInitialSheet(associationData, idToUse);
    } catch (error) {
      console.error('❌ Error initializing sheets:', error);
    }
  }, [createInitialSheet]); // Eliminăm associationId din dependențe pentru că folosim explicitAssociationId

  // Get month status
  const getMonthStatus = useCallback((month) => {
    if (!monthStatuses || !monthStatuses[month]) {
      return "in_lucru";
    }
    return monthStatuses[month].status || "in_lucru";
  }, [monthStatuses]);

  // Set month status - nu mai e necesar, se face automat prin publish
  const setMonthStatus = useCallback((month, status) => {
    console.log('setMonthStatus deprecated - status changes through publishing');
    // Nu facem nimic - statusul se schimbă doar prin publicare
  }, []);

  // Get month type (current/next/historic)
  const getMonthType = useCallback((month) => {
    // Determinăm tipul în funcție de workflow-ul sheet-urilor

    // Dacă avem doar sheet publicat (primul sheet), acela este "current"
    if (publishedSheet && publishedSheet.monthYear === month && !currentSheet) {
      return "current";
    }

    // Dacă avem ambele sheet-uri (normal workflow):
    if (publishedSheet && currentSheet) {
      // Sheet-ul publicat este "current"
      if (publishedSheet.monthYear === month) {
        return "current";
      }
      // Sheet-ul în lucru este "next"
      if (currentSheet.monthYear === month) {
        return "next";
      }
    }

    // Dacă avem doar sheet-ul în lucru (fără publicat încă), acela este "current"
    if (currentSheet && currentSheet.monthYear === month && !publishedSheet) {
      return "current";
    }
    
    // Fallback pentru primul sheet când nu există nimic în Firebase
    if (!currentSheet && !publishedSheet && sheets.length === 0) {
      const currentDate = new Date();
      const currentMonthStr = currentDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
      if (month === currentMonthStr) {
        return "current";
      }
    }
    
    // Pentru orice altă lună (mai vechi)
    return "historic";
  }, [currentSheet, publishedSheet, sheets]);

  // Publică luna curentă
  const publishMonth = useCallback(async (month, association, expenses, hasInitialBalances, getAssociationApartments, maintenanceData = []) => {
    // Pentru primul sheet (când nu există currentSheet încă)
    const isFirstSheet = !currentSheet && !publishedSheet && sheets.length === 0;
    
    if (!isFirstSheet && (!currentSheet || currentSheet.monthYear !== month)) {
      console.error('Cannot publish - month is not the current sheet');
      return false;
    }

    try {
      // Validări de bază
      console.log('🔍 Verificare date întreținere:', {
        hasMaintenanceData: !!maintenanceData,
        maintenanceDataLength: maintenanceData?.length,
        maintenanceData: maintenanceData
      });

      if (!maintenanceData || maintenanceData.length === 0) {
        if (!window.confirm('Nu există date de întreținere. Continuați cu publicarea?')) {
          return false;
        }
      }

      // Verificare solduri inițiale pentru prima publicare
      if (!publishedSheet) { // Prima publicare
        const totalRestante = maintenanceData.reduce((sum, data) => sum + (data.restante || 0), 0);
        const totalPenalitati = maintenanceData.reduce((sum, data) => sum + (data.penalitati || 0), 0);
        const totalSolduri = totalRestante + totalPenalitati;

        // Verificăm dacă utilizatorul a completat soldurile inițiale
        const apartmentCount = getAssociationApartments ? getAssociationApartments().length : 0;
        const apartmentsWithBalances = maintenanceData.filter(data =>
          (data.restante && data.restante > 0) || (data.penalitati && data.penalitati > 0)
        ).length;

        if (totalSolduri === 0 && apartmentCount > 0) {
          // Nu există solduri inițiale completate
          alert(
            "⚠️ ATENȚIE: Nu ați completat soldurile inițiale!\n\n" +
            "Pentru primul sheet, trebuie să introduceți soldurile reale existente:\n" +
            "• Restanțe din lunile anterioare\n" +
            "• Penalități acumulate\n\n" +
            "Mergeți la 'Ajustări Solduri' pentru a completa soldurile inițiale."
          );
          return false;
        }

        if (totalSolduri > 0 && apartmentsWithBalances < apartmentCount / 2) {
          // Solduri incomplete - doar câteva apartamente au solduri
          const continueWithPartial = window.confirm(
            `⚠️ ATENȚIE: Solduri incomplete!\n\n` +
            `Doar ${apartmentsWithBalances} din ${apartmentCount} apartamente au solduri completate.\n\n` +
            `Continuați cu publicarea? Apartamentele fără solduri vor începe cu 0.`
          );
          if (!continueWithPartial) return false;
        }

        if (totalSolduri > 0) {
          // Confirmă că soldurile sunt corecte
          const confirmBalances = window.confirm(
            `💰 Confirmare solduri inițiale:\n\n` +
            `Total restanțe: ${totalRestante.toFixed(2)} RON\n` +
            `Total penalități: ${totalPenalitati.toFixed(2)} RON\n\n` +
            `Acestea sunt soldurile corecte pentru începutul activității?`
          );
          if (!confirmBalances) {
        console.log('❌ User cancelled balance confirmation');
        return false;
      }
        }
      }

      // Pentru primul sheet, publică sheet-ul existent (nu îl mai creează)
      if (isFirstSheet) {
        // Verifică dacă chiar nu există sheet-ul
        console.error('⚠️ EROARE: Încerc să public primul sheet dar nu există currentSheet!');
        console.error('Aceasta înseamnă că sistemul de inițializare nu a funcționat corect.');

        alert(
          "❌ EROARE SISTEM: Nu există sheet de lucru!\n\n" +
          "Sheet-ul 1 ar fi trebuit să fie creat la înregistrarea asociației.\n" +
          "Te rog contactează suportul tehnic."
        );
        return false;
      }

      // PUBLICARE SHEET EXISTENT - pentru toate sheet-urile (inclusiv primul)
      if (!currentSheet) {
        console.error('❌ Nu există sheet curent pentru publicare');
        return false;
      }

      console.log('📋 Publică sheet-ul existent:', currentSheet.monthYear);

      // Publică sheet-ul curent cu datele calculate (SNAPSHOT COMPLET la publicare)
      const result = await publishCurrentSheet(maintenanceData, association.adminId);

      if (result) {
        alert(`✅ Luna ${month} a fost publicată cu succes!`);
        return true;
      } else {
        console.log('⚠️ publishCurrentSheet returned falsy value:', result);
        return false;
      }
    } catch (error) {
      console.error('Error publishing month:', error);
      alert(`❌ Eroare la publicare: ${error.message}`);
      return false;
    }
  }, [currentSheet, publishedSheet, publishCurrentSheet]);

  // Check if can publish
  const canPublishMonth = useCallback((month) => {
    return currentSheet && currentSheet.monthYear === month;
  }, [currentSheet]);

  // Check if month is read-only (published)
  const isMonthReadOnly = useCallback((month) => {
    const status = getMonthStatus(month);
    return status === "afisata";
  }, [getMonthStatus]);

  // Helper pentru a determina dacă butonul "Ajustări Solduri" trebuie să apară
  const shouldShowAdjustButton = useCallback((month) => {
    // În noul sistem cu SHEET-uri, ajustările se pot face doar pe sheet-ul IN_PROGRESS
    // DAR NU pentru primul sheet (acolo avem "Solduri Inițiale Configurate")
    if (currentSheet && currentSheet.monthYear === month) {
      return true;
    }
    
    // Pentru primul sheet (când nu există sheet-uri create încă) - NU afișăm butonul
    // deoarece avem componenta separată "Solduri Inițiale Configurate"
    return false;
  }, [currentSheet]);

  // Helper pentru a determina dacă butonul "Publică Luna" trebuie să apară
  // IMPORTANT: Butonul apare doar când toate cheltuielile active au fost adăugate ȘI completate
  const shouldShowPublishButton = useCallback((month, getAvailableExpenseTypes, areAllExpensesFullyCompleted, getAssociationApartments) => {
    // Verifică mai întâi condițiile de bază pentru publicare
    const canPublishBasic = currentSheet && currentSheet.monthYear === month && getMonthStatus(month) === "in_lucru";

    // Pentru primul sheet (când nu există sheet-uri create încă)
    const isFirstSheet = !currentSheet && !publishedSheet && sheets.length === 0 && getMonthStatus(month) === "in_lucru";

    if (!canPublishBasic && !isFirstSheet) {
      return false;
    }

    // Pentru primul sheet, verifică și luna
    if (isFirstSheet) {
      const currentDate = new Date();
      const currentMonthStr = currentDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
      if (month !== currentMonthStr) {
        return false;
      }
    }

    // CONDIȚIA 1: Toate cheltuielile active trebuie să fie adăugate
    if (typeof getAvailableExpenseTypes === 'function') {
      const availableExpenses = getAvailableExpenseTypes();
      if (availableExpenses.length > 0) {
        // Încă mai sunt cheltuieli de adăugat
        return false;
      }
    }

    // CONDIȚIA 2: Toate cheltuielile adăugate trebuie să fie complet completate
    if (typeof areAllExpensesFullyCompleted === 'function' && typeof getAssociationApartments === 'function') {
      const allCompleted = areAllExpensesFullyCompleted(getAssociationApartments);
      if (!allCompleted) {
        // Încă mai sunt câmpuri necompletate
        return false;
      }
    }

    // Toate condițiile sunt îndeplinite
    return true;
  }, [currentSheet, publishedSheet, sheets, getMonthStatus]);

  // Get available months (pentru compatibilitate cu componente)
  const getAvailableMonths = useCallback((expenses = []) => {
    // Pentru compatibilitate, ignorăm parametrul expenses și returnăm availableMonths
    return availableMonths;
  }, [availableMonths]);

  // Get current active month (luna activă pentru calcule)
  const getCurrentActiveMonth = useCallback(() => {
    // Returnează sheet-ul publicat (pentru calculele de întreținere)
    // sau sheet-ul curent dacă nu există unul publicat
    if (publishedSheet) {
      return {
        value: publishedSheet.monthYear,
        label: publishedSheet.monthYear,
        type: "current",
        status: "afisata"
      };
    }
    if (currentSheet) {
      return {
        value: currentSheet.monthYear,
        label: currentSheet.monthYear,
        type: "current",
        status: "in_lucru"
      };
    }
    // Fallback la luna curentă
    return {
      value: currentMonth,
      label: currentMonth,
      type: "current",
      status: "in_lucru"
    };
  }, [publishedSheet, currentSheet, currentMonth]);

  // Creează primul sheet complet cu toate datele și îl publică
  const createInitialSheetWithData = useCallback(async (associationData, expenses, maintenanceData, apartments, publishedBy) => {
    if (!associationId) {
      throw new Error('Association ID este necesar');
    }

    try {
      const currentDate = new Date();
      const monthYear = currentDate.toLocaleDateString('ro-RO', { 
        month: 'long', 
        year: 'numeric' 
      });

      // Construiește datele complete pentru sheet
      const sheetData = {
        associationId,
        monthYear,
        status: SHEET_STATUS.PUBLISHED, // Direct PUBLISHED pentru primul sheet
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        publishedAt: serverTimestamp(),
        publishedBy: publishedBy || 'unknown',
        
        // Snapshot complet al structurii asociației
        associationSnapshot: {
          name: associationData.name || '',
          cui: associationData.cui || '',
          address: associationData.address || {},
          bankAccount: associationData.bankAccount || {},
          totalApartments: apartments ? apartments.length : 0,
          apartments: apartments ? apartments.map(apt => ({
            id: apt.id || '',
            number: apt.number || '',
            block: apt.block || '',
            stair: apt.stair || '',
            persons: apt.persons || 0,
            ownerName: apt.ownerName || ''
          })) : []
        },

        // Date financiare complete
        expenses: expenses || [],
        maintenanceTable: maintenanceData || [],
        payments: [],
        balances: {
          previousMonth: 0, // Pentru primul sheet
          currentMonth: 0,
          transferred: false
        },

        // Metadata
        archivedAt: null,
        notes: 'Primul sheet publicat'
      };

      const sheetRef = doc(collection(db, 'sheets'));
      await setDoc(sheetRef, sheetData);

      return sheetRef.id;
    } catch (error) {
      console.error('❌ Error creating initial sheet with data:', error);
      throw error;
    }
  }, [associationId, SHEET_STATUS]);

  // Get next active month (luna următoare în lucru)
  const getNextActiveMonth = useCallback(() => {
    // În noul sistem, dacă există sheet publicat, următoarea lună activă este sheet-ul în lucru
    if (publishedSheet && currentSheet) {
      return {
        value: currentSheet.monthYear,
        label: currentSheet.monthYear,
        type: "next",
        status: "in_lucru"
      };
    }
    // Dacă nu există sheet publicat, nu avem următoarea lună activă încă
    return null;
  }, [publishedSheet, currentSheet]);

  // Navigate months
  const navigateToMonth = useCallback((month) => {
    setCurrentMonth(month);
  }, []);

  // Get next/previous month helpers
  const getNextMonth = useCallback((date) => {
    const nextMonth = new Date(date);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
  }, []);

  const getPreviousMonth = useCallback((date) => {
    const prevMonth = new Date(date);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    return prevMonth.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
  }, []);

  // Update month data - folosește sheet-uri
  const updateMonthData = useCallback(async (month, data) => {
    // Datele se actualizează prin sheet-uri
    if (currentSheet && currentSheet.monthYear === month) {
      // Pentru cheltuieli, folosește addExpenseToSheet
      if (data.expenses) {
        for (const expense of data.expenses) {
          await addExpenseToSheet(expense);
        }
      }
    }
  }, [currentSheet, addExpenseToSheet]);

  // Save to Firebase - deprecated, se face automat
  const saveStatusToFirebase = useCallback(async () => {
    console.log('saveStatusToFirebase deprecated - auto-saved through sheets');
    return true;
  }, []);

  // Reset months - pentru debug
  const resetMonths = useCallback(() => {
    console.log('Reset months - reload sheets');
    window.location.reload();
  }, []);

  return {
    // State
    monthStatuses,
    availableMonths,
    currentMonth,
    loadingStatus: loading,
    
    // Core methods
    initializeMonths,
    getMonthStatus,
    setMonthStatus,
    getMonthType,
    publishMonth,
    canPublishMonth,
    isMonthReadOnly,
    shouldShowAdjustButton,
    shouldShowPublishButton,
    getAvailableMonths,
    getCurrentActiveMonth,
    getNextActiveMonth,
    
    // Navigation
    setCurrentMonth,
    navigateToMonth,
    getNextMonth,
    getPreviousMonth,
    
    // Data management
    updateMonthData,
    saveStatusToFirebase,
    
    // Utils
    resetMonths,

    // New sheet-specific data
    currentSheet,
    publishedSheet,
    archivedSheets,
    sheets,

    // Sheet balance helpers
    getSheetBalances: useCallback((month) => {
      const sheet = sheets.find(s => s.monthYear === month);
      if (!sheet) return null;
      
      return {
        previousMonth: sheet.balances?.previousMonth || 0,
        currentMonth: sheet.balances?.currentMonth || 0,
        transferred: sheet.balances?.transferred || false,
        transferDetails: sheet.balances?.transferDetails || null
      };
    }, [sheets]),

    // Funcție pentru actualizarea numelui personalizat
    updateSheetCustomName,
    updateSheetMonthSettings,
    updateCurrentSheetMaintenanceTable,
    createInitialSheet,
    fixTransferredBalances,

    // Sheet expense management
    addExpenseToSheet,
    removeExpenseFromSheet,
    updateExpenseInSheet,

    getCurrentSheetBalance: useCallback((apartmentId) => {
      if (!currentSheet) return { restante: 0, penalitati: 0 };
      
      // Pentru noul sistem cu sheet-uri, folosește soldurile individuale per apartament
      const apartmentBalances = currentSheet.balances?.apartmentBalances || {};
      const apartmentBalance = apartmentBalances[apartmentId];
      
      if (apartmentBalance) {
        // Restanțele = soldul rămas după plăți din luna precedentă
        const restante = apartmentBalance.remaining || 0;
        console.log(`🏠 Sheet balance for apartment ${apartmentId}:`, {
          original: apartmentBalance.original,
          paid: apartmentBalance.paid,
          remaining: restante
        });
        
        return {
          restante: Math.round(restante * 100) / 100,
          penalitati: 0 // Nu avem încă logică pentru penalități
        };
      }
      
      // Fallback pentru apartamente noi sau fără istoric
      return { restante: 0, penalitati: 0 };
    }, [currentSheet]),

    // 🆕 SHEET-BASED STRUCTURE OPERATIONS
    updateStructureSnapshot,
    updateConfigSnapshot,
    addBlockToSheet,
    addStairToSheet,
    addApartmentToSheet,
    deleteBlockFromSheet,
    deleteStairFromSheet,
    deleteApartmentFromSheet,
    updateBlockInSheet,
    updateStairInSheet,
    updateApartmentInSheet
  };
};

export default useMonthManagement;