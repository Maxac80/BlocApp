// utils/structureMigration.js
// Script pentru migrarea structurii (blocks, stairs, apartments) către sheets

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  where
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Analizează structura actuală și identifică sheet-urile care necesită migrare
 */
export const analyzeStructureData = async () => {
  console.log('🔍 Analizând structura actuală...');

  try {
    // 1. Încarcă toate sheet-urile
    const sheetsSnapshot = await getDocs(collection(db, 'sheets'));
    const sheets = sheetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 2. Încarcă toate colecțiile structurale
    const [blocksSnapshot, stairsSnapshot, apartmentsSnapshot] = await Promise.all([
      getDocs(collection(db, 'blocks')),
      getDocs(collection(db, 'stairs')),
      getDocs(collection(db, 'apartments'))
    ]);

    const blocks = blocksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const stairs = stairsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const apartments = apartmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 3. Analizează fiecare sheet
    const analysis = {
      totalSheets: sheets.length,
      sheetsWithStructure: 0,
      sheetsNeedingMigration: 0,
      associationsData: {},
      migrationPlan: []
    };

    for (const sheet of sheets) {
      const hasStructure = sheet.associationSnapshot?.apartments &&
                          sheet.associationSnapshot.apartments.length > 0;

      if (hasStructure) {
        analysis.sheetsWithStructure++;
      } else {
        analysis.sheetsNeedingMigration++;

        // Găsește structura pentru această asociație
        const associationId = sheet.associationId;
        if (associationId) {
          const associationBlocks = blocks.filter(b => b.associationId === associationId);
          const blockIds = associationBlocks.map(b => b.id);
          const associationStairs = stairs.filter(s => blockIds.includes(s.blockId));
          const stairIds = associationStairs.map(s => s.id);
          const associationApartments = apartments.filter(a => stairIds.includes(a.stairId));

          if (!analysis.associationsData[associationId]) {
            analysis.associationsData[associationId] = {
              blocks: associationBlocks,
              stairs: associationStairs,
              apartments: associationApartments
            };
          }

          analysis.migrationPlan.push({
            sheetId: sheet.id,
            monthYear: sheet.monthYear,
            associationId: associationId,
            blocksCount: associationBlocks.length,
            stairsCount: associationStairs.length,
            apartmentsCount: associationApartments.length
          });
        }
      }
    }

    console.log('📊 Rezultat analiză:', analysis);
    return analysis;

  } catch (error) {
    console.error('❌ Eroare la analiza structurii:', error);
    throw error;
  }
};

/**
 * Migrează structura pentru un sheet specific
 */
