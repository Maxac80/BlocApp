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
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';

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
    // Query simplu fără orderBy pentru a evita probleme de index
    const sheetsQuery = query(
      collection(db, 'sheets'),
      where('associationId', '==', associationId)
    );

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

          // Clasifică sheet-urile după status
          switch (data.status) {
            case SHEET_STATUS.IN_PROGRESS:
              inProgressSheet = data;
              break;
            case SHEET_STATUS.PUBLISHED:
              publishedSheet = data;
              console.log('🔄 Found published sheet:', {
                id: publishedSheet.id,
                monthYear: publishedSheet.monthYear,
                hasMaintenanceTable: !!publishedSheet.maintenanceTable,
                maintenanceTableLength: publishedSheet.maintenanceTable?.length || 0,
                status: publishedSheet.status
              });
              break;
            case SHEET_STATUS.ARCHIVED:
              archivedList.push(data);
              break;
          }
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

        // Configurări inițiale (toate goale, se vor popula pe măsură ce se configurează)
        configSnapshot: {
          expenseConfigurations: {},
          balanceAdjustments: {},
          disabledExpenses: [],
          suppliers: [],
          sheetInitialBalances: {},
          customSettings: {},
          createdAt: serverTimestamp()
        },

        // Metadata
        publishedAt: null,
        archivedAt: null,
        publishedBy: null,
        notes: 'Primul sheet creat pentru asociație'
      };

      const sheetRef = doc(collection(db, 'sheets'));
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
      const sheetRef = doc(db, 'sheets', currentSheet.id);

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
    if (!currentSheet || currentSheet.status !== SHEET_STATUS.IN_PROGRESS) {
      throw new Error('Nu se pot adăuga cheltuieli - sheet-ul nu este în lucru');
    }

    try {
      const sheetRef = doc(db, 'sheets', currentSheet.id);
      
      // Creează copie completă a cheltuielii cu toate datele
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
        // Păstrează TOATE proprietățile cheltuielii
        ...expense,
        // Timestamp când a fost adăugată în acest sheet
        addedToSheet: new Date().toISOString(),
        sheetId: currentSheet.id
      };
      
      const updatedExpenses = [...(currentSheet.expenses || []), expenseSnapshot];
      
      await setDoc(sheetRef, {
        expenses: updatedExpenses,
        updatedAt: serverTimestamp()
      }, { merge: true });

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
      const sheetRef = doc(db, 'sheets', currentSheet.id);

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
   * Actualizează configurările pentru sheet-ul curent
   * SNAPSHOT: Păstrează configurări independente pentru fiecare sheet
   */
  const updateConfigSnapshot = useCallback(async (configData) => {
    if (!currentSheet || currentSheet.status !== SHEET_STATUS.IN_PROGRESS) {
      console.warn('Nu există sheet în lucru pentru actualizare configurări');
      return;
    }

    try {
      const sheetRef = doc(db, 'sheets', currentSheet.id);
      
      // Creează snapshot complet de configurări
      const configSnapshot = {
        expenseConfigurations: configData.expenseConfigurations ? {...configData.expenseConfigurations} : {},
        balanceAdjustments: configData.balanceAdjustments ? {...configData.balanceAdjustments} : {},
        disabledExpenses: configData.disabledExpenses ? [...(configData.disabledExpenses || [])] : [],
        customExpenses: configData.customExpenses ? [...(configData.customExpenses || [])] : [],
        customSettings: configData.customSettings ? {...configData.customSettings} : {},
        // Păstrează TOATE configurările
        ...configData,
        lastConfigUpdate: serverTimestamp()
      };

      await setDoc(sheetRef, {
        configSnapshot: configSnapshot,
        updatedAt: serverTimestamp()
      }, { merge: true });

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
  const publishCurrentSheet = useCallback(async (maintenanceData, publishedBy) => {
    if (!currentSheet || currentSheet.status !== SHEET_STATUS.IN_PROGRESS) {
      throw new Error('Nu există sheet în lucru pentru publicare');
    }

    console.log('📋 Publishing sheet with maintenance data:', {
      sheetId: currentSheet.id,
      month: currentSheet.monthYear,
      maintenanceDataLength: maintenanceData?.length,
      paymentsLength: currentSheet.payments?.length
    });

    const batch = writeBatch(db);

    try {
      // 1. Actualizează sheet-ul curent ca PUBLISHED
      const currentSheetRef = doc(db, 'sheets', currentSheet.id);

      // 🎯 CAPTUREAZĂ datele calculate la publicare
      const updateData = {
        status: SHEET_STATUS.PUBLISHED,
        publishedAt: serverTimestamp(),
        publishedBy,
        updatedAt: serverTimestamp()
      };

      // SALVEAZĂ maintenanceData calculat în sheet-ul publicat (snapshot complet)
      if (maintenanceData && maintenanceData.length > 0) {
        updateData.maintenanceTable = maintenanceData;
      } else {
        console.log('⚠️ No maintenance data provided for publishing - keeping existing table');
      }

      batch.update(currentSheetRef, updateData);

      // 2. Arhivează sheet-ul publicat anterior (dacă există)
      if (publishedSheet) {
        const previousSheetRef = doc(db, 'sheets', publishedSheet.id);
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

      const newSheetRef = doc(collection(db, 'sheets'));
      const newSheetData = {
        associationId: currentSheet.associationId, // IMPORTANT: folosim associationId din sheet-ul curent!
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

        // CHELTUIELI - copiază TOATE cheltuielile active din momentul publicării
        expenses: currentSheet.expenses ? [...currentSheet.expenses] : [],
        
        // Date financiare pentru noul sheet
        maintenanceTable: [],
        payments: [],
        
        // Transfer solduri din luna publicată (CALCULAT CORECT cu încasările PER APARTAMENT)
        balances: (() => {
          console.log('🔍 DEBUG Transfer solduri - maintenanceData la publicare:', maintenanceData);
          console.log('🔍 DEBUG Transfer solduri - currentSheet.payments:', currentSheet.payments || []);

          const apartmentBalances = calculateApartmentBalancesAfterPayments(maintenanceData, currentSheet.payments || []);
          const totalBalance = calculateTotalBalanceAfterPayments(maintenanceData, currentSheet.payments || []);
          
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
              originalBalance: calculateTotalBalance(maintenanceData),
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

      batch.set(newSheetRef, newSheetData);

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
      const publishedSheetRef = doc(db, 'sheets', publishedSheet.id);
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
        const currentSheetRef = doc(db, 'sheets', currentSheet.id);
        
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
  }, [publishedSheet, currentSheet]);

  /**
   * Obține sheet-ul pentru o lună specifică
   */
  const getSheetByMonth = useCallback(async (monthYear) => {
    try {
      const sheetsQuery = query(
        collection(db, 'sheets'),
        where('associationId', '==', associationId),
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

    console.log('🔍 DEBUG published sheet structure:', publishedSheet);

    if (!publishedSheet.maintenanceTable || publishedSheet.maintenanceTable.length === 0) {
      console.error('❌ Sheet-ul publicat nu are maintenanceTable');
      console.log('🔧 Încerc să corectez folosind datele calculate din hook...');

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
    const currentSheetRef = doc(db, 'sheets', currentSheet.id);
    await updateDoc(currentSheetRef, {
      'balances.apartmentBalances': correctedBalances,
      'balances.transferred': true,
      'balances.transferredFrom': publishedSheet.id,
      updatedAt: serverTimestamp()
    });

    console.log('✅ Sheet-ul curent actualizat cu soldurile corectate');

    // Forțează reîncărcarea pentru a vedea modificările
    window.location.reload();
  }, [currentSheet, publishedSheet]);

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
      const sheetRef = doc(db, 'sheets', sheetId);
      await updateDoc(sheetRef, {
        customMonthName: customName,
        updatedAt: serverTimestamp()
      });

      console.log('✅ Numele personalizat al sheet-ului actualizat:', customName);
    } catch (error) {
      console.error('❌ Error updating custom sheet name:', error);
      throw error;
    }
  }, []);

  /**
   * Actualizează setările de luni pentru un sheet specific
   */
  const updateSheetMonthSettings = useCallback(async (sheetId, workingMonth, consumptionMonth) => {
    if (!sheetId) {
      throw new Error('Sheet ID este necesar');
    }

    try {
      const sheetRef = doc(db, 'sheets', sheetId);
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
  }, []);

  /**
   * Actualizează tabelul de întreținere al sheet-ului curent
   */
  const updateCurrentSheetMaintenanceTable = useCallback(async (maintenanceTable) => {
    if (!currentSheet?.id) {
      throw new Error('Nu există sheet curent pentru actualizare');
    }

    try {
      const sheetRef = doc(db, 'sheets', currentSheet.id);
      await updateDoc(sheetRef, {
        maintenanceTable: maintenanceTable,
        updatedAt: serverTimestamp()
      });

      console.log('✅ Tabelul de întreținere al sheet-ului curent actualizat');
    } catch (error) {
      console.error('❌ Error updating current sheet maintenance table:', error);
      throw error;
    }
  }, [currentSheet?.id]);

  /**
   * Resetează toate sheet-urile (pentru debug/test)
   * ATENȚIE: Șterge toate datele!
   */
  const resetAllSheets = useCallback(async () => {
    if (!window.confirm('⚠️ ATENȚIE: Aceasta va șterge TOATE sheet-urile! Continuați?')) {
      return;
    }

    try {
      const sheetsQuery = query(
        collection(db, 'sheets'),
        where('associationId', '==', associationId)
      );

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
      const sheetRef = doc(db, 'sheets', currentSheet.id);

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
      const sheetRef = doc(db, 'sheets', currentSheet.id);

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
  }, [currentSheet]);

  /**
   * Adaugă apartament direct în sheet-ul curent
   */
  const addApartmentToSheet = useCallback(async (apartmentData) => {
    if (!currentSheet || currentSheet.status !== SHEET_STATUS.IN_PROGRESS) {
      throw new Error('Nu se pot adăuga apartamente - sheet-ul nu este în lucru');
    }

    try {
      const sheetRef = doc(db, 'sheets', currentSheet.id);

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
  }, [currentSheet]);

  /**
   * Șterge bloc direct din sheet-ul curent
   */
  const deleteBlockFromSheet = useCallback(async (blockId) => {
    if (!currentSheet || currentSheet.status !== SHEET_STATUS.IN_PROGRESS) {
      throw new Error('Nu se pot șterge blocuri - sheet-ul nu este în lucru');
    }

    try {
      const sheetRef = doc(db, 'sheets', currentSheet.id);

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
  }, [currentSheet]);

  /**
   * Șterge scară direct din sheet-ul curent
   */
  const deleteStairFromSheet = useCallback(async (stairId) => {
    if (!currentSheet || currentSheet.status !== SHEET_STATUS.IN_PROGRESS) {
      throw new Error('Nu se pot șterge scări - sheet-ul nu este în lucru');
    }

    try {
      const sheetRef = doc(db, 'sheets', currentSheet.id);

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
  }, [currentSheet]);

  /**
   * Șterge apartament direct din sheet-ul curent
   */
  const deleteApartmentFromSheet = useCallback(async (apartmentId) => {
    if (!currentSheet || currentSheet.status !== SHEET_STATUS.IN_PROGRESS) {
      throw new Error('Nu se pot șterge apartamente - sheet-ul nu este în lucru');
    }

    try {
      const sheetRef = doc(db, 'sheets', currentSheet.id);

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
  }, [currentSheet]);

  /**
   * Actualizează bloc direct în sheet-ul curent
   */
  const updateBlockInSheet = useCallback(async (blockId, updatedData) => {
    if (!currentSheet || currentSheet.status !== SHEET_STATUS.IN_PROGRESS) {
      throw new Error('Nu se pot actualiza blocuri - sheet-ul nu este în lucru');
    }

    try {
      const sheetRef = doc(db, 'sheets', currentSheet.id);

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
  }, [currentSheet]);

  /**
   * Actualizează scară direct în sheet-ul curent
   */
  const updateStairInSheet = useCallback(async (stairId, updatedData) => {
    if (!currentSheet || currentSheet.status !== SHEET_STATUS.IN_PROGRESS) {
      throw new Error('Nu se pot actualiza scări - sheet-ul nu este în lucru');
    }

    try {
      const sheetRef = doc(db, 'sheets', currentSheet.id);

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
  }, [currentSheet]);

  /**
   * Actualizează apartament direct în sheet-ul curent
   */
  const updateApartmentInSheet = useCallback(async (apartmentId, updatedData) => {
    if (!currentSheet || currentSheet.status !== SHEET_STATUS.IN_PROGRESS) {
      throw new Error('Nu se pot actualiza apartamente - sheet-ul nu este în lucru');
    }

    try {
      const sheetRef = doc(db, 'sheets', currentSheet.id);

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
  }, [currentSheet]);

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
    publishCurrentSheet,
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