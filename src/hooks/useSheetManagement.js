// hooks/useSheetManagement.js
// SISTEM NOU DE SHEET-URI PENTRU FIECARE LUNĂ PUBLICATĂ
// Fiecare sheet = snapshot complet al unei luni publicate

import React, { useState, useCallback, useEffect } from 'react';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  getDocs,
  deleteField
} from 'firebase/firestore';
import { db } from '../firebase';
import { defaultExpenseTypes } from '../data/expenseTypes';
import { getSheetRef, getSheetsCollection, createNewSheetRef } from '../utils/firestoreHelpers';

/**
 * Sheet Status Types:
 * - IN_PROGRESS: Luna curentă în lucru (se pot adăuga cheltuieli)
 * - PUBLISHED: Luna publicată (se pot face doar încasări)
 * - ARCHIVED: Luna arhivată (doar vizualizare)
 */
export const SHEET_STATUS = {
  IN_PROGRESS: 'in_progress',
  PUBLISHED: 'published',
  ARCHIVED: 'archived'
};

/**
 * Helper: Inițializează expenseConfigurations cu toate cheltuielile standard
 * Fiecare cheltuială standard primește:  id, name, isCustom: false, isEnabled: true
 */
const initializeStandardExpenseConfigurations = () => {
  const configs = {};

  defaultExpenseTypes.forEach(expenseType => {
    configs[expenseType.id] = {
      id: expenseType.id,
      name: expenseType.name,
      isCustom: false,
      isEnabled: true,

      // Setări default din expenseTypes.js
      defaultDistribution: expenseType.defaultDistribution,
      ...(expenseType.consumptionUnit && { consumptionUnit: expenseType.consumptionUnit }),
      ...(expenseType.invoiceEntryMode && { invoiceEntryMode: expenseType.invoiceEntryMode }),
      ...(expenseType.expenseEntryMode && { expenseEntryMode: expenseType.expenseEntryMode }),
      ...(expenseType.fixedAmountMode && { fixedAmountMode: expenseType.fixedAmountMode }),

      // Configurare utilizator (inițial goală)
      distributionType: expenseType.defaultDistribution,
      method: expenseType.defaultDistribution,
      supplierId: null,
      supplierName: '',
      contractNumber: '',
      contactPerson: '',

      // Timestamps
      createdAt: new Date().toISOString()
    };
  });

  return configs;
};

