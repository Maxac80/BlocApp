// utils/dataMigration.js
// Script pentru migrarea datelor din colecții separate în sheets

import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Analizează și face backup la datele existente din colecțiile separate
 */
export const analyzeCurrentDataStructure = async () => {
  console.log('🔍 Analizez structura actuală a datelor...');

  const analysisResult = {
    timestamp: new Date().toISOString(),
    collections: {}
  };

  try {
    // 1. Analizează colecția expenseConfigurations
    console.log('📊 Analizez expenseConfigurations...');
    const expenseConfigsSnapshot = await getDocs(collection(db, 'expenseConfigurations'));
    analysisResult.collections.expenseConfigurations = {
      count: expenseConfigsSnapshot.size,
      documents: []
    };

    expenseConfigsSnapshot.forEach(doc => {
      analysisResult.collections.expenseConfigurations.documents.push({
        id: doc.id,
        data: doc.data()
      });
    });

    // 2. Analizează colecția suppliers
    console.log('📊 Analizez suppliers...');
    const suppliersSnapshot = await getDocs(collection(db, 'suppliers'));
    analysisResult.collections.suppliers = {
      count: suppliersSnapshot.size,
      documents: []
    };

    suppliersSnapshot.forEach(doc => {
      analysisResult.collections.suppliers.documents.push({
        id: doc.id,
        data: doc.data()
      });
    });

    // 3. Analizează colecția initialBalances
    console.log('📊 Analizez initialBalances...');
    const initialBalancesSnapshot = await getDocs(collection(db, 'initialBalances'));
    analysisResult.collections.initialBalances = {
      count: initialBalancesSnapshot.size,
      documents: []
    };

    initialBalancesSnapshot.forEach(doc => {
      analysisResult.collections.initialBalances.documents.push({
        id: doc.id,
        data: doc.data()
      });
    });

    // 4. Analizează colecția disabledExpenses
    console.log('📊 Analizez disabledExpenses...');
    const disabledExpensesSnapshot = await getDocs(collection(db, 'disabledExpenses'));
    analysisResult.collections.disabledExpenses = {
      count: disabledExpensesSnapshot.size,
      documents: []
    };

    disabledExpensesSnapshot.forEach(doc => {
      analysisResult.collections.disabledExpenses.documents.push({
        id: doc.id,
        data: doc.data()
      });
    });

    // 5. Analizează sheets existente pentru a vedea structura actuală
    console.log('📊 Analizez sheets existente...');
    const sheetsSnapshot = await getDocs(collection(db, 'sheets'));
    analysisResult.collections.sheets = {
      count: sheetsSnapshot.size,
      documents: []
    };

    sheetsSnapshot.forEach(doc => {
      const sheetData = doc.data();
      analysisResult.collections.sheets.documents.push({
        id: doc.id,
        monthYear: sheetData.monthYear,
        status: sheetData.status,
        associationId: sheetData.associationId,
        hasExpenseConfigurations: !!sheetData.expenseConfigurations,
        hasSuppliers: !!sheetData.suppliers,
        hasDisabledExpenses: !!sheetData.disabledExpenses,
        hasSheetInitialBalances: !!sheetData.sheetInitialBalances
      });
    });

    // 6. Analizează apartments pentru initialBalance
    console.log('📊 Analizez apartments cu initialBalance...');
    const apartmentsSnapshot = await getDocs(collection(db, 'apartments'));
    analysisResult.collections.apartments = {
      count: apartmentsSnapshot.size,
      withInitialBalance: 0,
      documents: []
    };

    apartmentsSnapshot.forEach(doc => {
      const apartmentData = doc.data();
      if (apartmentData.initialBalance) {
        analysisResult.collections.apartments.withInitialBalance++;
        analysisResult.collections.apartments.documents.push({
          id: doc.id,
          associationId: apartmentData.associationId,
          apartmentNumber: apartmentData.number,
          initialBalance: apartmentData.initialBalance
        });
      }
    });

    console.log('✅ Analiza completă:', analysisResult);
    return analysisResult;

  } catch (error) {
    console.error('❌ Eroare la analiza datelor:', error);
    throw error;
  }
};

/**
 * Migrează datele din colecții separate în sheets
 */
