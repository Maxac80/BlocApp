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
    addPaymentToPublishedSheet,
    SHEET_STATUS,
    updateStructureSnapshot
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

  // Construiește availableMonths - fallback simplu dacă sheet-urile nu se încarcă
  const availableMonths = useMemo(() => {
    const months = [];
    
    // Dacă avem sheet-uri, folosește-le
    if (currentSheet || publishedSheet || archivedSheets.length > 0) {
      // Adaugă sheet-ul în lucru
      if (currentSheet) {
        months.push({
          value: currentSheet.monthYear,
          label: currentSheet.monthYear,
          type: "current",
          status: "in_lucru"
        });
      }

      // Adaugă sheet-ul publicat (doar dacă nu este același cu cel curent)
      if (publishedSheet && (!currentSheet || publishedSheet.id !== currentSheet.id)) {
        months.push({
          value: publishedSheet.monthYear,
          label: publishedSheet.monthYear,
          type: "historic", // Sheet-ul publicat devine istoric
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
      console.log('✅ Sistem inițializat cu primul sheet');
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

      // Pentru primul sheet, creează-l ca IN_PROGRESS apoi publică-l normal
      if (isFirstSheet) {
        console.log('🚀 Creating first sheet and then publishing...');
        
        // 1. Creează primul sheet ca IN_PROGRESS
        await createInitialSheet({
          name: association.name,
          cui: association.cui,
          address: association.address,
          bankAccount: association.bankAccount
        });
        
        // 2. Adaugă cheltuielile în sheet (dacă există)
        // Acest pas se va face automat prin sistemul existent
        
        // 3. Publică sheet-ul folosind logica normală
        // Va fi gestionat în următorul apel după ce currentSheet e disponibil
        
        alert(`✅ Primul sheet pentru luna ${month} a fost creat! Apasă din nou "Publică Luna" pentru publicare.`);
        return true;
      } else {
        // Pentru sheet-urile existente, publică direct
        const result = await publishCurrentSheet(maintenanceData, association.adminId);
        
        if (result) {
          alert(`✅ Luna ${month} a fost publicată cu succes!`);
          return true;
        }
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
  const shouldShowPublishButton = useCallback((month) => {
    // Se poate publica sheet-ul curent în lucru
    if (currentSheet && currentSheet.monthYear === month && getMonthStatus(month) === "in_lucru") {
      return true;
    }
    
    // Pentru primul sheet (când nu există sheet-uri create încă)
    if (!currentSheet && !publishedSheet && sheets.length === 0 && getMonthStatus(month) === "in_lucru") {
      const currentDate = new Date();
      const currentMonthStr = currentDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
      return month === currentMonthStr;
    }
    
    return false;
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

      console.log('✅ Primul sheet creat și publicat:', monthYear);
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
    }, [currentSheet])
  };
};

export default useMonthManagement;