export const useSheetManagement = (associationId) => {
  // State pentru sheet-uri
  const [sheets, setSheets] = useState([]);
  const [currentSheet, setCurrentSheet] = useState(null);
  const [publishedSheet, setPublishedSheet] = useState(null);
  const [archivedSheets, setArchivedSheets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Încarcă toate sheet-urile pentru asociație
  useEffect(() => {
    if (!associationId) return;

    setLoading(true);
    // Query-ul folosește acum nested structure - nu mai e nevoie de where clause
    const sheetsQuery = getSheetsCollection(associationId);

    const unsubscribe = onSnapshot(
      sheetsQuery,
      (snapshot) => {
        const sheetsData = [];
        let inProgressSheet = null;
        let publishedSheet = null;
        const archivedList = [];

        snapshot.forEach((doc) => {
          const data = { id: doc.id, ...doc.data() };
          sheetsData.push(data);

          console.log('📄 Sheet raw data:', {
            id: data.id,
            monthYear: data.monthYear,
            status: data.status,
            statusType: typeof data.status,
            statusMatch_IN_PROGRESS: data.status === SHEET_STATUS.IN_PROGRESS,
            statusMatch_PUBLISHED: data.status === SHEET_STATUS.PUBLISHED
          });

          // Clasifică sheet-urile după status
          switch (data.status) {
            case SHEET_STATUS.IN_PROGRESS:
              inProgressSheet = data;
              console.log('🟢 Found IN_PROGRESS sheet:', {
                id: inProgressSheet.id,
                monthYear: inProgressSheet.monthYear,
                hasMaintenanceTable: !!inProgressSheet.maintenanceTable,
                status: inProgressSheet.status
              });
              break;
            case SHEET_STATUS.PUBLISHED:
              publishedSheet = data;
              console.log('🔄 Found published sheet:', {
                id: publishedSheet.id,
                monthYear: publishedSheet.monthYear,
                hasMaintenanceTable: !!publishedSheet.maintenanceTable,
                maintenanceTableLength: publishedSheet.maintenanceTable?.length || 0,
                hasExpenses: !!publishedSheet.expenses,
                expensesLength: publishedSheet.expenses?.length || 0,
                status: publishedSheet.status
              });
              if (publishedSheet.expenses && publishedSheet.expenses.length > 0) {
                console.log('📦 Published sheet expenses:', JSON.stringify(publishedSheet.expenses, null, 2));
              }
              break;
            case SHEET_STATUS.ARCHIVED:
              archivedList.push(data);
              break;
            default:
              console.warn('⚠️ Sheet cu status necunoscut:', {
                id: data.id,
                monthYear: data.monthYear,
                status: data.status
              });
          }
        });

        console.log('📊 Sheets loaded:', {
          totalSheets: sheetsData.length,
          inProgress: inProgressSheet ? { id: inProgressSheet.id, month: inProgressSheet.monthYear, status: inProgressSheet.status } : null,
          published: publishedSheet ? { id: publishedSheet.id, month: publishedSheet.monthYear, status: publishedSheet.status } : null,
          archived: archivedList.length
        });

        console.log('🔄 Updating React state:', {
          settingCurrentSheet: inProgressSheet ? inProgressSheet.id : null,
          settingPublishedSheet: publishedSheet ? publishedSheet.id : null
        });

        setSheets(sheetsData);
        setCurrentSheet(inProgressSheet);
        setPublishedSheet(publishedSheet);
        setArchivedSheets(archivedList);
        setLoading(false);
      },
      (error) => {
        // Eroare la încărcarea sheet-urilor
        console.error('Error loading sheets:', error);
        setError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [associationId]);

  /**
   * Creează primul sheet la înregistrarea asociației
   * Doar un singur sheet în lucru la început
   */
  const createInitialSheet = useCallback(async (associationData, explicitAssociationId = null) => {
    // Folosește ID-ul explicit dacă este furnizat, altfel folosește cel din hook
    const idToUse = explicitAssociationId || associationId;

    if (!idToUse || !associationData) {
      throw new Error('Association ID și data sunt necesare');
    }

    try {
      const currentDate = new Date();
      const previousDate = new Date(currentDate);
      previousDate.setMonth(previousDate.getMonth() - 1);

      const monthYear = currentDate.toLocaleDateString('ro-RO', {
        month: 'long',
        year: 'numeric'
      });

      const consumptionMonthYear = previousDate.toLocaleDateString('ro-RO', {
        month: 'long',
        year: 'numeric'
      });

      const sheetData = {
        associationId: idToUse,
        monthYear,
        customMonthName: monthYear, // Setăm luna curentă ca luna de lucru
        consumptionMonth: consumptionMonthYear, // Luna anterioară pentru consumuri
        status: SHEET_STATUS.IN_PROGRESS,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        
        // SNAPSHOT COMPLET - structura asociației în momentul creării
        associationSnapshot: {
          name: associationData.name || '',
          cui: associationData.cui || '',
          address: associationData.address || {},
          bankAccount: associationData.bankAccount || {},
          totalApartments: 0, // Se va actualiza când se adaugă apartamente
          blocks: [],
          stairs: [],
          apartments: [],
          // Timestamp când a fost creat snapshot-ul
          createdAt: serverTimestamp()
        },

        // Date financiare inițiale (toate goale pentru primul sheet)
        expenses: [],
        maintenanceTable: [],
        payments: [],
        balances: {
          previousMonth: 0,
          currentMonth: 0,
          transferred: false
        },

        // Configurări inițiale
        // IMPORTANT: expenseConfigurations se inițializează cu TOATE cheltuielile standard
        configSnapshot: {
          expenseConfigurations: initializeStandardExpenseConfigurations(), // ✅ Toate cheltuielile standard cu name, id, isCustom, isEnabled
          balanceAdjustments: {},
          suppliers: [],
          sheetInitialBalances: {},
          customSettings: {},
          createdAt: serverTimestamp()
          // NU mai cream customExpenses sau disabledExpenses - totul e în expenseConfigurations
        },

        // Metadata
        publishedAt: null,
        archivedAt: null,
        publishedBy: null,
        notes: 'Primul sheet creat pentru asociație'
      };

      const sheetRef = createNewSheetRef(idToUse);
      await setDoc(sheetRef, sheetData);

      console.log('✅ Sheet inițial creat:', monthYear);
      return sheetRef.id;
    } catch (error) {
      console.error('❌ Error creating initial sheet:', error);
      throw error;
    }
  }, []); // Eliminăm associationId din dependențe pentru că folosim explicitAssociationId

  /**
   * Actualizează snapshot-ul structurii pentru sheet-ul curent
   * Se apelează când se modifică structura (apartamente, blocuri, etc)
   * IMPORTANT: Actualizează DOAR sheet-ul curent în lucru, nu afectează sheet-urile publicate/arhivate
   * AUTOLOADING: Dacă datele nu sunt furnizate, le încarcă automat din Firebase
   */
  const updateStructureSnapshot = useCallback(async (completeStructureData = null) => {
    if (!currentSheet || currentSheet.status !== SHEET_STATUS.IN_PROGRESS) {
      console.warn('Nu există sheet în lucru pentru actualizare sau sheet-ul nu este editabil');
      return;
    }

    try {
      const sheetRef = getSheetRef(associationId, currentSheet.id);

      // 🔄 AUTOLOADING: Încarcă datele din Firebase dacă nu sunt furnizate sau sunt incomplete
      let structureData = completeStructureData;

      if (!structureData || !structureData.apartments || !structureData.blocks || !structureData.stairs) {
        console.log('🔄 updateStructureSnapshot: Încărcare automată a structurii din Firebase...');

        // Încarcă blocurile pentru asociația curentă
        const blocksSnapshot = await getDocs(query(collection(db, 'blocks'), where('associationId', '==', associationId)));
        const blocks = blocksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (blocks.length === 0) {
          console.warn('Nu au fost găsite blocuri pentru asociația:', associationId);
          structureData = {
            name: completeStructureData?.name || '',
            cui: completeStructureData?.cui || '',
            address: completeStructureData?.address || {},
            bankAccount: completeStructureData?.bankAccount || {},
            blocks: [],
            stairs: [],
            apartments: []
          };
        } else {
          // Încarcă scările și apartamentele pentru blocurile găsite
          const blockIds = blocks.map(block => block.id);

          const [stairsSnapshot, apartmentsSnapshot] = await Promise.all([
            getDocs(collection(db, 'stairs')), // Încărcăm toate scările pentru filtrare
            getDocs(collection(db, 'apartments')) // Încărcăm toate apartamentele pentru filtrare
          ]);

          const allStairs = stairsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const allApartments = apartmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          // Filtrează scările care aparțin blocurilor acestei asociații
          const associationStairs = allStairs.filter(stair => blockIds.includes(stair.blockId));
          const stairIds = associationStairs.map(stair => stair.id);

          // Filtrează apartamentele care aparțin scărilor acestei asociații
          const apartments = allApartments.filter(apt => stairIds.includes(apt.stairId));

          structureData = {
            name: completeStructureData?.name || '',
            cui: completeStructureData?.cui || '',
            address: completeStructureData?.address || {},
            bankAccount: completeStructureData?.bankAccount || {},
            blocks,
            stairs: associationStairs,
            apartments
          };
        }

        console.log(`✅ Încărcate din Firebase: ${structureData.blocks.length} blocuri, ${structureData.stairs.length} scări, ${structureData.apartments.length} apartamente`);
      }

      // Creează snapshot complet cu TOATE datele structurale
      const fullSnapshot = {
        // Informații asociație
        name: structureData.name || '',
        cui: structureData.cui || '',
        address: structureData.address || {},
        bankAccount: structureData.bankAccount || {},

        // Structura completă de apartamente (copie profundă)
        totalApartments: structureData.apartments ? structureData.apartments.length : 0,
        blocks: structureData.blocks ? [...structureData.blocks] : [],
        stairs: structureData.stairs ? [...structureData.stairs] : [],
        apartments: structureData.apartments ?
          structureData.apartments.map(apt => ({
            id: apt.id || '',
            number: apt.number || '',
            block: apt.block || '',
            stair: apt.stair || '',
            persons: apt.persons || 0,
            ownerName: apt.ownerName || '',
            email: apt.email || '',
            phone: apt.phone || '',
            // Păstrează TOATE proprietățile apartamentului
            ...apt
          })) : [],

        // Timestamp-ul când a fost actualizat
        lastStructureUpdate: serverTimestamp()
      };

      await setDoc(sheetRef, {
        associationSnapshot: fullSnapshot,
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log('✅ updateStructureSnapshot: Snapshot actualizat cu succes în sheet:', currentSheet.id);

    } catch (error) {
      console.error('❌ Error updating complete structure snapshot:', error);
      throw error;
    }
  }, [currentSheet, associationId]);

  /**
   * Adaugă cheltuială în sheet-ul curent (în lucru)
   * SNAPSHOT: Păstrează TOATE cheltuielile ca entități independente
   */
  const addExpenseToSheet = useCallback(async (expense) => {
    console.log('📥 addExpenseToSheet called with:', expense);
    console.log('📥 currentSheet:', { id: currentSheet?.id, status: currentSheet?.status });

    if (!currentSheet || currentSheet.status !== SHEET_STATUS.IN_PROGRESS) {
      console.error('❌ Cannot add expense - invalid sheet status');
      throw new Error('Nu se pot adăuga cheltuieli - sheet-ul nu este în lucru');
    }

    try {
      const sheetRef = getSheetRef(associationId, currentSheet.id);

      // Creează copie completă a cheltuielii cu toate datele, eliminând undefined
      const cleanedExpense = Object.fromEntries(
        Object.entries(expense).filter(([_, value]) => value !== undefined)
      );

      const expenseSnapshot = {
        id: expense.id || Date.now().toString(),
        name: expense.name || '',
        category: expense.category || '',
        amount: expense.amount || 0,
        billAmount: expense.billAmount || 0,
        supplier: expense.supplier || '',
        invoiceNumber: expense.invoiceNumber || '',
        dueDate: expense.dueDate || '',
        month: expense.month || '',
        consumptionData: expense.consumptionData ? [...expense.consumptionData] : [],
        // Păstrează TOATE proprietățile cheltuielii (fără undefined)
        ...cleanedExpense,
        // Timestamp când a fost adăugată în acest sheet
        addedToSheet: new Date().toISOString(),
        sheetId: currentSheet.id
      };

      console.log('📥 Created expense snapshot:', expenseSnapshot);

      const updatedExpenses = [...(currentSheet.expenses || []), expenseSnapshot];

      console.log('📥 Saving to Firebase - expenses array length:', updatedExpenses.length);

      await setDoc(sheetRef, {
        expenses: updatedExpenses,
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log('✅ Expense added to sheet successfully:', expenseSnapshot.id);
      return expenseSnapshot.id; // Returnează ID-ul cheltuielii

    } catch (error) {
      console.error('❌ Error adding expense snapshot:', error);
      throw error;
    }
  }, [currentSheet]);

  /**
   * Șterge o cheltuială din sheet-ul curent
   */
  const removeExpenseFromSheet = useCallback(async (expenseId) => {
    if (!currentSheet || currentSheet.status !== SHEET_STATUS.IN_PROGRESS) {
      return false;
    }

    try {
      const sheetRef = getSheetRef(associationId, currentSheet.id);

      // Obține cheltuielile actuale din sheet
      const currentExpenses = currentSheet.expenses || [];

      // Verifică dacă cheltuiala există
      const expenseExists = currentExpenses.some(expense => expense.id === expenseId);
      if (!expenseExists) {
          return false;
      }

      // Filtrează cheltuiala de șters
      const updatedExpenses = currentExpenses.filter(expense => expense.id !== expenseId);

      await updateDoc(sheetRef, {
        expenses: updatedExpenses,
        updatedAt: serverTimestamp()
      }, { merge: true });

      return true;

    } catch (error) {
      console.error('❌ Error removing expense from sheet:', error);
      throw error;
    }
  }, [currentSheet]);

  /**
   * Funcție helper pentru a elimina recursiv toate valorile undefined
   */
  const removeUndefinedValues = (obj) => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(removeUndefinedValues);

    return Object.keys(obj).reduce((acc, key) => {
      const value = obj[key];
      if (value !== undefined) {
        // Dacă valoarea este un obiect, curăță-l recursiv
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          acc[key] = removeUndefinedValues(value);
        } else {
          acc[key] = value;
        }
      }
      return acc;
    }, {});
  };

  /**
   * Actualizează o cheltuială existentă în sheet-ul curent
   */
  const updateExpenseInSheet = useCallback(async (expenseId, updatedExpenseData) => {
    if (!currentSheet || currentSheet.status !== SHEET_STATUS.IN_PROGRESS) {
      console.error('❌ Cannot update expense - invalid sheet status');
      throw new Error('Nu se pot actualiza cheltuieli - sheet-ul nu este în lucru');
    }

    try {
      const sheetRef = getSheetRef(associationId, currentSheet.id);

      // Obține cheltuielile actuale din sheet
      const currentExpenses = currentSheet.expenses || [];

      // Găsește index-ul cheltuielii de actualizat
      const expenseIndex = currentExpenses.findIndex(expense => expense.id === expenseId);
      if (expenseIndex === -1) {
        console.error('❌ Expense not found in sheet:', expenseId);
        throw new Error('Cheltuiala nu a fost găsită în sheet');
      }

      // Creează obiectul actualizat cu date curățate
      const mergedExpense = {
        ...currentExpenses[expenseIndex],
        ...updatedExpenseData,
        updatedAt: new Date().toISOString()
      };

      // Curăță recursiv valorile undefined
      const cleanedExpense = removeUndefinedValues(mergedExpense);

      // Creează array-ul actualizat de cheltuieli
      const updatedExpenses = [...currentExpenses];
      updatedExpenses[expenseIndex] = cleanedExpense;

      console.log('📝 Updating expense in sheet:', { expenseId, updatedData: cleanedExpense });

      await setDoc(sheetRef, {
        expenses: updatedExpenses,
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log('✅ Expense updated in sheet successfully:', expenseId);
      return true;

    } catch (error) {
      console.error('❌ Error updating expense in sheet:', error);
      throw error;
    }
  }, [currentSheet]);

  /**
   * Actualizează configurările pentru sheet-ul curent
   * SNAPSHOT: Păstrează configurări independente pentru fiecare sheet
   */
  const updateConfigSnapshot = useCallback(async (configData) => {
    if (!currentSheet || currentSheet.status !== SHEET_STATUS.IN_PROGRESS) {
      console.warn('Nu există sheet în lucru pentru actualizare configurări');
      return;
    }

    try {
      const sheetRef = getSheetRef(associationId, currentSheet.id);

      // 🆕 UNIFIED STRUCTURE: Creează snapshot doar cu structura unificată
      // NU mai includem customExpenses sau disabledExpenses - folosim doar expenseConfigurations

      // Construiește update-ul cu deleteField pentru câmpurile vechi
      const updates = {
        'configSnapshot.expenseConfigurations': configData.expenseConfigurations ? {...configData.expenseConfigurations} : {},
        'configSnapshot.balanceAdjustments': configData.balanceAdjustments ? {...configData.balanceAdjustments} : {},
        'configSnapshot.suppliers': configData.suppliers ? [...configData.suppliers] : [],
        'configSnapshot.sheetInitialBalances': configData.sheetInitialBalances ? {...configData.sheetInitialBalances} : {},
        'configSnapshot.customSettings': configData.customSettings ? {...configData.customSettings} : {},
        'configSnapshot.lastConfigUpdate': serverTimestamp(),
        'updatedAt': serverTimestamp()
      };

      // Șterge explicit câmpurile vechi (customExpenses, disabledExpenses)
      updates['configSnapshot.customExpenses'] = deleteField();
      updates['configSnapshot.disabledExpenses'] = deleteField();

      await updateDoc(sheetRef, updates);

      console.log('✅ Configurări snapshot actualizate pentru sheet:', currentSheet.monthYear);
    } catch (error) {
      console.error('❌ Error updating config snapshot:', error);
      throw error;
    }
  }, [currentSheet]);

  /**
   * Publică sheet-ul curent și creează automat următorul
   * Workflow principal: IN_PROGRESS → PUBLISHED + nou IN_PROGRESS
   */
  const publishCurrentSheet = useCallback(async (maintenanceData, publishedBy, options = {}) => {
    if (!currentSheet || currentSheet.status !== SHEET_STATUS.IN_PROGRESS) {
      throw new Error('Nu există sheet în lucru pentru publicare');
    }

    // 💳 VERIFICARE READ-ONLY MODE
    // Verifică dacă asociația sau subscription-ul sunt în modul read-only
    const { checkReadOnly = true, association = null, subscriptionStatus = null } = options;

    if (checkReadOnly) {
      // Verifică dacă asociația e suspendată
      if (association?.billingStatus === 'suspended' || association?.suspendedByOrganization) {
        throw new Error('READ_ONLY_ASSOCIATION_SUSPENDED');
      }

      // Verifică dacă subscription-ul e expirat sau suspendat
      if (subscriptionStatus === 'past_due' || subscriptionStatus === 'suspended') {
        throw new Error('READ_ONLY_SUBSCRIPTION_EXPIRED');
      }
    }

    // 🧹 CURĂȚĂ maintenanceData la început pentru a elimina toate valorile undefined
    const cleanedMaintenanceData = maintenanceData && maintenanceData.length > 0
      ? maintenanceData.map(row => removeUndefinedValues(row))
      : [];

    console.log('📋 Publishing sheet with maintenance data:', {
      sheetId: currentSheet.id,
      month: currentSheet.monthYear,
      maintenanceDataLength: cleanedMaintenanceData?.length,
      paymentsLength: currentSheet.payments?.length,
      expensesLength: currentSheet.expenses?.length,
      expenses: currentSheet.expenses,
      firstRowHasExpenseDetails: !!cleanedMaintenanceData?.[0]?.expenseDetails,
      firstRowExpenseDetailsKeys: Object.keys(cleanedMaintenanceData?.[0]?.expenseDetails || {})
    });

    const batch = writeBatch(db);

    try {
      // 1. Actualizează sheet-ul curent ca PUBLISHED
      const currentSheetRef = getSheetRef(associationId, currentSheet.id);

      // 🎯 CAPTUREAZĂ datele calculate la publicare
      const updateData = {
        status: SHEET_STATUS.PUBLISHED,
        publishedAt: serverTimestamp(),
        publishedBy,
        updatedAt: serverTimestamp()
      };

      // SALVEAZĂ maintenanceData calculat în sheet-ul publicat (snapshot complet)
      if (cleanedMaintenanceData && cleanedMaintenanceData.length > 0) {
        updateData.maintenanceTable = cleanedMaintenanceData;
      } else {
        console.log('⚠️ No maintenance data provided for publishing - keeping existing table');
      }

      // SALVEAZĂ cheltuielile distribuite în sheet-ul publicat
      if (currentSheet.expenses && currentSheet.expenses.length > 0) {
        updateData.expenses = currentSheet.expenses;
        console.log('💾 Salvare expenses la publicare:', currentSheet.expenses.length, 'cheltuieli');
        console.log('📋 Expenses înainte de curățare:', JSON.stringify(currentSheet.expenses, null, 2));
      }

      // 🎯 SALVEAZĂ snapshot al apartamentelor la publicare
      // Astfel, lunile publicate vor avea datele apartamentelor "înghețate" la momentul publicării
      if (currentSheet.associationSnapshot?.apartments) {
        updateData.associationSnapshot = {
          ...currentSheet.associationSnapshot,
          apartments: currentSheet.associationSnapshot.apartments.map(apt => ({...apt}))
        };
        console.log('🏢 Salvare snapshot apartamente la publicare:',
          currentSheet.associationSnapshot.apartments.length, 'apartamente');
      }

      // Curăță valorile undefined din updateData
      const cleanedUpdateData = removeUndefinedValues(updateData);
      console.log('🧹 UpdateData după curățare - are expenses?', {
        hasExpenses: !!cleanedUpdateData.expenses,
        expensesLength: cleanedUpdateData.expenses?.length,
        expenses: cleanedUpdateData.expenses,
        hasApartmentsSnapshot: !!cleanedUpdateData.associationSnapshot?.apartments,
        apartmentsCount: cleanedUpdateData.associationSnapshot?.apartments?.length
      });

      batch.update(currentSheetRef, cleanedUpdateData);

      // 2. Arhivează sheet-ul publicat anterior (dacă există)
      if (publishedSheet) {
        const previousSheetRef = getSheetRef(associationId, publishedSheet.id);
        batch.update(previousSheetRef, {
          status: SHEET_STATUS.ARCHIVED,
          archivedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      // 3. Creează noul sheet în lucru pentru luna următoare
      // Calculăm lunile următoare bazat pe schema existentă
      let nextWorkingMonth, nextConsumptionMonth;

      if (currentSheet.customMonthName && currentSheet.consumptionMonth) {
        // Avem setări personalizate, le incrementăm păstrând diferența
        const workingParts = currentSheet.customMonthName.split(' ');
        const consumptionParts = currentSheet.consumptionMonth.split(' ');

        // Parsăm lunile și anii
        const workingMonthName = workingParts.slice(0, -1).join(' ').toLowerCase();
        const workingYear = parseInt(workingParts[workingParts.length - 1]);
        const consumptionMonthName = consumptionParts.slice(0, -1).join(' ').toLowerCase();
        const consumptionYear = parseInt(consumptionParts[consumptionParts.length - 1]);

        // Găsim indexurile lunilor
        const romanianMonths = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
                               'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
        const workingMonthIndex = romanianMonths.indexOf(workingMonthName);
        const consumptionMonthIndex = romanianMonths.indexOf(consumptionMonthName);

        // Calculăm lunile următoare
        const nextWorkingDate = new Date(workingYear, workingMonthIndex + 1);
        const nextConsumptionDate = new Date(consumptionYear, consumptionMonthIndex + 1);

        nextWorkingMonth = `${romanianMonths[nextWorkingDate.getMonth()]} ${nextWorkingDate.getFullYear()}`;
        nextConsumptionMonth = `${romanianMonths[nextConsumptionDate.getMonth()]} ${nextConsumptionDate.getFullYear()}`;

        console.log('📅 Calculare luni următoare:', {
          currentWorking: currentSheet.customMonthName,
          currentConsumption: currentSheet.consumptionMonth,
          nextWorking: nextWorkingMonth,
          nextConsumption: nextConsumptionMonth
        });
      } else {
        // Fallback la incrementare standard
        const nextDate = new Date();
        nextDate.setMonth(nextDate.getMonth() + 1);
        const prevDate = new Date(nextDate);
        prevDate.setMonth(prevDate.getMonth() - 1);

        nextWorkingMonth = nextDate.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
        nextConsumptionMonth = prevDate.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
      }

      // 🔄 TRANSFER INDECȘI: newIndex → oldIndex pentru luna următoare
      // IMPORTANT: Nu transferăm cheltuielile distribuite - luna nouă începe fără distribuiri
      const transferIndexesToNewSheet = (expenses) => {
        // Luna nouă începe FĂRĂ cheltuieli distribuite
        // DAR transferăm indexurile: newIndex → oldIndex pentru luna următoare
        if (!expenses || expenses.length === 0) return [];

        // Helper local pentru a obține configurația cheltuielii din snapshot-ul sheet-ului
        const getConfigFromSnapshot = (expenseId) => {
          const configs = currentSheet.configSnapshot?.expenseConfigurations || {};
          return configs[expenseId] || null;
        };

        const expensesWithTransferredIndexes = [];

        expenses.forEach(expense => {
          // Verifică dacă cheltuiala are configurare de indexuri activată
          const config = getConfigFromSnapshot(expense.expenseTypeId || expense.name);
          if (!config?.indexConfiguration?.enabled) return; // Skip dacă nu are indexuri

          // Verifică dacă are indexuri de transferat
          if (!expense.indexes || Object.keys(expense.indexes).length === 0) return;

          // Construiește indexurile transferate
          const transferredIndexes = {};
          Object.keys(expense.indexes).forEach(apartmentId => {
            const apartmentIndexes = expense.indexes[apartmentId];
            const transferredApartmentIndexes = {};

            Object.keys(apartmentIndexes).forEach(indexTypeId => {
              const indexData = apartmentIndexes[indexTypeId];
              // Transfer: newIndex → oldIndex, newIndex devine gol
              if (indexData.newIndex) {
                transferredApartmentIndexes[indexTypeId] = {
                  oldIndex: indexData.newIndex,
                  oldIndexSource: 'transferred', // 🎯 FLAG: marchez ca transferat automat
                  newIndex: '',
                  meterName: indexData.meterName || ''
                };
              }
            });

            if (Object.keys(transferredApartmentIndexes).length > 0) {
              transferredIndexes[apartmentId] = transferredApartmentIndexes;
            }
          });

          // Dacă am indexuri de transferat, creează o cheltuială cu doar aceste indexuri
          if (Object.keys(transferredIndexes).length > 0) {
            expensesWithTransferredIndexes.push({
              id: expense.id,
              name: expense.name,
              expenseTypeId: expense.expenseTypeId,
              distributionType: expense.distributionType,
              indexes: transferredIndexes,
              // NU transferăm: consumption, individualAmounts, billAmount, etc.
              // Luna nouă începe fără date de distribuție
            });
          }
        });

        console.log('🔄 Transferred indexes to new sheet:', {
          originalExpenses: expenses.length,
          expensesWithIndexes: expensesWithTransferredIndexes.length,
          details: expensesWithTransferredIndexes.map(e => ({
            name: e.name,
            apartmentCount: Object.keys(e.indexes).length
          }))
        });

        return expensesWithTransferredIndexes;
      };

      // Validare associationId înainte de creare sheet nou
      if (!associationId) {
        throw new Error('associationId lipsește - nu se poate crea sheet nou');
      }

      const newSheetRef = createNewSheetRef(associationId);
      const newSheetData = {
        associationId: associationId, // IMPORTANT: folosim associationId din hook!
        monthYear: nextWorkingMonth, // Folosim luna de lucru calculată
        customMonthName: nextWorkingMonth, // Setăm direct luna de lucru
        consumptionMonth: nextConsumptionMonth, // Setăm luna de consum calculată
        status: SHEET_STATUS.IN_PROGRESS,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        // SNAPSHOT COMPLET - copiază TOATE datele din momentul publicării
        associationSnapshot: {
          // Informații asociație (din sheet-ul actual)
          name: currentSheet.associationSnapshot?.name || '',
          cui: currentSheet.associationSnapshot?.cui || '',
          address: currentSheet.associationSnapshot?.address || {},
          bankAccount: currentSheet.associationSnapshot?.bankAccount || {},

          // Structura completă de apartamente din momentul publicării
          totalApartments: currentSheet.associationSnapshot?.totalApartments || 0,
          blocks: currentSheet.associationSnapshot?.blocks ? [...currentSheet.associationSnapshot.blocks] : [],
          stairs: currentSheet.associationSnapshot?.stairs ? [...currentSheet.associationSnapshot.stairs] : [],
          apartments: currentSheet.associationSnapshot?.apartments ?
            currentSheet.associationSnapshot.apartments.map(apt => ({
              id: apt.id || '',
              number: apt.number || '',
              block: apt.block || '',
              stair: apt.stair || '',
              persons: apt.persons || 0,
              ownerName: apt.ownerName || '',
              // Păstrează toate proprietățile pentru fiecare apartament
              ...apt
            })) : []
        },

        // CHELTUIELI - copiază cu transfer automat de indecși
        expenses: transferIndexesToNewSheet(currentSheet.expenses || []),
        
        // Date financiare pentru noul sheet
        maintenanceTable: [],
        payments: [],
        
        // Transfer solduri din luna publicată (CALCULAT CORECT cu încasările PER APARTAMENT)
        balances: (() => {
          const apartmentBalances = calculateApartmentBalancesAfterPayments(cleanedMaintenanceData, currentSheet.payments || []);
          const totalBalance = calculateTotalBalanceAfterPayments(cleanedMaintenanceData, currentSheet.payments || []);

          console.log('🔄 Creating new sheet with transferred balances:', {
            nextMonth: nextWorkingMonth,
            apartmentBalancesCount: Object.keys(apartmentBalances).length,
            totalTransferredBalance: totalBalance,
            apartmentBalances: apartmentBalances
          });

          return {
            previousMonth: totalBalance,
            currentMonth: 0,
            transferred: true,
            transferredFrom: currentSheet.id,
            // SOLDURI INDIVIDUALE PE APARTAMENT cu plățile luate în calcul
            apartmentBalances: apartmentBalances,
            transferDetails: {
              originalBalance: calculateTotalBalance(cleanedMaintenanceData),
              totalPayments: calculateTotalPayments(currentSheet.payments || []),
              finalBalance: totalBalance
            }
          };
        })(),

        // Snapshot de CONFIGURĂRI (orice alte date importante)
        configSnapshot: {
          // Copiază configurările din sheet-ul publicat
          expenseConfigurations: currentSheet.configSnapshot?.expenseConfigurations || {},
          balanceAdjustments: currentSheet.configSnapshot?.balanceAdjustments || {},
          suppliers: currentSheet.configSnapshot?.suppliers || [], // 🆕 Copiază furnizorii din sheet-ul publicat
          // Orice alte configurări care trebuie păstrate
          createdFromSheet: currentSheet.id,
          createdFromMonth: currentSheet.monthYear
        },

        // Metadata
        publishedAt: null,
        archivedAt: null,
        publishedBy: null,
        notes: `Creat din ${currentSheet.monthYear} (${currentSheet.id})`
      };

      // Curăță valorile undefined din newSheetData înainte de a salva în Firebase
      const cleanedNewSheetData = removeUndefinedValues(newSheetData);

      batch.set(newSheetRef, cleanedNewSheetData);

      // Execută toate operațiile
      await batch.commit();
      

      console.log('✅ Sheet publicat și nou sheet creat:', {
        published: currentSheet.monthYear,
        newSheet: nextWorkingMonth
      });

      return { 
        publishedSheetId: currentSheet.id, 
        newSheetId: newSheetRef.id 
      };
    } catch (error) {
      console.error('❌ Error publishing sheet:', error);
      throw error;
    }
  }, [currentSheet, publishedSheet, associationId]);

  /**
   * Înregistrează o plată pe sheet-ul publicat
   * IMPORTANT: Actualizează și soldurile în sheet-ul curent pentru corelație în timp real
   */
  const addPaymentToPublishedSheet = useCallback(async (paymentData) => {
    if (!publishedSheet) {
      throw new Error('Nu există sheet publicat pentru înregistrare plăți');
    }

    const batch = writeBatch(db);

    try {
      // 1. Actualizează sheet-ul publicat cu plata
      const publishedSheetRef = getSheetRef(associationId, publishedSheet.id);
      const updatedPayments = [...(publishedSheet.payments || []), paymentData];
      
      // Recalculează balanța pentru sheet-ul publicat
      const updatedBalances = {
        ...publishedSheet.balances,
        currentMonth: publishedSheet.balances.currentMonth + paymentData.amount
      };

      batch.update(publishedSheetRef, {
        payments: updatedPayments,
        balances: updatedBalances,
        updatedAt: serverTimestamp()
      });

      // 2. Actualizează soldurile în sheet-ul curent (în lucru) pentru corelație în timp real
      if (currentSheet && currentSheet.balances?.transferredFrom === publishedSheet.id) {
        const currentSheetRef = getSheetRef(associationId, currentSheet.id);
        
        // Actualizează soldurile individuale per apartament
        const updatedApartmentBalances = { ...currentSheet.balances.apartmentBalances };
        
        if (updatedApartmentBalances[paymentData.apartmentId]) {
          // Scade plata din soldul rămas pentru apartamentul specific
          const currentRemaining = updatedApartmentBalances[paymentData.apartmentId].remaining || 0;
          const newRemaining = Math.max(0, currentRemaining - paymentData.amount);
          
          updatedApartmentBalances[paymentData.apartmentId] = {
            ...updatedApartmentBalances[paymentData.apartmentId],
            paid: (updatedApartmentBalances[paymentData.apartmentId].paid || 0) + paymentData.amount,
            remaining: newRemaining
          };
        }
        
        // Recalculează soldul total
        const newPreviousMonthBalance = currentSheet.balances.previousMonth - paymentData.amount;
        
        const updatedCurrentBalances = {
          ...currentSheet.balances,
          previousMonth: newPreviousMonthBalance,
          apartmentBalances: updatedApartmentBalances,
          transferDetails: {
            ...currentSheet.balances.transferDetails,
            totalPayments: (currentSheet.balances.transferDetails?.totalPayments || 0) + paymentData.amount,
            finalBalance: newPreviousMonthBalance
          }
        };

        batch.update(currentSheetRef, {
          balances: updatedCurrentBalances,
          updatedAt: serverTimestamp()
        });

        console.log('🔄 Actualizare solduri individuale în timp real:', {
          publishedSheet: publishedSheet.monthYear,
          currentSheet: currentSheet.monthYear,
          apartmentId: paymentData.apartmentId,
          payment: paymentData.amount,
          newApartmentRemaining: updatedApartmentBalances[paymentData.apartmentId]?.remaining,
          newPreviousBalance: newPreviousMonthBalance
        });
      }

      // Execută toate actualizările
      await batch.commit();

      console.log('✅ Plată înregistrată și corelație actualizată în timp real');
      
    } catch (error) {
      console.error('❌ Error adding payment with real-time correlation:', error);
      throw error;
    }
  }, [publishedSheet, currentSheet, associationId]);

  /**
   * Obține sheet-ul pentru o lună specifică
   */
  const getSheetByMonth = useCallback(async (monthYear) => {
    try {
      const sheetsQuery = query(
        getSheetsCollection(associationId),
        where('monthYear', '==', monthYear)
      );

      const snapshot = await getDocs(sheetsQuery);
      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting sheet by month:', error);
      throw error;
    }
  }, [associationId]);

  /**
   * Helper pentru calculul balanței totale din maintenance table
   */
  const calculateTotalBalance = (maintenanceData) => {
    if (!maintenanceData || !Array.isArray(maintenanceData)) return 0;
    
    return maintenanceData.reduce((total, row) => {
      const restante = row.restante || 0;
      const penalitati = row.penalitati || 0;
      const totalLuna = row.totalLuna || 0;
      return total + restante + penalitati + totalLuna;
    }, 0);
  };

  /**
   * Helper pentru calculul total plăți din payments
   */
  const calculateTotalPayments = (payments) => {
    if (!payments || !Array.isArray(payments)) return 0;
    
    return payments.reduce((total, payment) => {
      return total + (payment.amount || 0);
    }, 0);
  };

  /**
   * Helper pentru calculul soldului DUPĂ plăți (corelația corectă)
   * Aceasta este balanța care se transferă în noul sheet
   */
  const calculateTotalBalanceAfterPayments = (maintenanceData, payments) => {
    const totalBalance = calculateTotalBalance(maintenanceData);
    const totalPayments = calculateTotalPayments(payments);
    
    // Soldul final = Total facturi - Total plăți
    const finalBalance = totalBalance - totalPayments;
    
    console.log('🔄 Transfer Balance Calculation:', {
      maintenanceTotal: totalBalance,
      paymentsTotal: totalPayments,
      finalBalance: finalBalance,
      paymentsCount: payments?.length || 0
    });
    
    return finalBalance;
  };

  /**
   * Calculează soldurile individuale per apartament după plăți
   */
  const calculateApartmentBalancesAfterPayments = (maintenanceData, payments) => {
    if (!maintenanceData || !Array.isArray(maintenanceData)) {
      console.warn('⚠️ calculateApartmentBalancesAfterPayments: maintenanceData invalid');
      return {};
    }

    const apartmentBalances = {};

    // LOGICA CORECTĂ - adaptată din useBalanceManagement.calculateNextMonthBalances

    maintenanceData.forEach(row => {
      if (row.apartmentId) {
        // Verifică dacă apartamentul este plătit integral din status sau plăți
        let isPaidInFull = row.paid === true || row.isPaid === true;

        // Verifică plățile pentru acest apartament
        const apartmentPayments = payments ? payments.filter(p => p.apartmentId === row.apartmentId) : [];
        const totalPaid = apartmentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        // Dacă a plătit integral, consideră plătit
        if (totalPaid >= (row.totalDatorat || 0)) {
          isPaidInFull = true;
        }

        console.log(`  Apt ${row.apartment}: totalDatorat=${row.totalDatorat}, totalPaid=${totalPaid}, isPaidInFull=${isPaidInFull}`);

        if (isPaidInFull) {
          // Apartament plătit integral - nu transferă nimic
          apartmentBalances[row.apartmentId] = {
            original: row.totalDatorat || 0,
            paid: totalPaid,
            remaining: 0
          };
        } else {
          // Apartament cu datorii - calculează ce rămâne neplătit
          const remainingAmount = Math.max(0, (row.totalDatorat || 0) - totalPaid);

          apartmentBalances[row.apartmentId] = {
            original: row.totalDatorat || 0,
            paid: totalPaid,
            remaining: remainingAmount
          };
          console.log(`    💰 Rămâne de plătit: ${remainingAmount} RON`);
        }
      }
    });

    console.log('🏠 Final Apartment Balances After Payments (NEW LOGIC):', apartmentBalances);
    return apartmentBalances;
  };

  /**
   * CORECȚIE SOLDURI TRANSFERATE - pentru sheet-uri existente
   * Recalculează soldurile transferate din sheet-ul publicat în sheet-ul curent
   */
  const fixTransferredBalances = useCallback(async () => {
    if (!currentSheet || !publishedSheet) {
      console.error('❌ Nu există sheet-uri pentru corectare');
      return;
    }

    if (!publishedSheet.maintenanceTable || publishedSheet.maintenanceTable.length === 0) {
      console.error('❌ Sheet-ul publicat nu are maintenanceTable');

      // Dacă sheet-ul publicat nu are maintenanceTable, încearcă să folosești datele calculate
      // din useMaintenanceCalculation pentru luna publicată
      alert('Sheet-ul publicat nu are date salvate. Te rog să mergi la luna septembrie și să faci o mică modificare (ex: Ajustări Solduri) pentru a salva datele, apoi încearcă din nou.');
      return;
    }

    console.log('🔧 FIXING transferred balances from published sheet to current sheet');

    // Recalculează soldurile din sheet-ul publicat
    const correctedBalances = calculateApartmentBalancesAfterPayments(
      publishedSheet.maintenanceTable,
      publishedSheet.payments || []
    );


    // Actualizează sheet-ul curent cu soldurile corectate
    const currentSheetRef = getSheetRef(associationId, currentSheet.id);
    await updateDoc(currentSheetRef, {
      'balances.apartmentBalances': correctedBalances,
      'balances.transferred': true,
      'balances.transferredFrom': publishedSheet.id,
      updatedAt: serverTimestamp()
    });

    console.log('✅ Sheet-ul curent actualizat cu soldurile corectate');

    // Forțează reîncărcarea pentru a vedea modificările
    window.location.reload();
  }, [currentSheet, publishedSheet, associationId]);

  // REMOVED: resetPublishedSheetBalances function
  // Published sheets must remain LOCKED and never be modified after publishing

  /**
   * Actualizează numele personalizat pentru un sheet specific
   */
  const updateSheetCustomName = useCallback(async (sheetId, customName) => {
    if (!sheetId) {
      throw new Error('Sheet ID este necesar');
    }

    try {
      const sheetRef = getSheetRef(associationId, sheetId);
      await updateDoc(sheetRef, {
        customMonthName: customName,
        updatedAt: serverTimestamp()
      });

      console.log('✅ Numele personalizat al sheet-ului actualizat:', customName);
    } catch (error) {
      console.error('❌ Error updating custom sheet name:', error);
      throw error;
    }
  }, [associationId]);

  /**
   * Actualizează setările de luni pentru un sheet specific
   */
  const updateSheetMonthSettings = useCallback(async (sheetId, workingMonth, consumptionMonth) => {
    if (!sheetId) {
      throw new Error('Sheet ID este necesar');
    }

    try {
      const sheetRef = getSheetRef(associationId, sheetId);
      await updateDoc(sheetRef, {
        customMonthName: workingMonth,
        consumptionMonth: consumptionMonth,
        updatedAt: serverTimestamp()
      });

      console.log('✅ Setările de luni actualizate pentru sheet:', { workingMonth, consumptionMonth });
    } catch (error) {
      console.error('❌ Error updating sheet month settings:', error);
      throw error;
    }
  }, [associationId]);

  /**
   * Actualizează tabelul de întreținere al sheet-ului curent
   */
  const updateCurrentSheetMaintenanceTable = useCallback(async (maintenanceTable) => {
    if (!currentSheet?.id) {
      throw new Error('Nu există sheet curent pentru actualizare');
    }

    try {
      const sheetRef = getSheetRef(associationId, currentSheet.id);
      await updateDoc(sheetRef, {
        maintenanceTable: maintenanceTable,
        updatedAt: serverTimestamp()
      });

      console.log('✅ Tabelul de întreținere al sheet-ului curent actualizat');
    } catch (error) {
      console.error('❌ Error updating current sheet maintenance table:', error);
      throw error;
    }
  }, [currentSheet?.id, associationId]);

  /**
   * Resetează toate sheet-urile (pentru debug/test)
   * ATENȚIE: Șterge toate datele!
   */
  const resetAllSheets = useCallback(async () => {
    if (!window.confirm('⚠️ ATENȚIE: Aceasta va șterge TOATE sheet-urile! Continuați?')) {
      return;
    }

    try {
      const sheetsQuery = getSheetsCollection(associationId);

      const snapshot = await getDocs(sheetsQuery);
      const batch = writeBatch(db);

      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log('✅ Toate sheet-urile au fost șterse');
    } catch (error) {
      console.error('❌ Error resetting sheets:', error);
      throw error;
    }
  }, [associationId]);

  /**
   * Adaugă bloc direct în sheet-ul curent
   * IMPORTANT: Salvează în currentSheet.associationSnapshot, NU în colecții Firebase
   */
  const addBlockToSheet = useCallback(async (blockData) => {
    if (!currentSheet || currentSheet.status !== SHEET_STATUS.IN_PROGRESS) {
      throw new Error('Nu se pot adăuga blocuri - sheet-ul nu este în lucru');
    }

    try {
      const sheetRef = getSheetRef(associationId, currentSheet.id);

      // Creează noul bloc cu ID unic
      const newBlock = {
        id: Date.now().toString(), // ID unic pentru bloc
        ...blockData,
        associationId: associationId,
        createdAt: new Date().toISOString(),
        addedToSheet: new Date().toISOString(),
        sheetId: currentSheet.id
      };

      // Actualizează blocurile în associationSnapshot
      const currentBlocks = currentSheet.associationSnapshot?.blocks || [];
      const updatedBlocks = [...currentBlocks, newBlock];

      await setDoc(sheetRef, {
        associationSnapshot: {
          ...currentSheet.associationSnapshot,
          blocks: updatedBlocks,
          totalApartments: currentSheet.associationSnapshot?.totalApartments || 0,
          lastStructureUpdate: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log('✅ Bloc adăugat direct în sheet:', newBlock);
      return newBlock;

    } catch (error) {
      console.error('❌ Eroare la adăugarea blocului în sheet:', error);
      throw error;
    }
  }, [currentSheet, associationId]);

  /**
   * Adaugă scară direct în sheet-ul curent
   */
  const addStairToSheet = useCallback(async (stairData) => {
    if (!currentSheet || currentSheet.status !== SHEET_STATUS.IN_PROGRESS) {
      throw new Error('Nu se pot adăuga scări - sheet-ul nu este în lucru');
    }

    try {
      const sheetRef = getSheetRef(associationId, currentSheet.id);

      const newStair = {
        id: Date.now().toString(),
        ...stairData,
        createdAt: new Date().toISOString(),
        addedToSheet: new Date().toISOString(),
        sheetId: currentSheet.id
      };

      const currentStairs = currentSheet.associationSnapshot?.stairs || [];
      const updatedStairs = [...currentStairs, newStair];

      await setDoc(sheetRef, {
        associationSnapshot: {
          ...currentSheet.associationSnapshot,
          stairs: updatedStairs,
          lastStructureUpdate: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log('✅ Scară adăugată direct în sheet:', newStair);
      return newStair;

    } catch (error) {
      console.error('❌ Eroare la adăugarea scării în sheet:', error);
      throw error;
    }
  }, [currentSheet, associationId]);

  /**
   * Adaugă apartament direct în sheet-ul curent
   */
  const addApartmentToSheet = useCallback(async (apartmentData) => {
    if (!currentSheet || currentSheet.status !== SHEET_STATUS.IN_PROGRESS) {
      throw new Error('Nu se pot adăuga apartamente - sheet-ul nu este în lucru');
    }

    try {
      const sheetRef = getSheetRef(associationId, currentSheet.id);

      const newApartment = {
        id: Date.now().toString(),
        ...apartmentData,
        // Adaugă solduri inițiale dacă sunt furnizate
        initialBalance: apartmentData.initialBalance || {
          restante: 0,
          penalitati: 0,
          setupMonth: new Date().toISOString().slice(0, 7),
          createdAt: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        addedToSheet: new Date().toISOString(),
        sheetId: currentSheet.id
      };

      const currentApartments = currentSheet.associationSnapshot?.apartments || [];
      const updatedApartments = [...currentApartments, newApartment];

      await setDoc(sheetRef, {
        associationSnapshot: {
          ...currentSheet.associationSnapshot,
          apartments: updatedApartments,
          totalApartments: updatedApartments.length,
          lastStructureUpdate: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log('✅ Apartament adăugat direct în sheet:', newApartment);
      return newApartment;

    } catch (error) {
      console.error('❌ Eroare la adăugarea apartamentului în sheet:', error);
      throw error;
    }
  }, [currentSheet, associationId]);

  /**
   * Șterge bloc direct din sheet-ul curent
   */
  const deleteBlockFromSheet = useCallback(async (blockId) => {
    if (!currentSheet || currentSheet.status !== SHEET_STATUS.IN_PROGRESS) {
      throw new Error('Nu se pot șterge blocuri - sheet-ul nu este în lucru');
    }

    try {
      const sheetRef = getSheetRef(associationId, currentSheet.id);

      // Filtrează blocurile pentru a-l elimina pe cel cu ID-ul specificat
      const currentBlocks = currentSheet.associationSnapshot?.blocks || [];
      const updatedBlocks = currentBlocks.filter(block => block.id !== blockId);

      // Șterge și scările și apartamentele asociate cu blocul
      const currentStairs = currentSheet.associationSnapshot?.stairs || [];
      const currentApartments = currentSheet.associationSnapshot?.apartments || [];

      const updatedStairs = currentStairs.filter(stair => stair.blockId !== blockId);
      const updatedApartments = currentApartments.filter(apt => {
        const stairExists = updatedStairs.some(stair => stair.id === apt.stairId);
        return stairExists;
      });

      await setDoc(sheetRef, {
        associationSnapshot: {
          ...currentSheet.associationSnapshot,
          blocks: updatedBlocks,
          stairs: updatedStairs,
          apartments: updatedApartments,
          totalApartments: updatedApartments.length,
          lastStructureUpdate: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log('✅ Bloc șters din sheet cu toate scările și apartamentele asociate:', blockId);
      return true;

    } catch (error) {
      console.error('❌ Eroare la ștergerea blocului din sheet:', error);
      throw error;
    }
  }, [currentSheet, associationId]);

  /**
   * Șterge scară direct din sheet-ul curent
   */
  const deleteStairFromSheet = useCallback(async (stairId) => {
    if (!currentSheet || currentSheet.status !== SHEET_STATUS.IN_PROGRESS) {
      throw new Error('Nu se pot șterge scări - sheet-ul nu este în lucru');
    }

    try {
      const sheetRef = getSheetRef(associationId, currentSheet.id);

      // Filtrează scările pentru a-o elimina pe cea cu ID-ul specificat
      const currentStairs = currentSheet.associationSnapshot?.stairs || [];
      const updatedStairs = currentStairs.filter(stair => stair.id !== stairId);

      // Șterge și apartamentele asociate cu scara
      const currentApartments = currentSheet.associationSnapshot?.apartments || [];
      const updatedApartments = currentApartments.filter(apt => apt.stairId !== stairId);

      await setDoc(sheetRef, {
        associationSnapshot: {
          ...currentSheet.associationSnapshot,
          stairs: updatedStairs,
          apartments: updatedApartments,
          totalApartments: updatedApartments.length,
          lastStructureUpdate: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log('✅ Scară ștearsă din sheet cu toate apartamentele asociate:', stairId);
      return true;

    } catch (error) {
      console.error('❌ Eroare la ștergerea scării din sheet:', error);
      throw error;
    }
  }, [currentSheet, associationId]);

  /**
   * Șterge apartament direct din sheet-ul curent
   */
  const deleteApartmentFromSheet = useCallback(async (apartmentId) => {
    if (!currentSheet || currentSheet.status !== SHEET_STATUS.IN_PROGRESS) {
      throw new Error('Nu se pot șterge apartamente - sheet-ul nu este în lucru');
    }

    try {
      const sheetRef = getSheetRef(associationId, currentSheet.id);

      // Filtrează apartamentele pentru a-l elimina pe cel cu ID-ul specificat
      const currentApartments = currentSheet.associationSnapshot?.apartments || [];
      const updatedApartments = currentApartments.filter(apt => apt.id !== apartmentId);

      await setDoc(sheetRef, {
        associationSnapshot: {
          ...currentSheet.associationSnapshot,
          apartments: updatedApartments,
          totalApartments: updatedApartments.length,
          lastStructureUpdate: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log('✅ Apartament șters din sheet:', apartmentId);
      return true;

    } catch (error) {
      console.error('❌ Eroare la ștergerea apartamentului din sheet:', error);
      throw error;
    }
  }, [currentSheet, associationId]);

  /**
   * Actualizează bloc direct în sheet-ul curent
   */
  const updateBlockInSheet = useCallback(async (blockId, updatedData) => {
    if (!currentSheet || currentSheet.status !== SHEET_STATUS.IN_PROGRESS) {
      throw new Error('Nu se pot actualiza blocuri - sheet-ul nu este în lucru');
    }

    try {
      const sheetRef = getSheetRef(associationId, currentSheet.id);

      // Actualizează blocul în lista de blocuri
      const currentBlocks = currentSheet.associationSnapshot?.blocks || [];
      const updatedBlocks = currentBlocks.map(block =>
        block.id === blockId
          ? { ...block, ...updatedData, updatedAt: new Date().toISOString() }
          : block
      );

      await setDoc(sheetRef, {
        associationSnapshot: {
          ...currentSheet.associationSnapshot,
          blocks: updatedBlocks,
          lastStructureUpdate: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log('✅ Bloc actualizat în sheet:', blockId);
      return true;

    } catch (error) {
      console.error('❌ Eroare la actualizarea blocului în sheet:', error);
      throw error;
    }
  }, [currentSheet, associationId]);

  /**
   * Actualizează scară direct în sheet-ul curent
   */
  const updateStairInSheet = useCallback(async (stairId, updatedData) => {
    if (!currentSheet || currentSheet.status !== SHEET_STATUS.IN_PROGRESS) {
      throw new Error('Nu se pot actualiza scări - sheet-ul nu este în lucru');
    }

    try {
      const sheetRef = getSheetRef(associationId, currentSheet.id);

      // Actualizează scara în lista de scări
      const currentStairs = currentSheet.associationSnapshot?.stairs || [];
      const updatedStairs = currentStairs.map(stair =>
        stair.id === stairId
          ? { ...stair, ...updatedData, updatedAt: new Date().toISOString() }
          : stair
      );

      await setDoc(sheetRef, {
        associationSnapshot: {
          ...currentSheet.associationSnapshot,
          stairs: updatedStairs,
          lastStructureUpdate: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log('✅ Scară actualizată în sheet:', stairId);
      return true;

    } catch (error) {
      console.error('❌ Eroare la actualizarea scării în sheet:', error);
      throw error;
    }
  }, [currentSheet, associationId]);

  /**
   * Actualizează apartament direct în sheet-ul curent
   */
  const updateApartmentInSheet = useCallback(async (apartmentId, updatedData) => {
    if (!currentSheet || currentSheet.status !== SHEET_STATUS.IN_PROGRESS) {
      throw new Error('Nu se pot actualiza apartamente - sheet-ul nu este în lucru');
    }

    try {
      const sheetRef = getSheetRef(associationId, currentSheet.id);

      // Actualizează apartamentul în lista de apartamente
      const currentApartments = currentSheet.associationSnapshot?.apartments || [];
      const updatedApartments = currentApartments.map(apt =>
        apt.id === apartmentId
          ? { ...apt, ...updatedData, updatedAt: new Date().toISOString() }
          : apt
      );

      await setDoc(sheetRef, {
        associationSnapshot: {
          ...currentSheet.associationSnapshot,
          apartments: updatedApartments,
          lastStructureUpdate: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log('✅ Apartament actualizat în sheet:', apartmentId);
      return true;

    } catch (error) {
      console.error('❌ Eroare la actualizarea apartamentului în sheet:', error);
      throw error;
    }
  }, [currentSheet, associationId]);

  // 🆕 FAZA 8: Depublicare cu safeguard
  const unpublishSheet = useCallback(async (sheetId) => {
    if (!sheetId) {
      throw new Error('sheetId este obligatoriu pentru depublicare');
    }

    try {
      // 1. Încarcă sheet-ul care trebuie depublicat
      const sheetRef = getSheetRef(associationId, sheetId);
      const sheetDoc = await getDoc(sheetRef);

      if (!sheetDoc.exists()) {
        throw new Error('Sheet-ul nu există');
      }

      const sheetData = sheetDoc.data();

      // 2. SAFEGUARD: Verifică că nu există plăți înregistrate
      const payments = sheetData.payments || [];
      if (payments.length > 0) {
        throw new Error(
          `Nu se poate depublica sheet-ul deoarece există ${payments.length} plată/plăți înregistrată/înregistrate. ` +
          'Pentru a depublica, mai întâi ștergeți toate plățile asociate acestui sheet.'
        );
      }

      // 3. Verifică că sheet-ul este PUBLISHED
      if (sheetData.status !== SHEET_STATUS.PUBLISHED) {
        throw new Error('Doar sheet-urile cu status PUBLISHED pot fi depublicate');
      }

      // 4. Găsește sheet-ul IN_PROGRESS (creat automat la publicare)
      const nextSheetQuery = query(
        getSheetsCollection(associationId),
        where('status', '==', SHEET_STATUS.IN_PROGRESS)
      );

      const nextSheetSnapshot = await getDocs(nextSheetQuery);
      let nextSheetId = null;

      if (!nextSheetSnapshot.empty) {
        nextSheetId = nextSheetSnapshot.docs[0].id;
      }

      const batch = writeBatch(db);

      // 5. Schimbă statusul sheet-ului la IN_PROGRESS și șterge maintenanceTable pentru re-calculare
      const updateData = {
        status: SHEET_STATUS.IN_PROGRESS,
        publishedAt: null,
        publishedBy: null,
        unpublishedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Șterge maintenanceTable pentru a forța re-calcularea în mod editabil
        maintenanceTable: deleteField()
      };

      console.log('📝 Actualizare status sheet la depublicare:', {
        sheetId,
        newStatus: SHEET_STATUS.IN_PROGRESS,
        statusValue: updateData.status,
        updateData
      });

      batch.update(sheetRef, updateData);

      // 6. ȘTERGE sheet-ul următoare creat automat (dacă există)
      if (nextSheetId) {
        const nextSheetRef = getSheetRef(associationId, nextSheetId);
        console.log('🗑️ Ștergere sheet următor:', nextSheetId);
        batch.delete(nextSheetRef);
      }

      // 7. RESTAUREAZĂ sheet-ul anterior arhivat la PUBLISHED (UNDO publish operation)
      // Găsește cel mai recent sheet ARCHIVED care a fost arhivat ÎNAINTEA sheet-ului curent
      const archivedSheetsQuery = query(
        getSheetsCollection(associationId),
        where('status', '==', SHEET_STATUS.ARCHIVED)
      );

      const archivedSheetsSnapshot = await getDocs(archivedSheetsQuery);

      if (!archivedSheetsSnapshot.empty) {
        // Găsește sheet-ul arhivat cel mai recent (cel care a fost publicat înainte de sheet-ul curent)
        const archivedSheets = archivedSheetsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(sheet => sheet.archivedAt) // Doar sheet-uri cu archivedAt
          .sort((a, b) => {
            // Sortează descrescător după archivedAt (cel mai recent primul)
            const dateA = a.archivedAt?.toDate?.() || new Date(a.archivedAt);
            const dateB = b.archivedAt?.toDate?.() || new Date(b.archivedAt);
            return dateB - dateA;
          });

        if (archivedSheets.length > 0) {
          const previousSheet = archivedSheets[0]; // Cel mai recent arhivat
          const previousSheetRef = getSheetRef(associationId, previousSheet.id);

          console.log('🔄 Restaurare sheet anterior la PUBLISHED:', {
            sheetId: previousSheet.id,
            month: previousSheet.monthYear,
            archivedAt: previousSheet.archivedAt
          });

          batch.update(previousSheetRef, {
            status: SHEET_STATUS.PUBLISHED,
            archivedAt: null, // Șterge timestamp-ul de arhivare
            restoredAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }

      console.log('💾 Se execută batch.commit()...');
      await batch.commit();
      console.log('✅ Batch commit executat cu succes');

      // Verifică imediat ce status are sheet-ul după commit
      const verifySheetDoc = await getDoc(sheetRef);
      const verifyData = verifySheetDoc.data();
      console.log('🔍 Verificare status după commit:', {
        sheetId,
        statusInFirebase: verifyData?.status,
        hasMaintenanceTable: !!verifyData?.maintenanceTable,
        updatedAt: verifyData?.updatedAt
      });

      console.log('✅ Sheet depublicat cu succes:', {
        sheetId,
        month: sheetData.monthYear,
        nextSheetDeleted: !!nextSheetId
      });

      return {
        success: true,
        message: 'Sheet depublicat cu succes'
      };
    } catch (error) {
      console.error('❌ Eroare la depublicarea sheet-ului:', error);
      throw error;
    }
  }, [associationId]);

  return {
    // State
    sheets,
    currentSheet,
    publishedSheet,
    archivedSheets,
    loading,
    error,

    // Methods
    createInitialSheet,
    updateStructureSnapshot,
    updateConfigSnapshot,
    addExpenseToSheet,
    removeExpenseFromSheet,
    updateExpenseInSheet,
    publishCurrentSheet,
    unpublishSheet, // 🆕 FAZA 8
    addPaymentToPublishedSheet,
    getSheetByMonth,
    updateSheetCustomName,
    updateSheetMonthSettings,
    updateCurrentSheetMaintenanceTable,
    resetAllSheets,
    // Funcție pentru corectarea soldurilor transferate
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
    updateApartmentInSheet,

    // Constants
    SHEET_STATUS
  };
};

export default useSheetManagement;