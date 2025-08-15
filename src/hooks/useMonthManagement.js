// hooks/useMonthManagement.js
import { useState, useEffect, useCallback } from 'react';

export const useMonthManagement = () => {
  const [monthStatuses, setMonthStatuses] = useState({});
  const [availableMonths, setAvailableMonths] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(
    new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" })
  );

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
    return monthStatuses[month] || "in_lucru";
  }, [monthStatuses]);

  const setMonthStatus = useCallback((month, status) => {
    setMonthStatuses(prev => ({
      ...prev,
      [month]: status
    }));
  }, []);

  // Helper pentru a determina tipul lunii
  const getMonthType = useCallback((month) => {
    const currentDate = new Date();
    const currentMonthStr = currentDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    
    const nextMonthDate = new Date();
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const nextMonthStr = nextMonthDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    
    if (month === currentMonthStr) return "current";
    if (month === nextMonthStr) return "next";
    
    // Pentru lunile viitoare
    const monthObj = availableMonths.find(m => m.value === month);
    return monthObj?.type || "historic";
  }, [availableMonths]);

  // Funcția pentru publicarea unei luni cu validări
  const publishMonth = useCallback((month, association, expenses, hasInitialBalances, getAssociationApartments) => {
    console.log('🔍 PublishMonth called with:', {
      month,
      association: association?.id,
      hasExpenses: !!expenses,
      expensesLength: expenses?.length,
      hasInitialBalances,
      hasGetApartments: !!getAssociationApartments
    });
    
    // 1. Verificare solduri inițiale
    const currentMonthStr = new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    if (month === currentMonthStr && typeof hasInitialBalances === 'boolean' && !hasInitialBalances) {
      alert("⚠️ Nu poți publica luna fără să setezi soldurile inițiale!");
      return false;
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
    
    // Setează statusul ca publicat
    setMonthStatus(month, "afisata");
    
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
    const currentDate = new Date();
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
      
      setMonthStatus(thirdMonthStr, "in_lucru");
    }
    
    return true; // Publicare reușită
  }, [setMonthStatus]);

  // Funcția pentru depublicarea unei luni (cazuri excepționale)
  const unpublishMonth = useCallback((month) => {
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
    
    // Schimbă statusul înapoi la "in_lucru"
    setMonthStatus(month, "in_lucru");
    
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

  // Helper pentru a lista lunile disponibile
  const getAvailableMonths = useCallback(() => {
    return availableMonths;
  }, [availableMonths]);

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
    return getMonthStatus(month) === "afisata";
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