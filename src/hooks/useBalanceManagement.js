/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import { useState, useCallback, useEffect, useRef } from 'react';
import { getDocs, doc, query, where, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { defaultExpenseTypes } from '../data/expenseTypes';
import { getSheetRef, getSheetsCollection } from '../utils/firestoreHelpers';

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
  const [currentSheetId, setCurrentSheetId] = useState(null);

  // 🔒 REF pentru a urmări update-urile optimiste în curs
  const pendingUpdatesRef = useRef(new Map());


  // 🔄 ÎNCĂRCAREA CONFIGURĂRILOR LA SCHIMBAREA ASOCIAȚIEI
  useEffect(() => {
    if (association?.id) {
      loadInitialBalances();
      loadPenaltySettings();
    }
  }, [association?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 🔄 SINCRONIZARE AUTOMATĂ disabledExpenses DIN currentSheet
  useEffect(() => {
    if (sheetOperations?.currentSheet && association?.id) {
      const sheetData = sheetOperations.currentSheet;
      const sheetDisabledExpenses = sheetData.configSnapshot?.disabledExpenses || [];
      const key = `${association.id}-${sheetData.id}`;

      // Verifică dacă există un update optimist în curs pentru acest key
      const pendingUpdate = pendingUpdatesRef.current.get(key);

      if (pendingUpdate) {
        // Compară cu update-ul optimist pentru a vedea dacă Firebase s-a sincronizat
        const firebaseSynced =
          pendingUpdate.length === sheetDisabledExpenses.length &&
          pendingUpdate.every(exp => sheetDisabledExpenses.includes(exp));

        if (firebaseSynced) {
          // Firebase s-a sincronizat - elimină update-ul din pending
          pendingUpdatesRef.current.delete(key);
        } else {
          // Update-ul optimist este încă în curs - ignoră Firebase sync
          return;
        }
      }

      // Actualizează doar dacă datele s-au schimbat (evită bucla infinită)
      setDisabledExpenses(prev => {
        const currentExpenses = prev[key] || [];

        // Compară array-urile pentru a vedea dacă sunt diferite
        const hasChanged =
          currentExpenses.length !== sheetDisabledExpenses.length ||
          !currentExpenses.every((exp, idx) => exp === sheetDisabledExpenses[idx]);

        if (hasChanged) {
          return {
            ...prev,
            [key]: sheetDisabledExpenses
          };
        }

        return prev; // Nu actualiza dacă nu s-a schimbat nimic
      });

      // Actualizează currentSheetId
      if (sheetData.id !== currentSheetId) {
        setCurrentSheetId(sheetData.id);
      }
    }
  });


  // 📥 ÎNCĂRCAREA SOLDURILOR DIN SHEET
  // SHEET-BASED ARCHITECTURE: Citește DOAR din currentSheet.configSnapshot.balanceAdjustments
  const loadInitialBalances = useCallback(async () => {
    if (!association?.id) return;

    try {
      // Încarcă direct din sheet-ul IN_PROGRESS
      const sheetsQuery = query(
        getSheetsCollection(association.id),
        where('status', '==', 'IN_PROGRESS')
      );
      const sheetsSnapshot = await getDocs(sheetsQuery);

      let loadedBalances = {};
      let loadedDisabledExpenses = {};

      if (!sheetsSnapshot.empty) {
        const sheetDoc = sheetsSnapshot.docs[0];
        const sheetData = sheetDoc.data();

        // 1. Încarcă soldurile inițiale din configSnapshot.balanceAdjustments
        const balanceAdjustments = sheetData.configSnapshot?.balanceAdjustments || {};
        Object.entries(balanceAdjustments).forEach(([apartmentId, balance]) => {
          loadedBalances[apartmentId] = {
            restante: balance.restante || 0,
            penalitati: balance.penalitati || 0
          };
        });

        // 2. Încarcă cheltuielile eliminate din configSnapshot.disabledExpenses
        const sheetDisabledExpenses = sheetData.configSnapshot?.disabledExpenses || [];

        // Convertește formatul din sheet în formatul așteptat de componente
        // Pentru sheet-uri, folosim monthYear ca cheie
        const key = `${association.id}-${sheetData.monthYear}`;
        loadedDisabledExpenses[key] = sheetDisabledExpenses;

      }

      // 3. Actualizează state-urile
      setDisabledExpenses(loadedDisabledExpenses);

      if (Object.keys(loadedBalances).length > 0) {
        setHasInitialBalances(true);
        setInitialBalances(loadedBalances);
      }

      return {
        balances: loadedBalances,
        disabledExpenses: loadedDisabledExpenses
      };

    } catch (error) {
      console.error('❌ Eroare la încărcarea configurărilor din sheet:', error);
      throw error;
    }
  }, [association?.id]);

  // 💾 SALVAREA SOLDURILOR INIȚIALE ÎN SHEET
  // SHEET-BASED ARCHITECTURE: Scrie DOAR în configSnapshot.balanceAdjustments
  const saveInitialBalances = useCallback(async (monthlyBalances, currentMonth) => {
    if (!association?.id) {
      throw new Error('Nu există asociație selectată');
    }

    // 🎯 REQUIRED: Necesită sheet operations pentru arhitectura sheet-based
    if (!sheetOperations?.updateConfigSnapshot || !sheetOperations?.currentSheet) {
      throw new Error('Sheet operations not available. Cannot save balances without sheet.');
    }

    try {

      const currentMonthStr = currentMonth || new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
      const monthKey = `${association.id}-${currentMonthStr}`;
      const currentBalances = monthlyBalances[monthKey] || {};

      // Creează obiectul de ajustări pentru sheet indexat după apartmentId
      const balanceAdjustments = {};
      Object.entries(currentBalances).forEach(([apartmentId, balance]) => {
        balanceAdjustments[apartmentId] = {
          restante: balance.restante || 0,
          penalitati: balance.penalitati || 0,
          savedAt: new Date().toISOString(),
          month: currentMonthStr
        };
      });

      // Actualizează config snapshot-ul în sheet
      const updatedConfigData = {
        ...sheetOperations.currentSheet.configSnapshot,
        balanceAdjustments: balanceAdjustments
      };

      await sheetOperations.updateConfigSnapshot(updatedConfigData);

      setHasInitialBalances(true);

      return true;
    } catch (error) {
      console.error('❌ Eroare la salvarea soldurilor în sheet:', error);
      throw error;
    }
  }, [association?.id, sheetOperations]);

  // 🔄 SALVAREA AJUSTĂRILOR DE SOLDURI ÎN SHEET
  // SHEET-BASED ARCHITECTURE: Scrie DOAR în configSnapshot.balanceAdjustments
  const saveBalanceAdjustments = useCallback(async (month, adjustmentData) => {
    if (!association?.id) {
      throw new Error('Nu există asociație selectată');
    }

    // 🎯 REQUIRED: Necesită sheet operations pentru arhitectura sheet-based
    if (!sheetOperations?.updateConfigSnapshot || !sheetOperations?.currentSheet) {
      throw new Error('Sheet operations not available. Cannot save balance adjustments without sheet.');
    }

    try {
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

      return true;
    } catch (error) {
      console.error('❌ Eroare la salvarea ajustărilor în sheet:', error);
      throw error;
    }
  }, [association?.id, sheetOperations]);

  // 💾 SALVAREA CHELTUIELILOR ELIMINATE ÎN SHEET
  const saveDisabledExpenses = useCallback(async (sheetId, expenseName, disable) => {
    if (!sheetId) {
      console.error('❌ INVALID sheetId:', sheetId);
      return;
    }

    try {
      // Citește sheet-ul direct folosind ID-ul
      const sheetDoc = await getDoc(getSheetRef(association.id, sheetId));

      if (!sheetDoc.exists()) {
        console.warn('⚠️ Nu există sheet-ul cu ID-ul', sheetId);
        return;
      }

      const sheetData = sheetDoc.data();
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
      await updateDoc(getSheetRef(association.id, sheetDoc.id), {
        'configSnapshot.disabledExpenses': updatedExpenseNames
      });
    } catch (error) {
      console.error('❌ Eroare la salvarea cheltuielilor eliminate:', error);
      throw error;
    }
  }, []);

  // 🚫 GESTIONAREA CHELTUIELILOR ELIMINATE - UNIFIED STRUCTURE: Folosește isEnabled flag
  const toggleExpenseStatus = useCallback(async (expenseName, currentMonth, disable = true, targetSheetId = null) => {

    // 🎯 SCRIERE: Folosește targetSheetId dacă e furnizat, altfel currentSheet
    // Acest parametru permite specificarea exactă a sheet-ului în care se scrie
    const workingSheetId = targetSheetId || sheetOperations?.currentSheet?.id;

    // Găsește sheet-ul complet pentru a accesa configurațiile
    const workingSheet = targetSheetId
      ? (sheetOperations?.currentSheet?.id === targetSheetId ? sheetOperations.currentSheet : sheetOperations?.publishedSheet)
      : sheetOperations?.currentSheet;


    if (!association?.id || !workingSheetId || !workingSheet) return;

    const expenseConfigurations = workingSheet.configSnapshot?.expenseConfigurations || {};

    try {
      // 🆕 UNIFIED STRUCTURE: Găsește ID-ul cheltuielii din expenseName
      let expenseId = expenseName;

      // Verifică dacă expenseName este deja un ID
      if (!expenseName.startsWith('expense-type-') && !expenseName.startsWith('custom-')) {
        // Este un nume - caută ID-ul
        // 1. Caută în configurații existente
        const existingConfig = Object.values(expenseConfigurations).find(config => config.name === expenseName);
        if (existingConfig) {
          expenseId = existingConfig.id;
        } else {
          // 2. Caută în defaultExpenseTypes
          const defaultType = defaultExpenseTypes.find(def => def.name === expenseName);
          if (defaultType) {
            expenseId = defaultType.id;
          }
        }
      }


      // 🆕 UNIFIED STRUCTURE: Actualizează isEnabled în expenseConfigurations
      const existingConfig = expenseConfigurations[expenseId] || {};

      const updatedConfig = {
        ...existingConfig,
        id: expenseId,
        name: expenseName,
        isEnabled: !disable, // disable=true → isEnabled=false
        isCustom: existingConfig.isCustom !== undefined ? existingConfig.isCustom : expenseId.startsWith('custom-'),
        updatedAt: new Date().toISOString()
      };

      const updatedConfigurations = {
        ...expenseConfigurations,
        [expenseId]: updatedConfig
      };


      // Salvează în Firebase
      await updateDoc(getSheetRef(association.id, workingSheetId), {
        'configSnapshot.expenseConfigurations': updatedConfigurations,
        'configSnapshot.updatedAt': serverTimestamp()
      });


    } catch (error) {
      console.error('❌ Eroare la actualizarea statusului cheltuielii:', error);
      throw error;
    }
  }, [association?.id, sheetOperations]);

  // 📋 ÎNCĂRCAREA AJUSTĂRILOR DE SOLDURI
  const loadBalanceAdjustments = useCallback(async () => {
    if (!association?.id) return {};

    try {

      // 🎯 PRIORITATE: Citește din sheet dacă sunt disponibile
      if (sheetOperations?.currentSheet?.configSnapshot?.balanceAdjustments) {
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

      // ❌ FALLBACK REMOVED (2025-01-05): No longer reading from balanceAdjustments collection
      // All balance data is now stored exclusively in sheets (currentSheet.configSnapshot.balanceAdjustments)
      // If no sheet data exists, return empty object (no legacy collection fallback)
      return {};
      
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
        }
      }
    } catch (error) {
      console.error('❌ Eroare la încărcarea setărilor penalităților:', error);
    }
  }, [association?.id]);

  // 🧮 CALCULUL AUTOMATIZAT AL SOLDURILOR PENTRU LUNA URMĂTOARE
  const calculateNextMonthBalances = useCallback((currentTable, currentMonth) => {
    
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
          
        } else {
          // Totul plătit - nu se transferă nimic
          nextMonthBalances[row.apartmentId] = { restante: 0, penalitati: 0 };
        }
      });
      
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