export const migrateDataToSheets = async (analysisResult) => {
  console.log('🚀 Încep migrarea datelor în sheets...');

  try {
    const batch = writeBatch(db);
    const migrationLog = {
      timestamp: new Date().toISOString(),
      migratedSheets: 0,
      errors: []
    };

    // Pentru fiecare sheet existent, adaugă datele migrate
    for (const sheetInfo of analysisResult.collections.sheets.documents) {
      try {
        console.log(`📋 Migrez sheet-ul: ${sheetInfo.monthYear} (${sheetInfo.id})`);

        const sheetRef = doc(db, 'sheets', sheetInfo.id);
        const sheetDoc = await getDoc(sheetRef);

        if (!sheetDoc.exists()) {
          console.warn(`⚠️ Sheet-ul ${sheetInfo.id} nu mai există`);
          continue;
        }

        const currentSheetData = sheetDoc.data();
        const updatedSheetData = { ...currentSheetData };

        // 1. Migrează expenseConfigurations (filtrează pe associationId)
        const relevantExpenseConfigs = analysisResult.collections.expenseConfigurations.documents
          .filter(config => config.data.associationId === sheetInfo.associationId);

        if (relevantExpenseConfigs.length > 0 && !updatedSheetData.expenseConfigurations) {
          updatedSheetData.expenseConfigurations = {};
          relevantExpenseConfigs.forEach(config => {
            updatedSheetData.expenseConfigurations[config.id] = config.data;
          });
          console.log(`  ✅ Migrat ${relevantExpenseConfigs.length} expense configurations`);
        }

        // 2. Migrează suppliers (filtrează pe associationId)
        const relevantSuppliers = analysisResult.collections.suppliers.documents
          .filter(supplier => supplier.data.associationId === sheetInfo.associationId);

        if (relevantSuppliers.length > 0 && !updatedSheetData.suppliers) {
          updatedSheetData.suppliers = relevantSuppliers.map(supplier => ({
            id: supplier.id,
            ...supplier.data
          }));
          console.log(`  ✅ Migrat ${relevantSuppliers.length} suppliers`);
        }

        // 3. Migrează disabledExpenses (filtrează pe associationId)
        const relevantDisabledExpenses = analysisResult.collections.disabledExpenses.documents
          .filter(disabled => disabled.data.associationId === sheetInfo.associationId);

        if (relevantDisabledExpenses.length > 0 && !updatedSheetData.disabledExpenses) {
          updatedSheetData.disabledExpenses = relevantDisabledExpenses.map(disabled => disabled.data);
          console.log(`  ✅ Migrat ${relevantDisabledExpenses.length} disabled expenses`);
        }

        // 4. Pentru primul sheet al asociației, migrează initialBalances din apartments
        const isFirstSheet = await isFirstSheetForAssociation(sheetInfo.associationId, sheetInfo.id);
        if (isFirstSheet && !updatedSheetData.sheetInitialBalances) {
          const relevantApartmentBalances = analysisResult.collections.apartments.documents
            .filter(apt => apt.associationId === sheetInfo.associationId);

          if (relevantApartmentBalances.length > 0) {
            updatedSheetData.sheetInitialBalances = {};
            relevantApartmentBalances.forEach(apt => {
              updatedSheetData.sheetInitialBalances[apt.id] = apt.initialBalance;
            });
            console.log(`  ✅ Migrat ${relevantApartmentBalances.length} initial balances din apartments`);
          }
        }

        // Actualizează sheet-ul cu datele migrate
        batch.update(sheetRef, updatedSheetData);
        migrationLog.migratedSheets++;

      } catch (error) {
        console.error(`❌ Eroare la migrarea sheet-ului ${sheetInfo.id}:`, error);
        migrationLog.errors.push({
          sheetId: sheetInfo.id,
          error: error.message
        });
      }
    }

    // Execută batch-ul
    await batch.commit();
    console.log('✅ Migrarea completă:', migrationLog);
    return migrationLog;

  } catch (error) {
    console.error('❌ Eroare la migrarea datelor:', error);
    throw error;
  }
};

/**
 * Verifică dacă un sheet este primul sheet pentru o asociație
 */
const isFirstSheetForAssociation = async (associationId, sheetId) => {
  try {
    const sheetsQuery = query(
      collection(db, 'sheets'),
      where('associationId', '==', associationId)
    );

    const sheetsSnapshot = await getDocs(sheetsQuery);

    if (sheetsSnapshot.size === 0) return false;

    // Sortează sheet-urile după createdAt și vezi dacă sheet-ul curent este primul
    const sheets = [];
    sheetsSnapshot.forEach(doc => {
      sheets.push({
        id: doc.id,
        createdAt: doc.data().createdAt
      });
    });

    sheets.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return a.createdAt.toMillis() - b.createdAt.toMillis();
    });

    return sheets.length > 0 && sheets[0].id === sheetId;
  } catch (error) {
    console.error('Eroare la verificarea primul sheet:', error);
    return false;
  }
};

/**
 * Funcție pentru expunerea globală în browser console pentru debugging
 */
export const exposeMigrationTools = () => {
  if (typeof window !== 'undefined') {
    window.dataMigration = {
      analyze: analyzeCurrentDataStructure,
      migrate: async () => {
        const analysis = await analyzeCurrentDataStructure();
        return await migrateDataToSheets(analysis);
      },
      fullMigration: async () => {
        console.log('🎯 Începe migrarea completă...');
        const analysis = await analyzeCurrentDataStructure();
        console.log('📊 Analiza completă:', analysis);
        const migration = await migrateDataToSheets(analysis);
        console.log('🎯 Migrarea completă:', migration);
        return { analysis, migration };
      }
    };
    console.log('🔧 Unelte de migrare disponibile în window.dataMigration');
  }
};