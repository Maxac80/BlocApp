// hooks/useMonthManagement.js
import { useState, useCallback, useEffect } from 'react';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export const useMonthManagement = (associationId) => {
  const [monthStatuses, setMonthStatuses] = useState({});
  const [availableMonths, setAvailableMonths] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(
    new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" })
  );
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Încarcă statusurile din Firebase la montarea componentei
  useEffect(() => {
    if (!associationId) return;

    setLoadingStatus(true);
    const statusDocRef = doc(db, 'monthStatuses', associationId);
    
    const unsubscribe = onSnapshot(
      statusDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setMonthStatuses(data.statuses || {});
        }
        setLoadingStatus(false);
      },
      (error) => {
        console.error('Eroare la încărcarea statusurilor:', error);
        setLoadingStatus(false);
      }
    );

    return () => unsubscribe();
  }, [associationId]);

  // Salvează statusurile în Firebase
  const saveStatusToFirebase = useCallback(async (month, status) => {
    if (!associationId) return false;
    
    try {
      const statusDocRef = doc(db, 'monthStatuses', associationId);
      const updatedStatuses = {
        ...monthStatuses,
        [month]: {
          status: status,
          updatedAt: new Date().toISOString(),
          ...(status === 'afisata' ? { publishedAt: new Date().toISOString() } : {})
        }
      };

      await setDoc(statusDocRef, {
        associationId: associationId,
        statuses: updatedStatuses,
        lastUpdated: new Date().toISOString()
      }, { merge: true });

      console.log(`✅ Status salvat în Firebase pentru ${month}: ${status}`);
      return true;
    } catch (error) {
      console.error('Eroare la salvarea statusului în Firebase:', error);
      return false;
    }
  }, [associationId, monthStatuses]);

  // Helper pentru a genera luna următoare
  const getNextMonth = useCallback((date) => {
    const nextMonth = new Date(date);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
  }, []);

  // Helper pentru a genera luna anterioară
  const getPreviousMonth = useCallback((date) => {
    const prevMonth = new Date(date);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    return prevMonth.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
  }, []);

  // Inițializarea lunilor la crearea asociației
  const initializeMonths = useCallback(() => {
    const currentDate = new Date();
    const currentMonthStr = currentDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    
    const nextMonthDate = new Date();
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const nextMonthStr = nextMonthDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    
    const months = [
      { value: currentMonthStr, label: currentMonthStr, type: "current" },
      { value: nextMonthStr, label: nextMonthStr, type: "next" }
    ];
    
    setAvailableMonths(months);
    setMonthStatuses({
      [currentMonthStr]: "in_lucru",
      [nextMonthStr]: "in_lucru"
    });
  }, []);

  // Funcții pentru gestionarea statusurilor lunilor
  const getMonthStatus = useCallback((month) => {
    if (!monthStatuses || typeof monthStatuses !== 'object') {
      return "in_lucru";
    }
    
    const monthData = monthStatuses[month];
    
    // Dacă este obiect (format nou din Firebase), returnează statusul
    if (monthData && typeof monthData === 'object' && monthData.status) {
      return monthData.status;
    }
    
    // Dacă este string direct (pentru compatibilitate)
    if (typeof monthData === 'string') {
      return monthData;
    }
    
    return "in_lucru";
  }, [monthStatuses]);

  const setMonthStatus = useCallback(async (month, status) => {
    // Actualizează state-ul local imediat
    setMonthStatuses(prev => ({
      ...prev,
      [month]: status
    }));
    
    // Salvează și în Firebase
    await saveStatusToFirebase(month, status);
  }, [saveStatusToFirebase]);

  // Helper pentru a determina tipul lunii
  const getMonthType = useCallback((month) => {
    const currentDate = new Date();
    const currentMonthStr = currentDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    
    const nextMonthDate = new Date();
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const nextMonthStr = nextMonthDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    
    if (month === currentMonthStr) return "current";
    if (month === nextMonthStr) return "next";
    
    // Pentru a determina dacă luna este în viitor sau în trecut, parsăm data
    try {
      // Extragem luna și anul din string-ul în format românesc
      const [monthName, year] = month.split(' ');
      const monthNames = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 
                         'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
      const monthIndex = monthNames.indexOf(monthName);
      
      if (monthIndex !== -1) {
        const monthDate = new Date(parseInt(year), monthIndex, 1);
        const currentDateFirstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        
        if (monthDate > nextMonthDate) return "future";
        if (monthDate < currentDateFirstDay) return "historic";
      }
    } catch (error) {
      console.warn('Error parsing month:', month, error);
    }
    
    return "historic"; // Default fallback
  }, []);

  // Funcția pentru publicarea unei luni cu validări
  const publishMonth = useCallback(async (month, association, expenses, hasInitialBalances, getAssociationApartments, maintenanceData = []) => {
    console.log('🔍 PublishMonth called with:', {
      month,
      association: association?.id,
      hasExpenses: !!expenses,
      expensesLength: expenses?.length,
      hasInitialBalances,
      hasGetApartments: !!getAssociationApartments,
      maintenanceDataLength: maintenanceData?.length
    });
    
    // 1. Verificare solduri inițiale cu warning-uri progresive
    const currentMonthStr = new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    if (month === currentMonthStr) {
      // Calculează totalul soldurilor pentru verificări
      const totalRestante = maintenanceData.reduce((sum, data) => sum + (data.restante || 0), 0);
      const totalPenalitati = maintenanceData.reduce((sum, data) => sum + (data.penalitati || 0), 0);
      const totalSolduri = totalRestante + totalPenalitati;
      
      // Warning puternic dacă totalul soldurilor este 0 (prima utilizare)
      if (totalSolduri === 0) {
        const continueWithZeroBalances = window.confirm(
          "🚨 ATENȚIE MAXIMĂ: Solduri inițiale sunt 0!\n\n" +
          "Acesta este primul calculator de întreținere pentru această asociație?\n" +
          "Dacă DA și chiar nu există restanțe anterioare, apasă OK.\n\n" +
          "Dacă NU și există solduri din luna anterioară care trebuie introduse:\n" +
          "• Apasă CANCEL\n" +
          "• Mergi la 'Ajustări Solduri' \n" +
          "• Introdu soldurile corecte\n" +
          "• Apoi publică din nou\n\n" +
          "Continui cu solduri 0?"
        );
        if (!continueWithZeroBalances) return false;
      }
      // Warning normal dacă nu au fost setate soldurile inițiale
      else if (typeof hasInitialBalances === 'boolean' && !hasInitialBalances) {
        const continueWithoutInitialSetup = window.confirm(
          "💡 Reminder: Configurează soldurile inițiale\n\n" +
          "Continui cu publicarea?"
        );
        if (!continueWithoutInitialSetup) return false;
      }
    }
    
    // 2. Verificare consumuri pentru cheltuielile pe consum
    let hasIncompleteConsumption = false;
    
    if (expenses && association && getAssociationApartments) {
      const monthExpenses = expenses.filter(exp => 
        exp.associationId === association.id && exp.month === month
      );
      
      const consumptionExpenses = monthExpenses.filter(exp => 
        exp.distributionType === "consumption"
      );
      
      const apartments = getAssociationApartments();
      
      for (const expense of consumptionExpenses) {
        for (const apartment of apartments) {
          const consumption = expense.consumption?.[apartment.id];
          if (!consumption || parseFloat(consumption) === 0) {
            hasIncompleteConsumption = true;
            break;
          }
        }
        if (hasIncompleteConsumption) break;
      }
    }
    
    if (hasIncompleteConsumption) {
      const continuePublish = window.confirm(
        "⚠️ ATENȚIE: Există consumuri necompletate!\n\n" +
        "Unele apartamente au consumuri lipsă sau 0.\n" +
        "Dorești să continui cu publicarea?"
      );
      if (!continuePublish) return false;
    }
    
    // 3. Confirmare finală
    const confirmPublish = window.confirm(
      `📋 Confirmare publicare - ${month}\n\n` +
      "După publicare:\n" +
      "• Luna devine read-only (nu mai poți modifica)\n" +
      "• Soldurile vor fi transferate automat în luna următoare\n" +
      "• Se va genera PDF-ul pentru avizier\n\n" +
      "Ești sigur că vrei să publici?"
    );
    
    if (!confirmPublish) return false;
    
    // Setează statusul ca publicat (salvează și în Firebase)
    await setMonthStatus(month, "afisata");
    
    // Salvează data și ora publicării
    const publishData = {
      month: month,
      publishedAt: new Date().toISOString(),
      publishedBy: association?.administrator || "Administrator", // În viitor va fi user-ul logat
    };
    
    // Salvăm în localStorage pentru istoric (temporar, până implementăm Firebase)
    const publishHistory = JSON.parse(localStorage.getItem('publishHistory') || '[]');
    publishHistory.push(publishData);
    localStorage.setItem('publishHistory', JSON.stringify(publishHistory));
    
    // Dacă publicăm a doua lună, generăm a treia
    const nextMonthDate = new Date();
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const nextMonthStr = nextMonthDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    
    if (month === nextMonthStr) {
      // Generăm luna următoare
      const thirdMonthDate = new Date();
      thirdMonthDate.setMonth(thirdMonthDate.getMonth() + 2);
      const thirdMonthStr = thirdMonthDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
      
      setAvailableMonths(prev => {
        const updated = prev.map(m => {
          if (m.type === "current") return { ...m, type: "historic" };
          if (m.type === "next") return { ...m, type: "current" };
          return m;
        });
        updated.push({ value: thirdMonthStr, label: thirdMonthStr, type: "next" });
        return updated;
      });
      
      await setMonthStatus(thirdMonthStr, "in_lucru");
    }
    
    return true; // Publicare reușită
  }, [setMonthStatus]);

  // Funcția pentru depublicarea unei luni (cazuri excepționale)
  const unpublishMonth = useCallback(async (month) => {
    // Verificare confirmare multiplă pentru siguranță
    const firstConfirm = window.confirm(
      `⚠️ ATENȚIE: Depublicare luna ${month}\n\n` +
      "Această acțiune va permite editarea din nou a lunii publicate.\n" +
      "Folosește această opțiune DOAR în cazuri excepționale!\n\n" +
      "Dorești să continui?"
    );
    
    if (!firstConfirm) return false;
    
    const secondConfirm = window.confirm(
      "⚠️ CONFIRMARE FINALĂ\n\n" +
      "Ești ABSOLUT SIGUR că vrei să depublici luna?\n" +
      "Această acțiune poate afecta calculele și soldurile!"
    );
    
    if (!secondConfirm) return false;
    
    // Schimbă statusul înapoi la "in_lucru" (salvează și în Firebase)
    await setMonthStatus(month, "in_lucru");
    
    // Adaugă în istoric că luna a fost depublicată
    const unpublishData = {
      month: month,
      unpublishedAt: new Date().toISOString(),
      action: "unpublished"
    };
    
    const publishHistory = JSON.parse(localStorage.getItem('publishHistory') || '[]');
    publishHistory.push(unpublishData);
    localStorage.setItem('publishHistory', JSON.stringify(publishHistory));
    
    alert(`✅ Luna ${month} a fost depublicată.\n\nPoți edita din nou datele lunii.`);
    return true;
  }, [setMonthStatus]);

  // Helper pentru a lista lunile disponibile cu istoric complet
  const getAvailableMonths = useCallback((expenses = []) => {
    // Generăm o listă de luni relevante (doar curentă, următoare și istoric existent)
    const months = [];
    const currentDate = new Date();
    
    // Helper function pentru formatarea lunii cu prima literă mare
    const formatMonth = (date) => {
      const monthStr = date.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
      return monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
    };

    // Luna următoare
    const nextMonthDate = new Date(currentDate);
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const nextMonthStr = nextMonthDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    months.push({
      value: nextMonthStr,
      label: formatMonth(nextMonthDate),
      type: "next"
    });
    
    // Luna curentă
    const currentMonthStr = currentDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    months.push({
      value: currentMonthStr,
      label: formatMonth(currentDate),
      type: "current"
    });
    
    // Adăugăm doar lunile care au date în BlocApp (istoric existent)
    // Verificăm din expenses, monthStatuses și publishHistory
    const existingMonths = new Set();
    
    // 1. Luni cu cheltuieli existente
    if (expenses && Array.isArray(expenses)) {
      expenses.forEach(expense => {
        if (expense.month && expense.month !== currentMonthStr && expense.month !== nextMonthStr) {
          existingMonths.add(expense.month);
        }
      });
    }
    
    // 2. Luni cu status setat (publicate sau în lucru)
    if (monthStatuses && typeof monthStatuses === 'object') {
      Object.keys(monthStatuses).forEach(month => {
        if (month !== currentMonthStr && month !== nextMonthStr) {
          existingMonths.add(month);
        }
      });
    }
    
    // 3. Luni din istoricul publicărilor
    try {
      const publishHistory = JSON.parse(localStorage.getItem('publishHistory') || '[]');
      publishHistory.forEach(entry => {
        if (entry.month && entry.month !== currentMonthStr && entry.month !== nextMonthStr) {
          existingMonths.add(entry.month);
        }
      });
    } catch (error) {
      console.warn('Error reading publish history:', error);
    }
    
    // Adăugăm lunile existente sortate (cele mai recente primul)
    const existingMonthsArray = Array.from(existingMonths).sort((a, b) => {
      try {
        const [monthA, yearA] = a.split(' ');
        const [monthB, yearB] = b.split(' ');
        const dateA = new Date(parseInt(yearA), getMonthIndex(monthA), 1);
        const dateB = new Date(parseInt(yearB), getMonthIndex(monthB), 1);
        return dateB - dateA; // Descrescător (recente primul)
      } catch {
        return 0;
      }
    });
    
    existingMonthsArray.forEach(month => {
      // Formatăm și lunile istorice cu prima literă mare
      const formattedLabel = month.charAt(0).toUpperCase() + month.slice(1);
      months.push({
        value: month,
        label: formattedLabel,
        type: "historic"
      });
    });
    
    return months;
  }, [monthStatuses]);
  
  // Helper pentru conversie nume lună în index
  const getMonthIndex = (monthName) => {
    const months = [
      'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
      'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'
    ];
    return months.indexOf(monthName.toLowerCase());
  };

  // Helper pentru a determina dacă butonul "Ajustări Solduri" trebuie să apară
  const shouldShowAdjustButton = useCallback((month) => {
    const monthType = getMonthType(month);
    const monthStatus = getMonthStatus(month);
    const currentDate = new Date();
    const currentMonthStr = currentDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    const currentMonthStatus = getMonthStatus(currentMonthStr);
    
    // Pentru luna curentă în lucru
    if (monthType === "current" && monthStatus === "in_lucru") {
      return true;
    }
    
    // Pentru luna următoare DOAR după ce luna curentă a fost publicată
    if (monthType === "next" && currentMonthStatus === "afisata") {
      return true;
    }
    
    // Pentru luna următoare dacă este selectată și luna curentă a fost publicată
    const nextMonthDate = new Date();
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const nextMonthStr = nextMonthDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    if (month === nextMonthStr && currentMonthStatus === "afisata") {
      return true;
    }
    
    return false;
  }, [getMonthType, getMonthStatus]);

  // Helper pentru a determina dacă butonul "Publică Luna" trebuie să apară
  const shouldShowPublishButton = useCallback((month) => {
    const monthStatus = getMonthStatus(month);
    return shouldShowAdjustButton(month) && monthStatus === "in_lucru";
  }, [shouldShowAdjustButton, getMonthStatus]);

  // Helper pentru a determina dacă luna este read-only
  const isMonthReadOnly = useCallback((month) => {
    const status = getMonthStatus(month);
    return status === "afisata";
  }, [getMonthStatus]);

  // Funcție pentru adăugarea unei luni noi
  const addNewMonth = useCallback((monthStr, type = "next") => {
    const newMonth = { value: monthStr, label: monthStr, type };
    setAvailableMonths(prev => [...prev, newMonth]);
    setMonthStatus(monthStr, "in_lucru");
  }, [setMonthStatus]);

  // Funcție pentru resetarea lunilor (util pentru teste)
  const resetMonths = useCallback(() => {
    setAvailableMonths([]);
    setMonthStatuses({});
    initializeMonths();
  }, [initializeMonths]);

  // Funcție pentru navigarea între luni
  const navigateToMonth = useCallback((month) => {
    if (availableMonths.some(m => m.value === month)) {
      setCurrentMonth(month);
    }
  }, [availableMonths]);

  // Funcție pentru a obține lista lunilor istorice
  const getHistoricMonths = useCallback(() => {
    return availableMonths.filter(m => m.type === "historic");
  }, [availableMonths]);

  // Funcție pentru a obține luna curentă activă
  const getCurrentActiveMonth = useCallback(() => {
    return availableMonths.find(m => m.type === "current");
  }, [availableMonths]);

  // Funcție pentru a obține luna următoare
  const getNextActiveMonth = useCallback(() => {
    return availableMonths.find(m => m.type === "next");
  }, [availableMonths]);

  return {
    // State
    monthStatuses,
    setMonthStatuses,
    availableMonths,
    setAvailableMonths,
    currentMonth,
    setCurrentMonth,
    
    // Core functions
    initializeMonths,
    getMonthStatus,
    setMonthStatus,
    publishMonth,
    unpublishMonth,
    
    // Helper functions
    getMonthType,
    getAvailableMonths,
    shouldShowAdjustButton,
    shouldShowPublishButton,
    isMonthReadOnly,
    
    // Navigation functions
    navigateToMonth,
    addNewMonth,
    resetMonths,
    
    // Query functions
    getHistoricMonths,
    getCurrentActiveMonth,
    getNextActiveMonth,
    
    // Utility functions
    getNextMonth,
    getPreviousMonth,
  };
};