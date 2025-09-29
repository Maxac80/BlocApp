import { useState, useCallback, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * 💰 Custom Hook pentru Gestionarea Soldurilor
 * 
 * RESPONSABILITĂȚI:
 * - Încărcarea și salvarea soldurilor inițiale
 * - Gestionarea ajustărilor de solduri
 * - Sincronizarea cu Firestore
 * - Calculul automatizat al soldurilor
 */
export const useBalanceManagement = (association, sheetOperations = null) => {
  // 📊 STATE LOCAL PENTRU SOLDURI
  const [hasInitialBalances, setHasInitialBalances] = useState(false);
  const [disabledExpenses, setDisabledExpenses] = useState({});
  const [initialBalances, setInitialBalances] = useState({});
  const [penaltySettings, setPenaltySettings] = useState({
    defaultPenaltyRate: 0.02, // 2% default
    daysBeforePenalty: 30
  });


  // 🔄 ÎNCĂRCAREA CONFIGURĂRILOR LA SCHIMBAREA ASOCIAȚIEI
  useEffect(() => {
    if (association?.id) {
      loadInitialBalances();
      loadPenaltySettings();
    }
  }, [association?.id]); // eslint-disable-line react-hooks/exhaustive-deps


  // 📥 ÎNCĂRCAREA SOLDURILOR ȘI CONFIGURĂRILOR DIN FIRESTORE
  const loadInitialBalances = useCallback(async () => {
    if (!association?.id) return;
    
    try {
      console.log('📥 Încarc configurațiile pentru asociația:', association.id);
      
      // 1. Încarcă soldurile inițiale
      const balancesQuery = query(
        collection(db, 'initialBalances'),
        where('associationId', '==', association.id)
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
      
      // 2. Încarcă cheltuielile eliminate din sheet
      let loadedDisabledExpenses = {};

      // Încarcă direct din sheet-ul IN_PROGRESS
      const sheetsQuery = query(
        collection(db, 'sheets'),
        where('associationId', '==', association.id),
        where('status', '==', 'IN_PROGRESS')
      );
      const sheetsSnapshot = await getDocs(sheetsQuery);

      if (!sheetsSnapshot.empty) {
        const sheetDoc = sheetsSnapshot.docs[0];
        const sheetData = sheetDoc.data();
        const sheetDisabledExpenses = sheetData.configSnapshot?.disabledExpenses || [];

        // Convertește formatul din sheet în formatul așteptat de componente
        // Pentru sheet-uri, folosim monthYear ca cheie
        const key = `${association.id}-${sheetData.monthYear}`;
        loadedDisabledExpenses[key] = sheetDisabledExpenses;

        console.log('✅ Cheltuieli dezactivate încărcate din sheet:', {
          sheetId: sheetDoc.id,
          monthYear: sheetData.monthYear,
          disabledExpenses: sheetDisabledExpenses
        });
      }

      // 3. Actualizează state-urile
      setDisabledExpenses(loadedDisabledExpenses);
      
      if (Object.keys(loadedBalances).length > 0) {
        setHasInitialBalances(true);
        setInitialBalances(loadedBalances);
      }
      
      // console.log('✅ Configurații încărcate:', {
      //   solduri: Object.keys(loadedBalances).length,
      //   cheltuieliEliminate: Object.keys(loadedDisabledExpenses).length
      // });
      
      return {
        balances: loadedBalances,
        disabledExpenses: loadedDisabledExpenses
      };
      
    } catch (error) {
      console.error('❌ Eroare la încărcarea configurărilor:', error);
      throw error;
    }
  }, [association?.id]);

  // 💾 SALVAREA SOLDURILOR INIȚIALE ÎN FIRESTORE
  const saveInitialBalances = useCallback(async (monthlyBalances, currentMonth) => {
    if (!association?.id) {
      throw new Error('Nu există asociație selectată');
    }
    
    try {
      console.log('💾 Salvez soldurile inițiale...');
      
      const currentMonthStr = currentMonth || new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
      const monthKey = `${association.id}-${currentMonthStr}`;
      const currentBalances = monthlyBalances[monthKey] || {};
      
      // Șterge doar soldurile pentru această lună specifică, nu toate
      const existingBalancesQuery = query(
        collection(db, 'initialBalances'),
        where('associationId', '==', association.id),
        where('month', '==', currentMonthStr)
      );
      const existingSnapshot = await getDocs(existingBalancesQuery);
      
      const deletePromises = existingSnapshot.docs.map(docSnapshot => 
        deleteDoc(doc(db, 'initialBalances', docSnapshot.id))
      );
      await Promise.all(deletePromises);
      
      // Salvează noile solduri
      const savePromises = Object.entries(currentBalances).map(([apartmentId, balance]) => {
        return addDoc(collection(db, 'initialBalances'), {
          associationId: association.id,
          apartmentId: apartmentId,
          month: currentMonthStr, // Adăugăm câmpul month pentru filtrare
          restante: balance.restante || 0,
          penalitati: balance.penalitati || 0,
          savedAt: new Date().toISOString()
        });
      });
      
      await Promise.all(savePromises);
      
      setHasInitialBalances(true);
      console.log('✅ Solduri inițiale salvate în Firestore');
      
      return true;
    } catch (error) {
      console.error('❌ Eroare la salvarea soldurilor:', error);
      throw error;
    }
  }, [association?.id]);

  // 🔄 SALVAREA AJUSTĂRILOR DE SOLDURI
  const saveBalanceAdjustments = useCallback(async (month, adjustmentData) => {
    if (!association?.id) {
      throw new Error('Nu există asociație selectată');
    }

    try {
      // 🎯 PRIORITATE: Folosește sheet operations dacă sunt disponibile
      if (sheetOperations?.updateConfigSnapshot && sheetOperations?.currentSheet) {

        // Creează obiectul de ajustări indexat după apartmentId
        const balanceAdjustments = {};
        adjustmentData.forEach(apartmentData => {
          balanceAdjustments[apartmentData.apartmentId] = {
            restante: apartmentData.restanteAjustate || 0,
            penalitati: apartmentData.penalitatiAjustate || 0,
            savedAt: new Date().toISOString(),
            month: month
          };
        });

        // Actualizează config snapshot-ul în sheet
        const updatedConfigData = {
          ...sheetOperations.currentSheet.configSnapshot,
          balanceAdjustments: balanceAdjustments
        };

        await sheetOperations.updateConfigSnapshot(updatedConfigData);
        return;
      }

      // 📦 FALLBACK: Folosește colecțiile Firebase (pentru compatibilitate)
      console.log('📦 COLLECTION-FALLBACK: Salvez ajustările în colecții...');

      // Șterge ajustările existente pentru această lună
      const existingQuery = query(
        collection(db, 'balanceAdjustments'),
        where('associationId', '==', association.id),
        where('month', '==', month)
      );
      const existingSnapshot = await getDocs(existingQuery);

      const deletePromises = existingSnapshot.docs.map(docSnapshot =>
        deleteDoc(doc(db, 'balanceAdjustments', docSnapshot.id))
      );
      await Promise.all(deletePromises);

      // Salvează noile ajustări
      const savePromises = adjustmentData.map(apartmentData => {
        return addDoc(collection(db, 'balanceAdjustments'), {
          associationId: association.id,
          month: month,
          apartmentId: apartmentData.apartmentId,
          restante: apartmentData.restanteAjustate || 0,
          penalitati: apartmentData.penalitatiAjustate || 0,
          savedAt: new Date().toISOString()
        });
      });

      await Promise.all(savePromises);
      console.log(`✅ Ajustări solduri salvate în colecții pentru ${month}:`, adjustmentData.length, 'apartamente');
      
      return true;
    } catch (error) {
      console.error('❌ Eroare la salvarea ajustărilor:', error);
      throw error;
    }
  }, [association?.id, sheetOperations]);

  // 🚫 GESTIONAREA CHELTUIELILOR ELIMINATE
  const toggleExpenseStatus = useCallback(async (expenseName, currentMonth, disable = true) => {
    if (!association?.id) return;

    const disabledKey = `${association.id}-${currentMonth}`;

    try {
      console.log(`${disable ? '🚫' : '✅'} ${disable ? 'Elimin' : 'Reactiv'} cheltuiala:`, expenseName);
      
      // Actualizează starea locală
      setDisabledExpenses(prev => {
        const currentDisabled = prev[disabledKey] || [];

        let newDisabled;
        if (disable) {
          newDisabled = [...currentDisabled, expenseName];
        } else {
          newDisabled = currentDisabled.filter(name => name !== expenseName);
        }

        return {
          ...prev,
          [disabledKey]: newDisabled
        };
      });
      
      // Salvează în Firestore
      await saveDisabledExpenses(disabledKey, expenseName, disable);
      
    } catch (error) {
      console.error('❌ Eroare la actualizarea statusului cheltuielii:', error);
      throw error;
    }
  }, [association?.id]);

  // 💾 SALVAREA CHELTUIELILOR ELIMINATE ÎN SHEET
  const saveDisabledExpenses = useCallback(async (monthKey, expenseName, disable) => {
    // Verificare de siguranță - dacă monthKey nu conține '-', probabil parametrii sunt inversați
    if (!monthKey || !monthKey.includes('-')) {
      console.error('❌ INVALID monthKey format! Expected format: "associationId-month", got:', monthKey);
      return;
    }

    try {
      const [associationId, month] = monthKey.split('-');

      // Găsim sheet-ul curent din Firebase
      const sheetsQuery = query(
        collection(db, 'sheets'),
        where('associationId', '==', associationId)
      );
      const sheetsSnapshot = await getDocs(sheetsQuery);

      console.log('📋 Sheets found:', sheetsSnapshot.docs.map(doc => ({
        id: doc.id,
        status: doc.data().status,
        monthYear: doc.data().monthYear
      })));

      // Caută sheet-ul IN_PROGRESS sau cel mai recent
      const inProgressSheet = sheetsSnapshot.docs.find(doc => doc.data().status === 'IN_PROGRESS');
      const sheetDoc = inProgressSheet || sheetsSnapshot.docs[0];

      if (sheetDoc) {
        const sheetData = sheetDoc.data();
        console.log('📋 Using sheet:', { id: sheetDoc.id, status: sheetData.status, monthYear: sheetData.monthYear });
        const currentDisabledExpenses = sheetData.configSnapshot?.disabledExpenses || [];

        let updatedExpenseNames;
        if (disable) {
          // Adaugă cheltuiala la lista celor dezactivate
          updatedExpenseNames = [...new Set([...currentDisabledExpenses, expenseName])];
        } else {
          // Elimină cheltuiala din lista celor dezactivate
          updatedExpenseNames = currentDisabledExpenses.filter(name => name !== expenseName);
        }

        // Actualizează direct în Firebase
        await updateDoc(doc(db, 'sheets', sheetDoc.id), {
          'configSnapshot.disabledExpenses': updatedExpenseNames
        });

        // Actualizează state-ul local pentru afișare imediată
        const key = `${associationId}-${sheetData.monthYear}`;
        setDisabledExpenses(prev => ({
          ...prev,
          [key]: updatedExpenseNames
        }));

        console.log(`✅ Cheltuiala "${expenseName}" ${disable ? 'eliminată' : 'reactivată'} în sheet ${sheetData.monthYear}`);
      } else {
        console.warn('⚠️ Nu există sheet în lucru pentru a salva disabled expenses');
      }
    } catch (error) {
      console.error('❌ Eroare la salvarea cheltuielilor eliminate:', error);
      throw error;
    }
  }, []);

  // 📋 ÎNCĂRCAREA AJUSTĂRILOR DE SOLDURI
  const loadBalanceAdjustments = useCallback(async () => {
    if (!association?.id) return {};

    try {
      console.log('📋 Încarc ajustările de solduri...');

      // 🎯 PRIORITATE: Citește din sheet dacă sunt disponibile
      if (sheetOperations?.currentSheet?.configSnapshot?.balanceAdjustments) {
        console.log('📖 SHEET-BASED: Citesc ajustările din sheet...');
        const sheetAdjustments = sheetOperations.currentSheet.configSnapshot.balanceAdjustments;

        // Convertește din formatul sheet (indexat după apartmentId) în formatul legacy
        const loadedAdjustments = {};
        Object.entries(sheetAdjustments).forEach(([apartmentId, adjustmentData]) => {
          const monthKey = adjustmentData.month || 'unknown';
          if (!loadedAdjustments[monthKey]) {
            loadedAdjustments[monthKey] = {};
          }
          loadedAdjustments[monthKey][apartmentId] = {
            restante: adjustmentData.restante || 0,
            penalitati: adjustmentData.penalitati || 0
          };
        });

        return loadedAdjustments;
      }

      // 📦 FALLBACK: Citește din colecțiile Firebase (pentru compatibilitate)
      console.log('📖 COLLECTION-FALLBACK: Citesc ajustările din colecții...');

      const adjustmentsQuery = query(
        collection(db, 'balanceAdjustments'),
        where('associationId', '==', association.id)
      );
      const adjustmentsSnapshot = await getDocs(adjustmentsQuery);

      const loadedAdjustments = {};
      adjustmentsSnapshot.docs.forEach(docSnapshot => {
        const data = docSnapshot.data();
        const monthKey = `${data.associationId}-${data.month}`;
        if (!loadedAdjustments[monthKey]) {
          loadedAdjustments[monthKey] = {};
        }
        loadedAdjustments[monthKey][data.apartmentId] = {
          restante: data.restante || 0,
          penalitati: data.penalitati || 0
        };
      });
      
      console.log('✅ Ajustări încărcate pentru', Object.keys(loadedAdjustments).length, 'luni');
      return loadedAdjustments;
      
    } catch (error) {
      console.error('❌ Eroare la încărcarea ajustărilor:', error);
      return {};
    }
  }, [association?.id, sheetOperations]);

  // 📥 ÎNCĂRCAREA SETĂRILOR PENALITĂȚILOR
  const loadPenaltySettings = useCallback(async () => {
    if (!association?.id) return;

    try {
      const settingsRef = doc(db, 'associations', association.id, 'settings', 'app');
      const settingsDoc = await getDoc(settingsRef);

      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        if (data.generalSettings) {
          setPenaltySettings({
            defaultPenaltyRate: data.generalSettings.defaultPenaltyRate || 0.02,
            daysBeforePenalty: data.generalSettings.daysBeforePenalty || 30
          });
          console.log('📥 Setări penalități încărcate:', data.generalSettings);
        }
      }
    } catch (error) {
      console.error('❌ Eroare la încărcarea setărilor penalităților:', error);
    }
  }, [association?.id]);

  // 🧮 CALCULUL AUTOMATIZAT AL SOLDURILOR PENTRU LUNA URMĂTOARE
  const calculateNextMonthBalances = useCallback((currentTable, currentMonth) => {
    console.log('🧮 Calculez soldurile pentru luna următoare...');
    
    const nextMonthDate = new Date();
    const currentMonthDate = new Date(currentMonth);
    nextMonthDate.setMonth(currentMonthDate.getMonth() + 1);
    const nextMonth = nextMonthDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    
    if (currentTable && currentTable.length > 0) {
      const nextMonthKey = `${association?.id}-${nextMonth}`;
      const nextMonthBalances = {};
      
      currentTable.forEach(row => {
        // Verificăm dacă apartamentul este plătit integral
        const isPaidInFull = row.isPaid === true;

        let remainingRestante, remainingMaintenance, remainingPenalties, totalRemaining;

        if (isPaidInFull) {
          // Dacă e plătit integral, nu transferăm nimic
          remainingRestante = 0;
          remainingMaintenance = 0;
          remainingPenalties = 0;
          totalRemaining = 0;
        } else {
          // Folosim datele actualizate din usePaymentSync care reflectă plățile parțiale
          remainingRestante = row.restante || 0; // Restanțele rămase după plăți
          remainingMaintenance = row.currentMaintenance || 0; // Întreținerea rămasă după plăți
          remainingPenalties = row.penalitati || 0; // Penalitățile rămase după plăți

          // Calculează totalul rămas
          totalRemaining = remainingRestante + remainingMaintenance + remainingPenalties;
        }
        
        console.log(`🔍 Ap.${row.apartment} - Analiza plăți:`, {
          totalDatorat: row.totalDatorat,
          totalIntretinere: row.totalIntretinere,
          currentMaintenance: row.currentMaintenance,
          restante: row.restante,
          penalitati: row.penalitati,
          remainingRestante,
          remainingMaintenance,
          remainingPenalties,
          totalRemaining,
          isPaid: row.isPaid,
          calculatedNextRestante: remainingRestante + remainingMaintenance,
          paymentInfo: row.paymentInfo
        });
        
        if (totalRemaining > 0) {
          // Mai sunt datorii de transferat în luna următoare
          // Pentru luna următoare, ce rămâne neplătit din luna curentă devine "restanță"
          // LOGIC: Restanța în Sheet 2 = Total Întreținere din Sheet 1 (întreținere + restanțe vechi)
          const nextMonthRestante = Math.round((remainingRestante + remainingMaintenance) * 100) / 100;
          
          // Calculăm penalty doar pe întreținerea curentă neplătită folosind rata configurată
          // Nu aplicăm penalty pe restanțe sau penalități existente
          const penaltyOnCurrentMaintenance = remainingMaintenance > 0 ? (remainingMaintenance * penaltySettings.defaultPenaltyRate) : 0;
          
          // Penalitățile pentru luna următoare = penalitățile rămase + penalty pe întreținerea neplătită
          const nextMonthPenalitati = Math.round((remainingPenalties + penaltyOnCurrentMaintenance) * 100) / 100;
          
          nextMonthBalances[row.apartmentId] = {
            restante: nextMonthRestante,
            penalitati: nextMonthPenalitati
          };
          
          console.log(`✅ Ap.${row.apartment}: Transfer → Restante=${nextMonthRestante}, Penalitati=${nextMonthPenalitati}, PenaltyAdded=${penaltyOnCurrentMaintenance}`);
        } else {
          // Totul plătit - nu se transferă nimic
          nextMonthBalances[row.apartmentId] = { restante: 0, penalitati: 0 };
          console.log(`✅ Ap.${row.apartment}: Totul plătit - balante resetate`);
        }
      });
      
      console.log('✅ Solduri calculate pentru', nextMonth, ':', Object.keys(nextMonthBalances).length, 'apartamente');
      return { [nextMonthKey]: nextMonthBalances };
    }

    return {};
  }, [association?.id, penaltySettings.defaultPenaltyRate]);


  // 🎯 RETURN API
  return {
    // 📊 State și date
    hasInitialBalances,
    setHasInitialBalances,
    disabledExpenses,
    setDisabledExpenses,
    initialBalances,
    setInitialBalances,
    
    // 🔧 Funcții de management
    loadInitialBalances,
    saveInitialBalances,
    saveBalanceAdjustments,
    loadBalanceAdjustments,
    calculateNextMonthBalances,
    
    // 🚫 Gestionare cheltuieli eliminate
    toggleExpenseStatus,
    saveDisabledExpenses
  };
};