export const migrateSheetStructure = async (sheetId, structureData) => {
  console.log(`🔄 Migrând structura pentru sheet: ${sheetId}`);

  try {
    const sheetRef = doc(db, 'sheets', sheetId);

    const associationSnapshot = {
      // Informații de bază (vor fi actualizate din asociație)
      name: '',
      cui: '',
      address: {},
      bankAccount: {},

      // Structura completă
      totalApartments: structureData.apartments.length,
      blocks: structureData.blocks.map(block => ({
        id: block.id,
        name: block.name,
        address: block.address,
        // Păstrează toate proprietățile
        ...block
      })),
      stairs: structureData.stairs.map(stair => ({
        id: stair.id,
        name: stair.name,
        blockId: stair.blockId,
        // Păstrează toate proprietățile
        ...stair
      })),
      apartments: structureData.apartments.map(apt => ({
        id: apt.id,
        number: apt.number,
        block: apt.block,
        stair: apt.stair,
        persons: apt.persons || 0,
        ownerName: apt.ownerName || '',
        email: apt.email || '',
        phone: apt.phone || '',
        // Păstrează toate proprietățile
        ...apt
      })),

      // Timestamp migrare
      migratedAt: serverTimestamp(),
      lastStructureUpdate: serverTimestamp()
    };

    await updateDoc(sheetRef, {
      associationSnapshot,
      'migrationInfo.structureMigrated': true,
      'migrationInfo.structureMigratedAt': serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log(`✅ Migrare completă pentru sheet: ${sheetId}`);
    return { success: true, sheetId };

  } catch (error) {
    console.error(`❌ Eroare la migrarea sheet-ului ${sheetId}:`, error);
    return { success: false, sheetId, error: error.message };
  }
};

/**
 * Migrează toate sheet-urile care au nevoie de structură
 */
export const migrateAllSheetStructures = async () => {
  console.log('🚀 Începe migrarea structurii pentru toate sheet-urile...');

  try {
    // 1. Analizează situația actuală
    const analysis = await analyzeStructureData();

    if (analysis.sheetsNeedingMigration === 0) {
      console.log('✅ Toate sheet-urile au deja structura migrată!');
      return {
        success: true,
        message: 'No sheets need migration',
        analysis
      };
    }

    // 2. Migrează fiecare sheet
    const results = {
      success: true,
      totalSheets: analysis.sheetsNeedingMigration,
      migratedSheets: 0,
      failedSheets: 0,
      details: [],
      analysis
    };

    for (const migrationPlan of analysis.migrationPlan) {
      const structureData = analysis.associationsData[migrationPlan.associationId];

      if (structureData) {
        const result = await migrateSheetStructure(migrationPlan.sheetId, structureData);

        if (result.success) {
          results.migratedSheets++;
        } else {
          results.failedSheets++;
          results.success = false;
        }

        results.details.push({
          ...migrationPlan,
          migrationResult: result
        });
      }
    }

    console.log('📊 Rezultat migrare completă:', results);
    return results;

  } catch (error) {
    console.error('❌ Eroare la migrarea completă:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Verifică dacă migrarea a fost reușită
 */
export const verifyStructureMigration = async () => {
  console.log('🔍 Verifică rezultatele migrării...');

  try {
    const sheetsSnapshot = await getDocs(collection(db, 'sheets'));
    let totalSheets = 0;
    let migratedSheets = 0;
    let totalApartments = 0;

    sheetsSnapshot.forEach(doc => {
      const data = doc.data();
      totalSheets++;

      if (data.associationSnapshot?.apartments && data.associationSnapshot.apartments.length > 0) {
        migratedSheets++;
        totalApartments += data.associationSnapshot.apartments.length;
      }
    });

    const verification = {
      totalSheets,
      migratedSheets,
      unmigrated: totalSheets - migratedSheets,
      totalApartmentsMigrated: totalApartments,
      migrationComplete: migratedSheets === totalSheets,
      successRate: ((migratedSheets / totalSheets) * 100).toFixed(1) + '%'
    };

    console.log('📊 Rezultat verificare:', verification);
    return verification;

  } catch (error) {
    console.error('❌ Eroare la verificarea migrării:', error);
    throw error;
  }
};

/**
 * Workflow complet de migrare cu verificare
 */
export const safeStructureMigration = async () => {
  console.log('🛡️ Începe migrarea sigură a structurii...');

  try {
    // 1. Analiză inițială
    const analysis = await analyzeStructureData();
    console.log('📊 Analiză inițială completă');

    // 2. Confirmă că există date de migrat
    if (analysis.sheetsNeedingMigration === 0) {
      return {
        success: true,
        message: 'No migration needed - all sheets already have structure',
        analysis
      };
    }

    // 3. Efectuează migrarea
    const migrationResults = await migrateAllSheetStructures();
    console.log('🔄 Migrare efectuată');

    // 4. Verifică rezultatele
    const verification = await verifyStructureMigration();
    console.log('✅ Verificare completă');

    return {
      success: migrationResults.success,
      analysis,
      migration: migrationResults,
      verification
    };

  } catch (error) {
    console.error('❌ Eroare în workflow-ul de migrare:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Expune funcțiile pentru browser console
if (typeof window !== 'undefined') {
  window.structureMigration = {
    analyze: analyzeStructureData,
    migrateAll: migrateAllSheetStructures,
    verify: verifyStructureMigration,
    safeMigration: safeStructureMigration
  };
  console.log('🔧 Structure migration tools available in window.structureMigration');
}