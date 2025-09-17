// hooks/useMonthManagementV2.js
// VERSIUNE NOUĂ SIMPLIFICATĂ - Wrapper peste useSheetManagement
// Păstrează interfața existentă pentru compatibilitate dar folosește sheet-uri

import { useState, useCallback, useEffect, useMemo } from 'react';
import useSheetManagement from './useSheetManagement';

export const useMonthManagement = (associationId) => {
  // Folosim noul sistem de sheet-uri
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
    addPaymentToPublishedSheet,
    SHEET_STATUS
  } = useSheetManagement(associationId);

  // State pentru compatibilitate cu vechea interfață
  const [currentMonth, setCurrentMonth] = useState(
    new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" })
  );

  // Actualizează luna curentă când se schimbă sheet-ul
  useEffect(() => {
    if (currentSheet) {
      setCurrentMonth(currentSheet.monthYear);
    }
  }, [currentSheet]);

  // Construiește availableMonths din sheet-uri
  const availableMonths = useMemo(() => {
    const months = [];
    
    // Adaugă sheet-ul în lucru
    if (currentSheet) {
      months.push({
        value: currentSheet.monthYear,
        label: currentSheet.monthYear,
        type: "current",
        status: "in_lucru"
      });
    }

    // Adaugă sheet-ul publicat
    if (publishedSheet) {
      months.push({
        value: publishedSheet.monthYear,
        label: publishedSheet.monthYear,
        type: "published",
        status: "afisata"
      });
    }

    // Adaugă sheet-urile arhivate (ultimele 3 pentru performance)
    archivedSheets.slice(0, 3).forEach(sheet => {
      months.push({
        value: sheet.monthYear,
        label: sheet.monthYear,
        type: "historic",
        status: "arhivata"
      });
    });

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
  const initializeMonths = useCallback(async (associationData) => {
    if (!associationId || !associationData) {
      console.error('Cannot initialize without association data');
      return;
    }

    // Verifică dacă există deja sheet-uri
    if (sheets.length > 0) {
      console.log('Sheets already exist, skipping initialization');
      return;
    }

    try {
      await createInitialSheet(associationData);
      console.log('✅ Sistem inițializat cu primul sheet');
    } catch (error) {
      console.error('❌ Error initializing sheets:', error);
    }
  }, [associationId, sheets, createInitialSheet]);

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
    if (currentSheet && currentSheet.monthYear === month) {
      return "current";
    }
    if (publishedSheet && publishedSheet.monthYear === month) {
      return "published";
    }
    return "historic";
  }, [currentSheet, publishedSheet]);

  // Publică luna curentă
  const publishMonth = useCallback(async (month, association, expenses, hasInitialBalances, getAssociationApartments, maintenanceData = []) => {
    if (!currentSheet || currentSheet.monthYear !== month) {
      console.error('Cannot publish - month is not the current sheet');
      return false;
    }

    try {
      // Validări de bază
      if (!maintenanceData || maintenanceData.length === 0) {
        if (!window.confirm('Nu există date de întreținere. Continuați cu publicarea?')) {
          return false;
        }
      }

      // Verificare solduri pentru prima publicare
      if (!publishedSheet) { // Prima publicare
        const totalRestante = maintenanceData.reduce((sum, data) => sum + (data.restante || 0), 0);
        const totalPenalitati = maintenanceData.reduce((sum, data) => sum + (data.penalitati || 0), 0);
        const totalSolduri = totalRestante + totalPenalitati;

        if (totalSolduri === 0) {
          const continueWithZero = window.confirm(
            "⚠️ ATENȚIE: Solduri inițiale sunt 0!\n\n" +
            "Este aceasta prima lună de întreținere pentru asociație?\n" +
            "Dacă DA, continuați.\n" +
            "Dacă NU, anulați și setați soldurile inițiale."
          );
          if (!continueWithZero) return false;
        }
      }

      // Publică sheet-ul curent și creează următorul
      const result = await publishCurrentSheet(maintenanceData, association.adminId);
      
      if (result) {
        alert(`✅ Luna ${month} a fost publicată cu succes!`);
        return true;
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
    
    // Navigation
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
    sheets
  };
};

export default useMonthManagement;