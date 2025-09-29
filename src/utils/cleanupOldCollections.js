// utils/cleanupOldCollections.js
// Script pentru ștergerea colecțiilor vechi după migrarea reușită

import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Șterge toate documentele dintr-o colecție
 */
const deleteCollection = async (collectionName) => {
  console.log(`🗑️ Șterg colecția: ${collectionName}`);

  try {
    const snapshot = await getDocs(collection(db, collectionName));

    if (snapshot.empty) {
      console.log(`⚠️ Colecția ${collectionName} este deja goală`);
      return { deleted: 0 };
    }

    const batch = writeBatch(db);
    let deleteCount = 0;

    snapshot.forEach((docSnap) => {
      batch.delete(doc(db, collectionName, docSnap.id));
      deleteCount++;
    });

    await batch.commit();
    console.log(`✅ Șterse ${deleteCount} documente din ${collectionName}`);

    return { deleted: deleteCount };
  } catch (error) {
    console.error(`❌ Eroare la ștergerea colecției ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Curăță toate colecțiile redundante după migrare
 */
export const cleanupRedundantCollections = async () => {
  console.log('🧹 Începe curățarea colecțiilor redundante...');

  const collectionsToCleanup = [
    'expenseConfigurations',
    'suppliers',
    'initialBalances',
    'disabledExpenses'
  ];

  const results = {
    timestamp: new Date().toISOString(),
    collections: {},
    totalDeleted: 0,
    errors: []
  };

  for (const collectionName of collectionsToCleanup) {
    try {
      console.log(`🔄 Procesez colecția: ${collectionName}`);
      const result = await deleteCollection(collectionName);
      results.collections[collectionName] = result;
      results.totalDeleted += result.deleted;
    } catch (error) {
      console.error(`❌ Eroare la procesarea ${collectionName}:`, error);
      results.errors.push({
        collection: collectionName,
        error: error.message
      });
    }
  }

  console.log('✅ Curățarea completă:', results);
  return results;
};

/**
 * Verifică dacă migrarea a fost reușită înainte de cleanup
 */
export const verifyMigrationBeforeCleanup = async () => {
  console.log('🔍 Verific dacă migrarea a fost reușită...');

  try {
    const sheetsSnapshot = await getDocs(collection(db, 'sheets'));
    let migratedSheetsCount = 0;
    let totalDataMigrated = 0;

    sheetsSnapshot.forEach(doc => {
      const data = doc.data();
      const configSnapshot = data.configSnapshot || {};

      const hasExpenseConfigs = configSnapshot.expenseConfigurations && Object.keys(configSnapshot.expenseConfigurations).length > 0;
      const hasSuppliers = configSnapshot.suppliers && configSnapshot.suppliers.length > 0;
      const hasDisabledExpenses = configSnapshot.disabledExpenses && configSnapshot.disabledExpenses.length > 0;
      const hasInitialBalances = configSnapshot.sheetInitialBalances && Object.keys(configSnapshot.sheetInitialBalances).length > 0;

      if (hasExpenseConfigs || hasSuppliers || hasDisabledExpenses || hasInitialBalances) {
        migratedSheetsCount++;

        if (hasExpenseConfigs) totalDataMigrated += Object.keys(configSnapshot.expenseConfigurations).length;
        if (hasSuppliers) totalDataMigrated += configSnapshot.suppliers.length;
        if (hasDisabledExpenses) totalDataMigrated += configSnapshot.disabledExpenses.length;
        if (hasInitialBalances) totalDataMigrated += Object.keys(configSnapshot.sheetInitialBalances).length;
      }
    });

    const verification = {
      totalSheets: sheetsSnapshot.size,
      migratedSheets: migratedSheetsCount,
      totalDataMigrated: totalDataMigrated,
      migrationSuccess: migratedSheetsCount > 0 && totalDataMigrated > 0
    };

    console.log('📊 Rezultat verificare:', verification);
    return verification;
  } catch (error) {
    console.error('❌ Eroare la verificarea migrării:', error);
    throw error;
  }
};

/**
 * Workflow complet de cleanup cu verificare
 */
export const safeCleanupAfterMigration = async () => {
  console.log('🛡️ Începe cleanup-ul sigur după migrare...');

  try {
    // 1. Verifică dacă migrarea a fost reușită
    const verification = await verifyMigrationBeforeCleanup();

    if (!verification.migrationSuccess) {
      console.error('❌ STOP: Migrarea nu pare să fie reușită. Nu se poate face cleanup.');
      return {
        success: false,
        reason: 'Migration verification failed',
        verification
      };
    }

    console.log('✅ Migrarea verificată cu succes. Procedez cu cleanup-ul...');

    // 2. Procedează cu cleanup-ul
    const cleanupResults = await cleanupRedundantCollections();

    return {
      success: true,
      verification,
      cleanup: cleanupResults
    };
  } catch (error) {
    console.error('❌ Eroare în workflow-ul de cleanup:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Expune funcțiile pentru browser console
if (typeof window !== 'undefined') {
  window.cleanupOldCollections = {
    verify: verifyMigrationBeforeCleanup,
    cleanup: cleanupRedundantCollections,
    safeCleanup: safeCleanupAfterMigration
  };
  console.log('🔧 Cleanup tools available in window.cleanupOldCollections');
}