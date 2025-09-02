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

  // Helper pentru a determina tipul lunii bazat pe statusuri și ordine cronologică
  const getMonthType = useCallback((month) => {
    // Găsim toate lunile publicate și le sortăm cronologic
    const publishedMonths = [];
    const inWorkMonths = [];
    
    // Dacă avem statusuri în Firebase, folosim logica complexă
    if (monthStatuses && Object.keys(monthStatuses).length > 0) {
      Object.keys(monthStatuses).forEach(m => {
        const status = typeof monthStatuses[m] === 'object' ? monthStatuses[m].status : monthStatuses[m];
        if (status === 'afisata') {
          publishedMonths.push(m);
        } else if (status === 'in_lucru') {
          inWorkMonths.push(m);
        }
      });

      // Sortăm lunile cronologic
      const sortMonths = (months) => {
        return months.sort((a, b) => {
          try {
            const [monthA, yearA] = a.split(' ');
            const [monthB, yearB] = b.split(' ');
            const monthNames = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
                              'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
            const dateA = new Date(parseInt(yearA), monthNames.indexOf(monthA), 1);
            const dateB = new Date(parseInt(yearB), monthNames.indexOf(monthB), 1);
            return dateA - dateB;
          } catch {
            return 0;
          }
        });
      };

      const sortedPublished = sortMonths([...publishedMonths]);
      const sortedInWork = sortMonths([...inWorkMonths]);

      // Determinăm tipul bazat pe logica de business:
      // 1. Ultima lună publicată este "current"
      // 2. Prima lună în lucru după ultima publicată este "next"
      // 3. Restul lunilor publicate sunt "historic"
      
      if (sortedPublished.length > 0) {
        const lastPublished = sortedPublished[sortedPublished.length - 1];
        
        // Luna curentă este ultima lună publicată
        if (month === lastPublished) {
          return "current";
        }
        
        // Luna următoare este prima lună în lucru după ultima publicată
        if (sortedInWork.length > 0) {
          // Găsim prima lună în lucru care e după ultima publicată
          for (const inWorkMonth of sortedInWork) {
            if (isMonthAfter(inWorkMonth, lastPublished)) {
              if (month === inWorkMonth) {
                return "next";
              }
              break;
            }
          }
        }
        
        // Toate celelalte luni publicate sunt istoric
        if (publishedMonths.includes(month)) {
          return "historic";
        }
      } else {
        // Dacă nu avem luni publicate, prima lună în lucru e "current", a doua e "next"
        if (sortedInWork.length > 0) {
          if (month === sortedInWork[0]) {
            return "current";
          }
          if (sortedInWork.length > 1 && month === sortedInWork[1]) {
            return "next";
          }
        }
      }
    }
    
    // Fallback la logica simplă bazată pe calendarul real
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
        
        if (monthDate < currentDateFirstDay) return "historic";
      }
    } catch (error) {
      console.warn('Error parsing month:', month, error);
    }
    
    return "historic"; // Default fallback
  }, [monthStatuses]);

  // Helper pentru a verifica dacă o lună este după alta
  const isMonthAfter = (month1, month2) => {
    try {
      const [monthName1, year1] = month1.split(' ');
      const [monthName2, year2] = month2.split(' ');
      const monthNames = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
                        'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
      const date1 = new Date(parseInt(year1), monthNames.indexOf(monthName1), 1);
      const date2 = new Date(parseInt(year2), monthNames.indexOf(monthName2), 1);
      return date1 > date2;
    } catch {
      return false;
    }
  };

  // Funcția pentru publicarea unei luni cu validări și actualizare tipuri
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
    
    // După publicare, generăm automat luna următoare dacă e necesar
    const monthType = getMonthType(month);
    
    if (monthType === "next") {
      // Generăm noua lună următoare
      const newNextMonth = generateNextMonthFromString(month);
      
      if (newNextMonth) {
        // Verificăm dacă luna nu există deja
        const existingStatus = getMonthStatus(newNextMonth);
        if (!existingStatus || existingStatus === "in_lucru") {
          await setMonthStatus(newNextMonth, "in_lucru");
          console.log(`✅ Generată noua lună următoare: ${newNextMonth}`);
        }
      }
    }
    
    return true; // Publicare reușită
  }, [setMonthStatus]);

  // Helper pentru a genera luna următoare din string
  const generateNextMonthFromString = (monthStr) => {
    try {
      const [monthName, year] = monthStr.split(' ');
      const monthNames = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
                        'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
      const monthIndex = monthNames.indexOf(monthName);
      
      if (monthIndex !== -1) {
        const nextDate = new Date(parseInt(year), monthIndex + 1, 1);
        return nextDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
      }
    } catch (error) {
      console.error('Error generating next month:', error);
    }
    return null;
  };

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

  // Funcție pentru a obține luna curentă activă (ultima publicată sau prima în lucru)
  const getCurrentActiveMonth = useCallback(() => {
    // Găsim toate lunile și le categorisim
    const allMonths = Object.keys(monthStatuses || {});
    const publishedMonths = [];
    const inWorkMonths = [];
    
    allMonths.forEach(month => {
      const status = getMonthStatus(month);
      if (status === 'afisata') {
        publishedMonths.push(month);
      } else if (status === 'in_lucru') {
        inWorkMonths.push(month);
      }
    });
    
    // Sortăm lunile publicate pentru a găsi ultima
    if (publishedMonths.length > 0) {
      const sorted = publishedMonths.sort((a, b) => {
        try {
          const [monthA, yearA] = a.split(' ');
          const [monthB, yearB] = b.split(' ');
          const monthNames = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
                            'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
          const dateA = new Date(parseInt(yearA), monthNames.indexOf(monthA), 1);
          const dateB = new Date(parseInt(yearB), monthNames.indexOf(monthB), 1);
          return dateA - dateB;
        } catch {
          return 0;
        }
      });
      
      const lastPublished = sorted[sorted.length - 1];
      return { value: lastPublished, label: lastPublished, type: "current" };
    }
    
    // Dacă nu avem luni publicate, returnăm prima lună în lucru
    if (inWorkMonths.length > 0) {
      const sorted = inWorkMonths.sort((a, b) => {
        try {
          const [monthA, yearA] = a.split(' ');
          const [monthB, yearB] = b.split(' ');
          const monthNames = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
                            'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
          const dateA = new Date(parseInt(yearA), monthNames.indexOf(monthA), 1);
          const dateB = new Date(parseInt(yearB), monthNames.indexOf(monthB), 1);
          return dateA - dateB;
        } catch {
          return 0;
        }
      });
      
      return { value: sorted[0], label: sorted[0], type: "current" };
    }
    
    // Fallback la luna calendaristică curentă
    const currentDate = new Date();
    const currentMonthStr = currentDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    return { value: currentMonthStr, label: currentMonthStr, type: "current" };
  }, [monthStatuses, getMonthStatus]);

  // Funcție pentru a obține luna următoare (prima în lucru după ultima publicată)
  const getNextActiveMonth = useCallback(() => {
    const currentMonth = getCurrentActiveMonth();
    if (!currentMonth) return null;
    
    // Găsim toate lunile în lucru
    const allMonths = Object.keys(monthStatuses || {});
    const inWorkMonths = [];
    
    allMonths.forEach(month => {
      const status = getMonthStatus(month);
      if (status === 'in_lucru') {
        inWorkMonths.push(month);
      }
    });
    
    // Sortăm și găsim prima lună în lucru după luna curentă
    const sorted = inWorkMonths.sort((a, b) => {
      try {
        const [monthA, yearA] = a.split(' ');
        const [monthB, yearB] = b.split(' ');
        const monthNames = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
                          'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
        const dateA = new Date(parseInt(yearA), monthNames.indexOf(monthA), 1);
        const dateB = new Date(parseInt(yearB), monthNames.indexOf(monthB), 1);
        return dateA - dateB;
      } catch {
        return 0;
      }
    });
    
    // Găsim prima lună în lucru care e după luna curentă
    for (const month of sorted) {
      if (isMonthAfter(month, currentMonth.value)) {
        return { value: month, label: month, type: "next" };
      }
    }
    
    return null;
  }, [monthStatuses, getMonthStatus, getCurrentActiveMonth]);

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